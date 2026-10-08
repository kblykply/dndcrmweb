import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const tracking = new URL("../src/app/(app)/finance/payment-tracking/_lib/", import.meta.url);
const collection = new URL("../src/app/(app)/finance/collection-report/_lib/report.ts", import.meta.url);
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Famagusta", year: "numeric", month: "2-digit", day: "2-digit",
});

function setup(initial = Date.parse("2026-10-03T10:00:00Z")) {
  let now = initial;
  const Clock = class extends Date { static now() { return now; } };
  const modules = new Map();
  const auth = {
    AUTH_SESSION_CHANGED_EVENT: "crm:session-changed",
    getAccessToken: () => "synthetic-session",
    getAuthSessionVersion: () => 1,
    getUser: () => ({ id: "synthetic-user", role: "ADMIN" }),
  };
  function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    const source = readFileSync(url, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    modules.set(url.href, exports);
    new Function("exports", "require", "Date", "window", compiled)(exports, (name) => {
      if (name === "@/lib/auth") return auth;
      if (name === "@/lib/projects") return load(new URL("../src/lib/projects.ts", import.meta.url));
      return load(new URL(`${name}.ts`, url));
    }, Clock, { addEventListener() {} });
    return exports;
  }
  const integrity = load(new URL("source-integrity.ts", tracking));
  const cache = load(new URL("list-cache.ts", tracking));
  const utils = load(new URL("utils.ts", tracking));
  const report = load(collection);
  const { paymentProjectGroups } = load(new URL("project-groups.ts", tracking));
  const summary = () => ({
    closedCount: 0, openCount: 1, outstanding: 80, overdueCount: 1,
    overdueAmount: 80, actionableCount: 1, actionableAmount: 80,
    deferredCount: 0, todayCount: 0, unassignedCount: 1, incompleteRows: 0,
  });
  function source(patch = {}) {
    return {
      database: "LOGO_DND", view: "L_223_ODEME_PLANI",
      generatedAt: new Date(now - 1000).toISOString(), asOf: day.format(now), recordCount: 1,
      audit: {
        status: "verified", checkedAt: new Date(now - 500).toISOString(),
        financialChecks: "passed", reviewCaseCount: 0, excludedVatRows: 0,
      },
      freshness: { status: "fresh", retryAfterMs: null, maxAgeSeconds: 300 },
      authorizationSource: { view: "L_223_FATURA_VADE", status: "available", matchedCases: 1, unmatchedCases: 0, multipleCodeCases: 0, message: null },
      ...patch,
    };
  }
  function list() {
    return {
      source: source(), selectedProjectGroup: "", selectedInvoiceOk: "all", invoiceOkOptions: [],
      projectGroups: paymentProjectGroups.map((value) => ({ value, label: value, caseCount: 1 })),
      selectedPaymentKind: "sale", currencyMode: "single", selectedCurrency: "GBP",
      currencies: [{ value: "GBP", label: "GBP", recordCount: 1 }],
      currencyBreakdown: [{ currency: "GBP", total: 1, summary: summary(), filteredSummary: summary() }],
      total: 1, summary: summary(), filteredSummary: summary(),
      rows: [{ key: "synthetic-case", identity: { currency: "GBP" }, fullyPaid: false, projectGroup: "LA_JOYA" }],
    };
  }
  return { integrity, cache, utils, report, source, list, now: () => now, advance: (ms) => { now += ms; } };
}

test("verified and review-required audits allow current amounts without requiring review balances to be added", () => {
  const { integrity, source } = setup();
  const clean = source();
  assert.equal(integrity.hasSourceAudit(clean), true);
  assert.equal(integrity.isCurrentPaymentSource(clean), true);
  const review = source({ audit: { ...clean.audit, status: "review_required", reviewCaseCount: 2, excludedVatRows: 1 } });
  assert.equal(integrity.hasSourceAudit(review), true);
  assert.equal(integrity.isCurrentPaymentSource(review), true);
});

