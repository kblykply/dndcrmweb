"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import LeadAvatar from "@/app/_ui/LeadAvatar";

const STATUSES = [
  "ALL",
  "NEW",
  "WORKING",
  "SALES_READY",
  "MANAGER_REVIEW",
  "ASSIGNED",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;
type LeadRow = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: string;
  createdAt?: string;
  nextFollowUpAt?: string | null;
  lastActivityAt?: string | null;
  avatarUrl?: string | null;
};
type ListQuery = {
  page: number;
  pageSize: number;
  q: string;
  status: string;
  revision: number;
};
type ListResult = {
  requestKey: string;
  items: LeadRow[];
  total: number;
  totalPages: number;
};
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  return translated === path ? (fallback ?? path) : translated;
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
function normalizeDeleteError(input: unknown, t: (path: string) => string) {
  const text = errorMessage(input);
  if (text.includes("Silinecek lead seçilmedi"))
    return t("adminLeads.errors.selectAtLeastOne");
  if (text.includes("Only admin can bulk delete leads"))
    return t("adminLeads.errors.onlyAdmin");
  return text;
}

export default function AdminLeadsPage() {
  const { t, locale } = useLanguage();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const isAdmin = mounted && getUser()?.role === "ADMIN";
  const [query, setQuery] = useState<ListQuery>({
    page: 1,
    pageSize: 25,
    q: "",
    status: "ALL",
    revision: 0,
  });
  const [result, setResult] = useState<ListResult | null>(null);
  const [requestError, setRequestError] = useState<{
    requestKey: string;
    message: string;
  } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const requestKey = JSON.stringify(query);
  const currentResult = result?.requestKey === requestKey ? result : null;
  const currentError =
    requestError?.requestKey === requestKey ? requestError.message : null;
  const loading = isAdmin && !currentResult && !currentError;
  const leads = useMemo(() => currentResult?.items ?? [], [currentResult]);
  const selectedIds = useMemo(
    () => leads.filter((lead) => selected[lead.id]).map((lead) => lead.id),
    [leads, selected],
  );
  const allVisibleSelected =
    leads.length > 0 && selectedIds.length === leads.length;
  const total = currentResult?.total ?? 0;
  const totalPages = currentResult?.totalPages ?? 1;
  const err = deleteError || currentError;

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    // Debounce text searches. No request ever fetches more than one bounded page.
    const timer = window.setTimeout(
      async () => {
        const params = new URLSearchParams({
          page: String(query.page),
          pageSize: String(query.pageSize),
        });
        if (query.q.trim()) params.set("q", query.q.trim());
        if (query.status !== "ALL") params.set("status", query.status);
        try {
          const data = await authedFetch(`/leads?${params.toString()}`, {
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          const items: LeadRow[] = Array.isArray(data?.items) ? data.items : [];
          const total = Math.max(0, Number(data?.total) || 0);
          const totalPages = Math.max(
            1,
            Number(data?.totalPages) || Math.ceil(total / query.pageSize),
          );
          if (query.page > totalPages) {
            // Deletion or another user's change can remove the last page.
            setQuery((current) =>
              JSON.stringify(current) === requestKey
                ? { ...current, page: totalPages }
                : current,
            );
            return;
          }
          setResult({ requestKey, items, total, totalPages });
        } catch (error) {
          if (!controller.signal.aborted)
            setRequestError({ requestKey, message: errorMessage(error) });
        }
      },
      query.q.trim() ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isAdmin, query, requestKey]);

  function changeQuery(patch: Partial<ListQuery>) {
    setSelected({});
    setDeleteError(null);
    setQuery((current) => ({
      ...current,
      ...patch,
      revision: current.revision + 1,
    }));
  }
  function refresh() {
    setSelected({});
    setDeleteError(null);
    setQuery((current) => ({ ...current, revision: current.revision + 1 }));
  }
  function toggleAllVisible() {
    if (loading || deleting) return;
    setSelected(
      allVisibleSelected
        ? {}
        : Object.fromEntries(leads.map((lead) => [lead.id, true])),
    );
  }
  async function bulkDelete() {
    if (!isAdmin || loading || deleting || selectedIds.length === 0) return;
    const ok = confirm(
      locale === "tr"
        ? `Bu sayfada seçili ${selectedIds.length} lead kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`
        : `${selectedIds.length} leads selected on this page will be permanently deleted. This action cannot be undone. Do you want to continue?`,
    );
    if (!ok) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await authedFetch("/leads/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      alert(
        locale === "tr"
          ? `${res.deletedCount || 0} lead silindi.`
          : `${res.deletedCount || 0} leads deleted.`,
      );
      refresh();
    } catch (error) {
      setDeleteError(normalizeDeleteError(error, t));
    } finally {
      setDeleting(false);
    }
  }

  if (!mounted) return <div>{t("common.loading")}</div>;
  if (!isAdmin)
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {t("admin.unauthorizedTitle")}
        </div>
        <div className="muted">{t("adminLeads.unauthorizedText")}</div>
      </div>
    );

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <div className="flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("roles.ADMIN")}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {t("adminLeads.title")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {t("adminLeads.subtitle")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={refresh} disabled={loading || deleting}>
            {loading ? t("common.refreshing") : t("common.refresh")}
          </button>
          <button
            className="danger"
            onClick={bulkDelete}
            disabled={loading || deleting || selectedIds.length === 0}
          >
            {deleting
              ? t("common.deleting")
              : `${t("adminLeads.deleteSelected")} (${selectedIds.length})`}
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <input
            type="search"
            value={query.q}
            onChange={(event) =>
              changeQuery({ q: event.target.value, page: 1 })
            }
            placeholder={t("adminLeads.searchPlaceholder")}
            aria-label={t("adminLeads.searchPlaceholder")}
            disabled={deleting}
            style={{ flex: "1 1 260px", minWidth: 0 }}
          />
          <select
            value={query.status}
            onChange={(event) =>
              changeQuery({ status: event.target.value, page: 1 })
            }
            aria-label={t("adminLeads.table.status")}
            disabled={deleting}
            style={{ flex: "0 1 220px", minWidth: 0 }}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "ALL"
                  ? t("adminLeads.allStatuses")
                  : safeTranslate(t, `leadStatuses.${status}`, status)}
              </option>
            ))}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {locale === "tr" ? "Sayfa başına" : "Per page"}
            <select
              value={query.pageSize}
              onChange={(event) =>
                changeQuery({ pageSize: Number(event.target.value), page: 1 })
              }
              aria-label={
                locale === "tr" ? "Sayfa başına kayıt" : "Rows per page"
              }
              disabled={deleting}
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {locale === "tr"
            ? "Arama ve durum filtresi tüm kayıtları kapsar. Seçim yalnız bu sayfa için geçerlidir; sayfa veya filtre değişince temizlenir."
            : "Search and status filters cover all records. Selection applies only to this page and clears when the page or filters change."}
        </div>
        {err ? (
          <div
            role="alert"
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
      <div
        className="card"
        style={{ padding: 0, overflow: "hidden", minWidth: 0 }}
      >
        {loading ? (
          <div role="status" style={{ padding: 14 }}>
            {t("common.loading")}
          </div>
        ) : null}
        <div style={{ overflowX: "auto" }}>
          <table aria-busy={loading}>
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={loading || deleting || leads.length === 0}
                    aria-label={
                      locale === "tr"
                        ? "Bu sayfadaki tüm leadleri seç"
                        : "Select all leads on this page"
                    }
                  />
                </th>
                <th>{t("adminLeads.table.fullName")}</th>
                <th>{t("adminLeads.table.phone")}</th>
                <th>{t("adminLeads.table.email")}</th>
                <th>{t("adminLeads.table.source")}</th>
                <th>{t("adminLeads.table.status")}</th>
                <th>{t("adminLeads.table.lastActivity")}</th>
                <th>{t("adminLeads.table.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[lead.id]}
                      onChange={(event) =>
                        setSelected((current) => ({
                          ...current,
                          [lead.id]: event.target.checked,
                        }))
                      }
                      disabled={loading || deleting}
                      aria-label={`${lead.fullName} ${locale === "tr" ? "seç" : "select"}`}
                    />
                  </td>
                  <td style={{ fontWeight: 800 }}>
                    <a
                      href={`/leads/${lead.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        textDecoration: "none",
                        color: "var(--text-primary)",
                      }}
                    >
                      <LeadAvatar
                        avatarUrl={lead.avatarUrl}
                        name={lead.fullName}
                        size={30}
                      />
                      {lead.fullName}
                    </a>
                  </td>
                  <td>{lead.phone || "-"}</td>
                  <td>{lead.email || "-"}</td>
                  <td>{lead.source || "-"}</td>
                  <td>
                    <span className="badge">
                      {safeTranslate(
                        t,
                        `leadStatuses.${lead.status}`,
                        lead.status,
                      )}
                    </span>
                  </td>
                  <td>
                    {lead.lastActivityAt
                      ? new Date(lead.lastActivityAt).toLocaleString(
                          locale === "tr" ? "tr-TR" : "en-US",
                        )
                      : "-"}
                  </td>
                  <td>
                    {lead.createdAt
                      ? new Date(lead.createdAt).toLocaleString(
                          locale === "tr" ? "tr-TR" : "en-US",
                        )
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !currentError && currentResult && leads.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("adminLeads.noLeads")}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            padding: 14,
          }}
        >
          <span aria-live="polite">
            {currentResult
              ? `${leads.length ? (query.page - 1) * query.pageSize + 1 : 0}-${Math.min(query.page * query.pageSize, total)} / ${total}`
              : "—"}
          </span>
          <nav
            aria-label={locale === "tr" ? "Lead sayfaları" : "Lead pages"}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <button
              onClick={() => changeQuery({ page: query.page - 1 })}
              disabled={loading || deleting || query.page <= 1}
            >
              {locale === "tr" ? "Önceki" : "Previous"}
            </button>
            <span>
              {locale === "tr" ? "Sayfa" : "Page"} {query.page} /{" "}
              {currentResult ? totalPages : "—"}
            </span>
            <button
              onClick={() => changeQuery({ page: query.page + 1 })}
              disabled={
                loading ||
                deleting ||
                !currentResult ||
                query.page >= totalPages
              }
            >
              {locale === "tr" ? "Sonraki" : "Next"}
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
