import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename);
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  modules.set(filename, exports);
  new Function("exports", "require", output)(exports, (name) => load(name.startsWith("@/")
    ? path.join(base, `${name.slice(2)}.ts`) : path.resolve(path.dirname(filename), `${name}.ts`)));
  return exports;
}
const { hasReportContract: validateReport, readReportFilters, reportQuery, reportDefaults, reportFilterError, reportCurrencyToken, shiftMonth, usableReportSource } = load(path.join(base, "app/(app)/finance/collection-report/_lib/report.ts"));
// These pre-existing fixtures each model one case. Supply the new analytics
// projection so their scope/history/source regression checks remain focused.
function withAnalytics(input) {
  const data = structuredClone(input);
  data.analyticsVersion = 1;
  data.selectedRepresentativeState = "";
  data.detail.scope ??= "month";
  data.detail.agingBucket ??= "";
  for (const part of data.byCurrency) {
    const performance = (row) => ({ ...row, completionPercent: part.currency !== null && row.incompleteRows === 0 && row.scheduled > 0 && row.paidToDate >= 0
      ? Math.round(row.paidToDate / row.scheduled * 10000) / 100 : null });
    part.monthly = part.monthly.map(performance);
    part.historical = part.historical.map(performance);
    const period = { ...zero() };
    for (const field of ["scheduled", "paidToDate", "outstanding", "overdue"]) {
      const populated = part.monthly.filter((row) => row.installmentCount > 0);
      const known = populated.filter((row) => row[field] !== null);
      period[field] = !populated.length ? 0 : !known.length ? null : known.reduce((sum, row) => sum + row[field], 0);
    }
    period.caseCount = Math.max(0, ...part.monthly.map((row) => row.caseCount));
    period.installmentCount = part.monthly.reduce((sum, row) => sum + row.installmentCount, 0);
    period.incompleteRows = part.monthly.reduce((sum, row) => sum + row.incompleteRows, 0);
    part.period = performance(period);
    const group = { period: part.period, overdue: part.overdue, nextMonth: part.nextMonth, monthly: part.monthly };
    part.projectBreakdown = [{ projectGroup: "LA_JOYA", ...group }];
    part.representativeBreakdown = [{ key: "unassigned", representative: null, representativeState: "unassigned", ...group }];
    part.aging ??= ["1_30", "31_60", "61_90", "90_plus"].map((key, index) => ({ key, ...(index === 0 ? part.overdue : zero()) }));
  }
  return data;
}
function hasReportContract(input, ...args) {
  return validateReport(withAnalytics(input), ...args);
}
const now = Date.parse("2026-10-02T10:00:00Z");
const zero = () => ({ scheduled: 0, paidToDate: 0, outstanding: 0, overdue: 0, caseCount: 0, installmentCount: 0, incompleteRows: 0 });
const nextTotals = () => ({ ...zero(), scheduled: 1000, paidToDate: 250, outstanding: 750, caseCount: 1, installmentCount: 1 });
function fixture(currency = "GBP") {
  const totals = nextTotals();
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth("2026-11", index));
  return {
    source: { audit: { status: "verified", checkedAt: new Date(now - 1000).toISOString(), financialChecks: "passed", reviewCaseCount: 0, excludedVatRows: 0 }, database: "LOGO_DND", view: "L_223_ODEME_PLANI", generatedAt: new Date(now - 1000).toISOString(), asOf: "2026-10-02", freshness: { status: "fresh", retryAfterMs: null, maxAgeSeconds: 300 }, authorizationSource: { view: "L_223_FATURA_VADE", status: "available" } },
    basis: "original", currencyMode: "single", selectedCurrency: currency,
    selectedInvoiceOk: reportDefaults.invoiceOk, invoiceOkOptions: [{ value: "value:DND", label: "DND", caseCount: 1 }],
    selectedPaymentKind: "sale", selectedProjectGroup: "", selectedRepresentative: "", selectedAuthorizationState: "blank",
    startMonth: "2026-11", months: 6, nextMonth: "2026-11", periods: months, historicalPeriods: [],
    currencies: [{ value: currency, label: currency || "Unknown", recordCount: 1 }],
    projectGroups: ["LA_JOYA", "LA_JOYA_PERLA", "LA_JOYA_PERLA_II", "LAGOON_VERDE", "GECITKALE_1_ETAP", "NEOCITY", "UNKNOWN"].map((value) => ({ value, label: value, caseCount: 0 })), representatives: [],
    byCurrency: [{ currency, summary: { ...totals }, overdue: zero(), nextMonth: { ...totals }, undated: zero(), beforeWindow: zero(), afterWindow: zero(),
      monthly: months.map((month) => ({ month, ...(month === "2026-11" ? totals : zero()) })), historical: [] }],
    detail: { month: "2026-11", rows: [{ invoiceOk: { status: "matched", values: ["DND"], hasBlank: false }, key: "synthetic", customerName: "Test", unitName: "Unit", currency, projectGroup: "LA_JOYA", representatives: [], totals: { ...totals } }], page: 1, pageSize: 25, total: 1, totalPages: 1 },
  };
}

