import { currencyName, dateLabel } from "../payment-tracking/_lib/utils";
import type { FinanceReport } from "./model";
const receiptKinds = [
  "cash",
  "bank",
  "card",
  "cheque",
  "note",
  "transfer",
] as const;
export type ReceiptKind = (typeof receiptKinds)[number];
export type ReceiptReportData = {
  key: string;
  source: {
    importedAt: string | null;
    generatedAt: string;
    asOf: string;
    sourceBatchId: string | null;
  };
  account: {
    customerCode: string;
    customerName: string;
    currency: string;
    unitCodes: string[];
    scope: "customer_currency";
  };
  rows: Array<{
    id: string;
    customerCode: string;
    customerName: string;
    date: string;
    ficheNo: string;
    documentNo: string;
    description: string;
    currency: string;
    kind: ReceiptKind;
    amount: number;
  }>;
  totals: {
    cash: number;
    bank: number;
    card: number;
    cheque: number;
    note: number;
    transfer: number;
    total: number;
  };
};
export function buildReceiptReport(
  data: ReceiptReportData,
  tr: boolean,
): FinanceReport {
  const t = (a: string, b: string) => (tr ? a : b);
  const fail = () => {
    throw new Error(
      t(
        "Tahsilat raporunun kapsamı veya tutarları doğrulanamadı.",
        "The receipt report scope or amounts could not be verified.",
      ),
    );
  };
  if (
    data.account?.scope !== "customer_currency" ||
    !data.account.customerCode ||
    !data.account.currency ||
    !Array.isArray(data.rows) ||
    !Array.isArray(data.account.unitCodes)
  )
    fail();
  const kinds = receiptKinds;
  const labels = {
    cash: t("Nakit tahsilat", "Cash receipts"),
    bank: t("Banka tahsilatı", "Bank receipts"),
    card: t("Kredi kartı tahsilatı", "Card receipts"),
    cheque: t("Çek girişi", "Cheques received"),
    note: t("Senet girişi", "Promissory notes received"),
    transfer: t("Virman", "Account transfers"),
  };
  const seen = new Set<string>(),
    cents = { cash: 0, bank: 0, card: 0, cheque: 0, note: 0, transfer: 0 };
  for (const row of data.rows) {
    if (
      !row.id ||
      seen.has(row.id) ||
      row.customerCode !== data.account.customerCode ||
      row.currency !== data.account.currency ||
      !kinds.includes(row.kind) ||
      typeof row.amount !== "number" ||
      !Number.isFinite(row.amount) ||
      row.amount < 0 ||
      !Number.isSafeInteger(Math.round(row.amount * 100))
    )
      fail();
    seen.add(row.id);
    cents[row.kind] += Math.round(row.amount * 100);
  }
  const total = kinds.reduce((sum, kind) => sum + cents[kind], 0);
  if (
    !Number.isSafeInteger(total) ||
    !data.totals ||
    kinds.some((kind) => Math.round(data.totals[kind] * 100) !== cents[kind]) ||
    Math.round(data.totals.total * 100) !== total
  )
    fail();
  const rows = data.rows
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.ficheNo.localeCompare(b.ficheNo) ||
        a.id.localeCompare(b.id),
    );
  const title = t("Tahsilat Raporu", "Collections Report"),
    currency = currencyName(data.account.currency, tr);
  const scope = t(
    "Kapsam: cari kodu ve seçili döviz, tüm daireler",
    "Scope: account code and selected currency, all units",
  );
  const note = t(
    "Çek ve senetler giriş kaydıyla gösterilir. Nakit, banka ve kart toplamı virmanları içermez.",
    "Cheques and promissory notes are shown when received. The cash, bank and card subtotal excludes account transfers.",
  );
  const generated = dateLabel(data.source.generatedAt, tr, true),
    imported = data.source.importedAt
      ? dateLabel(data.source.importedAt, tr, true)
      : generated;
  return {
    title,
    filename:
      `tahsilat-raporu-${data.account.unitCodes.length === 1 ? data.account.unitCodes[0] : "tum-daireler"}-${data.account.customerCode}-${data.account.currency}-${data.source.asOf}`.replace(
        /[^\p{L}\p{N}_.-]/gu,
        "_",
      ),
    metadata: [
      data.account.customerName,
      `${t("Cari kod", "Account code")}: ${data.account.customerCode} · ${currency}`,
      `${t("Daireler", "Units")}: ${data.account.unitCodes.join(", ") || "—"}`,
      scope,
      `${t("Rapor tarihi", "Report generated")}: ${generated}`,
      `${t("Logo işlem verisi tarihi", "Logo transaction data read")}: ${imported}`,
      note,
    ],
    pdf: {
      subtitle: data.account.customerName || data.account.customerCode,
      details: [
        `${t("Cari kod", "Account code")}: ${data.account.customerCode} · ${t("Döviz", "Currency")}: ${currency} · ${t("Daireler", "Units")}: ${data.account.unitCodes.join(", ") || "—"}`,
        scope,
        `${t("Rapor tarihi", "Report generated")}: ${generated} · ${t("Veri tarihi", "Data updated")}: ${imported}`,
      ],
      note,
    },
    sheets: [
      {
        name: t("İşlem türüne göre toplamlar", "Totals by transaction type"),
        columns: [
          { label: t("İşlem türü", "Transaction type") },
          { label: t("Döviz", "Currency") },
          { label: t("Alacak tutarı", "Credit amount"), kind: "money" },
        ],
        rows: [
          ...kinds
            .filter((kind) => data.rows.some((row) => row.kind === kind))
            .map((kind) => [labels[kind], currency, cents[kind] / 100]),
          [
            t("Nakit, banka ve kart toplamı", "Cash, bank and card subtotal"),
            currency,
            (cents.cash + cents.bank + cents.card) / 100,
          ],
          [
            t("Listelenen hareket toplamı", "Total listed movements"),
            currency,
            total / 100,
          ],
        ],
      },
      {
        name: t("İşlem dökümü", "Transaction details"),
        columns: [
          { label: t("İşlem tarihi", "Transaction date"), pdfWidth: 25 },
          { label: t("Fiş numarası", "Transaction no."), pdfWidth: 37 },
          { label: t("İşlem türü", "Transaction type"), pdfWidth: 34 },
          { label: t("Belge numarası", "Document no."), pdfWidth: 24 },
          { label: t("Açıklama", "Description"), width: 55 },
          { label: t("Döviz", "Currency"), pdfWidth: 17 },
          {
            label: t("Alacak tutarı", "Credit amount"),
            kind: "money",
            pdfWidth: 32,
          },
        ],
        rows: rows.map((row) => [
          dateLabel(row.date, tr),
          row.ficheNo,
          labels[row.kind],
          row.documentNo,
          row.description,
          currency,
          row.amount,
        ]),
      },
    ],
  };
}
