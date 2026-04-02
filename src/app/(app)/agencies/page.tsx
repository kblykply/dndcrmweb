"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type AgencyStatus = "ACTIVE" | "PASSIVE" | "PROSPECT" | "DEALING" | "CLOSED";

type AgencyRow = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  status: AgencyStatus;
  createdAt?: string;
  updatedAt?: string;
  manager?: { id: string; name: string; email: string };
  assignedSales?: { id: string; name: string; email: string } | null;
  _count?: {
    notes: number;
    meetings: number;
    tasks: number;
  };
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const STATUS_OPTIONS: Array<"ALL" | AgencyStatus> = [
  "ALL",
  "ACTIVE",
  "PASSIVE",
  "PROSPECT",
  "DEALING",
  "CLOSED",
];

function statusBadgeClass(status?: string) {
  if (status === "ACTIVE" || status === "DEALING") return "success";
  if (status === "PROSPECT") return "info";
  if (status === "PASSIVE") return "warning";
  if (status === "CLOSED") return "danger";
  return "";
}

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

export default function AgenciesPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<AgencyRow[]>([]);
  const [salesUsers, setSalesUsers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | AgencyStatus>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [assignedSalesId, setAssignedSalesId] = useState("");

  const role = me?.role as string | undefined;
  const isSales = role === "SALES";
  const canCreate =
    role === "MANAGER" || role === "ADMIN" || role === "SALES";
  const canDelete = role === "MANAGER" || role === "ADMIN";

  function hiddenText() {
    return safeTranslate(t, "common.hidden", locale === "tr" ? "Gizli" : "Hidden");
  }

  function canSeeAgencyContact(a: AgencyRow) {
    if (!isSales) return true;
    return a.assignedSales?.id === me?.id;
  }

  async function load(
    nextPage = page,
    nextStatus = status,
    nextQ = q,
    nextPageSize = pageSize,
  ) {
    setErr(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextStatus !== "ALL") params.set("status", nextStatus);
      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));

      const res = await authedFetch(`/agencies?${params.toString()}`);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setPage(res?.page || nextPage);
      setPageSize(res?.pageSize || nextPageSize);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSalesUsers() {
    if (isSales) {
      setSalesUsers([]);
      return;
    }

    try {
      const data = await authedFetch("/users?role=SALES");
      setSalesUsers(Array.isArray(data) ? data : []);
    } catch {
      setSalesUsers([]);
    }
  }

  async function createAgency() {
    setErr(null);
    setSaving(true);
    try {
      await authedFetch("/agencies", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          website: website.trim() || undefined,
          source: source.trim() || undefined,
          notesSummary: notesSummary.trim() || undefined,
          assignedSalesId: isSales ? undefined : assignedSalesId || null,
        }),
      });

      setName("");
      setContactName("");
      setPhone("");
      setEmail("");
      setCity("");
      setCountry("");
      setWebsite("");
      setSource("");
      setNotesSummary("");
      setAssignedSalesId("");
      setShowCreate(false);

      await load(1, status, q, pageSize);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAgency(id: string, agencyName: string) {
    const ok = window.confirm(
      t("agencies.deleteConfirm").replace("{name}", agencyName),
    );
    if (!ok) return;

    setErr(null);
    setDeletingId(id);
    try {
      await authedFetch(`/agencies/${id}`, {
        method: "DELETE",
      });

      if (items.length === 1 && page > 1) {
        await load(page - 1, status, q, pageSize);
      } else {
        await load(page, status, q, pageSize);
      }
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
    load(1, status, q, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadSalesUsers();
    if (isSales) {
      setAssignedSalesId(me?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, role, me?.id]);

  const pageInfo = useMemo(() => {
    if (!total) return t("common.noRecords");
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} / ${total}`;
  }, [page, pageSize, total, t]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("agencies.label")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {t("agencies.title")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {t("agencies.subtitle")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => load(page, status, q, pageSize)}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canCreate ? (
            <button
              className="primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? t("common.close") : t("agencies.newAgency")}
            </button>
          ) : null}
        </div>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>{t("agencies.createTitle")}</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("agencies.fields.name")}
            />
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t("agencies.fields.contactName")}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("agencies.fields.phone")}
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("agencies.fields.email")}
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("agencies.fields.city")}
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("agencies.fields.country")}
            />

            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t("agencies.fields.website")}
            />
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("agencies.fields.source")}
            />

            {isSales ? (
              <input
                value={me?.name || ""}
                disabled
                placeholder={t("agencies.fields.sales")}
              />
            ) : (
              <select
                value={assignedSalesId}
                onChange={(e) => setAssignedSalesId(e.target.value)}
              >
                <option value="">{t("agencies.fields.selectSales")}</option>
                {salesUsers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            value={notesSummary}
            onChange={(e) => setNotesSummary(e.target.value)}
            placeholder={t("agencies.fields.notesSummary")}
          />

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
          >
            <button onClick={() => setShowCreate(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="primary"
              onClick={createAgency}
              disabled={saving || !name.trim()}
            >
              {saving ? t("agencies.saving") : t("agencies.createAgency")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px 140px auto",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("agencies.searchPlaceholder")}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL"
                  ? t("agencies.allStatuses")
                  : safeTranslate(t, `agencyStatuses.${s}`, s)}
              </option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={20}>20 / {t("agencies.perPage")}</option>
            <option value={50}>50 / {t("agencies.perPage")}</option>
            <option value={100}>100 / {t("agencies.perPage")}</option>
          </select>

          <button
            onClick={() => load(1, status, q, pageSize)}
            disabled={loading}
          >
            {t("agencies.searchAndRefresh")}
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
              <th>{t("agencies.table.agency")}</th>
              <th>{t("agencies.table.contact")}</th>
              <th>{t("agencies.table.sales")}</th>
              <th>{t("agencies.table.status")}</th>
              <th>{t("agencies.table.counts")}</th>
              <th>{t("agencies.table.updatedAt")}</th>
              {canDelete ? <th>{t("agencies.table.actions")}</th> : null}
            </tr>
          </thead>

          <tbody>
            {items.map((a) => {
              const canSeeContact = canSeeAgencyContact(a);

              return (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <a href={`/agencies/${a.id}`} style={{ fontWeight: 900 }}>
                        {a.name}
                      </a>
                      <div
                        style={{ color: "var(--text-secondary)", fontSize: 12 }}
                      >
                        {canSeeContact
                          ? a.contactName || "-"
                          : hiddenText()}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div>
                        {canSeeContact ? a.phone || "-" : hiddenText()}
                      </div>
                      <div
                        style={{ color: "var(--text-secondary)", fontSize: 12 }}
                      >
                        {canSeeContact ? a.email || "-" : hiddenText()}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {[a.city, a.country].filter(Boolean).join(", ") || "-"}
                      </div>
                    </div>
                  </td>

                  <td>{a.assignedSales?.name || "-"}</td>

                  <td>
                    <span className={`badge ${statusBadgeClass(a.status)}`}>
                      {safeTranslate(t, `agencyStatuses.${a.status}`, a.status)}
                    </span>
                  </td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        fontSize: 12,
                      }}
                    >
                      <span>{t("agencies.counts.notes")}: {a._count?.notes ?? 0}</span>
                      <span>{t("agencies.counts.meetings")}: {a._count?.meetings ?? 0}</span>
                      <span>{t("agencies.counts.tasks")}: {a._count?.tasks ?? 0}</span>
                    </div>
                  </td>

                  <td>
                    {a.updatedAt
                      ? new Date(a.updatedAt).toLocaleString(
                          locale === "tr" ? "tr-TR" : "en-US",
                        )
                      : "-"}
                  </td>

                  {canDelete ? (
                    <td>
                      <button
                        className="danger"
                        onClick={() => deleteAgency(a.id, a.name)}
                        disabled={deletingId === a.id}
                      >
                        {deletingId === a.id ? t("agencies.deleting") : t("common.delete")}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("agencies.noAgencies")}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {pageInfo}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => load(Math.max(1, page - 1), status, q, pageSize)}
              disabled={page <= 1 || loading}
            >
              {t("common.previous")}
            </button>

            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {t("agencies.page")} {page} / {totalPages}
            </span>

            <button
              onClick={() =>
                load(Math.min(totalPages, page + 1), status, q, pageSize)
              }
              disabled={page >= totalPages || loading}
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}