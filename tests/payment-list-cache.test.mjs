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
const { paymentProjectGroups } = load("project-groups");

function setup() {
  let now = Date.parse("2026-10-02T10:00:00Z");
  const auth = { token: "session-1", version: 0, user: { id: "user-1", role: "ADMIN" } };
  const listeners = new Map();
  const exports = {};
  const source = readFileSync(new URL(
    "../src/app/(app)/finance/payment-tracking/_lib/list-cache.ts", import.meta.url,
  ), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const Clock = class extends Date { static now() { return now; } };
  new Function("exports", "require", "Date", "window", output)(
    exports,
    (name) => name === "@/lib/auth" ? ({
      AUTH_SESSION_CHANGED_EVENT: "crm:session-changed",
      getAccessToken: () => auth.token,
      getAuthSessionVersion: () => auth.version,
      getUser: () => auth.user,
    }) : load(name.replace(/^\.\//, "")),
    Clock,
    { addEventListener: (name, listener) => listeners.set(name, listener) },
  );
  const summary = () => ({ closedCount: 0, openCount: 1, outstanding: 100, overdueCount: 1,
    overdueAmount: 100, actionableCount: 1, actionableAmount: 100, deferredCount: 0, todayCount: 0,
    unassignedCount: 1, incompleteRows: 0 });
  const value = () => ({
    source: {
      generatedAt: new Date(now - 1_000).toISOString(),
      audit: { status: "verified", checkedAt: new Date(now - 1000).toISOString(), financialChecks: "passed", reviewCaseCount: 0, excludedVatRows: 0 },
      asOf: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Famagusta", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(now),
      freshness: { status: "fresh", retryAfterMs: null, maxAgeSeconds: 300 },
    },
    selectedProjectGroup: "", selectedInvoiceOk: "all", invoiceOkOptions: [],
    projectGroups: paymentProjectGroups.map((value) => ({ value, label: value, caseCount: 1 })),
    currencyMode: "single",
    selectedCurrency: "GBP",
    currencies: [{ value: "GBP", label: "GBP", recordCount: 1 }],
    currencyBreakdown: [{ currency: "GBP", total: 1, summary: summary(), filteredSummary: summary() }],
    total: 1,
    summary: summary(),
    filteredSummary: summary(),
    rows: [{ key: "synthetic", identity: { currency: "GBP" }, fullyPaid: false, projectGroup: "LA_JOYA" }],
  });
  return { api: exports, auth, listeners, value, advance: (ms) => { now += ms; }, setTime: (ms) => { now = ms; } };
}

test("exact queries remain separate and cached responses announce revalidation", () => {
  const { api, value } = setup();
  const ticket = api.paymentListCacheTicket();
  const data = value();
  api.writePaymentListCache("currency=GBP&page=1", data, ticket);
  const cached = api.readPaymentListCache("currency=GBP&page=1", ticket);
  assert.deepEqual(cached.rows, data.rows);
  assert.equal(cached.source.freshness.status, "refreshing");
  assert.equal(cached.source.freshness.retryAfterMs, null);
  assert.equal(data.source.freshness.status, "fresh");
  assert.equal(api.readPaymentListCache("currency=EUR&page=1", ticket), null);
  assert.equal(api.readPaymentListCache("currency=GBP&page=2", ticket), null);
});

test("30-second response TTL never resets on a cache read", () => {
  const { api, value, advance } = setup();
  const ticket = api.paymentListCacheTicket();
  api.writePaymentListCache("q", value(), ticket);
  advance(29_999);
  assert(api.readPaymentListCache("q", ticket));
  advance(1);
  assert.equal(api.readPaymentListCache("q", ticket), null);
});

test("a backwards clock adjustment cannot extend cache lifetime", () => {
  const { api, value, advance } = setup();
  const ticket = api.paymentListCacheTicket();
  api.writePaymentListCache("q", value(), ticket);
  advance(-1);
  assert.equal(api.readPaymentListCache("q", ticket), null);
});

test("old source, wrong Famagusta day, stale state and expired source are rejected", () => {
  const { api, value, advance } = setup();
  const ticket = api.paymentListCacheTicket();
  for (const change of [
    { generatedAt: "2026-10-02T09:55:00Z" },
    { asOf: "2026-10-01" },
    { freshness: { status: "stale", maxAgeSeconds: 300 } },
    { generatedAt: "invalid" },
  ]) {
    const data = value();
    Object.assign(data.source, change);
    api.writePaymentListCache("q", data, ticket);
    assert.equal(api.readPaymentListCache("q", ticket), null);
  }
  const data = value();
  data.source.generatedAt = "2026-10-02T09:55:05Z";
  api.writePaymentListCache("q", data, ticket);
  advance(5_000);
  assert.equal(api.readPaymentListCache("q", ticket), null);
});

test("mutation invalidation rejects late pre-mutation GET writes", () => {
  const { api, value } = setup();
  const before = api.paymentListCacheTicket();
  api.writePaymentListCache("q", value(), before);
  api.invalidatePaymentListCache();
  api.writePaymentListCache("q", value(), before);
  assert.equal(api.readPaymentListCache("q", api.paymentListCacheTicket()), null);
  api.writePaymentListCache("q", value(), api.paymentListCacheTicket());
  assert(api.readPaymentListCache("q", api.paymentListCacheTicket()));
});

test("token, user and preview changes isolate responses and invalidate pending tickets", () => {
  const { api, auth, value } = setup();
  for (const change of [
    () => { auth.token = "session-2"; },
    () => { auth.user = { id: "user-2", role: "ACCOUNTING" }; },
    () => { auth.user = { id: "user-2", role: "ADMIN", isPreview: true }; },
  ]) {
    const before = api.paymentListCacheTicket();
    api.writePaymentListCache("q", value(), before);
    change();
    api.writePaymentListCache("q", value(), before);
    assert.equal(api.readPaymentListCache("q", api.paymentListCacheTicket()), null);
  }
});

test("auth events clear memory immediately, even when the same account signs back in", () => {
  const { api, listeners, value } = setup();
  const before = api.paymentListCacheTicket();
  api.writePaymentListCache("q", value(), before);
  listeners.get("crm:session-changed")();
  api.writePaymentListCache("q", value(), before);
  assert.equal(api.readPaymentListCache("q", api.paymentListCacheTicket()), null);
});

test("normal access-token refresh preserves identity but login/logout changes it", () => {
  const { api, auth, value } = setup();
  const before = api.paymentListCacheTicket();
  auth.token = "refreshed-access-token";
  const refreshed = api.paymentListCacheTicket();
  assert.equal(before.identity, refreshed.identity);
  assert.notEqual(before.session, refreshed.session);
  api.writePaymentListCache("q", value(), before);
  assert.equal(api.readPaymentListCache("q", refreshed), null);
  auth.version += 2; // logout and login, including returning to the same user
  assert.notEqual(api.paymentListCacheTicket().identity, before.identity);
});

test("unchanged-query shortcut expires at 30 seconds and at the Famagusta day boundary", () => {
  const { api, value, advance, setTime } = setup();
  const data = value();
  assert(api.isPaymentListSourceRecent(data));
  advance(29_000);
  assert.equal(api.isPaymentListSourceRecent(data), false);
  setTime(Date.parse("2026-10-02T20:59:59Z"));
  const beforeMidnight = value();
  assert(api.isPaymentListSourceRecent(beforeMidnight));
  advance(1_000);
  assert.equal(api.isPaymentListSourceRecent(beforeMidnight), false);
});

test("pre-portfolio cached responses cannot present currency-only paid state as global closure", () => {
  const { api, value } = setup();
  const ticket = api.paymentListCacheTicket();
  for (const remove of [
    (data) => { delete data.summary.closedCount; },
    (data) => { delete data.filteredSummary.closedCount; },
    (data) => { delete data.rows[0].fullyPaid; },
  ]) {
    const data = value();
    remove(data);
    api.writePaymentListCache("q", data, ticket);
    assert.equal(api.readPaymentListCache("q", ticket), null);
  }
});

test("old or mismatched project responses cannot be cached under a selected project", () => {
  const { api, value } = setup();
  const ticket = api.paymentListCacheTicket();
  for (const change of [
    (data) => { delete data.selectedProjectGroup; },
    (data) => { delete data.projectGroups; },
    (data) => { delete data.rows[0].projectGroup; },
    (data) => { data.selectedProjectGroup = "LA_JOYA_PERLA"; },
    (data) => { data.rows[0].projectGroup = "SOPOT"; },
  ]) {
    const data = value();
    change(data);
    api.writePaymentListCache("projectGroup=LA_JOYA", data, ticket);
    assert.equal(api.readPaymentListCache("projectGroup=LA_JOYA", ticket), null);
  }
  const data = value();
  data.selectedProjectGroup = "LA_JOYA";
  api.writePaymentListCache("projectGroup=LA_JOYA", data, ticket);
  assert(api.readPaymentListCache("projectGroup=LA_JOYA", ticket));
  assert.equal(api.readPaymentListCache("projectGroup=LA_JOYA_PERLA", ticket), null);
});

test("cache rejects pre-multicurrency contracts and any all-mode combined monetary total", () => {
  const { api, value } = setup();
  const ticket = api.paymentListCacheTicket();
  for (const change of [
    (data) => { delete data.currencyMode; },
    (data) => { delete data.currencyBreakdown; },
    (data) => { data.currencyBreakdown[0].total = 7; },
    (data) => { data.currencyMode = "all"; data.selectedCurrency = null; },
  ]) {
    const data = value(); change(data);
    api.writePaymentListCache("currency=__ALL__", data, ticket);
    assert.equal(api.readPaymentListCache("currency=__ALL__", ticket), null);
  }
});

test("all, unspecified and single-currency cache entries cannot cross currency scope", () => {
  const { api, value } = setup();
  const ticket = api.paymentListCacheTicket();
  const all = value();
  all.currencyMode = "all";
  all.selectedCurrency = null;
  for (const summary of [all.summary, all.filteredSummary]) {
    summary.outstanding = null;
    summary.overdueAmount = null;
    summary.actionableAmount = null;
  }
  api.writePaymentListCache("currency=__ALL__", all, ticket);
  assert.equal(api.readPaymentListCache("currency=__ALL__", ticket)?.currencyMode, "all");
  for (const key of ["currency=GBP", "currency=__NULL__", ""]) {
    api.writePaymentListCache(key, all, ticket);
    assert.equal(api.readPaymentListCache(key, ticket), null);
  }
  const unknown = value();
  unknown.selectedCurrency = null;
  unknown.currencies[0].value = null;
  unknown.currencyBreakdown[0].currency = null;
  unknown.rows[0].identity.currency = null;
  api.writePaymentListCache("currency=__NULL__", unknown, ticket);
  assert.equal(api.readPaymentListCache("currency=__NULL__", ticket)?.currencyMode, "single");
  assert.equal(api.readPaymentListCache("currency=__ALL__", ticket)?.currencyMode, "all");
});


test("Invoice OK cache scopes reject stale or mixed-code substitutions", () => {
  const { api, value } = setup();
  const ticket = api.paymentListCacheTicket();
  const data = value();
  data.selectedInvoiceOk = "value:DND";
  data.invoiceOkOptions = [{ value: "value:DND", label: "DND", caseCount: 1 }];
  data.rows[0].invoiceOk = { status: "matched", values: ["DND"], hasBlank: false };
  const key = "currency=GBP&invoiceOk=value%3ADND";
  api.writePaymentListCache(key, data, ticket);
  assert(api.readPaymentListCache(key, ticket));
  api.writePaymentListCache("currency=GBP&invoiceOk=all", data, ticket);
  assert.equal(api.readPaymentListCache("currency=GBP&invoiceOk=all", ticket), null);
  data.rows[0].invoiceOk.values.push("KOZANSOY");
  api.writePaymentListCache(key, data, ticket);
  assert.equal(api.readPaymentListCache(key, ticket), null);
  const legacy = value(); delete legacy.selectedInvoiceOk; delete legacy.invoiceOkOptions;
  api.writePaymentListCache("currency=GBP", legacy, ticket);
  assert.equal(api.readPaymentListCache("currency=GBP", ticket), null);
});

test("sales ledger caches only its explicit sales audience and never a finance audience", () => {
  const { api, auth, value } = setup();
  auth.user = { id: "bob", role: "SALES" };
  assert.equal(api.paymentListCacheTicket().session, null);
  const ticket = api.paymentListCacheTicket("sales");
  assert(ticket.session);
  api.writePaymentListCache("currency=GBP", value(), ticket);
  assert(api.readPaymentListCache("currency=GBP", ticket));
  assert.equal(api.paymentListCacheTicket().session, null);
  assert.equal(api.readPaymentListCache("currency=GBP", ticket), null);
});
test("sales ledger caches are discarded when switching between salespeople", () => {
  const { api, auth, value } = setup();
  auth.user = { id: "bob", role: "SALES" };
  const ticket = api.paymentListCacheTicket("sales");
  api.writePaymentListCache("currency=GBP", value(), ticket);
  auth.user = { id: "sabina", role: "SALES" };
  assert.equal(api.readPaymentListCache("currency=GBP", ticket), null);
  const next = api.paymentListCacheTicket("sales");
  assert.equal(api.readPaymentListCache("currency=GBP", next), null);
});
