"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Currency = "GBP" | "USD" | "EUR" | "TRY";
type EntryKind = "INCOME" | "EXPENSE";
type EntryStatus = "PLANNED" | "PAID" | "OVERDUE" | "CANCELED";

type DueOption = {
  id: string;
  label: string;
  daysFromOriginal: number;
  dueDate: string;
  isSelected: boolean;
};

type FinanceEntry = {
  id: string;
  title: string;
  kind: EntryKind;
  paymentType: string;
  status: EntryStatus;
  amount: number;
  currency: Currency;
  baseAmount: number;
  originalDueDate: string;
  plannedDueDate: string;
  maxDeferralDueDate?: string;
  project?: string | null;
  customer?: { fullName?: string | null } | null;
  unitSelection?: { project?: string | null; unitNumber?: string | null; customer?: { fullName?: string | null } | null } | null;
  dueOptions: DueOption[];
};

type MoneyRow = { income: number; expense: number; net: number; count?: number };

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
  scenarios: {
    current: { income: number; expense: number; net: number; profitRate: number };
    maxDeferral: { income: number; expense: number; net: number; profitRate: number };
  };
  dueBuckets: {
    overdue: MoneyRow;
    next7: MoneyRow;
    next30: MoneyRow;
    later: MoneyRow;
  };
  byPeriod: Array<{ period: string; income: number; expense: number; net: number; cumulativeNet: number }>;
  byPaymentType: Array<{ paymentType: string; income: number; expense: number; net: number; count: number }>;
  byStatus: Array<{ status: EntryStatus; income: number; expense: number; net: number; count: number }>;
  byCurrency: Array<{ currency: Currency; income: number; expense: number; net: number; count: number }>;
  byProject: Array<{ project: string; income: number; expense: number; net: number; count: number }>;
  entries: FinanceEntry[];
  flexibleEntries: FinanceEntry[];
  upcomingIncome: FinanceEntry[];
  upcomingExpenses: FinanceEntry[];
};

const CURRENCIES: Currency[] = ["GBP", "USD", "EUR", "TRY"];
const STATUSES: EntryStatus[] = ["PLANNED", "PAID", "OVERDUE", "CANCELED"];
const CHART_COLORS = ["#16a34a", "#dc2626", "#0891b2", "#f59e0b", "#8b5cf6", "#0f766e", "#be123c"];

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

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null, locale?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

