"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";
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
  const { locale } = useLanguage();
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

  return (
    <div className={s.page}>
      <header>
        <h1>{tr ? "Eklediğim müşteriler" : "Customers I added"}</h1>
        <p className="muted">
          {agency
            ? `${tr ? "Bağlı acente" : "Assigned agency"}: ${agency.name}`
            : tr
              ? "Acente bilgisi yükleniyor"
              : "Loading agency"}
        </p>
        <p className="muted">
          {tr
            ? "Bu alanda yalnızca kendi eklediğiniz müşteriler görünür."
            : "Only customers you added are visible here."}
        </p>
      </header>
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
      <section className="card">
        <h2>{tr ? "Müşteri ekle" : "Add customer"}</h2>
        <form onSubmit={create} className={s.form}>
          {(
            [
              "fullName",
              "companyName",
              "phone",
              "email",
              "country",
              "city",
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
                {labels[field]}
                {field === "fullName" ? " *" : ""}
                <input
                  value={form[field]}
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
                  onChange={(e) => {
                    setSaved(false);
                    setForm((previous) => ({
                      ...previous,
                      [field]: e.target.value,
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
      <section className="card">
        <div className={s.listHeader}>
          <h2>
            {tr ? "Müşterilerim" : "My customers"}{" "}
            {result ? `(${result.total})` : ""}
          </h2>
          <form
            className={s.search}
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(q.trim());
              setRevision((value) => value + 1);
            }}
          >
            <input
              aria-label={tr ? "Müşteri ara" : "Search customers"}
              maxLength={100}
              placeholder={
                tr ? "Ad, telefon veya e-posta" : "Name, phone or email"
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {tr ? "Ara" : "Search"}
            </button>
          </form>
        </div>
        {loading ? (
          <p role="status">{tr ? "Yükleniyor…" : "Loading…"}</p>
        ) : (
          <>
            <div className={s.scroll}>
              <table>
                <thead>
                  <tr>
                    <th>{tr ? "Ad soyad" : "Full name"}</th>
                    <th>{tr ? "Telefon" : "Phone"}</th>
                    <th>{tr ? "E-posta" : "Email"}</th>
                    <th>{tr ? "Eklenme tarihi" : "Added"}</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className={s.customerLink}
                          onClick={() => setSelected(row)}
                        >
                          {row.fullName}
                        </button>
                      </td>
                      <td>{row.phone || "—"}</td>
                      <td>{row.email || "—"}</td>
                      <td>
                        {new Date(row.createdAt).toLocaleDateString(
                          tr ? "tr-TR" : "en-GB",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!result?.rows.length && (
              <p className="muted">
                {tr
                  ? "Henüz müşteri yok veya aramanıza uygun kayıt bulunamadı."
                  : "No customers yet, or no entries match your search."}
              </p>
            )}
            <div className={s.paging}>
              <button
                disabled={page <= 1 || !result}
                onClick={() => setPage((value) => value - 1)}
              >
                {tr ? "Önceki" : "Previous"}
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil((result?.total || 0) / 25))}
              </span>
              <button
                disabled={!result || page * 25 >= result.total}
                onClick={() => setPage((value) => value + 1)}
              >
                {tr ? "Sonraki" : "Next"}
              </button>
            </div>
          </>
        )}
      </section>
      {selected && (
        <section
          className="card"
          aria-label={tr ? "Müşteri bilgileri" : "Customer details"}
        >
          <div className={s.listHeader}>
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
