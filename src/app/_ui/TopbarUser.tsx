"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { clearSession, getUser } from "@/lib/auth";
import styles from "../page.module.css";

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "K"; // Kullanıcı
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase()).join("") || "K";
}

export default function TopbarUser() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 72, left: 0 });

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

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
    return <div className={styles.avatar} />;
  }

  const avatarUrl = me?.avatarUrl as string | undefined;

  return (
    <>
      <button
        ref={btnRef}
        className={styles.iconBtn}
        onClick={() => setOpen((v) => !v)}
        style={{ padding: 0, overflow: "hidden" }}
        title={me?.email || "Profil"}
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
            }}
          >
            {initials(me?.name)}
          </div>
        )}
      </button>

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
                <div style={{ fontWeight: 800 }}>{me?.name || "Kullanıcı"}</div>
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