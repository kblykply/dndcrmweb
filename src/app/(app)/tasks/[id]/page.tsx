"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type TaskStatus = "OPEN" | "DONE" | "CANCELED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type TaskType =
  | "FOLLOW_UP"
  | "CALL"
  | "MEETING"
  | "PRESENTATION"
  | "CUSTOM"
  | string;

type UserLite = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

type TaskDetail = {
  id: string;
  title: string;
  description?: string | null;
  type?: TaskType | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  doneAt?: string | null;
  canceledAt?: string | null;
  createdAt?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
  createdBy?: UserLite | null;
  assignedTo?: UserLite | null;
  lead?: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
  customer?: {
    id: string;
    fullName: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  agency?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
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
  if (status === "CANCELED") return "danger";
  return "info";
}

function priorityBadgeClass(priority?: string) {
  if (priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "info";
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

  const role = me?.role as string | undefined;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const canCancel = isAdmin || isManager;

  function formatDateTime(v?: string | null) {
    if (!v) return "-";
    return new Date(v).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
  }

  function typeLabel(type?: string | null) {
    if (!type) {
      return safeTranslate(
        t,
        "tasks.types.CUSTOM",
        locale === "tr" ? "Görev" : "Task",
      );
    }
    return safeTranslate(t, `tasks.types.${type}`, type);
  }

  function statusLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `tasks.statuses.${value}`, value);
  }

  function priorityLabel(value?: string | null) {
    if (!value) return "-";
    return safeTranslate(t, `tasks.priorities.${value}`, value);
  }

  const isAssignedToMe = useMemo(() => {
    if (!task || !me?.id) return false;
    return task.assignedToId === me.id;
  }, [task, me]);

  const canMarkDone = useMemo(() => {
    if (!task) return false;
    if (task.status !== "OPEN") return false;
    return isAssignedToMe || isAdmin || isManager;
  }, [task, isAssignedToMe, isAdmin, isManager]);

  const isOverdue = useMemo(() => {
    if (!task?.dueAt) return false;
    if (task.status === "DONE" || task.status === "CANCELED") return false;
    return new Date(task.dueAt).getTime() < Date.now();
  }, [task]);

  async function load() {
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
    setLoading(true);

    try {
      const data = await authedFetch(`/tasks/${taskId}`);
      setTask(data);
    } catch (e: any) {
      setTask(null);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
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
      setTask((prev) => ({ ...(prev || {}), ...(updated || {}), status: "DONE" } as TaskDetail));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function cancelTask() {
    if (!task || !canCancel || task.status !== "OPEN") return;

    setErr(null);
    setSaving(true);

    try {
      const updated = await authedFetch(`/tasks/${task.id}/cancel`, {
        method: "PATCH",
      });
      setTask((prev) =>
        ({ ...(prev || {}), ...(updated || {}), status: "CANCELED" } as TaskDetail),
      );
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
            {typeLabel(task.type)} •{" "}
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
          <div style={{ fontSize: 18, fontWeight: 900 }}>{formatDateTime(task.dueAt)}</div>
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
              "taskDetail.stats.doneAt",
              locale === "tr" ? "Tamamlanma" : "Done At",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(task.doneAt)}
          </div>
        </div>

        <div className="card">
          <div className="muted">
            {safeTranslate(
              t,
              "taskDetail.stats.canceledAt",
              locale === "tr" ? "İptal" : "Canceled At",
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {formatDateTime(task.canceledAt)}
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
          <div style={{ fontWeight: 900 }}>
            {safeTranslate(
              t,
              "taskDetail.taskInfo",
              locale === "tr" ? "Görev Bilgileri" : "Task Information",
            )}
          </div>

          <div
            style={{
              border: "1px solid var(--stroke)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface-2)",
              display: "grid",
              gap: 10,
              fontSize: 13,
            }}
          >
            <div>
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.type",
                  locale === "tr" ? "Tür" : "Type",
                )}
                :
              </b>{" "}
              {typeLabel(task.type)}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.status",
                  locale === "tr" ? "Durum" : "Status",
                )}
                :
              </b>{" "}
              {statusLabel(task.status)}
            </div>

            <div>
              <b>
                {safeTranslate(
                  t,
                  "taskDetail.fields.priority",
                  locale === "tr" ? "Öncelik" : "Priority",
                )}
                :
              </b>{" "}
              {priorityLabel(task.priority)}
            </div>

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
                  "taskDetail.fields.assignedTo",
                  locale === "tr" ? "Atanan" : "Assigned To",
                )}
                :
              </b>{" "}
              {task.assignedTo?.name || "-"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>
              {safeTranslate(
                t,
                "taskDetail.description",
                locale === "tr" ? "Açıklama" : "Description",
              )}
            </div>

            <div
              style={{
                border: "1px solid var(--stroke)",
                borderRadius: 12,
                padding: 12,
                background: "var(--surface)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                minHeight: 120,
                fontSize: 13,
              }}
            >
              {task.description ||
                safeTranslate(
                  t,
                  "taskDetail.noDescription",
                  locale === "tr" ? "Açıklama yok." : "No description.",
                )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canMarkDone && task.status === "OPEN" ? (
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

            {canCancel && task.status === "OPEN" ? (
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