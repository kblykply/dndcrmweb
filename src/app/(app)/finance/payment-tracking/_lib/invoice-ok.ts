import type { PaymentFilterOption, PaymentInvoiceOk } from './types';

const special = ['all', 'blank', 'mixed', 'unknown'];
export const DEFAULT_INVOICE_OK = 'value:DND';
export function validInvoiceOkToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 256 && !Array.from(value).some((char) => char.charCodeAt(0) < 32) && (special.includes(value) || (value.startsWith('value:') && Boolean(value.slice(6).trim())));
}
export function readInvoiceOk(value: string | null | undefined, fallback = 'all'): string { return validInvoiceOkToken(value) ? value : fallback; }
export function invoiceOkLabel(value: string, tr: boolean): string {
  return value === 'all' ? (tr ? 'Tümü' : 'All') : value === 'blank' ? (tr ? 'Boş' : 'Blank') : value === 'mixed' ? (tr ? 'Karma' : 'Mixed') : value === 'unknown' ? (tr ? 'Bilinmiyor' : 'Unknown') : value.startsWith('value:') ? value.slice(6) : value;
}
export function hasInvoiceOkShape(value: unknown): value is PaymentInvoiceOk {
  if (!value || typeof value !== 'object') return false;
  const row = value as PaymentInvoiceOk;
  return ['matched', 'unmatched', 'unavailable'].includes(row.status) && typeof row.hasBlank === 'boolean' && Array.isArray(row.values) && row.values.every((code) => typeof code === 'string' && validInvoiceOkToken(`value:${code}`)) && new Set(row.values).size === row.values.length;
}
export function invoiceOkCategory(value: PaymentInvoiceOk | undefined): string {
  if (!value || value.status !== 'matched' || (!value.values.length && !value.hasBlank)) return 'unknown';
  if (value.values.length > 1 || (value.values.length > 0 && value.hasBlank)) return 'mixed';
  return value.values.length ? `value:${value.values[0]}` : 'blank';
}
export function invoiceOkText(value: PaymentInvoiceOk | undefined, tr: boolean): string {
  return invoiceOkLabel(invoiceOkCategory(value), tr);
}
export function invoiceOkDetails(value: PaymentInvoiceOk | undefined, tr: boolean): string {
  if (invoiceOkCategory(value) !== 'mixed') return invoiceOkText(value, tr);
  return [...(value?.values || []), ...(value?.hasBlank ? [invoiceOkLabel('blank', tr)] : [])].join(' · ');
}
/** Missing row mappings are only accepted under All/Unknown; filtered scopes must prove the exact code. */
export function hasInvoiceOkContract(value: { selectedInvoiceOk?: string; invoiceOkOptions?: PaymentFilterOption[] }, rows: Array<{ invoiceOk?: PaymentInvoiceOk }>, requested?: string): boolean {
  const selected = value?.selectedInvoiceOk;
  if (!validInvoiceOkToken(selected) || (requested !== undefined && selected !== readInvoiceOk(requested)) || !Array.isArray(value.invoiceOkOptions)) return false;
  if (!value.invoiceOkOptions.every((option) => option && validInvoiceOkToken(option.value) && option.value !== 'all' && typeof option.label === 'string' && Number.isSafeInteger(option.caseCount) && option.caseCount >= 0) || new Set(value.invoiceOkOptions.map((option) => option.value)).size !== value.invoiceOkOptions.length) return false;
  return Array.isArray(rows) && rows.every((row) => (!row.invoiceOk || hasInvoiceOkShape(row.invoiceOk)) && (selected === 'all' || invoiceOkCategory(row.invoiceOk) === selected));
}
