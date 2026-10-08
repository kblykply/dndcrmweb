import { Clock3, RefreshCw } from "lucide-react";
import type { PaymentSourceSnapshot } from "../_lib/types";
import { dateLabel } from "../_lib/utils";
import s from "../payment-tracking.module.css";

export default function SourceFreshness({
  source,
  tr,
  failed = false,
}: {
  source: Omit<PaymentSourceSnapshot, "cases">;
  tr: boolean;
  failed?: boolean;
}) {
  const status = failed ? "stale" : source.freshness?.status;
  return (
    <div
      className={`${s.freshness} ${status === "stale" ? s.freshnessStale : ""}`}
      role="status"
      aria-live="polite"
    >
      <span>
        <Clock3 size={14} aria-hidden="true" />
        {tr ? "Son kaynak okuması" : "Source last read"}:{" "}
        <time dateTime={source.generatedAt}>
          {dateLabel(source.generatedAt, tr, true)}
        </time>
      </span>
      {source.importedAt && <span>
        {tr ? "Tek seferlik Logo aktarımı" : "One-time Logo import"}: {dateLabel(source.importedAt, tr, true)}.
        {tr ? " Logo değişiklikleri otomatik alınmaz." : " Logo changes are not synced automatically."}
      </span>}
      {status === "refreshing" && (
        <span>
          <RefreshCw size={13} aria-hidden="true" />
          {tr
            ? "Arka planda yenileniyor; mevcut sonuçları kullanabilirsiniz."
            : "Refreshing in the background; current results remain available."}
        </span>
      )}
      {status === "stale" && (
        <span>
          {tr
            ? "Yenileme başarısız. Son başarılı veriler gösteriliyor."
            : "Refresh failed. Showing the last successful data."}
        </span>
      )}
    </div>
  );
}
