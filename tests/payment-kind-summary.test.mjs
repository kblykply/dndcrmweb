import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const loaded = new Map();
function load(name) {
  if (loaded.has(name)) return loaded.get(name);
  const filename = new URL(`../src/app/(app)/finance/payment-tracking/_lib/${name}.ts`, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  loaded.set(name, exports);
  new Function("exports", "require", compiled)(exports, path => load(path.replace(/^\.\//, "")));
  return exports;
}
const { paymentKindBalances } = load("payment-kind-summary");
const line = (paymentKind, currency, values = {}) => ({ paymentKind, currency, caseKey: "fixture", sequence: 1, dueDate: "2026-10-01", amount: 100, paid: 20, outstanding: 80, overdueDays: 18, status: "overdue", ...values });
test("groups every available payment kind without mixing currencies, inventing charges or mutating the detail", () => {
  const lines = [line("sale", "GBP"),line("vat", "GBP"),line("vat", "GBP"),line("transformer", "USD"),line("furniture", "EUR"),line("deposit", "TL"),line("vat", "EUR"),line("other", null)];
  const before = structuredClone(lines);
  const groups = paymentKindBalances(lines);
  const vat = groups.find(row => row.kind === "vat" && row.currency === "GBP");
  assert.deepEqual(vat,{kind:"vat",currency:"GBP",count:2,amount:200,paid:40,outstanding:160,overdue:160});
  assert.equal(groups.length,7);
  assert.equal(groups.some(row=>row.kind === "land"),false);
  assert.equal(groups.find(row=>row.kind === "vat" && row.currency === "EUR").amount,100);
  assert.deepEqual(lines,before);
  assert.deepEqual(paymentKindBalances([]),[]);
});
test("paid and future charges have no overdue balance; unknown balances and dates remain unknown", () => {
  const groups = paymentKindBalances([
    line("vat","GBP",{paid:100,outstanding:0,status:"paid",dueDate:null}),
    line("transformer","GBP",{status:"upcoming"}),
    line("furniture","GBP",{outstanding:null,amount:null,status:"unknown"}),
    line("deposit","TL",{dueDate:null,status:"unknown"}),
    line("deposit","TL"),
  ]);
  assert.equal(groups.find(row=>row.kind==="vat").overdue,0);
  assert.equal(groups.find(row=>row.kind==="transformer").overdue,0);
  assert.equal(groups.find(row=>row.kind==="furniture").outstanding,null);
  assert.equal(groups.find(row=>row.kind==="furniture").amount,null);
  assert.equal(groups.find(row=>row.kind==="deposit").overdue,null);
});
