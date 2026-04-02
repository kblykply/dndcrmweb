"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type CustomerType = "POTENTIAL" | "EXISTING";

type AgencyRow = {
  id: string;
  name: string;
};

type SalesRow = {
  id: string;
  name: string;
  email?: string | null;
  role?: string;
};

type CustomerRow = {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  type?: CustomerType;
  notesSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
  agency?: AgencyRow | null;
  owner?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  canSeeContactDetails?: boolean;
  _count?: {
    presentations: number;
  };
};

const TYPE_OPTIONS: Array<"ALL" | CustomerType> = ["ALL", "POTENTIAL", "EXISTING"];

function badgeClass(type?: string) {
  if (type === "EXISTING") return "success";
  if (type === "POTENTIAL") return "info";
  return "";
}

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

export default function CustomersPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<CustomerRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | CustomerType>("ALL");

  const [showCreate, setShowCreate] = useState(false);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [type, setType] = useState<CustomerType>("POTENTIAL");
  const [agencyId, setAgencyId] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const role = me?.role as string | undefined;
  const isSales = role === "SALES";
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";
  const canCreate = role === "MANAGER" || role === "ADMIN" || role === "SALES";
  const canDelete = role === "MANAGER" || role === "ADMIN";

  function hiddenText() {
    return safeTranslate(
      t,
      "common.hidden",
      locale === "tr" ? "Gizli" : "Hidden"
    );
  }

  function canSeeContact(customer: CustomerRow) {
    if (!isSales) return true;
    return customer.canSeeContactDetails === true;
  }

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await authedFetch("/customers");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgencies() {
    try {
      const res = await authedFetch("/agencies?page=1&pageSize=200");
      setAgencies(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setAgencies([]);
    }
  }

  async function loadSalesUsers() {
    if (!isManagerOrAdmin) {
      setSalesUsers([]);
      return;
    }

    try {
      const res = await authedFetch("/users?role=SALES");
      setSalesUsers(Array.isArray(res) ? res : []);
    } catch {
      setSalesUsers([]);
    }
  }

  async function createCustomer() {
    setErr(null);
    setSaving(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        address: address.trim() || undefined,
        source: source.trim() || undefined,
        notesSummary: notesSummary.trim() || undefined,
        type,
        agencyId: agencyId || null,
        ownerId: isSales ? undefined : ownerId || null,
      };

      await authedFetch("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFullName("");
      setCompanyName("");
      setPhone("");
      setEmail("");
      setCity("");
      setCountry("");
      setAddress("");
      setSource("");
      setNotesSummary("");
      setType("POTENTIAL");
      setAgencyId("");
      setOwnerId(isSales ? me?.id || "" : "");
      setShowCreate(false);

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string, name: string) {
    const ok = window.confirm(
      t("customers.deleteConfirm").replace("{name}", name)
    );
    if (!ok) return;

    setErr(null);
    setDeletingId(id);

    try {
      await authedFetch(`/customers/${id}`, {
        method: "DELETE",
      });

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
    loadAgencies();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    if (isSales) {
      setOwnerId(me?.id || "");
      setSalesUsers([]);
    } else {
      loadSalesUsers();
    }
  }, [mounted, isSales, me?.id]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((c) => {
      if (typeFilter !== "ALL" && c.type !== typeFilter) return false;
      if (!qq) return true;

      const searchableText = canSeeContact(c)
        ? `${c.fullName || ""} ${c.companyName || ""} ${c.phone || ""} ${c.email || ""} ${c.city || ""} ${c.country || ""} ${c.agency?.name || ""} ${c.owner?.name || ""}`
        : `${c.fullName || ""} ${c.companyName || ""} ${c.agency?.name || ""} ${c.owner?.name || ""}`;

      return searchableText.toLowerCase().includes(qq);
    });
  }, [items, q, typeFilter, isSales]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("customers.label")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{t("customers.title")}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {t("customers.subtitle")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading}>
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canCreate ? (
            <button
              className="primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? t("common.close") : t("customers.newCustomer")}
            </button>
          ) : null}
        </div>
      </div>

      {isSales ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(245,158,11,.35)",
            background: "rgba(245,158,11,.08)",
          }}
        >
          {safeTranslate(
            t,
            "customers.limitedAccessNotice",
            locale === "tr"
              ? "Size ait olmayan müşteriler için iletişim bilgileri gizlenmiştir. Detay sayfasında yalnızca kendi müşterilerinizi düzenleyebilirsiniz."
              : "Contact details are hidden for customers that do not belong to you. On the detail page, you can only edit your own customers."
          )}
        </div>
      ) : null}

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>{t("customers.createTitle")}</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("customers.fields.fullName")}
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("customers.fields.companyName")}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("customers.fields.phone")}
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("customers.fields.email")}
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("customers.fields.city")}
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("customers.fields.country")}
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("customers.fields.address")}
            />
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("customers.fields.source")}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
            >
              <option value="POTENTIAL">
                {safeTranslate(t, "customerTypes.POTENTIAL", "POTENTIAL")}
              </option>
              <option value="EXISTING">
                {safeTranslate(t, "customerTypes.EXISTING", "EXISTING")}
              </option>
            </select>

            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
            >
              <option value="">{t("customers.fields.selectAgency")}</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {isSales ? (
              <input
                value={me?.name || ""}
                disabled
                placeholder={safeTranslate(
                  t,
                  "customers.fields.ownerSales",
                  locale === "tr" ? "Sorumlu Sales" : "Owner Sales"
                )}
              />
            ) : (
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">
                  {safeTranslate(
                    t,
                    "customers.fields.selectOwnerSales",
                    locale === "tr" ? "Sorumlu sales seç" : "Select owner sales"
                  )}
                </option>
                {salesUsers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.email ? `(${s.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            value={notesSummary}
            onChange={(e) => setNotesSummary(e.target.value)}
            placeholder={t("customers.fields.notesSummary")}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowCreate(false)}>{t("common.cancel")}</button>
            <button
              className="primary"
              onClick={createCustomer}
              disabled={saving || !fullName.trim() || (!isSales && !ownerId)}
            >
              {saving ? t("customers.saving") : t("customers.createCustomer")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px auto",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("customers.searchPlaceholder")}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? t("customers.allTypes")
                  : safeTranslate(t, `customerTypes.${option}`, option)}
              </option>
            ))}
          </select>

          <button onClick={load} disabled={loading}>
            {t("customers.searchAndRefresh")}
          </button>
        </div>

        {err ? (
          <div
            style={{
              border: "1px solid rgba(239,68,68,.35)",
              background: "rgba(239,68,68,.08)",
              padding: 12,
              borderRadius: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>{t("customers.table.customer")}</th>
              <th>{t("customers.table.contact")}</th>
              <th>{t("customers.table.agency")}</th>
              <th>
                {safeTranslate(
                  t,
                  "customers.table.ownerSales",
                  locale === "tr" ? "Sorumlu Sales" : "Owner Sales"
                )}
              </th>
              <th>{t("customers.table.type")}</th>
              <th>{t("customers.table.presentations")}</th>
              <th>{t("customers.table.updatedAt")}</th>
              {canDelete ? <th>{t("customers.table.actions")}</th> : null}
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => {
              const visible = canSeeContact(c);

              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <a href={`/customers/${c.id}`} style={{ fontWeight: 900 }}>
                        {c.fullName}
                      </a>
                      <div
                        style={{ color: "var(--text-secondary)", fontSize: 12 }}
                      >
                        {c.companyName || "-"}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div>{visible ? c.phone || "-" : hiddenText()}</div>
                      <div
                        style={{ color: "var(--text-secondary)", fontSize: 12 }}
                      >
                        {visible ? c.email || "-" : hiddenText()}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {visible
                          ? [c.city, c.country].filter(Boolean).join(", ") || "-"
                          : hiddenText()}
                      </div>
                    </div>
                  </td>

                  <td>{c.agency?.name || "-"}</td>

                  <td>{c.owner?.name || "-"}</td>

                  <td>
                    <span className={`badge ${badgeClass(c.type)}`}>
                      {c.type ? safeTranslate(t, `customerTypes.${c.type}`, c.type) : "-"}
                    </span>
                  </td>

                  <td>{c._count?.presentations ?? 0}</td>

                  <td>
                    {c.updatedAt
                      ? new Date(c.updatedAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")
                      : "-"}
                  </td>

                  {canDelete ? (
                    <td>
                      <button
                        className="danger"
                        onClick={() => deleteCustomer(c.id, c.fullName)}
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id ? t("customers.deleting") : t("common.delete")}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("customers.noCustomers")}
          </div>
        ) : null}
      </div>
    </div>
  );
}