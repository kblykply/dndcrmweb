import type { CollectionTotals } from "./types";

export const agingKeys = ["1_30", "31_60", "61_90", "90_plus"] as const;
export type AgingKey = typeof agingKeys[number];

export interface AgingPoint {
  key: AgingKey;
  value: number | null;
  caseCount: number | null;
  installmentCount: number | null;
  /** Percentage of this currency's complete overdue balance, from 0 to 100. */
  share: number | null;
}
export interface AgingModel {
  state: "ready" | "partial" | "empty";
  total: number | null;
  points: AgingPoint[];
  oldestAmount: number | null;
  oldestShare: number | null;
}
type AgingBucket = CollectionTotals & { key: AgingKey };
type AgingInput = {
  currency: string | null;
  overdue: CollectionTotals;
  aging?: AgingBucket[];
};

export function agingLabel(key: AgingKey, tr: boolean): string {
  if (key === "90_plus") return tr ? "90 gün üzeri" : "Over 90 days";
  const label = { "1_30": "1–30", "31_60": "31–60", "61_90": "61–90", "90_plus": "90+" }[key];
  return `${label} ${tr ? "gün" : "days"}`;
}

const moneyFields = ["scheduled", "paidToDate", "outstanding", "overdue"] as const;
const validCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
// Match the report contract's allowance for different floating-point addition orders.
const equalAmount = (left: number, right: number) => Number.isFinite(left) && Number.isFinite(right) &&
  (left === right || (left !== 0 && right !== 0 &&
    Math.abs(left - right) <= Math.min(Math.max(0.00001, Math.abs(right) * 1e-10), Math.abs(right) * 1e-8)));

function completeTotals(value: CollectionTotals | undefined): boolean {
  if (!value || value.incompleteRows !== 0 || !validCount(value.caseCount) || !validCount(value.installmentCount) ||
      value.caseCount > value.installmentCount || (value.installmentCount > 0 && value.caseCount === 0)) return false;
  if (!moneyFields.every((key) => typeof value[key] === "number" && Number.isFinite(value[key]) &&
      (key === "scheduled" || key === "paidToDate" || (value[key] as number) >= 0))) return false;
  if (value.installmentCount === 0 && moneyFields.some((key) => value[key] !== 0)) return false;
  return equalAmount(value.overdue as number, value.outstanding as number);
}

/** Aging is one complete, ordered partition of one currency's overdue installments. */
export function buildAgingModel(part: AgingInput): AgingModel {
  const buckets = Array.isArray(part.aging) ? part.aging : [];
  const points: AgingPoint[] = agingKeys.map((key) => {
    const matches = buckets.filter((bucket) => bucket?.key === key);
    const bucket = matches.length === 1 ? matches[0] : undefined;
    return {
      key,
      value: null,
      caseCount: validCount(bucket?.caseCount) ? bucket.caseCount : null,
      installmentCount: validCount(bucket?.installmentCount) ? bucket.installmentCount : null,
      share: null,
    };
  });
  const partial: AgingModel = { state: "partial", total: null, points, oldestAmount: null, oldestShare: null };
  if (typeof part.currency !== "string" || !part.currency.trim() || ["__ALL__", "__NULL__"].includes(part.currency) ||
      buckets.length !== agingKeys.length || buckets.some((bucket, index) => bucket?.key !== agingKeys[index]) ||
      !completeTotals(part.overdue) || buckets.some((bucket) => !completeTotals(bucket))) return partial;

  // Installments are disjoint; cases can appear in more than one aging bucket.
  const installmentCount = buckets.reduce((sum, bucket) => sum + bucket.installmentCount, 0);
  if (!Number.isSafeInteger(installmentCount) || installmentCount !== part.overdue.installmentCount ||
      buckets.some((bucket) => bucket.caseCount > part.overdue.caseCount)) return partial;
  if (!moneyFields.every((key) => equalAmount(
    buckets.reduce((sum, bucket) => sum + (bucket[key] as number), 0),
    part.overdue[key] as number,
  ))) return partial;

  const total = part.overdue.outstanding as number;
  buckets.forEach((bucket, index) => {
    const value = bucket.outstanding as number;
    points[index].value = value;
    points[index].share = total > 0 ? value / total * 100 : null;
  });
  const oldest = points[points.length - 1];
  return {
    state: total === 0 ? "empty" : "ready",
    total,
    points,
    oldestAmount: oldest.value,
    oldestShare: oldest.share,
  };
}
