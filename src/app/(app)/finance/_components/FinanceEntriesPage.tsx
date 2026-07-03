"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type EntryKind = "INCOME" | "EXPENSE";
type Currency = "GBP" | "USD" | "EUR" | "TRY";
type Status = "PLANNED" | "PAID" | "OVERDUE" | "CANCELED";
type PaymentType =
  | "SALE_INSTALLMENT"
  | "RENTAL_INCOME"
  | "CREDIT_INSTALLMENT"
  | "CHECK_PAYMENT"
  | "REALTOR_COMMISSION"
  | "SUBCONTRACTOR"
  | "INVOICE"
  | "OTHER"
  | "TAX"
  | "SALARY";
type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type DueOption = {
  id: string;
  label: string;
  daysFromOriginal: number;
  dueDate: string;
  isSelected: boolean;
};

type FinanceEntry = {
  id: string;
  kind: EntryKind;
  paymentType: PaymentType;
  status: Status;
  title: string;
  description?: string | null;
  vendorName?: string | null;
  contractReference?: string | null;
  amount: number;
  currency: Currency;
  exchangeRateToBase?: number | null;
  originalDueDate: string;
  plannedDueDate: string;
  selectedDeferralDays?: number | null;
  project?: ProjectType | null;
  customer?: { id: string; fullName: string; email?: string | null; phone?: string | null } | null;
  unitSelection?: {
    id: string;
    project: ProjectType;
    unitNumber: string;
    customer?: { fullName: string } | null;
  } | null;
  dueOptions: DueOption[];
  splits: Array<{
    method: string;
    ratio: number;
    amount?: number | null;
    unitSelectionId?: string | null;
    note?: string | null;
  }>;
};

type LookupCustomer = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
};

type LookupUnit = {
  id: string;
  project: ProjectType;
  unitNumber: string;
  customer?: { id: string; fullName: string; email?: string | null; phone?: string | null } | null;
};

