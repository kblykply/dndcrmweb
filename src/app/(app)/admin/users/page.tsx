"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Role = "ADMIN" | "CALLCENTER" | "MANAGER" | "SALES";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
};

const ROLES: Role[] = ["ADMIN", "CALLCENTER", "MANAGER", "SALES"];

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

export default function AdminUsersPage() {
  const { t, locale } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [managers, setManagers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CALLCENTER");
  const [managerId, setManagerId] = useState("");

  const isAdmin = me?.role === "ADMIN";

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await authedFetch("/users?all=true");
      setUsers(data);

      const managerList = data.filter(
        (u: UserRow) => u.role === "MANAGER" || u.role === "ADMIN"
      );
      setManagers(managerList);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    setErr(null);
    setSaving(true);
    try {
      await authedFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          managerId: role === "SALES" ? managerId || null : null,
        }),
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("CALLCENTER");
      setManagerId("");

      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(userId: string) {
    if (!confirm(t("adminUsers.confirmDeactivate"))) return;

    setErr(null);
    try {
      await authedFetch(`/users/${userId}/deactivate`, {
        method: "PATCH",
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter((u) =>
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(qq)
    );
  }, [users, q]);

  if (!mounted) return <div>{t("common.loading")}</div>;

  if (!isAdmin) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {t("admin.unauthorizedTitle")}
        </div>
        <div className="muted">{t("adminUsers.unauthorizedText")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("roles.ADMIN")}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {t("adminUsers.title")}
          </div>
        </div>

        <button onClick={load} disabled={loading}>
          {loading ? t("common.refreshing") : t("common.refresh")}
        </button>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{t("adminUsers.createTitle")}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr 1fr auto",
            gap: 10,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adminUsers.fields.name")}
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("adminUsers.fields.email")}
            type="email"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("adminUsers.fields.password")}
            type="password"
          />

          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {safeTranslate(t, `roles.${r}`, r)}
              </option>
            ))}
          </select>

          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            disabled={role !== "SALES"}
          >
            <option value="">{t("adminUsers.fields.selectManager")}</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            className="primary"
            onClick={createUser}
            disabled={
              saving ||
              !name.trim() ||
              !email.trim() ||
              !password.trim() ||
              (role === "SALES" && !managerId)
            }
          >
            {saving ? t("adminUsers.creating") : t("adminUsers.create")}
          </button>
        </div>

        {err ? (
          <div
            style={{
              border: "1px solid rgba(239,68,68,.35)",
              background: "rgba(239,68,68,.08)",
              padding: 12,
              borderRadius: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("adminUsers.searchPlaceholder")}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>{t("adminUsers.table.name")}</th>
              <th>{t("adminUsers.table.email")}</th>
              <th>{t("adminUsers.table.role")}</th>
              <th>{t("adminUsers.table.status")}</th>
              <th>{t("adminUsers.table.createdAt")}</th>
              <th>{t("adminUsers.table.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 800 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className="badge">
                    {safeTranslate(t, `roles.${u.role}`, u.role)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? "success" : "danger"}`}>
                    {u.isActive ? t("adminUsers.active") : t("adminUsers.passive")}
                  </span>
                </td>
                <td>
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleString(
                        locale === "tr" ? "tr-TR" : "en-US"
                      )
                    : "-"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a
                      href={`/admin/users/${u.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 10,
                        background: "var(--surface)",
                        boxShadow: "var(--shadow-sm)",
                        fontWeight: 600,
                        fontSize: 13,
                        textDecoration: "none",
                        color: "var(--text-primary)",
                      }}
                    >
                      {t("common.edit")}
                    </a>

                    {u.isActive ? (
                      <button onClick={() => deactivateUser(u.id)}>
                        {t("adminUsers.deactivate")}
                      </button>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, color: "var(--text-secondary)" }}>
            {t("adminUsers.noUsers")}
          </div>
        ) : null}
      </div>
    </div>
  );
}