test("defaults and explicit all/unknown scope round-trip without losing original period selection", () => {
  assert.deepEqual(readReportFilters(new URLSearchParams()), reportDefaults);
  for (const currency of ["GBP", "__ALL__", "__NULL__"]) {
    const filters = { ...reportDefaults, currency, startMonth: "2026-12", detailMonth: "2027-01", months: 24, representative: " Name & Team ", authorizationState: "all", page: 2, pageSize: 50 };
    assert.deepEqual(readReportFilters(reportQuery(filters)), filters);
  }
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(reportFilterError({ ...reportDefaults, startMonth: "1700-01" }, false), "Choose a valid period (1753–9998).");
  assert(reportFilterError({ ...reportDefaults, startMonth: "9998-12", months: 24 }, false));
});

test("valid original-due report is accepted and scope substitutions are rejected", () => {
  assert(hasReportContract(fixture(), reportDefaults, now));
  for (const field of ["selectedInvoiceOk", "selectedPaymentKind", "selectedProjectGroup", "selectedRepresentative", "selectedAuthorizationState"]) {
    const data = fixture(); data[field] = "different";
    assert.equal(hasReportContract(data, reportDefaults, now), false, field);
  }
  assert.equal(hasReportContract(fixture(), { ...reportDefaults, currency: "EUR" }, now), false);
  assert.equal(hasReportContract({ ...fixture(), basis: "tracking" }, reportDefaults, now), false);
});

test("all currencies and unspecified single currency remain distinct and every selected partition is required", () => {
  const unknown = fixture(null);
  assert(hasReportContract(unknown, { ...reportDefaults, currency: "__NULL__" }, now));
  assert.equal(reportCurrencyToken(unknown), "__NULL__");
  const all = fixture(); all.currencyMode = "all"; all.selectedCurrency = null;
  assert(hasReportContract(all, { ...reportDefaults, currency: "__ALL__" }, now));
  assert.equal(reportCurrencyToken(all), "__ALL__");
  assert.equal(hasReportContract(all, { ...reportDefaults, currency: "__NULL__" }, now), false);
  assert.equal(hasReportContract(unknown, { ...reportDefaults, currency: "__ALL__" }, now), false);
  all.currencies.push({ value: "TL", label: "TL", recordCount: 0 });
  assert.equal(hasReportContract(all, { ...reportDefaults, currency: "__ALL__" }, now), false);
});

test("empty results follow the API's one-page contract", () => {
  const data = fixture();
  data.byCurrency[0] = { currency: "GBP", summary: zero(), overdue: zero(), nextMonth: zero(), undated: zero(), beforeWindow: zero(), afterWindow: zero(), monthly: data.periods.map((month) => ({ month, ...zero() })), historical: [] };
  data.detail.rows = []; data.detail.total = 0;
  assert(hasReportContract(data, reportDefaults, now));
  data.detail.totalPages = 0;
  assert.equal(hasReportContract(data, reportDefaults, now), false);
});

