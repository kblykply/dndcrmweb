import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename);
  const out = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {}; modules.set(filename, exports);
  new Function("exports", "require", out)(exports, (name) => load(name.startsWith("@/") ? path.join(root, `${name.slice(2)}.ts`) : path.resolve(path.dirname(filename), `${name}.ts`)));
  return exports;
}
const base = path.join(root, "app/(app)/finance/collection-report/_lib");
const { hasAnalyticsContract } = load(path.join(base, "analytics-contract.ts"));
const { readReportFilters, reportDefaults, reportQuery, reportFilterError } = load(path.join(base, "report.ts"));
const totals = (scheduled, paidToDate, outstanding, caseCount, installmentCount, completionPercent) => ({
  scheduled, paidToDate, outstanding, overdue: 0, caseCount, installmentCount, incompleteRows: 0, completionPercent,
});
const zero = () => totals(0, 0, 0, 0, 0, null);
function fixture() {
  const alpha = {
    period: totals(300, 75, 225, 1, 2, 25), overdue: zero(), nextMonth: totals(100, 25, 75, 1, 1, 25),
    monthly: [{ month: "2026-11", ...totals(100, 25, 75, 1, 1, 25) }, { month: "2026-12", ...totals(200, 50, 150, 1, 1, 25) }],
  };
  const beta = {
    period: totals(100, 125, 0, 1, 1, 125), overdue: zero(), nextMonth: totals(100, 125, 0, 1, 1, 125),
    monthly: [{ month: "2026-11", ...totals(100, 125, 0, 1, 1, 125) }, { month: "2026-12", ...zero() }],
  };
  return {
    analyticsVersion: 1, selectedRepresentativeState: "", selectedRepresentative: "", selectedProjectGroup: "",
    periods: ["2026-11", "2026-12"], source: { authorizationSource: { status: "available" } },
    byCurrency: [{ currency: "GBP", period: totals(400, 200, 225, 2, 3, 50), overdue: zero(), nextMonth: totals(200, 150, 75, 2, 2, 75),
      monthly: [{ month: "2026-11", ...totals(200, 150, 75, 2, 2, 75) }, { month: "2026-12", ...totals(200, 50, 150, 1, 1, 25) }], historical: [],
      projectBreakdown: [{ projectGroup: "LA_JOYA", ...structuredClone(alpha) }, { projectGroup: "LA_JOYA_PERLA", ...structuredClone(beta) }],
      representativeBreakdown: [{ key: "single:Rep Alpha", representative: "Rep Alpha", representativeState: "single", ...structuredClone(alpha) }, { key: "multiple", representative: null, representativeState: "multiple", ...structuredClone(beta) }],
    }],
  };
}

test("weighted period ratios, distinct cases across months and overpayment remain valid", () => {
  assert(hasAnalyticsContract(fixture()));
  const data = fixture(); data.byCurrency[0].period.completionPercent = 75;
  assert.equal(hasAnalyticsContract(data), false, "An average of group percentages is not the period rate");
});

test("money cannot be copied into every representative or combined across project groups", () => {
  for (const field of ["projectBreakdown", "representativeBreakdown"]) {
    const data = fixture(), groups = data.byCurrency[0][field];
    groups.push(structuredClone(groups[0]));
    assert.equal(hasAnalyticsContract(data), false);
  }
  const data = fixture(); data.byCurrency[0].representativeBreakdown[1].period.outstanding = 225;
  assert.equal(hasAnalyticsContract(data), false);
});

test("period and month partitions include amounts and unique case counts", () => {
  for (const change of [
    (p) => { p.period.caseCount = 3; },
    (p) => { p.projectBreakdown[0].period.caseCount = 2; },
    (p) => { p.representativeBreakdown[0].monthly.reverse(); },
    (p) => { p.projectBreakdown[1].monthly.pop(); },
    (p) => { p.representativeBreakdown[0].nextMonth.paidToDate += 1; },
    (p) => { p.projectBreakdown[0].monthly[0].installmentCount += 1; },
    (p) => { p.period.completionPercent = Infinity; },
  ]) {
    const data = fixture(); change(data.byCurrency[0]); assert.equal(hasAnalyticsContract(data), false);
  }
});

test("all currency groups are validated independently and cannot carry another currency's ratio", () => {
  const data = fixture(); const eur = structuredClone(data.byCurrency[0]); eur.currency = "EUR"; data.byCurrency.push(eur);
  assert(hasAnalyticsContract(data));
  eur.period.scheduled += 100;
  assert.equal(hasAnalyticsContract(data), false);
});

test("unknown currencies cannot present a completion percentage", () => {
  const data = fixture(); data.byCurrency[0].currency = null;
  assert.equal(hasAnalyticsContract(data), false);
  const clear = (value) => {
    if (!value || typeof value !== "object") return;
    if ("completionPercent" in value) value.completionPercent = null;
    Object.values(value).forEach(clear);
  };
  clear(data);
  assert(hasAnalyticsContract(data));
});

test("missing analytics, renamed project IDs and counterfeit representative identities are rejected", () => {
  for (const change of [
    (data) => { delete data.analyticsVersion; },
    (data) => { delete data.byCurrency[0].period; },
    (data) => { delete data.byCurrency[0].projectBreakdown; },
    (data) => { data.byCurrency[0].projectBreakdown[0].projectGroup = "INVENTED"; },
    (data) => { data.byCurrency[0].representativeBreakdown[0].key = "single:Other"; },
    (data) => { data.byCurrency[0].representativeBreakdown[1].representative = "Rep Alpha"; },
  ]) {
    const data = fixture(); change(data); assert.equal(hasAnalyticsContract(data), false);
  }
});

test("unavailable representative metadata cannot masquerade as unassigned accounts", () => {
  const data = fixture(); data.source.authorizationSource.status = "unavailable";
  assert.equal(hasAnalyticsContract(data), false);
  data.byCurrency[0].representativeBreakdown = [];
  assert(hasAnalyticsContract(data));
});

test("selected group scopes cannot admit unrelated projects or representatives", () => {
  for (const patch of [{ selectedProjectGroup: "LA_JOYA" }, { selectedRepresentativeState: "unassigned" }, { selectedRepresentativeState: "multiple" }, { selectedRepresentative: "Other" }]) {
    assert.equal(hasAnalyticsContract({ ...fixture(), ...patch }), false);
  }
});

test("unknown or signed source components may suppress completion without falsifying totals", () => {
  const data = fixture(); data.byCurrency[0].period.completionPercent = null;
  assert(hasAnalyticsContract(data));
  data.byCurrency[0].period.completionPercent = -1;
  assert.equal(hasAnalyticsContract(data), false);
});

test("representative mapping filters round-trip, remain separate from names, and reject contradictory scopes", () => {
  for (const representativeState of ["", "unassigned", "multiple"]) {
    const filters = { ...reportDefaults, representativeState };
    assert.deepEqual(readReportFilters(reportQuery(filters)), filters);
    assert.equal(reportFilterError(filters, false), "");
  }
  assert(reportFilterError({ ...reportDefaults, representative: "Rep Alpha", representativeState: "multiple" }, false));
});
