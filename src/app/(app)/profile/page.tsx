"use client";

import { useEffect, useMemo, useState } from "react";
import { API } from "@/lib/api";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getUser,
  setAccessToken,
  setSession,
} from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import CustomerWorkspace from "./CustomerWorkspace";

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function roleLabel(role: string | undefined, locale: string) {
  const labels: Record<string, { en: string; tr: string }> = {
    ADMIN: { en: "Admin", tr: "Admin" },
    MANAGER: { en: "Manager", tr: "Yönetici" },
    SALES: { en: "Sales", tr: "Satış" },
    CALLCENTER: { en: "Call Center", tr: "Çağrı Merkezi" },
    AFTERSALES: { en: "After Sales", tr: "Satış Sonrası" },
    ACCOUNTING: { en: "Accounting", tr: "Muhasebe" },
    PREVIEW: { en: "Preview", tr: "Ön İzleme" },
  };

  return role ? labels[role]?.[locale === "tr" ? "tr" : "en"] || role : "-";
}

export default function ProfileSettings() {
  const { locale } = useLanguage();
  const [me, setMe] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const avatarPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  async function upload() {
    if (!file) return;

    setErr(null);
    setSaving(true);

    try {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!token || !refreshToken) {
        throw new Error("Not logged in");
      }

      const fd = new FormData();
      fd.append("file", file);

      let res = await fetch(`${API}/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401 && refreshToken) {
        const refreshRes = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          clearSession();
          window.location.href = "/";
          throw new Error("Session expired");
        }

        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.accessToken);

        res = await fetch(`${API}/users/me/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${refreshData.accessToken}` },
          body: fd,
        });
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const updatedUser = {
        ...(me || {}),
        avatarUrl: data.avatarUrl,
      };

      setSession(updatedUser, getAccessToken() || token, refreshToken);
      setMe(updatedUser);
      setFile(null);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) {
    return <div>{locale === "tr" ? "Yükleniyor..." : "Loading..."}</div>;
  }

  const avatarSrc = avatarPreview || me?.avatarUrl || "";

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-copy">
          <span className="profile-kicker">
            {locale === "tr" ? "Hesap merkezi" : "Account center"}
          </span>
          <h1>{locale === "tr" ? "Profilim" : "My Profile"}</h1>
          <p>
            {locale === "tr"
              ? "Profil fotoğrafı, sana bağlı müşteriler, sunumlar ve hızlı sorumlu değişiklikleri tek ekranda."
              : "Profile photo, assigned customers, presentations and quick ownership actions in one workspace."}
          </p>
        </div>

        <div className="profile-account">
          <div className="profile-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" />
            ) : (
              <span>{initials(me?.name, me?.email)}</span>
            )}
          </div>

          <div className="profile-identity">
            <strong>{me?.name || "-"}</strong>
            <span>{me?.email || "-"}</span>
            <div>
              <span className="badge info">{roleLabel(me?.role, locale)}</span>
            </div>
          </div>

          <div className="profile-upload">
            <label>
              <span>
                {locale === "tr" ? "Profil fotoğrafı" : "Profile photo"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <button className="primary" onClick={upload} disabled={!file || saving}>
              {saving
                ? locale === "tr"
                  ? "Yükleniyor..."
                  : "Uploading..."
                : locale === "tr"
                  ? "Kaydet"
                  : "Save"}
            </button>
          </div>
        </div>

        {err ? <div className="profile-alert">{err}</div> : null}
      </section>

      <CustomerWorkspace />

      <style jsx>{`
        .profile-page {
          display: grid;
          gap: 16px;
          padding-bottom: 28px;
        }

        .profile-hero {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) minmax(360px, 520px);
          gap: 18px;
          align-items: stretch;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          padding: 22px;
        }

        .profile-copy {
          display: grid;
          align-content: center;
          gap: 8px;
          min-width: 0;
        }

        .profile-kicker {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 800;
        }

        .profile-copy h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
        }

        .profile-copy p {
          max-width: 640px;
          margin: 0;
          font-size: 14px;
        }

        .profile-account {
          display: grid;
          grid-template-columns: auto minmax(140px, 1fr);
          gap: 16px;
          align-items: center;
          border-left: 1px solid var(--stroke);
          padding-left: 18px;
        }

        .profile-avatar {
          width: 82px;
          height: 82px;
          border-radius: 999px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: var(--primary);
          color: var(--primary-foreground);
          font-size: 24px;
          font-weight: 950;
          box-shadow: inset 0 0 0 1px var(--stroke);
          flex: 0 0 auto;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .profile-identity {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .profile-identity strong {
          font-size: 18px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .profile-identity > span {
          color: var(--text-secondary);
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .profile-upload {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
          padding-top: 4px;
        }

        .profile-upload label {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .profile-upload label span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .profile-alert {
          grid-column: 1 / -1;
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
          border-radius: 8px;
          padding: 12px;
          white-space: pre-wrap;
          color: var(--text-primary);
        }

        @media (max-width: 980px) {
          .profile-hero {
            grid-template-columns: 1fr;
          }

          .profile-account {
            border-left: 0;
            border-top: 1px solid var(--stroke);
            padding-left: 0;
            padding-top: 18px;
          }
        }

        @media (max-width: 620px) {
          .profile-hero {
            padding: 16px;
          }

          .profile-account {
            grid-template-columns: 1fr;
          }

          .profile-upload {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
