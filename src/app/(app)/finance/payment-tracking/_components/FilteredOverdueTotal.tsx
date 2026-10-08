import { Clock3 } from "lucide-react";
import type { PaymentTrackingList } from "../_lib/types";
import { currencyName, money } from "../_lib/utils";
import s from "../payment-tracking.module.css";

export default function FilteredOverdueTotal({
  summary,
  total,
  currency,
  breakdown,
  paymentKind,
  project,
  tr,
  state,
}: {
  summary: PaymentTrackingList["filteredSummary"];
  total: number;
  currency: string;
  breakdown?: PaymentTrackingList["currencyBreakdown"];
  paymentKind: string;
  project: string;
  tr: boolean;
  state: "current" | "updating" | "error" | "stale";
}) {
  const t = (a: string, b: string) => (tr ? a : b);
  const title = t(
    "Filtrelenen toplam gecikmiş ödeme",
    "Filtered overdue payment total",
  );
  return (
    <section
      className={`${s.filteredTotal} ${s.compactTotal}`}
      aria-label={title}
      aria-busy={state === "updating"}
    >
      <div className={s.filteredHeading}>
        <h2>
          <Clock3 size={18} aria-hidden="true" />
          {t("Gecikmiş ödeme", "Overdue payments")}
        </h2>
        {state !== "current" && (
          <span className={s.filteredPrevious}>
            {t("Son başarılı sonuç", "Last successful result")}
          </span>
        )}
      </div>
      <p className={s.filteredScope}>{paymentKind} · {project}</p>
      {state === "updating" && (
        <p className={s.filteredPending} role="status">
          {t(
            "Güncel sonuçlar yükleniyor. Aşağıdaki tutar önceki başarılı sonuçlara aittir.",
            "Updating results. The amount below belongs to the previous successful results.",
          )}
        </p>
      )}
      {state === "error" && (
        <p className={s.filteredPending} role="status">
          {t(
            "Son istek tamamlanamadı. Aşağıdaki tutar son başarılı sonuçlara aittir; yeni filtreler için doğrulanmış toplam değildir.",
            "The latest request did not complete. The amount below is from the last successful results, not a confirmed total for new filters.",
          )}
        </p>
      )}
      {state === "stale" && (
        <p className={s.filteredPending} role="status">
          {t(
            "Kaynak yenilenemedi. Bu toplam, son başarılı kaynak okumasına ve uygulanmış filtrelere dayanır.",
            "The source could not be refreshed. This total uses the last successful source read and the applied filters.",
          )}
        </p>
      )}
      <div className={s.compactTotalBody}>
        <div className={s.compactCurrencyAmounts}>
          {breakdown ? breakdown.map((entry) => (
            <article className={s.compactCurrencyAmount} key={entry.currency ?? "__NULL__"}
              aria-label={t(`${currencyName(entry.currency, tr)} gecikmiş toplamı`, `${currencyName(entry.currency, tr)} overdue total`)}>
              <span>{currencyName(entry.currency, tr)}</span>
              <strong>{money(entry.filteredSummary.overdueAmount, tr)}</strong>
              {entry.filteredSummary.incompleteRows > 0 && (
                <small>{t("Bilinen gecikmiş tutar", "Known overdue amount")}</small>
              )}
            </article>
          )) : (
            <div className={s.compactCurrencyAmount}>
              <span>{currency}</span>
              <strong>{money(summary.overdueAmount, tr)}</strong>
              {summary.incompleteRows > 0 && (
                <small>{t("Bilinen gecikmiş tutar", "Known overdue amount")}</small>
              )}
            </div>
          )}
        </div>
        <dl className={`${s.filteredCounts} ${s.compactCounts}`}>
          <div>
            <dt>{t("Eşleşen dosya", "Matching cases")}</dt>
            <dd>{total}</dd>
          </div>
          <div>
            <dt>{t("Gecikmiş dosya", "Overdue cases")}</dt>
            <dd>{summary.overdueCount}</dd>
          </div>
        </dl>
      </div>
      {summary.incompleteRows > 0 && (
        <p className={s.filteredIncomplete}>
          {summary.incompleteRows}{" "}
          {t(
            "kaynak satırında eksik bilgi var. Bilinmeyen tutarlar sıfır sayılmaz; gecikmiş toplamın eksik kısmı hesaplanamaz.",
            "source rows contain incomplete information. Unknown amounts are not zero; the missing part of the overdue total cannot be calculated.",
          )}
        </p>
      )}
    </section>
  );
}
