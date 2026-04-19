import { Scraper, SearchMode } from '@the-convocation/twitter-scraper';

export { SearchMode };

let _scraper: Scraper | null = null;

export async function getScraper(): Promise<Scraper> {
  if (_scraper) return _scraper;

  _scraper = new Scraper();

  const authToken = process.env.TWITTER_AUTH_TOKEN;
  const ct0 = process.env.TWITTER_CT0;

  if (authToken && ct0) {
    await _scraper.setCookies([
      `auth_token=${authToken}; Domain=.x.com; Path=/; Secure; HttpOnly`,
      `ct0=${ct0}; Domain=.x.com; Path=/; Secure`,
      `auth_token=${authToken}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
      `ct0=${ct0}; Domain=.twitter.com; Path=/; Secure`,
    ]);
    return _scraper;
  }

  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;

  if (username && password) {
    await _scraper.login(username, password, email);
  }

  return _scraper;
}
