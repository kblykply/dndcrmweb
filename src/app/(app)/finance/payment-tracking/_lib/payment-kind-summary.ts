import type { PaymentKind, PaymentTrackingDetail } from "./types";
import { paymentKinds } from "./payment-kinds";

type Line = PaymentTrackingDetail["portfolio"]["installments"][number];
export type PaymentKindBalance = {
  kind: PaymentKind;
  currency: string | null;
  count: number;
  amount: number | null;
  paid: number | null;
  outstanding: number | null;
  overdue: number | null;
};

/** Use only the authorized detail portfolio; never merge currencies or invent missing charges. */
export function paymentKindBalances(lines: Line[]): PaymentKindBalance[] {
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const key = JSON.stringify([line.paymentKind, line.currency]);
    const rows = groups.get(key) || [];
    rows.push(line);
    groups.set(key, rows);
  }
  const sum = (values: (number | null)[]) =>
    values.some((value) => value === null)
      ? null
      : values.reduce<number>((total, value) => total + (value ?? 0), 0);
  return [...groups.values()]
    .map((rows) => ({
      kind: rows[0].paymentKind,
      currency: rows[0].currency,
      count: rows.length,
      amount: sum(rows.map((row) => row.amount)),
      paid: sum(rows.map((row) => row.paid)),
      outstanding: sum(rows.map((row) => row.outstanding)),
      overdue: sum(
        rows.map((row) =>
          row.outstanding === null || (row.outstanding > 0 && !row.dueDate)
            ? null
            : row.status === "overdue"
              ? row.outstanding
              : 0,
        ),
      ),
    }))
    .sort(
      (a, b) =>
        paymentKinds.indexOf(a.kind) - paymentKinds.indexOf(b.kind) ||
        (a.currency || "").localeCompare(b.currency || ""),
    );
}