test("signed source allocations and partial/unknown totals remain valid without permitting negative debt", () => {
  for (const amount of [-100, null]) {
    const data = fixture();
    for (const item of [data.byCurrency[0].summary, data.byCurrency[0].nextMonth, data.byCurrency[0].monthly[0], data.detail.rows[0].totals]) {
      item.scheduled = amount; item.paidToDate = amount; item.outstanding = amount === null ? null : 0; item.incompleteRows = amount === null ? 1 : 0;
    }
    assert(hasReportContract(data, reportDefaults, now));
  }
  const bad = fixture(); bad.detail.rows[0].totals.outstanding = -1;
  assert.equal(hasReportContract(bad, reportDefaults, now), false);
});

test("financial partition, monthly order, next month and detail scope must agree", () => {
  for (const alter of [
    (data) => { data.byCurrency[0].nextMonth.outstanding += 1; },
    (data) => { data.byCurrency[0].summary.scheduled += 1; },
    (data) => { data.byCurrency[0].summary.installmentCount += 1; },
    (data) => { data.periods.reverse(); },
    (data) => { data.nextMonth = "2026-12"; },
    (data) => { data.detail.month = "2026-10"; },
    (data) => { data.detail.total += 1; },
    (data) => { data.detail.rows[0].currency = "EUR"; },
  ]) {
    const data = fixture(); alter(data); assert.equal(hasReportContract(data, reportDefaults, now), false);
  }
});

test("future, expired and previous Famagusta-day sources cannot show financial amounts", () => {
  const source = fixture().source;
  assert(usableReportSource(source, now));
  for (const update of [
    { generatedAt: new Date(now + 1).toISOString() },
    { generatedAt: new Date(now - 300000).toISOString() },
    { asOf: "2026-10-01" },
    { generatedAt: "invalid" },
    { database: "Crm_DND" },
    { authorizationSource: undefined },
  ]) assert.equal(usableReportSource({ ...source, ...update }, now), false);
  assert(usableReportSource({ ...source, freshness: { ...source.freshness, status: "stale" } }, now));
});

function withHistory() {
  const data = fixture(), part = data.byCurrency[0];
  const paid = { ...zero(), scheduled: 100, paidToDate: 100, caseCount: 1, installmentCount: 1 };
  const unpaid = { ...zero(), scheduled: 200, paidToDate: 50, outstanding: 150, overdue: 150, caseCount: 1, installmentCount: 1 };
  data.historicalPeriods = ["2024-12", "2026-09"];
  part.historical = [{ month: "2024-12", ...paid }, { month: "2026-09", ...unpaid }];
  part.beforeWindow = { scheduled: 300, paidToDate: 150, outstanding: 150, overdue: 150, caseCount: 1, installmentCount: 2, incompleteRows: 0 };
  part.summary = { scheduled: 1300, paidToDate: 400, outstanding: 900, overdue: 150, caseCount: 1, installmentCount: 3, incompleteRows: 0 };
  part.overdue = { ...unpaid };
  return data;
}

function withInsights() {
  const data = withHistory(), part = data.byCurrency[0];
  part.currentMonthRemaining = zero();
  part.overdueConcentration = { complete: true, customerGroupCount: 1, top20GroupCount: 1, top20Outstanding: 150, top20SharePercent: 100 };
  part.projectInsights = [{ projectGroup: "LA_JOYA", overdueOutstanding: 150, nextMonthOutstanding: 750, overdueSharePercent: 100, nextMonthSharePercent: 100 }];
  return data;
}

