"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type CurrencyCode = "USD" | "EUR" | "GBP" | "TRY";

const CUSTOMER_SHARE = 0.65;
const COMPANY_SHARE = 0.35;
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
  const grossYearlyIncome = dailyPriceValue * daysValue;
  const customerYearlyIncome = grossYearlyIncome * CUSTOMER_SHARE;
  const companyYearlyIncome = grossYearlyIncome * COMPANY_SHARE;
  const grossTotalIncome = grossYearlyIncome * yearsValue;
  const customerTotalIncome = customerYearlyIncome * yearsValue;
  const companyTotalIncome = companyYearlyIncome * yearsValue;
  const averageMonthlyIncome = grossYearlyIncome / 12;
  const occupancyRate = (daysValue / 365) * 100;

  const rows = useMemo(
    () =>
      Array.from({ length: yearsValue }, (_, index) => ({
        year: index + 1,
        days: daysValue,
        grossIncome: grossYearlyIncome,
        customerIncome: customerYearlyIncome,
        companyIncome: companyYearlyIncome,
        cumulativeGrossIncome: grossYearlyIncome * (index + 1),
      })),
    [companyYearlyIncome, customerYearlyIncome, daysValue, grossYearlyIncome, yearsValue],
  );

  function reset() {
    setCurrency("USD");
    setDailyPrice("150");
    setRentedDaysPerYear("180");
    setYears("3");
    setProjectionName("");
  }

  function printReport() {
    window.print();
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

        .rent-actions button.primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
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
          border: 1px solid color-mix(in srgb, var(--info) 24%, var(--stroke));
          background: color-mix(in srgb, var(--info) 8%, var(--surface));
        }

        .rent-summary-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .rent-summary-value {
          color: var(--text-primary);
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
          min-width: 860px;
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
        .rent-breakdown th:nth-child(3),
        .rent-breakdown td:nth-child(4),
        .rent-breakdown th:nth-child(4),
        .rent-breakdown td:nth-child(5),
        .rent-breakdown th:nth-child(5) {
          text-align: right;
        }

        .rent-print-report {
          display: none;
        }

        @media print {
          @page {
            margin: 14mm;
          }

          body * {
            visibility: hidden !important;
          }

          .rent-print-report,
          .rent-print-report * {
            visibility: visible !important;
          }

          .rent-print-report {
            display: grid !important;
            gap: 18px;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            padding: 0;
            background: #fff;
            color: #111827;
            font-family: Arial, sans-serif;
          }

          .rent-print-head {
            display: grid;
            gap: 6px;
            padding-bottom: 14px;
            border-bottom: 2px solid #111827;
          }

          .rent-print-head h1 {
            font-size: 24px;
            margin: 0;
          }

          .rent-print-head p,
          .rent-print-muted {
            margin: 0;
            color: #4b5563;
            font-size: 12px;
          }

          .rent-print-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .rent-print-box {
            display: grid;
            gap: 4px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
          }

          .rent-print-box span {
            color: #4b5563;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .rent-print-box strong {
            color: #111827;
            font-size: 18px;
          }

          .rent-print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          .rent-print-table th,
          .rent-print-table td {
            border: 1px solid #d1d5db;
            padding: 7px;
            text-align: left;
          }

          .rent-print-table th {
            background: #f3f4f6;
            font-weight: 800;
          }

          .rent-print-table td:nth-child(n + 3),
          .rent-print-table th:nth-child(n + 3) {
            text-align: right;
          }
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
              ? "Günlük fiyat, yıllık kiralanacak gün ve süreyi girerek toplam gelir, şirket geliri ve müşteriye ödenecek tutarı hesaplayın."
              : "Enter a daily price, rented days per year and duration to calculate total income, company income and customer payout."}
          </p>
        </div>

        <div className="rent-actions">
          <button type="button" className="primary" onClick={printReport}>
            {locale === "tr" ? "PDF / Yazdır" : "PDF / Print"}
          </button>
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
              {locale === "tr" ? "Toplam kira geliri" : "Total rental income"}
            </div>
            <div className="rent-summary-value">
              {formatMoney(grossTotalIncome, currency, locale)}
            </div>
            <div className="rent-muted">
              {locale === "tr"
                ? `${yearsValue} yıl için toplam brüt kira geliri.`
                : `Gross rental income calculated for ${yearsValue} ${yearsValue === 1 ? "year" : "years"}.`}
            </div>
          </div>

          <div className="rent-stat-grid">
            <Stat
              label={locale === "tr" ? "Müşteriye ödenecek" : "Customer payout"}
              value={formatMoney(customerTotalIncome, currency, locale)}
              detail={locale === "tr" ? "Toplam gelirin %65'i" : "65% of total income"}
              tone="success"
            />
            <Stat
              label={locale === "tr" ? "Şirket geliri" : "Company income"}
              value={formatMoney(companyTotalIncome, currency, locale)}
              detail={locale === "tr" ? "Toplam gelirin %35'i" : "35% of total income"}
              tone="warning"
            />
            <Stat
              label={locale === "tr" ? "Yıllık toplam gelir" : "Yearly total income"}
              value={formatMoney(grossYearlyIncome, currency, locale)}
              detail={locale === "tr" ? "Brüt yıllık kira" : "Gross yearly rental income"}
              tone="info"
            />
            <Stat
              label={locale === "tr" ? "Aylık ortalama toplam" : "Average monthly total"}
              value={formatMoney(averageMonthlyIncome, currency, locale)}
              detail={locale === "tr" ? "Toplam yıllık gelirin aylık görünümü" : "Monthly view of yearly total"}
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
                  <th>{locale === "tr" ? "Toplam gelir" : "Total income"}</th>
                  <th>{locale === "tr" ? "Müşteri" : "Customer"}</th>
                  <th>{locale === "tr" ? "Şirket" : "Company"}</th>
                  <th>{locale === "tr" ? "Kümülatif toplam" : "Cumulative total"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.year}>
                    <td>
                      {locale === "tr" ? `${row.year}. yıl` : `Year ${row.year}`}
                    </td>
                    <td>{row.days}</td>
                    <td>{formatMoney(row.grossIncome, currency, locale)}</td>
                    <td>{formatMoney(row.customerIncome, currency, locale)}</td>
                    <td>{formatMoney(row.companyIncome, currency, locale)}</td>
                    <td>{formatMoney(row.cumulativeGrossIncome, currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rent-print-report" aria-hidden="true">
        <div className="rent-print-head">
          <h1>{projectionName.trim() || (locale === "tr" ? "Kira Projeksiyonu" : "Rent Projection")}</h1>
          <p>
            {locale === "tr"
              ? `${daysValue} gün/yıl · ${yearsValue} yıl · Günlük fiyat ${formatMoney(dailyPriceValue, currency, locale)}`
              : `${daysValue} days/year · ${yearsValue} ${yearsValue === 1 ? "year" : "years"} · Daily price ${formatMoney(dailyPriceValue, currency, locale)}`}
          </p>
          <p>
            {locale === "tr" ? "Rapor tarihi" : "Report date"}:{" "}
            {new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="rent-print-grid">
          <div className="rent-print-box">
            <span>{locale === "tr" ? "Toplam kira geliri" : "Total rental income"}</span>
            <strong>{formatMoney(grossTotalIncome, currency, locale)}</strong>
          </div>
          <div className="rent-print-box">
            <span>{locale === "tr" ? "Müşteriye ödenecek" : "Customer payout"}</span>
            <strong>{formatMoney(customerTotalIncome, currency, locale)}</strong>
            <p className="rent-print-muted">
              {locale === "tr" ? "Toplam gelirin %65'i" : "65% of total income"}
            </p>
          </div>
          <div className="rent-print-box">
            <span>{locale === "tr" ? "Şirket geliri" : "Company income"}</span>
            <strong>{formatMoney(companyTotalIncome, currency, locale)}</strong>
            <p className="rent-print-muted">
              {locale === "tr" ? "Toplam gelirin %35'i" : "35% of total income"}
            </p>
          </div>
          <div className="rent-print-box">
            <span>{locale === "tr" ? "Yıllık toplam" : "Yearly total"}</span>
            <strong>{formatMoney(grossYearlyIncome, currency, locale)}</strong>
          </div>
          <div className="rent-print-box">
            <span>{locale === "tr" ? "Kiralanacak gün" : "Rented days"}</span>
            <strong>{daysValue}</strong>
            <p className="rent-print-muted">
              {formatNumber(occupancyRate, locale)}% {locale === "tr" ? "yıllık kullanım" : "yearly usage"}
            </p>
          </div>
          <div className="rent-print-box">
            <span>{locale === "tr" ? "Aylık ortalama toplam" : "Average monthly total"}</span>
            <strong>{formatMoney(averageMonthlyIncome, currency, locale)}</strong>
          </div>
        </div>

        <table className="rent-print-table">
          <thead>
            <tr>
              <th>{locale === "tr" ? "Yıl" : "Year"}</th>
              <th>{locale === "tr" ? "Gün" : "Days"}</th>
              <th>{locale === "tr" ? "Toplam gelir" : "Total income"}</th>
              <th>{locale === "tr" ? "Müşteri" : "Customer"}</th>
              <th>{locale === "tr" ? "Şirket" : "Company"}</th>
              <th>{locale === "tr" ? "Kümülatif toplam" : "Cumulative total"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year}>
                <td>{locale === "tr" ? `${row.year}. yıl` : `Year ${row.year}`}</td>
                <td>{row.days}</td>
                <td>{formatMoney(row.grossIncome, currency, locale)}</td>
                <td>{formatMoney(row.customerIncome, currency, locale)}</td>
                <td>{formatMoney(row.companyIncome, currency, locale)}</td>
                <td>{formatMoney(row.cumulativeGrossIncome, currency, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
