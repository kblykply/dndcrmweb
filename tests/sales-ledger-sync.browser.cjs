// Synthetic API only. No real Logo import or customer message is triggered.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { paymentList } = require('../../api/dist/src/payment-tracking/payment-tracking.service');
const origin = new URL(process.env.FRONTEND_URL || 'http://127.0.0.1:43110').origin;
const fixtureCode = fs.readFileSync(path.join(__dirname, 'payment-tracking.browser.cjs'), 'utf8').split('async function main()')[0];
const fixture = new Function('require', 'process', fixtureCode + '\nreturn {source,base};')(require, process);

async function check(browser, role) {
  const context = await browser.newContext();
  const user = { id: 'sync-' + role, role, name: 'Synthetic ' + role };
  const errors = [], unexpected = [], reads = [];
  let posts = 0, polls = 0, statusReads = 0;
  const oldImport = new Date(Date.now() - 600000).toISOString();
  const state = {
    workerOnline: true,
    source: { id: 'batch-old', importedAt: oldImport },
    job: null,
    automatic: { enabled: true, intervalMinutes: 15, staleAfterMinutes: 30, sourceStale: false, schedulerStale: false, blockedReason: null },
  };
  const base = {
    ...fixture.base,
    authorization: { status: 'matched', codes: [], hasBlank: true },
    unallocatedCredit: { status: 'clear', recordCount: 0 },
    installments: [{ sequence: 1, projectCode: 'SALE-A01', paymentKind: 'sale', dueDate: '2026-09-01', amount: 2000, paid: 500, outstanding: 1500, overdueDays: 28, status: 'overdue' }],
  };
  try {
    await context.addInitScript(user => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', 'synthetic-sync-token');
      localStorage.setItem('crm-locale', 'en');
    }, user);
    await context.routeWebSocket('**/*', socket => socket.close());
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === origin) return route.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let body, status = 200;
      if (req.method() === 'GET' && url.pathname === '/auth/me') body = user;
      else if (req.method() === 'GET' && url.pathname === '/notifications') body = [];
      else if (req.method() === 'GET' && url.pathname === '/notifications/unread-count') body = { unread: 0 };
      else if (req.method() === 'GET' && url.pathname === '/sales-ledger') {
        reads.push(Object.fromEntries(url.searchParams));
        const source = { ...fixture.source, importedAt: state.source.importedAt, sourceBatchId: state.source.id, cases: [base] };
        body = { ...paymentList(source, [], user, Object.fromEntries(url.searchParams)), assignees: [], followupAssignees: [], canAssignFollowup: role !== 'SALES' };
      } else if (url.pathname === '/finance-sync' && ['GET', 'POST'].includes(req.method())) {
        if (req.method() === 'POST') {
          posts++;
          state.job = posts === 1
            ? { id: 'job-one', status: 'RUNNING', stage: 'READING', errorCode: null }
            : { id: 'job-two', status: 'FAILED', stage: 'FAILED', errorCode: 'SOURCE_ATTRIBUTES_UNMATCHED' };
        } else {
          statusReads++;
          if (state.job?.status === 'RUNNING') {
            polls++;
            if (polls === 1) state.job.stage = 'VALIDATING';
            else {
              state.job = { ...state.job, status: 'SUCCEEDED', stage: 'SUCCEEDED' };
              state.source = { id: 'batch-updated', importedAt: new Date().toISOString() };
            }
          }
        }
        body = state;
      } else { unexpected.push(req.method() + ' ' + url.pathname); status = 404; body = {}; }
      await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    await page.clock.install();
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(20000);
    await page.goto(origin + '/my-customer-accounts?currency=GBP', { waitUntil: 'domcontentloaded' });
    const button = page.getByRole('button', { name: 'Update Logo data', exact: true });
    await button.waitFor();
    await page.getByText('Automatic updates: every 15 minutes', { exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Update Logo data') && !b.disabled));
    if (role === 'SALES') {
      const before = reads.length;
      await button.click();
      const updating = page.getByRole('button', { name: 'Updating…', exact: true });
      await updating.waitFor();
      assert.equal(await updating.isDisabled(), true);
      await page.waitForFunction(() => document.body.textContent?.includes('Checking data'));
      const refreshed = page.waitForResponse(r => new URL(r.url()).pathname === '/sales-ledger' && new URL(r.url()).searchParams.get('refresh') === 'true');
      await page.clock.fastForward(5100);
      await page.getByText('Update completed', { exact: true }).waitFor();
      await refreshed;
      assert(reads.slice(before).some(r => r.refresh === 'true'), 'New batch must reload the scoped sales list');
      assert.equal(posts, 1);
      const goodBatch = state.source.id;
      await button.click();
      await page.getByText('Logo payment and invoice records do not match. Finance review required; previous data retained.', { exact: true }).waitFor();
      assert.equal(state.source.id, goodBatch);
      assert.equal(await button.isEnabled(), true);

      // Another user's import must refresh an idle sales screen too.
      const external = page.waitForResponse(r => new URL(r.url()).pathname === '/sales-ledger' && new URL(r.url()).searchParams.get('refresh') === 'true');
      state.source = { id: 'batch-from-another-user', importedAt: new Date(Date.now() + 500).toISOString() };
      await page.clock.fastForward(30100);
      await external;

      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      const hiddenReads = statusReads;
      await page.clock.fastForward(60100);
      assert.equal(statusReads, hiddenReads, 'Hidden tabs must stop status polling');
      const resumed = page.waitForResponse(r => new URL(r.url()).pathname === '/finance-sync');
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
      await resumed;
      state.automatic.sourceStale = true;
      state.automatic.blockedReason = 'RETRY_LIMIT_REACHED';
      await page.clock.fastForward(30100);
      await page.getByText('Logo data is over 30 minutes old. Showing the last successful import.', { exact: true }).waitFor();
      await page.getByText('Automatic update retry limit reached. Check the connection and request another update.', { exact: true }).waitFor();
      assert.equal(await button.isEnabled(), true, 'A stopped automatic schedule must allow manual recovery');
      state.automatic.blockedReason = 'REVIEW_REQUIRED';
      await page.clock.fastForward(30100);
      await page.getByText('Automatic updates need review. Check the Logo data and request another update.', { exact: true }).waitFor();
      state.automatic.blockedReason = null;
      state.automatic.schedulerStale = true;
      await page.clock.fastForward(30100);
      await page.getByText('Automatic scheduler status could not be verified.', { exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    console.log(`PASS ${role}: Logo button enabled${role === 'SALES' ? ', one job, progress, refreshed sales list, retained data on failure, external import, visibility polling' : ''}`);
  } finally { await context.close(); }
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try { for (const role of ['SALES', 'MANAGER', 'ADMIN']) await check(browser, role); }
  finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
