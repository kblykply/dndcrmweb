"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import LeadAvatar from "@/app/_ui/LeadAvatar";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type UserLite = { id: string; name: string; email: string; role: string };

const CALL_OUTCOMES = [
  { key: "OPENED", labelKey: "leadOutcomes.OPENED", fallback: "Opened / Connected" },
  { key: "NO_ANSWER", labelKey: "leadOutcomes.NO_ANSWER", fallback: "No answer" },
  { key: "BUSY", labelKey: "leadOutcomes.BUSY", fallback: "Busy" },
  { key: "UNREACHABLE", labelKey: "leadOutcomes.UNREACHABLE", fallback: "Unreachable / Phone off" },
  { key: "CALL_AGAIN", labelKey: "leadOutcomes.CALL_AGAIN", fallback: "Call again" },
  { key: "INTERESTED", labelKey: "leadOutcomes.INTERESTED", fallback: "Interested" },
  { key: "NOT_INTERESTED", labelKey: "leadOutcomes.NOT_INTERESTED", fallback: "Not interested" },
  { key: "QUALIFIED", labelKey: "leadOutcomes.QUALIFIED", fallback: "Qualified" },
  { key: "WON", labelKey: "leadOutcomes.WON", fallback: "Won" },
  { key: "LOST", labelKey: "leadOutcomes.LOST", fallback: "Lost" },
  { key: "WRONG_NUMBER", labelKey: "leadOutcomes.WRONG_NUMBER", fallback: "Wrong number" },
] as const;