const invalidAudits = [
  ["missing", undefined], ["null", null], ["empty", {}],
  ["unknown status", { status: "passed" }],
  ["failed financial check", { financialChecks: "failed" }],
  ["invalid date", { checkedAt: "not-a-date" }],
  ["negative review count", { reviewCaseCount: -1 }],
  ["fractional review count", { reviewCaseCount: 0.5 }],
  ["text candidate count", { excludedVatRows: "1" }],
  ["unsafe candidate count", { excludedVatRows: Number.MAX_SAFE_INTEGER + 1 }],
];
for (const [label, value] of invalidAudits) test(`missing or invalid audit never becomes current or cached: ${label}`, () => {
  const { integrity, cache, source, list } = setup();
  const invalid = value && Object.keys(value).length ? { ...source().audit, ...value } : value;
  const current = source({ audit: invalid });
  assert.equal(integrity.hasSourceAudit(current), false);
  assert.equal(integrity.isCurrentPaymentSource(current), false);
  assert.equal(Number.isNaN(integrity.sourceExpiresAt(current)), true);
  const ticket = cache.paymentListCacheTicket();
  const good = list();
  cache.writePaymentListCache("currency=GBP", good, ticket);
  assert(cache.readPaymentListCache("currency=GBP", ticket));
  cache.writePaymentListCache("currency=GBP", { ...good, source: current }, ticket);
  assert.equal(cache.readPaymentListCache("currency=GBP", ticket), null);
});

test("source expiry is governed by the older financial or audit read", () => {
  const { integrity, source, now } = setup();
  for (const [financialAge, auditAge] of [[5000, 1000], [1000, 5000]]) {
    const value = source();
    value.generatedAt = new Date(now() - financialAge).toISOString();
    value.audit.checkedAt = new Date(now() - auditAge).toISOString();
    assert.equal(integrity.sourceExpiresAt(value), now() - Math.max(financialAge, auditAge) + 300_000);
    assert.equal(integrity.isCurrentPaymentSource(value), true);
  }
});

test("fresh and stale verified sources both expire exactly at 300 seconds", () => {
  const { integrity, report, source, now } = setup();
  for (const status of ["fresh", "refreshing", "stale"]) {
    const value = source({ freshness: { status, maxAgeSeconds: 300, retryAfterMs: 1000 } });
    value.generatedAt = new Date(now() - 299_999).toISOString();
    assert.equal(integrity.isCurrentPaymentSource(value), true);
    assert.equal(report.usableReportSource(value, now()), true);
    assert.equal(integrity.isCurrentPaymentSource(value, now() + 1), false);
    assert.equal(report.usableReportSource(value, now() + 1), false);
  }
});

test("an expired audit cannot be renewed by a newer generatedAt or a fresh label", () => {
  const { integrity, report, cache, source, list, now } = setup();
  const value = source();
  value.audit.checkedAt = new Date(now() - 300_000).toISOString();
  assert.equal(integrity.hasSourceAudit(value), false);
  assert.equal(integrity.isCurrentPaymentSource(value), false);
  assert.equal(report.usableReportSource(value, now()), false);
  const ticket = cache.paymentListCacheTicket();
  cache.writePaymentListCache("currency=GBP", { ...list(), source: value }, ticket);
  assert.equal(cache.readPaymentListCache("currency=GBP", ticket), null);
});

test("server maximum age may shorten the lifetime but cannot extend it past 300 seconds", () => {
  const { integrity, report, source, now } = setup();
  for (const declared of [10, 0, -20, 600]) {
    const value = source({ freshness: { status: "fresh", retryAfterMs: null, maxAgeSeconds: declared } });
    const expiry = now() - 1000 + Math.max(0, Math.min(300, declared)) * 1000;
    assert.equal(integrity.sourceExpiresAt(value), expiry);
    if (expiry > now()) {
      assert.equal(integrity.isCurrentPaymentSource(value, expiry - 1), true);
      assert.equal(report.usableReportSource(value, expiry - 1), true);
    }
    assert.equal(integrity.isCurrentPaymentSource(value, Math.max(expiry, now())), false);
    assert.equal(report.usableReportSource(value, Math.max(expiry, now())), false);
  }
});

test("future audit timestamps respect only the five-second clock tolerance", () => {
  const { integrity, report, source, now } = setup();
  const value = source();
  value.audit.checkedAt = new Date(now() + 5000).toISOString();
  assert.equal(integrity.hasSourceAudit(value), true);
  assert.equal(report.usableReportSource(value, now()), true);
  value.audit.checkedAt = new Date(now() + 5001).toISOString();
  assert.equal(integrity.hasSourceAudit(value), false);
  assert.equal(integrity.isCurrentPaymentSource(value), false);
  assert.equal(report.usableReportSource(value, now()), false);
});

