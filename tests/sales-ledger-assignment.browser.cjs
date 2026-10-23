// Synthetic API only: no live financial data or real assignments are changed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/private/tmp/crm-message-browser-tools/node_modules/playwright');
const { paymentList } = require('../../api/dist/src/payment-tracking/payment-tracking.service');
const origin = process.env.FRONTEND_URL || 'http://localhost:3004';
const out = path.resolve(__dirname, '../../artifacts/sales-ledger-assignment');
const sourceCode = fs.readFileSync(path.join(__dirname, 'payment-tracking.browser.cjs'), 'utf8').split('async function main()')[0];
const fixtureRequire = name => name === 'playwright' ? { chromium } : require(name);
const fixture = new Function('require', 'process', sourceCode + '\nreturn {source,base};')(fixtureRequire, process);
fixture.base.authorization = { status: 'matched', codes: [], hasBlank: true };
fixture.base.representatives = ['DND'];
fixture.base.sourceReview = null;
fixture.base.installments = [{ sequence: 1, projectCode: 'LA JOYA A1', paymentKind: 'sale', dueDate: '2026-01-01', amount: 2000, paid: 500, outstanding: 1500, overdueDays: 30, status: 'overdue' }];
const options = [{ id: 'okan', name: 'Okan Afsar', role: 'SALES' }, { id: 'bob', name: 'Bob Parpiev', role: 'SALES' }];
(async () => {
 fs.mkdirSync(out, { recursive: true });
 const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 const results = [];
 try {
  async function setup(role) {
   const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
   const user = { id: 'fixture-' + role, role, name: 'Synthetic ' + role };
   await context.addInitScript(user => { localStorage.setItem('accessToken', 'synthetic-token'); localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('crm-locale', 'tr'); }, user);
   await context.routeWebSocket('**/*', socket => socket.close());
   let assignment = { userId: null, userName: null, changedByName: null, updatedAt: null, version: 0 };
   let conflict = false; const writes = [], errors = [];
   const page = await context.newPage();page.on('pageerror', e => errors.push(e.message));
   await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const api = ['fetch', 'xhr'].includes(req.resourceType());
    if (url.origin === origin && (url.pathname.startsWith('/_next/') || req.headers().rsc === '1' || !api)) return route.continue();
    const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,PUT,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body = {}, status = 200;
    if (url.pathname === '/sales-ledger') {
     const snapshot = { ...fixture.source, cases: [{ ...fixture.base, followupAssignment: assignment }] };
     body = { ...paymentList(snapshot, [], user, Object.fromEntries(url.searchParams)), followupAssignees: role === 'MANAGER' ? options : [], canAssignFollowup: role === 'MANAGER' };
    } else if (url.pathname.endsWith('/followup-assignment')) {
     const input = req.postDataJSON(); writes.push(input);
     if (conflict) { status = 409; body = { statusCode: 409, message: 'Atama başka kullanıcı tarafından değiştirildi.' }; }
     else { assignment = { ...assignment, userId: input.userId, userName: options.find(o => o.id === input.userId)?.name || null, version: assignment.version + 1, changedByName: 'Manager' }; body = { item: { ...fixture.base, followupAssignment: assignment } }; }
    } else if (url.pathname.endsWith('/auth/me')) body = user;
    else if (url.pathname.includes('unread-count')) body = { count: 0 };
    else if (url.pathname.includes('notifications')) body = { items: [], total: 0 };
    await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
   });
   await page.goto(origin + '/my-customer-accounts?currency=GBP&representative=DND');
   await page.getByRole('columnheader', { name: 'Sorumlu', exact: true }).waitFor();
   return { context, page, writes, errors, reject: () => { conflict = true; } };
  }
  const manager = await setup('MANAGER'), p = manager.page;
  const headers = await p.locator('table thead th').allTextContents();assert.equal(headers.at(-1), 'Sorumlu');
  await p.getByRole('button', { name: /Sorumluyu değiştir/ }).click();
  let dialog = p.getByRole('dialog');await dialog.getByLabel('Takip sorumlusu', { exact: true }).selectOption('okan');
  await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();await dialog.waitFor({ state: 'hidden' });
  await p.getByRole('button', { name: /Sorumluyu değiştir:.*Okan Afsar/ }).waitFor();assert.deepEqual(manager.writes[0], { userId: 'okan', expectedVersion: 0 });assert(p.url().includes('representative=DND'));
  await p.screenshot({ path: out + '/assigned-column.png', fullPage: true });results.push('Manager assigns from last column; current owner and selected filter preserved');
  await p.getByRole('button', { name: /Sorumluyu değiştir/ }).click();dialog = p.getByRole('dialog');assert.equal(await dialog.getByLabel('Takip sorumlusu', { exact: true }).inputValue(), 'okan');
  await dialog.getByLabel('Takip sorumlusu', { exact: true }).selectOption('bob');await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();await dialog.waitFor({ state: 'hidden' });
  await p.getByRole('button', { name: /Sorumluyu değiştir:.*Bob Parpiev/ }).waitFor();assert.equal(manager.writes[1].expectedVersion, 1);results.push('Reassignment uses latest version');
  await p.getByRole('button', { name: /Sorumluyu değiştir/ }).click();dialog = p.getByRole('dialog');await dialog.getByLabel('Takip sorumlusu', { exact: true }).selectOption('');await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();await dialog.waitFor({ state: 'hidden' });assert.equal(manager.writes[2].userId, null);results.push('Assignment can be removed');
  manager.reject();await p.getByRole('button', { name: /Sorumluyu değiştir/ }).click();dialog = p.getByRole('dialog');await dialog.getByLabel('Takip sorumlusu', { exact: true }).selectOption('okan');await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('Takip sorumlusu', { exact: true }).inputValue(), 'okan');results.push('Conflict keeps draft and shows error');assert.deepEqual(manager.errors, []);await manager.context.close();
  const sales = await setup('SALES');assert.equal(await sales.page.getByRole('button', { name: /Sorumluyu değiştir/ }).count(), 0);assert.equal(sales.writes.length, 0);assert.deepEqual(sales.errors, []);await sales.context.close();results.push('Sales representatives see owner column without assignment permission');
  console.log(JSON.stringify(results, null, 2));fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