test("current-month and priority insights retain separate scopes and reject misleading concentration", () => {
  assert(hasReportContract(withInsights(), reportDefaults, now));
  for (const alter of [
    (part) => { part.currentMonthRemaining.overdue = 1; },
    (part) => { part.currentMonthRemaining.outstanding = -1; },
    (part) => { part.overdueConcentration.top20Outstanding = 151; },
    (part) => { part.overdueConcentration.top20SharePercent = 99; },
    (part) => { part.overdueConcentration.top20GroupCount = 20; },
    (part) => { part.overdueConcentration.complete = false; },
    (part) => { part.overdueConcentration.customerGroupCount = 0; part.overdueConcentration.top20GroupCount = 0; },
  ]) {
    const data = withInsights(); alter(data.byCurrency[0]);
    assert.equal(hasReportContract(data, reportDefaults, now), false);
  }
});

test("project priorities must partition overdue and next-month amounts with matching shares", () => {
  for (const alter of [
    (rows) => { rows.push({ ...rows[0] }); },
    (rows) => { rows[0].projectGroup = "LA_JOYA_PERLA_III"; },
    (rows) => { rows[0].nextMonthOutstanding = 1000; },
    (rows) => { rows[0].overdueSharePercent = 90; },
    (rows) => { rows[0].overdueOutstanding = null; },
    (rows) => { rows[0].nextMonthSharePercent = NaN; },
  ]) {
    const data = withInsights(); alter(data.byCurrency[0].projectInsights);
    assert.equal(hasReportContract(data, reportDefaults, now), false);
  }
  const split = withInsights();
  split.byCurrency[0].projectInsights = [
    { projectGroup: "LA_JOYA", overdueOutstanding: 90, nextMonthOutstanding: 250, overdueSharePercent: 60, nextMonthSharePercent: 33.33 },
    { projectGroup: "LA_JOYA_PERLA", overdueOutstanding: 60, nextMonthOutstanding: 500, overdueSharePercent: 40, nextMonthSharePercent: 66.67 },
  ];
  assert(hasReportContract(split, reportDefaults, now));
});

test("unavailable concentration and unknown currency never manufacture a percent", () => {
  const data = withInsights();
  data.byCurrency[0].overdueConcentration = { complete: false, customerGroupCount: null, top20GroupCount: null, top20Outstanding: null, top20SharePercent: null };
  assert(hasReportContract(data, reportDefaults, now));
  const unknown = fixture(null);
  unknown.byCurrency[0].projectInsights = [{ projectGroup: "LA_JOYA", overdueOutstanding: null, nextMonthOutstanding: null, overdueSharePercent: null, nextMonthSharePercent: null }];
  assert(hasReportContract(unknown, { ...reportDefaults, currency: "__NULL__" }, now));
  unknown.byCurrency[0].projectInsights[0].nextMonthSharePercent = 0;
  assert.equal(hasReportContract(unknown, { ...reportDefaults, currency: "__NULL__" }, now), false);
});

test("historical axes accept fully paid old months, reject current/future, duplicate or incomplete history", () => {
  assert(hasReportContract(withHistory(), reportDefaults, now));
  for (const alter of [
    (data) => { delete data.historicalPeriods; },
    (data) => { data.historicalPeriods[1] = "2026-10"; data.byCurrency[0].historical[1].month = "2026-10"; },
    (data) => { data.historicalPeriods.reverse(); data.byCurrency[0].historical.reverse(); },
    (data) => { data.historicalPeriods[1] = "2024-12"; data.byCurrency[0].historical[1].month = "2024-12"; },
    (data) => { data.byCurrency[0].historical.pop(); },
    (data) => { data.byCurrency[0].historical[0] = { month: "2024-12", ...zero() }; },
  ]) {
    const data = withHistory(); alter(data);
    assert.equal(hasReportContract(data, reportDefaults, now), false);
  }
});

test("historical drilldown outside the visible window validates case count without double-counting history", () => {
  const data = withHistory();
  data.detail.month = "2024-12";
  data.detail.rows[0].totals = { ...data.byCurrency[0].historical[0] };
  const filters = { ...reportDefaults, detailMonth: "2024-12" };
  assert(hasReportContract(data, filters, now));
  data.detail.total = 2;
  assert.equal(hasReportContract(data, filters, now), false);
});