test("Famagusta midnight expires an otherwise recent source before UTC changes day", () => {
  const { integrity, report, source, now, advance } = setup(Date.parse("2026-10-02T20:59:59Z"));
  const value = source();
  assert.equal(value.asOf, "2026-10-02");
  assert.equal(integrity.isCurrentPaymentSource(value), true);
  advance(1000);
  assert.equal(new Date(now()).toISOString().slice(0, 10), "2026-10-02");
  assert.equal(integrity.hasSourceAudit(value), false);
  assert.equal(integrity.isCurrentPaymentSource(value), false);
  assert.equal(report.usableReportSource(value, now()), false);
  assert.equal(source().asOf, "2026-10-03");
  assert.equal(integrity.isCurrentPaymentSource(source()), true);
});

test("wrong source, invalid generatedAt or invalid clock never passes current-source checks", () => {
  const { integrity, source, now } = setup();
  for (const patch of [
    { database: "Crm_DND" }, { view: "unverified_view" },
    { generatedAt: "bad-date" }, { generatedAt: new Date(now() + 5001).toISOString() },
    { asOf: "2026-10-02" },
  ]) assert.equal(integrity.isCurrentPaymentSource(source(patch)), false);
  assert.equal(integrity.isCurrentPaymentSource(source(), Number.NaN), false);
});

test("RAM cache rechecks audit age on read without resetting its 30-second response lifetime", () => {
  const { cache, list, now, advance } = setup();
  const ticket = cache.paymentListCacheTicket();
  const value = list();
  value.source.audit.checkedAt = new Date(now() - 299_000).toISOString();
  cache.writePaymentListCache("currency=GBP", value, ticket);
  assert(cache.readPaymentListCache("currency=GBP", ticket));
  advance(1000);
  assert.equal(cache.readPaymentListCache("currency=GBP", ticket), null);
  const recent = list();
  cache.writePaymentListCache("currency=GBP", recent, ticket);
  advance(29_999);
  assert(cache.readPaymentListCache("currency=GBP", ticket));
  advance(1);
  assert.equal(cache.readPaymentListCache("currency=GBP", ticket), null);
});

test("stale financial data can remain visible with a warning but never seeds the fast RAM cache", () => {
  const { integrity, cache, list } = setup();
  const value = list();
  value.source.freshness.status = "stale";
  assert.equal(integrity.isCurrentPaymentSource(value.source), true);
  const ticket = cache.paymentListCacheTicket();
  cache.writePaymentListCache("currency=GBP", value, ticket);
  assert.equal(cache.readPaymentListCache("currency=GBP", ticket), null);
});

test("RAM reads reject an audit that became invalid after the response was stored", () => {
  const { cache, list } = setup();
  const ticket = cache.paymentListCacheTicket();
  const value = list();
  cache.writePaymentListCache("currency=GBP", value, ticket);
  value.source.audit.financialChecks = "failed";
  assert.equal(cache.readPaymentListCache("currency=GBP", ticket), null);
});

test("requireSourceAudit raises a localized integrity error that discards displayed finance", () => {
  const { integrity, utils, source, now } = setup();
  for (const tr of [true, false]) for (const value of [
    source({ audit: undefined }),
    source({ audit: { ...source().audit, checkedAt: new Date(now() - 300_000).toISOString() } }),
  ]) {
    assert.throws(() => integrity.requireSourceAudit(value, tr), (error) => {
      const result = utils.problem(error, tr);
      assert.equal(result.code, "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID");
      assert.equal(result.discardSource, true);
      assert.match(result.message, tr ? /Kaynak tutarları doğrulanamadı/ : /Source amounts could not be verified/);
      return true;
    });
  }
});

test("audit-invalid and authorization failures discard finance while transient errors do not", () => {
  const { utils } = setup();
  for (const body of [
    { code: "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID", message: "Synthetic invalid data" },
    { statusCode: 401, message: "Access changed" },
    { statusCode: 403, message: "Access changed" },
  ]) assert.equal(utils.problem(new Error(JSON.stringify(body)), false).discardSource, true);
  for (const cause of [
    new Error(JSON.stringify({ code: "PAYMENT_TRACKING_SOURCE_AUDIT_UNAVAILABLE", message: "Temporary audit failure" })),
    new Error(JSON.stringify({ code: "LOGO_DB_UNAVAILABLE", message: "Temporary database failure" })),
    new Error("Failed to fetch"),
  ]) assert.equal(utils.problem(cause, false).discardSource, false);
  assert.equal(utils.problem(new Error("Forbidden"), true).discardSource, true);
});
