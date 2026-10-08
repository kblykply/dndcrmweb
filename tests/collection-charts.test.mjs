import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/(app)/finance/collection-report/_lib/charts.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { buildCollectionChartModel, periodOutstanding, completionLabel } = exports;
const zero = () => ({ scheduled: 0, paidToDate: 0, outstanding: 0, overdue: 0, caseCount: 0, installmentCount: 0, incompleteRows: 0 });
const totals = (outstanding, extra = {}) => ({ ...zero(), scheduled: outstanding, outstanding, caseCount: 1, installmentCount: 1, ...extra });

function fixture() {
  return { monthly: [
    { month: "2026-11", ...totals(600) },
    { month: "2026-12", ...totals(0, { scheduled: 100, paidToDate: 150 }) },
    { month: "2027-01", ...totals(100) },
  ] };
}

test("expected collection uses remaining debt and overpayment does not reduce another month's amount", () => {
  const report = fixture();
  const model = buildCollectionChartModel(report);
  assert.deepEqual(model.monthly.map((month) => month.outstanding), [600, 0, 100]);
  assert.equal(periodOutstanding(report.monthly), 700);
  assert.equal(model.monthlyState, "ready");
});

test("chronological month ordering preserves source data and exact current balances", () => {
  const report = fixture(); report.monthly.reverse();
  const before = structuredClone(report);
  assert.deepEqual(buildCollectionChartModel(report).monthly.map((month) => month.month), ["2026-11", "2026-12", "2027-01"]);
  assert.deepEqual(report, before);
});

test("incomplete finite subtotals are masked in the chart and cannot form an exact period total", () => {
  const report = fixture(); report.monthly[1].incompleteRows = 1;
  const model = buildCollectionChartModel(report);
  assert.deepEqual(model.monthly.map((month) => month.outstanding), [600, null, 100]);
  assert.equal(model.monthlyState, "partial");
  assert.equal(periodOutstanding(report.monthly), null);
});

