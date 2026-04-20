import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CACHE_DIR = join(homedir(), '.cache', 'x-harness');
const COOKIE_FILE = join(CACHE_DIR, 'cookies.json');

const USERNAME = 'ItouYoshihiro';
const PASSWORD = '@Mnkm1026';
const EMAIL = 'besus.itou@gmail.com';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

console.log('x.com へアクセス中...');
await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

// ① ユーザー名入力欄が現れるまで待機
console.log('ユーザー名入力欄を待機中...');
const usernameInput = page.locator('input[name="text"]').first();
await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
await usernameInput.fill(USERNAME);
await page.waitForTimeout(300);

// ① 「次へ」クリック → ユーザー名欄が消えるまで待つ
await page.locator('button:has-text("次へ")').click();
console.log('ユーザー名入力 → 次へクリック');

// ユーザー名フィールドが「ItouYoshihiroを含む状態」から消えるまで待機
await page.waitForFunction(
  (uname) => {
    const inputs = Array.from(document.querySelectorAll('input[name="text"]'));
    return inputs.every(i => i.value !== uname);
  },
  USERNAME,
  { timeout: 10000 }
).catch(() => console.log('ユーザー名欄の遷移タイムアウト（続行）'));

await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/x-step1.png' });
console.log('スクリーンショット: /tmp/x-step1.png (次へ後)');

// ② 現在のステップを判定
const hasPassword = await page.locator('input[name="password"]').isVisible({ timeout: 500 }).catch(() => false);
const hasTextField = await page.locator('input[name="text"]').isVisible({ timeout: 500 }).catch(() => false);
console.log(`現在の状態: password=${hasPassword}, text=${hasTextField}`);

// ③ 検証ステップ（phone/email確認）がある場合
if (!hasPassword && hasTextField) {
  console.log('検証ステップが必要（phone/email確認）');
  const verifyInput = page.locator('input[name="text"]').first();
  await verifyInput.fill(EMAIL);
  await page.waitForTimeout(300);
  await page.locator('button:has-text("次へ")').click();
  console.log('メール入力 → 次へクリック');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/x-step2.png' });
  console.log('スクリーンショット: /tmp/x-step2.png (検証後)');
}

// ④ パスワード入力
console.log('パスワード欄を待機中...');
const passwordInput = page.locator('input[name="password"]');
await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
await passwordInput.fill(PASSWORD);
await page.waitForTimeout(300);
await page.locator('button:has-text("ログイン"), [data-testid="LoginForm_Login_Button"]').first().click();
console.log('パスワード入力 → ログインクリック');
await page.waitForTimeout(6000);

// ⑤ クッキー取得
const cookies = await context.cookies('https://x.com');
const authToken = cookies.find(c => c.name === 'auth_token')?.value;
const ct0 = cookies.find(c => c.name === 'ct0')?.value;

if (!authToken || !ct0) {
  await page.screenshot({ path: '/tmp/x-final.png' });
  console.error('クッキーが取得できませんでした。/tmp/x-final.png を確認してください。');
  await browser.close();
  process.exit(1);
}

mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(COOKIE_FILE, JSON.stringify({ authToken, ct0, savedAt: Date.now() }));
console.log('✓ 認証成功！クッキーを保存しました:', COOKIE_FILE);
console.log('auth_token:', authToken.slice(0, 8) + '...');
console.log('ct0:', ct0.slice(0, 8) + '...');

await browser.close();
