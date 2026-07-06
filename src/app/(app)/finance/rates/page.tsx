"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Currency = "GBP" | "USD" | "EUR" | "TRY";

type RateRow = {
  id: string;
  currency: Currency;
  baseCurrency: Currency;
  rateToBase: number;
  effectiveDate: string;
  note?: string | null;
  createdBy?: { name?: string | null } | null;
};

const CURRENCIES: Currency[] = ["GBP", "USD", "EUR", "TRY"];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

function formatRate(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(Number(value || 0));
}

export default function FinanceRatesPage() {
  const { locale } = useLanguage();
  const [checked, setChecked] = useState(false);
  const [items, setItems] = useState<RateRow[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [baseCurrency, setBaseCurrency] = useState<Currency>("GBP");
  const [rateToBase, setRateToBase] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const user = getUser();
    if (
      user?.role !== "ADMIN" &&
      user?.role !== "ACCOUNTING" &&
      user?.role !== "PREVIEW"
    ) {
      window.location.replace("/leads");
      return;
    }
    setChecked(true);
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = (await authedFetch("/finance/exchange-rates")) as RateRow[];
      setItems(data || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checked) load();
  }, [checked]);

  async function save() {
    setSaving(true);
    setErr("");
    setNotice("");
    try {
      await authedFetch("/finance/exchange-rates", {
        method: "POST",
        body: JSON.stringify({
          currency,
          baseCurrency,
          rateToBase,
          effectiveDate,
          note: note || null,
        }),
      });
      setRateToBase("");
      setNote("");
      setNotice(locale === "tr" ? "Kur kaydedildi." : "Rate saved.");
      load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (!checked) return null;

  const latestRows = CURRENCIES.filter((item) => item !== baseCurrency).map((item) => ({
    currency: item,
    rate: items.find((row) => row.currency === item && row.baseCurrency === baseCurrency),
  }));

  return (
    <main className="rates-page">
      <div className="rates-head">
        <div>
          <p>{locale === "tr" ? "Finans merkezi" : "Finance center"}</p>
          <h1>{locale === "tr" ? "Manuel kurlar" : "Manual exchange rates"}</h1>
        </div>
      </div>

      <nav className="rates-tabs" aria-label="Finance sections">
        <Link href="/finance">{locale === "tr" ? "Dashboard" : "Dashboard"}</Link>
        <Link href="/finance/incomes">{locale === "tr" ? "Gelirler" : "Incomes"}</Link>
        <Link href="/finance/expenses">{locale === "tr" ? "Giderler" : "Expenses"}</Link>
        <Link className="active" href="/finance/rates">{locale === "tr" ? "Kurlar" : "Rates"}</Link>
      </nav>

      {err ? <div className="rates-alert">{err}</div> : null}
      {notice ? <div className="rates-alert success">{notice}</div> : null}

      <section className="rates-strip">
        {latestRows.map((row) => (
          <div key={row.currency} className="rates-card">
            <span>{row.currency} / {baseCurrency}</span>
            <strong>{row.rate ? formatRate(row.rate.rateToBase) : "-"}</strong>
            <small>
              {row.rate
                ? `${formatDate(row.rate.effectiveDate, locale)}${row.rate.createdBy?.name ? ` / ${row.rate.createdBy.name}` : ""}`
                : locale === "tr" ? "Kur yok" : "No rate"}
            </small>
          </div>
        ))}
      </section>

      <section className="rates-grid">
        <div className="rates-panel">
          <div className="rates-panel-head">
            <div>
              <h2>{locale === "tr" ? "Kur ekle" : "Add rate"}</h2>
              <span>{locale === "tr" ? "Seçilen baz para dashboard hesaplamalarında kullanılır" : "Selected base currency is used in dashboard calculations"}</span>
            </div>
          </div>
          <div className="rates-form">
            <label>
              <span>{locale === "tr" ? "Para birimi" : "Currency"}</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Baz para birimi" : "Base currency"}</span>
              <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value as Currency)}>
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Kur" : "Rate"}</span>
              <input inputMode="decimal" value={rateToBase} onChange={(e) => setRateToBase(e.target.value)} />
            </label>
            <label>
              <span>{locale === "tr" ? "Tarih" : "Date"}</span>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </label>
            <label className="wide">
              <span>{locale === "tr" ? "Not" : "Note"}</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          <button type="button" className="rates-primary" disabled={saving} onClick={save}>
            {saving ? (locale === "tr" ? "Kaydediliyor..." : "Saving...") : locale === "tr" ? "Kaydet" : "Save"}
          </button>
        </div>

        <div className="rates-panel">
          <div className="rates-panel-head">
            <div>
              <h2>{locale === "tr" ? "Kur geçmişi" : "Rate history"}</h2>
              <span>{items.length} {locale === "tr" ? "kayıt" : "records"}</span>
            </div>
          </div>
          {loading ? <div className="rates-empty">{locale === "tr" ? "Yükleniyor..." : "Loading..."}</div> : null}
          {!loading && items.length === 0 ? <div className="rates-empty">{locale === "tr" ? "Kayıt yok" : "No rates"}</div> : null}
          <div className="rates-list">
            {items.map((item) => (
              <article key={item.id} className="rates-row">
                <div>
                  <strong>{item.currency} / {item.baseCurrency}</strong>
                  <span>{formatDate(item.effectiveDate, locale)} {item.createdBy?.name ? `- ${item.createdBy.name}` : ""}</span>
                </div>
                <strong>{formatRate(item.rateToBase)}</strong>
                {item.note ? <span>{item.note}</span> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .rates-page {
          display: grid;
          gap: 18px;
          color: var(--text-primary);
        }

        .rates-head p {
          margin: 0 0 6px;
          color: var(--info);
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
        }

        .rates-head h1 {
          margin: 0;
          font-size: 34px;
        }

        .rates-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          width: fit-content;
          padding: 4px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .rates-tabs a {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }

        .rates-tabs a.active,
        .rates-tabs a:hover {
          border-color: var(--stroke);
          background: var(--surface-2);
        }

        .rates-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .rates-card {
          display: grid;
          gap: 6px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          padding: 14px;
          position: relative;
          overflow: hidden;
        }

        .rates-card::before,
        .rates-row::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: var(--info);
        }

        .rates-card strong {
          font-size: 24px;
          line-height: 1.05;
        }

        .rates-card span,
        .rates-card small {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .rates-grid {
          display: grid;
          grid-template-columns: minmax(320px, 0.8fr) minmax(420px, 1.2fr);
          gap: 16px;
          align-items: start;
        }

        .rates-panel,
        .rates-row {
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .rates-panel {
          display: grid;
          gap: 14px;
          padding: 16px;
          align-content: start;
        }

        .rates-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .rates-panel-head > div {
          display: grid;
          gap: 4px;
        }

        .rates-panel h2 {
          margin: 0;
        }

        .rates-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        label {
          display: grid;
          gap: 6px;
        }

        label.wide {
          grid-column: 1 / -1;
        }

        label span,
        .rates-panel-head span,
        .rates-row span {
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

        input:focus,
        select:focus,
        button:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--info) 36%, transparent);
          outline-offset: 1px;
        }

        button {
          cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .rates-primary {
          background: var(--text-primary);
          color: var(--surface);
          min-height: 46px;
          font-weight: 900;
        }

        .rates-alert {
          padding: 12px;
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
          border-radius: 8px;
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          font-weight: 800;
        }

        .rates-alert.success {
          border-color: color-mix(in srgb, var(--success) 30%, var(--stroke));
          color: var(--success);
          background: color-mix(in srgb, var(--success) 8%, var(--surface));
        }

        .rates-list {
          display: grid;
          gap: 10px;
        }

        .rates-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          padding: 12px;
          align-items: center;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(90deg, color-mix(in srgb, var(--surface-2) 62%, transparent), transparent 48%),
            var(--surface);
        }

        .rates-row > div {
          display: grid;
          gap: 4px;
        }

        .rates-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .rates-grid,
          .rates-form,
          .rates-strip {
            grid-template-columns: 1fr;
          }

          .rates-tabs,
          .rates-tabs a {
            width: 100%;
          }

          .rates-tabs a {
            justify-content: center;
            flex: 1 1 auto;
          }
        }
      `}</style>
    </main>
  );
}
