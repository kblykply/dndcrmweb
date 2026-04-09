"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { io, Socket } from "socket.io-client";
import { authedFetch } from "@/lib/authedFetch";
import { getAccessToken } from "@/lib/auth";

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

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
  metaJson?: any;
};

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
  position: "relative",
};

function timeAgo(input: string) {
  const date = new Date(input).getTime();
  const now = Date.now();
  const diffSec = Math.max(1, Math.floor((now - date) / 1000));

  if (diffSec < 60) return `${diffSec} sn önce`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;

  return new Date(input).toLocaleString("tr-TR");
}

function getApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  return raw.replace(/\/$/, "");
}

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 72,
    left: 0,
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError(null);

    try {
      const [listRes, countRes] = await Promise.all([
        authedFetch("/notifications?take=30"),
        authedFetch("/notifications/unread-count"),
      ]);

      const nextItems = Array.isArray(listRes) ? listRes : [];
      setItems(nextItems);
      setUnread(Number(countRes?.unread || 0));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    loadNotifications();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const token = getAccessToken();
    if (!token) return;

    const apiBase = getApiBase();
    const socketUrl =
      apiBase || (typeof window !== "undefined" ? window.location.origin : "");

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    const handleNew = (notification: NotificationItem) => {
      let inserted = false;

      setItems((prev) => {
        const exists = prev.some((x) => x.id === notification.id);
        if (exists) return prev;
        inserted = true;
        return [notification, ...prev];
      });

      if (inserted && !notification.isRead) {
        setUnread((prev) => prev + 1);
      }
    };

    const handleUnreadCount = (payload: { unread: number }) => {
      setUnread(Number(payload?.unread || 0));
    };

    const handleRead = (payload: { id: string }) => {
      let shouldDecrease = false;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== payload.id) return item;
          if (!item.isRead) shouldDecrease = true;

          return {
            ...item,
            isRead: true,
            readAt: item.readAt || new Date().toISOString(),
          };
        }),
      );

      if (shouldDecrease) {
        setUnread((prev) => Math.max(0, prev - 1));
      }
    };

    const handleDeleted = (payload: { id: string }) => {
      let shouldDecrease = false;

      setItems((prev) => {
        const target = prev.find((item) => item.id === payload.id);
        if (target && !target.isRead) shouldDecrease = true;
        return prev.filter((item) => item.id !== payload.id);
      });

      if (shouldDecrease) {
        setUnread((prev) => Math.max(0, prev - 1));
      }
    };

    socket.on("notification:new", handleNew);
    socket.on("notification:unread-count", handleUnreadCount);
    socket.on("notification:read", handleRead);
    socket.on("notification:deleted", handleDeleted);

    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:unread-count", handleUnreadCount);
      socket.off("notification:read", handleRead);
      socket.off("notification:deleted", handleDeleted);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mounted]);

  function computePos() {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const W = 360;
    const margin = 12;

    let left = r.right - W;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - W));

    const estimatedH = 500;
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

  async function markOneRead(id: string) {
    if (busyId) return null;

    setBusyId(id);
    setError(null);

    try {
      const target = items.find((x) => x.id === id);
      const updated = await authedFetch(`/notifications/${id}/read`, {
        method: "PATCH",
      });

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (target && !target.isRead) {
        setUnread((prev) => Math.max(0, prev - 1));
      }

      return updated;
    } catch (e: any) {
      setError(String(e?.message || e));
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function removeOne(id: string) {
    if (busyId) return;

    setBusyId(id);
    setError(null);

    try {
      const target = items.find((x) => x.id === id);

      await authedFetch(`/notifications/${id}`, {
        method: "DELETE",
      });

      setItems((prev) => prev.filter((item) => item.id !== id));

      if (target && !target.isRead) {
        setUnread((prev) => Math.max(0, prev - 1));
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    setError(null);

    try {
      await authedFetch("/notifications/read-all", {
        method: "PATCH",
      });

      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );
      setUnread(0);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    if (!item.isRead) {
      const ok = await markOneRead(item.id);
      if (!ok) return;
    }

    setOpen(false);

    if (item.link) {
      window.location.href = item.link;
    }
  }

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

        {unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "#ef4444",
              color: "white",
              fontSize: 11,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {mounted && open
        ? createPortal(
            <div
              id="notif-panel"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 360,
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

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {unread > 0 ? <span className="badge danger">{unread} yeni</span> : null}

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
              </div>

              <div style={{ height: 1, background: "var(--stroke)", margin: "10px 0" }} />

              {error ? (
                <div
                  style={{
                    marginBottom: 10,
                    border: "1px solid rgba(239,68,68,.35)",
                    background: "rgba(239,68,68,.08)",
                    padding: 10,
                    borderRadius: 12,
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "8px 4px" }}>
                  Yükleniyor...
                </div>
              ) : sortedItems.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "8px 4px" }}>
                  Henüz bildiriminiz yok.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    maxHeight: 360,
                    overflow: "auto",
                    paddingRight: 2,
                  }}
                >
                  {sortedItems.map((n) => {
                    const busy = busyId === n.id;

                    return (
                      <div
                        key={n.id}
                        style={{
                          border: "1px solid var(--stroke-2)",
                          background: n.isRead ? "var(--surface-2)" : "rgba(59,130,246,.08)",
                          borderRadius: 12,
                          padding: 10,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() => openNotification(n)}
                          style={{
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            textAlign: "left",
                            cursor: n.link ? "pointer" : "default",
                            display: "grid",
                            gap: 4,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: 13,
                                color: "var(--text-primary)",
                              }}
                            >
                              {n.title}
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {timeAgo(n.createdAt)}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              lineHeight: 1.45,
                            }}
                          >
                            {n.message || "-"}
                          </div>
                        </button>

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {!n.isRead ? (
                              <button
                                onClick={() => markOneRead(n.id)}
                                disabled={busy || !!busyId}
                                style={{
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 10,
                                  fontSize: 12,
                                }}
                              >
                                Okundu
                              </button>
                            ) : (
                              <span className="badge success">Okundu</span>
                            )}

                            {n.link ? (
                              <button
                                className="primary"
                                onClick={() => openNotification(n)}
                                disabled={busy || !!busyId}
                                style={{
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 10,
                                  fontSize: 12,
                                }}
                              >
                                Aç
                              </button>
                            ) : null}
                          </div>

                          <button
                            onClick={() => removeOne(n.id)}
                            disabled={busy || !!busyId}
                            style={{
                              height: 30,
                              padding: "0 10px",
                              borderRadius: 10,
                              fontSize: 12,
                            }}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ height: 1, background: "var(--stroke)", margin: "10px 0" }} />

              <button
                className="primary"
                style={{ width: "100%" }}
                onClick={markAllRead}
                disabled={markingAll || unread === 0}
              >
                {markingAll ? "İşleniyor..." : "Tümünü okundu işaretle"}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}