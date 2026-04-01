"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type AgencyStatus = "ACTIVE" | "PASSIVE" | "PROSPECT" | "DEALING" | "CLOSED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

type AgencyDetail = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  website?: string | null;
  source?: string | null;
  notesSummary?: string | null;
  status: AgencyStatus;
  createdAt?: string;
  updatedAt?: string;
  manager?: { id: string; name: string; email: string };
  assignedSales?: { id: string; name: string; email: string } | null;
  notes: Array<{
    id: string;
    note: string;
    createdAt: string;
    createdBy?: { id: string; name: string; email: string };
  }>;
  meetings: Array<{
    id: string;
    title: string;
    notes?: string | null;
    meetingAt: string;
    createdBy?: { id: string; name: string; email: string };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    dueAt?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo?: { id: string; name: string; email: string } | null;
    createdBy?: { id: string; name: string; email: string };
  }>;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const AGENCY_STATUS_OPTIONS: AgencyStatus[] = [
  "ACTIVE",
  "PASSIVE",
  "PROSPECT",
  "DEALING",
  "CLOSED",
];

const TASK_STATUS_OPTIONS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

const TASK_PRIORITY_OPTIONS: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

function badgeClass(status?: string) {
  if (status === "ACTIVE" || status === "DEALING" || status === "DONE") return "success";
  if (status === "PROSPECT" || status === "IN_PROGRESS") return "info";
  if (status === "PASSIVE" || status === "MEDIUM") return "warning";
  if (status === "CLOSED" || status === "CANCELLED") return "danger";
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

export default function AgencyDetailPage() {
  const { t, locale } = useLanguage();

  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const agencyId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [salesUsers, setSalesUsers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [status, setStatus] = useState<AgencyStatus>("ACTIVE");
  const [assignedSalesId, setAssignedSalesId] = useState("");

  const [newNote, setNewNote] = useState("");

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingAt, setMeetingAt] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskAssignedToId, setTaskAssignedToId] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");

  const role = me?.role as string | undefined;
  const canManage = role === "MANAGER" || role === "ADMIN";
  const canNote = role === "MANAGER" || role === "ADMIN" || role === "SALES";

  async function load() {
    if (!agencyId) {
      setErr(t("agencyDetail.agencyIdMissing"));
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const [agencyData, sales] = await Promise.all([
        authedFetch(`/agencies/${agencyId}`),
        authedFetch("/users?role=SALES"),
      ]);

      setAgency(agencyData);
      setSalesUsers(Array.isArray(sales) ? sales : []);

      setName(agencyData.name || "");
      setContactName(agencyData.contactName || "");
      setPhone(agencyData.phone || "");
      setEmail(agencyData.email || "");
      setCity(agencyData.city || "");
      setCountry(agencyData.country || "");
      setAddress(agencyData.address || "");
      setWebsite(agencyData.website || "");
      setSource(agencyData.source || "");
      setNotesSummary(agencyData.notesSummary || "");
      setStatus(agencyData.status || "ACTIVE");
      setAssignedSalesId(agencyData.assignedSales?.id || "");
    } catch (e: any) {
      setAgency(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function saveAgency() {
    if (!agency) return;
    setErr(null);
    setSaving(true);
    try {
      await authedFetch(`/agencies/${agency.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          address: address.trim() || undefined,
          website: website.trim() || undefined,
          source: source.trim() || undefined,
          notesSummary: notesSummary.trim() || undefined,
          status,
        }),
      });

      await authedFetch(`/agencies/${agency.id}/assign-sales`, {
        method: "POST",
        body: JSON.stringify({
          salesId: assignedSalesId || null,
        }),
      });

      await load();
      alert(t("agencyDetail.updatedAlert"));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!agency || !newNote.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await authedFetch(`/agencies/${agency.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: newNote.trim() }),
      });
      setNewNote("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function createMeeting() {
    if (!agency || !meetingTitle.trim() || !meetingAt) return;
    setSaving(true);
    setErr(null);
    try {
      await authedFetch(`/agencies/${agency.id}/meetings`, {
        method: "POST",
        body: JSON.stringify({
          title: meetingTitle.trim(),
          notes: meetingNotes.trim() || undefined,
          meetingAt: new Date(meetingAt).toISOString(),
        }),
      });

      setMeetingTitle("");
      setMeetingNotes("");
      setMeetingAt("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function createTask() {
    if (!agency || !taskTitle.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await authedFetch(`/agencies/${agency.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
          assignedToId: taskAssignedToId || null,
          priority: taskPriority,
        }),
      });

      setTaskTitle("");
      setTaskDescription("");
      setTaskDueAt("");
      setTaskAssignedToId("");
      setTaskPriority("MEDIUM");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, nextStatus: TaskStatus) {
    setSaving(true);
    setErr(null);
    try {
      await authedFetch(`/agencies/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, agencyId]);

  const stats = useMemo(() => {
    return {
      notes: agency?.notes?.length || 0,
      meetings: agency?.meetings?.length || 0,
      tasks: agency?.tasks?.length || 0,
      openTasks:
        agency?.tasks?.filter(
          (t) => t.status !== "DONE" && t.status !== "CANCELLED",
        ).length || 0,
    };
  }, [agency]);

  if (!mounted) return <div>{t("common.loading")}</div>;
  if (loading) return <div className="card">{t("agencyDetail.loadingAgency")}</div>;

  if (!agency) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {t("agencyDetail.notFoundTitle")}
        </div>
        <div className="muted">{err || t("agencyDetail.notFoundText")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <a href="/agencies" style={{ fontWeight: 800 }}>
            ← {t("agencyDetail.backToAgencies")}
          </a>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{agency.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {t("agencyDetail.managerLabel")}: {agency.manager?.name || "-"} •{" "}
            {t("agencyDetail.salesLabel")}: {agency.assignedSales?.name || "-"}
          </div>
        </div>

        <span className={`badge ${badgeClass(agency.status)}`}>
          {safeTranslate(t, `agencyStatuses.${agency.status}`, agency.status)}
        </span>
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
          <div className="muted">{t("agencyDetail.stats.notes")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.notes}</div>
        </div>
        <div className="card">
          <div className="muted">{t("agencyDetail.stats.meetings")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.meetings}</div>
        </div>
        <div className="card">
          <div className="muted">{t("agencyDetail.stats.tasks")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.tasks}</div>
        </div>
        <div className="card">
          <div className="muted">{t("agencyDetail.stats.openTasks")}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.openTasks}</div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{t("agencyDetail.agencyInfo")}</div>

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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AgencyStatus)}
          >
            {AGENCY_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {safeTranslate(t, `agencyStatuses.${s}`, s)}
              </option>
            ))}
          </select>

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("agencies.fields.address")}
          />
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
        </div>

        <textarea
          value={notesSummary}
          onChange={(e) => setNotesSummary(e.target.value)}
          placeholder={t("agencyDetail.summaryNote")}
        />

        {canManage ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="primary"
              onClick={saveAgency}
              disabled={saving || !name.trim()}
            >
              {saving ? t("agencies.saving") : t("agencyDetail.saveAgency")}
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
          <div style={{ fontWeight: 900 }}>{t("agencyDetail.notesTitle")}</div>

          {canNote ? (
            <div style={{ display: "grid", gap: 10 }}>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t("agencyDetail.addNotePlaceholder")}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="primary"
                  onClick={addNote}
                  disabled={saving || !newNote.trim()}
                >
                  {t("agencyDetail.addNote")}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            {agency.notes.length === 0 ? (
              <div className="muted">{t("agencyDetail.noNotes")}</div>
            ) : (
              agency.notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    border: "1px solid var(--stroke)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--surface-2)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                    {n.createdBy?.name || "-"} •{" "}
                    {new Date(n.createdAt).toLocaleString(
                      locale === "tr" ? "tr-TR" : "en-US",
                    )}
                  </div>
                  <div>{n.note}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>{t("agencyDetail.meetingsTitle")}</div>

          {canNote ? (
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder={t("agencyDetail.meetingFields.title")}
              />
              <input
                type="datetime-local"
                value={meetingAt}
                onChange={(e) => setMeetingAt(e.target.value)}
              />
              <textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder={t("agencyDetail.meetingFields.notes")}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="primary"
                  onClick={createMeeting}
                  disabled={saving || !meetingTitle.trim() || !meetingAt}
                >
                  {t("agencyDetail.addMeeting")}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            {agency.meetings.length === 0 ? (
              <div className="muted">{t("agencyDetail.noMeetings")}</div>
            ) : (
              agency.meetings.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid var(--stroke)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--surface-2)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{m.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(m.meetingAt).toLocaleString(
                      locale === "tr" ? "tr-TR" : "en-US",
                    )}{" "}
                    • {m.createdBy?.name || "-"}
                  </div>
                  <div style={{ fontSize: 13 }}>{m.notes || "-"}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{t("agencyDetail.tasksTitle")}</div>

        {canManage ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 180px 180px 140px auto",
              gap: 10,
            }}
          >
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={t("agencyDetail.taskFields.title")}
            />
            <input
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={t("agencyDetail.taskFields.description")}
            />
            <input
              type="datetime-local"
              value={taskDueAt}
              onChange={(e) => setTaskDueAt(e.target.value)}
            />
            <select
              value={taskAssignedToId}
              onChange={(e) => setTaskAssignedToId(e.target.value)}
            >
              <option value="">{t("agencies.fields.selectSales")}</option>
              {salesUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {safeTranslate(t, `taskPriorities.${p}`, p)}
                </option>
              ))}
            </select>
            <button
              className="primary"
              onClick={createTask}
              disabled={saving || !taskTitle.trim()}
            >
              {t("agencyDetail.addTask")}
            </button>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {agency.tasks.length === 0 ? (
            <div className="muted">{t("agencyDetail.noTasks")}</div>
          ) : (
            agency.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800 }}>{task.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {task.assignedTo?.name || t("agencyDetail.unassigned")} •{" "}
                      {task.dueAt
                        ? new Date(task.dueAt).toLocaleString(
                            locale === "tr" ? "tr-TR" : "en-US",
                          )
                        : t("agencyDetail.noDate")}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${badgeClass(task.status)}`}>
                      {safeTranslate(t, `taskStatuses.${task.status}`, task.status)}
                    </span>
                    <span className="badge">
                      {safeTranslate(t, `taskPriorities.${task.priority}`, task.priority)}
                    </span>
                  </div>
                </div>

                {task.description ? (
                  <div style={{ fontSize: 13 }}>{task.description}</div>
                ) : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {TASK_STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateTaskStatus(task.id, s)}
                      disabled={saving || task.status === s}
                    >
                      {safeTranslate(t, `taskStatuses.${s}`, s)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}