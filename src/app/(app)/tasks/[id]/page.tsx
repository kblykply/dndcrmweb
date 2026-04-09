"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { authedFetch } from "@/lib/authedFetch";
import { getAccessToken, getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

type UserLite = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

type LeadLite = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
};

type CustomerLite = {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
};

type AgencyLite = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type TaskDetail = {
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
  createdBy?: UserLite | null;
  assignedTo?: UserLite | null;
  lead?: LeadLite | null;
  customer?: CustomerLite | null;
  agency?: AgencyLite | null;
};

type RealtimeNotification = {
  id: string;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
  metaJson?: any;
};

function getApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  return raw.replace(/\/$/, "");
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

export default function TaskDetailPage() {
  const { t, locale } = useLanguage();
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const taskId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");

  const socketRef = useRef<Socket | null>(null);

  const role = me?.role as string | undefined;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isSales = role === "SALES";
  const isCallcenter = role === "CALLCENTER";

  const isAssignedToMe = useMemo(() => {
    if (!task || !me?.id) return false;
    return task.assignedToId === me.id;
  }, [task, me]);

  const isCreatedByMe = useMemo(() => {
    if (!task || !me?.id) return false;
    return task.createdById === me.id;
  }, [task, me]);

  const canEditFull = isAdmin || isManager;
  const canEditLimited =
    !!task &&
    (isSales || isCallcenter) &&
    (isAssignedToMe || isCreatedByMe);

  const canEditTask = !!task && (canEditFull || canEditLimited);
  const canCancel = !!task && (isAdmin || isManager || isCreatedByMe);
  const canMarkDone = !!task && (isAdmin || isManager || isAssignedToMe);

  const isOverdue = useMemo(() => {
    if (!task?.dueAt) return false;
    if (task.status === "DONE" || task.status === "CANCELLED") return false;
    return new Date(task.dueAt).getTime() < Date.now();
  }, [task]);

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

  function roleLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `roles.${value}`, value);
  }

  function syncForm(data: TaskDetail) {
    setTitle(data.title || "");
    setDescription(data.description || "");
    setStatus(data.status || "TODO");
    setPriority(data.priority || "MEDIUM");
    setDueAt(toDatetimeLocalValue(data.dueAt));
  }

  async function load(showLoader = true) {
    if (!taskId) {
      setErr(
        safeTranslate(
          t,
          "taskDetail.taskIdMissing",
          locale === "tr" ? "Görev ID bulunamadı." : "Task ID not found.",
        ),
      );
      setLoading(false);
      return;
    }

    setErr(null);
    if (showLoader) setLoading(true);

    try {
      const data = await authedFetch(`/tasks/${taskId}`);
      setTask(data);
      syncForm(data);
    } catch (e: any) {
      setTask(null);
      setErr(String(e?.message || e));
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function saveTask() {
    if (!task || !canEditTask) return;

    setErr(null);
    setSaving(true);

    try {
      const body: any = {};

      if (canEditFull) {
        body.title = title.trim();
        body.description = description.trim() || null;
        body.priority = priority;
        body.dueAt = dueAt ? new Date(dueAt).toISOString() : null;
        body.status = status;
      } else {
        body.description = description.trim() || null;
        body.status = status;
      }

      const updated = await authedFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setTask(updated);
      syncForm(updated);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function markDone() {
    if (!task || !canMarkDone) return;

    setErr(null);
    setSaving(true);

    try {
      const updated = await authedFetch(`/tasks/${task.id}/done`, {
        method: "PATCH",
      });
      setTask(updated);
      syncForm(updated);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function cancelTask() {
    if (!task || !canCancel) return;

    setErr(null);
    setSaving(true);

    try {
      const updated = await authedFetch(`/tasks/${task.id}/cancel`, {
        method: "PATCH",
      });
      setTask(updated);
      syncForm(updated);
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
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, taskId]);

  useEffect(() => {
    if (!mounted || !taskId) return;

    const token = getAccessToken();
    if (!token) return;

    const apiBase = getApiBase();
    const socketUrl =
      apiBase || (typeof window !== "undefined" ? window.location.origin : "");

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    const handleTaskRealtime = async (payload: RealtimeNotification) => {
      const isTaskEvent =
        payload?.type === "TASK_ASSIGNED" ||
        payload?.type === "TASK_UPDATED" ||
        payload?.entityType === "CrmTask";

      if (!isTaskEvent) return;

      const payloadTaskId =
        payload?.entityId ||
        payload?.metaJson?.taskId ||
        payload?.metaJson?.entityId;

      if (payloadTaskId !== taskId) return;

      await load(false);
    };

    socket.on("notification:new", handleTaskRealtime);

    return () => {
      socket.off("notification:new", handleTaskRealtime);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mounted, taskId]);

  if (!mounted) {
    return <div>{t("common.loading")}</div>;
  }

  if (loading) {
    return (
      <div className="card">
        {safeTranslate(
          t,
          "taskDetail.loadingTask",
          locale === "tr" ? "Görev yükleniyor..." : "Loading task...",
        )}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {safeTranslate(
            t,
            "taskDetail.notFoundTitle",
            locale === "tr" ? "Görev Bulunamadı" : "Task Not Found",
          )}
        </div>
        <div className="muted">
          {err ||
            safeTranslate(
              t,
              "taskDetail.notFoundText",
              locale === "tr" ? "Böyle bir görev yok." : "No such task exists.",
            )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <Link href="/tasks" style={{ fontWeight: 800 }}>
            ←{" "}
            {safeTranslate(
              t,
              "taskDetail.backToTasks",
              locale === "tr" ? "Görevlere Dön" : "Back to Tasks",
            )}
          </Link>

          <div style={{ fontSize: 28, fontWeight: 900 }}>{task.title}</div>

          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "taskDetail.createdAt",
              locale === "tr" ? "Oluşturulma" : "Created",
            )}
            : {formatDateTime(task.createdAt)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`badge ${statusBadgeClass(task.status)}`}>
            {statusLabel(task.status)}
          </span>
          <span className={`badge ${priorityBadgeClass(task.priority)}`}>
            {priorityLabel(task.priority)}
          </span>
          {isOverdue ? (
            <span className="badge danger">
              {safeTranslate(
                t,
                "tasks.badges.overdue",
                locale === "tr" ? "Gecikti" : "Overdue",
              )}
            </span>
          ) : null}
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
          <div className="muted">
            {safeTranslate(
              t,
              "taskDetail.stats.dueAt",
              locale === "tr" ? "Termin" : "Due",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(task.dueAt)}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "taskDetail.stats.assignedTo",
              locale === "tr" ? "Atanan" : "Assigned To",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {task.assignedTo?.name || "-"}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "taskDetail.stats.completedAt",
              locale === "tr" ? "Tamamlanma" : "Completed At",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(task.completedAt)}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "taskDetail.stats.updatedAt",
              locale === "tr" ? "Güncelleme" : "Updated At",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(task.updatedAt)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr .8fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>
              {safeTranslate(
                t,
                "taskDetail.taskInfo",
                locale === "tr" ? "Görev Bilgileri" : "Task Information",
              )}
            </div>

            {canEditTask ? (
              <span className="badge info">
                {safeTranslate(
                  t,
                  "taskDetail.editable",
                  locale === "tr" ? "Düzenlenebilir" : "Editable",
                )}
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "taskDetail.fields.title",
                  locale === "tr" ? "Başlık" : "Title",
                )}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEditFull}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "taskDetail.fields.priority",
                  locale === "tr" ? "Öncelik" : "Priority",
                )}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={!canEditFull}
              >
                <option value="LOW">{priorityLabel("LOW")}</option>
                <option value="MEDIUM">{priorityLabel("MEDIUM")}</option>
                <option value="HIGH">{priorityLabel("HIGH")}</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "taskDetail.fields.status",
                  locale === "tr" ? "Durum" : "Status",
                )}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={!canEditTask}
              >
                <option value="TODO">{statusLabel("TODO")}</option>
                <option value="IN_PROGRESS">{statusLabel("IN_PROGRESS")}</option>
                <option value="DONE">{statusLabel("DONE")}</option>
                <option value="CANCELLED">{statusLabel("CANCELLED")}</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {safeTranslate(
                  t,
                  "taskDetail.fields.dueAt",
                  locale === "tr" ? "Termin" : "Due At",
                )}
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={!canEditFull}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {safeTranslate(
                t,
                "taskDetail.description",
                locale === "tr" ? "Açıklama" : "Description",
              )}
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEditTask}
              style={{ minHeight: 160 }}
            />
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
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.createdBy",
                  locale === "tr" ? "Oluşturan" : "Created By",
                )}
                :
              </b>{" "}
              {task.createdBy?.name || "-"}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.createdByRole",
                  locale === "tr" ? "Oluşturan Rolü" : "Creator Role",
                )}
                :
              </b>{" "}
              {roleLabel(task.createdBy?.role)}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.assignedTo",
                  locale === "tr" ? "Atanan" : "Assigned To",
                )}
                :
              </b>{" "}
              {task.assignedTo?.name || "-"}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.assignedRole",
                  locale === "tr" ? "Atanan Rolü" : "Assigned Role",
                )}
                :
              </b>{" "}
              {roleLabel(task.assignedTo?.role)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canEditTask ? (
              <button
                className="primary"
                onClick={saveTask}
                disabled={saving || (canEditFull && !title.trim())}
              >
                {saving
                  ? safeTranslate(
                      t,
                      "taskDetail.saving",
                      locale === "tr" ? "Kaydediliyor..." : "Saving...",
                    )
                  : safeTranslate(
                      t,
                      "taskDetail.save",
                      locale === "tr" ? "Kaydet" : "Save",
                    )}
              </button>
            ) : null}

            {canMarkDone &&
            (task.status === "TODO" || task.status === "IN_PROGRESS") ? (
              <button className="primary" onClick={markDone} disabled={saving}>
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

            {canCancel &&
            task.status !== "DONE" &&
            task.status !== "CANCELLED" ? (
              <button onClick={cancelTask} disabled={saving}>
                {safeTranslate(
                  t,
                  "tasks.actions.cancel",
                  locale === "tr" ? "İptal Et" : "Cancel",
                )}
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>
              {safeTranslate(
                t,
                "taskDetail.relatedRecords",
                locale === "tr" ? "İlişkili Kayıtlar" : "Related Records",
              )}
            </div>

            {task.lead ? (
              <div
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  <Link href={`/leads/${task.lead.id}`}>{task.lead.fullName}</Link>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {safeTranslate(t, "taskDetail.related.lead", "Lead")}
                </div>
                <div style={{ fontSize: 13 }}>{task.lead.phone || "-"}</div>
                <div style={{ fontSize: 13 }}>{task.lead.email || "-"}</div>
              </div>
            ) : null}

            {task.customer ? (
              <div
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  <Link href={`/customers/${task.customer.id}`}>
                    {task.customer.fullName}
                  </Link>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {safeTranslate(
                    t,
                    "taskDetail.related.customer",
                    locale === "tr" ? "Müşteri" : "Customer",
                  )}
                </div>
                <div style={{ fontSize: 13 }}>{task.customer.companyName || "-"}</div>
                <div style={{ fontSize: 13 }}>{task.customer.phone || "-"}</div>
                <div style={{ fontSize: 13 }}>{task.customer.email || "-"}</div>
              </div>
            ) : null}

            {task.agency ? (
              <div
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  <Link href={`/agencies/${task.agency.id}`}>{task.agency.name}</Link>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {safeTranslate(
                    t,
                    "taskDetail.related.agency",
                    locale === "tr" ? "Ajans" : "Agency",
                  )}
                </div>
                <div style={{ fontSize: 13 }}>{task.agency.phone || "-"}</div>
                <div style={{ fontSize: 13 }}>{task.agency.email || "-"}</div>
              </div>
            ) : null}

            {!task.lead && !task.customer && !task.agency ? (
              <div className="muted">
                {safeTranslate(
                  t,
                  "taskDetail.noRelatedRecords",
                  locale === "tr" ? "İlişkili kayıt yok." : "No related records.",
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}