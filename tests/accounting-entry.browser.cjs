// Regression for accounting sign-in and bookmarked finance URLs. All API traffic is mocked.
// PLAYWRIGHT_MODULE=/path/to/@playwright/test FRONTEND_URL=http://127.0.0.1:43110 node tests/accounting-entry.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = new URL(process.env.FRONTEND_URL || 'http://127.0.0.1:43110').origin;
const accountant = { id: 'accounting-entry-test', name: 'Test Accountant', email: 'accounting@example.test', role: 'ACCOUNTING' };

async function scenario(browser, login) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const errors = [], requests = [], unexpected = [];
  try {
    await context.addInitScript(({ user, login }) => {
      localStorage.setItem('crm-locale', 'tr');
      if (!login) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', 'mock-accounting-access');
      }
    }, { user: accountant, login });
    await context.routeWebSocket('**/*', socket => socket.close());
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) return route.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      requests.push(`${request.method()} ${url.pathname}`);
      let status = 200, body;
      if (request.method() === 'POST' && url.pathname === '/auth/login') body = { user: accountant, accessToken: 'mock-accounting-access', refreshToken: 'mock-accounting-refresh' };
      else if (request.method() === 'GET' && url.pathname === '/auth/me') body = accountant;
      // Accounting has no notifications permission. An ordinary 403 must not crash the shell.
      else if (request.method() === 'GET' && url.pathname.startsWith('/notifications')) { status = 403; body = { message: 'Forbidden' }; }
      // Keep the test about routing: a temporary data outage must still render the payment screen.
      else if (request.method() === 'GET' && (url.pathname === '/payment-tracking' || url.pathname === '/finance-sync' || url.pathname.startsWith('/finance-sync/'))) { status = 503; body = { message: 'Synthetic source unavailable' }; }
      else { unexpected.push(`${request.method()} ${url.pathname}`); status = 404; body = {}; }
      return route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + (login ? '/' : '/finance'), { waitUntil: 'domcontentloaded' });
    if (login) {
      await page.locator('input[type="email"]').fill(accountant.email);
      await page.locator('input[type="password"]').fill('Synthetic-Password-123');
      await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    }
    try {
      await page.waitForURL(url => url.pathname === '/finance/payment-tracking', { timeout: 20000 });
    } catch {
      assert.fail(`Accounting entry did not reach payment tracking: ${JSON.stringify(errors)}; path=${new URL(page.url()).pathname}`);
    }
    await page.getByRole('heading', { name: 'Ödeme Takip', exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Ödeme Takip', exact: true }).waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(errors, [], 'No React runtime errors on entry or reload');
    assert.deepEqual(unexpected, [], 'All API calls must use fixtures');
    assert(requests.includes('GET /payment-tracking'), 'Payment tracking data was requested');
    console.log(`PASS accounting ${login ? 'sign-in' : 'finance bookmark'}: canonical route, payment screen, reload, no runtime errors`);
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    await scenario(browser, false);
    await scenario(browser, true);
    const context = await browser.newContext();
    try {
      for (const [from, to] of [['/finance', '/finance/payment-tracking'], ['/my-customers', '/profile']]) {
        const response = await context.request.get(origin + from + '?q=entry-test&page=2', { maxRedirects: 0 });
        assert.equal(response.status(), 307, `${from} must redirect before rendering React`);
        const destination = new URL(response.headers().location, origin);
        assert.equal(destination.pathname, to);
        assert.equal(destination.searchParams.get('q'), 'entry-test');
        assert.equal(destination.searchParams.get('page'), '2');
      }
    } finally { await context.close(); }
    console.log('PASS legacy aliases: HTTP redirects before React rendering');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
