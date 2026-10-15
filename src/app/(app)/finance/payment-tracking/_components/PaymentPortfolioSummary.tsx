import Link from "next/link";
import { Wallet } from "lucide-react";
import type { PaymentTrackingDetail } from "../_lib/types";
import { currencyName, money } from "../_lib/utils";
import s from "../payment-tracking.module.css";

export default function PaymentPortfolioSummary({
  data,
  backQuery,
  busy,
  tr,
  basePath = "/finance/payment-tracking",
}: {
  data: PaymentTrackingDetail;
  backQuery: string;
  busy: boolean;
  tr: boolean;
  basePath?: string;
}) {
  const t = (a: string, b: string) => (tr ? a : b);
  return (
    <section
      className={s.panel}
      aria-label={t(
        "Müşteri ve dairenin tüm ödemeleri",
        "All customer and unit payments",
      )}
    >
      <div className={s.panelHead}>
        <div>
          <h2>
            <Wallet size={18} />
            {t("Dosyanın tüm ödemeleri", "All payments in this case")}
          </h2>
          <p>
            {t(
              "Aynı müşteri ve dairenin tüm ödeme türleri ve dövizleri. Tutarlar her döviz için ayrı gösterilir.",
              "Every payment type and currency for this customer and unit. Amounts are shown separately for each currency.",
            )}
          </p>
        </div>
        {data.portfolio.fullyPaid && (
          <span className={`${s.badge} ${s.badgeGreen}`}>
            {t("Tamamen ödendi", "Fully paid")}
          </span>
        )}
      </div>
      <div className={s.currencyGrid}>
        {data.portfolio.cases.map((item) => {
          const currency = currencyName(item.identity.currency, tr);
          const selected = item.key === data.item.key;
          return (
            <article
              key={item.key}
              className={`${s.currencyCard} ${selected ? s.selectedCurrencyCard : ""}`}
              aria-label={t(`${currency} ödemeleri`, `${currency} payments`)}
            >
              <h3 className={s.portfolioCurrencyTitle}>
                {currency}
                {selected && (
                  <span className={s.badge}>
                    {t("Seçili takip", "Selected follow-up")}
                  </span>
                )}
              </h3>
              <dl>
                <dt>{t("Toplam plan", "Scheduled amount")}</dt>
                <dd>{money(item.amount, tr)}</dd>
                <dt>{t("Ödenen / kapatılan", "Paid / settled")}</dt>
                <dd>{money(item.paid, tr)}</dd>
                <dt>{t("Açık bakiye", "Outstanding balance")}</dt>
                <dd>{money(item.outstanding, tr)}</dd>
                <dt>{t("Vadesi geçmiş", "Overdue amount")}</dt>
                <dd className={item.overdueAmount ? s.red : undefined}>
                  {money(item.overdueAmount, tr)}
                </dd>
              </dl>
              {item.incompleteRows > 0 && (
                <p className={s.hint}>
                  {t(
                    "Eksik tutarlar sıfır sayılmaz.",
                    "Unknown amounts are not treated as zero.",
                  )}
                </p>
              )}
              {!selected && (
                <Link
                  className={`${s.button} ${s.portfolioCaseLink}`}
                  aria-disabled={busy}
                  tabIndex={busy ? -1 : undefined}
                  onClick={(event) => {
                    if (busy) event.preventDefault();
                  }}
                  href={`${`${basePath}/${encodeURIComponent(item.key)}`}${backQuery ? `?returnTo=${encodeURIComponent(backQuery)}` : ""}`}
                >
                  {t(`${currency} takibini aç`, `Open ${currency} follow-up`)}
                </Link>
              )}
            </article>
          );
        })}
      </div>
      <p className={s.hint}>
        {t(
          "Takip tarihi, notlar ve e-posta taslağı seçili döviz dosyasına aittir. WhatsApp hatırlatması tüm dövizleri birlikte özetleyebilir.",
          "Follow-up dates, notes and email drafts belong to the selected currency case. WhatsApp reminders can summarize all currencies together.",
        )}
      </p>
    </section>
  );
}