const CURRENCIES: Currency[] = ["GBP", "USD", "EUR", "TRY"];
const STATUSES: Status[] = ["PLANNED", "PAID", "OVERDUE", "CANCELED"];
const PROJECTS: ProjectType[] = [
  "LA_JOYA",
  "LA_JOYA_PERLA",
  "LA_JOYA_PERLA_II",
  "LAGOON_VERDE",
];
const INCOME_TYPES: PaymentType[] = ["SALE_INSTALLMENT", "RENTAL_INCOME", "OTHER"];
const EXPENSE_TYPES: PaymentType[] = [
  "SUBCONTRACTOR",
  "CHECK_PAYMENT",
  "CREDIT_INSTALLMENT",
  "REALTOR_COMMISSION",
  "INVOICE",
  "TAX",
  "SALARY",
  "OTHER",
];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysInput(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatMoney(value: number, currency: Currency, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null, locale?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

function inputDate(value?: string | null) {
  if (!value) return todayInput();
  return new Date(value).toISOString().slice(0, 10);
}

function paymentTypeLabel(value: string, locale: string) {
  const tr: Record<string, string> = {
    SALE_INSTALLMENT: "Satış taksiti",
    RENTAL_INCOME: "Kira geliri",
    CREDIT_INSTALLMENT: "Kredi taksiti",
    CHECK_PAYMENT: "Çek ödemesi",
    REALTOR_COMMISSION: "Emlakçı komisyonu",
    SUBCONTRACTOR: "Taşeron ödemesi",
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
  return "-";
}

function parseOptionDays(value: string) {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0)
    .map((item) => Math.round(item));
}

export default function FinanceEntriesPage({ kind }: { kind: EntryKind }) {
  const { locale } = useLanguage();
  const isIncome = kind === "INCOME";
  const [checked, setChecked] = useState(false);
  const [items, setItems] = useState<FinanceEntry[]>([]);
  const [customers, setCustomers] = useState<LookupCustomer[]>([]);
  const [units, setUnits] = useState<LookupUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingEntryId, setEditingEntryId] = useState("");

  const [title, setTitle] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>(
    isIncome ? "SALE_INSTALLMENT" : "SUBCONTRACTOR",
  );
  const [status, setStatus] = useState<Status>("PLANNED");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [exchangeRateToBase, setExchangeRateToBase] = useState("");
  const [originalDueDate, setOriginalDueDate] = useState(todayInput());
  const [selectedDeferralDays, setSelectedDeferralDays] = useState("0");
  const [optionDays, setOptionDays] = useState("0,30,60,90");
  const [customerId, setCustomerId] = useState("");
  const [unitSelectionId, setUnitSelectionId] = useState("");
  const [project, setProject] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [contractReference, setContractReference] = useState("");
  const [description, setDescription] = useState("");
  const [cashRatio, setCashRatio] = useState("60");
  const [checkRatio, setCheckRatio] = useState("30");
  const [barterRatio, setBarterRatio] = useState("10");
  const [barterUnitSelectionId, setBarterUnitSelectionId] = useState("");

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
      const params = new URLSearchParams({ kind });
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      const [entryData, customerData, unitData] = await Promise.all([
        authedFetch(`/finance/entries?${params.toString()}`),
        authedFetch("/finance/lookups/customers"),
        authedFetch("/finance/lookups/units"),
      ]);
      setItems((entryData as any).items || []);
      setCustomers((customerData as LookupCustomer[]) || []);
      setUnits((unitData as LookupUnit[]) || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, kind, statusFilter]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items],
  );
  const statusSummary = useMemo(
    () =>
      STATUSES.map((item) => ({
        status: item,
        count: items.filter((entry) => entry.status === item).length,
        total: items
          .filter((entry) => entry.status === item)
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      })),
    [items],
  );

  function resetForm() {
    setEditingEntryId("");
    setTitle("");
    setPaymentType(isIncome ? "SALE_INSTALLMENT" : "SUBCONTRACTOR");
    setStatus("PLANNED");
    setAmount("");
    setCurrency("GBP");
    setExchangeRateToBase("");
    setOriginalDueDate(todayInput());
    setSelectedDeferralDays("0");
    setOptionDays("0,30,60,90");
    setCustomerId("");
    setUnitSelectionId("");
    setProject("");
    setVendorName("");
    setContractReference("");
    setDescription("");
    setCashRatio("60");
    setCheckRatio("30");
    setBarterRatio("10");
    setBarterUnitSelectionId("");
  }

  function fillForm(item: FinanceEntry) {
    const selectedOption = item.dueOptions.find((option) => option.isSelected);
    const cash = item.splits.find((split) => split.method === "CASH");
    const check = item.splits.find((split) => split.method === "CHECK");
    const barter = item.splits.find((split) => split.method === "BARTER");

    setEditingEntryId(item.id);
    setTitle(item.title || "");
    setPaymentType(item.paymentType);
    setStatus(item.status || "PLANNED");
    setAmount(String(item.amount ?? ""));
    setCurrency(item.currency || "GBP");
    setExchangeRateToBase(
      item.exchangeRateToBase === null || item.exchangeRateToBase === undefined
        ? ""
        : String(item.exchangeRateToBase),
    );
    setOriginalDueDate(inputDate(item.originalDueDate));
    setSelectedDeferralDays(
      String(selectedOption?.daysFromOriginal ?? item.selectedDeferralDays ?? 0),
    );
    setOptionDays(
      item.dueOptions.length > 0
        ? item.dueOptions.map((option) => option.daysFromOriginal).join(",")
        : "0,30,60,90",
    );
    setCustomerId(item.customer?.id || "");
    setUnitSelectionId(item.unitSelection?.id || "");
    setProject(item.project || item.unitSelection?.project || "");
    setVendorName(item.vendorName || "");
    setContractReference(item.contractReference || "");
    setDescription(item.description || "");
    setCashRatio(String(cash?.ratio ?? 60));
    setCheckRatio(String(check?.ratio ?? 30));
    setBarterRatio(String(barter?.ratio ?? 10));
    setBarterUnitSelectionId(barter?.unitSelectionId || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEntry() {
    setSaving(true);
    setErr("");
    setNotice("");

    const dueOptions = parseOptionDays(optionDays).map((days) => ({
      daysFromOriginal: days,
      label: days === 0 ? "Original due date" : `${days} days`,
    }));
    const splits =
      !isIncome && paymentType === "SUBCONTRACTOR"
        ? [
            { method: "CASH", ratio: cashRatio },
            { method: "CHECK", ratio: checkRatio },
            {
              method: "BARTER",
              ratio: barterRatio,
              unitSelectionId: barterUnitSelectionId || null,
            },
          ]
        : [];

    try {
      await authedFetch(
        editingEntryId ? `/finance/entries/${editingEntryId}` : "/finance/entries",
        {
        method: editingEntryId ? "PATCH" : "POST",
        body: JSON.stringify({
          kind,
          title,
          paymentType,
          status,
          amount,
          currency,
          exchangeRateToBase: exchangeRateToBase || null,
          originalDueDate,
          selectedDeferralDays,
          dueOptions,
          customerId: customerId || null,
          unitSelectionId: unitSelectionId || null,
          project: project || null,
          vendorName: vendorName || null,
          contractReference: contractReference || null,
          description: description || null,
          splits,
        }),
      },
      );
      setNotice(
        editingEntryId
          ? locale === "tr" ? "Kayıt güncellendi." : "Entry updated."
          : locale === "tr" ? "Kayıt oluşturuldu." : "Entry created.",
      );
      resetForm();
      load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(item: FinanceEntry) {
    const ok = window.confirm(
      locale === "tr"
        ? `"${item.title}" kaydını silmek istiyor musun?`
        : `Delete "${item.title}"?`,
    );
    if (!ok) return;

    setErr("");
    setNotice("");
    try {
      await authedFetch(`/finance/entries/${item.id}`, { method: "DELETE" });
      if (editingEntryId === item.id) resetForm();
      setNotice(locale === "tr" ? "Kayıt silindi." : "Entry deleted.");
      load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function selectDueOption(entryId: string, option: DueOption) {
    setErr("");
    try {
      await authedFetch(`/finance/entries/${entryId}/select-due-option`, {
        method: "POST",
        body: JSON.stringify({ optionId: option.id }),
      });
      load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  if (!checked) return null;

  return (
    <main className="finance-page">
      <div className="finance-head">
        <div>
          <p>{locale === "tr" ? "Finans merkezi" : "Finance center"}</p>
          <h1>{isIncome ? (locale === "tr" ? "Gelirler" : "Incomes") : locale === "tr" ? "Giderler" : "Expenses"}</h1>
        </div>
        <div className="finance-head-metrics">
          <div className={`finance-total ${isIncome ? "income" : "expense"}`}>
            <span>{locale === "tr" ? "Listelenen toplam" : "Listed total"}</span>
            <strong>{formatMoney(total, currency, locale)}</strong>
          </div>
          <div className="finance-total">
            <span>{locale === "tr" ? "Kayıt sayısı" : "Entry count"}</span>
            <strong>{items.length}</strong>
          </div>
        </div>
      </div>

      <nav className="finance-tabs" aria-label="Finance sections">
        <Link href="/finance">{locale === "tr" ? "Dashboard" : "Dashboard"}</Link>
        <Link className={isIncome ? "active" : ""} href="/finance/incomes">{locale === "tr" ? "Gelirler" : "Incomes"}</Link>
        <Link className={!isIncome ? "active" : ""} href="/finance/expenses">{locale === "tr" ? "Giderler" : "Expenses"}</Link>
        <Link href="/finance/rates">{locale === "tr" ? "Kurlar" : "Rates"}</Link>
      </nav>

      <section className="finance-status-strip">
        {statusSummary.map((item) => (
          <div key={item.status} className={`finance-status-card ${item.status.toLowerCase()}`}>
            <span>{statusLabel(item.status, locale)}</span>
            <strong>{formatMoney(item.total, currency, locale)}</strong>
            <small>{item.count} {locale === "tr" ? "kayıt" : "entries"}</small>
          </div>
        ))}
      </section>

      {err ? <div className="finance-alert danger">{err}</div> : null}
      {notice ? <div className="finance-alert success">{notice}</div> : null}

      <section className="finance-shell">
        <div className="finance-panel form">
          <div className="finance-panel-head">
            <div>
              <h2>
                {editingEntryId
                  ? locale === "tr" ? "Kaydı düzenle" : "Edit entry"
                  : locale === "tr" ? "Yeni kayıt" : "New entry"}
              </h2>
              <span>
                {isIncome
                  ? locale === "tr" ? "Gelir, müşteri ve vade detayları" : "Income, customer and due details"
                  : locale === "tr" ? "Gider, firma ve vade detayları" : "Expense, vendor and due details"}
              </span>
            </div>
            <button type="button" onClick={resetForm}>
              {locale === "tr" ? "Temizle" : "Reset"}
            </button>
          </div>

          <div className="finance-form-grid">
            <label>
              <span>{locale === "tr" ? "Başlık" : "Title"}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              <span>{locale === "tr" ? "Ödeme tipi" : "Payment type"}</span>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                {(isIncome ? INCOME_TYPES : EXPENSE_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {paymentTypeLabel(type, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Tutar" : "Amount"}</span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label>
              <span>{locale === "tr" ? "Para birimi" : "Currency"}</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Manuel kur" : "Manual rate"}</span>
              <input
                inputMode="decimal"
                placeholder={currency === "GBP" ? "1" : "GBP bazında"}
                value={exchangeRateToBase}
                onChange={(e) => setExchangeRateToBase(e.target.value)}
              />
            </label>
            <label>
              <span>{locale === "tr" ? "Durum" : "Status"}</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {STATUSES.map((item) => (
                  <option key={item} value={item}>{statusLabel(item, locale)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Sözleşme ödeme tarihi" : "Contract due date"}</span>
              <input type="date" value={originalDueDate} onChange={(e) => setOriginalDueDate(e.target.value)} />
            </label>
            <label>
              <span>{locale === "tr" ? "Aktif vade günü" : "Active deferral days"}</span>
              <input inputMode="numeric" value={selectedDeferralDays} onChange={(e) => setSelectedDeferralDays(e.target.value)} />
            </label>
            <label>
              <span>{locale === "tr" ? "Vade opsiyonları" : "Due options"}</span>
              <input value={optionDays} onChange={(e) => setOptionDays(e.target.value)} placeholder="0,30,60,90" />
            </label>
            <label>
              <span>{locale === "tr" ? "Proje" : "Project"}</span>
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="">{locale === "tr" ? "Seçilmedi" : "Not selected"}</option>
                {PROJECTS.map((item) => (
                  <option key={item} value={item}>{projectLabel(item)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Müşteri" : "Customer"}</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{locale === "tr" ? "Seçilmedi" : "Not selected"}</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>{item.fullName}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Unit</span>
              <select value={unitSelectionId} onChange={(e) => setUnitSelectionId(e.target.value)}>
                <option value="">{locale === "tr" ? "Seçilmedi" : "Not selected"}</option>
                {units.map((item) => (
                  <option key={item.id} value={item.id}>
                    {projectLabel(item.project)} {item.unitNumber} - {item.customer?.fullName || "-"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{locale === "tr" ? "Firma / kişi" : "Vendor / person"}</span>
              <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            </label>
            <label>
              <span>{locale === "tr" ? "Sözleşme no" : "Contract ref"}</span>
              <input value={contractReference} onChange={(e) => setContractReference(e.target.value)} />
            </label>
            <label className="wide">
              <span>{locale === "tr" ? "Not" : "Note"}</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          {!isIncome && paymentType === "SUBCONTRACTOR" ? (
            <div className="finance-split-box">
              <div>
                <strong>{locale === "tr" ? "Taşeron ödeme kırılımı" : "Subcontractor settlement"}</strong>
                <span>{locale === "tr" ? "Nakit, çek ve barter oranlarını gir." : "Enter cash, check and barter ratios."}</span>
              </div>
              <label>
                <span>{locale === "tr" ? "Nakit %" : "Cash %"}</span>
                <input inputMode="decimal" value={cashRatio} onChange={(e) => setCashRatio(e.target.value)} />
              </label>
              <label>
                <span>{locale === "tr" ? "Çek %" : "Check %"}</span>
                <input inputMode="decimal" value={checkRatio} onChange={(e) => setCheckRatio(e.target.value)} />
              </label>
              <label>
                <span>Barter %</span>
                <input inputMode="decimal" value={barterRatio} onChange={(e) => setBarterRatio(e.target.value)} />
              </label>
              <label>
                <span>{locale === "tr" ? "Barter unit opsiyonel" : "Optional barter unit"}</span>
                <select value={barterUnitSelectionId} onChange={(e) => setBarterUnitSelectionId(e.target.value)}>
                  <option value="">{locale === "tr" ? "Seçilmedi" : "Not selected"}</option>
                  {units.map((item) => (
                    <option key={item.id} value={item.id}>
                      {projectLabel(item.project)} {item.unitNumber}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <button className="finance-primary" type="button" disabled={saving} onClick={saveEntry}>
            {saving
              ? locale === "tr" ? "Kaydediliyor..." : "Saving..."
              : editingEntryId
                ? locale === "tr" ? "Güncelle" : "Update"
                : locale === "tr" ? "Kaydet" : "Save"}
          </button>
        </div>

        <div className="finance-panel list">
          <div className="finance-panel-head">
            <div>
              <h2>{locale === "tr" ? "Kayıtlar" : "Entries"}</h2>
              <span>
                {locale === "tr"
                  ? "Filtrele, düzenle veya vade opsiyonunu değiştir"
                  : "Filter, edit or change due options"}
              </span>
            </div>
            <div className="finance-filters">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "tr" ? "Ara" : "Search"} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{locale === "tr" ? "Tüm durumlar" : "All statuses"}</option>
                {STATUSES.map((item) => (
                  <option key={item} value={item}>{statusLabel(item, locale)}</option>
                ))}
              </select>
              <button type="button" onClick={load}>{locale === "tr" ? "Yenile" : "Refresh"}</button>
            </div>
          </div>

          {loading ? <div className="finance-empty">{locale === "tr" ? "Yükleniyor..." : "Loading..."}</div> : null}
          {!loading && items.length === 0 ? <div className="finance-empty">{locale === "tr" ? "Kayıt yok" : "No entries"}</div> : null}

          <div className="finance-entry-list">
            {items.map((item) => (
              <article key={item.id} className={`finance-entry ${item.status.toLowerCase()}`}>
                <div className="finance-entry-main">
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {paymentTypeLabel(item.paymentType, locale)}
                      <i className={`finance-status-badge ${item.status.toLowerCase()}`}>
                        {statusLabel(item.status, locale)}
                      </i>
                    </span>
                  </div>
                  <div className="finance-entry-side">
                    <strong className={isIncome ? "income" : "expense"}>{formatMoney(item.amount, item.currency, locale)}</strong>
                    <div className="finance-entry-actions">
                      <button type="button" onClick={() => fillForm(item)}>
                        {locale === "tr" ? "Düzenle" : "Edit"}
                      </button>
                      <button type="button" className="danger" onClick={() => deleteEntry(item)}>
                        {locale === "tr" ? "Sil" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="finance-entry-meta">
                  <span>{locale === "tr" ? "Sözleşme" : "Contract"}: {formatDate(item.originalDueDate, locale)}</span>
                  <span>{locale === "tr" ? "Aktif ödeme" : "Active due"}: {formatDate(item.plannedDueDate, locale)}</span>
                  <span>{item.customer?.fullName || item.vendorName || "-"}</span>
                  <span>{item.unitSelection ? `${projectLabel(item.unitSelection.project)} ${item.unitSelection.unitNumber}` : "-"}</span>
                </div>
                {item.dueOptions.length > 0 ? (
                  <div className="finance-due-options">
                    {item.dueOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={option.isSelected ? "active" : ""}
                        onClick={() => selectDueOption(item.id, option)}
                      >
                        {option.daysFromOriginal === 0 ? "Normal" : `+${option.daysFromOriginal}`}
                        <span>{formatDate(option.dueDate, locale)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {item.splits.length > 0 ? (
                  <div className="finance-splits">
                    {item.splits.map((split, index) => (
                      <span key={`${item.id}-${split.method}-${index}`}>
                        {split.method}: %{split.ratio} / {formatMoney(split.amount || 0, item.currency, locale)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .finance-page {
          display: grid;
          gap: 18px;
          color: var(--text-primary);
        }

        .finance-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
        }

        .finance-head p {
          margin: 0 0 6px;
          color: var(--info);
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
        }

        .finance-head h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.05;
        }

        .finance-head-metrics {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .finance-tabs {
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

        .finance-tabs a {
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

        .finance-tabs a.active,
        .finance-tabs a:hover {
          border-color: var(--stroke);
          background: var(--surface-2);
        }

        .finance-total,
        .finance-status-card,
        .finance-panel,
        .finance-entry {
          border: 1px solid var(--stroke);
          background: var(--surface);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
        }

        .finance-total {
          display: grid;
          gap: 4px;
          min-width: 168px;
          padding: 14px;
          position: relative;
          overflow: hidden;
        }

        .finance-total::before,
        .finance-status-card::before,
        .finance-entry::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: var(--stroke-2);
        }

        .finance-total.income::before {
          background: var(--success);
        }

        .finance-total.expense::before {
          background: var(--danger);
        }

        .finance-total span,
        .finance-panel-head span,
        .finance-entry span,
        .finance-split-box span,
        label span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .finance-total strong {
          font-size: 24px;
        }

        .finance-status-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .finance-status-card {
          display: grid;
          gap: 6px;
          padding: 14px;
          position: relative;
          overflow: hidden;
        }

        .finance-status-card strong {
          font-size: 20px;
          line-height: 1.1;
        }

        .finance-status-card span,
        .finance-status-card small {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .finance-status-card.planned::before {
          background: var(--info);
        }

        .finance-status-card.paid::before {
          background: var(--success);
        }

        .finance-status-card.overdue::before {
          background: var(--danger);
        }

        .finance-status-card.canceled::before {
          background: var(--text-muted);
        }

        .finance-alert {
          border-radius: 8px;
          padding: 12px 14px;
          font-weight: 800;
        }

        .finance-alert.danger {
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--stroke));
        }

        .finance-alert.success {
          color: var(--success);
          background: color-mix(in srgb, var(--success) 8%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--success) 28%, var(--stroke));
        }

        .finance-shell {
          display: grid;
          grid-template-columns: minmax(340px, 0.92fr) minmax(460px, 1.25fr);
          gap: 16px;
          align-items: start;
        }

        .finance-panel {
          min-width: 0;
          padding: 16px;
        }

        .finance-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }

        .finance-panel-head > div {
          display: grid;
          gap: 4px;
        }

        .finance-panel h2 {
          margin: 0;
          font-size: 20px;
        }

        .finance-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        label {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        label.wide {
          grid-column: 1 / -1;
        }

        input,
        select,
        textarea,
        button {
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text-primary);
          min-height: 42px;
          padding: 0 12px;
          font: inherit;
          font-weight: 700;
        }

        input:focus,
        select:focus,
        textarea:focus,
        button:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--info) 36%, transparent);
          outline-offset: 1px;
        }

        textarea {
          min-height: 82px;
          padding: 10px 12px;
          resize: vertical;
        }

        button {
          cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .finance-primary {
          width: 100%;
          margin-top: 14px;
          background: var(--text-primary);
          color: var(--surface);
          min-height: 46px;
          font-weight: 900;
        }

        .finance-split-box {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) repeat(3, minmax(80px, 0.45fr)) minmax(180px, 0.9fr);
          gap: 10px;
          align-items: end;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
          border-left: 4px solid var(--warning);
        }

        .finance-split-box > div {
          display: grid;
          gap: 4px;
        }

        .finance-filters {
          display: grid;
          grid-template-columns: minmax(120px, 1fr) 150px auto;
          gap: 8px;
        }

        .finance-entry-list {
          display: grid;
          gap: 10px;
        }

        .finance-entry {
          display: grid;
          gap: 10px;
          padding: 12px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(90deg, color-mix(in srgb, var(--surface-2) 62%, transparent), transparent 46%),
            var(--surface);
        }

        .finance-entry.planned::before {
          background: var(--info);
        }

        .finance-entry.paid::before {
          background: var(--success);
        }

        .finance-entry.overdue::before {
          background: var(--danger);
        }

        .finance-entry.canceled::before {
          background: var(--text-muted);
        }

        .finance-entry-main,
        .finance-entry-meta,
        .finance-due-options,
        .finance-splits {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        .finance-entry-main > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .finance-entry-main strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .finance-entry-main span {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .finance-entry-side {
          display: grid;
          gap: 8px;
          justify-items: end;
        }

        .finance-entry-side > strong {
          font-size: 20px;
          line-height: 1;
        }

        .finance-entry-side > strong.income {
          color: var(--success);
        }

        .finance-entry-side > strong.expense {
          color: var(--danger);
        }

        .finance-entry-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .finance-entry-actions button {
          min-height: 34px;
          padding: 0 10px;
          font-size: 12px;
        }

        .finance-entry-actions button.danger {
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          border-color: color-mix(in srgb, var(--danger) 26%, var(--stroke));
        }

        .finance-entry-meta {
          justify-content: flex-start;
        }

        .finance-entry-meta span,
        .finance-splits span {
          padding: 6px 8px;
          border-radius: 999px;
          background: var(--surface-2);
        }

        .finance-status-badge {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          font-style: normal;
          font-size: 11px;
          font-weight: 900;
        }

        .finance-status-badge.planned {
          color: var(--info);
          background: color-mix(in srgb, var(--info) 10%, var(--surface));
        }

        .finance-status-badge.paid {
          color: var(--success);
          background: color-mix(in srgb, var(--success) 10%, var(--surface));
        }

        .finance-status-badge.overdue {
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 10%, var(--surface));
        }

        .finance-status-badge.canceled {
          color: var(--text-secondary);
          background: var(--surface-2);
        }

        .finance-due-options {
          justify-content: flex-start;
        }

        .finance-due-options button {
          display: grid;
          gap: 2px;
          min-width: 96px;
          min-height: 48px;
          text-align: left;
        }

        .finance-due-options button.active {
          border-color: var(--info);
          background: color-mix(in srgb, var(--info) 10%, var(--surface));
          color: var(--info);
        }

        .finance-empty {
          padding: 24px;
          color: var(--text-secondary);
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .finance-shell,
          .finance-split-box,
          .finance-status-strip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .finance-head,
          .finance-panel-head {
            align-items: stretch;
            flex-direction: column;
          }

          .finance-form-grid,
          .finance-filters {
            grid-template-columns: 1fr;
          }

          .finance-head-metrics,
          .finance-tabs,
          .finance-tabs a {
            width: 100%;
          }

          .finance-tabs a {
            justify-content: center;
            flex: 1 1 auto;
          }

          .finance-entry-main,
          .finance-entry-side {
            align-items: stretch;
            justify-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}
