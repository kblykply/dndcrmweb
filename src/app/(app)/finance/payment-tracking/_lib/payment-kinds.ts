import type { PaymentKindFilter } from "./types";

export const paymentKinds = ["sale", "land", "vat", "transformer", "furniture", "deposit", "other", "all"] as const;

const labels: Record<PaymentKindFilter, [string, string]> = {
  sale: ["Normal satış", "Normal sale"],
  land: ["Arsa", "Land"],
  vat: ["KDV", "VAT"],
  transformer: ["Trafo", "Transformer"],
  furniture: ["Eşya", "Furniture"],
  deposit: ["Depozito", "Deposit"],
  other: ["Diğer", "Other"],
  all: ["Tümü", "All payments"],
};

export function paymentKindLabel(value: string, tr: boolean): string {
  return labels[value as PaymentKindFilter]?.[tr ? 0 : 1] ?? value;
}