function paymentTypeLabel(value: string, locale: string) {
  const tr: Record<string, string> = {
    SALE_INSTALLMENT: "Satış taksiti",
    RENTAL_INCOME: "Kira geliri",
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
    RENTAL_INCOME: "Rental income",
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

function statusLabel(value: string, locale: string) {
  const tr: Record<string, string> = {
    PLANNED: "Planlandı",
    PAID: "Ödendi",
    OVERDUE: "Gecikti",
    CANCELED: "İptal",
  };
  const en: Record<string, string> = {
    PLANNED: "Planned",
    PAID: "Paid",
    OVERDUE: "Overdue",
    CANCELED: "Canceled",
  };
  return (locale === "tr" ? tr : en)[value] || value;
}

function projectLabel(value?: string | null) {
  if (value === "LA_JOYA") return "La Joya";
  if (value === "LA_JOYA_PERLA") return "La Joya Perla";
  if (value === "LA_JOYA_PERLA_II") return "La Joya Perla II";
  if (value === "LAGOON_VERDE") return "Lagoon Verde";
  if (value === "UNSELECTED") return "Unselected";
  return value || "-";
}

function entryOwner(entry: FinanceEntry) {
  return entry.customer?.fullName || entry.unitSelection?.customer?.fullName || "-";
}

function entryUnit(entry: FinanceEntry) {
  if (!entry.unitSelection) return projectLabel(entry.project);
  return `${projectLabel(entry.unitSelection.project)} ${entry.unitSelection.unitNumber || ""}`.trim();
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
  const [savingId, setSavingId] = useState("");
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

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
      setDraftAmounts(
        Object.fromEntries((next.entries || []).map((entry) => [entry.id, String(entry.amount)])),
      );
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

  async function patchEntry(entry: FinanceEntry, patch: Record<string, any>) {
    setSavingId(entry.id);
    setErr("");
    setNotice("");
    try {
      await authedFetch(`/finance/entries/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setNotice(locale === "tr" ? "Kayıt güncellendi." : "Entry updated.");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId("");
    }
  }

  async function selectDueOption(entry: FinanceEntry, option: DueOption) {
    setSavingId(entry.id);
    setErr("");
    setNotice("");
    try {
      await authedFetch(`/finance/entries/${entry.id}/select-due-option`, {
        method: "POST",
        body: JSON.stringify({ optionId: option.id }),
      });
      setNotice(locale === "tr" ? "Vade güncellendi." : "Due date updated.");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId("");
    }
  }

  async function saveAmount(entry: FinanceEntry) {
    const draft = draftAmounts[entry.id] || "";
    if (Number(draft) === Number(entry.amount)) return;
    await patchEntry(entry, { amount: draft });
  }

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
  const scenario = data?.scenarios?.maxDeferral || totals;
  const periodRows = data?.byPeriod || [];
  const paymentRows = data?.byPaymentType || [];
  const projectRows = data?.byProject || [];
  const statusRows = data?.byStatus || [];
  const entries = data?.entries || [];
  const scenarioShift = totals.expense - scenario.expense;

  const pieRows = paymentRows.map((row) => ({
    name: paymentTypeLabel(row.paymentType, locale),
    value: Math.abs(row.income) + Math.abs(row.expense),
  }));

  return (
    <main className="finance-dashboard">
      <div className="finance-hero">
        <div>
          <p>{locale === "tr" ? "Finans" : "Finance"}</p>
          <h1>
            {locale === "tr"
              ? "Nakit akışı, vade kontrolü ve kar projeksiyonu"
              : "Cash flow, due-date control and profit projection"}
          </h1>
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

      {err ? <div className="finance-alert danger">{err}</div> : null}
      {notice ? <div className="finance-alert success">{notice}</div> : null}

      <section className="finance-stats">
        <StatCard
          label={locale === "tr" ? "Potansiyel gelir" : "Potential income"}
          value={formatMoney(totals.income, baseCurrency, locale)}
          detail={`${formatMoney(totals.paid, baseCurrency, locale)} ${locale === "tr" ? "ödenen toplam" : "paid total"}`}
          tone="good"
        />
        <StatCard
          label={locale === "tr" ? "Potansiyel gider" : "Potential expense"}
          value={formatMoney(totals.expense, baseCurrency, locale)}
          detail={`${formatMoney(totals.flexibleExpenses, baseCurrency, locale)} ${locale === "tr" ? "vade opsiyonlu" : "with due options"}`}
          tone="bad"
        />
        <StatCard
          label={locale === "tr" ? "Net projeksiyon" : "Net projection"}
          value={formatMoney(totals.net, baseCurrency, locale)}
          detail={`%${formatNumber(totals.profitRate, locale)} ${locale === "tr" ? "kar oranı" : "profit rate"}`}
          tone={totals.net >= 0 ? "good" : "bad"}
        />
        <StatCard
          label={locale === "tr" ? "Vade senaryosu" : "Due option scenario"}
          value={formatMoney(scenario.net, baseCurrency, locale)}
          detail={`${formatMoney(scenarioShift, baseCurrency, locale)} ${locale === "tr" ? "ötelenebilir gider" : "delayable expense"}`}
          tone={scenarioShift > 0 ? "info" : "warning"}
        />
      </section>

      <section className="finance-bucket-grid">
        {[
          ["overdue", locale === "tr" ? "Geciken" : "Overdue"],
          ["next7", locale === "tr" ? "7 gün" : "7 days"],
          ["next30", locale === "tr" ? "30 gün" : "30 days"],
          ["later", locale === "tr" ? "Sonrası" : "Later"],
        ].map(([key, label]) => {
          const row = data?.dueBuckets?.[key as keyof DashboardData["dueBuckets"]];
          return (
            <div key={key} className="finance-bucket">
              <span>{label}</span>
              <strong>{formatMoney((row?.income || 0) - (row?.expense || 0), baseCurrency, locale)}</strong>
              <small>
                {formatMoney(row?.income || 0, baseCurrency, locale)} / {formatMoney(row?.expense || 0, baseCurrency, locale)}
              </small>
            </div>
          );
        })}
      </section>

      <section className="finance-grid wide-left">
        <div className="finance-panel chart">
          <div className="finance-panel-head">
            <h2>{locale === "tr" ? "Dönem nakit akışı" : "Period cash flow"}</h2>
            <span>{locale === "tr" ? "Gelir, gider ve net görünüm" : "Income, expense and net view"}</span>
          </div>
          <div className="finance-chart">
            {periodRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodRows}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                  <XAxis dataKey="period" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="income" name={locale === "tr" ? "Gelir" : "Income"} fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" name={locale === "tr" ? "Gider" : "Expense"} fill="#dc2626" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="net" name="Net" fill="#0891b2" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-empty">{locale === "tr" ? "Veri yok" : "No data"}</div>
            )}
          </div>
        </div>

        <div className="finance-panel">
          <div className="finance-panel-head">
            <h2>{locale === "tr" ? "Ödeme tipi dağılımı" : "Payment type mix"}</h2>
          </div>
          <div className="finance-chart small">
            {pieRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieRows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={2}>
                    {pieRows.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-empty">{locale === "tr" ? "Veri yok" : "No data"}</div>
            )}
          </div>
        </div>
      </section>

      <section className="finance-grid">
        <div className="finance-panel chart">
          <div className="finance-panel-head">
            <h2>{locale === "tr" ? "Kümülatif net projeksiyon" : "Cumulative net projection"}</h2>
          </div>
          <div className="finance-chart mid">
            {periodRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={periodRows}>
                  <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                  <XAxis dataKey="period" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cumulativeNet" name="Net" stroke="#0891b2" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-empty">{locale === "tr" ? "Veri yok" : "No data"}</div>
            )}
          </div>
        </div>

        <div className="finance-panel">
          <div className="finance-panel-head">
            <h2>{locale === "tr" ? "Proje ve durum kırılımı" : "Project and status breakdown"}</h2>
          </div>
          <div className="finance-split-lists">
            <div>
              {projectRows.map((row, index) => (
                <div key={row.project} className="finance-rowline">
                  <span style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <strong>{projectLabel(row.project)}</strong>
                  <em>{formatMoney(row.net, baseCurrency, locale)}</em>
                </div>
              ))}
            </div>
            <div>
              {statusRows.map((row, index) => (
                <div key={row.status} className="finance-rowline">
                  <span style={{ background: CHART_COLORS[(index + 2) % CHART_COLORS.length] }} />
                  <strong>{statusLabel(row.status, locale)}</strong>
                  <em>{row.count}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-head">
          <div>
            <h2>{locale === "tr" ? "Dashboard finans kontrolü" : "Dashboard finance control"}</h2>
            <span>
              {locale === "tr"
                ? "Vade, durum ve tutar değişikliklerini buradan yapabilirsin"
                : "Change due options, status and amount directly here"}
            </span>
          </div>
        </div>

        <div className="finance-control-table">
          <div className="finance-control-head">
            <span>{locale === "tr" ? "Kayıt" : "Entry"}</span>
            <span>{locale === "tr" ? "Tutar" : "Amount"}</span>
            <span>{locale === "tr" ? "Durum" : "Status"}</span>
            <span>{locale === "tr" ? "Vade" : "Due"}</span>
          </div>

          {entries.map((entry) => (
            <article key={entry.id} className={`finance-control-row ${entry.kind.toLowerCase()}`}>
              <div className="finance-entry-title">
                <strong>{entry.title}</strong>
                <span>
                  {paymentTypeLabel(entry.paymentType, locale)} / {entryOwner(entry)} / {entryUnit(entry)}
                </span>
              </div>

              <label className="finance-amount-edit">
                <input
                  inputMode="decimal"
                  value={draftAmounts[entry.id] ?? String(entry.amount)}
                  disabled={savingId === entry.id}
                  onChange={(event) =>
                    setDraftAmounts((prev) => ({
                      ...prev,
                      [entry.id]: event.target.value,
                    }))
                  }
                  onBlur={() => saveAmount(entry)}
                />
                <span>{entry.currency} / {formatMoney(entry.baseAmount, baseCurrency, locale)}</span>
              </label>

              <select
                value={entry.status}
                disabled={savingId === entry.id}
                onChange={(event) =>
                  patchEntry(entry, {
                    status: event.target.value,
                    paidAt: event.target.value === "PAID" ? new Date().toISOString() : null,
                  })
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status, locale)}
                  </option>
                ))}
              </select>

              <div className="finance-due-control">
                <span>
                  {formatDate(entry.originalDueDate, locale)} → {formatDate(entry.plannedDueDate, locale)}
                </span>
                <div>
                  {entry.dueOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={option.isSelected ? "active" : ""}
                      disabled={savingId === entry.id}
                      onClick={() => selectDueOption(entry, option)}
                    >
                      {option.daysFromOriginal === 0 ? "Normal" : `+${option.daysFromOriginal}`}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}

          {!loading && entries.length === 0 ? (
            <div className="finance-empty">{locale === "tr" ? "Kayıt yok" : "No entries"}</div>
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
          max-width: 840px;
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
        .finance-bucket,
        .finance-panel,
        .finance-control-row {
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
        .finance-stat span,
        .finance-stat small,
        .finance-bucket span,
        .finance-bucket small,
        .finance-entry-title span,
        .finance-amount-edit span,
        .finance-due-control > span {
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

        button:disabled,
        select:disabled,
        input:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .finance-alert {
          padding: 12px 14px;
          border-radius: 8px;
          font-weight: 800;
        }

        .finance-alert.danger {
          border: 1px solid color-mix(in srgb, var(--danger) 32%, var(--stroke));
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
        }

        .finance-alert.success {
          border: 1px solid color-mix(in srgb, var(--success) 32%, var(--stroke));
          color: var(--success);
          background: color-mix(in srgb, var(--success) 8%, var(--surface));
        }

        .finance-stats,
        .finance-bucket-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .finance-stat,
        .finance-bucket {
          display: grid;
          gap: 8px;
          padding: 16px;
        }

        .finance-stat strong {
          font-size: 26px;
        }

        .finance-bucket strong {
          font-size: 20px;
        }

        .finance-stat.good {
          border-color: color-mix(in srgb, var(--success) 26%, var(--stroke));
        }

        .finance-stat.bad {
          border-color: color-mix(in srgb, var(--danger) 26%, var(--stroke));
        }

        .finance-stat.info {
          border-color: color-mix(in srgb, var(--info) 28%, var(--stroke));
        }

        .finance-stat.warning {
          border-color: color-mix(in srgb, var(--warning) 30%, var(--stroke));
        }

        .finance-grid {
          display: grid;
          grid-template-columns: minmax(380px, 1fr) minmax(320px, 0.9fr);
          gap: 16px;
        }

        .finance-grid.wide-left {
          grid-template-columns: minmax(520px, 1.4fr) minmax(300px, 0.6fr);
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

        .finance-panel-head > div {
          display: grid;
          gap: 4px;
        }

        .finance-panel h2 {
          margin: 0;
          font-size: 20px;
        }

        .finance-chart {
          height: 330px;
          min-width: 0;
        }

        .finance-chart.mid {
          height: 270px;
        }

        .finance-chart.small {
          height: 280px;
        }

        .finance-split-lists {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .finance-rowline {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-height: 42px;
          border-bottom: 1px solid var(--stroke);
        }

        .finance-rowline span {
          width: 10px;
          height: 28px;
          border-radius: 999px;
        }

        .finance-rowline em {
          font-style: normal;
          color: var(--text-secondary);
          font-weight: 900;
        }

        .finance-control-table {
          display: grid;
          gap: 10px;
        }

        .finance-control-head,
        .finance-control-row {
          display: grid;
          grid-template-columns: minmax(220px, 1.25fr) minmax(150px, 0.6fr) minmax(130px, 0.55fr) minmax(260px, 1fr);
          gap: 10px;
          align-items: center;
        }

        .finance-control-head {
          padding: 0 10px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .finance-control-row {
          padding: 12px;
        }

        .finance-control-row.income {
          border-color: color-mix(in srgb, var(--success) 18%, var(--stroke));
        }

        .finance-control-row.expense {
          border-color: color-mix(in srgb, var(--danger) 18%, var(--stroke));
        }

        .finance-entry-title,
        .finance-amount-edit,
        .finance-due-control {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .finance-entry-title strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .finance-due-control > div {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .finance-due-control button {
          min-height: 34px;
          padding: 0 10px;
          color: var(--text-primary);
          background: var(--surface-2);
        }

        .finance-due-control button.active {
          border-color: var(--info);
          background: color-mix(in srgb, var(--info) 10%, var(--surface));
          color: var(--info);
        }

        .finance-empty {
          display: grid;
          place-items: center;
          min-height: 120px;
          color: var(--text-secondary);
          font-weight: 800;
        }

        @media (max-width: 1200px) {
          .finance-grid,
          .finance-grid.wide-left,
          .finance-filter-band {
            grid-template-columns: 1fr;
          }

          .finance-stats,
          .finance-bucket-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .finance-hero,
          .finance-panel-head {
            align-items: stretch;
            flex-direction: column;
          }

          .finance-stats,
          .finance-bucket-grid,
          .finance-split-lists,
          .finance-control-head,
          .finance-control-row {
            grid-template-columns: 1fr;
          }

          .finance-control-head {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
