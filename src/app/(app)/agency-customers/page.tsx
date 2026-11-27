"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import CustomerPageHeader from "@/app/_ui/CustomerPageHeader";
import s from "./page.module.css";

type Customer = {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  createdAt: string;
};
type List = { rows: Customer[]; total: number; page: number; pageSize: number };
const empty = {
  fullName: "",
  companyName: "",
  phone: "",
  email: "",
  city: "",
  country: "",
  language: "",
};

export default function AgencyCustomersPage() {
  const { locale, t } = useLanguage();
  const tr = locale === "tr";
  const [agency, setAgency] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [result, setResult] = useState<List | null>(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const message = useCallback(
    (cause: unknown) => {
      const raw = cause instanceof Error ? cause.message : "";
      if (raw.includes("administrator must assign"))
        return tr
          ? "Hesabınıza bir acente bağlanmamış. Yöneticiyle iletişime geçin."
          : "No agency is assigned to your account. Contact your administrator.";
      if (raw.includes("phone number or email"))
        return tr
          ? "Telefon veya e-posta adresi girin."
          : "Enter a phone number or email address.";
      if ((cause as { status?: number })?.status === 403)
        return tr
          ? "Bu işlem için erişiminiz yok."
          : "You do not have access to this action.";
      return tr
        ? "İşlem tamamlanamadı. Bilgileri ve bağlantınızı kontrol edip tekrar deneyin."
        : "Could not complete the request. Check the details and your connection, then retry.";
    },
    [tr],
  );

  useEffect(() => {
    let active = true;
    if (getUser()?.role !== "AGENCY_ENTRY") {
      setError(
        tr ? "Bu sayfaya erişiminiz yok." : "You cannot access this page.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setSelected(null);
    Promise.all([
      authedFetch("/agency-customers/context"),
      authedFetch(
        `/agency-customers?page=${page}&pageSize=25&q=${encodeURIComponent(search)}`,
      ),
    ])
      .then(([context, list]) => {
        if (active) {
          setAgency(context.agency);
          setResult(list);
        }
      })
      .catch((cause) => {
        if (active) {
          setAgency(null);
          setResult(null);
          setError(message(cause));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, search, revision, message, tr]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !agency) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // Agency, creator, owner and customer status are assigned by the server.
      await authedFetch("/agency-customers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(empty);
      setShowCreate(false);
      setSaved(true);
      setPage(1);
      setQ("");
      setSearch("");
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }

  function refresh(clear = false) {
    if (clear) setQ("");
    setSearch(clear ? "" : q.trim());
    setPage(1);
    setRevision((value) => value + 1);
  }

  return (
    <div className={s.page}>
      <CustomerPageHeader
        label={tr ? "Müşteri Yönetimi" : "Customer Management"}
        title={tr ? "Müşterilerim" : "My customers"}
        subtitle={
          tr
            ? "Bu alanda yalnızca kendi eklediğiniz müşteriler görünür."
            : "Only customers you added are visible here."
        }
      >
        <button onClick={() => refresh()} disabled={loading}>
          {loading ? t("common.loading") : t("common.refresh")}
        </button>
        <button
          className="primary"
          onClick={() => setShowCreate((value) => !value)}
          disabled={!agency || saving}
          aria-expanded={showCreate}
          aria-controls="agency-customer-create"
        >
          {showCreate ? t("common.close") : t("customers.newCustomer")}
        </button>
      </CustomerPageHeader>
      <div className={`card ${s.agencyNotice}`}>
        <strong>
          {agency
            ? `${tr ? "Bağlı acente" : "Assigned agency"}: ${agency.name}`
            : tr
              ? "Acente bilgisi yükleniyor"
              : "Loading agency"}
        </strong>
        <span className="muted">
          {tr
            ? "Yeni müşteriler otomatik olarak bu acenteye eklenir."
            : "New customers are automatically added under this agency."}
        </span>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className={s.success} role="status">
          {tr
            ? "Müşteri bağlı acentenize eklendi."
            : "Customer added under your assigned agency."}
        </p>
      )}
      {showCreate && (
        <section
          className={`card ${s.createPanel}`}
          id="agency-customer-create"
        >
          <h2>{t("customers.createTitle")}</h2>
          <form onSubmit={create} className={s.form}>
            {(
              [
                "fullName",
                "companyName",
                "phone",
                "email",
                "city",
                "country",
                "language",
              ] as const
            ).map((field) => {
              const labels = {
                fullName: tr ? "Ad soyad" : "Full name",
                companyName: tr ? "Şirket adı" : "Company name",
                phone: tr ? "Telefon" : "Phone",
                email: tr ? "E-posta" : "Email",
                country: tr ? "Ülke" : "Country",
                city: tr ? "Şehir" : "City",
                language: tr ? "İletişim dili" : "Preferred language",
              };
              return (
                <label key={field}>
                  <span className={s.srOnly}>
                    {labels[field]}
                    {field === "fullName" ? " *" : ""}
                  </span>
                  <input
                    value={form[field]}
                    placeholder={`${labels[field]}${field === "fullName" ? " *" : ""}`}
                    required={field === "fullName"}
                    type={
                      field === "email"
                        ? "email"
                        : field === "phone"
                          ? "tel"
                          : "text"
                    }
                    maxLength={
                      field === "fullName" || field === "companyName"
                        ? 160
                        : field === "email"
                          ? 254
                          : field === "phone" || field === "language"
                            ? 50
                            : 100
                    }
                    onChange={(event) => {
                      setSaved(false);
                      setForm((previous) => ({
                        ...previous,
                        [field]: event.target.value,
                      }));
                    }}
                    disabled={saving || !agency}
                  />
                </label>
              );
            })}
            <div className={s.formFooter}>
              <small className="muted">
                {tr
                  ? "Telefon veya e-posta alanlarından en az birini doldurun."
                  : "Provide at least a phone number or an email address."}
              </small>
              <button
                className="primary"
                type="submit"
                disabled={
                  !agency ||
                  saving ||
                  !form.fullName.trim() ||
                  (!form.phone.trim() && !form.email.trim())
                }
              >
                {saving
                  ? tr
                    ? "Ekleniyor…"
                    : "Adding…"
                  : tr
                    ? "Müşteri ekle"
                    : "Add customer"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section
        className={`card ${s.filterPanel}`}
        aria-label={tr ? "Müşteri filtreleri" : "Customer filters"}
      >
        <form
          className={s.filters}
          onSubmit={(event) => {
            event.preventDefault();
            refresh();
          }}
        >
          <input
            aria-label={tr ? "Müşteri ara" : "Search customers"}
            maxLength={100}
            placeholder={
              tr
                ? "Müşteri, telefon veya e-posta ara..."
                : "Search customer, phone or email..."
            }
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <button type="submit" disabled={loading}>
            {t("customers.searchAndRefresh")}
          </button>
          <button
            type="button"
            onClick={() => refresh(true)}
            disabled={loading}
          >
            {tr ? "Temizle" : "Clear"}
          </button>
        </form>
      </section>
      <section
        className={`card ${s.listPanel}`}
        aria-label={tr ? "Müşteri listesi" : "Customer list"}
        aria-busy={loading}
      >
        <div className={s.listSummary}>
          <h2>
            {tr ? "Müşterilerim" : "My customers"}
            {result ? ` (${result.total})` : ""}
          </h2>
          {loading && (
            <span className="muted" role="status">
              {t("common.loading")}
            </span>
          )}
        </div>
        <div className={s.scroll}>
          <table>
            <thead>
              <tr>
                <th>{t("customers.table.customer")}</th>
                <th>{t("customers.table.contact")}</th>
                <th>{t("customers.table.agency")}</th>
                <th>{tr ? "Eklenme tarihi" : "Added"}</th>
              </tr>
            </thead>
            <tbody>
              {result?.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className={s.cell}>
                      <button
                        className={s.customerLink}
                        onClick={() => setSelected(row)}
                      >
                        {row.fullName}
                      </button>
                      <span className={s.secondary}>
                        {row.companyName || "—"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={s.cell}>
                      <span>{row.phone || "—"}</span>
                      <span className={s.secondary}>{row.email || "—"}</span>
                      <span className={s.location}>
                        {[row.city, row.country].filter(Boolean).join(", ") ||
                          "—"}
                      </span>
                    </div>
                  </td>
                  <td>{agency?.name || "—"}</td>
                  <td>
                    {new Date(row.createdAt).toLocaleString(
                      tr ? "tr-TR" : "en-US",
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !result?.rows.length && (
          <p className={s.empty}>
            {tr
              ? "Henüz müşteri yok veya aramanıza uygun kayıt bulunamadı."
              : "No customers yet, or no entries match your search."}
          </p>
        )}
        <div className={s.paging}>
          <button
            disabled={loading || page <= 1 || !result}
            onClick={() => setPage((value) => value - 1)}
          >
            {tr ? "Önceki" : "Previous"}
          </button>
          <span>
            {page} / {Math.max(1, Math.ceil((result?.total || 0) / 25))}
          </span>
          <button
            disabled={loading || !result || page * 25 >= result.total}
            onClick={() => setPage((value) => value + 1)}
          >
            {tr ? "Sonraki" : "Next"}
          </button>
        </div>
      </section>
      {selected && (
        <section
          className="card"
          aria-label={tr ? "Müşteri bilgileri" : "Customer details"}
        >
          <div className={s.detailHeader}>
            <h2>{selected.fullName}</h2>
            <button onClick={() => setSelected(null)}>
              {tr ? "Kapat" : "Close"}
            </button>
          </div>
          <dl className={s.details}>
            {Object.entries({
              [tr ? "Şirket" : "Company"]: selected.companyName,
              [tr ? "Telefon" : "Phone"]: selected.phone,
              [tr ? "E-posta" : "Email"]: selected.email,
              [tr ? "Ülke" : "Country"]: selected.country,
              [tr ? "Şehir" : "City"]: selected.city,
              [tr ? "Dil" : "Language"]: selected.language,
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="muted">{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