test("missing, negative and nonfinite outstanding amounts never become zero", () => {
  for (const value of [null, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const report = fixture(); report.monthly[0].outstanding = value;
    const model = buildCollectionChartModel(report);
    assert.equal(model.monthly[0].outstanding, null);
    assert.equal(model.monthlyState, "partial");
    assert.equal(periodOutstanding(report.monthly), null);
  }
});

test("empty windows and known zero payments remain distinguishable from missing information", () => {
  assert.equal(periodOutstanding([]), 0);
  assert.equal(buildCollectionChartModel({ monthly: [] }).monthlyState, "empty");
  const noRows = [{ month: "2026-11", ...zero() }];
  assert.equal(periodOutstanding(noRows), 0);
  assert.equal(buildCollectionChartModel({ monthly: noRows }).monthlyState, "empty");
  const fullyPaid = [{ month: "2026-11", ...totals(0, { scheduled: 100, paidToDate: 100 }) }];
  assert.equal(periodOutstanding(fullyPaid), 0);
  assert.equal(buildCollectionChartModel({ monthly: fullyPaid }).monthlyState, "ready");
});

test("each currency is calculated independently and unsafe aggregate overflow is rejected", () => {
  const gbp = fixture();
  const eur = { monthly: [{ month: "2026-11", ...totals(250) }] };
  assert.equal(periodOutstanding(gbp.monthly), 700);
  assert.equal(periodOutstanding(eur.monthly), 250);
  assert.deepEqual(buildCollectionChartModel(eur).monthly.map((month) => month.outstanding), [250]);
  assert.equal(periodOutstanding([totals(1e308), totals(1e308)]), null);
});

test("scheduled and settled amounts are independent bar series, including overpayment", () => {
  const report = { monthly: [{ month: "2026-11", ...totals(0, { scheduled: 100, paidToDate: 150, completionPercent: 150 }) }] };
  const point = buildCollectionChartModel(report).monthly[0];
  assert.equal(point.scheduled, 100);
  assert.equal(point.paidToDate, 150);
  assert.equal(point.outstanding, 0);
  assert.equal(point.completionPercent, 150);
  assert.equal(completionLabel(point.completionPercent, true), "%150");
  assert.equal(completionLabel(point.completionPercent, false), "150%");
});

test("source settlement percentages are not manufactured from aggregate division", () => {
  const report = { monthly: [{ month: "2026-11", ...totals(30, { scheduled: 100, paidToDate: 70, completionPercent: null }) }] };
  assert.equal(buildCollectionChartModel(report).monthly[0].completionPercent, null);
  delete report.monthly[0].completionPercent;
  assert.equal(buildCollectionChartModel(report).monthly[0].completionPercent, null);
  assert.equal(completionLabel(null, true), "—");
  for (const invalid of [-1, Infinity, NaN]) assert.equal(completionLabel(invalid, false), "—");
});

test("incomplete periods hide all amount series and the completion rate", () => {
  const report = { monthly: [{ month: "2026-11", ...totals(50, { scheduled: 100, paidToDate: 50, completionPercent: 50, incompleteRows: 1 }) }] };
  const model = buildCollectionChartModel(report);
  assert.equal(model.performanceState, "partial");
  assert.deepEqual([model.monthly[0].scheduled, model.monthly[0].paidToDate, model.monthly[0].outstanding, model.monthly[0].completionPercent], [null, null, null, null]);
});

test("signed schedule adjustments remain visible but do not receive a completion percentage", () => {
  const report = { monthly: [
    { month: "2026-11", ...totals(0, { scheduled: -100, paidToDate: -100, completionPercent: null }) },
    { month: "2026-12", ...totals(120, { scheduled: 100, paidToDate: -20, completionPercent: null }) },
  ] };
  const model = buildCollectionChartModel(report);
  assert.equal(model.monthly[0].scheduled, -100);
  assert.equal(model.monthly[1].paidToDate, -20);
  assert.deepEqual(model.monthly.map((point) => point.completionPercent), [null, null]);
});

test("zero scheduled values have no completion denominator and missing amounts do not turn into zero", () => {
  const report = { monthly: [
    { month: "2026-11", ...zero(), completionPercent: 0 },
    { month: "2026-12", ...totals(10, { paidToDate: null, completionPercent: 20 }) },
  ] };
  const model = buildCollectionChartModel(report);
  assert.equal(model.monthly[0].completionPercent, null);
  assert.equal(model.monthly[1].paidToDate, null);
  assert.equal(model.monthly[1].outstanding, 10);
  assert.equal(model.monthly[1].completionPercent, null);
  assert.equal(model.performanceState, "partial");
});

test("past-month chart shows the latest twelve in order and preserves the full history", () => {
  const historical = Array.from({ length: 18 }, (_, index) => ({ month: `${2024 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`, ...totals(index + 1), completionPercent: 0 })).reverse();
  const report = { ...fixture(), historical };
  const before = structuredClone(report);
  const model = buildCollectionChartModel(report, "history");
  assert.equal(model.monthly.length, 12);
  assert.equal(model.monthly[0].month, "2024-07");
  assert.equal(model.monthly.at(-1).month, "2025-06");
  assert.equal(model.hiddenHistoryMonths, 6);
  assert.deepEqual(report, before);
  assert.equal(buildCollectionChartModel(report).monthly[0].month, "2026-11");
  assert.equal(buildCollectionChartModel({ monthly: [] }, "history").monthlyState, "empty");
});


test("cumulative chart is chronological within its visible range and never adds another scope", () => {
  const report = fixture(); report.monthly.reverse();
  const model = buildCollectionChartModel(report);
  assert.deepEqual(model.monthly.map((point) => point.cumulativeOutstanding), [600, 600, 700]);
  assert.equal(model.total, 700);
  assert.equal(model.peak.month, "2026-11");
  report.historical = [{ month: "2025-03", ...totals(50) }, { month: "2025-04", ...totals(25) }];
  assert.deepEqual(buildCollectionChartModel(report, "history").monthly.map((point) => point.cumulativeOutstanding), [50, 75]);
});

test("an unknown cumulative point masks that month and every later point without inventing a peak", () => {
  const report = fixture(); report.monthly[1].incompleteRows = 1;
  const model = buildCollectionChartModel(report);
  assert.deepEqual(model.monthly.map((point) => point.cumulativeOutstanding), [600, null, null]);
  assert.equal(model.total, null);
  assert.equal(model.peak, null);
  assert.deepEqual(model.monthly.map((point) => point.outstanding), [600, null, 100]);
  assert.equal(buildCollectionChartModel({ monthly: [] }).total, 0);
  assert.equal(buildCollectionChartModel({ monthly: [{ month: "2026-11", ...totals(0) }] }).peak, null);
});


test("unknown-currency amounts remain unknown even for an empty or numerically complete window", () => {
  for (const report of [fixture(), { monthly: [] }, { monthly: [{ month: "2026-11", ...zero() }] }]) {
    const model = buildCollectionChartModel({ ...report, currency: null });
    assert.equal(model.total, null);
    assert.equal(model.peak, null);
    for (const point of model.monthly) {
      assert.equal(point.outstanding, null);
      assert.equal(point.cumulativeOutstanding, null);
      assert.equal(point.scheduled, null);
      assert.equal(point.paidToDate, null);
    }
  }
});
