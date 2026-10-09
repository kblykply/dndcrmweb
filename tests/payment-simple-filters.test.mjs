import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const path = name === "@/lib/projects" ? "../src/lib/projects.ts" : `../src/app/(app)/finance/payment-tracking/_lib/${name}.ts`;
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  modules.set(name, exports);
  new Function("exports", "require", compiled)(exports, (path) => load(path.replace(/^\.\//, "")));
  return exports;
}
const { defaults, query, readFilters, normalizeFilters, clearFilter, filterErrors, changeFilterCurrency, changeFilterAuthorizationCode, changeFilterAuthorizationState } = load("list-filters");
const { paymentKinds } = load("payment-kinds");

test("queryless entry explicitly requests normal sales instead of the API all-types default", () => {
  const filters = readFilters(new URLSearchParams());
  assert.equal(filters.paymentKind, "sale");
  assert.equal(query(filters).get("paymentKind"), "sale");
  assert.equal(query({ ...defaults, paymentKind: "" }).get("paymentKind"), "sale");
  assert.equal(readFilters(new URLSearchParams("paymentKind=invalid")).paymentKind, "sale");
});

test("every payment type survives normalized query, exact cache key and returnTo round trips", () => {
  const keys = new Set();
  for (const paymentKind of paymentKinds) {
    const filters = normalizeFilters({ ...defaults, paymentKind, q: "  Customer  ", currency: "GBP", authorizationState: "blank", page: 2 });
    const encoded = query(filters).toString();
    keys.add(encoded);
    const returnTo = new URLSearchParams({ returnTo: encoded }).get("returnTo");
    const restored = readFilters(new URLSearchParams(returnTo));
    assert.equal(restored.paymentKind, paymentKind);
    assert.equal(restored.q, "Customer");
    assert.equal(restored.authorizationState, "blank");
    assert.equal(restored.page, 2);
  }
  assert.equal(keys.size, paymentKinds.length, "Different types never share a list-cache key");
});

test("clearing one filter preserves the selected payment type and blank authorization", () => {
  const filters = clearFilter({ ...defaults, paymentKind: "vat", project: "UNIT-01", authorizationState: "blank", page: 3 }, "project");
  assert.equal(filters.paymentKind, "vat");
  assert.equal(filters.authorizationState, "blank");
  assert.equal(filters.project, "");
  assert.equal(filters.page, 1);
  assert.equal(query(defaults).get("paymentKind"), "sale");
});

test("legacy explicit source-code links preserve all types while explicit selections always win", () => {
  assert.equal(readFilters(new URLSearchParams("project=KDV-A01")).paymentKind, "all");
  assert.equal(readFilters(new URLSearchParams("project=KDV-A01&paymentKind=sale")).paymentKind, "sale");
  assert.equal(readFilters(new URLSearchParams("project=KDV-A01&paymentKind=vat")).paymentKind, "vat");
  assert.equal(readFilters(new URLSearchParams("project=")).paymentKind, "sale");
  assert.equal(readFilters(new URLSearchParams("project=%20")).paymentKind, "sale");
  const restored = readFilters(query(readFilters(new URLSearchParams("project=KDV-A01"))));
  assert.equal(restored.paymentKind, "all");
  assert.equal(restored.project, "KDV-A01");
});

test("fully closed portfolio scope round trips separately from selected-balance paid scope", () => {
  for (const scope of ["closed", "paid", "open"]) {
    const restored = readFilters(query({ ...defaults, scope, currency: "GBP", authorizationState: "blank", page: 2 }));
    assert.equal(restored.scope, scope);
    assert.equal(restored.paymentKind, "sale");
    assert.equal(restored.currency, "GBP");
    assert.equal(restored.authorizationState, "blank");
  }
});

test("project groups reuse all registered projects and preserve selection in returnTo", () => {
  const { paymentProjectGroups, paymentProjectGroupLabel } = load("project-groups");
  const { PROJECTS, PROJECT_META } = load("@/lib/projects");
  assert.deepEqual(paymentProjectGroups, [...PROJECTS, "UNKNOWN"]);
  const keys = new Set();
  for (const projectGroup of ["", ...paymentProjectGroups]) {
    const filters = { ...defaults, projectGroup, paymentKind: "vat", currency: "GBP", authorizationState: "blank", scope: "closed", page: 2 };
    const encoded = query(normalizeFilters(filters)).toString();
    keys.add(encoded);
    const back = readFilters(new URLSearchParams(new URLSearchParams({ returnTo: encoded }).get("returnTo")));
    assert.equal(back.projectGroup, projectGroup);
    assert.equal(back.paymentKind, "vat");
    assert.equal(back.currency, "GBP");
    assert.equal(back.authorizationState, "blank");
    assert.equal(back.scope, "closed");
    if (PROJECT_META[projectGroup]) assert.equal(paymentProjectGroupLabel(projectGroup, true), PROJECT_META[projectGroup].label);
  }
  assert.equal(keys.size, paymentProjectGroups.length + 1, "Every project scope has a separate list cache key");
  assert.equal(paymentProjectGroupLabel("UNKNOWN", true), "Diğer / eşleşmeyen");
  assert.equal(readFilters(new URLSearchParams("projectGroup=SOPOT")).projectGroup, "");
});

test("clearing the project chip retains kind, currency and other applied filters", () => {
  const cleared = clearFilter({ ...defaults, projectGroup: "LA_JOYA_PERLA", paymentKind: "vat", currency: "GBP", authorizationState: "blank", page: 3 }, "projectGroup");
  assert.equal(cleared.projectGroup, "");
  assert.equal(cleared.paymentKind, "vat");
  assert.equal(cleared.currency, "GBP");
  assert.equal(cleared.authorizationState, "blank");
  assert.equal(cleared.page, 1);
  assert.equal(readFilters(new URLSearchParams("projectGroup=LA_JOYA")).paymentKind, "sale", "A named project is not a legacy raw-code link");
});

test("currency switches preserve pending draft and clear only amount bounds", () => {
  const draft = { ...defaults, currency: "GBP", projectGroup: "LA_JOYA_PERLA", paymentKind: "vat",
    representative: "Pending representative", q: "Pending customer", authorizationState: "mixed", authorizationCode: "A",
    dueFrom: "2026-01-01", dueTo: "2026-10-02", overdueDaysMin: "0", overdueDaysMax: "31",
    balanceMin: "0", balanceMax: "1000", overdueAmountMin: "5", overdueAmountMax: "800", page: 3 };
  const next = changeFilterCurrency(draft, "__ALL__");
  assert.deepEqual(next, { ...draft, currency: "__ALL__", balanceMin: "", balanceMax: "", overdueAmountMin: "", overdueAmountMax: "", page: 1 });
  assert.deepEqual(filterErrors(next, false), {});
  const restored = readFilters(query(next));
  assert.equal(restored.currency, "__ALL__");
  assert.equal(restored.projectGroup, "LA_JOYA_PERLA");
  assert.equal(restored.overdueDaysMin, "0");
  assert.equal(changeFilterCurrency(next, "__NULL__").currency, "__NULL__");
  assert.equal(draft.balanceMin, "0", "The previous draft is not mutated");
});

test("all-currency URL amount ranges fail validation without discarding the requested values", () => {
  for (const field of ["balanceMin", "balanceMax", "overdueAmountMin", "overdueAmountMax"]) {
    const parsed = readFilters(new URLSearchParams(`currency=__ALL__&${field}=0&overdueDaysMin=0`));
    assert.equal(parsed[field], "0");
    assert.match(Object.values(filterErrors(parsed, false)).join(" "), /single currency/);
  }
  assert.deepEqual(filterErrors({ ...defaults, currency: "__ALL__", overdueDaysMin: "0", dueFrom: "2026-01-01" }, false), {});
});

test("authorization choices cannot combine an explicit code with blank or unmatched state", () => {
  for (const state of ["blank", "unmatched"]) {
    const selected = changeFilterAuthorizationCode({ ...defaults, authorizationState: state, q: "pending" }, "code:AUTH/ONE");
    assert.equal(selected.authorizationState, "all");
    assert.equal(selected.authorizationCode, "AUTH/ONE");
    assert.equal(selected.q, "pending");
  }
  for (const state of ["blank", "unmatched"]) {
    const selected = changeFilterAuthorizationState({ ...defaults, authorizationCode: "AUTH/ONE" }, state);
    assert.equal(selected.authorizationCode, "");
    assert.equal(selected.authorizationState, state);
  }
  assert.equal(changeFilterAuthorizationCode({ ...defaults, authorizationCode: "AUTH/ONE" }, "blank").authorizationCode, "");
  assert(filterErrors({ ...defaults, authorizationCode: "AUTH/ONE" }, false).authorization);
});

test("explicit authorization codes preserve compatible mapping filters and All clears them", () => {
  for (const state of ["all", "coded", "mixed", "multiple"]) {
    const draft = { ...defaults, authorizationState: state, q: "pending", broker: "broker-1" };
    const selected = changeFilterAuthorizationCode(draft, "code:AUTH/ONE");
    assert.equal(selected.authorizationState, state);
    assert.equal(selected.authorizationCode, "AUTH/ONE");
    assert.equal(selected.q, draft.q);
    assert.equal(selected.broker, draft.broker);
    assert.deepEqual(filterErrors(selected, false), {});
    const cleared = changeFilterAuthorizationCode(selected, "");
    assert.equal(cleared.authorizationState, "all");
    assert.equal(cleared.authorizationCode, "");
  }
});


test("Invoice OK raw codes round-trip without booleans, casing or whitespace normalization", () => {
  const tokens = ["all", "blank", "mixed", "unknown", "value:DND", "value:GÜL", "value:KOZANSOY", "value: Code & /  "];
  const keys = new Set();
  for (const invoiceOk of tokens) {
    const original = { ...defaults, invoiceOk, currency: "__ALL__", authorizationState: "blank", representative: "Rep", projectGroup: "LA_JOYA", page: 3 };
    const serialized = query(normalizeFilters(original));
    keys.add(serialized.toString());
    assert.deepEqual(readFilters(serialized), original);
    const cleared = clearFilter(original, "invoiceOk");
    assert.deepEqual(cleared, { ...original, invoiceOk: "all", page: 1 });
  }
  assert.equal(keys.size, tokens.length);
  assert.equal(defaults.invoiceOk, "value:DND");
  assert.equal(readFilters(new URLSearchParams()).invoiceOk, "value:DND");
  for (const token of ["yes", "no", "value:", "value:   ", "value:D\nND", "value:" + "x".repeat(251)]) {
    assert.equal(readFilters(new URLSearchParams({ invoiceOk: token })).invoiceOk, "value:DND");
  }
});
