/** Form-only helpers. API parameter names are supplied by the caller. */
export type FilterRangeKind = "date" | "amount" | "days";
export const FILTER_DATE_MIN = "1753-01-01";
export const FILTER_DATE_MAX = "9998-12-31";

export function validFilterDate(value: string): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < FILTER_DATE_MIN ||
    value > FILTER_DATE_MAX
  )
    return false;
  const timestamp = Date.parse(`${value}T12:00:00Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

export function filterRangeError(
  fromValue: string,
  toValue: string,
  kind: FilterRangeKind,
  tr: boolean,
): string | null {
  const from = fromValue.trim();
  const to = toValue.trim();
  const values = [from, to].filter(Boolean);
  if (kind === "date") {
    if (values.some((value) => !validFilterDate(value)))
      return tr
        ? "1753-01-01 ile 9998-12-31 arasında geçerli bir takvim tarihi girin."
        : "Enter a valid calendar date between 1753-01-01 and 9998-12-31.";
    if (from && to && from > to)
      return tr
        ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
        : "The start date cannot be after the end date.";
    return null;
  }
  const pattern =
    kind === "days"
      ? /^(?:0|[1-9]\d{0,6})$/
      : /^(?:0|[1-9]\d{0,14})(?:\.\d{1,6})?$/;
  if (
    values.some(
      (value) =>
        !pattern.test(value) ||
        !Number.isFinite(Number(value)) ||
        (kind === "days" && !Number.isSafeInteger(Number(value))),
    )
  )
    return kind === "days"
      ? tr
        ? "Gecikme gününü 0–9999999 arasında tam sayı girin; başına sıfır eklemeyin."
        : "Enter overdue days as a whole number from 0 to 9999999 without leading zeros."
      : tr
        ? "Sıfır veya pozitif tutar girin: en fazla 15 tam ve 6 ondalık basamak, nokta ayracı; başına sıfır eklemeyin."
        : "Enter a non-negative amount with up to 15 integer and 6 decimal digits, a decimal point and no leading zeros.";
  if (from && to && Number(from) > Number(to))
    return tr
      ? "En düşük değer en yüksek değerden büyük olamaz."
      : "The minimum cannot exceed the maximum.";
  return null;
}

export interface AppliedFilterChip {
  key: string;
  label: string;
  value: string;
}

/** Empty values are unset; a literal zero remains an active filter. */
export function nonEmptyFilterValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}