test("history and an explicitly selected past-month window must agree for overlapping months", () => {
  const data = withHistory();
  data.startMonth = "2026-09";
  data.periods = Array.from({ length: 6 }, (_, index) => shiftMonth(data.startMonth, index));
  const part = data.byCurrency[0];
  part.monthly = data.periods.map((month) => ({ month, ...(month === "2026-09" ? part.historical[1] : month === "2026-11" ? nextTotals() : zero()) }));
  part.beforeWindow = { ...part.historical[0] };
  const filters = { ...reportDefaults, startMonth: "2026-09" };
  assert(hasReportContract(data, filters, now));
  part.historical[1].outstanding += 1;
  assert.equal(hasReportContract(data, filters, now), false);
});


test("Invoice OK report URL and financial scope are exact, including mixed and unknown mappings", () => {
  for (const invoiceOk of ["all", "blank", "mixed", "unknown", "value:DND", "value:GÜL", "value: Code & /  "]) {
    const filters = { ...reportDefaults, invoiceOk, currency: "__ALL__", projectGroup: "LA_JOYA", representative: "Rep", detailMonth: "2026-12", page: 2 };
    assert.deepEqual(readReportFilters(reportQuery(filters)), filters);
  }
  const data = fixture(); data.selectedInvoiceOk = "value:DND";
  assert(hasReportContract(data, { ...reportDefaults, invoiceOk: "value:DND" }, now));
  assert.equal(hasReportContract(data, { ...reportDefaults, invoiceOk: "all" }, now), false);
  data.detail.rows[0].invoiceOk.values.push("KOZANSOY");
  assert.equal(hasReportContract(data, { ...reportDefaults, invoiceOk: "value:DND" }, now), false);
  data.selectedInvoiceOk = "mixed";
  assert(hasReportContract(data, { ...reportDefaults, invoiceOk: "mixed" }, now));
  data.detail.rows[0].invoiceOk = undefined;
  assert.equal(hasReportContract(data, { ...reportDefaults, invoiceOk: "mixed" }, now), false);
  data.selectedInvoiceOk = "unknown";
  assert(hasReportContract(data, { ...reportDefaults, invoiceOk: "unknown" }, now));
  assert.equal(reportDefaults.invoiceOk, "value:DND");
  delete data.invoiceOkOptions;
  assert.equal(hasReportContract(data, { ...reportDefaults, invoiceOk: "unknown" }, now), false);
});

function withAging() {
  const data = withHistory(), part = data.byCurrency[0];
  const recent = { ...zero(), scheduled: 120, paidToDate: 20, outstanding: 100, overdue: 100, caseCount: 1, installmentCount: 1 };
  const old = { ...zero(), scheduled: 80, paidToDate: 30, outstanding: 50, overdue: 50, caseCount: 1, installmentCount: 1 };
  data.historicalPeriods = ["2024-12", "2026-07", "2026-09"];
  part.historical = [part.historical[0], { month: "2026-07", ...old }, { month: "2026-09", ...recent }];
  part.beforeWindow.installmentCount = 3;
  part.summary.installmentCount = 4;
  part.overdue.installmentCount = 2;
  part.aging = [
    { key: "1_30", ...recent },
    { key: "31_60", ...zero() },
    { key: "61_90", ...zero() },
    { key: "90_plus", ...old },
  ];
  return withAnalytics(data);
}

test("detail scopes and aging filters round-trip in URLs while keeping the DND default", () => {
  assert.equal(reportDefaults.invoiceOk, "value:DND");
  assert.equal(reportDefaults.detailScope, "month");
  assert.equal(reportDefaults.agingBucket, "");
  for (const detailScope of ["month", "overdue", "period", "undated"]) {
    for (const agingBucket of detailScope === "overdue" ? ["", "1_30", "31_60", "61_90", "90_plus"] : [""]) {
      const filters = { ...reportDefaults, detailScope, agingBucket, currency: "__ALL__", detailMonth: "2026-09", page: 3 };
      assert.deepEqual(readReportFilters(reportQuery(filters)), filters);
      assert.equal(reportFilterError(filters, false), "");
    }
  }
  for (const detailScope of ["month", "period", "undated"]) {
    const filters = readReportFilters(new URLSearchParams({ detailScope, agingBucket: "1_30" }));
    assert(reportFilterError(filters, false), "An aging bucket cannot silently change a non-overdue scope.");
  }
  assert(reportFilterError({ ...reportDefaults, detailScope: "bogus" }, false));
  assert(reportFilterError({ ...reportDefaults, agingBucket: "bogus" }, false));
});

