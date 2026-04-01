"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type SalesUser = { id: string; name: string; email: string; role: string };

function followTone(nextFollowUpAt?: string | null) {
  if (!nextFollowUpAt) return "none" as const;

  const now = Date.now();
  const t = new Date(nextFollowUpAt).getTime();

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  if (t < now) return "danger" as const;
  if (t >= startToday.getTime() && t <= endToday.getTime()) return "warning" as const;

  const week = now + 7 * 24 * 60 * 60 * 1000;
  if (t <= week) return "info" as const;

  return "none" as const;
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

export default function ManagerQueue() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);

  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<SalesUser[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [assignById, setAssignById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const res = await authedFetch(
        "/leads?status=MANAGER_REVIEW&page=1&pageSize=100"
      );

      const items = Array.isArray(res) ? res : res?.items || [];
      setLeads(items);

      setAssignById((prev) => {
        const next = { ...prev };
        for (const l of items) {
          if (next[l.id] === undefined) next[l.id] = "";
        }
        return next;
      });
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadSales() {
    try {
      const reps = await authedFetch("/users?role=SALES");
      setSales(Array.isArray(reps) ? reps : []);
    } catch {
      // ignore
    }
  }

  async function assign(leadId: string) {
    const salesId = assignById[leadId];
    if (!salesId) {
      setErr(t("managerQueue.selectSalesFirst"));
      return;
    }

    setErr(null);
    setSavingId(leadId);

    try {
      await authedFetch(`/leads/${leadId}/assign-to-sales`, {
        method: "POST",
        body: JSON.stringify({ salesId }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function returnToCallCenter(leadId: string) {
    setErr(null);
    setSavingId(leadId);

    try {
      await authedFetch(`/leads/${leadId}/activity`, {
        method: "POST",
        body: JSON.stringify({
          type: "NOTE",
          summary: t("managerQueue.returnedToCallCenter"),
          details: t("managerQueue.returnedToCallCenterDetail"),
        }),
      });

      await authedFetch(`/leads/${leadId}/status`, {
        method: "POST",
        body: JSON.stringify({ to: "WORKING" }),
      });

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    load();
    loadSales();
  }, [mounted]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return leads;

    return leads.filter((l) => {
      const hay = `${l.fullName || ""} ${l.phone || ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [leads, q]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("roles.MANAGER")}
          </div>
          <div
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
          >
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {t("managerQueue.title")}
            </div>
            <span className="badge">
              {filtered.length} {t("leads.leadCount")}
            </span>
          </div>
        </div>

        <button onClick={load} disabled={loading}>
          {loading ? t("common.refreshing") : t("common.refresh")}
        </button>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("managerQueue.searchPlaceholder")}
            />
          </div>

          <button onClick={load} disabled={loading}>
            {loading ? t("common.loading") : t("common.searchRefresh")}
          </button>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 10,
              border: "1px solid rgba(239,68,68,.35)",
              background: "rgba(239,68,68,.08)",
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
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
              <th>{t("managerQueue.table.lead")}</th>
              <th>{t("managerQueue.table.phone")}</th>
              <th>{t("managerQueue.table.status")}</th>
              <th>{t("managerQueue.table.followUp")}</th>
              <th>{t("managerQueue.table.assignToSales")}</th>
              <th>{t("managerQueue.table.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l) => {
              const tone = followTone(l.nextFollowUpAt);
              const saving = savingId === l.id;

              return (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      <a href={`/leads/${l.id}`} style={{ fontWeight: 900 }}>
                        {l.fullName}
                      </a>
                      <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {t("managerQueue.lastActivity")}:{" "}
                        {l.lastActivityAt
                          ? new Date(l.lastActivityAt).toLocaleString(
                              locale === "tr" ? "tr-TR" : "en-US"
                            )
                          : "-"}
                      </div>
                    </div>
                  </td>

                  <td>{l.phone}</td>

                  <td>
                    <span className="badge">
                      {safeTranslate(t, `leadStatuses.${l.status}`, l.status)}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: 8 }}>
                      <span className={`badge ${tone}`}>
                        {l.nextFollowUpAt
                          ? new Date(l.nextFollowUpAt).toLocaleString(
                              locale === "tr" ? "tr-TR" : "en-US"
                            )
                          : t("leads.noFollowUp")}
                      </span>
                    </div>
                  </td>

                  <td style={{ minWidth: 320 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={assignById[l.id] ?? ""}
                        onChange={(e) =>
                          setAssignById((p) => ({ ...p, [l.id]: e.target.value }))
                        }
                        style={{ minWidth: 220 }}
                      >
                        <option value="">{t("managerQueue.selectSales")}</option>
                        {sales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      </select>

                      <button
                        className="primary"
                        onClick={() => assign(l.id)}
                        disabled={saving || !assignById[l.id]}
                      >
                        {saving ? t("leads.saving") : t("managerQueue.assign")}
                      </button>
                    </div>
                  </td>

                  <td style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => returnToCallCenter(l.id)} disabled={saving}>
                        {t("managerQueue.sendToCallCenter")}
                      </button>
                      <a href={`/leads/${l.id}`} style={{ textDecoration: "underline" }}>
                        {t("common.open")}
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("managerQueue.noLeads")}
          </div>
        ) : null}
      </div>
    </div>
  );
}