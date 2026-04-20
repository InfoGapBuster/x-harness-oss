import { chromium, type Browser } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.cache', 'x-harness');
const COOKIE_FILE = join(CACHE_DIR, 'cookies.json');
const COOKIE_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23時間

interface CookieCache {
  authToken: string;
  ct0: string;
  savedAt: number;
}

export function loadCachedCookies(): { authToken: string; ct0: string } | null {
  try {
    if (!existsSync(COOKIE_FILE)) return null;
    const cache = JSON.parse(readFileSync(COOKIE_FILE, 'utf-8')) as CookieCache;
    if (Date.now() - cache.savedAt > COOKIE_MAX_AGE_MS) return null;
    if (!cache.authToken || !cache.ct0) return null;
    return { authToken: cache.authToken, ct0: cache.ct0 };
  } catch {
    return null;
  }
}

export function saveCookieCache(authToken: string, ct0: string): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(COOKIE_FILE, JSON.stringify({ authToken, ct0, savedAt: Date.now() }));
}

export function clearCookieCache(): void {
  try {
    if (existsSync(COOKIE_FILE)) writeFileSync(COOKIE_FILE, JSON.stringify({}));
  } catch {}
}

export async function fetchCookiesViaBrowser(
  username: string,
  password: string,
  email?: string,
): Promise<{ authToken: string; ct0: string }> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // ユーザー名入力
    await page.fill('input[autocomplete="username"]', username);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 追加認証（メール/電話）が求められる場合
    const extraInput = page.locator('input[data-testid="ocfEnterTextTextInput"], input[name="text"]');
    if (await extraInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await extraInput.first().fill(email ?? username);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    // パスワード入力
    await page.fill('input[name="password"]', password);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    const cookies = await context.cookies('https://x.com');
    const authToken = cookies.find(c => c.name === 'auth_token')?.value;
    const ct0 = cookies.find(c => c.name === 'ct0')?.value;

    if (!authToken || !ct0) {
      throw new Error('ブラウザログインに失敗しました。ユーザー名/パスワードを確認してください（2FA や CAPTCHA が必要な場合は手動でクッキーを設定してください）。');
    }

    return { authToken, ct0 };
  } finally {
    await browser?.close();
  }
}
