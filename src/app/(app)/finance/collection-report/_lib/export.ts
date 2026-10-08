import type { CollectionReportData } from "./types";

/** Export only the validated report, with separate rows for every currency. */
export function collectionCsv(report: CollectionReportData, tr: boolean): string {
  const cell = (value: string | number | null): string => {
    const raw = value === null ? "" : typeof value === "number" && tr ? String(value).replace(".", ",") : String(value);
    const safe = typeof value === "string" && /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows: Array<Array<string | number | null>> = [
    [tr ? "Tahsilat raporu" : "Collection report", report.source.asOf],
    [tr ? "Vade planı; ödenen/kapatılan tutarlar nakit tahsilat değildir." : "Due-date plan; paid/settled amounts are not cash receipts."],
    ["Fatura OK", report.selectedInvoiceOk, tr ? "Yetki kodu" : "Authorization", report.selectedAuthorizationState],
    [tr ? "Ödeme türü" : "Payment type", report.selectedPaymentKind, tr ? "Proje" : "Project", report.selectedProjectGroup || (tr ? "Tümü" : "All")],
    [tr ? "Temsilci" : "Representative", report.selectedRepresentative || report.selectedRepresentativeState || (tr ? "Tümü" : "All")],
    [],
    tr ? ["Vade ayı", "Döviz", "Planlanan", "Ödenen / kapatılan", "Kalan alacak", "Gecikmiş alacak", "Dosya", "Vade", "Eksik satır"]
      : ["Due month", "Currency", "Scheduled", "Paid / settled", "Outstanding", "Overdue", "Cases", "Dues", "Incomplete rows"],
  ];
  for (const part of report.byCurrency) for (const month of part.monthly) {
    const complete = part.currency !== null && month.incompleteRows === 0;
    rows.push([month.month, part.currency || (tr ? "Bilinmeyen döviz" : "Unknown currency"),
      complete ? month.scheduled : null, complete ? month.paidToDate : null,
      complete ? month.outstanding : null, complete ? month.overdue : null,
      month.caseCount, month.installmentCount, month.incompleteRows]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}