test("aging partitions money and installments without adding repeated case counts", () => {
  const data = withAging(), part = data.byCurrency[0];
  assert.equal(part.overdue.caseCount, 1);
  assert.equal(part.aging.reduce((sum, bucket) => sum + bucket.caseCount, 0), 2);
  assert(validateReport(data, reportDefaults, now));
  const decimal = withAging();
  decimal.byCurrency[0].aging[0].outstanding += 1e-10;
  decimal.byCurrency[0].aging[0].overdue += 1e-10;
  assert(validateReport(decimal, reportDefaults, now), "Accept harmless floating-point summation differences.");
});

test("missing, reordered, duplicated or financially inconsistent aging is rejected", () => {
  for (const alter of [
    (part) => { delete part.aging; },
    (part) => { part.aging = null; },
    (part) => { part.aging.reverse(); },
    (part) => { part.aging.pop(); },
    (part) => { part.aging[1].key = "1_30"; },
    (part) => { part.aging[0].scheduled += 1; },
    (part) => { part.aging[0].paidToDate += 1; },
    (part) => { part.aging[0].outstanding += 1; part.aging[0].overdue += 1; },
    (part) => { part.aging[0].overdue = 0; },
    (part) => { part.aging[0].installmentCount += 1; },
    (part) => { part.aging[0].incompleteRows += 1; },
    (part) => { part.aging[0].caseCount = 2; },
    (part) => { part.aging[1].scheduled = 1; },
    (part) => { part.aging[1].outstanding = null; part.aging[1].overdue = null; },
    (part) => { part.aging[0].outstanding = NaN; },
    (part) => { part.aging[0].outstanding = -1; },
  ]) {
    const data = withAging(); alter(data.byCurrency[0]);
    assert.equal(validateReport(data, reportDefaults, now), false, String(alter));
  }
});

test("unknown aging amounts stay null while known subtotals and incomplete counts remain consistent", () => {
  const input = withAging(), part = input.byCurrency[0];
  const unknown = { ...zero(), scheduled: null, paidToDate: 20, outstanding: null, overdue: null, caseCount: 1, installmentCount: 1, incompleteRows: 1 };
  part.aging[0] = { key: "1_30", ...unknown };
  part.historical[2] = { month: "2026-09", ...unknown };
  part.overdue = { ...part.overdue, scheduled: 80, paidToDate: 50, outstanding: 50, overdue: 50, incompleteRows: 1 };
  part.beforeWindow = { ...part.beforeWindow, scheduled: 180, paidToDate: 150, outstanding: 50, overdue: 50, incompleteRows: 1 };
  part.summary = { ...part.summary, scheduled: 1180, paidToDate: 400, outstanding: 800, overdue: 50, incompleteRows: 1 };
  const data = withAnalytics(input);
  assert(validateReport(data, reportDefaults, now));
  data.byCurrency[0].aging[0].incompleteRows = 0;
  assert.equal(validateReport(data, reportDefaults, now), false);
});

