"use client";
import { authedFetch } from "@/lib/authedFetch";
import type { PaymentTrackingDetail } from "../payment-tracking/_lib/types";
import { requireSourceAudit } from "../payment-tracking/_lib/source-integrity";
import { requireCustomerActions } from "../payment-tracking/_lib/closure-check";
import { buildReceiptReport } from "./receipts";
import { requestReceiptReport } from "./receipt-request";
import { buildStatementReport } from "./build";
import { downloadFinanceReport } from "./download";
import { reportSessionGuard } from "./session";
import ExportMenu from "./ExportMenu";

export default function StatementExport({
  caseKey,
  dates,
  currency,
  tr,
  disabled = false,
  salesMode = false,
}: {
  caseKey: string;
  dates: (string | null)[];
  currency?: string | null;
  tr: boolean;
  disabled?: boolean;
  salesMode?: boolean;
}) {
  const years = [
    ...new Set(dates.flatMap((date) => (date ? [date.slice(0, 4)] : []))),
  ]
    .sort()
    .reverse();
  const months = [
    ...new Set(dates.flatMap((date) => (date ? [date.slice(0, 7)] : []))),
  ]
    .sort()
    .reverse();
  return (
    <ExportMenu
      tr={tr}
      disabled={disabled}
      years={years}
      months={months}
      options={[
        {
          value: "all",
          label: tr
            ? "Ödeme Planı ve Borç Durumu (Tümü)"
            : "Payment Schedule and Balance (All)",
        },
        {
          value: "year",
          label: tr
            ? "Ödeme Planı ve Borç Durumu (Yıllık)"
            : "Payment Schedule and Balance (Annual)",
          period: "year",
        },
        {
          value: "month",
          label: tr
            ? "Ödeme Planı ve Borç Durumu (Aylık)"
            : "Payment Schedule and Balance (Monthly)",
          period: "month",
        },
        ...(currency
          ? [
              {
                value: "receipts",
                label: tr ? "Tahsilat Raporu" : "Collections Report",
                description: tr
                  ? `Bu cari kodunun ${currency} cinsinden tahsilatlarını, belge numarası boş kayıtlar dahil listeler.`
                  : `Lists receipts in ${currency} for this account code, including records without a document number.`,
              },
            ]
          : []),
      ]}
      onExport={async (format, scope, period) => {
        const allowed = reportSessionGuard(salesMode ? "sales" : "finance");
        if (scope === "receipts") {
          const data = await requestReceiptReport({
            endpoint: `${salesMode ? "/sales-ledger" : "/payment-tracking"}/${encodeURIComponent(caseKey)}/receipt-report`,
            caseKey,
            tr,
            signal: AbortSignal.timeout(180_000),
            allowed,
          });
          await downloadFinanceReport(
            buildReceiptReport(data, tr),
            format,
            tr,
            allowed,
          );
          return;
        }
        const data = (await authedFetch(
          `${salesMode ? "/sales-ledger" : "/payment-tracking"}/${encodeURIComponent(caseKey)}/statement`,
        )) as PaymentTrackingDetail;
        requireSourceAudit(data.source, tr);
        requireCustomerActions(data.item, tr);
        if (!allowed() || data.item.key !== caseKey)
          throw new Error(
            tr
              ? "Cari bilgileri doğrulanamadı."
              : "The account could not be verified.",
          );
        const report = buildStatementReport(
          data,
          scope === "all" ? "" : period,
          tr,
          salesMode,
        );
        await downloadFinanceReport(report, format, tr, allowed);
      }}
    />
  );
}
