"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

function normalizeErrorMessage(
  input: unknown,
  t: (path: string) => string,
) {
  const text = String(input || "");

  if (text.includes("A user with this email already exists")) {
    return safeTranslate(
      t,
      "adminUsers.errors.emailExists",
      "A user with this email already exists",
    );
  }

  if (text.includes("Another user already uses this email")) {
    return safeTranslate(
      t,
      "adminUsers.errors.emailExists",
      "Another user already uses this email",
    );
  }

  if (text.includes("Password must be at least 8 characters")) {
    return safeTranslate(
      t,
      "adminUsers.errors.passwordMin",
      "Password must be at least 8 characters",
    );
  }

  if (text.includes("Selected manager not found or inactive")) {
    return safeTranslate(
      t,
      "adminUsers.errors.managerInvalid",
      "Selected manager not found or inactive",
    );
  }

  if (text.includes("managerId must belong to a MANAGER or ADMIN")) {
    return safeTranslate(
      t,
      "adminUsers.errors.managerRoleInvalid",
      "managerId must belong to a MANAGER or ADMIN",
    );
  }

  if (text.includes("You cannot delete your own account")) {
    return safeTranslate(
      t,
      "adminUsers.errors.cannotDeleteSelf",
      "You cannot delete your own account",
    );
  }

  if (text.includes("You cannot force delete your own account")) {
    return safeTranslate(
      t,
      "adminUsers.errors.cannotForceDeleteSelf",
      "You cannot force delete your own account",
    );
  }

  if (text.includes("This user still has related business records")) {
    return safeTranslate(
      t,
      "adminUsers.errors.relatedRecords",
      "This user still has related business records. Deactivate instead of deleting.",
    );
  }

  if (text.includes("User not found")) {
    return safeTranslate(
      t,
      "adminUsers.errors.userNotFound",
      "User not found",
    );
  }

  return text;
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
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CALLCENTER");
  const [managerId, setManagerId] = useState("");

  const isAdmin = me?.role === "ADMIN";
  const meId = me?.id as string | undefined;
  const needsManager = role === "SALES" || role === "CALLCENTER";

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const data = await authedFetch("/users?all=true");
      const rows = Array.isArray(data) ? (data as UserRow[]) : [];

      setUsers(rows);

      const managerList = rows.filter(
        (u) =>
          (u.role === "MANAGER" || u.role === "ADMIN") &&
          u.isActive,
      );
      setManagers(managerList);
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
      setUsers([]);
      setManagers([]);
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
          managerId: needsManager ? managerId || null : null,
        }),
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("CALLCENTER");
      setManagerId("");

      await load();
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(userId: string) {
    const ok = window.confirm(
      safeTranslate(
        t,
        "adminUsers.confirmDeactivate",
        locale === "tr"
          ? "Bu kullanıcı pasife alınsın mı?"
          : "Deactivate this user?",
      ),
    );
    if (!ok) return;

    setErr(null);
    setRowBusyId(userId);

    try {
      await authedFetch(`/users/${userId}/deactivate`, {
        method: "PATCH",
      });
      await load();
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setRowBusyId(null);
    }
  }

  async function deleteUser(userId: string) {
    const ok = window.confirm(
      safeTranslate(
        t,
        "adminUsers.confirmDelete",
        locale === "tr"
          ? "Bu kullanıcı silinsin mi? İlişkili kayıt varsa silinmez."
          : "Delete this user? It will fail if related records still exist.",
      ),
    );
    if (!ok) return;

    setErr(null);
    setRowBusyId(userId);

    try {
      await authedFetch(`/users/${userId}`, {
        method: "DELETE",
      });
      await load();
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setRowBusyId(null);
    }
  }

  async function forceDeleteUser(userId: string) {
    const ok = window.confirm(
      safeTranslate(
        t,
        "adminUsers.confirmForceDelete",
        locale === "tr"
          ? "Bu kullanıcı zorla silinsin mi? Bu işlem ilişkili bazı kayıtları da temizleyebilir."
          : "Force delete this user? This may also remove related records.",
      ),
    );
    if (!ok) return;

    setErr(null);
    setRowBusyId(userId);

    try {
      await authedFetch(`/users/${userId}/force`, {
        method: "DELETE",
      });
      await load();
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setRowBusyId(null);
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

  const managersMap = useMemo(() => {
    const map = new Map<string, string>();
    managers.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [managers]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;

    return users.filter((u) =>
      [
        u.name,
        u.email,
        u.role,
        u.managerId ? managersMap.get(u.managerId) : "",
        u.isActive ? "active" : "passive",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(qq),
    );
  }, [users, q, managersMap]);

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
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
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
            disabled={!needsManager}
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
              (needsManager && !managerId)
            }
          >
            {saving ? t("adminUsers.creating") : t("adminUsers.create")}
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          {safeTranslate(
            t,
            "adminUsers.createHint",
            locale === "tr"
              ? "Sales ve Call Center kullanıcıları için yönetici seçebilirsiniz."
              : "You can assign a manager for Sales and Call Center users.",
          )}
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
              <th>
                {safeTranslate(
                  t,
                  "adminUsers.table.manager",
                  locale === "tr" ? "Yönetici" : "Manager",
                )}
              </th>
              <th>{t("adminUsers.table.status")}</th>
              <th>{t("adminUsers.table.createdAt")}</th>
              <th>{t("adminUsers.table.action")}</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => {
              const busy = rowBusyId === u.id;
              const managerName = u.managerId ? managersMap.get(u.managerId) : null;
              const isSelfRow = !!(meId && meId === u.id);

              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 800 }}>{u.name}</td>
                  <td>{u.email}</td>

                  <td>
                    <span className="badge">
                      {safeTranslate(t, `roles.${u.role}`, u.role)}
                    </span>
                  </td>

                  <td>{managerName || "-"}</td>

                  <td>
                    <span className={`badge ${u.isActive ? "success" : "danger"}`}>
                      {u.isActive ? t("adminUsers.active") : t("adminUsers.passive")}
                    </span>
                  </td>

                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleString(
                          locale === "tr" ? "tr-TR" : "en-US",
                        )
                      : "-"}
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link
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
                      </Link>

                      {u.isActive ? (
                        <button onClick={() => deactivateUser(u.id)} disabled={busy || isSelfRow}>
                          {busy
                            ? safeTranslate(
                                t,
                                "common.processing",
                                locale === "tr" ? "İşleniyor..." : "Processing...",
                              )
                            : t("adminUsers.deactivate")}
                        </button>
                      ) : (
                        <span className="muted">-</span>
                      )}

                      <button onClick={() => deleteUser(u.id)} disabled={busy || isSelfRow}>
                        {safeTranslate(
                          t,
                          "adminUsers.delete",
                          locale === "tr" ? "Sil" : "Delete",
                        )}
                      </button>

                      <button onClick={() => forceDeleteUser(u.id)} disabled={busy || isSelfRow}>
                        {safeTranslate(
                          t,
                          "adminUsers.forceDelete",
                          locale === "tr" ? "Zorla Sil" : "Force Delete",
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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