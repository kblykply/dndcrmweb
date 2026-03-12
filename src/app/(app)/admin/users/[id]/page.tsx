"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";

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

function normalizeErrorMessage(input: unknown) {
  const text = String(input || "");

  if (text.includes("You cannot delete your own account")) {
    return "Kendi hesabınızı silemezsiniz.";
  }
  if (text.includes("You cannot force delete your own account")) {
    return "Kendi hesabınızı zorla silemezsiniz.";
  }
  if (text.includes("User not found")) {
    return "Kullanıcı bulunamadı.";
  }
  if (text.includes("Another user already uses this email")) {
    return "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.";
  }
  if (text.includes("Password must be at least 8 characters")) {
    return "Şifre en az 8 karakter olmalıdır.";
  }
  if (text.includes("Selected manager not found or inactive")) {
    return "Seçilen yönetici bulunamadı veya pasif durumda.";
  }
  if (text.includes("managerId must belong to a MANAGER or ADMIN")) {
    return "Seçilen yönetici MANAGER veya ADMIN rolünde olmalıdır.";
  }
  if (text.includes("This user still has related business records")) {
    return "Bu kullanıcıya ait ilişkili CRM kayıtları bulunduğu için silinemez. Önce bağlı kayıtlar temizlenmeli veya kullanıcı pasife alınmalıdır.";
  }
  if (text.includes("Force delete is only allowed for test users")) {
    return "Zorla silme yalnızca test kullanıcıları için kullanılabilir.";
  }
  if (text.includes("Unauthorized")) {
    return "Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.";
  }

  return text;
}

function formatDeleteBlockers(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    const payload = parsed?.message ?? parsed;

    if (payload?.message && payload?.blockers && typeof payload.blockers === "object") {
      const b = payload.blockers;

      return [
        "Bu kullanıcı silinemiyor. Bağlı kayıtlar bulundu:",
        "",
        `• Call Center Lead: ${b.callcenterLeads ?? 0}`,
        `• Manager Lead: ${b.managedLeads ?? 0}`,
        `• Sales Lead: ${b.salesLeads ?? 0}`,
        `• Aktivite: ${b.activities ?? 0}`,
        `• Oluşturduğu Görev: ${b.tasksCreated ?? 0}`,
        `• Atanan Görev: ${b.tasksAssigned ?? 0}`,
        `• Audit Log: ${b.audits ?? 0}`,
        `• Stage Change: ${b.stageChanges ?? 0}`,
        `• Alt Kullanıcı (reps): ${b.reps ?? 0}`,
        "",
        "Önce bu kayıtları temizleyin veya kullanıcıyı pasife alın.",
      ].join("\n");
    }
  } catch {
    // ignore
  }

  return normalizeErrorMessage(raw);
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  const [user, setUser] = useState<UserRow | null>(null);
  const [managers, setManagers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function load() {
    if (!id) {
      setErr("Kullanıcı ID bulunamadı.");
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

      setUser(userData);
      setName(userData.name || "");
      setEmail(userData.email || "");
      setPassword("");
      setRole(userData.role);
      setManagerId(userData.managerId || "");
      setIsActive(userData.isActive);

      const managerList = (allUsers as UserRow[]).filter(
        (u) => u.role === "MANAGER" || u.role === "ADMIN"
      );
      setManagers(managerList);
    } catch (e: any) {
      setUser(null);
      setErr(normalizeErrorMessage(e?.message || e));
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
          managerId: role === "SALES" ? managerId || null : null,
          isActive,
        }),
      });

      setPassword("");
      await load();
      alert("Kullanıcı güncellendi.");
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser() {
    if (!user) return;
    if (!confirm("Bu kullanıcı pasif hale getirilsin mi?")) return;

    setErr(null);
    setSaving(true);
    try {
      await authedFetch(`/users/${user.id}/deactivate`, {
        method: "PATCH",
      });
      await load();
      alert("Kullanıcı pasif hale getirildi.");
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!user) return;
    if (!confirm("Bu kullanıcı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;

    setErr(null);
    setDeleting(true);
    try {
      await authedFetch(`/users/${user.id}`, {
        method: "DELETE",
      });

      alert("Kullanıcı silindi.");
      window.location.href = "/admin/users";
    } catch (e: any) {
      setErr(formatDeleteBlockers(String(e?.message || e)));
    } finally {
      setDeleting(false);
    }
  }

  async function forceDeleteUser() {
    if (!user) return;

    const ok = confirm(
      "Bu işlem test kullanıcıyı zorla silecektir. İlişkili görev, aktivite, audit ve atama kayıtları da temizlenebilir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"
    );
    if (!ok) return;

    setErr(null);
    setForceDeleting(true);
    try {
      await authedFetch(`/users/${user.id}/force`, {
        method: "DELETE",
      });

      alert("Kullanıcı zorla silindi.");
      window.location.href = "/admin/users";
    } catch (e: any) {
      setErr(normalizeErrorMessage(e?.message || e));
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

  const managerRequired = useMemo(() => role === "SALES", [role]);

  if (!mounted) return <div>Yükleniyor…</div>;

  if (!isAdmin) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Yetkisiz Erişim</div>
        <div className="muted">Bu sayfayı görüntülemek için ADMIN olmalısınız.</div>
      </div>
    );
  }

  if (loading) {
    return <div className="card">Kullanıcı yükleniyor…</div>;
  }

  if (!user) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Kullanıcı Bulunamadı</div>
        <div className="muted">{err || "Böyle bir kullanıcı yok."}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between">
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <a href="/admin/users" style={{ fontWeight: 800 }}>
              ← Kullanıcılara Dön
            </a>
          </div>

          <div style={{ fontSize: 24, fontWeight: 900 }}>{user.name}</div>
          <div className="muted">
            Oluşturulma: {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className={`badge ${user.isActive ? "success" : "danger"}`}>
            {user.isActive ? "Aktif" : "Pasif"}
          </span>
          <span className="badge">{user.role}</span>
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
        <div style={{ fontWeight: 900 }}>Kullanıcı Bilgileri</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Ad Soyad</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>E-posta</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Yeni Şifre</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Boş bırakırsanız değişmez"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Yönetici</span>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={!managerRequired}
            >
              <option value="">Yönetici seç</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Durum</span>
            <select
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
            >
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load}>Sıfırla</button>
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
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>Tehlikeli İşlemler</div>

        <div className="muted" style={{ fontSize: 13 }}>
          Gerçek kullanıcılar için önce <b>Pasife Al</b> kullanmanız önerilir. Silme işlemi kalıcıdır.
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={deactivateUser} disabled={saving || !user.isActive}>
            Pasife Al
          </button>

          <button
            className="danger"
            onClick={deleteUser}
            disabled={deleting || forceDeleting || isSelf}
          >
            {deleting ? "Siliniyor..." : "Kullanıcıyı Sil"}
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
            {forceDeleting ? "İşleniyor..." : "Test Kullanıcıyı Zorla Sil"}
          </button>
        </div>

        {isSelf ? (
          <div className="muted" style={{ fontSize: 12 }}>
            Kendi hesabınızı silemezsiniz.
          </div>
        ) : null}
      </div>
    </div>
  );
}