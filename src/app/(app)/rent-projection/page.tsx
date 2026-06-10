"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type CurrencyCode = "USD" | "EUR" | "GBP" | "TRY";

const CUSTOMER_SHARE = 0.65;
const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "TRY"];

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function parseNumericInput(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currencySymbol(currency: CurrencyCode) {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  return "₺";
}

function formatMoney(value: number, currency: CurrencyCode, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "success" | "info" | "warning";
}) {
  return (
    <div className={`rent-stat ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="rent-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function RentProjectionPage() {
  const { locale } = useLanguage();
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [dailyPrice, setDailyPrice] = useState("150");
  const [rentedDaysPerYear, setRentedDaysPerYear] = useState("180");
  const [years, setYears] = useState("3");
  const [projectionName, setProjectionName] = useState("");

  const dailyPriceValue = clampNumber(parseNumericInput(dailyPrice), 0, 1000000);
  const daysValue = Math.round(clampNumber(parseNumericInput(rentedDaysPerYear), 0, 365));
  const yearsValue = Math.round(clampNumber(parseNumericInput(years), 1, 30));
  const customerYearlyIncome = dailyPriceValue * daysValue * CUSTOMER_SHARE;
  const customerTotalIncome = customerYearlyIncome * yearsValue;
  const averageMonthlyIncome = customerYearlyIncome / 12;
  const occupancyRate = (daysValue / 365) * 100;

  const rows = useMemo(
    () =>
      Array.from({ length: yearsValue }, (_, index) => ({
        year: index + 1,
        days: daysValue,
        yearlyIncome: customerYearlyIncome,
        cumulativeIncome: customerYearlyIncome * (index + 1),
      })),
    [customerYearlyIncome, daysValue, yearsValue],
  );

  function reset() {
    setCurrency("USD");
    setDailyPrice("150");
    setRentedDaysPerYear("180");
    setYears("3");
    setProjectionName("");
  }

  return (
    <div className="rent-page">
      <style jsx global>{`
        .rent-page {
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .rent-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .rent-title {
          display: grid;
          gap: 7px;
          min-width: min(100%, 460px);
        }

        .rent-title h1 {
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: 0;
        }

        .rent-title p {
          max-width: 650px;
          color: var(--text-secondary);
        }

        .rent-eyebrow {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .rent-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rent-actions button {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          font-weight: 900;
        }

        .rent-layout {
          display: grid;
          grid-template-columns: minmax(320px, 0.82fr) minmax(0, 1.18fr);
          gap: 14px;
          align-items: start;
        }

        .rent-panel {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          min-width: 0;
        }

        .rent-form {
          display: grid;
          gap: 14px;
          padding: 14px;
        }

        .rent-form-head,
        .rent-results-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--stroke);
        }

        .rent-form-head h2,
        .rent-results-head h2 {
          font-size: 17px;
          line-height: 1.2;
        }

        .rent-muted {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .rent-field-grid {
          display: grid;
          gap: 11px;
        }

        .rent-field {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .rent-field span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .rent-input-wrap {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
          overflow: hidden;
        }

        .rent-input-prefix {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-weight: 900;
          border-right: 1px solid var(--stroke);
        }

        .rent-input-wrap input {
          border: 0;
          border-radius: 0;
          background: transparent;
          height: 42px;
        }

        .rent-range-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 82px;
          gap: 8px;
          align-items: center;
        }

        .rent-range-row input[type="range"] {
          width: 100%;
          accent-color: var(--primary);
        }

        .rent-results {
          display: grid;
          gap: 14px;
          padding: 14px;
        }

        .rent-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .rent-stat {
          display: grid;
          gap: 7px;
          min-width: 0;
          padding: 14px;
          border: 1px solid var(--stroke);
          border-left: 4px solid var(--text-muted);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .rent-stat.success {
          border-left-color: var(--success);
        }

        .rent-stat.info {
          border-left-color: var(--info);
        }

        .rent-stat.warning {
          border-left-color: var(--warning);
        }

        .rent-stat span,
        .rent-stat small {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .rent-stat strong {
          color: var(--text-primary);
          font-size: 25px;
          line-height: 1.15;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .rent-summary {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--success) 24%, var(--stroke));
          background: color-mix(in srgb, var(--success) 8%, var(--surface));
        }

        .rent-summary-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .rent-summary-value {
          color: var(--success);
          font-size: 38px;
          line-height: 1;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .rent-breakdown {
          overflow: auto;
          border: 1px solid var(--stroke);
          border-radius: 8px;
        }

        .rent-breakdown table {
          min-width: 620px;
        }

        .rent-breakdown th {
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 12px;
          text-transform: uppercase;
        }

        .rent-breakdown td,
        .rent-breakdown th {
          padding: 10px 12px;
        }

        .rent-breakdown td:last-child,
        .rent-breakdown th:last-child {
          text-align: right;
        }

        .rent-breakdown td:nth-child(3),
        .rent-breakdown th:nth-child(3) {
          text-align: right;
        }

        @media (max-width: 1060px) {
          .rent-layout,
          .rent-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .rent-title h1 {
            font-size: 24px;
          }

          .rent-actions,
          .rent-actions > *,
          .rent-range-row {
            width: 100%;
            grid-template-columns: 1fr;
          }

          .rent-summary-value {
            font-size: 30px;
          }
        }
      `}</style>

      <div className="rent-header">
        <div className="rent-title">
          <div className="rent-eyebrow">
            {locale === "tr" ? "Kira sunumu" : "Rental presentation"}
          </div>
          <h1>{locale === "tr" ? "Kira Projeksiyonu" : "Rent Projection"}</h1>
          <p>
            {locale === "tr"
              ? "Günlük fiyat, yıllık kiralanacak gün ve süreyi girerek müşteriye gösterilecek net gelir projeksiyonunu hesaplayın."
              : "Enter a daily price, rented days per year and duration to calculate the customer-facing income projection."}
          </p>
        </div>

        <div className="rent-actions">
          <button type="button" onClick={reset}>
            {locale === "tr" ? "Sıfırla" : "Reset"}
          </button>
        </div>
      </div>

      <div className="rent-layout">
        <section className="rent-panel rent-form">
          <div className="rent-form-head">
            <div>
              <h2>{locale === "tr" ? "Projeksiyon bilgileri" : "Projection details"}</h2>
              <div className="rent-muted">
                {locale === "tr" ? "Örnek unit veya müşteri sunumu için" : "For sample unit or customer presentation"}
              </div>
            </div>
          </div>

          <div className="rent-field-grid">
            <Field label={locale === "tr" ? "Sunum adı" : "Projection name"}>
              <input
                value={projectionName}
                onChange={(e) => setProjectionName(e.target.value)}
                placeholder={locale === "tr" ? "Opsiyonel" : "Optional"}
              />
            </Field>

            <Field label={locale === "tr" ? "Para birimi" : "Currency"}>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={locale === "tr" ? "Günlük kira fiyatı" : "Daily rent price"}>
              <div className="rent-input-wrap">
                <span className="rent-input-prefix">{currencySymbol(currency)}</span>
                <input
                  inputMode="decimal"
                  value={dailyPrice}
                  onChange={(e) => setDailyPrice(e.target.value)}
                  placeholder="150"
                />
              </div>
            </Field>

            <Field label={locale === "tr" ? "Yılda kiralanacak gün" : "Rented days per year"}>
              <div className="rent-range-row">
                <input
                  type="range"
                  min="0"
                  max="365"
                  value={daysValue}
                  onChange={(e) => setRentedDaysPerYear(e.target.value)}
                />
                <input
                  inputMode="numeric"
                  value={rentedDaysPerYear}
                  onChange={(e) => setRentedDaysPerYear(e.target.value)}
                />
              </div>
            </Field>

            <Field label={locale === "tr" ? "Kiralama yılı" : "Rental years"}>
              <div className="rent-range-row">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={yearsValue}
                  onChange={(e) => setYears(e.target.value)}
                />
                <input
                  inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                />
              </div>
            </Field>
          </div>
        </section>

        <section className="rent-panel rent-results">
          <div className="rent-results-head">
            <div>
              <h2>{projectionName.trim() || (locale === "tr" ? "Gelir projeksiyonu" : "Income projection")}</h2>
              <div className="rent-muted">
                {daysValue} {locale === "tr" ? "gün/yıl" : "days/year"} · {yearsValue}{" "}
                {locale === "tr" ? "yıl" : yearsValue === 1 ? "year" : "years"}
              </div>
            </div>
          </div>

          <div className="rent-summary">
            <div className="rent-summary-label">
              {locale === "tr" ? "Müşteriye gösterilecek toplam gelir" : "Total projected customer income"}
            </div>
            <div className="rent-summary-value">
              {formatMoney(customerTotalIncome, currency, locale)}
            </div>
            <div className="rent-muted">
              {locale === "tr"
                ? `${yearsValue} yıl için hesaplandı.`
                : `Calculated for ${yearsValue} ${yearsValue === 1 ? "year" : "years"}.`}
            </div>
          </div>

          <div className="rent-stat-grid">
            <Stat
              label={locale === "tr" ? "Yıllık müşteri geliri" : "Yearly customer income"}
              value={formatMoney(customerYearlyIncome, currency, locale)}
              detail={locale === "tr" ? "Her yıl için tahmini" : "Estimated per year"}
              tone="success"
            />
            <Stat
              label={locale === "tr" ? "Aylık ortalama" : "Average monthly"}
              value={formatMoney(averageMonthlyIncome, currency, locale)}
              detail={locale === "tr" ? "12 aya bölünmüş görünüm" : "Spread across 12 months"}
              tone="info"
            />
            <Stat
              label={locale === "tr" ? "Kiralanacak gün" : "Rented days"}
              value={`${daysValue}`}
              detail={`${formatNumber(occupancyRate, locale)}% ${locale === "tr" ? "yıllık kullanım" : "yearly usage"}`}
              tone="warning"
            />
            <Stat
              label={locale === "tr" ? "Günlük fiyat" : "Daily price"}
              value={formatMoney(dailyPriceValue, currency, locale)}
              detail={locale === "tr" ? "Girilen örnek fiyat" : "Sample entered price"}
            />
          </div>

          <div className="rent-breakdown">
            <table>
              <thead>
                <tr>
                  <th>{locale === "tr" ? "Yıl" : "Year"}</th>
                  <th>{locale === "tr" ? "Gün" : "Days"}</th>
                  <th>{locale === "tr" ? "Yıllık gelir" : "Yearly income"}</th>
                  <th>{locale === "tr" ? "Toplam" : "Cumulative"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.year}>
                    <td>
                      {locale === "tr" ? `${row.year}. yıl` : `Year ${row.year}`}
                    </td>
                    <td>{row.days}</td>
                    <td>{formatMoney(row.yearlyIncome, currency, locale)}</td>
                    <td>{formatMoney(row.cumulativeIncome, currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
