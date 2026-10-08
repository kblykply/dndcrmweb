/* eslint-disable @typescript-eslint/no-require-imports */
// All business requests use synthetic installment fixtures. Nothing is sent or written.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = new URL(process.env.FRONTEND_URL || 'http://127.0.0.1:3000').origin;
const output = process.env.REPORT_OUTPUT || '/private/tmp/collection-report-browser.json';
fs.mkdirSync(path.dirname(output), { recursive: true });
const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Famagusta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const currentMonth = asOf.slice(0, 7);
const shift = (value, offset) => {
  const [y, m] = value.split('-').map(Number), n = y * 12 + m - 1 + offset;
  return `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`;
};
const nextMonth = shift(currentMonth, 1);
const monthName = (value) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
const projectChoices = [['LA_JOYA', 'La Joya'], ['LA_JOYA_PERLA', 'La Joya Perla'], ['LA_JOYA_PERLA_II', 'La Joya Perla II'], ['LAGOON_VERDE', 'Lagoon Verde'], ['GECITKALE_1_ETAP', 'Geçitkale 1. Etap'], ['UNKNOWN', 'Other / unmatched']];
const cases = [];
function addCase(currency, installments, metadata = {}) {
  const index = cases.length + 1;
  cases.push({ key: index.toString(16).padStart(64, '0'), customerCode: `TEST-C${index}`, customerName: `Synthetic Customer ${index}`, unitCode: `TEST-U${index}`, unitName: `Synthetic Unit ${index}`, currency, projectGroup: 'LA_JOYA', representatives: ['Rep Alpha'], invoiceOk: { status: 'matched', values: ['DND'], hasBlank: false }, coded: false, ...metadata, installments: installments.map(([month, amount, paid, kind = 'sale', day = '15']) => ({ dueDate: month === null ? null : `${month}-${day}`, amount, paid, kind, outstanding: amount === null || paid === null ? null : Math.max(amount - paid, 0) })) });
}
addCase('GBP', [[shift(currentMonth, -14), 250, 250], [shift(currentMonth, -1), 1000, 500], [currentMonth, 400, 100, 'sale', '01'], [currentMonth, 120, 20, 'sale', asOf.slice(-2)], [nextMonth, 1000, 250, 'sale', '05'], [nextMonth, 500, 0, 'sale', '20'], [shift(currentMonth, 2), 2000, 0], [null, 90, 10], [nextMonth, 200, 20, 'vat']]);
addCase('GBP', [[nextMonth, 400, 400]], { projectGroup: 'LA_JOYA_PERLA', representatives: ['Rep Beta'], coded: true });
for (let index = 0; index < 26; index++) addCase('GBP', [[nextMonth, 100, 0]], index === 0 ? { representatives: ['Rep Alpha', 'Rep Beta'] } : index === 1 ? { representatives: [] } : {});
addCase('EUR', [[shift(currentMonth, -2), 200, 40], [nextMonth, 800, 200]], { projectGroup: 'LA_JOYA_PERLA', representatives: ['Rep Beta'] });
addCase('EUR', [[nextMonth, 100, 150]], { projectGroup: 'LA_JOYA_PERLA', representatives: ['Rep Beta'] });
addCase('TL', [[nextMonth, 300, 0]]);
addCase('USD', [[nextMonth, 50, 10]]);
addCase(null, [[nextMonth, null, null]], { projectGroup: 'UNKNOWN' });
cases[2].invoiceOk = { status: 'matched', values: ['DND', 'KOZANSOY'], hasBlank: false };
cases[3].invoiceOk = { status: 'matched', values: ['GÜL'], hasBlank: false };
cases[4].invoiceOk = { status: 'matched', values: [], hasBlank: true };
const invoiceCategory = (field) => !field || field.status !== 'matched' ? 'unknown' : field.values.length + Number(field.hasBlank) > 1 ? 'mixed' : field.values.length ? `value:${field.values[0]}` : field.hasBlank ? 'blank' : 'unknown';
const knownSum = (values) => values.length === 0 ? 0 : values.some((value) => value !== null) ? values.reduce((sum, value) => sum + (value ?? 0), 0) : null;
function totals(lines) {
  return {
    scheduled: knownSum(lines.map(({ installment }) => installment.amount)),
    paidToDate: knownSum(lines.map(({ installment }) => installment.paid)),
    outstanding: knownSum(lines.map(({ installment }) => installment.outstanding)),
    overdue: knownSum(lines.map(({ installment: line }) => !line.dueDate ? (line.outstanding === 0 ? 0 : null) : line.dueDate < asOf ? line.outstanding : 0)),
    caseCount: new Set(lines.map(({ item }) => item.key)).size,
    installmentCount: lines.length,
    incompleteRows: lines.filter(({ item, installment: line }) => item.currency === null || line.dueDate === null || line.amount === null || line.paid === null).length,
  };
}
const agingKeys = ['1_30', '31_60', '61_90', '90_plus'];
function ageBucket(dueDate) {
  const age = (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000;
  return age <= 30 ? '1_30' : age <= 60 ? '31_60' : age <= 90 ? '61_90' : '90_plus';
}
function fixture(params) {
  const currency = params.get('currency') || 'GBP', mode = currency === '__ALL__' ? 'all' : 'single';
  const selectedCurrency = ['__ALL__', '__NULL__'].includes(currency) ? null : currency;
  const paymentKind = params.get('paymentKind') || 'sale', project = params.get('projectGroup') || '', representative = params.get('representative') || '', authorizationState = params.get('authorizationState') || 'blank';
  const representativeState = params.get('representativeState') || '';
  const invoiceOk = params.get('invoiceOk') || 'value:DND';
  const repGroup = (item) => {
    const names = [...new Set(item.representatives.filter((name) => name.trim()))];
    return names.length === 1 ? { key: `single:${names[0]}`, representative: names[0], representativeState: 'single' } : { key: names.length ? 'multiple' : 'unassigned', representative: null, representativeState: names.length ? 'multiple' : 'unassigned' };
  };
  const startMonth = params.get('startMonth') || nextMonth, months = Number(params.get('months') || 6), month = params.get('detailMonth') || nextMonth;
  const detailScope = params.get('detailScope') || 'month', agingBucket = params.get('agingBucket') || '';
  const periods = Array.from({ length: months }, (_, index) => shift(startMonth, index));
  const currencies = ['GBP', 'EUR', 'TL', 'USD', null].map((value) => ({ value, label: value ?? 'Unspecified currency', recordCount: cases.filter((item) => item.currency === value).reduce((sum, item) => sum + item.installments.length, 0) }));
  const selected = cases.filter((item) => (invoiceOk === 'all' || invoiceCategory(item.invoiceOk) === invoiceOk) && (mode === 'all' || item.currency === selectedCurrency) && (!project || item.projectGroup === project) && (!representative || item.representatives.includes(representative)) && (!representativeState || repGroup(item).representativeState === representativeState) && (authorizationState === 'all' || authorizationState === 'blank' && !item.coded || authorizationState === 'coded' && item.coded));
  const lines = selected.flatMap((item) => item.installments.filter((line) => paymentKind === 'all' || line.kind === paymentKind).map((installment) => ({ item, installment })));
  const historicalPeriods = [...new Set(lines.map(({ installment: line }) => line.dueDate?.slice(0, 7)).filter((month) => month && month < currentMonth))].sort();
  const byCurrency = currencies.filter(({ value }) => mode === 'all' || value === selectedCurrency).map(({ value: currency }) => {
    const selectedLines = lines.filter(({ item }) => item.currency === currency);
    const performance = (entries) => {
      const value = totals(entries);
      return { ...value, completionPercent: currency !== null && value.incompleteRows === 0 && value.scheduled > 0 && !entries.some(({ installment }) => installment.amount < 0 || installment.paid < 0)
        ? Math.round(value.paidToDate / value.scheduled * 10000) / 100 : null };
    };
    const breakdown = (entries) => ({
      period: performance(entries.filter(({ installment: line }) => periods.includes(line.dueDate?.slice(0, 7)))),
      overdue: totals(entries.filter(({ installment: line }) => line.dueDate && line.dueDate < asOf && (line.outstanding === null || line.outstanding > 0))),
      nextMonth: totals(entries.filter(({ installment: line }) => line.dueDate?.startsWith(nextMonth))),
      monthly: periods.map((month) => ({ month, ...performance(entries.filter(({ installment: line }) => line.dueDate?.startsWith(month))) })),
    });
    const overdue = selectedLines.filter(({ installment: line }) => line.dueDate && line.dueDate < asOf && (line.outstanding === null || line.outstanding > 0));
    const next = selectedLines.filter(({ installment: line }) => line.dueDate?.startsWith(nextMonth));
    const exact = (entries) => currency === null || entries.some(({ installment: line }) => line.outstanding === null) ? null : entries.reduce((sum, { installment: line }) => sum + line.outstanding, 0);
    const overdueTotal = exact(overdue), nextTotal = exact(next);
    const share = (amount, total) => amount === null || total === null || total === 0 ? null : Math.round(amount / total * 10000) / 100;
    const accounts = new Map();
    overdue.forEach(({ item, installment: line }) => accounts.set(item.customerCode, (accounts.get(item.customerCode) || 0) + (line.outstanding || 0)));
    const top = [...accounts.values()].sort((a, b) => b - a).slice(0, 20).reduce((a, b) => a + b, 0);
    return {
      currency, summary: totals(selectedLines),
      period: performance(selectedLines.filter(({ installment: line }) => periods.includes(line.dueDate?.slice(0, 7)))),
      projectBreakdown: [...new Set(selectedLines.map(({ item }) => item.projectGroup))].map((projectGroup) => ({ projectGroup, ...breakdown(selectedLines.filter(({ item }) => item.projectGroup === projectGroup)) })),
      representativeBreakdown: [...new Map(selectedLines.map(({ item }) => { const group = repGroup(item); return [group.key, group]; })).values()].map((group) => ({ ...group, ...breakdown(selectedLines.filter(({ item }) => repGroup(item).key === group.key)) })),
      overdue: totals(overdue), aging: agingKeys.map((key) => ({ key, ...totals(overdue.filter(({ installment }) => ageBucket(installment.dueDate) === key)) })), nextMonth: totals(next),
      currentMonthRemaining: totals(selectedLines.filter(({ installment: line }) => line.dueDate?.startsWith(currentMonth) && line.dueDate >= asOf)),
      overdueConcentration: { complete: overdueTotal !== null, customerGroupCount: overdueTotal === null ? null : accounts.size, top20GroupCount: overdueTotal === null ? null : Math.min(20, accounts.size), top20Outstanding: overdueTotal === null ? null : top, top20SharePercent: share(top, overdueTotal) },
      projectInsights: [...new Set(selectedLines.map(({ item }) => item.projectGroup))].map((projectGroup) => {
        const overdueOutstanding = exact(overdue.filter(({ item }) => item.projectGroup === projectGroup));
        const nextMonthOutstanding = exact(next.filter(({ item }) => item.projectGroup === projectGroup));
        return { projectGroup, overdueOutstanding, nextMonthOutstanding, overdueSharePercent: share(overdueOutstanding, overdueTotal), nextMonthSharePercent: share(nextMonthOutstanding, nextTotal) };
      }),
      undated: totals(selectedLines.filter(({ installment: line }) => !line.dueDate)),
      beforeWindow: totals(selectedLines.filter(({ installment: line }) => line.dueDate && line.dueDate.slice(0, 7) < startMonth)),
      afterWindow: totals(selectedLines.filter(({ installment: line }) => line.dueDate && line.dueDate.slice(0, 7) > periods.at(-1))),
      monthly: periods.map((month) => ({ month, ...performance(selectedLines.filter(({ installment: line }) => line.dueDate?.startsWith(month))) })),
      historical: historicalPeriods.map((month) => ({ month, ...performance(selectedLines.filter(({ installment: line }) => line.dueDate?.startsWith(month))) })),
    };
  });
  const detailRows = selected.map((item) => {
    const relevant = lines.filter((entry) => {
      const line = entry.installment;
      return entry.item.key === item.key && (detailScope === 'month' ? line.dueDate?.startsWith(month) : detailScope === 'overdue' ? line.dueDate && line.dueDate < asOf && (line.outstanding === null || line.outstanding > 0) && (!agingBucket || ageBucket(line.dueDate) === agingBucket) : detailScope === 'period' ? periods.includes(line.dueDate?.slice(0, 7)) : !line.dueDate);
    });
    if (!relevant.length) return null;
    const { installments: unused, coded: ignored, ...row } = item; void unused; void ignored;
    const dates = relevant.map((entry) => entry.installment.dueDate).filter(Boolean).sort();
    return { ...row, earliestDueDate: dates[0] || null, lastDueDate: dates.at(-1) || null, totals: totals(relevant) };
  }).filter(Boolean).sort((a, b) => a.currency !== b.currency ? a.currency === null ? 1 : b.currency === null ? -1 : a.currency.localeCompare(b.currency) : (b.totals.outstanding ?? -1) - (a.totals.outstanding ?? -1) || a.key.localeCompare(b.key));
  const pageSize = Number(params.get('pageSize') || 25), totalPages = Math.max(1, Math.ceil(detailRows.length / pageSize)), page = Math.min(Number(params.get('page') || 1), totalPages);
  return {
    source: { audit: { status: 'verified', checkedAt: new Date().toISOString(), financialChecks: 'passed', reviewCaseCount: 0, excludedVatRows: 0 }, database: 'LOGO_DND', view: 'L_223_ODEME_PLANI', asOf, generatedAt: new Date().toISOString(), recordCount: cases.reduce((sum, item) => sum + item.installments.length, 0), freshness: { status: 'fresh', retryAfterMs: null, maxAgeSeconds: 300 }, authorizationSource: { view: 'L_223_FATURA_VADE', status: 'available', matchedCases: cases.length, unmatchedCases: 0, multipleCodeCases: 0, message: null } },
    selectedInvoiceOk: invoiceOk, invoiceOkOptions: ['value:DND', 'value:GÜL', 'value:KOZANSOY', 'blank', 'mixed', 'unknown'].map((value) => ({ value, label: value.startsWith('value:') ? value.slice(6) : value, caseCount: cases.filter((item) => invoiceCategory(item.invoiceOk) === value).length })),
    analyticsVersion: 1, basis: 'original', currencyMode: mode, selectedCurrency, selectedPaymentKind: paymentKind, selectedProjectGroup: project, selectedRepresentative: representative, selectedRepresentativeState: representativeState, selectedAuthorizationState: authorizationState, startMonth, months, nextMonth, periods, historicalPeriods, currencies,
    projectGroups: projectChoices.map(([value, label]) => ({ value, label, caseCount: cases.filter((item) => item.projectGroup === value).length })),
    representatives: ['Rep Alpha', 'Rep Beta'].map((value) => ({ value, label: value, caseCount: cases.filter((item) => item.representatives.includes(value)).length })),
    byCurrency, detail: { scope: detailScope, agingBucket, month, rows: detailRows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: detailRows.length, totalPages },
  };
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block', acceptDownloads: true });
  const requests = [], unexpected = [], errors = [];
  let failed = false, forbidden = false, invalid = false, old = false, auditInvalid = false, invalidAging = false, invalidDetail = false, held = null;
  try {
    await context.addInitScript(() => {
      localStorage.setItem('accessToken', 'isolated-collection-report-token');
      localStorage.setItem('user', JSON.stringify({ id: 'fixture-admin', name: 'Synthetic Admin', role: 'ADMIN' }));
      localStorage.setItem('crm-locale', 'en'); localStorage.setItem('crm-theme', 'light');
    });
    await context.routeWebSocket('**/*', (socket) => socket.close());
    await context.route('**/*', async (route) => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (url.pathname.startsWith('/socket.io')) return route.fulfill({ status: 200, body: '1' });
      const api = ['fetch', 'xhr'].includes(request.resourceType());
      if (url.origin === origin && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/__nextjs') || (!api && !url.pathname.startsWith('/api/')) || request.headers().rsc === '1')) return route.continue();
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type' };
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const apiPath = url.pathname.replace(/^\/api(?=\/)/, '');
      if (apiPath === '/payment-collection-report' && method === 'GET') {
        requests.push(Object.fromEntries(url.searchParams));
        if (held) { const pending = held; held = null; pending.started(); await pending.promise; }
        if (forbidden) return route.fulfill({ status: 403, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) });
        if (auditInvalid) return route.fulfill({ status: 503, headers, contentType: 'application/json', body: JSON.stringify({ code: 'PAYMENT_TRACKING_SOURCE_AUDIT_INVALID', message: 'Synthetic financial check failed' }) });
        if (failed) return route.fulfill({ status: 503, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic report source unavailable' }) });
        const body = fixture(url.searchParams);
        if (invalid) body.byCurrency[0].currency = 'INVALID';
        if (invalidAging) body.byCurrency[0].aging[0].outstanding += 1000000;
        if (invalidDetail) body.detail.scope = body.detail.scope === 'month' ? 'period' : 'month';
        if (old) body.source.generatedAt = new Date(Date.now() - 301000).toISOString();
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (apiPath === '/notifications' || apiPath === '/notifications/unread-count') return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(apiPath.endsWith('unread-count') ? { unread: 0 } : []) });
      unexpected.push(`${method} ${apiPath}`);
      return route.fulfill({ status: 503, headers, body: '{}' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(60000);
    page.on('pageerror', (error) => errors.push(error.message));
    const main = page.locator('#crm-main-content');
    const overview = main.getByTestId('collection-overview'), charts = main.getByTestId('collection-charts'), risk = main.getByTestId('collection-risk'), breakdowns = main.getByTestId('collection-breakdowns');
    const filters = main.getByTestId('collection-filter-panel'), details = main.locator('[data-report-cases]'), history = main.locator('[data-report-history]');
    const monthly = charts.getByRole('table', { name: 'Monthly due details', exact: true, includeHidden: true });
    const kpi = (key) => overview.locator(`[data-kpi="${key}"]`);
    async function after(action) {
      const response = page.waitForResponse((response) => /^(?:\/api)?\/payment-collection-report$/.test(new URL(response.url()).pathname));
      await Promise.all([action(), response]);
      await page.waitForFunction(() => {
        const button = document.querySelector('#crm-main-content button[aria-label="Refresh"],#crm-main-content button[aria-label="Yenile"]');
        return button && !button.disabled;
      });
    }
    async function advanced(open = true) {
      const button = filters.getByRole('button', { name: /^(More filters|Diğer filtreler)/ });
      if (await button.getAttribute('aria-expanded') !== String(open)) await button.click();
    }
    async function disclosure(locator, open = true) { if (await locator.evaluate((element) => element.open) !== open) await locator.locator(':scope > summary').click(); }
    async function selectFilter(label, value) { await filters.getByLabel(label, { exact: true }).selectOption(value); }
    async function caseFilters(open = true) {
      const button = filters.getByRole('button', { name: /^(Case list|Dosya listesi)/ });
      if (await button.getAttribute('aria-expanded') !== String(open)) await button.click();
    }
    async function showCases(scope, value = '') {
      const before = requests.length, previousUrl = page.url();
      await caseFilters();
      await selectFilter('Case scope', scope);
      if (scope === 'month') await filters.getByLabel('Due month', { exact: true }).fill(value || nextMonth);
      if (scope === 'overdue') await selectFilter('Overdue age', value);
      assert.equal(requests.length, before, 'Case controls wait for Show cases');
      assert.equal(page.url(), previousUrl, 'Case drafts do not change applied URL state');
      await after(() => filters.getByRole('button', { name: 'Show cases', exact: true }).click());
    }
    async function assertStaticChart(locator, description) {
      const before = requests.length, previousUrl = page.url();
      assert.equal(await locator.evaluate((element) => !!element.closest('button,[role=button]') || element.getAttribute('tabindex') === '0' || element.parentElement?.getAttribute('role') === 'button'), false, `${description} has no button semantics`);
      await locator.click({ force: true });
      await page.waitForTimeout(100);
      assert.equal(requests.length, before, `${description} does not fetch or filter`);
      assert.equal(page.url(), previousUrl, `${description} does not change the URL`);
    }
    async function apply() { await after(() => filters.getByRole('button', { name: 'Apply', exact: true }).click()); }
    async function allInvoice() {
      await after(() => filters.getByRole('button', { name: /Invoice OK: .* remove filter/ }).click());
      assert.equal(requests.at(-1).invoiceOk, 'all');
    }
    async function assertAmounts(next = '3,850.00', period = '5,850.00', overdue = '800.00') {
      assert((await kpi('next').innerText()).includes(next));
      assert((await charts.locator('[data-period-total]').innerText()).includes(period));
      assert((await kpi('overdue').innerText()).includes(overdue));
    }
    const initialUrl = `${origin}/finance/collection-report`;
    const allUrl = `${initialUrl}?invoiceOk=all&currency=GBP&authorizationState=blank`;
    await page.goto(initialUrl); await overview.waitFor(); await charts.waitFor(); await risk.waitFor(); await breakdowns.waitFor();
    assert.deepEqual([requests[0].months, requests[0].paymentKind, requests[0].authorizationState, requests[0].invoiceOk, requests[0].detailScope], ['6', 'sale', 'blank', 'value:DND', 'month']);
    await assertAmounts('3,550.00', '5,550.00');
    assert((await kpi('current').innerText()).includes('100.00'));
    assert.equal(await filters.getByRole('button', { name: /^More filters/ }).getAttribute('aria-expanded'), 'false');
    assert.equal(await filters.getByLabel('Currency', { exact: true }).isVisible(), true);
    assert.equal(await filters.getByLabel('Project', { exact: true }).isVisible(), true);
    assert.equal(await filters.getByLabel('Sales representative', { exact: true }).isVisible(), true);
    assert.equal(await filters.getByLabel('Report period', { exact: true }).isVisible(), true);
    assert.equal(await filters.getByRole('button', { name: /^Case list/ }).getAttribute('aria-expanded'), 'false');
    for (const locator of [charts.getByTestId('collection-monthly-table'), main.getByTestId('collection-report-help'), history, details]) assert.equal(await locator.evaluate((element) => element.open), false);
    assert.equal(await main.getByRole('link', { name: 'Payment Tracking', exact: true }).getAttribute('href'), '/finance/payment-tracking');
    assert.equal(await overview.locator('[data-kpi]').count(), 3);
    assert.equal(await kpi('period').count(), 0, 'Period total appears with the monthly chart instead of a fourth KPI');
    assert.equal(await charts.getByLabel('Chart period', { exact: true }).count(), 0, 'Report period is the sole date control');
    const layout = await main.evaluate((element) => {
      const bounds = (selector) => element.querySelector(selector).getBoundingClientRect();
      return { viewportWidth: innerWidth, filterHeight: Math.round(bounds('[data-testid="collection-filter-panel"]').height), chartTop: Math.round(bounds('[data-testid="collection-charts"]').top), overviewHeight: Math.round(bounds('[data-testid="collection-overview"]').height) };
    });
    fs.writeFileSync(path.join(path.dirname(output), 'initial-layout.json'), JSON.stringify(layout, null, 2));
    assert(layout.filterHeight < 280, 'Collapsed filters stay compact on desktop');
    assert(layout.chartTop < 875, 'Charts appear sooner than the previous desktop layout');
    await page.screenshot({ path: path.join(path.dirname(output), 'initial-desktop-en.png'), animations: 'disabled' });
    const beforeHelp = requests.length;
    await disclosure(main.getByTestId('collection-report-help'));
    assert((await main.getByTestId('collection-report-help').innerText()).includes('cash'));
    await disclosure(main.getByTestId('collection-report-help'), false);
    assert.equal(requests.length, beforeHelp, 'Report guidance is local and optional');
    await allInvoice(); await assertAmounts();
    assert.equal(await charts.getAttribute('data-chart-currency'), 'GBP');
    assert.equal(await risk.getAttribute('data-risk-state'), 'ready');
    assert.equal(await risk.locator('[data-aging-bucket]').count(), 4);
    assert((await risk.locator('[data-aging-bucket="90_plus"]').innerText()).includes('Over 90 days'));
    assert.equal(await monthly.locator('tbody tr').count(), 6);
    assert.equal(await monthly.isVisible(), false, 'Monthly data table stays collapsed until requested');

    // Local chart views and accessible tables never re-read the financial source.
    const beforeViews = requests.length;
    await charts.getByLabel('Chart view', { exact: true }).selectOption('cumulative');
    assert.equal(await charts.getAttribute('data-chart-mode'), 'cumulative');
    await assertStaticChart(charts.locator(`svg [data-month="${nextMonth}"]`).first(), 'Cumulative chart point');
    await disclosure(charts.getByTestId('collection-monthly-table'));
    assert((await monthly.locator('tbody tr').last().innerText()).includes('5,850.00'));
    await charts.getByLabel('Chart view', { exact: true }).selectOption('performance');
    assert.equal(await charts.locator('.recharts-bar').count(), 3);
    await assertStaticChart(charts.locator(`svg [data-month="${nextMonth}"]`).first(), 'Settlement chart bar');
    const firstPerformance = monthly.locator(`tr[data-performance-month="${nextMonth}"]`);
    for (const value of ['4,100.00', '250.00', '3,850.00', '6.1%']) assert((await firstPerformance.innerText()).includes(value));
    assert.equal(await charts.locator('table').count(), 1, 'One monthly table covers schedule, settlement and remaining dues');
    const monthlySum = (await monthly.locator('[data-month-outstanding]').allTextContents()).reduce((sum, value) => sum + Number(value.replaceAll(',', '').trim()), 0);
    assert.equal(monthlySum, 5850);
    await charts.getByLabel('Chart view', { exact: true }).selectOption('remaining');
    await breakdowns.getByLabel('Shown amount', { exact: true }).selectOption('overdue');
    assert((await breakdowns.locator('[data-breakdown="project"]').textContent()).includes('800.00'));
    await breakdowns.getByLabel('Shown amount', { exact: true }).selectOption('period');
    assert.equal(requests.length, beforeViews);
    await assertStaticChart(charts.locator(`svg [data-month="${nextMonth}"]`).first(), 'Monthly chart bar');
    await assertStaticChart(risk.locator('[data-aging-bucket="1_30"]'), 'Aging bucket');
    await assertStaticChart(breakdowns.locator('svg [data-group-key="LA_JOYA"]').first(), 'Project breakdown bar');
    await assertStaticChart(breakdowns.locator('svg [data-group-key="single:Rep Alpha"]').first(), 'Representative breakdown bar');
    assert.equal(await charts.locator('svg [role="button"]').count(), 0);
    assert.equal(await breakdowns.locator('svg [role="button"]').count(), 0);

    // Top controls expose month, overdue, age, period and undated details explicitly.
    await showCases('overdue');
    assert.equal(requests.at(-1).detailScope, 'overdue');
    assert.equal(requests.at(-1).agingBucket, undefined); await assertAmounts();
    await after(() => kpi('overdue').click());
    assert.equal(requests.at(-1).detailScope, 'overdue');
    assert.equal(await details.locator('tbody tr').count(), 1); assert((await details.innerText()).includes('800.00')); await assertAmounts();
    const nonzeroAge = fixture(new URLSearchParams('invoiceOk=all&currency=GBP')).byCurrency[0].aging.find((bucket) => bucket.outstanding > 0).key;
    await showCases('overdue', nonzeroAge);
    assert.equal(requests.at(-1).agingBucket, nonzeroAge); assert.equal(requests.at(-1).detailScope, 'overdue'); await assertAmounts();
    await showCases('overdue', '90_plus');
    assert.equal(await details.locator('tbody tr').count(), 0); await assertAmounts();
    await showCases('period');
    assert.equal(requests.at(-1).detailScope, 'period'); assert.equal(requests.at(-1).agingBucket, undefined);
    assert((await details.locator('tbody tr').first().innerText()).includes('3,250.00')); await assertAmounts();
    await showCases('undated');
    assert.equal(requests.at(-1).detailScope, 'undated'); assert.equal(await details.locator('tbody tr').count(), 1);
    assert((await details.locator('tbody tr').first().innerText()).includes('—'), 'Undated incomplete amount remains unknown');
    const later = shift(currentMonth, 2);
    await showCases('month', later);
    assert.equal(requests.at(-1).detailScope, 'month'); assert.equal(requests.at(-1).detailMonth, later);
    assert((await details.locator('tbody tr').first().innerText()).includes('2,000.00'));
    await after(() => monthly.getByRole('button', { name: `View cases: ${monthName(nextMonth)}`, exact: true }).click());
    assert.equal(await details.locator('tbody tr').count(), 25);
    assert((await details.locator('tbody tr').first().innerText()).includes('1,250.00'), 'Case amount is selected-month debt, not lifetime debt');
    assert((await details.locator('tbody tr').first().getByRole('link').getAttribute('href')).includes(cases[0].key));
    await after(() => details.getByRole('button', { name: 'Next page', exact: true }).click());
    assert.equal(await details.locator('tbody tr').count(), 2); await assertAmounts();
    await after(() => details.getByLabel('Rows per page', { exact: true }).selectOption('50'));
    assert.equal(await details.locator('tbody tr').count(), 27); assert.equal(requests.at(-1).page, '1');
    const beforeHistory = requests.length; await disclosure(history);
    assert.equal(await history.locator('tbody tr').count(), 2); assert.equal(requests.length, beforeHistory);
    await after(() => history.getByRole('button', { name: `View cases: ${monthName(shift(currentMonth, -14))}`, exact: true }).click());
    assert.equal(await details.locator('tbody tr').first().locator('td').last().innerText(), '0.00');
    await disclosure(history, false);

    // Group tables stay informational; explicit top filters have reversible applied chips.
    const repTable = breakdowns.getByTestId('representative-breakdown-table'); await disclosure(repTable);
    assert((await repTable.locator('[data-breakdown-key="single:Rep Alpha"]').innerText()).includes('5,650.00'));
    for (const [name, state] of [['Multiple representatives', 'multiple'], ['Unassigned representative', 'unassigned']]) {
      assert.equal(await repTable.getByRole('button', { name, exact: true }).count(), 0);
      await advanced(); await selectFilter('Representative status', state); await apply();
      assert.equal(requests.at(-1).representativeState, state); assert((await kpi('next').innerText()).includes('100.00'));
      await after(() => filters.getByRole('button', { name: `${name} remove filter`, exact: true }).click());
      await disclosure(repTable);
    }
    assert.equal(await repTable.getByRole('button', { name: 'Rep Alpha', exact: true }).count(), 0);
    await selectFilter('Sales representative', 'Rep Alpha'); await apply();
    assert((await kpi('next').innerText()).includes('3,750.00'));
    await after(() => filters.getByRole('button', { name: 'Rep Alpha remove filter', exact: true }).click());
    await disclosure(repTable, false);
    await selectFilter('Project', 'LA_JOYA'); await apply();
    assert.equal(requests.at(-1).projectGroup, 'LA_JOYA');
    await after(() => filters.getByRole('button', { name: 'La Joya remove filter', exact: true }).click());

    // Editing drafts has no financial effect; detail clicks use confirmed scope and preserve the draft.
    await advanced(); const beforeDraft = requests.length;
    await selectFilter('Invoice OK', 'mixed'); await selectFilter('Sales representative', 'Rep Alpha');
    assert.equal(requests.length, beforeDraft); await assertAmounts();
    assert((await filters.getByRole('status').innerText()).includes('not applied yet'));
    await showCases('overdue', '1_30');
    assert.equal(requests.at(-1).invoiceOk, 'all'); assert.equal(requests.at(-1).representative, undefined);
    assert.equal(requests.at(-1).agingBucket, '1_30');
    assert.equal(await filters.getByLabel('Invoice OK', { exact: true }).inputValue(), 'mixed');
    assert.equal(await filters.getByLabel('Sales representative', { exact: true }).inputValue(), 'Rep Alpha');
    await selectFilter('Case scope', 'month');
    await filters.getByLabel('Due month', { exact: true }).fill(nextMonth);
    const beforeDetailEnter = requests.length;
    await after(() => filters.getByLabel('Due month', { exact: true }).press('Enter'));
    assert.equal(requests.length, beforeDetailEnter + 1, 'Enter submits only the case form once');
    assert.equal(requests.at(-1).detailScope, 'month'); assert.equal(requests.at(-1).detailMonth, nextMonth);
    assert.equal(requests.at(-1).invoiceOk, 'all'); assert.equal(requests.at(-1).representative, undefined);
    assert.equal(await filters.getByLabel('Invoice OK', { exact: true }).inputValue(), 'mixed');
    assert.equal(await filters.getByLabel('Sales representative', { exact: true }).inputValue(), 'Rep Alpha');
    await assertAmounts();
    await selectFilter('Sales representative', ''); await apply();
    assert.equal(requests.at(-1).invoiceOk, 'mixed'); assert.equal(requests.at(-1).detailScope, 'month'); assert.equal(requests.at(-1).agingBucket, undefined);
    assert((await kpi('next').innerText()).includes('100.00'));
    assert((await monthly.locator('tbody tr').first().innerText()).includes('100.00'));
    assert(!(await breakdowns.innerText()).includes('5,650.00'));
    await after(() => kpi('next').click());
    assert.equal(await details.locator('tbody tr').count(), 1);
    assert((await details.innerText()).includes('DND · KOZANSOY')); await allInvoice();
    assert.equal(new URL(page.url()).searchParams.get('invoiceOk'), 'all');

    // Date presets, custom ranges and reset preserve the intended period and initial DND defaults.
    await selectFilter('Report period', 'next12'); assert.equal(requests.at(-1).months, '6'); await apply();
    assert.equal(await monthly.locator('tbody tr').count(), 12);
    await selectFilter('Report period', 'past12'); await apply();
    assert.equal(requests.at(-1).startMonth, shift(currentMonth, -12));
    assert((await charts.locator('[data-period-total]').innerText()).includes('500.00'));
    assert.equal(await monthly.locator('tbody tr').count(), 12);
    assert.equal(await monthly.locator('tbody tr').first().getAttribute('data-chart-month'), shift(currentMonth, -12));
    await selectFilter('Report period', 'custom'); await filters.getByLabel('Period start', { exact: true }).fill(shift(currentMonth, -14)); await selectFilter('Period length', '6'); await apply();
    assert((await monthly.locator('tbody tr').first().innerText()).includes('100%'), 'Paid historical dues remain visible through the top period filter');
    assert.equal(await monthly.locator('tbody tr').first().getAttribute('data-chart-month'), shift(currentMonth, -14));
    await selectFilter('Report period', 'custom'); await filters.getByLabel('Period start', { exact: true }).fill(shift(currentMonth, -1)); await selectFilter('Period length', '6'); await apply();
    assert((await charts.locator('[data-period-total]').innerText()).includes('6,750.00'));
    await after(() => filters.getByRole('button', { name: 'Reset', exact: true }).click());
    assert.equal(requests.at(-1).invoiceOk, 'value:DND'); assert.equal(requests.at(-1).authorizationState, 'blank'); assert.equal(requests.at(-1).startMonth, undefined); await assertAmounts('3,550.00', '5,550.00'); await allInvoice();

    // One local currency selection synchronizes every chart without combining currencies or making a read.
    await selectFilter('Currency', '__ALL__'); await apply();
    const currencyTabs = filters.getByRole('group', { name: 'Chart currency', exact: true });
    assert.equal(await currencyTabs.count(), 1);
    const beforeCurrency = requests.length;
    for (const [currency, next] of [['GBP', '3,850.00'], ['EUR', '600.00'], ['TL', '300.00'], ['USD', '40.00']]) {
      await currencyTabs.getByRole('button', { name: currency, exact: true }).click();
      await page.waitForFunction((currency) => document.querySelector('[data-testid="collection-charts"]')?.getAttribute('data-chart-currency') === currency, currency);
      assert.equal(await breakdowns.getAttribute('data-breakdown-currency'), currency); assert.equal(await risk.getAttribute('data-risk-currency'), currency);
      assert((await kpi('next').innerText()).includes(next));
    }
    assert.equal(requests.length, beforeCurrency); assert(!(await overview.innerText()).includes('4,790.00'));
    await currencyTabs.getByRole('button', { name: 'Unspecified currency', exact: true }).click();
    assert((await kpi('next').innerText()).includes('—')); assert.equal(await risk.getAttribute('data-risk-state'), 'partial'); assert.equal(await risk.locator('[data-aging-bucket]').count(), 0);
    assert.equal(await charts.locator('[data-chart="monthly"]').getAttribute('data-chart-state'), 'partial');
    await currencyTabs.getByRole('button', { name: 'EUR', exact: true }).click();
    await showCases('month', nextMonth);
    assert.equal(requests.at(-1).currency, '__ALL__', 'Top case filters retain the applied financial currency scope');
    await after(() => details.getByLabel('Rows per page', { exact: true }).selectOption('50'));
    assert((await details.innerText()).includes('GBP')); assert((await details.innerText()).includes('EUR'));
    await after(() => kpi('next').click());
    assert.equal(requests.at(-1).currency, 'EUR', 'An explicit KPI detail uses the displayed currency');
    assert.equal(await details.locator('tbody tr').count(), 2); assert((await monthly.locator('tbody tr').first().innerText()).includes('600.00'));
    await selectFilter('Project', 'LA_JOYA_PERLA'); await selectFilter('Sales representative', 'Rep Beta'); await apply();
    assert.equal(requests.at(-1).projectGroup, 'LA_JOYA_PERLA'); assert.equal(requests.at(-1).representative, 'Rep Beta');
    await page.reload(); await overview.waitFor(); await charts.waitFor(); await risk.waitFor();
    assert.equal(new URL(page.url()).searchParams.get('currency'), 'EUR'); assert.equal(new URL(page.url()).searchParams.get('projectGroup'), 'LA_JOYA_PERLA');
    assert.equal(await details.evaluate((element) => element.open), false);

    // CSV reflects confirmed filter scope and all monthly rows, never only the detail page.
    const downloadPromise = page.waitForEvent('download'); await main.getByRole('button', { name: 'Excel / CSV', exact: true }).click();
    const download = await downloadPromise, csv = fs.readFileSync(await download.path(), 'utf8');
    assert(download.suggestedFilename().endsWith('.csv')); assert(csv.includes('"Fatura OK";"all"')); assert(csv.includes('"LA_JOYA_PERLA"')); assert(csv.includes('"Rep Beta"')); assert(csv.includes('"EUR"')); assert(!csv.includes('"GBP"')); assert(csv.includes('"600"')); assert(csv.includes('not cash receipts'));
    fs.writeFileSync(path.join(path.dirname(output), 'confirmed-scope.csv'), csv);
    await after(() => page.goto(`${allUrl}&paymentKind=vat`)); await overview.waitFor(); assert((await kpi('next').innerText()).includes('180.00'));
    await after(() => page.goto(`${allUrl}&projectGroup=UNKNOWN`)); await charts.waitFor(); assert.equal(await charts.locator('[data-chart="monthly"]').getAttribute('data-chart-state'), 'empty');
    await after(() => page.goto(allUrl)); await overview.waitFor(); await charts.waitFor(); await risk.waitFor();

    // Pending and failed reads never relabel last confirmed amounts; stale-scope responses cannot replace them.
    let release, started; const promise = new Promise((resolve) => { release = resolve; }); const begins = new Promise((resolve) => { started = resolve; }); held = { promise, started };
    await selectFilter('Currency', 'EUR'); const pending = apply(); await begins;
    await assertAmounts(); assert.equal(await main.getByRole('button', { name: 'Excel / CSV', exact: true }).isDisabled(), true); release(); await pending;
    assert((await kpi('next').innerText()).includes('600.00'));
    failed = true; await selectFilter('Currency', 'GBP'); await apply(); await main.getByRole('alert').waitFor();
    assert((await kpi('next').innerText()).includes('600.00')); assert.equal(await charts.getAttribute('data-chart-currency'), 'EUR'); assert.equal(await main.getByRole('button', { name: 'Excel / CSV', exact: true }).isDisabled(), true);
    failed = false; await after(() => kpi('next').click()); assert.equal(requests.at(-1).currency, 'EUR');
    await selectFilter('Currency', 'GBP'); await apply(); await assertAmounts();
    for (const failureKind of ['currency', 'aging', 'detail']) {
      invalid = failureKind === 'currency'; invalidAging = failureKind === 'aging'; invalidDetail = failureKind === 'detail';
      await after(() => main.getByRole('button', { name: 'Refresh', exact: true }).click()); await main.getByRole('alert').waitFor();
      assert.equal(await charts.getAttribute('data-chart-currency'), 'GBP'); await assertAmounts(); assert(!(await risk.innerText()).includes('1,000,800'));
      invalid = invalidAging = invalidDetail = false; await after(() => main.getByRole('button', { name: 'Retry', exact: true }).click());
    }
    auditInvalid = true; await after(() => main.getByRole('button', { name: 'Refresh', exact: true }).click()); await main.getByRole('alert').waitFor();
    assert.equal(await overview.count(), 0); assert.equal(await charts.count(), 0); assert.equal(await risk.count(), 0); auditInvalid = false;
    await after(() => main.getByRole('button', { name: 'Retry', exact: true }).click());
    old = true; await after(() => main.getByRole('button', { name: 'Refresh', exact: true }).click()); await main.getByRole('alert').waitFor(); old = false;
    await after(() => main.getByRole('button', { name: 'Retry', exact: true }).click());
    forbidden = true; await after(() => main.getByRole('button', { name: 'Refresh', exact: true }).click()); await main.getByRole('alert').waitFor();
    assert.equal(await overview.count(), 0); assert.equal(await charts.count(), 0); forbidden = false;
    await after(() => main.getByRole('button', { name: 'Retry', exact: true }).click()); await charts.waitFor(); await risk.waitFor(); await breakdowns.waitFor();

    // Synthetic visual evidence: calm dashboard, collapsed tables, keyboard, dark and mobile layouts.
    await advanced(false); await caseFilters(false); await disclosure(details, false); await disclosure(charts.getByTestId('collection-monthly-table'), false);
    const beforeLocale = requests.length; await page.getByLabel('Language', { exact: true }).selectOption('tr'); await main.getByRole('heading', { name: 'Tahsilat Raporu', exact: true }).waitFor(); assert.equal(requests.length, beforeLocale);
    await main.evaluate((element) => element.scrollTo(0, 0)); await page.mouse.move(5, 5);
    const bar = charts.locator(`svg [data-month="${nextMonth}"]`).first(); const barBounds = await bar.boundingBox();
    assert(barBounds && barBounds.width > 5 && barBounds.height > 20);
    await page.screenshot({ path: path.join(path.dirname(output), 'clarity-desktop-tr.png'), animations: 'disabled' });
    await main.screenshot({ path: path.join(path.dirname(output), 'clarity-main-tr.png'), animations: 'disabled' });
    await charts.screenshot({ path: path.join(path.dirname(output), 'clarity-monthly-tr.png'), animations: 'disabled' });
    await risk.screenshot({ path: path.join(path.dirname(output), 'clarity-aging-tr.png'), animations: 'disabled' });
    await breakdowns.screenshot({ path: path.join(path.dirname(output), 'clarity-breakdowns-tr.png'), animations: 'disabled' });
    await charts.getByLabel('Grafik görünümü', { exact: true }).selectOption('cumulative'); await charts.screenshot({ path: path.join(path.dirname(output), 'clarity-cumulative-tr.png'), animations: 'disabled' });
    await charts.getByLabel('Grafik görünümü', { exact: true }).selectOption('performance'); await charts.screenshot({ path: path.join(path.dirname(output), 'clarity-settlement-tr.png'), animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: path.join(path.dirname(output), 'clarity-desktop-dark-tr.png'), animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; }); await charts.getByLabel('Grafik görünümü', { exact: true }).selectOption('remaining');
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await main.evaluate((element) => element.scrollTo(0, 0)); await page.screenshot({ path: path.join(path.dirname(output), 'clarity-mobile-tr.png'), animations: 'disabled' });
    await charts.screenshot({ path: path.join(path.dirname(output), 'clarity-monthly-mobile-tr.png'), animations: 'disabled' });
    await risk.screenshot({ path: path.join(path.dirname(output), 'clarity-aging-mobile-tr.png'), animations: 'disabled' });
    await breakdowns.screenshot({ path: path.join(path.dirname(output), 'clarity-breakdowns-mobile-tr.png'), animations: 'disabled' });
    await advanced(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await filters.screenshot({ path: path.join(path.dirname(output), 'clarity-filters-mobile-tr.png'), animations: 'disabled' });
    const beforeDenied = requests.length;
    await page.evaluate(() => { localStorage.setItem('user', JSON.stringify({ id: 'preview', role: 'PREVIEW' })); window.dispatchEvent(new Event('storage')); });
    await page.waitForTimeout(300); assert.equal(await overview.count(), 0); assert.equal(await charts.count(), 0); assert.equal(await risk.count(), 0); assert.equal(requests.length, beforeDenied);
    assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
    const result = { status: 'PASS', initialDesktopLayout: layout, threeSummaryCards: 'PASS', singlePeriodAuthority: 'PASS', consolidatedMonthlyDetails: 'PASS', optionalReportHelp: 'PASS', allRequestsMocked: true, mockedRequests: requests.length, mockedWrites: 0, dndBlankDefaultsAndReset: 'PASS', invoiceOkMixedAndAllScope: 'PASS', futureAndOverdueBalanced: 'PASS', cumulativeAndSettlement: 'PASS', collapsedAccessibleTables: 'PASS', chartsDoNotFilter: 'PASS', staticGroupTables: 'PASS', topMonthAgePeriodUndatedFilters: 'PASS', explicitDetailActions: 'PASS', sameAggregateAcrossDetailPages: 'PASS', disjointGroups: 'PASS', draftIsolationAndPeriodPresets: 'PASS', detailEnterDraftIsolation: 'PASS', topCurrencyWithoutFetch: 'PASS', displayedCurrencyDetailScope: 'PASS', topDetailKeepsAllCurrencies: 'PASS', historicalAndPaidCases: 'PASS', csvConfirmedScope: 'PASS', invalidAgingAndDetailRejected: 'PASS', retainedConfirmedAmountsOnFailure: 'PASS', sourceAndAccessGuards: 'PASS', mobileAndDark: 'PASS' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } catch (error) {
    const page = context.pages()[0]; console.error('Last report requests', requests.slice(-3));
    if (page) { console.error('Labels', await page.locator('#crm-main-content label').allTextContents()); console.error('Alerts', await page.getByRole('alert').allTextContents()); await page.screenshot({ path: path.join(path.dirname(output), 'failure.png'), animations: 'disabled' }); }
    throw error;
  } finally { await context.close(); await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
