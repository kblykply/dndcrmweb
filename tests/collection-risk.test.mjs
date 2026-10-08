import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/(app)/finance/collection-report/_lib/risk.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { agingKeys, agingLabel, buildAgingModel } = exports;

const totals = (amount, extra = {}) => ({
  scheduled: amount, paidToDate: 0, outstanding: amount, overdue: amount,
  caseCount: amount > 0 ? 1 : 0, installmentCount: amount > 0 ? 1 : 0, incompleteRows: 0,
  ...extra,
});
const fixture = (amounts = [100, 200, 300, 400], currency = "GBP") => ({
  currency,
  overdue: totals(amounts.reduce((sum, value) => sum + value, 0), {
    // One case may have installments in all four age ranges.
    caseCount: amounts.some((value) => value > 0) ? 1 : 0,
    installmentCount: amounts.filter((value) => value > 0).length,
  }),
  aging: agingKeys.map((key, index) => ({ key, ...totals(amounts[index]) })),
});
const assertPartial = (part) => {
  const result = buildAgingModel(part);
  assert.equal(result.state, "partial");
  assert.equal(result.total, null);
  assert.equal(result.oldestAmount, null);
  assert.equal(result.oldestShare, null);
  assert.deepEqual(result.points.map((point) => point.key), agingKeys);
  assert.ok(result.points.every((point) => point.value === null && point.share === null));
  return result;
};

test("aging keeps exact currency amounts and counts cases within each bucket, not across buckets", () => {
  const input = fixture([100.25, 200.5, 300.75, 400.125]);
  const before = structuredClone(input);
  const result = buildAgingModel(input);
  assert.equal(result.state, "ready");
  assert.equal(result.total, input.overdue.outstanding);
  assert.deepEqual(result.points.map((point) => point.value), input.aging.map((bucket) => bucket.outstanding));
  assert.deepEqual(result.points.map((point) => point.caseCount), [1, 1, 1, 1]);
  assert.equal(result.oldestAmount, 400.125);
  assert.equal(result.oldestShare, 400.125 / input.overdue.outstanding * 100);
  assert.equal(result.points.reduce((sum, point) => sum + point.share, 0), 100);
  assert.deepEqual(input, before);
});

test("a complete zero balance has four real zero values and no percentages", () => {
  const result = buildAgingModel(fixture([0, 0, 0, 0]));
  assert.equal(result.state, "empty");
  assert.equal(result.total, 0);
  assert.equal(result.oldestAmount, 0);
  assert.equal(result.oldestShare, null);
  assert.deepEqual(result.points.map(({ value, caseCount, installmentCount, share }) =>
    [value, caseCount, installmentCount, share]), Array.from({ length: 4 }, () => [0, 0, 0, null]));
});

test("missing aging remains unknown and never becomes a zero balance", () => {
  const input = fixture();
  delete input.aging;
  const result = assertPartial(input);
  assert.ok(result.points.every((point) => point.caseCount === null && point.installmentCount === null));
  assertPartial({ ...fixture(), aging: [] });
});

test("unknown or aggregate currency prevents monetary graphs even for known values or zero", () => {
  for (const currency of [null, "", " ", "__NULL__", "__ALL__"]) {
    assertPartial(fixture(undefined, currency));
    assertPartial(fixture([0, 0, 0, 0], currency));
  }
  assert.equal(buildAgingModel(fixture(undefined, "EUR")).state, "ready");
});

test("an incomplete bucket or overdue scope hides all monetary values while retaining known counts", () => {
  for (const target of ["overdue", 2]) {
    const input = fixture();
    (target === "overdue" ? input.overdue : input.aging[target]).incompleteRows = 1;
    const result = assertPartial(input);
    assert.deepEqual(result.points.map((point) => point.installmentCount), [1, 1, 1, 1]);
  }
});

test("null, nonfinite and negative balances cannot produce a partial monetary graph", () => {
  for (const key of ["scheduled", "paidToDate", "outstanding", "overdue"]) {
    for (const invalid of [null, undefined, NaN, Infinity]) {
      const input = fixture();
      input.aging[1][key] = invalid;
      assertPartial(input);
    }
  }
  for (const key of ["outstanding", "overdue"]) {
    const input = fixture();
    input.aging[0][key] = -1;
    assertPartial(input);
  }
});

test("missing, duplicated, out of order and unknown age keys cannot silently alter the partition", () => {
  const missing = fixture();
  missing.aging.pop();
  assert.equal(assertPartial(missing).points[3].caseCount, null);
  const duplicate = fixture();
  duplicate.aging[3].key = "1_30";
  assert.equal(assertPartial(duplicate).points[0].caseCount, null);
  const unordered = fixture();
  [unordered.aging[0], unordered.aging[1]] = [unordered.aging[1], unordered.aging[0]];
  assertPartial(unordered);
  const unknown = fixture();
  unknown.aging[0].key = "today";
  assertPartial(unknown);
});

test("a mismatch against overdue totals rejects the entire monetary partition", () => {
  for (const key of ["scheduled", "paidToDate", "outstanding", "overdue", "installmentCount"]) {
    const input = fixture();
    input.overdue[key] += 1;
    assertPartial(input);
  }
  const notOverdue = fixture();
  notOverdue.aging[1].overdue = 0;
  assertPartial(notOverdue);
});

test("invalid or contradictory counts do not become valid zero counts", () => {
  for (const key of ["caseCount", "installmentCount", "incompleteRows"]) {
    for (const invalid of [undefined, null, -1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const input = fixture();
      input.aging[0][key] = invalid;
      assertPartial(input);
    }
  }
  for (const patch of [{ caseCount: 2 }, { installmentCount: 0 }, { caseCount: 0 }]) {
    const input = fixture();
    Object.assign(input.aging[0], patch);
    assertPartial(input);
  }
});

test("roundoff does not change API values, while a real mismatch and overflow remain unavailable", () => {
  const input = fixture([0.1, 0.2, 0, 0]);
  Object.assign(input.overdue, { scheduled: 0.3, outstanding: 0.3, overdue: 0.3 });
  const result = buildAgingModel(input);
  assert.equal(result.state, "ready");
  assert.equal(result.total, 0.3);
  assert.deepEqual(result.points.map((point) => point.value), [0.1, 0.2, 0, 0]);
  input.overdue.scheduled = 0.301;
  assertPartial(input);
  const tiny = fixture([0.000001, 0, 0, 0]);
  Object.assign(tiny.overdue, { scheduled: 0, outstanding: 0, overdue: 0 });
  assertPartial(tiny);
  const tinyMismatch = fixture([0.000001, 0, 0, 0]);
  Object.assign(tinyMismatch.overdue, { scheduled: 0.000002, outstanding: 0.000002, overdue: 0.000002 });
  assertPartial(tinyMismatch);
  const overflow = fixture([1e308, 1e308, 0, 0]);
  Object.assign(overflow.overdue, { scheduled: 1e308, outstanding: 1e308, overdue: 1e308 });
  assertPartial(overflow);
});

test("one currency model cannot combine another currency's values and labels are localized", () => {
  assert.equal(buildAgingModel(fixture([100, 0, 0, 0], "GBP")).total, 100);
  assert.equal(buildAgingModel(fixture([250, 0, 0, 0], "EUR")).total, 250);
  assert.deepEqual(agingKeys.map((key) => agingLabel(key, true)), ["1–30 gün", "31–60 gün", "61–90 gün", "90 gün üzeri"]);
  assert.equal(agingLabel("90_plus", false), "Over 90 days");
});
