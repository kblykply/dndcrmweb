"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type PdcaPhase = "PLAN" | "DO" | "CHECK" | "ACT";
type PdcaStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type PdcaPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type PdcaImpactLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type PdcaIssueCategory =
  | "SALES"
  | "MARKETING"
  | "OPERATIONS"
  | "CUSTOMER_SERVICE"
  | "FINANCE"
  | "HR"
  | "PROJECT"
  | "OTHER";

type UserLite = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type PdcaLog = {
  id: string;
  note: string;
  phase?: PdcaPhase | null;
  createdAt: string;
  createdBy?: UserLite | null;
};

type PdcaDetail = {
  id: string;
  title: string;
  problemSummary: string;
  department?: string | null;
  issueCategory?: PdcaIssueCategory | null;
  problemType?: string | null;
  impactLevel?: PdcaImpactLevel | null;
  priority: PdcaPriority;
  phase: PdcaPhase;
  status: PdcaStatus;
  ownerId?: string | null;
  assignedToId?: string | null;
  createdById: string;
  owner?: UserLite | null;
  assignedTo?: UserLite | null;
  createdBy?: UserLite | null;
  rootCause?: string | null;
  targetResult?: string | null;
  actionPlan?: string | null;
  doNotes?: string | null;
  checkResult?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  finalDecision?: string | null;
  dueAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  logs: PdcaLog[];
};

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function phaseBadgeClass(phase?: string) {
  if (phase === "PLAN") return "warning";
  if (phase === "DO") return "info";
  if (phase === "CHECK") return "";
  if (phase === "ACT") return "success";
  return "";
}

function statusBadgeClass(status?: string) {
  if (status === "DONE") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "OPEN") return "info";
  return "";
}

function priorityBadgeClass(priority?: string) {
  if (priority === "URGENT") return "danger";
  if (priority === "HIGH") return "warning";
  if (priority === "MEDIUM") return "info";
  return "";
}

