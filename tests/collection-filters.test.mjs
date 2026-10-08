import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/(app)/finance/collection-report/_lib/filters.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { collectionScopeChanged, collectionPresetPeriod, collectionPeriodPreset, prepareCollectionFilters } = exports;
const filters = (patch = {}) => ({ currency: "GBP", projectGroup: "", paymentKind: "sale", representative: "", representativeState: "", authorizationState: "blank", invoiceOk: "value:DND", startMonth: "2026-11", months: 6, detailScope: "month", agingBucket: "", detailMonth: "2026-11", page: 1, pageSize: 25, ...patch });

test("future and past shortcuts anchor to the accounting day and cross years correctly", () => {
  assert.deepEqual(collectionPresetPeriod("next6", "2026-12-31"), { startMonth: "2027-01", months: 6 });
  assert.deepEqual(collectionPresetPeriod("next12", "2026-10-03"), { startMonth: "2026-11", months: 12 });
  assert.deepEqual(collectionPresetPeriod("next24", "2026-10-03"), { startMonth: "2026-11", months: 24 });
  assert.deepEqual(collectionPresetPeriod("past12", "2026-10-03"), { startMonth: "2025-10", months: 12 });
});

test("presets never guess missing dates or send impossible SQL date windows", () => {
  for (const value of [undefined, "", "2026-02-30", "2026-13-01", "1752-12-31", "not a date"]) assert.equal(collectionPresetPeriod("next6", value), null);
  assert.equal(collectionPresetPeriod("past12", "1753-10-01"), null);
  assert.equal(collectionPresetPeriod("next24", "9998-01-01"), null);
  assert.deepEqual(collectionPresetPeriod("next6", "2024-02-29"), { startMonth: "2024-03", months: 6 });
});

test("normalized API dates keep the correct shortcut selected without hiding custom periods", () => {
  assert.equal(collectionPeriodPreset(filters(), "2026-10-03"), "next6");
  assert.equal(collectionPeriodPreset(filters({ startMonth: "2025-10", months: 12 }), "2026-10-03"), "past12");
  assert.equal(collectionPeriodPreset(filters({ startMonth: "2026-08" }), "2026-10-03"), "custom");
  assert.equal(collectionPeriodPreset(filters({ startMonth: "", months: 24 }), undefined), "next24");
  assert.equal(collectionPeriodPreset(filters(), undefined), "custom");
});

test("case pagination and drilldowns do not show an unapplied financial-filter warning", () => {
  const applied = filters();
  assert.equal(collectionScopeChanged(filters({ page: 4, pageSize: 100, detailScope: "overdue", agingBucket: "90_plus", detailMonth: "2024-01" }), applied), false);
  for (const patch of [{ currency: "__ALL__" }, { projectGroup: "LA_JOYA" }, { invoiceOk: "all" }, { authorizationState: "all" }, { months: 12 }, { representative: "Sales A" }]) assert.equal(collectionScopeChanged(filters(patch), applied), true);
});

test("applying financial filters drops old risk and pagination state without altering selected filters", () => {
  const applied = filters({ detailScope: "overdue", agingBucket: "90_plus", page: 4 });
  const next = filters({ ...applied, invoiceOk: "all", representative: "Sales A" });
  const original = structuredClone(next);
  assert.deepEqual(prepareCollectionFilters(next, applied), { ...next, detailScope: "month", agingBucket: "", detailMonth: "", page: 1 });
  assert.deepEqual(next, original);
  const changedPeriod = filters({ ...next, startMonth: "2025-10", months: 12 });
  assert.equal(prepareCollectionFilters(changedPeriod, applied).detailMonth, "2025-10");
});
