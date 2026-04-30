"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";

type UserStats = {
  total: number;
  tasks: number;
  meetings: number;
  leads: number;
  customers: number;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  stats?: UserStats;
};

type SortKey =
  | "TOTAL"
  | "TASKS"
  | "MEETINGS"
  | "LEADS"
  | "CUSTOMERS"
  | "NAME";

function badgeClass(role?: string) {
  if (role === "ADMIN") return "danger";
  if (role === "MANAGER") return "success";
  if (role === "SALES") return "info";
  if (role === "CALLCENTER") return "warning";
  return "";
}

function emptyStats(): UserStats {
  return {
    total: 0,
    tasks: 0,
    meetings: 0,
    leads: 0,
    customers: 0,
  };
}

export default function UsersActivityPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("TOTAL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await authedFetch("/user-activity");
      const users: UserRow[] = Array.isArray(data) ? data : [];
      setItems(users);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    let rows = items.filter((u) => {
      const matchesSearch = search
        ? `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search)
        : true;

      const matchesRole = roleFilter === "ALL" ? true : u.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
            ? u.isActive
            : !u.isActive;

      return matchesSearch && matchesRole && matchesStatus;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === "NAME") return a.name.localeCompare(b.name);

      const aStats = a.stats || emptyStats();
      const bStats = b.stats || emptyStats();

      const map = {
        TOTAL: "total",
        TASKS: "tasks",
        MEETINGS: "meetings",
        LEADS: "leads",
        CUSTOMERS: "customers",
      } as const;

      return bStats[map[sortBy]] - aStats[map[sortBy]];
    });

    return rows;
  }, [items, q, roleFilter, statusFilter, sortBy]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, u) => {
        const stats = u.stats || emptyStats();

        acc.total += stats.total;
        acc.tasks += stats.tasks;
        acc.meetings += stats.meetings;
        acc.leads += stats.leads;
        acc.customers += stats.customers;

        return acc;
      },
      emptyStats(),
    );
  }, [filtered]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>User Activity</div>
          <div className="muted" style={{ fontSize: 13 }}>
            View assigned work, meetings, lead activity and customer ownership.
          </div>
        </div>

        <button onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Stat title="Total Activity" value={totals.total} />
        <Stat title="Tasks" value={totals.tasks} />
        <Stat title="Meetings" value={totals.meetings} />
        <Stat title="Lead Activity" value={totals.leads} />
        <Stat title="Customers" value={totals.customers} />
      </div>

      <div className="card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 160px 220px",
            gap: 10,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user, email or role..."
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="SALES">Sales</option>
            <option value="CALLCENTER">Callcenter</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PASSIVE">Passive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            <option value="TOTAL">Sort by Total Activity</option>
            <option value="TASKS">Sort by Tasks</option>
            <option value="MEETINGS">Sort by Meetings</option>
            <option value="LEADS">Sort by Lead Activity</option>
            <option value="CUSTOMERS">Sort by Customers</option>
            <option value="NAME">Sort by Name</option>
          </select>
        </div>
      </div>

      {err ? (
        <div
          className="card"
          style={{ border: "1px solid rgba(239,68,68,.35)" }}
        >
          {err}
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Total</th>
              <th>Tasks</th>
              <th>Meetings</th>
              <th>Lead Activity</th>
              <th>Customers</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => {
              const stats = u.stats || emptyStats();

              return (
                <tr key={u.id}>
                  <td>
                    <Link
                      href={`/users-activity/${u.id}`}
                      style={{ fontWeight: 900 }}
                    >
                      {u.name}
                    </Link>
                  </td>

                  <td>{u.email}</td>

                  <td>
                    <span className={`badge ${badgeClass(u.role)}`}>
                      {u.role}
                    </span>
                  </td>

                  <td>
                    <span className={`badge ${u.isActive ? "success" : ""}`}>
                      {u.isActive ? "Active" : "Passive"}
                    </span>
                  </td>

                  <td>
                    <b>{stats.total}</b>
                  </td>

                  <td>{stats.tasks}</td>
                  <td>{stats.meetings}</td>
                  <td>{stats.leads}</td>
                  <td>{stats.customers}</td>

                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14 }} className="muted">
            No users found.
          </div>
        ) : null}
      </div>
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