function scopedFixture(scope, agingBucket = "") {
  const data = withAging(), part = data.byCurrency[0];
  data.detail.scope = scope;
  data.detail.agingBucket = agingBucket;
  if (scope === "overdue") {
    const selected = agingBucket ? part.aging.find((bucket) => bucket.key === agingBucket) : part.overdue;
    data.detail.total = selected.caseCount;
    data.detail.rows = selected.caseCount ? [{ ...data.detail.rows[0], totals: { ...selected } }] : [];
  } else if (scope === "period") {
    data.detail.rows[0].totals = { ...part.period };
  } else if (scope === "undated") {
    const undated = { ...zero(), scheduled: 100, paidToDate: 10, outstanding: 90, overdue: null, caseCount: 1, installmentCount: 1, incompleteRows: 1 };
    part.undated = undated;
    part.summary.scheduled += 100;
    part.summary.paidToDate += 10;
    part.summary.outstanding += 90;
    part.summary.installmentCount += 1;
    part.summary.caseCount += 1;
    part.summary.incompleteRows += 1;
    data.detail.rows = [{ ...data.detail.rows[0], key: "undated", earliestDueDate: null, lastDueDate: null, totals: { ...undated } }];
  }
  return data;
}

test("every detail scope verifies its own case count and rejects response scope substitutions", () => {
  for (const [scope, agingBucket] of [["month", ""], ["period", ""], ["undated", ""], ["overdue", ""], ["overdue", "1_30"], ["overdue", "31_60"], ["overdue", "90_plus"]]) {
    const filters = { ...reportDefaults, detailScope: scope, agingBucket };
    const data = scopedFixture(scope, agingBucket);
    assert(validateReport(data, filters, now), `${scope}/${agingBucket}`);
    for (const alter of [
      (detail) => { detail.total += 1; },
      (detail) => { detail.scope = "incorrect"; },
      (detail) => { detail.agingBucket = "incorrect"; },
      (detail) => { delete detail.scope; },
      (detail) => { delete detail.agingBucket; },
    ]) {
      const changed = structuredClone(data); alter(changed.detail);
      assert.equal(validateReport(changed, filters, now), false, `${scope}/${agingBucket}: ${alter}`);
    }
  }
});

test("period detail uses distinct period cases instead of summing monthly case counts", () => {
  const data = fixture(), part = data.byCurrency[0];
  part.monthly[1] = { month: "2026-12", ...nextTotals() };
  part.summary = { scheduled: 2000, paidToDate: 500, outstanding: 1500, overdue: 0, caseCount: 1, installmentCount: 2, incompleteRows: 0 };
  data.detail.scope = "period";
  data.detail.rows[0].totals = { ...part.summary };
  const report = withAnalytics(data), filters = { ...reportDefaults, detailScope: "period" };
  assert.equal(report.byCurrency[0].period.caseCount, 1);
  assert(validateReport(report, filters, now));
  report.detail.total = 2;
  assert.equal(validateReport(report, filters, now), false);
});

test("aging and detail counts cannot be exchanged between currency partitions", () => {
  const data = scopedFixture("overdue", "1_30");
  data.currencyMode = "all";
  data.selectedCurrency = null;
  data.currencies.push({ value: "EUR", label: "EUR", recordCount: 4 });
  data.byCurrency.push({ ...structuredClone(data.byCurrency[0]), currency: "EUR" });
  data.detail.rows.push({ ...structuredClone(data.detail.rows[0]), currency: "EUR", key: "eur" });
  data.detail.total = 2;
  const filters = { ...reportDefaults, currency: "__ALL__", detailScope: "overdue", agingBucket: "1_30" };
  assert(validateReport(data, filters, now));
  data.byCurrency[0].aging[0].outstanding += 10;
  data.byCurrency[0].aging[0].overdue += 10;
  data.byCurrency[1].aging[0].outstanding -= 10;
  data.byCurrency[1].aging[0].overdue -= 10;
  assert.equal(validateReport(data, filters, now), false, "Matching grand totals cannot conceal per-currency errors.");
});

test("scoped details require a complete requested page rather than a misleading partial list", () => {
  for (const scope of ["month", "period", "undated", "overdue"]) {
    const data = scopedFixture(scope), filters = { ...reportDefaults, detailScope: scope };
    assert(validateReport(data, filters, now));
    data.detail.rows = [];
    assert.equal(validateReport(data, filters, now), false);
  }
});
