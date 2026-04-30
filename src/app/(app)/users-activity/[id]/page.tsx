"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";

type RangeKey = "ALL" | "TODAY" | "WEEK" | "MONTH" | "90D";

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "ALL", label: "All time" },
  { key: "TODAY", label: "Today" },
  { key: "WEEK", label: "This week" },
  { key: "MONTH", label: "This month" },
  { key: "90D", label: "Last 90 days" },
];

const INITIAL_VISIBLE_ROWS = 25;

export default function UserActivityDetailPage() {
  const params = useParams();
  const userId = Array.isArray((params as any)?.id)
    ? (params as any).id[0]
    : (params as any)?.id;

  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<RangeKey>("ALL");
  const [q, setQ] = useState("");
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!userId) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await authedFetch(`/user-activity/${userId}`);
      setData(res);
      setVisibleCounts({});
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function dateFromRange() {
    const now = new Date();

    if (range === "ALL") return null;

    if (range === "TODAY") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    if (range === "WEEK") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start;
    }

    if (range === "MONTH") {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return start;
    }

    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return start;
  }

  function getDate(item: any) {
    return (
      item.meetingAt ||
      item.presentationAt ||
      item.dueAt ||
      item.createdAt ||
      item.updatedAt
    );
  }

  function inRange(item: any) {
    const from = dateFromRange();
    if (!from) return true;

    const raw = getDate(item);
    if (!raw) return false;

    return new Date(raw).getTime() >= from.getTime();
  }

  function searchableText(item: any) {
    return [
      item.title,
      item.fullName,
      item.name,
      item.summary,
      item.details,
      item.description,
      item.notes,
      item.notesSummary,
      item.conclusionNote,
      item.note,
      item.type,
      item.status,
      item.outcome,
      item.priority,
      item.callOutcome,
      item.projectName,
      item.location,
      item.contactName,
      item.companyName,
      item.phone,
      item.email,
      item.lead?.fullName,
      item.lead?.phone,
      item.customer?.fullName,
      item.customer?.companyName,
      item.agency?.name,
      item.createdBy?.name,
      item.assignedTo?.name,
      item.assignedSales?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function matchesSearch(item: any) {
    const search = q.trim().toLowerCase();
    if (!search) return true;
    return searchableText(item).includes(search);
  }

  function filterRows(items?: any[]) {
    const rows = Array.isArray(items) ? items : [];
    return rows.filter((item) => inRange(item) && matchesSearch(item));
  }

  const sections = useMemo(() => {
    if (!data) return [];

    return [
      {
        title: "CRM Tasks Assigned",
        type: "crmTask",
        rows: filterRows(data.crmTasksAssigned),
      },
      {
        title: "CRM Tasks Created",
        type: "crmTaskCreated",
        rows: filterRows(data.crmTasksCreated),
      },
      {
        title: "Agency Tasks Assigned",
        type: "agencyTask",
        rows: filterRows(data.agencyTasksAssigned),
      },
      {
        title: "Agency Tasks Created",
        type: "agencyTaskCreated",
        rows: filterRows(data.agencyTasksCreated),
      },
      {
        title: "Agency Meetings Assigned",
        type: "agencyMeeting",
        rows: filterRows(data.agencyMeetingsAssigned),
      },
      {
        title: "Presentations Assigned",
        type: "presentation",
        rows: filterRows(data.presentationsAssigned),
      },
      {
        title: "Other Meetings Assigned",
        type: "otherMeeting",
        rows: filterRows(data.otherMeetingsAssigned),
      },
      {
        title: "Agency Notes Created",
        type: "agencyNote",
        rows: filterRows(data.agencyNotesAuthored),
      },
      {
        title: "Lead Calls / Activities",
        type: "leadActivity",
        rows: filterRows(data.activities),
      },
      {
        title: "Owned Customers",
        type: "customer",
        rows: filterRows(data.ownedCustomers),
      },
    ].filter((section) => section.rows.length > 0);
  }, [data, range, q]);

  const stats = useMemo(() => {
    return {
      total: sections.reduce((sum, s) => sum + s.rows.length, 0),
      tasks: sections
        .filter((s) =>
          ["crmTask", "crmTaskCreated", "agencyTask", "agencyTaskCreated"].includes(
            s.type,
          ),
        )
        .reduce((sum, s) => sum + s.rows.length, 0),
      meetings: sections
        .filter((s) =>
          ["agencyMeeting", "presentation", "otherMeeting"].includes(s.type),
        )
        .reduce((sum, s) => sum + s.rows.length, 0),
      leads: sections
        .filter((s) => s.type === "leadActivity")
        .reduce((sum, s) => sum + s.rows.length, 0),
      customers: sections
        .filter((s) => s.type === "customer")
        .reduce((sum, s) => sum + s.rows.length, 0),
    };
  }, [sections]);

  function showMore(type: string) {
    setVisibleCounts((prev) => ({
      ...prev,
      [type]: (prev[type] || INITIAL_VISIBLE_ROWS) + INITIAL_VISIBLE_ROWS,
    }));
  }

  if (loading) return <div className="card">Loading user activity...</div>;

  if (!data) {
    return (
      <div className="card">
        <b>User not found</b>
        <div className="muted">{err || "No data found."}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/users-activity" style={{ fontWeight: 800 }}>
            ← Back to User Activity
          </Link>

          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
            {data.name}
          </div>

          <div className="muted">
            {data.email} • {data.role} • {data.isActive ? "Active" : "Passive"}
          </div>
        </div>

        <button onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {err ? (
        <div className="card" style={{ border: "1px solid rgba(239,68,68,.35)" }}>
          {err}
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setVisibleCounts({});
            }}
            placeholder="Search activity, lead, customer, agency, task, meeting..."
          />

          <select
            value={range}
            onChange={(e) => {
              setRange(e.target.value as RangeKey);
              setVisibleCounts({});
            }}
          >
            {RANGE_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Stat title="Total Records" value={stats.total} tone="info" />
        <Stat title="Tasks" value={stats.tasks} tone="warning" />
        <Stat title="Assigned Meetings" value={stats.meetings} tone="success" />
        <Stat title="Lead Activity" value={stats.leads} tone="danger" />
        <Stat title="Customers" value={stats.customers} tone="neutral" />
      </div>

      {sections.length === 0 ? (
        <div className="card">
          <div style={{ fontWeight: 900 }}>No activity found</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Try changing the search filter.
          </div>
        </div>
      ) : (
        sections.map((section) => {
          const visible = visibleCounts[section.type] || INITIAL_VISIBLE_ROWS;

          return (
            <Section
              key={section.type}
              title={section.title}
              type={section.type}
              rows={section.rows}
              visible={visible}
              onShowMore={() => showMore(section.type)}
            />
          );
        })
      )}
    </div>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "info" | "warning" | "success" | "danger" | "neutral";
}) {
  const color =
    tone === "success"
      ? "rgba(34,197,94,.12)"
      : tone === "warning"
        ? "rgba(245,158,11,.12)"
        : tone === "danger"
          ? "rgba(239,68,68,.12)"
          : tone === "info"
            ? "rgba(59,130,246,.12)"
            : "var(--surface-2)";

  return (
    <div className="card" style={{ background: color }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Section({
  title,
  type,
  rows,
  visible,
  onShowMore,
}: {
  title: string;
  type: string;
  rows: any[];
  visible: number;
  onShowMore: () => void;
}) {
  const visibleRows = rows.slice(0, visible);
  const hasMore = rows.length > visible;

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{getTypeIcon(type)}</span>
          <div style={{ fontWeight: 900 }}>{title}</div>
        </div>

        <span className={`badge ${getTypeBadgeClass(type)}`}>{rows.length}</span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {visibleRows.map((item: any) => (
          <ActivityCard key={`${type}-${item.id}`} type={type} item={item} />
        ))}
      </div>

      {hasMore ? (
        <button onClick={onShowMore}>
          Show more ({rows.length - visible} remaining)
        </button>
      ) : null}
    </div>
  );
}

function ActivityCard({ type, item }: { type: string; item: any }) {
  const href = getRecordHref(type, item);

  const title =
    item.title ||
    item.fullName ||
    item.name ||
    item.summary ||
    item.note ||
    item.type ||
    item.status ||
    item.id;

  const date =
    item.meetingAt ||
    item.presentationAt ||
    item.dueAt ||
    item.createdAt ||
    item.updatedAt;

  const timing = getTimingInfo(type, item);
  const description = getDescription(type, item);

  const content = (
    <div
      style={{
        border: "1px solid var(--stroke)",
        borderRadius: 14,
        padding: 14,
        background: "var(--surface-2)",
        display: "grid",
        gap: 8,
        cursor: href ? "pointer" : "default",
        borderLeft: `5px solid ${getTypeColor(type)}`,
      }}
    >
      <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 3 }}>
          <div style={{ fontWeight: 900 }}>
            {getTypeIcon(type)} {title}
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            {date ? new Date(date).toLocaleString() : "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className={`badge ${getTypeBadgeClass(type)}`}>
            {getTypeLabel(type)}
          </span>

          {item.status ? (
            <span className={`badge ${statusBadgeClass(item.status)}`}>
              {formatStatus(item.status)}
            </span>
          ) : null}

          {timing ? (
            <span className={`badge ${timing.className}`}>{timing.label}</span>
          ) : null}
        </div>
      </div>

      <MetaLine type={type} item={item} />

      {description ? (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            background: "var(--surface)",
            border: "1px solid var(--stroke)",
            borderRadius: 10,
            padding: 10,
          }}
        >
          {description}
        </div>
      ) : null}

      {item.conclusionNote ? (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            border: "1px solid rgba(34,197,94,.35)",
            background: "rgba(34,197,94,.08)",
            borderRadius: 10,
            padding: 10,
          }}
        >
          <b>Conclusion:</b> {item.conclusionNote}
        </div>
      ) : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {content}
    </Link>
  );
}

function MetaLine({ type, item }: { type: string; item: any }) {
  const parts: string[] = [];

  if (item.lead?.fullName) parts.push(`Lead: ${item.lead.fullName}`);
  if (item.lead?.phone) parts.push(`Phone: ${item.lead.phone}`);
  if (item.customer?.fullName) parts.push(`Customer: ${item.customer.fullName}`);
  if (item.customer?.companyName) parts.push(`Company: ${item.customer.companyName}`);
  if (item.agency?.name) parts.push(`Agency: ${item.agency.name}`);

  if (type === "otherMeeting") {
    if (item.contactName) parts.push(`Contact: ${item.contactName}`);
    if (item.companyName) parts.push(`Company: ${item.companyName}`);
    if (item.phone) parts.push(`Phone: ${item.phone}`);
    if (item.email) parts.push(`Email: ${item.email}`);
  }

  if (item.assignedTo?.name) parts.push(`Assigned to: ${item.assignedTo.name}`);
  if (item.assignedSales?.name) parts.push(`Sales: ${item.assignedSales.name}`);
  if (item.createdBy?.name) parts.push(`Created by: ${item.createdBy.name}`);
  if (item.projectName) parts.push(`Project: ${item.projectName}`);
  if (item.location) parts.push(`Location: ${item.location}`);
  if (item.outcome) parts.push(`Outcome: ${formatOutcome(item.outcome)}`);
  if (item.priority) parts.push(`Priority: ${item.priority}`);
  if (item.type && type === "leadActivity") parts.push(`Activity: ${item.type}`);
  if (item.callOutcome) parts.push(`Call: ${item.callOutcome}`);

  if (parts.length === 0) return null;

  return (
    <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
      {parts.join(" • ")}
    </div>
  );
}

function getDescription(type: string, item: any) {
  if (type === "leadActivity") {
    return item.details || item.summary || item.note || null;
  }

  return (
    item.description ||
    item.notes ||
    item.notesSummary ||
    item.note ||
    item.details ||
    item.summary ||
    null
  );
}

function getTimingInfo(type: string, item: any) {
  const date = item.meetingAt || item.presentationAt || item.dueAt;
  if (!date) return null;

  const time = new Date(date).getTime();
  const now = Date.now();

  const isTask =
    type === "crmTask" ||
    type === "crmTaskCreated" ||
    type === "agencyTask" ||
    type === "agencyTaskCreated";

  const isMeeting =
    type === "agencyMeeting" ||
    type === "presentation" ||
    type === "otherMeeting";

  if (isTask) {
    if (item.status === "DONE") return { label: "Done", className: "success" };
    if (item.status === "CANCELLED") return { label: "Cancelled", className: "danger" };
    if (time < now) return { label: "Overdue", className: "danger" };
    return { label: "Upcoming", className: "info" };
  }

  if (isMeeting) {
    if (item.status === "COMPLETED") return { label: "Completed", className: "success" };
    if (item.status === "CANCELLED") return { label: "Cancelled", className: "danger" };
    if (time > now) return { label: "Not due yet", className: "info" };
    if (time < now && item.status !== "COMPLETED") {
      return { label: "Needs update", className: "warning" };
    }
  }

  return null;
}

function getTypeLabel(type: string) {
  if (type === "crmTask") return "Assigned Task";
  if (type === "crmTaskCreated") return "Created Task";
  if (type === "agencyTask") return "Assigned Agency Task";
  if (type === "agencyTaskCreated") return "Created Agency Task";
  if (type === "agencyMeeting") return "Agency Meeting";
  if (type === "presentation") return "Presentation";
  if (type === "otherMeeting") return "Other Meeting";
  if (type === "leadActivity") return "Lead Activity";
  if (type === "customer") return "Customer";
  if (type === "agencyNote") return "Agency Note";
  return type;
}

function getTypeIcon(type: string) {
  if (type === "crmTask" || type === "crmTaskCreated") return "✅";
  if (type === "agencyTask" || type === "agencyTaskCreated") return "🧩";
  if (type === "agencyMeeting") return "🏢";
  if (type === "presentation") return "📊";
  if (type === "otherMeeting") return "🤝";
  if (type === "leadActivity") return "☎️";
  if (type === "customer") return "👤";
  if (type === "agencyNote") return "📝";
  return "•";
}

function getTypeColor(type: string) {
  if (type === "crmTask" || type === "crmTaskCreated") return "#f59e0b";
  if (type === "agencyTask" || type === "agencyTaskCreated") return "#8b5cf6";
  if (type === "agencyMeeting") return "#2563eb";
  if (type === "presentation") return "#16a34a";
  if (type === "otherMeeting") return "#0f766e";
  if (type === "leadActivity") return "#dc2626";
  if (type === "customer") return "#64748b";
  if (type === "agencyNote") return "#9333ea";
  return "#94a3b8";
}

function getTypeBadgeClass(type: string) {
  if (type === "crmTask" || type === "crmTaskCreated") return "warning";
  if (type === "agencyTask" || type === "agencyTaskCreated") return "info";
  if (type === "agencyMeeting") return "info";
  if (type === "presentation") return "success";
  if (type === "otherMeeting") return "success";
  if (type === "leadActivity") return "danger";
  if (type === "agencyNote") return "warning";
  return "";
}

function statusBadgeClass(status?: string | null) {
  if (status === "DONE" || status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "IN_PROGRESS" || status === "RESCHEDULED") return "warning";
  return "info";
}

function formatStatus(status?: string | null) {
  if (!status) return "-";

  const labels: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
    CANCELLED: "Cancelled",
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    RESCHEDULED: "Rescheduled",
  };

  return labels[status] || status;
}

function formatOutcome(outcome?: string | null) {
  if (!outcome) return "-";

  const labels: Record<string, string> = {
    POSITIVE: "Positive",
    NEGATIVE: "Negative",
    FOLLOW_UP: "Follow-up",
    NO_DECISION: "No Decision",
    WON: "Won",
    LOST: "Lost",
  };

  return labels[outcome] || outcome;
}

function getRecordHref(type: string, item: any) {
  if (type === "crmTask" || type === "crmTaskCreated") return `/tasks/${item.id}`;
  if (type === "agencyTask" || type === "agencyTaskCreated") return `/tasks/${item.id}`;
  if (type === "agencyMeeting") return `/meetings/${item.id}?kind=AGENCY`;
  if (type === "presentation") return `/meetings/${item.id}?kind=PRESENTATION`;
  if (type === "otherMeeting") return `/meetings/${item.id}?kind=OTHER`;
  if (type === "leadActivity" && item.lead?.id) return `/leads/${item.lead.id}`;
  if (type === "customer") return `/customers/${item.id}`;
  if (type === "agencyNote" && item.agency?.id) return `/agencies/${item.agency.id}`;

  return null;
}