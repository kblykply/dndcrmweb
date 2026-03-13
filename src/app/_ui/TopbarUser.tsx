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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: "1px solid var(--stroke)",
  background: "var(--surface-2)",
  color: "var(--text-primary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background .15s, border-color .15s, transform .05s",
};

const avatarFallbackStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: "var(--surface-3)",
  border: "1px solid var(--stroke)",
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
    const width = 240;
    const margin = 12;

    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));

    const estimatedHeight = 180;
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
        <button style={iconButtonStyle} aria-label="Tema değiştir" />
        <div style={avatarFallbackStyle} />
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
          style={iconButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-3)";
            e.currentTarget.style.borderColor = "var(--stroke-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--surface-2)";
            e.currentTarget.style.borderColor = "var(--stroke)";
          }}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          style={{
            ...iconButtonStyle,
            padding: 0,
            overflow: "hidden",
          }}
          title={me?.email || "Profil"}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-3)";
            e.currentTarget.style.borderColor = "var(--stroke-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--surface-2)";
            e.currentTarget.style.borderColor = "var(--stroke)";
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: "var(--text-primary)",
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
                width: 240,
                background: "var(--surface)",
                border: "1px solid var(--stroke)",
                borderRadius: 14,
                boxShadow: "var(--shadow)",
                padding: 12,
                zIndex: 2147483647,
                display: "grid",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
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
                  borderRadius: 10,
                  border: "1px solid var(--stroke-2)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
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