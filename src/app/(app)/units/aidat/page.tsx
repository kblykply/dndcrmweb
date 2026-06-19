"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";

type AidatSettings = {
  id: string;
  monthlyAmount: number | string;
  currency: string;
  annualDiscountPercent: number | string;
  updatedAt?: string;
};

type AidatRatePeriod = {
  id: string;
  monthlyAmount: number | string;
  currency: string;
  annualDiscountPercent: number | string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt?: string;
};

const CURRENCIES = ["GBP", "EUR", "USD", "TRY"];

function todayMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatAmount(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function AidatSettingsPage() {
  const { locale } = useLanguage();
  const [settings, setSettings] = useState<AidatSettings | null>(null);
  const [rates, setRates] = useState<AidatRatePeriod[]>([]);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState("10");
  const [rateAmount, setRateAmount] = useState("");
  const [rateCurrency, setRateCurrency] = useState("GBP");
  const [rateDiscount, setRateDiscount] = useState("10");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [generateMonth, setGenerateMonth] = useState(todayMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [me, setMe] = useState<any>(null);

  const canManage = useMemo(
    () => ["ADMIN", "MANAGER", "AFTERSALES"].includes(String(me?.role || "")),
    [me?.role],
  );

  function applyData(data: { settings?: AidatSettings; rates?: AidatRatePeriod[] }) {
    const nextSettings = data.settings || null;
    const nextRates = Array.isArray(data.rates) ? data.rates : [];

    setSettings(nextSettings);
    setRates(nextRates);

    if (nextSettings) {
      setMonthlyAmount(String(nextSettings.monthlyAmount ?? 0));
      setCurrency(nextSettings.currency || "GBP");
      setAnnualDiscountPercent(String(nextSettings.annualDiscountPercent ?? 10));
      setRateAmount(String(nextSettings.monthlyAmount ?? 0));
      setRateCurrency(nextSettings.currency || "GBP");
      setRateDiscount(String(nextSettings.annualDiscountPercent ?? 10));
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = (await authedFetch("/units/aidat/settings")) as {
        settings?: AidatSettings;
        rates?: AidatRatePeriod[];
      };
      applyData(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving("settings");
    setErr(null);
    setNotice("");

    try {
      const data = (await authedFetch("/units/aidat/settings", {
        method: "PATCH",
        body: JSON.stringify({
          monthlyAmount,
          currency,
          annualDiscountPercent,
        }),
      })) as { settings?: AidatSettings; rates?: AidatRatePeriod[] };

      applyData(data);
      setNotice(locale === "tr" ? "Aidat standart ayarları kaydedildi." : "Aidat defaults saved.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving("");
    }
  }

  async function addRatePeriod() {
    if (!effectiveFrom) {
      setErr(locale === "tr" ? "Başlangıç tarihi gerekli." : "Effective from is required.");
      return;
    }

    setSaving("rate");
    setErr(null);
    setNotice("");

    try {
      const data = (await authedFetch("/units/aidat/rates", {
        method: "POST",
        body: JSON.stringify({
          monthlyAmount: rateAmount,
          currency: rateCurrency,
          annualDiscountPercent: rateDiscount,
          effectiveFrom,
          effectiveTo: effectiveTo || null,
        }),
      })) as { settings?: AidatSettings; rates?: AidatRatePeriod[] };

      applyData(data);
      setEffectiveFrom("");
      setEffectiveTo("");
      setNotice(locale === "tr" ? "Dönemsel aidat ücreti eklendi." : "Aidat rate period added.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving("");
    }
  }

  async function generateAidat() {
    const [year, month] = generateMonth.split("-");

    setSaving("generate");
    setErr(null);
    setNotice("");

    try {
      const result = (await authedFetch("/units/aidat/generate", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      })) as { periodKey?: string; created?: number; skipped?: number; amount?: number; currency?: string; reason?: string };

      setNotice(
        result.reason ||
          (locale === "tr"
            ? `${result.periodKey} için ${result.created || 0} aidat oluşturuldu, ${result.skipped || 0} kayıt zaten vardı.`
            : `${result.created || 0} aidat records created for ${result.periodKey}, ${result.skipped || 0} already existed.`),
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving("");
    }
  }

  useEffect(() => {
    setMe(getUser());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="aidat-page">
      <style jsx>{`
        .aidat-page {
          display: grid;
          gap: 18px;
          min-width: 0;
        }

        .aidat-header,
        .aidat-panel {
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .aidat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          padding: 18px;
        }

        .aidat-title {
          display: grid;
          gap: 4px;
        }

        .aidat-title span,
        .aidat-muted {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 800;
        }

        .aidat-title h1 {
          margin: 0;
          font-size: 30px;
          letter-spacing: 0;
        }

        .aidat-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .aidat-link,
        .aidat-button {
          min-height: 42px;
          border-radius: 8px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          text-decoration: none;
          border: 1px solid var(--stroke);
          background: var(--surface-2);
          color: var(--text-primary);
        }

        .aidat-button.primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
        }

        .aidat-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .aidat-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
        }

        .aidat-panel {
          display: grid;
          gap: 14px;
          padding: 16px;
          min-width: 0;
        }

        .aidat-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .aidat-panel h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: 0;
        }

        .aidat-fields {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .aidat-field {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .aidat-field span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .aidat-field input,
        .aidat-field select {
          width: 100%;
          min-width: 0;
        }

        .aidat-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .aidat-card {
          display: grid;
          gap: 6px;
          padding: 12px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .aidat-card span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .aidat-card strong {
          font-size: 22px;
          overflow-wrap: anywhere;
        }

        .aidat-rate-list {
          display: grid;
          gap: 8px;
        }

        .aidat-rate-row {
          display: grid;
          grid-template-columns: minmax(150px, 1fr) minmax(110px, 0.7fr) minmax(110px, 0.7fr);
          gap: 8px;
          align-items: center;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .aidat-rate-row strong,
        .aidat-rate-row span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .aidat-rate-row span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .aidat-notice,
        .aidat-error {
          padding: 12px 14px;
          border-radius: 8px;
          font-weight: 850;
        }

        .aidat-notice {
          border: 1px solid color-mix(in srgb, var(--success) 30%, var(--stroke));
          background: color-mix(in srgb, var(--success) 9%, var(--surface));
          color: var(--success);
        }

        .aidat-error {
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--stroke));
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          color: var(--danger);
        }

        @media (max-width: 900px) {
          .aidat-grid,
          .aidat-fields,
          .aidat-summary,
          .aidat-rate-row {
            grid-template-columns: 1fr;
          }

          .aidat-title h1 {
            font-size: 24px;
          }
        }
      `}</style>

      <header className="aidat-header">
        <div className="aidat-title">
          <span>{locale === "tr" ? "All Units" : "All Units"}</span>
          <h1>{locale === "tr" ? "Aidat ayarları" : "Aidat settings"}</h1>
          <p className="aidat-muted">
            {locale === "tr"
              ? "Aylık zorunlu site gideri, dönemsel ücret ve yıllık indirim burada yönetilir."
              : "Manage the mandatory monthly service fee, date-based rates and annual discount."}
          </p>
        </div>
        <div className="aidat-actions">
          <Link href="/units" className="aidat-link">
            {locale === "tr" ? "Tüm Unitler" : "All Units"}
          </Link>
          <Link href="/units/dashboard" className="aidat-link">
            {locale === "tr" ? "Dashboard" : "Dashboard"}
          </Link>
        </div>
      </header>

      {err ? <div className="aidat-error">{err}</div> : null}
      {notice ? <div className="aidat-notice">{notice}</div> : null}
      {!canManage && !loading ? (
        <div className="aidat-error">
          {locale === "tr" ? "Bu sayfa için yetkiniz yok." : "You do not have access to this page."}
        </div>
      ) : null}

      <section className="aidat-summary">
        <div className="aidat-card">
          <span>{locale === "tr" ? "Standart aylık aidat" : "Default monthly aidat"}</span>
          <strong>
            {settings
              ? `${formatAmount(settings.monthlyAmount, locale)} ${settings.currency}`
              : loading
                ? locale === "tr" ? "Yükleniyor" : "Loading"
                : "-"}
          </strong>
        </div>
        <div className="aidat-card">
          <span>{locale === "tr" ? "Yıllık ödeme indirimi" : "Annual discount"}</span>
          <strong>%{settings ? formatAmount(settings.annualDiscountPercent, locale) : "10"}</strong>
        </div>
        <div className="aidat-card">
          <span>{locale === "tr" ? "Dönemsel ücret kuralı" : "Rate periods"}</span>
          <strong>{rates.length}</strong>
        </div>
      </section>

      <div className="aidat-grid">
        <section className="aidat-panel">
          <div className="aidat-panel-head">
            <div>
              <h2>{locale === "tr" ? "Standart ayar" : "Default settings"}</h2>
              <p className="aidat-muted">
                {locale === "tr"
                  ? "Dönem kuralı yoksa bu tutar kullanılır."
                  : "Used when no date-based rate exists."}
              </p>
            </div>
          </div>
          <div className="aidat-fields">
            <label className="aidat-field">
              <span>{locale === "tr" ? "Aylık tutar" : "Monthly amount"}</span>
              <input
                inputMode="decimal"
                value={monthlyAmount}
                disabled={!canManage || saving === "settings"}
                onChange={(e) => setMonthlyAmount(e.target.value)}
              />
            </label>
            <label className="aidat-field">
              <span>{locale === "tr" ? "Para birimi" : "Currency"}</span>
              <select
                value={currency}
                disabled={!canManage || saving === "settings"}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="aidat-field">
              <span>{locale === "tr" ? "Yıllık indirim %" : "Annual discount %"}</span>
              <input
                inputMode="decimal"
                value={annualDiscountPercent}
                disabled={!canManage || saving === "settings"}
                onChange={(e) => setAnnualDiscountPercent(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="aidat-button primary"
            disabled={!canManage || saving === "settings"}
            onClick={saveSettings}
          >
            {saving === "settings"
              ? locale === "tr" ? "Kaydediliyor..." : "Saving..."
              : locale === "tr" ? "Standart ayarı kaydet" : "Save defaults"}
          </button>
        </section>

        <section className="aidat-panel">
          <div className="aidat-panel-head">
            <div>
              <h2>{locale === "tr" ? "Aidat oluştur" : "Generate aidat"}</h2>
              <p className="aidat-muted">
                {locale === "tr"
                  ? "Seçilen ay için tüm mevcut ev sahiplerine ödenmedi aidatı ekler."
                  : "Creates unpaid aidat for all existing homeowners in the selected month."}
              </p>
            </div>
          </div>
          <div className="aidat-fields">
            <label className="aidat-field">
              <span>{locale === "tr" ? "Ay" : "Month"}</span>
              <input
                type="month"
                value={generateMonth}
                disabled={!canManage || saving === "generate"}
                onChange={(e) => setGenerateMonth(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="aidat-button primary"
            disabled={!canManage || saving === "generate"}
            onClick={generateAidat}
          >
            {saving === "generate"
              ? locale === "tr" ? "Oluşturuluyor..." : "Generating..."
              : locale === "tr" ? "Seçilen ayı oluştur" : "Generate selected month"}
          </button>
        </section>
      </div>

      <section className="aidat-panel">
        <div className="aidat-panel-head">
          <div>
            <h2>{locale === "tr" ? "Dönemsel ücret" : "Date-based rate"}</h2>
            <p className="aidat-muted">
              {locale === "tr"
                ? "Belirli tarihler arasında farklı aylık aidat tutarı kullanılır."
                : "Use a different monthly fee for a specific date interval."}
            </p>
          </div>
        </div>
        <div className="aidat-fields">
          <label className="aidat-field">
            <span>{locale === "tr" ? "Aylık tutar" : "Monthly amount"}</span>
            <input
              inputMode="decimal"
              value={rateAmount}
              disabled={!canManage || saving === "rate"}
              onChange={(e) => setRateAmount(e.target.value)}
            />
          </label>
          <label className="aidat-field">
            <span>{locale === "tr" ? "Para birimi" : "Currency"}</span>
            <select
              value={rateCurrency}
              disabled={!canManage || saving === "rate"}
              onChange={(e) => setRateCurrency(e.target.value)}
            >
              {CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="aidat-field">
            <span>{locale === "tr" ? "Yıllık indirim %" : "Annual discount %"}</span>
            <input
              inputMode="decimal"
              value={rateDiscount}
              disabled={!canManage || saving === "rate"}
              onChange={(e) => setRateDiscount(e.target.value)}
            />
          </label>
          <label className="aidat-field">
            <span>{locale === "tr" ? "Başlangıç" : "Effective from"}</span>
            <input
              type="date"
              value={effectiveFrom}
              disabled={!canManage || saving === "rate"}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </label>
          <label className="aidat-field">
            <span>{locale === "tr" ? "Bitiş" : "Effective to"}</span>
            <input
              type="date"
              value={effectiveTo}
              disabled={!canManage || saving === "rate"}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="aidat-button primary"
          disabled={!canManage || saving === "rate"}
          onClick={addRatePeriod}
        >
          {saving === "rate"
            ? locale === "tr" ? "Ekleniyor..." : "Adding..."
            : locale === "tr" ? "Dönem ekle" : "Add rate period"}
        </button>
      </section>

      <section className="aidat-panel">
        <div className="aidat-panel-head">
          <div>
            <h2>{locale === "tr" ? "Dönem geçmişi" : "Rate history"}</h2>
            <p className="aidat-muted">
              {locale === "tr" ? "En yeni dönemler üstte görünür." : "Newest periods appear first."}
            </p>
          </div>
        </div>
        <div className="aidat-rate-list">
          {rates.map((rate) => (
            <div key={rate.id} className="aidat-rate-row">
              <strong>
                {dateInput(rate.effectiveFrom)} - {dateInput(rate.effectiveTo) || (locale === "tr" ? "Açık" : "Open")}
              </strong>
              <span>
                {formatAmount(rate.monthlyAmount, locale)} {rate.currency}
              </span>
              <span>%{formatAmount(rate.annualDiscountPercent, locale)}</span>
            </div>
          ))}
          {rates.length === 0 ? (
            <div className="aidat-muted">
              {locale === "tr" ? "Henüz dönemsel ücret yok." : "No rate periods yet."}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
