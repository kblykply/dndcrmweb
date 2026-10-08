import { PROJECTS, projectLabel } from "@/lib/projects";
import type { PaymentProjectGroup, PaymentTrackingList } from "./types";

export const paymentProjectGroups = [...PROJECTS, "UNKNOWN"] as const;

export function isPaymentProjectGroup(value: unknown): value is PaymentProjectGroup {
  return typeof value === "string" && (paymentProjectGroups as readonly string[]).includes(value);
}

export function paymentProjectGroupLabel(value: PaymentProjectGroup, tr: boolean): string {
  return value === "UNKNOWN"
    ? tr ? "Diğer / eşleşmeyen" : "Other / unmatched"
    : projectLabel(value);
}

/** Older or mismatched API responses must not be reused under a selected project. */
export function hasProjectGroupContract(value: PaymentTrackingList): boolean {
  return (value.selectedProjectGroup === "" || isPaymentProjectGroup(value.selectedProjectGroup)) &&
    Array.isArray(value.projectGroups) &&
    paymentProjectGroups.every((group) => value.projectGroups.some((entry) =>
      entry.value === group && Number.isSafeInteger(entry.caseCount) && entry.caseCount >= 0,
    )) &&
    Array.isArray(value.rows) && value.rows.every((row) =>
      isPaymentProjectGroup(row.projectGroup) &&
      (!value.selectedProjectGroup || row.projectGroup === value.selectedProjectGroup),
    );
}
