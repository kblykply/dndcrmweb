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

export default function UserActivityDetailPage() {
  const params = useParams();
  const userId = Array.isArray((params as any)?.id)
    ? (params as any).id[0]
    : (params as any)?.id;

  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<RangeKey>("WEEK");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!userId) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await authedFetch(`/user-activity/${userId}`);
      setData(res);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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

  function inRange(item: any) {
    const from = dateFromRange();
    if (!from) return true;

    const raw =
      item.createdAt ||
      item.updatedAt ||
      item.dueAt ||
      item.meetingAt ||
      item.presentationAt;

    if (!raw) return false;

    return new Date(raw).getTime() >= from.getTime();
  }

  function matchesSearch(item: any) {
    const search = q.trim().toLowerCase();
    if (!search) return true;

    const text = JSON.stringify(item || {}).toLowerCase();
    return text.includes(search);
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
        type: "crmTask",
        rows: filterRows(data.crmTasksCreated),
      },
      {
        title: "Agency Tasks Assigned",
        type: "agencyTask",
        rows: filterRows(data.agencyTasksAssigned),
      },
      {
        title: "Agency Tasks Created",
        type: "agencyTask",
        rows: filterRows(data.agencyTasksCreated),
      },
      {
        title: "Agency Meetings Created",
        type: "agencyMeeting",
        rows: filterRows(data.agencyMeetingsAuthored),
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
        title: "Presentations Created",
        type: "presentation",
        rows: filterRows(data.presentationsCreated),
      },
      {
        title: "Presentations Assigned",
        type: "presentation",
        rows: filterRows(data.presentationsAssigned),
      },
      {
        title: "Owned Customers",
        type: "customer",
        rows: filterRows(data.ownedCustomers),
      },
    ].filter((section) => section.rows.length > 0);
  }, [data, range, q]);

  const stats = useMemo(() => {
    const allRows = sections.flatMap((s) => s.rows);

    return {
      total: allRows.length,
      tasks: sections
        .filter((s) => s.type === "crmTask" || s.type === "agencyTask")
        .reduce((sum, s) => sum + s.rows.length, 0),
      meetings: sections
        .filter((s) => s.type === "agencyMeeting" || s.type === "presentation")
        .reduce((sum, s) => sum + s.rows.length, 0),
      leads: sections
        .filter((s) => s.type === "leadActivity")
        .reduce((sum, s) => sum + s.rows.length, 0),
      customers: sections
        .filter((s) => s.type === "customer")
        .reduce((sum, s) => sum + s.rows.length, 0),
    };
  }, [sections]);

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
        <div
          className="card"
          style={{ border: "1px solid rgba(239,68,68,.35)" }}
        >
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
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activity, lead, customer, agency, task..."
          />

          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
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
        <Stat title="Total Records" value={stats.total} />
        <Stat title="Tasks" value={stats.tasks} />
        <Stat title="Meetings" value={stats.meetings} />
        <Stat title="Lead Activity" value={stats.leads} />
        <Stat title="Customers" value={stats.customers} />
      </div>

      {sections.length === 0 ? (
        <div className="card">
          <div style={{ fontWeight: 900 }}>No activity found</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Try changing the date range or search filter.
          </div>
        </div>
      ) : (
        sections.map((section) => (
          <Section
            key={section.title}
            title={section.title}
            type={section.type}
            rows={section.rows}
          />
        ))
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="card">
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
}: {
  title: string;
  type: string;
  rows: any[];
}) {
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <span className="badge">{rows.length}</span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.slice(0, 100).map((item: any) => (
          <ActivityCard key={`${type}-${item.id}`} type={type} item={item} />
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ type, item }: { type: string; item: any }) {
  const href = getRecordHref(type, item);

  const title =
    item.title ||
    item.fullName ||
    item.name ||
    item.note ||
    item.type ||
    item.status ||
    item.id;

  const date =
    item.createdAt ||
    item.updatedAt ||
    item.dueAt ||
    item.meetingAt ||
    item.presentationAt;

  const content = (
    <div
      style={{
        border: "1px solid var(--stroke)",
        borderRadius: 12,
        padding: 12,
        background: "var(--surface-2)",
        display: "grid",
        gap: 7,
        cursor: href ? "pointer" : "default",
      }}
    >
      <div className="flex-between" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>{title}</div>

        {item.status ? <span className="badge">{item.status}</span> : null}
      </div>

      <div className="muted" style={{ fontSize: 12 }}>
        {date ? new Date(date).toLocaleString() : "-"}
      </div>

      <MetaLine type={type} item={item} />

      {item.description ? (
        <div style={{ fontSize: 13 }}>{item.description}</div>
      ) : null}

      {item.notesSummary ? (
        <div style={{ fontSize: 13 }}>{item.notesSummary}</div>
      ) : null}

      {item.note && type !== "agencyNote" ? (
        <div style={{ fontSize: 13 }}>{item.note}</div>
      ) : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} target="_blank"

  rel="noopener noreferrer"  style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}

function MetaLine({ type, item }: { type: string; item: any }) {
  const parts: string[] = [];

  if (item.lead?.fullName) parts.push(`Lead: ${item.lead.fullName}`);
  if (item.lead?.phone) parts.push(`Phone: ${item.lead.phone}`);
  if (item.customer?.fullName) parts.push(`Customer: ${item.customer.fullName}`);
  if (item.agency?.name) parts.push(`Agency: ${item.agency.name}`);
  if (item.assignedTo?.name) parts.push(`Assigned to: ${item.assignedTo.name}`);
  if (item.assignedSales?.name) parts.push(`Sales: ${item.assignedSales.name}`);
  if (item.createdBy?.name) parts.push(`Created by: ${item.createdBy.name}`);
  if (item.projectName) parts.push(`Project: ${item.projectName}`);
  if (item.location) parts.push(`Location: ${item.location}`);
  if (item.outcome) parts.push(`Outcome: ${item.outcome}`);
  if (item.priority) parts.push(`Priority: ${item.priority}`);
  if (item.type && type === "leadActivity") parts.push(`Activity: ${item.type}`);

  if (parts.length === 0) return null;

  return (
    <div className="muted" style={{ fontSize: 12 }}>
      {parts.join(" • ")}
    </div>
  );
}

function getRecordHref(type: string, item: any) {
  // 🔵 CRM TASK → task detail page
  if (type === "crmTask") {
    return `/tasks/${item.id}`;
  }

  // 🟣 AGENCY TASK → task detail page (same page)
  if (type === "agencyTask") {
    return `/tasks/${item.id}`;
  }

  // 🟢 MEETING → meeting detail page
  if (type === "agencyMeeting") {
    return `/meetings/${item.id}`;
  }

  // 🟡 PRESENTATION (meeting) → presentation detail
  if (type === "presentation") {
    return `/meetings/${item.id}`;
  }

  // 🟠 LEAD ACTIVITY → go to lead
  if (type === "leadActivity" && item.lead?.id) {
    return `/leads/${item.lead.id}`;
  }

  // 🔴 CUSTOMER → customer detail
  if (type === "customer") {
    return `/customers/${item.id}`;
  }

  // 🟤 AGENCY NOTE → agency page
  if (type === "agencyNote" && item.agency?.id) {
    return `/agencies/${item.agency.id}`;
  }

  return null;
}