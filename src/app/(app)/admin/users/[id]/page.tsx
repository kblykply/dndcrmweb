"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

  if (text.includes("You cannot delete your own account")) {
    return t("adminUserDetail.errors.cannotDeleteSelf");
  }
  if (text.includes("You cannot force delete your own account")) {
    return t("adminUserDetail.errors.cannotForceDeleteSelf");
  }
  if (text.includes("User not found")) {
    return t("adminUserDetail.errors.userNotFound");
  }
  if (text.includes("Another user already uses this email")) {
    return t("adminUserDetail.errors.emailAlreadyUsed");
  }
  if (text.includes("A user with this email already exists")) {
    return t("adminUserDetail.errors.emailAlreadyUsed");
  }
  if (text.includes("Password must be at least 8 characters")) {
    return t("adminUserDetail.errors.passwordMin");
  }
  if (text.includes("Selected manager not found or inactive")) {
    return t("adminUserDetail.errors.managerNotFound");
  }
  if (text.includes("managerId must belong to a MANAGER or ADMIN")) {
    return t("adminUserDetail.errors.managerRoleInvalid");
  }
  if (text.includes("This user still has related business records")) {
    return t("adminUserDetail.errors.relatedRecords");
  }
  if (text.includes("Force delete is only allowed for test users")) {
    return t("adminUserDetail.errors.forceDeleteOnlyTest");
  }
  if (text.includes("Unauthorized")) {
    return t("adminUserDetail.errors.unauthorized");
  }

  return text;
}

function formatDeleteBlockers(
  raw: string,
  t: (path: string) => string,
) {
  try {
    const parsed = JSON.parse(raw);
    const payload = parsed?.message ?? parsed;

    if (payload?.message && payload?.blockers && typeof payload.blockers === "object") {
      const b = payload.blockers;

      return [
        t("adminUserDetail.deleteBlockers.title"),
        "",
        `• ${t("adminUserDetail.deleteBlockers.callcenterLeads")}: ${b.callcenterLeads ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.managedLeads")}: ${b.managedLeads ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.salesLeads")}: ${b.salesLeads ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.activities")}: ${b.activities ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.tasksCreated")}: ${b.tasksCreated ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.tasksAssigned")}: ${b.tasksAssigned ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.audits")}: ${b.audits ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.stageChanges")}: ${b.stageChanges ?? 0}`,
        `• ${t("adminUserDetail.deleteBlockers.reps")}: ${b.reps ?? 0}`,
        "",
        t("adminUserDetail.deleteBlockers.footer"),
      ].join("\n");
    }
  } catch {
    // ignore
  }

  return normalizeErrorMessage(raw, t);
}

