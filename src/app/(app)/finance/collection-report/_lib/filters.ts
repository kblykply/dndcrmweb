import type { CollectionFilters } from "./types";

export type CollectionPeriodPreset = "next6" | "next12" | "next24" | "past12" | "custom";

const scopeFields = ["currency", "projectGroup", "paymentKind", "representative", "representativeState", "authorizationState", "invoiceOk", "startMonth", "months"] as const;

export function collectionScopeChanged(draft: CollectionFilters, applied: CollectionFilters): boolean {
  return scopeFields.some((field) => draft[field] !== applied[field]);
}

function sourceMonth(asOf: string | undefined): number | null {
  if (!asOf || !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(asOf)) return null;
  const [year, month, day] = asOf.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1753 || year > 9998 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return year * 12 + month - 1;
}

/** Presets follow the report's accounting date, never the browser clock. */
export function collectionPresetPeriod(preset: Exclude<CollectionPeriodPreset, "custom">, asOf: string | undefined): Pick<CollectionFilters, "startMonth" | "months"> | null {
  const source = sourceMonth(asOf);
  if (source === null) return null;
  const start = source + (preset === "past12" ? -12 : 1);
  const months = preset === "next6" ? 6 : preset === "next24" ? 24 : 12;
  if (start < 1753 * 12 || start + months - 1 > 9998 * 12 + 11) return null;
  return { startMonth: `${Math.floor(start / 12)}-${String(start % 12 + 1).padStart(2, "0")}`, months };
}

export function collectionPeriodPreset(filters: CollectionFilters, asOf: string | undefined): CollectionPeriodPreset {
  if (!filters.startMonth) return `next${filters.months}`;
  for (const preset of ["next6", "next12", "next24", "past12"] as const) {
    const period = collectionPresetPeriod(preset, asOf);
    if (period?.startMonth === filters.startMonth && period.months === filters.months) return preset;
  }
  return "custom";
}

/** A new report scope must not inherit an unrelated case-list page or aging drilldown. */
export function prepareCollectionFilters(next: CollectionFilters, applied: CollectionFilters): CollectionFilters {
  const changedPeriod = next.startMonth !== applied.startMonth || next.months !== applied.months;
  return { ...next, detailScope: "month", agingBucket: "", detailMonth: changedPeriod ? next.startMonth : "", page: 1 };
}
