"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
};

function badgeClass(role?: string) {
  if (role === "ADMIN") return "danger";
  if (role === "MANAGER") return "success";
  if (role === "SALES") return "info";
  if (role === "CALLCENTER") return "warning";
  return "";
}

export default function UsersActivityPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await authedFetch("/user-activity");
      setItems(Array.isArray(data) ? data : []);
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
    if (!search) return items;

    return items.filter((u) =>
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search)
    );
  }, [items, q]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>User Activity</div>
          <div className="muted" style={{ fontSize: 13 }}>
            View user actions, tasks, meetings, leads and CRM history.
          </div>
        </div>

        <button onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="card">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search user, email or role..."
        />
      </div>

      {err ? (
        <div className="card" style={{ border: "1px solid rgba(239,68,68,.35)" }}>
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
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <a href={`/users-activity/${u.id}`} style={{ fontWeight: 900 }}>
                    {u.name}
                  </a>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${badgeClass(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.isActive ? "Active" : "Passive"}</td>
                <td>
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
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