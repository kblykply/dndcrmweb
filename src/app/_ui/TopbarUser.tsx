"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { clearSession, getUser } from "@/lib/auth";

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "K";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "K";
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2.5 12H5M19 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.2 14.2A8.8 8.8 0 1 1 9.8 3.8a7.3 7.3 0 0 0 10.4 10.4Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CONTROL_SIZE = 40;

const controlButtonStyle: React.CSSProperties = {
  width: CONTROL_SIZE,
  height: CONTROL_SIZE,
  minWidth: CONTROL_SIZE,
  minHeight: CONTROL_SIZE,
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "transparent",
  color: "var(--text-primary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background .15s, border-color .15s, transform .05s, box-shadow .15s",
  boxShadow: "none",
  padding: 0,
  flex: "0 0 auto",
};

const skeletonAvatarStyle: React.CSSProperties = {
  width: CONTROL_SIZE,
  height: CONTROL_SIZE,
  minWidth: CONTROL_SIZE,
  minHeight: CONTROL_SIZE,
  borderRadius: 999,
  background: "transparent",
  border: "1px solid var(--stroke)",
  flex: "0 0 auto",
};

export default function TopbarUser() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 72,
    left: 0,
  });

  useEffect(() => {
    setMounted(true);
    setMe(getUser());

    const saved = localStorage.getItem("crm-theme") as "light" | "dark" | null;

    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
      setTheme(saved);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", initialTheme);
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("crm-theme", next);
    setTheme(next);
  }

  function computePosition() {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const width = 260;
    const margin = 12;

    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));

    const estimatedHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openDown = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove;

    let top = openDown ? rect.bottom + 10 : rect.top - estimatedHeight - 10;
    top = Math.max(margin, Math.min(top, window.innerHeight - margin - estimatedHeight));

    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();

    const onResize = () => computePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onClickOutside(e: MouseEvent) {
      const panel = document.getElementById("profile-panel");
      const btn = btnRef.current;
      if (!panel || !btn) return;

      const target = e.target as Node;
      if (panel.contains(target) || btn.contains(target)) return;

      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={controlButtonStyle} aria-label="Tema değiştir" />
        <div style={skeletonAvatarStyle} />
      </div>
    );
  }

  const avatarUrl = me?.avatarUrl as string | undefined;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={toggleTheme}
          title="Tema değiştir"
          aria-label="Tema değiştir"
          style={controlButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-2)";
            e.currentTarget.style.borderColor = "var(--stroke-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--stroke)";
          }}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          style={{
            ...controlButtonStyle,
            borderRadius: 999,
            overflow: "hidden",
          }}
          title={me?.email || "Profil"}
          aria-label="Profil"
          onMouseEnter={(e) => {
            if (!avatarUrl) e.currentTarget.style.background = "var(--surface-2)";
            e.currentTarget.style.borderColor = "var(--stroke-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--stroke)";
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 13,
                color: "var(--text-primary)",
                letterSpacing: ".02em",
              }}
            >
              {initials(me?.name)}
            </div>
          )}
        </button>
      </div>

      {mounted && open
        ? createPortal(
            <div
              id="profile-panel"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 260,
                background: "var(--surface)",
                border: "1px solid var(--stroke)",
                borderRadius: 16,
                boxShadow: "var(--shadow)",
                padding: 12,
                zIndex: 2147483647,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "4px 2px 8px",
                }}
              >
                <div style={{ fontWeight: 900, color: "var(--text-primary)", fontSize: 14 }}>
                  {me?.name || "Kullanıcı"}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {me?.email || "-"}
                </div>
              </div>

              <Link
                href="/profile"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--stroke)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
                onClick={() => setOpen(false)}
              >
                Profil Ayarları
              </Link>

              <button
                className="danger"
                onClick={() => {
                  clearSession();
                  window.location.href = "/";
                }}
              >
                Çıkış Yap
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}