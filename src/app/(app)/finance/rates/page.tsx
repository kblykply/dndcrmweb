"use client";

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
      load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (!checked) return null;

  return (
    <main className="rates-page">
      <div className="rates-head">
        <div>
          <p>{locale === "tr" ? "Finans" : "Finance"}</p>
          <h1>{locale === "tr" ? "Manuel kurlar" : "Manual exchange rates"}</h1>
        </div>
      </div>

      {err ? <div className="rates-alert">{err}</div> : null}

      <section className="rates-grid">
        <div className="rates-panel">
          <h2>{locale === "tr" ? "Kur ekle" : "Add rate"}</h2>
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
          <h2>{locale === "tr" ? "Kur geçmişi" : "Rate history"}</h2>
          {loading ? <div className="rates-empty">{locale === "tr" ? "Yükleniyor..." : "Loading..."}</div> : null}
          {!loading && items.length === 0 ? <div className="rates-empty">{locale === "tr" ? "Kayıt yok" : "No rates"}</div> : null}
          <div className="rates-list">
            {items.map((item) => (
              <article key={item.id} className="rates-row">
                <div>
                  <strong>{item.currency} / {item.baseCurrency}</strong>
                  <span>{formatDate(item.effectiveDate, locale)} {item.createdBy?.name ? `- ${item.createdBy.name}` : ""}</span>
                </div>
                <strong>{item.rateToBase}</strong>
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
        }

        .rates-head p {
          margin: 0 0 6px;
          color: var(--text-secondary);
          font-weight: 800;
        }

        .rates-head h1 {
          margin: 0;
          font-size: 34px;
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

        .rates-primary {
          background: var(--text-primary);
          color: var(--surface);
        }

        .rates-alert {
          padding: 12px;
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
          border-radius: 8px;
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          font-weight: 800;
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
          .rates-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
