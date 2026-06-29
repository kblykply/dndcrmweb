"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Currency = "GBP" | "USD" | "EUR" | "TRY";

type DashboardData = {
  range: { dateFrom: string; dateTo: string; baseCurrency: Currency };
  totals: {
    income: number;
    expense: number;
    net: number;
    profitRate: number;
    planned: number;
    paid: number;
    overdue: number;
    flexibleExpenses: number;
  };
  byMonth: Array<{ month: string; income: number; expense: number; net: number }>;
  byPaymentType: Array<{ paymentType: string; income: number; expense: number; net: number; count: number }>;
  flexibleEntries: Array<{
    id: string;
    title: string;
    amount: number;
    currency: Currency;
    baseAmount: number;
    plannedDueDate: string;
    originalDueDate: string;
    dueOptions: Array<{ id: string; label: string; daysFromOriginal: number; dueDate: string; isSelected: boolean }>;
  }>;
  entries: Array<{ id: string; title: string; kind: "INCOME" | "EXPENSE"; baseAmount: number; plannedDueDate: string }>;
};

const CURRENCIES: Currency[] = ["GBP", "USD", "EUR", "TRY"];
const CHART_COLORS = ["#16a34a", "#dc2626", "#0891b2", "#f59e0b", "#8b5cf6"];

function monthStartInput() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function monthEndInput() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatMoney(value: number, currency: Currency, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(Number(value || 0));
}

function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

