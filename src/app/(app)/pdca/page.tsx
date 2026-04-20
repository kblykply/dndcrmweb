"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type PdcaRow = {
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
  dueAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  owner?: UserLite | null;
  assignedTo?: UserLite | null;
  createdBy?: UserLite | null;
  _count?: {
    logs: number;
  };
};

type PdcaListResponse = {
  items: PdcaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PHASE_OPTIONS: Array<"ALL" | PdcaPhase> = ["ALL", "PLAN", "DO", "CHECK", "ACT"];
const STATUS_OPTIONS: Array<"ALL" | PdcaStatus> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];
const PRIORITY_OPTIONS: Array<"ALL" | PdcaPriority> = [
  "ALL",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];
const IMPACT_OPTIONS: Array<"ALL" | PdcaImpactLevel> = [
  "ALL",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];
const CATEGORY_OPTIONS: Array<"ALL" | PdcaIssueCategory> = [
  "ALL",
  "SALES",
  "MARKETING",
  "OPERATIONS",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "HR",
  "PROJECT",
  "OTHER",
];

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

export default function PdcaPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [items, setItems] = useState<PdcaRow[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [phase, setPhase] = useState<"ALL" | PdcaPhase>("ALL");
  const [status, setStatus] = useState<"ALL" | PdcaStatus>("ALL");
  const [priority, setPriority] = useState<"ALL" | PdcaPriority>("ALL");
  const [impactLevel, setImpactLevel] = useState<"ALL" | PdcaImpactLevel>("ALL");
  const [issueCategory, setIssueCategory] = useState<"ALL" | PdcaIssueCategory>("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [problemSummary, setProblemSummary] = useState("");
  const [department, setDepartment] = useState("");
  const [problemType, setProblemType] = useState("");
  const [formIssueCategory, setFormIssueCategory] = useState<"" | PdcaIssueCategory>("");
  const [formImpactLevel, setFormImpactLevel] = useState<"" | PdcaImpactLevel>("");
  const [formPriority, setFormPriority] = useState<PdcaPriority>("MEDIUM");
  const [formPhase, setFormPhase] = useState<PdcaPhase>("PLAN");
  const [ownerId, setOwnerId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [targetResult, setTargetResult] = useState("");
  const [actionPlan, setActionPlan] = useState("");

  const role = me?.role as string | undefined;
  const canCreate =
    role === "ADMIN" || role === "MANAGER" || role === "SALES" || role === "CALLCENTER";

  function formatDateTime(v?: string | null) {
    if (!v) return "-";
    return new Date(v).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
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

  async function load(
    nextPage = page,
    nextQ = q,
    nextPageSize = pageSize,
    nextPhase = phase,
    nextStatus = status,
    nextPriority = priority,
    nextImpactLevel = impactLevel,
    nextIssueCategory = issueCategory,
  ) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextPhase !== "ALL") params.set("phase", nextPhase);
      if (nextStatus !== "ALL") params.set("status", nextStatus);
      if (nextPriority !== "ALL") params.set("priority", nextPriority);
      if (nextImpactLevel !== "ALL") params.set("impactLevel", nextImpactLevel);
      if (nextIssueCategory !== "ALL") params.set("issueCategory", nextIssueCategory);

      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));

      const res = (await authedFetch(`/pdca?${params.toString()}`)) as PdcaListResponse;

      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total || 0);
      setPage(res?.page || nextPage);
      setPageSize(res?.pageSize || nextPageSize);
      setTotalPages(res?.totalPages || 1);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    if (!canCreate) return;

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

  async function createCase() {
    if (!title.trim() || !problemSummary.trim()) return;

    setErr(null);
    setSaving(true);

    try {
      await authedFetch("/pdca", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          problemSummary: problemSummary.trim(),
          department: department.trim() || undefined,
          problemType: problemType.trim() || undefined,
          issueCategory: formIssueCategory || undefined,
          impactLevel: formImpactLevel || undefined,
          priority: formPriority,
          phase: formPhase,
          ownerId: ownerId || undefined,
          assignedToId: assignedToId || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          rootCause: rootCause.trim() || undefined,
          targetResult: targetResult.trim() || undefined,
          actionPlan: actionPlan.trim() || undefined,
        }),
      });

      setTitle("");
      setProblemSummary("");
      setDepartment("");
      setProblemType("");
      setFormIssueCategory("");
      setFormImpactLevel("");
      setFormPriority("MEDIUM");
      setFormPhase("PLAN");
      setOwnerId("");
      setAssignedToId("");
      setDueAt("");
      setRootCause("");
      setTargetResult("");
      setActionPlan("");
      setShowCreate(false);

      await load(1, q, pageSize, phase, status, priority, impactLevel, issueCategory);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  function runSearch() {
    const nextQ = searchInput.trim();
    setQ(nextQ);
    load(1, nextQ, pageSize, phase, status, priority, impactLevel, issueCategory);
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load(1, q, pageSize, phase, status, priority, impactLevel, issueCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, canCreate]);

  const pageInfo = useMemo(() => {
    if (!total) return t("common.noRecords");
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} / ${total}`;
  }, [page, pageSize, total, t]);

  const stats = useMemo(() => {
    return {
      total,
      plan: items.filter((x) => x.phase === "PLAN").length,
      doing: items.filter((x) => x.phase === "DO").length,
      check: items.filter((x) => x.phase === "CHECK").length,
      act: items.filter((x) => x.phase === "ACT").length,
      open: items.filter((x) => x.status === "OPEN" || x.status === "IN_PROGRESS").length,
    };
  }, [items, total]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {safeTranslate(
              t,
              "pdca.label",
              locale === "tr" ? "Problem Çözme Sistemi" : "Problem Solving System",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {safeTranslate(t, "pdca.title", "PDCA")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "pdca.subtitle",
              locale === "tr"
                ? "PLAN • DO • CHECK • ACT süreçlerini tek ekranda yönetin."
                : "Manage PLAN • DO • CHECK • ACT processes in one place.",
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => load(page, q, pageSize, phase, status, priority, impactLevel, issueCategory)}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          {canCreate ? (
            <button className="primary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate
                ? t("common.close")
                : safeTranslate(t, "pdca.newCase", locale === "tr" ? "Yeni PDCA" : "New PDCA")}
            </button>
          ) : null}
        </div>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "pdca.createTitle",
              locale === "tr" ? "Yeni PDCA Kaydı" : "Create PDCA Case",
            )}
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
              placeholder={safeTranslate(t, "pdca.fields.title", locale === "tr" ? "Başlık" : "Title")}
            />

            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={safeTranslate(
                t,
                "pdca.fields.department",
                locale === "tr" ? "Departman" : "Department",
              )}
            />

            <input
              value={problemType}
              onChange={(e) => setProblemType(e.target.value)}
              placeholder={safeTranslate(
                t,
                "pdca.fields.problemType",
                locale === "tr" ? "Problem Tipi" : "Problem Type",
              )}
            />

            <select
              value={formIssueCategory}
              onChange={(e) => setFormIssueCategory(e.target.value as "" | PdcaIssueCategory)}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "pdca.fields.issueCategory",
                  locale === "tr" ? "Kategori Seç" : "Select Category",
                )}
              </option>
              {CATEGORY_OPTIONS.filter((x) => x !== "ALL").map((option) => (
                <option key={option} value={option}>
                  {categoryLabel(option)}
                </option>
              ))}
            </select>

            <select
              value={formImpactLevel}
              onChange={(e) => setFormImpactLevel(e.target.value as "" | PdcaImpactLevel)}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "pdca.fields.impactLevel",
                  locale === "tr" ? "Etki Seviyesi" : "Impact Level",
                )}
              </option>
              {IMPACT_OPTIONS.filter((x) => x !== "ALL").map((option) => (
                <option key={option} value={option}>
                  {impactLabel(option)}
                </option>
              ))}
            </select>

            <select
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value as PdcaPriority)}
            >
              {PRIORITY_OPTIONS.filter((x) => x !== "ALL").map((option) => (
                <option key={option} value={option}>
                  {priorityLabel(option)}
                </option>
              ))}
            </select>

            <select
              value={formPhase}
              onChange={(e) => setFormPhase(e.target.value as PdcaPhase)}
            >
              {PHASE_OPTIONS.filter((x) => x !== "ALL").map((option) => (
                <option key={option} value={option}>
                  {phaseLabel(option)}
                </option>
              ))}
            </select>

            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "pdca.fields.owner",
                  locale === "tr" ? "Sorumlu Seç" : "Select Owner",
                )}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>

            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "pdca.fields.assignedTo",
                  locale === "tr" ? "Atanan Kişi" : "Assigned To",
                )}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>

            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>

          <textarea
            value={problemSummary}
            onChange={(e) => setProblemSummary(e.target.value)}
            placeholder={safeTranslate(
              t,
              "pdca.fields.problemSummary",
              locale === "tr" ? "Problem Özeti" : "Problem Summary",
            )}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder={safeTranslate(
                t,
                "pdca.fields.rootCause",
                locale === "tr" ? "Kök Neden" : "Root Cause",
              )}
            />
            <textarea
              value={targetResult}
              onChange={(e) => setTargetResult(e.target.value)}
              placeholder={safeTranslate(
                t,
                "pdca.fields.targetResult",
                locale === "tr" ? "Hedef Sonuç" : "Target Result",
              )}
            />
            <textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder={safeTranslate(
                t,
                "pdca.fields.actionPlan",
                locale === "tr" ? "Aksiyon Planı" : "Action Plan",
              )}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowCreate(false)}>{t("common.cancel")}</button>
            <button
              className="primary"
              onClick={createCase}
              disabled={saving || !title.trim() || !problemSummary.trim()}
            >
              {saving
                ? safeTranslate(t, "pdca.creating", locale === "tr" ? "Oluşturuluyor..." : "Creating...")
                : safeTranslate(t, "pdca.createCase", locale === "tr" ? "PDCA Oluştur" : "Create PDCA")}
            </button>
          </div>
        </div>
      ) : null}

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
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="muted">{safeTranslate(t, "pdca.stats.total", locale === "tr" ? "Toplam" : "Total")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.total}</div>
        </div>
        <div className="card">
          <div className="muted">{phaseLabel("PLAN")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.plan}</div>
        </div>
        <div className="card">
          <div className="muted">{phaseLabel("DO")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.doing}</div>
        </div>
        <div className="card">
          <div className="muted">{phaseLabel("CHECK")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.check}</div>
        </div>
        <div className="card">
          <div className="muted">{phaseLabel("ACT")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.act}</div>
        </div>
        <div className="card">
          <div className="muted">{safeTranslate(t, "pdca.stats.open", locale === "tr" ? "Açık" : "Open")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.open}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr repeat(5, minmax(0, 1fr)) auto",
            gap: 10,
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={safeTranslate(
              t,
              "pdca.searchPlaceholder",
              locale === "tr"
                ? "Başlık, problem, departman, kişi ara..."
                : "Search title, problem, department, person...",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />

          <select value={phase} onChange={(e) => setPhase(e.target.value as "ALL" | PdcaPhase)}>
            {PHASE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? safeTranslate(t, "pdca.filters.allPhases", locale === "tr" ? "Tüm Fazlar" : "All Phases")
                  : phaseLabel(option)}
              </option>
            ))}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value as "ALL" | PdcaStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? safeTranslate(t, "pdca.filters.allStatuses", locale === "tr" ? "Tüm Durumlar" : "All Statuses")
                  : statusLabel(option)}
              </option>
            ))}
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value as "ALL" | PdcaPriority)}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? safeTranslate(t, "pdca.filters.allPriorities", locale === "tr" ? "Tüm Öncelikler" : "All Priorities")
                  : priorityLabel(option)}
              </option>
            ))}
          </select>

          <select value={impactLevel} onChange={(e) => setImpactLevel(e.target.value as "ALL" | PdcaImpactLevel)}>
            {IMPACT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? safeTranslate(
                      t,
                      "pdca.filters.allImpactLevels",
                      locale === "tr" ? "Tüm Etki Seviyeleri" : "All Impact Levels",
                    )
                  : impactLabel(option)}
              </option>
            ))}
          </select>

          <select value={issueCategory} onChange={(e) => setIssueCategory(e.target.value as "ALL" | PdcaIssueCategory)}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL"
                  ? safeTranslate(
                      t,
                      "pdca.filters.allCategories",
                      locale === "tr" ? "Tüm Kategoriler" : "All Categories",
                    )
                  : categoryLabel(option)}
              </option>
            ))}
          </select>

          <button onClick={runSearch} disabled={loading}>
            {safeTranslate(
              t,
              "pdca.searchAndRefresh",
              locale === "tr" ? "Ara / Yenile" : "Search / Refresh",
            )}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>{safeTranslate(t, "pdca.table.case", locale === "tr" ? "Kayıt" : "Case")}</th>
              <th>{safeTranslate(t, "pdca.table.phase", locale === "tr" ? "Faz" : "Phase")}</th>
              <th>{safeTranslate(t, "pdca.table.status", locale === "tr" ? "Durum" : "Status")}</th>
              <th>{safeTranslate(t, "pdca.table.priority", locale === "tr" ? "Öncelik" : "Priority")}</th>
              <th>{safeTranslate(t, "pdca.table.owner", locale === "tr" ? "Sorumlu" : "Owner")}</th>
              <th>{safeTranslate(t, "pdca.table.assignedTo", locale === "tr" ? "Atanan" : "Assigned To")}</th>
              <th>{safeTranslate(t, "pdca.table.dueAt", locale === "tr" ? "Termin" : "Due")}</th>
              <th>{safeTranslate(t, "pdca.table.logs", locale === "tr" ? "Log" : "Logs")}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <Link href={`/pdca/${item.id}`} style={{ fontWeight: 900 }}>
                      {item.title}
                    </Link>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      {item.problemSummary}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                      {item.department ? <span>{item.department}</span> : null}
                      {item.issueCategory ? <span>{categoryLabel(item.issueCategory)}</span> : null}
                      {item.impactLevel ? <span>{impactLabel(item.impactLevel)}</span> : null}
                    </div>
                  </div>
                </td>

                <td>
                  <span className={`badge ${phaseBadgeClass(item.phase)}`}>
                    {phaseLabel(item.phase)}
                  </span>
                </td>

                <td>
                  <span className={`badge ${statusBadgeClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>

                <td>
                  <span className={`badge ${priorityBadgeClass(item.priority)}`}>
                    {priorityLabel(item.priority)}
                  </span>
                </td>

                <td>{item.owner?.name || "-"}</td>
                <td>{item.assignedTo?.name || "-"}</td>
                <td>{formatDateTime(item.dueAt)}</td>
                <td>{item._count?.logs ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {safeTranslate(
              t,
              "pdca.noCases",
              locale === "tr" ? "PDCA kaydı bulunamadı." : "No PDCA cases found.",
            )}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="muted" style={{ fontSize: 13 }}>{pageInfo}</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() =>
                load(Math.max(1, page - 1), q, pageSize, phase, status, priority, impactLevel, issueCategory)
              }
              disabled={page <= 1 || loading}
            >
              {t("common.previous")}
            </button>

            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {safeTranslate(t, "common.page", locale === "tr" ? "Sayfa" : "Page")} {page} / {totalPages}
            </span>

            <button
              onClick={() =>
                load(Math.min(totalPages, page + 1), q, pageSize, phase, status, priority, impactLevel, issueCategory)
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