export default function AdminUserDetailPage() {
  const { t, locale } = useLanguage();
  const params = useParams();
  const router = useRouter();

  const rawId = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [user, setUser] = useState<UserRow | null>(null);
  const [managers, setManagers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CALLCENTER");
  const [managerId, setManagerId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isAdmin = me?.role === "ADMIN";
  const isSelf = !!(me?.id && user?.id && me.id === user.id);

  const managerRequired = useMemo(
    () => role === "SALES" || role === "CALLCENTER",
    [role],
  );

  async function load() {
    if (!id) {
      setErr(t("adminUserDetail.errors.missingUserId"));
      setLoading(false);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const [userData, allUsers] = await Promise.all([
        authedFetch(`/users/${id}`),
        authedFetch("/users?all=true"),
      ]);

      const nextUser = userData as UserRow;
      const allRows = Array.isArray(allUsers) ? (allUsers as UserRow[]) : [];

      setUser(nextUser);
      setName(nextUser.name || "");
      setEmail(nextUser.email || "");
      setPassword("");
      setRole(nextUser.role);
      setManagerId(nextUser.managerId || "");
      setIsActive(nextUser.isActive);

      const managerList = allRows.filter(
        (u) => (u.role === "MANAGER" || u.role === "ADMIN") && u.isActive,
      );
      setManagers(managerList);
    } catch (e: any) {
      setUser(null);
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setLoading(false);
    }
  }

  async function saveUser() {
    if (!user) return;

    setErr(null);
    setSaving(true);

    try {
      await authedFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          role,
          managerId: managerRequired ? managerId || null : null,
          isActive,
        }),
      });

      setPassword("");
      await load();
      window.alert(t("adminUserDetail.alerts.updated"));
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser() {
    if (!user) return;

    const ok = window.confirm(t("adminUserDetail.confirmDeactivate"));
    if (!ok) return;

    setErr(null);
    setDeactivating(true);

    try {
      await authedFetch(`/users/${user.id}/deactivate`, {
        method: "PATCH",
      });

      await load();
      window.alert(t("adminUserDetail.alerts.deactivated"));
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setDeactivating(false);
    }
  }

  async function deleteUser() {
    if (!user) return;

    const ok = window.confirm(t("adminUserDetail.confirmDelete"));
    if (!ok) return;

    setErr(null);
    setDeleting(true);

    try {
      await authedFetch(`/users/${user.id}`, {
        method: "DELETE",
      });

      window.alert(t("adminUserDetail.alerts.deleted"));
      router.push("/admin/users");
    } catch (e: any) {
      setErr(formatDeleteBlockers(String(e?.message || e), t));
    } finally {
      setDeleting(false);
    }
  }

  async function forceDeleteUser() {
    if (!user) return;

    const ok = window.confirm(t("adminUserDetail.confirmForceDelete"));
    if (!ok) return;

    setErr(null);
    setForceDeleting(true);

    try {
      await authedFetch(`/users/${user.id}/force`, {
        method: "DELETE",
      });

      window.alert(t("adminUserDetail.alerts.forceDeleted"));
      router.push("/admin/users");
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e, t));
    } finally {
      setForceDeleting(false);
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
  }, [mounted, id]);

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

  if (loading) {
    return <div className="card">{t("adminUserDetail.loading")}</div>;
  }

  if (!user) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {t("adminUserDetail.notFoundTitle")}
        </div>
        <div className="muted">{err || t("adminUserDetail.notFoundText")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
          >
            <Link href="/admin/users" style={{ fontWeight: 800 }}>
              ← {t("adminUserDetail.backToUsers")}
            </Link>
          </div>

          <div style={{ fontSize: 24, fontWeight: 900 }}>{user.name}</div>
          <div className="muted">
            {t("adminUserDetail.createdAt")}:{" "}
            {user.createdAt
              ? new Date(user.createdAt).toLocaleString(
                  locale === "tr" ? "tr-TR" : "en-US",
                )
              : "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className={`badge ${user.isActive ? "success" : "danger"}`}>
            {user.isActive ? t("adminUsers.active") : t("adminUsers.passive")}
          </span>
          <span className="badge">
            {safeTranslate(t, `roles.${user.role}`, user.role)}
          </span>
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

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{t("adminUserDetail.userInfoTitle")}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {t("adminUsers.fields.name")}
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {t("adminUsers.fields.email")}
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {t("adminUserDetail.newPassword")}
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={t("adminUserDetail.passwordPlaceholder")}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {t("adminUsers.table.role")}
            </span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {safeTranslate(t, `roles.${r}`, r)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {t("adminUserDetail.manager")}
            </span>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={!managerRequired}
            >
              <option value="">{t("adminUsers.fields.selectManager")}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {t("adminUsers.table.status")}
            </span>
            <select
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
            >
              <option value="true">{t("adminUsers.active")}</option>
              <option value="false">{t("adminUsers.passive")}</option>
            </select>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button onClick={load}>{t("common.reset")}</button>
          <button
            className="primary"
            onClick={saveUser}
            disabled={
              saving ||
              !name.trim() ||
              !email.trim() ||
              (managerRequired && !managerId)
            }
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>{t("adminUserDetail.dangerZoneTitle")}</div>

        <div className="muted" style={{ fontSize: 13 }}>
          {t("adminUserDetail.dangerZoneText")}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={deactivateUser}
            disabled={deactivating || saving || !user.isActive}
          >
            {deactivating ? t("common.processing") : t("adminUsers.deactivate")}
          </button>

          <button
            className="danger"
            onClick={deleteUser}
            disabled={deleting || forceDeleting || isSelf}
          >
            {deleting ? t("common.deleting") : t("adminUserDetail.deleteUser")}
          </button>

          <button
            onClick={forceDeleteUser}
            disabled={deleting || forceDeleting || isSelf}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,.25)",
              background: "rgba(239,68,68,.08)",
              color: "#b42318",
              fontWeight: 700,
            }}
          >
            {forceDeleting
              ? t("adminUserDetail.processing")
              : t("adminUserDetail.forceDeleteTestUser")}
          </button>
        </div>

        {isSelf ? (
          <div className="muted" style={{ fontSize: 12 }}>
            {t("adminUserDetail.errors.cannotDeleteSelf")}
          </div>
        ) : null}
      </div>
    </div>
  );
}