function paymentTypeLabel(value: string, locale: string) {
  const tr: Record<string, string> = {
    SALE_INSTALLMENT: "Satış taksiti",
    CREDIT_INSTALLMENT: "Kredi taksiti",
    CHECK_PAYMENT: "Çek ödemesi",
    REALTOR_COMMISSION: "Emlakçı komisyonu",
    SUBCONTRACTOR: "Taşeron",
    INVOICE: "Fatura",
    OTHER: "Diğer",
    TAX: "Vergi",
    SALARY: "Maaş",
  };
  const en: Record<string, string> = {
    SALE_INSTALLMENT: "Sale installment",
    CREDIT_INSTALLMENT: "Credit installment",
    CHECK_PAYMENT: "Check payment",
    REALTOR_COMMISSION: "Realtor commission",
    SUBCONTRACTOR: "Subcontractor",
    INVOICE: "Invoice",
    OTHER: "Other",
    TAX: "Tax",
    SALARY: "Salary",
  };
  return (locale === "tr" ? tr : en)[value] || value;
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "bad" | "info" | "warning";
}) {
  return (
    <div className={`finance-stat ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function FinanceDashboardPage() {
  const { locale } = useLanguage();
  const [checked, setChecked] = useState(false);
  const [dateFrom, setDateFrom] = useState(monthStartInput());
  const [dateTo, setDateTo] = useState(monthEndInput());
  const [baseCurrency, setBaseCurrency] = useState<Currency>("GBP");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const user = getUser();
    if (user?.role !== "ADMIN" && user?.role !== "ACCOUNTING") {
      window.location.replace("/leads");
      return;
    }
    setChecked(true);
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams({ dateFrom, dateTo, baseCurrency });
      const next = (await authedFetch(`/finance/dashboard?${params.toString()}`)) as DashboardData;
      setData(next);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, baseCurrency]);

  if (!checked) return null;

  const totals = data?.totals || {
    income: 0,
    expense: 0,
    net: 0,
    profitRate: 0,
    planned: 0,
    paid: 0,
    overdue: 0,
    flexibleExpenses: 0,
  };
  const monthData = data?.byMonth || [];

  return (
    <main className="finance-dashboard">
      <div className="finance-hero">
        <div>
          <p>{locale === "tr" ? "Finans" : "Finance"}</p>
          <h1>{locale === "tr" ? "Nakit akışı ve kar projeksiyonu" : "Cash flow and profit projection"}</h1>
        </div>
        <div className="finance-actions">
          <Link href="/finance/incomes">{locale === "tr" ? "Gelirler" : "Incomes"}</Link>
          <Link href="/finance/expenses">{locale === "tr" ? "Giderler" : "Expenses"}</Link>
          <Link href="/finance/rates">{locale === "tr" ? "Kurlar" : "Rates"}</Link>
        </div>
      </div>

      <section className="finance-filter-band">
        <label>
          <span>{locale === "tr" ? "Başlangıç" : "From"}</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          <span>{locale === "tr" ? "Bitiş" : "To"}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label>
          <span>{locale === "tr" ? "Baz para" : "Base"}</span>
          <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={load} disabled={loading}>
          {loading ? (locale === "tr" ? "Yükleniyor..." : "Loading...") : locale === "tr" ? "Hesapla" : "Calculate"}
        </button>
      </section>

      {err ? <div className="finance-alert">{err}</div> : null}

      <section className="finance-stats">
        <StatCard
          label={locale === "tr" ? "Beklenen gelir" : "Expected income"}
          value={formatMoney(totals.income, baseCurrency, locale)}
          detail={`${formatMoney(totals.paid, baseCurrency, locale)} ${locale === "tr" ? "ödenen toplam" : "paid total"}`}
          tone="good"
        />
        <StatCard
          label={locale === "tr" ? "Beklenen gider" : "Expected expense"}
          value={formatMoney(totals.expense, baseCurrency, locale)}
          detail={`${formatMoney(totals.flexibleExpenses, baseCurrency, locale)} ${locale === "tr" ? "vade opsiyonlu" : "with due options"}`}
          tone="bad"
        />
        <StatCard
          label={locale === "tr" ? "Net durum" : "Net position"}
          value={formatMoney(totals.net, baseCurrency, locale)}
          detail={`%${formatPercent(totals.profitRate, locale)} ${locale === "tr" ? "kar oranı" : "profit rate"}`}
          tone={totals.net >= 0 ? "good" : "bad"}
        />
        <StatCard
          label={locale === "tr" ? "Geciken" : "Overdue"}
          value={formatMoney(totals.overdue, baseCurrency, locale)}
          detail={locale === "tr" ? "Gecikmiş açık kayıt toplamı" : "Total overdue open records"}
          tone="warning"
        />
      </section>

      <section className="finance-grid">
        <div className="finance-panel chart">
          <div className="finance-panel-head">
            <h2>{locale === "tr" ? "Aylık akış" : "Monthly flow"}</h2>
          </div>
          <div className="finance-chart">
            {monthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="income" name={locale === "tr" ? "Gelir" : "Income"} fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" name={locale === "tr" ? "Gider" : "Expense"} fill="#dc2626" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-empty">{locale === "tr" ? "Veri yok" : "No data"}</div>
            )}
          </div>
        </div>

        <div className="finance-panel">
          <div className="finance-panel-head">
            <h2>{locale === "tr" ? "Ödeme tipi özeti" : "Payment type summary"}</h2>
          </div>
          <div className="finance-type-list">
            {(data?.byPaymentType || []).map((row, index) => (
              <div key={row.paymentType} className="finance-type-row">
                <span style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <div>
                  <strong>{paymentTypeLabel(row.paymentType, locale)}</strong>
                  <small>{row.count} {locale === "tr" ? "kayıt" : "records"}</small>
                </div>
                <strong>{formatMoney(row.net, baseCurrency, locale)}</strong>
              </div>
            ))}
            {data && data.byPaymentType.length === 0 ? (
              <div className="finance-empty">{locale === "tr" ? "Veri yok" : "No data"}</div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-head">
          <h2>{locale === "tr" ? "Vade opsiyonlu giderler" : "Expenses with due options"}</h2>
          <span>{locale === "tr" ? "Vade hakkı kullanılabilecek ödemeler" : "Payments that can be delayed by contract option"}</span>
        </div>
        <div className="finance-flex-list">
          {(data?.flexibleEntries || []).map((entry) => (
            <article key={entry.id} className="finance-flex-row">
              <div>
                <strong>{entry.title}</strong>
                <span>
                  {formatDate(entry.originalDueDate, locale)} / {formatDate(entry.plannedDueDate, locale)}
                </span>
              </div>
              <strong>{formatMoney(entry.baseAmount, baseCurrency, locale)}</strong>
              <div className="finance-option-tags">
                {entry.dueOptions.map((option) => (
                  <span key={option.id} className={option.isSelected ? "active" : ""}>
                    {option.daysFromOriginal === 0 ? "Normal" : `+${option.daysFromOriginal}`} {formatDate(option.dueDate, locale)}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {data && data.flexibleEntries.length === 0 ? (
            <div className="finance-empty">{locale === "tr" ? "Vade opsiyonlu gider yok" : "No flexible expenses"}</div>
          ) : null}
        </div>
      </section>

      <style jsx>{`
        .finance-dashboard {
          display: grid;
          gap: 18px;
        }

        .finance-hero {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 16px;
        }

        .finance-hero p {
          margin: 0 0 6px;
          color: var(--text-secondary);
          font-weight: 800;
        }

        .finance-hero h1 {
          margin: 0;
          max-width: 760px;
          font-size: 36px;
          line-height: 1.05;
        }

        .finance-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .finance-actions a,
        .finance-filter-band,
        .finance-stat,
        .finance-panel,
        .finance-flex-row {
          border: 1px solid var(--stroke);
          background: var(--surface);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
        }

        .finance-actions a {
          display: inline-flex;
          align-items: center;
          min-height: 42px;
          padding: 0 14px;
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 800;
        }

        .finance-filter-band {
          display: grid;
          grid-template-columns: 160px 160px 130px auto;
          gap: 10px;
          align-items: end;
          padding: 14px;
        }

        label {
          display: grid;
          gap: 6px;
        }

        label span,
        .finance-panel-head span,
        .finance-flex-row span,
        .finance-type-row small {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        input,
        select,
        button {
          min-height: 42px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text-primary);
          padding: 0 12px;
          font: inherit;
          font-weight: 800;
        }

        button {
          cursor: pointer;
          background: var(--text-primary);
          color: var(--surface);
        }

        .finance-alert {
          padding: 12px 14px;
          border: 1px solid color-mix(in srgb, var(--danger) 32%, var(--stroke));
          border-radius: 8px;
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          font-weight: 800;
        }

        .finance-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .finance-stat {
          display: grid;
          gap: 8px;
          padding: 16px;
        }

        .finance-stat span,
        .finance-stat small {
          color: var(--text-secondary);
          font-weight: 800;
        }

        .finance-stat strong {
          font-size: 26px;
        }

        .finance-stat.good {
          border-color: color-mix(in srgb, var(--success) 26%, var(--stroke));
        }

        .finance-stat.bad {
          border-color: color-mix(in srgb, var(--danger) 26%, var(--stroke));
        }

        .finance-stat.warning {
          border-color: color-mix(in srgb, var(--warning) 30%, var(--stroke));
        }

        .finance-grid {
          display: grid;
          grid-template-columns: minmax(420px, 1.25fr) minmax(320px, 0.75fr);
          gap: 16px;
        }

        .finance-panel {
          display: grid;
          gap: 14px;
          padding: 16px;
          min-width: 0;
        }

        .finance-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .finance-panel h2 {
          margin: 0;
          font-size: 20px;
        }

        .finance-chart {
          height: 320px;
          min-width: 0;
        }

        .finance-type-list,
        .finance-flex-list {
          display: grid;
          gap: 10px;
        }

        .finance-type-row {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--stroke);
        }

        .finance-type-row > span {
          width: 10px;
          height: 36px;
          border-radius: 999px;
        }

        .finance-type-row > div,
        .finance-flex-row > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .finance-flex-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(240px, 0.8fr);
          gap: 12px;
          align-items: center;
          padding: 12px;
        }

        .finance-option-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .finance-option-tags span {
          padding: 6px 8px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          background: var(--surface-2);
        }

        .finance-option-tags span.active {
          border-color: var(--info);
          color: var(--info);
        }

        .finance-empty {
          display: grid;
          place-items: center;
          min-height: 120px;
          color: var(--text-secondary);
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .finance-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .finance-grid,
          .finance-filter-band {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .finance-hero,
          .finance-panel-head {
            align-items: stretch;
            flex-direction: column;
          }

          .finance-stats,
          .finance-flex-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