function presetLocal(hoursFromNow: number) {
  const dt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}`;
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

function formatDate(
  d: string | null | undefined,
  locale: "tr" | "en"
) {
  if (!d) return "-";
  return new Date(d).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

export default function LeadDetailPage() {
  const { t, locale } = useLanguage();

  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [lead, setLead] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [managers, setManagers] = useState<UserLite[]>([]);
  const [sales, setSales] = useState<UserLite[]>([]);

  const [managerId, setManagerId] = useState("");
  const [salesId, setSalesId] = useState("");

  const [actType, setActType] = useState("CALL");
  const [callOutcome, setCallOutcome] =
    useState<(typeof CALL_OUTCOMES)[number]["key"]>("NO_ANSWER");
const [actSummary, setActSummary] = useState(t("leadDetail.defaultCallSummary"));
  const [actDetails, setActDetails] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  const role = me?.role as string | undefined;
  const status = lead?.status as string | undefined;

  const isAdmin = role === "ADMIN";
  const isCallcenter = role === "CALLCENTER" || isAdmin;
  const isManager = role === "MANAGER" || isAdmin;
  const isSales = role === "SALES" || isAdmin;

  const isNew = status === "NEW";
  const isWorking = status === "WORKING";
  const isSalesReady = status === "SALES_READY";
  const isManagerReview = status === "MANAGER_REVIEW";
  const isAssigned = status === "ASSIGNED";
  const isClosed = status === "WON" || status === "LOST";

  const canSetWorking = isCallcenter && (isNew || isSalesReady || isManagerReview);
  const canSetSalesReady = isCallcenter && (isWorking || isNew);
  const canSendToManager = isCallcenter && isSalesReady;
  const canAssignToSales = isManager && (isManagerReview || isAssigned);
  const canClose = isSales && isAssigned;

  async function load() {
    if (!id) {
      setErr(t("leadDetail.idMissing"));
      setLead(null);
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const data = await authedFetch(`/leads/${id}`);
      setLead(data);
      setManagerId(data?.assignedManagerId || "");
      setSalesId(data?.assignedSalesId || "");
    } catch (e: any) {
      setLead(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const mgrs = await authedFetch("/users?role=MANAGER");
      setManagers(mgrs);
      const reps = await authedFetch("/users?role=SALES");
      setSales(reps);
    } catch {
      // ignore
    }
  }

  async function setStatus(to: string) {
    if (!id) return;
    setErr(null);
    try {
      await authedFetch(`/leads/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function addActivity() {
    if (!id) return;
    setErr(null);

    try {
      const body: any = {
        type: actType,
        summary: actSummary,
        details: actDetails || undefined,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
      };

      if (actType === "CALL") {
        const outcomeLabel =
          safeTranslate(t, `leadOutcomes.${callOutcome}`, callOutcome);
        body.callOutcome = callOutcome;
        body.summary = actSummary || `${t("leadDetail.callPrefix")}: ${outcomeLabel}`;
      }

      await authedFetch(`/leads/${id}/activity`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (actType === "CALL" && (callOutcome === "WON" || callOutcome === "LOST")) {
        await setStatus(callOutcome);
      }
      if (
        actType === "CALL" &&
        callOutcome === "QUALIFIED" &&
        (status === "NEW" || status === "WORKING")
      ) {
        await setStatus("SALES_READY");
      }

      setActDetails("");
      setNextFollowUpAt("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function sendToManager() {
    if (!id) return;
    setErr(null);
    try {
      await authedFetch(`/leads/${id}/send-to-manager`, {
        method: "POST",
        body: JSON.stringify({ managerId }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function assignToSales() {
    if (!id) return;
    setErr(null);
    try {
      await authedFetch(`/leads/${id}/assign-to-sales`, {
        method: "POST",
        body: JSON.stringify({ salesId }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    load();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (actType !== "CALL") return;
    const label =
      safeTranslate(t, `leadOutcomes.${callOutcome}`, callOutcome);
    setActSummary(`${t("leadDetail.callPrefix")}: ${label}`);
  }, [callOutcome, actType, t]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/leads" style={{ fontWeight: 800 }}>
            ← {t("leadDetail.backToActiveLeads")}
          </a>
          <span className="muted">/</span>
          <span style={{ fontWeight: 900 }}>{lead?.fullName || t("leads.title")}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="muted">
            {t("leadDetail.lastActivity")}: {formatDate(lead?.lastActivityAt, locale)}
          </span>
        </div>
      </div>

      {loading ? <div className="card">{t("leadDetail.loadingLead")}</div> : null}

      {err ? (
        <pre className="card" style={{ whiteSpace: "pre-wrap", borderColor: "rgba(239,68,68,.35)" }}>
          {err}
        </pre>
      ) : null}

      {!loading && !err && lead ? (
        <>
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <LeadAvatar avatarUrl={lead.avatarUrl} name={lead.fullName} size={44} />
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{lead.fullName}</div>
                <div className="muted">
                  {t("leadDetail.createdAt")}: {formatDate(lead.createdAt, locale)} • {lead.phone} •{" "}
                  {lead.email || t("leadDetail.noEmail")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge">
                {safeTranslate(t, `leadStatuses.${lead.status}`, lead.status)}
              </span>
              <a href={`tel:${lead.phone}`} className="badge">
                {t("leads.call")}
              </a>
              <a
                href={`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="badge"
              >
                WhatsApp
              </a>
              <button>{t("leadDetail.more")}</button>
            </div>
          </div>

          <div
            style={{
              borderBottom: "1px solid var(--stroke)",
              display: "flex",
              gap: 18,
              overflowX: "auto",
            }}
          >
            <a
              style={{
                padding: "12px 2px",
                fontWeight: 800,
                borderBottom: "2px solid var(--text-primary)",
              }}
            >
              {t("leadDetail.tabs.activity")}
            </a>
            <a
              style={{
                padding: "12px 2px",
                color: "var(--text-secondary)",
                fontWeight: 700,
              }}
            >
              {t("leadDetail.tabs.details")}
            </a>
            <a
              style={{
                padding: "12px 2px",
                color: "var(--text-secondary)",
                fontWeight: 700,
              }}
            >
              {t("leadDetail.tabs.documents")}
            </a>
            <a
              style={{
                padding: "12px 2px",
                color: "var(--text-secondary)",
                fontWeight: 700,
              }}
            >
              {t("leadDetail.tabs.notes")}
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>{t("leadDetail.recentActivities")}</div>

              {(lead.activities || []).length === 0 ? (
                <div className="muted">{t("leadDetail.noActivities")}</div>
              ) : (
                <div style={{ display: "grid" }}>
                  {(lead.activities || []).map((a: any) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "10px 0",
                        borderBottom: "1px solid var(--stroke-2)",
                      }}
                    >
                      <div className="flex-between" style={{ gap: 10 }}>
                        <div style={{ fontWeight: 800 }}>
                          {safeTranslate(t, `activityTypes.${a.type}`, a.type)}
                          {a.callOutcome ? (
                            <span className="muted">
                              {" "}
                              • {safeTranslate(t, `leadOutcomes.${a.callOutcome}`, a.callOutcome)}
                            </span>
                          ) : null}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {formatDate(a.createdAt, locale)}
                        </div>
                      </div>
                      <div style={{ marginTop: 6 }}>{a.summary}</div>
                      {a.details ? (
                        <div
                          className="muted"
                          style={{ marginTop: 6, whiteSpace: "pre-wrap" }}
                        >
                          {a.details}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div className="card" style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>{t("leadDetail.quickActions")}</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {t("leadDetail.assignments")}
                  </div>
                  <div className="muted">
                    {t("leadDetail.manager")}: <b>{lead.assignedManager?.email || "-"}</b> •{" "}
                    {t("leadDetail.sales")}: <b>{lead.assignedSales?.email || "-"}</b>
                  </div>
                </div>

                {(isCallcenter || isAdmin) ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t("leadDetail.callCenter")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => setStatus("WORKING")} disabled={!canSetWorking}>
                        {t("leadDetail.setWorking")}
                      </button>
                      <button onClick={() => setStatus("SALES_READY")} disabled={!canSetSalesReady}>
                        {t("leadDetail.setSalesReady")}
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        disabled={!isCallcenter}
                      >
                        <option value="">{t("leadDetail.selectManager")}</option>
                        {managers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>

                      <button onClick={sendToManager} disabled={!canSendToManager || !managerId}>
                        {t("leadDetail.sendToManager")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {(isManager || isAdmin) ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t("leadDetail.managerRole")}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={salesId}
                        onChange={(e) => setSalesId(e.target.value)}
                        disabled={!isManager}
                      >
                        <option value="">{t("leadDetail.selectSales")}</option>
                        {sales.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>

                      <button onClick={assignToSales} disabled={!canAssignToSales || !salesId}>
                        {isAssigned
                          ? t("leadDetail.reassign")
                          : t("leadDetail.assign")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {(isSales || isAdmin) ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t("leadDetail.salesRole")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="primary"
                        onClick={() => setStatus("WON")}
                        disabled={!canClose}
                      >
                        {t("leadDetail.markWon")}
                      </button>
                      <button
                        className="danger"
                        onClick={() => setStatus("LOST")}
                        disabled={!canClose}
                      >
                        {t("leadDetail.markLost")}
                      </button>
                    </div>
                    {isClosed ? (
                      <div className="muted">{t("leadDetail.leadClosed")}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="card" style={{ display: "grid", gap: 10 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 900 }}>{t("leadDetail.addActivity")}</div>
                  <button onClick={addActivity} className="primary">
                    {t("common.save")}
                  </button>
                </div>

                <select value={actType} onChange={(e) => setActType(e.target.value)}>
                  <option value="CALL">{t("activityTypes.CALL")}</option>
                  <option value="NOTE">{t("activityTypes.NOTE")}</option>
                  <option value="MEETING">{t("activityTypes.MEETING")}</option>
                  <option value="WHATSAPP">{t("activityTypes.WHATSAPP")}</option>
                  <option value="EMAIL">{t("activityTypes.EMAIL")}</option>
                </select>

                {actType === "CALL" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t("leadDetail.callOutcome")}
                    </div>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value as any)}
                    >
                      {CALL_OUTCOMES.map((o) => (
                        <option key={o.key} value={o.key}>
                          {safeTranslate(t, o.labelKey, o.fallback)}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(24))}>
                        +1{t("leads.dayShort")}
                      </button>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(72))}>
                        +3{t("leads.dayShort")}
                      </button>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(168))}>
                        +7{t("leads.dayShort")}
                      </button>
                      <button type="button" onClick={() => setNextFollowUpAt(presetLocal(3))}>
                        +3{t("leadDetail.hourShort")}
                      </button>
                    </div>
                  </div>
                ) : null}

                <input
                  value={actSummary}
                  onChange={(e) => setActSummary(e.target.value)}
                  placeholder={t("leadDetail.summary")}
                />

                <textarea
                  value={actDetails}
                  onChange={(e) => setActDetails(e.target.value)}
                  rows={3}
                  placeholder={t("leadDetail.notesOptional")}
                />

                <label style={{ display: "grid", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {t("leadDetail.followUpOptional")}
                  </span>
                  <input
                    type="datetime-local"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                  />
                </label>

                <div className="muted" style={{ fontSize: 12 }}>
                  {t("leadDetail.tip")}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}