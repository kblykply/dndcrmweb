import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = readFileSync(new URL("../src/app/(app)/finance/payment-tracking/_lib/list-currencies.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = {};
new Function("exports", compiled)(api);
const { hasCurrencyContract, selectedCurrencyToken } = api;
const zero = () => ({ closedCount: 0, openCount: 0, outstanding: 0, overdueCount: 0, overdueAmount: 0,
  actionableCount: 0, actionableAmount: 0, deferredCount: 0, todayCount: 0, unassignedCount: 0, incompleteRows: 0 });
function summary(amount, count = 1) {
  return { ...zero(), openCount: count, outstanding: amount, overdueCount: count, overdueAmount: amount,
    actionableCount: count, actionableAmount: amount, unassignedCount: count };
}
function all() {
  const parts = [
    { currency: "GBP", total: 2, summary: summary(1000, 2), filteredSummary: summary(1000, 2) },
    { currency: "TL", total: 1, summary: summary(350), filteredSummary: summary(350) },
    { currency: null, total: 1, summary: { ...zero(), outstanding: null, overdueAmount: null, actionableAmount: null, incompleteRows: 3 }, filteredSummary: { ...zero(), outstanding: null, overdueAmount: null, actionableAmount: null, incompleteRows: 3 } },
  ];
  return { currencyMode: "all", selectedCurrency: null, currencies: parts.map((part) => ({ value: part.currency })), currencyBreakdown: parts,
    summary: { ...summary(null, 3), incompleteRows: 3 }, filteredSummary: { ...summary(null, 3), incompleteRows: 3 }, total: 4,
    rows: [{ key: "gbp-a", identity: { currency: "GBP" } }, { key: "gbp-b", identity: { currency: "GBP" } }, { key: "tl", identity: { currency: "TL" } }, { key: "unknown", identity: { currency: null } }] };
}
function single(currency) {
  const data = all();
  const part = data.currencyBreakdown.find((entry) => entry.currency === currency);
  data.currencyMode = "single";
  data.selectedCurrency = currency;
  data.summary = part.summary;
  data.filteredSummary = part.filteredSummary;
  data.total = part.total;
  data.rows = data.rows.filter((row) => row.identity.currency === currency);
  data.currencyBreakdown = data.currencyBreakdown.map((entry) => entry === part ? entry : { ...entry, total: 0, summary: zero(), filteredSummary: zero() });
  return data;
}

test("all currencies retains separate GBP/TL/unknown money and normalizes to __ALL__", () => {
  const data = all();
  assert(hasCurrencyContract(data, "__ALL__"));
  assert.equal(selectedCurrencyToken(data), "__ALL__");
  assert.equal(data.currencyBreakdown[0].filteredSummary.overdueAmount, 1000);
  assert.equal(data.currencyBreakdown[1].filteredSummary.overdueAmount, 350);
  assert.equal(data.currencyBreakdown[2].filteredSummary.overdueAmount, null);
  assert.equal(data.filteredSummary.overdueAmount, null);
});

test("unknown single currency is distinct from all despite both using selectedCurrency null", () => {
  const data = single(null);
  assert(hasCurrencyContract(data, "__NULL__"));
  assert.equal(selectedCurrencyToken(data), "__NULL__");
  assert.equal(hasCurrencyContract(data, "__ALL__"), false);
  assert.equal(hasCurrencyContract(all(), "__NULL__"), false);
});

test("explicit currency requests cannot accept another scope and zero unselected buckets are required", () => {
  const data = single("GBP");
  assert(hasCurrencyContract(data, "GBP"));
  assert(hasCurrencyContract(data, ""));
  assert.equal(hasCurrencyContract(data, "TL"), false);
  assert.equal(hasCurrencyContract(all(), ""), false);
  data.currencyBreakdown[1].filteredSummary.overdueAmount = 350;
  assert.equal(hasCurrencyContract(data, "GBP"), false);
});

test("pagination accepts partial pages but rejects rows or filtered counts exceeding their totals", () => {
  const data = all();
  data.rows = data.rows.slice(0, 1);
  assert(hasCurrencyContract(data, "__ALL__"));
  for (const corrupt of [
    (value) => { value.total = 0; },
    (value) => { value.filteredSummary.closedCount = 5; },
    (value) => { value.currencyBreakdown[0].total = 1; value.total = 3; },
    (value) => { value.rows[1].key = value.rows[0].key; },
  ]) {
    const value = all(); corrupt(value);
    assert.equal(hasCurrencyContract(value, "__ALL__"), false);
  }
});

test("missing, duplicate and mismatched currency breakdowns fail closed", () => {
  for (const corrupt of [
    (value) => { delete value.currencyMode; },
    (value) => { delete value.currencyBreakdown; },
    (value) => { value.currencyBreakdown.pop(); },
    (value) => { value.currencyBreakdown[1].currency = "GBP"; },
    (value) => { value.currencyBreakdown[1].currency = "EUR"; },
    (value) => { value.summary.openCount += 1; },
    (value) => { value.currencyBreakdown[0].total += 1; },
    (value) => { value.filteredSummary.outstanding = 1350; },
  ]) {
    const value = all(); corrupt(value);
    assert.equal(hasCurrencyContract(value, "__ALL__"), false);
  }
});
