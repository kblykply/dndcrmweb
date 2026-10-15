"use client";
import { authedFetch } from "@/lib/authedFetch";
import type { PaymentTrackingDetail } from "../payment-tracking/_lib/types";
import { requireSourceAudit } from "../payment-tracking/_lib/source-integrity";
import { buildStatementReport } from "./build";
import { downloadFinanceReport } from "./download";
import { reportSessionGuard } from "./session";
import ExportMenu from "./ExportMenu";

export default function StatementExport({
  caseKey,
  dates,
  tr,
  disabled = false,
  salesMode = false,
}: {
  caseKey: string;
  dates: (string | null)[];
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
          label: tr ? "Tüm cari ekstresi" : "Complete account statement",
        },
        {
          value: "year",
          label: tr ? "Yıllık cari ekstresi" : "Annual account statement",
          period: "year",
        },
        {
          value: "month",
          label: tr ? "Aylık cari ekstresi" : "Monthly account statement",
          period: "month",
        },
      ]}
      onExport={async (format, scope, period) => {
        const allowed = reportSessionGuard(salesMode ? "sales" : "finance");
        const data = (await authedFetch(
          `${salesMode ? "/sales-ledger" : "/payment-tracking"}/${encodeURIComponent(caseKey)}`,
        )) as PaymentTrackingDetail;
        requireSourceAudit(data.source, tr);
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
