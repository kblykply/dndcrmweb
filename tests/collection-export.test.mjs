import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/(app)/finance/collection-report/_lib/export.ts", import.meta.url), "utf8");
const exports = {};
new Function("exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const { collectionCsv } = exports;
const month = { month: "2026-11", scheduled: 1000, paidToDate: 250, outstanding: 750, overdue: 0, caseCount: 1, installmentCount: 2, incompleteRows: 0 };
function report() {
  return { source: { asOf: "2026-10-03" }, selectedInvoiceOk: "value:DND", selectedAuthorizationState: "blank", selectedPaymentKind: "sale", selectedProjectGroup: "LA_JOYA", selectedRepresentative: "", selectedRepresentativeState: "", byCurrency: [{ currency: "GBP", monthly: [{ ...month }] }, { currency: "EUR", monthly: [{ ...month, outstanding: 80 }] }] };
}
test("exports currency rows separately and preserves report scope and settlement meaning", () => {
  const csv = collectionCsv(report(), true);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"value:DND";"Yetki kodu";"blank"/);
  assert.match(csv, /nakit tahsilat değildir/);
  assert.match(csv, /"2026-11";"GBP";"1000";"250";"750"/);
  assert.match(csv, /"2026-11";"EUR";"1000";"250";"80"/);
  assert.doesNotMatch(csv, /"830"/);
});
test("unknown currencies and incomplete source rows never export partial money as complete totals", () => {
  const value = report(); value.byCurrency[0].monthly[0].incompleteRows = 1; value.byCurrency[1].currency = null;
  const csv = collectionCsv(value, false);
  assert.match(csv, /"2026-11";"GBP";"";"";"";"";"1";"2";"1"/);
  assert.match(csv, /"2026-11";"Unknown currency";"";"";"";""/);
});
test("CSV escapes source text and neutralizes spreadsheet formulas without altering numeric values", () => {
  const value = report(); value.selectedRepresentative = ' =HYPERLINK("x")'; value.byCurrency[0].monthly[0].scheduled = -25;
  const csv = collectionCsv(value, false);
  assert.match(csv, /"' =HYPERLINK\(""x""\)"/);
  assert.match(csv, /"2026-11";"GBP";"-25"/);
});
test("decimal separators match the report language for Excel imports", () => {
  const value = report(); value.byCurrency[0].monthly[0].outstanding = 750.25;
  assert.match(collectionCsv(value, true), /"750,25"/);
  assert.match(collectionCsv(value, false), /"750\.25"/);
});
