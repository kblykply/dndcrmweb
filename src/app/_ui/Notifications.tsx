"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function BellIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Notif = { id: string; title: string; desc: string; time: string };

const iconButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "var(--surface-2)",
  color: "var(--text-primary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background .15s, border-color .15s, transform .05s",
};

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 72, left: 0 });

  const items: Notif[] = [
    {
      id: "1",
      title: "Yeni lead atandı",
      desc: "Size yeni bir lead atandı.",
      time: "2 dk önce",
    },
    {
      id: "2",
      title: "Takip tarihi geçti",
      desc: "Takip edilmesi gereken lead'leriniz var.",
      time: "1 saat önce",
    },
  ];

  useEffect(() => setMounted(true), []);

  function computePos() {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const W = 340;
    const margin = 12;

    let left = r.right - W;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - W));

    const estimatedH = 380;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openDown = spaceBelow >= estimatedH || spaceBelow >= spaceAbove;

    let top = openDown ? r.bottom + 10 : r.top - 10 - estimatedH;
    top = Math.max(margin, Math.min(top, window.innerHeight - margin - 140));

    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    computePos();

    const onResize = () => computePos();
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

    function onMouseDown(e: MouseEvent) {
      const panel = document.getElementById("notif-panel");
      const btn = btnRef.current;
      if (!panel || !btn) return;

      const target = e.target as Node;
      if (panel.contains(target) || btn.contains(target)) return;

      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Bildirimler"
        aria-label="Bildirimler"
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
        <BellIcon size={22} />
      </button>

      {mounted && open
        ? createPortal(
            <div
              id="notif-panel"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 340,
                maxWidth: "calc(100vw - 24px)",
                background: "var(--surface)",
                border: "1px solid var(--stroke)",
                borderRadius: 14,
                boxShadow: "var(--shadow)",
                padding: 12,
                zIndex: 2147483647,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 14, color: "var(--text-primary)" }}>
                  Bildirimler
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                >
                  Kapat
                </button>
              </div>

              <div style={{ height: 1, background: "var(--stroke)", margin: "10px 0" }} />

              {items.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "8px 4px" }}>
                  Henüz bildiriminiz yok.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    maxHeight: 260,
                    overflow: "auto",
                    paddingRight: 2,
                  }}
                >
                  {items.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        border: "1px solid var(--stroke-2)",
                        background: "var(--surface-2)",
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-primary)" }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{n.time}</div>
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {n.desc}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: 1, background: "var(--stroke)", margin: "10px 0" }} />

              <button
                className="primary"
                style={{ width: "100%" }}
                onClick={() => setOpen(false)}
              >
                Tümünü okundu işaretle
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}