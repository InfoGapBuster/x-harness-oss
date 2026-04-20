import { Scraper, SearchMode } from '@the-convocation/twitter-scraper';
import { loadCachedCookies, saveCookieCache, clearCookieCache, fetchCookiesViaBrowser } from './browser-auth.js';

export { SearchMode };

let _scraper: Scraper | null = null;

async function buildAuthenticatedScraper(): Promise<Scraper> {
  const scraper = new Scraper();

  const trySetCookies = async (authToken: string, ct0: string): Promise<boolean> => {
    await scraper.setCookies([
      `auth_token=${authToken}; Domain=.x.com; Path=/; Secure; HttpOnly`,
      `ct0=${ct0}; Domain=.x.com; Path=/; Secure`,
      `auth_token=${authToken}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
      `ct0=${ct0}; Domain=.twitter.com; Path=/; Secure`,
    ]);
    return scraper.isLoggedIn();
  };

  // 1. キャッシュファイルのクッキーを試す
  const cached = loadCachedCookies();
  if (cached) {
    console.error('[scraper] キャッシュのクッキーを試します...');
    if (await trySetCookies(cached.authToken, cached.ct0)) {
      console.error('[scraper] キャッシュのクッキーで認証成功');
      return scraper;
    }
    clearCookieCache();
    console.error('[scraper] キャッシュのクッキーが無効でした');
  }

  // 2. 環境変数のクッキーを試す
  const envToken = process.env.TWITTER_AUTH_TOKEN;
  const envCt0 = process.env.TWITTER_CT0;
  if (envToken && envCt0) {
    console.error('[scraper] 環境変数のクッキーを試します...');
    if (await trySetCookies(envToken, envCt0)) {
      console.error('[scraper] 環境変数のクッキーで認証成功 → キャッシュ保存');
      saveCookieCache(envToken, envCt0);
      return scraper;
    }
    console.error('[scraper] 環境変数のクッキーが無効でした');
  }

  // 3. Playwright ブラウザでログイン
  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;
  if (username && password) {
    console.error('[scraper] ブラウザでログインします...');
    const { authToken, ct0 } = await fetchCookiesViaBrowser(username, password, email);
    await trySetCookies(authToken, ct0);
    saveCookieCache(authToken, ct0);
    console.error('[scraper] ブラウザログイン成功 → クッキーをキャッシュ保存');
    return scraper;
  }

  throw new Error('X 認証情報が未設定です。.mcp.json に TWITTER_USERNAME / TWITTER_PASSWORD を設定してください。');
}

export async function getScraper(): Promise<Scraper> {
  if (_scraper) {
    if (await _scraper.isLoggedIn()) return _scraper;
    console.error('[scraper] セッション切れ → 再認証します');
    _scraper = null;
  }
  _scraper = await buildAuthenticatedScraper();
  return _scraper;
}
