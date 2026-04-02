"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type TaskTab = "my" | "team";

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

type LeadLite = {
  id: string;
  fullName: string;
  phone?: string | null;
  status?: string | null;
};

type AgencyLite = {
  id: string;
  name: string;
};

type CustomerLite = {
  id: string;
  fullName: string;
  companyName?: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  assignedToId?: string | null;
  createdById?: string | null;
  assignedTo?: UserRow | null;
  createdBy?: UserRow | null;
  lead?: LeadLite | null;
  agency?: AgencyLite | null;
  customer?: CustomerLite | null;
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

function statusBadgeClass(status?: string) {
  if (status === "DONE") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "IN_PROGRESS") return "warning";
  return "info";
}

function priorityBadgeClass(priority?: string) {
  if (priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "info";
}

function toDatetimeLocalValue(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function isOverdue(task?: TaskRow | null) {
  if (!task?.dueAt) return false;
  if (task.status === "DONE" || task.status === "CANCELLED") return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

export default function TasksPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [tab, setTab] = useState<TaskTab>("my");
  const [status, setStatus] = useState<string>("ALL");
  const [q, setQ] = useState("");

  const [myTasks, setMyTasks] = useState<TaskRow[]>([]);
  const [teamTasks, setTeamTasks] = useState<TaskRow[]>([]);

  const [salesUsers, setSalesUsers] = useState<UserRow[]>([]);
  const [callcenterUsers, setCallcenterUsers] = useState<UserRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyLite[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [leads, setLeads] = useState<LeadLite[]>([]);

  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const role = me?.role as string | undefined;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isSales = role === "SALES";
  const canSeeTeam = isAdmin || isManager;
  const canCreate = isAdmin || isManager;

  function formatDateTime(v?: string | null) {
    if (!v) return "-";
    return new Date(v).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
  }

  function statusLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `taskStatuses.${value}`, value);
  }

  function priorityLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `taskPriorities.${value}`, value);
  }

  async function loadMyTasks(nextStatus = status) {
    setLoadingMy(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus !== "ALL") params.set("status", nextStatus);
      if (q.trim()) params.set("search", q.trim());

      const res = await authedFetch(`/tasks/my?${params.toString()}`);
      setMyTasks(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setMyTasks([]);
    } finally {
      setLoadingMy(false);
    }
  }

  async function loadTeamTasks(nextStatus = status) {
    if (!canSeeTeam) {
      setTeamTasks([]);
      return;
    }

    setLoadingTeam(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus !== "ALL") params.set("status", nextStatus);
      if (q.trim()) params.set("search", q.trim());

      const res = await authedFetch(`/tasks?${params.toString()}`);
      setTeamTasks(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setTeamTasks([]);
    } finally {
      setLoadingTeam(false);
    }
  }

  async function loadRefs() {
    if (!canCreate) return;

    setLoadingRefs(true);
    try {
      const [salesRes, callcenterRes, agenciesRes, customersRes, leadsRes] =
        await Promise.all([
          authedFetch("/users?role=SALES"),
          authedFetch("/users?role=CALLCENTER"),
          authedFetch("/agencies?page=1&pageSize=300"),
          authedFetch("/customers"),
          authedFetch("/leads?page=1&pageSize=300"),
        ]);

      setSalesUsers(Array.isArray(salesRes) ? salesRes : []);
      setCallcenterUsers(Array.isArray(callcenterRes) ? callcenterRes : []);
      setAgencies(Array.isArray(agenciesRes?.items) ? agenciesRes.items : []);
      setCustomers(Array.isArray(customersRes) ? customersRes : []);
      setLeads(Array.isArray(leadsRes?.items) ? leadsRes.items : []);
    } catch {
      setSalesUsers([]);
      setCallcenterUsers([]);
      setAgencies([]);
      setCustomers([]);
      setLeads([]);
    } finally {
      setLoadingRefs(false);
    }
  }

  async function refreshActive(nextStatus = status) {
    if (tab === "team" && canSeeTeam) {
      await loadTeamTasks(nextStatus);
    } else {
      await loadMyTasks(nextStatus);
    }
  }

  async function markDone(taskId: string) {
    setSavingId(taskId);
    setErr(null);
    try {
      await authedFetch(`/tasks/${taskId}/done`, {
        method: "PATCH",
      });

      await Promise.all([
        loadMyTasks(status),
        canSeeTeam ? loadTeamTasks(status) : Promise.resolve(),
      ]);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function cancelTask(taskId: string) {
    setSavingId(taskId);
    setErr(null);
    try {
      await authedFetch(`/tasks/${taskId}/cancel`, {
        method: "PATCH",
      });

      await Promise.all([
        loadMyTasks(status),
        canSeeTeam ? loadTeamTasks(status) : Promise.resolve(),
      ]);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function createTask() {
    if (!title.trim() || !assignedToId) return;

    setCreating(true);
    setErr(null);

    try {
      await authedFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          assignedToId,
          leadId: leadId || null,
          agencyId: agencyId || null,
          customerId: customerId || null,
        }),
      });

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueAt("");
      setAssignedToId("");
      setLeadId("");
      setAgencyId("");
      setCustomerId("");
      setShowCreate(false);

      await Promise.all([
        loadMyTasks(status),
        canSeeTeam ? loadTeamTasks(status) : Promise.resolve(),
      ]);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadMyTasks();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !canSeeTeam) return;
    loadTeamTasks();
  }, [mounted, canSeeTeam]);

  useEffect(() => {
    if (!mounted || !canCreate) return;
    loadRefs();
  }, [mounted, canCreate]);

  useEffect(() => {
    if (!mounted) return;
    refreshActive(status);
  }, [tab, status]);

  const activeTasks = useMemo(() => {
    const source = tab === "team" && canSeeTeam ? teamTasks : myTasks;
    const qq = q.trim().toLowerCase();

    return source.filter((task) => {
      if (!qq) return true;

      const hay = [
        task.title,
        task.description,
        task.lead?.fullName,
        task.lead?.phone,
        task.customer?.fullName,
        task.customer?.companyName,
        task.agency?.name,
        task.assignedTo?.name,
        task.createdBy?.name,
        task.status,
        task.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [tab, canSeeTeam, myTasks, teamTasks, q]);

  const counts = useMemo(() => {
    const source = tab === "team" && canSeeTeam ? teamTasks : myTasks;
    return {
      all: source.length,
      todo: source.filter((x) => x.status === "TODO").length,
      inProgress: source.filter((x) => x.status === "IN_PROGRESS").length,
      done: source.filter((x) => x.status === "DONE").length,
      cancelled: source.filter((x) => x.status === "CANCELLED").length,
      overdue: source.filter((x) => isOverdue(x)).length,
    };
  }, [tab, canSeeTeam, myTasks, teamTasks]);

  const assignableUsers = useMemo(() => {
    return [...salesUsers, ...callcenterUsers].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [salesUsers, callcenterUsers]);

  if (!mounted) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {safeTranslate(
              t,
              "tasks.label",
              locale === "tr" ? "Görev Yönetimi" : "Task Management",
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {safeTranslate(t, "tasks.title", locale === "tr" ? "Görevler" : "Tasks")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "tasks.subtitle",
              locale === "tr"
                ? "Lead, müşteri, ajans ve ekip üyeleriyle ilişkili görevleri yönetin."
                : "Manage tasks related to leads, customers, agencies, and team members.",
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canSeeTeam ? (
            <>
              <button
                className={tab === "my" ? "primary" : ""}
                onClick={() => setTab("my")}
              >
                {safeTranslate(
                  t,
                  "tasks.tabs.my",
                  locale === "tr" ? "Görevlerim" : "My Tasks",
                )}
              </button>
              <button
                className={tab === "team" ? "primary" : ""}
                onClick={() => setTab("team")}
              >
                {safeTranslate(
                  t,
                  "tasks.tabs.team",
                  locale === "tr" ? "Tüm Görevler" : "All Tasks",
                )}
              </button>
            </>
          ) : null}

          {canCreate ? (
            <button
              className="primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate
                ? safeTranslate(t, "common.close", locale === "tr" ? "Kapat" : "Close")
                : safeTranslate(
                    t,
                    "tasks.newTask",
                    locale === "tr" ? "Yeni Görev" : "New Task",
                  )}
            </button>
          ) : null}

          <button onClick={() => refreshActive(status)} disabled={loadingMy || loadingTeam}>
            {loadingMy || loadingTeam ? t("common.loading") : t("common.refresh")}
          </button>
        </div>
      </div>

      {showCreate && canCreate ? (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "tasks.createTitle",
              locale === "tr" ? "Yeni Görev Oluştur" : "Create New Task",
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
              placeholder={safeTranslate(
                t,
                "tasks.fields.title",
                locale === "tr" ? "Görev başlığı" : "Task title",
              )}
            />

            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={loadingRefs}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "tasks.fields.selectAssignee",
                  locale === "tr" ? "Atanacak kişi seç" : "Select assignee",
                )}
              </option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role ? `(${u.role})` : ""}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="LOW">{priorityLabel("LOW")}</option>
              <option value="MEDIUM">{priorityLabel("MEDIUM")}</option>
              <option value="HIGH">{priorityLabel("HIGH")}</option>
            </select>

            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />

            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              disabled={loadingRefs}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "tasks.fields.selectLead",
                  locale === "tr" ? "Lead seç" : "Select lead",
                )}
              </option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName}
                </option>
              ))}
            </select>

            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={loadingRefs}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "tasks.fields.selectCustomer",
                  locale === "tr" ? "Müşteri seç" : "Select customer",
                )}
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName}
                </option>
              ))}
            </select>

            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              disabled={loadingRefs}
            >
              <option value="">
                {safeTranslate(
                  t,
                  "tasks.fields.selectAgency",
                  locale === "tr" ? "Ajans seç" : "Select agency",
                )}
              </option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={safeTranslate(
              t,
              "tasks.fields.description",
              locale === "tr" ? "Açıklama" : "Description",
            )}
          />

          <div
            style={{
              border: "1px solid var(--stroke)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface-2)",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            {safeTranslate(
              t,
              "tasks.createHint",
              locale === "tr"
                ? "Aynı görevi lead + müşteri + ajans ile birlikte ilişkilendirebilirsiniz. Görev bir sales veya call center kullanıcısına atanabilir."
                : "You can link the same task to a lead, customer, and agency together. A task can be assigned to a sales or call center user.",
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowCreate(false)}>
              {safeTranslate(t, "common.cancel", locale === "tr" ? "Vazgeç" : "Cancel")}
            </button>
            <button
              className="primary"
              onClick={createTask}
              disabled={creating || !title.trim() || !assignedToId}
            >
              {creating
                ? safeTranslate(
                    t,
                    "tasks.creating",
                    locale === "tr" ? "Oluşturuluyor..." : "Creating...",
                  )
                : safeTranslate(
                    t,
                    "tasks.createTask",
                    locale === "tr" ? "Görev Oluştur" : "Create Task",
                  )}
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
          <div className="muted">
            {safeTranslate(t, "tasks.stats.total", locale === "tr" ? "Toplam" : "Total")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{counts.all}</div>
        </div>
        <div className="card">
          <div className="muted">{statusLabel("TODO")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{counts.todo}</div>
        </div>
        <div className="card">
          <div className="muted">{statusLabel("IN_PROGRESS")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{counts.inProgress}</div>
        </div>
        <div className="card">
          <div className="muted">{statusLabel("DONE")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{counts.done}</div>
        </div>
        <div className="card">
          <div className="muted">{statusLabel("CANCELLED")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{counts.cancelled}</div>
        </div>
        <div className="card">
          <div className="muted">
            {safeTranslate(t, "tasks.stats.overdue", locale === "tr" ? "Geciken" : "Overdue")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{counts.overdue}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px auto",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={safeTranslate(
              t,
              "tasks.searchPlaceholder",
              locale === "tr"
                ? "Görev, lead, müşteri, ajans veya kişi ara..."
                : "Search task, lead, customer, agency, or person...",
            )}
          />

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">
              {safeTranslate(
                t,
                "tasks.filters.allStatuses",
                locale === "tr" ? "Tüm Durumlar" : "All Statuses",
              )}
            </option>
            <option value="TODO">{statusLabel("TODO")}</option>
            <option value="IN_PROGRESS">{statusLabel("IN_PROGRESS")}</option>
            <option value="DONE">{statusLabel("DONE")}</option>
            <option value="CANCELLED">{statusLabel("CANCELLED")}</option>
          </select>

          <button onClick={() => refreshActive(status)} disabled={loadingMy || loadingTeam}>
            {safeTranslate(
              t,
              "tasks.searchAndRefresh",
              locale === "tr" ? "Ara / Yenile" : "Search / Refresh",
            )}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected ? "1.45fr .85fr" : "1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>{safeTranslate(t, "tasks.table.task", locale === "tr" ? "GÖREV" : "TASK")}</th>
                <th>{safeTranslate(t, "tasks.table.related", locale === "tr" ? "İLİŞKİ" : "RELATED")}</th>
                {tab === "team" && canSeeTeam ? (
                  <th>
                    {safeTranslate(
                      t,
                      "tasks.table.assignedTo",
                      locale === "tr" ? "ATANAN" : "ASSIGNED TO",
                    )}
                  </th>
                ) : null}
                <th>{safeTranslate(t, "tasks.table.priority", locale === "tr" ? "ÖNCELİK" : "PRIORITY")}</th>
                <th>{safeTranslate(t, "tasks.table.status", locale === "tr" ? "DURUM" : "STATUS")}</th>
                <th>{safeTranslate(t, "tasks.table.dueAt", locale === "tr" ? "TERMİN" : "DUE")}</th>
                <th>{safeTranslate(t, "tasks.table.actions", locale === "tr" ? "İŞLEM" : "ACTIONS")}</th>
              </tr>
            </thead>

            <tbody>
              {activeTasks.map((task) => {
                const saving = savingId === task.id;
                const overdue = isOverdue(task);

                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <button
                          onClick={() => setSelected(task)}
                          style={{
                            border: 0,
                            padding: 0,
                            background: "transparent",
                            textAlign: "left",
                            fontWeight: 900,
                            color: "var(--text-primary)",
                            cursor: "pointer",
                          }}
                        >
                          {task.title}
                        </button>
                        <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                          {task.description || "-"}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        {task.lead ? (
                          <a href={`/leads/${task.lead.id}`}>{task.lead.fullName}</a>
                        ) : null}
                        {task.customer ? (
                          <a href={`/customers/${task.customer.id}`}>{task.customer.fullName}</a>
                        ) : null}
                        {task.agency ? (
                          <a href={`/agencies/${task.agency.id}`}>{task.agency.name}</a>
                        ) : null}
                        {!task.lead && !task.customer && !task.agency ? "-" : null}
                      </div>
                    </td>

                    {tab === "team" && canSeeTeam ? (
                      <td>{task.assignedTo?.name || "-"}</td>
                    ) : null}

                    <td>
                      <span className={`badge ${priorityBadgeClass(task.priority)}`}>
                        {priorityLabel(task.priority)}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${statusBadgeClass(task.status)}`}>
                        {statusLabel(task.status)}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          color: overdue ? "#dc2626" : "inherit",
                          fontWeight: overdue ? 800 : 500,
                        }}
                      >
                        {formatDateTime(task.dueAt)}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(task.status === "TODO" || task.status === "IN_PROGRESS") ? (
                          <button
                            className="primary"
                            onClick={() => markDone(task.id)}
                            disabled={saving}
                          >
                            {saving
                              ? safeTranslate(
                                  t,
                                  "tasks.actions.processing",
                                  locale === "tr" ? "İşleniyor..." : "Processing...",
                                )
                              : safeTranslate(
                                  t,
                                  "tasks.actions.done",
                                  locale === "tr" ? "Tamamla" : "Done",
                                )}
                          </button>
                        ) : null}

                        {(isAdmin || isManager) &&
                        task.status !== "DONE" &&
                        task.status !== "CANCELLED" ? (
                          <button onClick={() => cancelTask(task.id)} disabled={saving}>
                            {safeTranslate(
                              t,
                              "tasks.actions.cancel",
                              locale === "tr" ? "İptal Et" : "Cancel",
                            )}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {activeTasks.length === 0 ? (
            <div style={{ padding: 14, color: "var(--text-secondary)" }}>
              {safeTranslate(
                t,
                "tasks.noTasks",
                locale === "tr" ? "Görev bulunamadı." : "No tasks found.",
              )}
            </div>
          ) : null}
        </div>

        {selected ? (
          <div className="card" style={{ display: "grid", gap: 12, padding: 18 }}>
            <div className="flex-between" style={{ gap: 10 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {safeTranslate(
                    t,
                    "tasks.detail.taskInfo",
                    locale === "tr" ? "Görev Detayı" : "Task Detail",
                  )}
                </div>
              </div>

              <button onClick={() => setSelected(null)}>
                {safeTranslate(t, "common.close", locale === "tr" ? "Kapat" : "Close")}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={`badge ${statusBadgeClass(selected.status)}`}>
                {statusLabel(selected.status)}
              </span>
              <span className={`badge ${priorityBadgeClass(selected.priority)}`}>
                {priorityLabel(selected.priority)}
              </span>
              {isOverdue(selected) ? (
                <span className="badge danger">
                  {safeTranslate(
                    t,
                    "tasks.badges.overdue",
                    locale === "tr" ? "Gecikti" : "Overdue",
                  )}
                </span>
              ) : null}
            </div>

            <div
              style={{
                border: "1px solid var(--stroke)",
                borderRadius: 12,
                padding: 12,
                background: "var(--surface-2)",
                display: "grid",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div>
                <b>{safeTranslate(t, "tasks.detail.dueAt", locale === "tr" ? "Termin" : "Due")}:</b>{" "}
                {formatDateTime(selected.dueAt)}
              </div>
              <div>
                <b>{safeTranslate(
                  t,
                  "tasks.detail.assignedTo",
                  locale === "tr" ? "Atanan" : "Assigned to",
                )}:</b>{" "}
                {selected.assignedTo?.name || "-"}
              </div>
              <div>
                <b>{safeTranslate(
                  t,
                  "tasks.detail.createdBy",
                  locale === "tr" ? "Oluşturan" : "Created by",
                )}:</b>{" "}
                {selected.createdBy?.name || "-"}
              </div>

              {selected.lead ? (
                <div>
                  <b>{safeTranslate(t, "tasks.detail.lead", "Lead")}:</b>{" "}
                  <a href={`/leads/${selected.lead.id}`}>{selected.lead.fullName}</a>
                </div>
              ) : null}

              {selected.customer ? (
                <div>
                  <b>{safeTranslate(
                    t,
                    "tasks.detail.customer",
                    locale === "tr" ? "Müşteri" : "Customer",
                  )}:</b>{" "}
                  <a href={`/customers/${selected.customer.id}`}>{selected.customer.fullName}</a>
                </div>
              ) : null}

              {selected.agency ? (
                <div>
                  <b>{safeTranslate(
                    t,
                    "tasks.detail.agency",
                    locale === "tr" ? "Ajans" : "Agency",
                  )}:</b>{" "}
                  <a href={`/agencies/${selected.agency.id}`}>{selected.agency.name}</a>
                </div>
              ) : null}
            </div>

            {selected.description ? (
              <div
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--surface)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  fontSize: 13,
                }}
              >
                {selected.description}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(selected.status === "TODO" || selected.status === "IN_PROGRESS") ? (
                <button
                  className="primary"
                  onClick={() => markDone(selected.id)}
                  disabled={savingId === selected.id}
                >
                  {savingId === selected.id
                    ? safeTranslate(
                        t,
                        "tasks.actions.processing",
                        locale === "tr" ? "İşleniyor..." : "Processing...",
                      )
                    : safeTranslate(
                        t,
                        "tasks.actions.done",
                        locale === "tr" ? "Tamamla" : "Done",
                      )}
                </button>
              ) : null}

              {(isAdmin || isManager) &&
              selected.status !== "DONE" &&
              selected.status !== "CANCELLED" ? (
                <button
                  onClick={() => cancelTask(selected.id)}
                  disabled={savingId === selected.id}
                >
                  {safeTranslate(
                    t,
                    "tasks.actions.cancel",
                    locale === "tr" ? "İptal Et" : "Cancel",
                  )}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}