export default function PdcaDetailPage() {
  const { t, locale } = useLanguage();
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [item, setItem] = useState<PdcaDetail | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [problemSummary, setProblemSummary] = useState("");
  const [department, setDepartment] = useState("");
  const [problemType, setProblemType] = useState("");
  const [issueCategory, setIssueCategory] = useState<"" | PdcaIssueCategory>("");
  const [impactLevel, setImpactLevel] = useState<"" | PdcaImpactLevel>("");
  const [priority, setPriority] = useState<PdcaPriority>("MEDIUM");
  const [phase, setPhase] = useState<PdcaPhase>("PLAN");
  const [status, setStatus] = useState<PdcaStatus>("OPEN");
  const [ownerId, setOwnerId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [targetResult, setTargetResult] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [doNotes, setDoNotes] = useState("");
  const [checkResult, setCheckResult] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [finalDecision, setFinalDecision] = useState("");
  const [newLog, setNewLog] = useState("");
  const [newLogPhase, setNewLogPhase] = useState<"" | PdcaPhase>("");

  const role = me?.role as string | undefined;
  const canEdit =
    role === "ADMIN" ||
    role === "MANAGER" ||
    item?.createdById === me?.id ||
    item?.ownerId === me?.id ||
    item?.assignedToId === me?.id;

  const canCancel = role === "ADMIN" || role === "MANAGER";
  const canClose =
    role === "ADMIN" ||
    role === "MANAGER" ||
    item?.createdById === me?.id ||
    item?.ownerId === me?.id;

  function formatDateTime(v?: string | null) {
    if (!v) return "-";
    return new Date(v).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
  }

  function toDatetimeLocalValue(v?: string | null) {
    if (!v) return "";
    const d = new Date(v);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  }

  function phaseLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `pdca.phases.${value}`, value);
  }

  function statusLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `pdca.statuses.${value}`, value);
  }

  function priorityLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `taskPriorities.${value}`, value);
  }

  function impactLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `pdca.impactLevels.${value}`, value);
  }

  function categoryLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `pdca.issueCategories.${value}`, value);
  }

  async function load() {
    if (!id) {
      setErr("PDCA case id is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const data = await authedFetch(`/pdca/${id}`);
      setItem(data);

      setTitle(data.title || "");
      setProblemSummary(data.problemSummary || "");
      setDepartment(data.department || "");
      setProblemType(data.problemType || "");
      setIssueCategory(data.issueCategory || "");
      setImpactLevel(data.impactLevel || "");
      setPriority(data.priority || "MEDIUM");
      setPhase(data.phase || "PLAN");
      setStatus(data.status || "OPEN");
      setOwnerId(data.ownerId || "");
      setAssignedToId(data.assignedToId || "");
      setDueAt(toDatetimeLocalValue(data.dueAt));
      setRootCause(data.rootCause || "");
      setTargetResult(data.targetResult || "");
      setActionPlan(data.actionPlan || "");
      setDoNotes(data.doNotes || "");
      setCheckResult(data.checkResult || "");
      setCorrectiveAction(data.correctiveAction || "");
      setPreventiveAction(data.preventiveAction || "");
      setFinalDecision(data.finalDecision || "");
    } catch (e: any) {
      setItem(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const [managerRes, salesRes, callcenterRes] = await Promise.all([
        authedFetch("/users?role=MANAGER"),
        authedFetch("/users?role=SALES"),
        authedFetch("/users?role=CALLCENTER"),
      ]);

      const allUsers = [
        ...(Array.isArray(managerRes) ? managerRes : []),
        ...(Array.isArray(salesRes) ? salesRes : []),
        ...(Array.isArray(callcenterRes) ? callcenterRes : []),
      ];

      const map = new Map<string, UserLite>();
      allUsers.forEach((u: UserLite) => map.set(u.id, u));
      setUsers(Array.from(map.values()));
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function saveCase() {
    if (!item || !canEdit) return;

    setSaving(true);
    setErr(null);

    try {
      await authedFetch(`/pdca/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          problemSummary: problemSummary.trim(),
          department: department.trim() || null,
          problemType: problemType.trim() || null,
          issueCategory: issueCategory || null,
          impactLevel: impactLevel || null,
          priority,
          phase,
          status,
          ownerId: ownerId || null,
          assignedToId: assignedToId || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          rootCause: rootCause.trim() || null,
          targetResult: targetResult.trim() || null,
          actionPlan: actionPlan.trim() || null,
          doNotes: doNotes.trim() || null,
          checkResult: checkResult.trim() || null,
          correctiveAction: correctiveAction.trim() || null,
          preventiveAction: preventiveAction.trim() || null,
          finalDecision: finalDecision.trim() || null,
        }),
      });

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function movePhase(nextPhase: PdcaPhase) {
    if (!item || !canEdit) return;

    setSaving(true);
    setErr(null);

    try {
      await authedFetch(`/pdca/${item.id}/phase`, {
        method: "PATCH",
        body: JSON.stringify({ phase: nextPhase }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function addLog() {
    if (!item || !newLog.trim()) return;

    setSaving(true);
    setErr(null);

    try {
      await authedFetch(`/pdca/${item.id}/logs`, {
        method: "POST",
        body: JSON.stringify({
          note: newLog.trim(),
          phase: newLogPhase || null,
        }),
      });

      setNewLog("");
      setNewLogPhase("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function closeCase() {
    if (!item || !canClose) return;

    setSaving(true);
    setErr(null);

    try {
      await authedFetch(`/pdca/${item.id}/close`, {
        method: "PATCH",
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function cancelCase() {
    if (!item || !canCancel) return;
    const ok = window.confirm(
      locale === "tr"
        ? "Bu PDCA kaydını iptal etmek istiyor musunuz?"
        : "Do you want to cancel this PDCA case?",
    );
    if (!ok) return;

    setSaving(true);
    setErr(null);

    try {
      await authedFetch(`/pdca/${item.id}/cancel`, {
        method: "PATCH",
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, id]);

  const stats = useMemo(() => {
    return {
      logs: item?.logs?.length || 0,
      isClosed: item?.status === "DONE" || item?.status === "CANCELLED",
    };
  }, [item]);

  if (!mounted) return <div>{t("common.loading")}</div>;
  if (loading) return <div className="card">{t("common.loading")}</div>;

  if (!item) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {safeTranslate(t, "pdca.notFound", locale === "tr" ? "PDCA bulunamadı" : "PDCA not found")}
        </div>
        <div className="muted">{err || "-"}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <Link href="/pdca" style={{ fontWeight: 800 }}>
            ← {safeTranslate(t, "pdca.backToList", locale === "tr" ? "PDCA listesine dön" : "Back to PDCA")}
          </Link>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{item.title}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(t, "pdca.createdBy", locale === "tr" ? "Oluşturan" : "Created by")}:{" "}
            {item.createdBy?.name || "-"} • {safeTranslate(t, "pdca.updatedAt", locale === "tr" ? "Güncellendi" : "Updated")}:{" "}
            {formatDateTime(item.updatedAt)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`badge ${phaseBadgeClass(item.phase)}`}>{phaseLabel(item.phase)}</span>
          <span className={`badge ${statusBadgeClass(item.status)}`}>{statusLabel(item.status)}</span>
          <span className={`badge ${priorityBadgeClass(item.priority)}`}>{priorityLabel(item.priority)}</span>
        </div>
      </div>

      {err ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(239,68,68,.35)",
            background: "rgba(239,68,68,.08)",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="muted">{safeTranslate(t, "pdca.stats.phase", locale === "tr" ? "Faz" : "Phase")}</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{phaseLabel(item.phase)}</div>
        </div>
        <div className="card">
          <div className="muted">{safeTranslate(t, "pdca.stats.status", locale === "tr" ? "Durum" : "Status")}</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{statusLabel(item.status)}</div>
        </div>
        <div className="card">
          <div className="muted">{safeTranslate(t, "pdca.stats.dueAt", locale === "tr" ? "Termin" : "Due")}</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{formatDateTime(item.dueAt)}</div>
        </div>
        <div className="card">
          <div className="muted">{safeTranslate(t, "pdca.stats.logs", locale === "tr" ? "Log" : "Logs")}</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.logs}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(t, "pdca.caseInfo", locale === "tr" ? "PDCA Bilgileri" : "PDCA Information")}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canEdit ? (
              <>
                <button onClick={() => movePhase("PLAN")} disabled={saving || phase === "PLAN"}>
                  PLAN
                </button>
                <button onClick={() => movePhase("DO")} disabled={saving || phase === "DO"}>
                  DO
                </button>
                <button onClick={() => movePhase("CHECK")} disabled={saving || phase === "CHECK"}>
                  CHECK
                </button>
                <button onClick={() => movePhase("ACT")} disabled={saving || phase === "ACT"}>
                  ACT
                </button>
              </>
            ) : null}

            {canClose && item.status !== "DONE" ? (
              <button className="primary" onClick={closeCase} disabled={saving}>
                {safeTranslate(t, "pdca.closeCase", locale === "tr" ? "Vakayı Kapat" : "Close Case")}
              </button>
            ) : null}

            {canCancel && item.status !== "CANCELLED" ? (
              <button className="danger" onClick={cancelCase} disabled={saving}>
                {safeTranslate(t, "pdca.cancelCase", locale === "tr" ? "İptal Et" : "Cancel")}
              </button>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
            placeholder={safeTranslate(t, "pdca.fields.title", locale === "tr" ? "Başlık" : "Title")}
          />

          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!canEdit}
            placeholder={safeTranslate(t, "pdca.fields.department", locale === "tr" ? "Departman" : "Department")}
          />

          <input
            value={problemType}
            onChange={(e) => setProblemType(e.target.value)}
            disabled={!canEdit}
            placeholder={safeTranslate(t, "pdca.fields.problemType", locale === "tr" ? "Problem tipi" : "Problem type")}
          />

          <select value={issueCategory} onChange={(e) => setIssueCategory(e.target.value as any)} disabled={!canEdit}>
            <option value="">{safeTranslate(t, "pdca.fields.issueCategory", locale === "tr" ? "Kategori" : "Category")}</option>
            <option value="SALES">{categoryLabel("SALES")}</option>
            <option value="MARKETING">{categoryLabel("MARKETING")}</option>
            <option value="OPERATIONS">{categoryLabel("OPERATIONS")}</option>
            <option value="CUSTOMER_SERVICE">{categoryLabel("CUSTOMER_SERVICE")}</option>
            <option value="FINANCE">{categoryLabel("FINANCE")}</option>
            <option value="HR">{categoryLabel("HR")}</option>
            <option value="PROJECT">{categoryLabel("PROJECT")}</option>
            <option value="OTHER">{categoryLabel("OTHER")}</option>
          </select>

          <select value={impactLevel} onChange={(e) => setImpactLevel(e.target.value as any)} disabled={!canEdit}>
            <option value="">{safeTranslate(t, "pdca.fields.impactLevel", locale === "tr" ? "Etki seviyesi" : "Impact level")}</option>
            <option value="LOW">{impactLabel("LOW")}</option>
            <option value="MEDIUM">{impactLabel("MEDIUM")}</option>
            <option value="HIGH">{impactLabel("HIGH")}</option>
            <option value="CRITICAL">{impactLabel("CRITICAL")}</option>
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value as PdcaPriority)} disabled={!canEdit}>
            <option value="LOW">{priorityLabel("LOW")}</option>
            <option value="MEDIUM">{priorityLabel("MEDIUM")}</option>
            <option value="HIGH">{priorityLabel("HIGH")}</option>
            <option value="URGENT">{priorityLabel("URGENT")}</option>
          </select>

          <select value={phase} onChange={(e) => setPhase(e.target.value as PdcaPhase)} disabled={!canEdit}>
            <option value="PLAN">{phaseLabel("PLAN")}</option>
            <option value="DO">{phaseLabel("DO")}</option>
            <option value="CHECK">{phaseLabel("CHECK")}</option>
            <option value="ACT">{phaseLabel("ACT")}</option>
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value as PdcaStatus)} disabled={!canEdit}>
            <option value="OPEN">{statusLabel("OPEN")}</option>
            <option value="IN_PROGRESS">{statusLabel("IN_PROGRESS")}</option>
            <option value="DONE">{statusLabel("DONE")}</option>
            <option value="CANCELLED">{statusLabel("CANCELLED")}</option>
          </select>

          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} disabled={!canEdit} />

          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit || loadingUsers}>
            <option value="">{safeTranslate(t, "pdca.fields.owner", locale === "tr" ? "Sorumlu seç" : "Select owner")}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} disabled={!canEdit || loadingUsers}>
            <option value="">{safeTranslate(t, "pdca.fields.assignedTo", locale === "tr" ? "Atanan kişi" : "Assigned to")}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <div className="card" style={{ padding: 12 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {safeTranslate(t, "pdca.createdBy", locale === "tr" ? "Oluşturan" : "Created by")}
            </div>
            <div style={{ fontWeight: 800 }}>{item.createdBy?.name || "-"}</div>
          </div>
        </div>

        <textarea
          value={problemSummary}
          onChange={(e) => setProblemSummary(e.target.value)}
          disabled={!canEdit}
          placeholder={safeTranslate(t, "pdca.fields.problemSummary", locale === "tr" ? "Problem özeti" : "Problem summary")}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.rootCause", locale === "tr" ? "Kök neden" : "Root cause")} />
          <textarea value={targetResult} onChange={(e) => setTargetResult(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.targetResult", locale === "tr" ? "Hedef sonuç" : "Target result")} />
          <textarea value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.actionPlan", locale === "tr" ? "Aksiyon planı" : "Action plan")} />
          <textarea value={doNotes} onChange={(e) => setDoNotes(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.doNotes", locale === "tr" ? "DO notları" : "DO notes")} />
          <textarea value={checkResult} onChange={(e) => setCheckResult(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.checkResult", locale === "tr" ? "CHECK sonucu" : "CHECK result")} />
          <textarea value={finalDecision} onChange={(e) => setFinalDecision(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.finalDecision", locale === "tr" ? "Final karar" : "Final decision")} />
          <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.correctiveAction", locale === "tr" ? "Düzeltici aksiyon" : "Corrective action")} />
          <textarea value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} disabled={!canEdit} placeholder={safeTranslate(t, "pdca.fields.preventiveAction", locale === "tr" ? "Önleyici aksiyon" : "Preventive action")} />
        </div>

        {canEdit ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="primary" onClick={saveCase} disabled={saving || !title.trim() || !problemSummary.trim()}>
              {saving
                ? safeTranslate(t, "common.saving", locale === "tr" ? "Kaydediliyor..." : "Saving...")
                : safeTranslate(t, "common.save", locale === "tr" ? "Kaydet" : "Save")}
            </button>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(t, "pdca.timeline", locale === "tr" ? "PDCA Aşamaları" : "PDCA Timeline")}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {(["PLAN", "DO", "CHECK", "ACT"] as PdcaPhase[]).map((step) => (
              <div
                key={step}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 14,
                  padding: 12,
                  background: phase === step ? "var(--surface-2)" : "var(--surface)",
                }}
              >
                <div className="flex-between" style={{ gap: 10 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800 }}>{phaseLabel(step)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {phase === step
                        ? safeTranslate(t, "pdca.currentPhase", locale === "tr" ? "Mevcut aşama" : "Current phase")
                        : safeTranslate(t, "pdca.phaseStep", locale === "tr" ? "Aşama" : "Step")}
                    </div>
                  </div>

                  <span className={`badge ${phaseBadgeClass(step)}`}>{phaseLabel(step)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(t, "pdca.logs", locale === "tr" ? "Loglar" : "Logs")}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <textarea
              value={newLog}
              onChange={(e) => setNewLog(e.target.value)}
              placeholder={safeTranslate(t, "pdca.addLogPlaceholder", locale === "tr" ? "Yeni log ekle..." : "Add a new log...")}
              disabled={!canEdit}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={newLogPhase}
                onChange={(e) => setNewLogPhase(e.target.value as "" | PdcaPhase)}
                disabled={!canEdit}
              >
                <option value="">
                  {safeTranslate(t, "pdca.optionalPhase", locale === "tr" ? "Opsiyonel faz" : "Optional phase")}
                </option>
                <option value="PLAN">{phaseLabel("PLAN")}</option>
                <option value="DO">{phaseLabel("DO")}</option>
                <option value="CHECK">{phaseLabel("CHECK")}</option>
                <option value="ACT">{phaseLabel("ACT")}</option>
              </select>

              <button className="primary" onClick={addLog} disabled={!canEdit || saving || !newLog.trim()}>
                {safeTranslate(t, "pdca.addLog", locale === "tr" ? "Log Ekle" : "Add Log")}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {item.logs.length === 0 ? (
              <div className="muted">
                {safeTranslate(t, "pdca.noLogs", locale === "tr" ? "Henüz log yok." : "No logs yet.")}
              </div>
            ) : (
              item.logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: "1px solid var(--stroke)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--surface-2)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontWeight: 800 }}>{log.createdBy?.name || "-"}</div>
                      {log.phase ? (
                        <span className={`badge ${phaseBadgeClass(log.phase)}`}>{phaseLabel(log.phase)}</span>
                      ) : null}
                    </div>

                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatDateTime(log.createdAt)}
                    </div>
                  </div>

                  <div style={{ whiteSpace: "pre-wrap" }}>{log.note}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}