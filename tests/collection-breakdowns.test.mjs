import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/(app)/finance/collection-report/_lib/breakdowns.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { buildBreakdownModel } = exports;
const totals = (outstanding, extra = {}) => ({ scheduled: outstanding, paidToDate: 0, outstanding, overdue: 0, caseCount: 1, installmentCount: 1, incompleteRows: 0, completionPercent: 0, ...extra });
const row = (key, period, overdue = 0, nextMonth = 0) => ({ key, label: key, period: totals(period), overdue: totals(overdue), nextMonth: totals(nextMonth) });

test("a top-eight view accounts explicitly for every group left out of the chart", () => {
  const rows = Array.from({ length: 11 }, (_, index) => row(`project-${index}`, (index + 1) * 100));
  const model = buildBreakdownModel(rows, "period");
  assert.equal(model.visible.length, 8);
  assert.equal(model.hiddenCount, 3);
  assert.equal(model.hiddenAmount, 600);
  assert.equal(model.total, 6600);
  assert.equal(model.points.length, 11);
  assert.equal(model.visible.reduce((sum, point) => sum + point.value, 0) + model.hiddenAmount, model.total);
});

test("representative groups remain disjoint and the shared group is not distributed to people", () => {
  const rows = [row("single:Ali", 300), row("single:Ayşe", 200), row("multiple", 900), row("unassigned", 100)];
  const model = buildBreakdownModel(rows, "period");
  assert.equal(model.total, 1500);
  assert.deepEqual(model.points.map((point) => [point.key, point.value]), [["multiple", 900], ["single:Ali", 300], ["single:Ayşe", 200], ["unassigned", 100]]);
});

test("metric selection uses its own scope and does not add overdue amounts to next month", () => {
  const rows = [row("A", 600, 150, 250), row("B", 400, 50, 125)];
  assert.equal(buildBreakdownModel(rows, "period").total, 1000);
  assert.equal(buildBreakdownModel(rows, "overdue").total, 200);
  assert.equal(buildBreakdownModel(rows, "nextMonth").total, 375);
});

test("an incomplete hidden group prevents a misleading complete total or other-groups subtotal", () => {
  const rows = [row("A", 100), row("B", 50), row("C", 5)];
  rows[2].period.incompleteRows = 1;
  const model = buildBreakdownModel(rows, "period", 1);
  assert.equal(model.visible[0].value, 100);
  assert.equal(model.hiddenCount, 2);
  assert.equal(model.hiddenAmount, null);
  assert.equal(model.total, null);
  assert.equal(model.state, "partial");
  assert.equal(model.points[2].value, null);
});

test("missing, nonfinite or negative balances are unknown rather than zero", () => {
  for (const value of [null, -1, NaN, Infinity]) {
    const model = buildBreakdownModel([row("A", value)], "period");
    assert.equal(model.points[0].value, null);
    assert.equal(model.total, null);
    assert.equal(model.state, "partial");
  }
});

test("sorting is stable for equal amounts, preserves input, and keeps valid zero groups", () => {
  const rows = [row("C", 0), row("B", 100), row("A", 100)];
  const before = structuredClone(rows);
  const model = buildBreakdownModel(rows, "period");
  assert.deepEqual(model.points.map((point) => point.key), ["A", "B", "C"]);
  assert.equal(model.points[2].value, 0);
  assert.equal(model.state, "ready");
  assert.deepEqual(rows, before);
});

test("separate currency models never share totals, and numeric overflow remains unknown", () => {
  assert.equal(buildBreakdownModel([row("GBP", 1000)], "period").total, 1000);
  assert.equal(buildBreakdownModel([row("EUR", 250)], "period").total, 250);
  assert.equal(buildBreakdownModel([row("A", 1e308), row("B", 1e308)], "period").total, null);
  assert.equal(buildBreakdownModel([], "period").state, "empty");
});
