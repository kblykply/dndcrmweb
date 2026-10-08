import type { CollectionTotals } from "./types";

export type BreakdownMetric = "period" | "overdue" | "nextMonth";
export interface BreakdownInput {
  key: string;
  label: string;
  period: CollectionTotals & { completionPercent?: number | null };
  overdue: CollectionTotals;
  nextMonth: CollectionTotals;
}
export interface BreakdownPoint<T extends BreakdownInput = BreakdownInput> {
  key: string;
  label: string;
  value: number | null;
  incomplete: boolean;
  row: T;
}

function remaining(totals: CollectionTotals): number | null {
  return totals.incompleteRows === 0 && typeof totals.outstanding === "number" &&
    Number.isFinite(totals.outstanding) && totals.outstanding >= 0 ? totals.outstanding : null;
}
function sum(values: Array<number | null>): number | null {
  let total = 0;
  for (const value of values) {
    if (value === null) return null;
    total += value;
    if (!Number.isFinite(total)) return null;
  }
  return total;
}

/** Each input is a disjoint group in a single currency. Hidden groups remain explicit. */
export function buildBreakdownModel<T extends BreakdownInput>(rows: T[], metric: BreakdownMetric, limit = 8) {
  const points: BreakdownPoint<T>[] = rows.map((row) => {
    const value = remaining(row[metric]);
    return { key: row.key, label: row.label, value, incomplete: value === null, row };
  }).sort((left, right) => {
    if (left.value === null) return right.value === null ? left.key.localeCompare(right.key) : 1;
    if (right.value === null) return -1;
    return right.value - left.value || left.key.localeCompare(right.key);
  });
  const visibleLimit = Number.isInteger(limit) && limit > 0 ? limit : 8;
  const visible = points.slice(0, visibleLimit);
  const hidden = points.slice(visibleLimit);
  const total = sum(points.map((point) => point.value));
  return {
    points,
    visible,
    hiddenCount: hidden.length,
    hiddenAmount: sum(hidden.map((point) => point.value)),
    total,
    state: points.some((point) => point.incomplete) ? "partial" : points.length === 0 ? "empty" : "ready",
  };
}
