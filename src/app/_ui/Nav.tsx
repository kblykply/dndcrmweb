"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clearSession, getUser } from "@/lib/auth";

export default function Nav() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  if (!mounted) return null;

  const role = me?.role as string | undefined;

  const isManager = role === "MANAGER" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const linkStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    background: active ? "var(--surface-2)" : "transparent",
    transition: "all .18s ease",
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
      }}
    >
      {/* LEFT NAV */}
      <div style={{ display: "flex", gap: 6 }}>

        <a
          href="/leads"
          style={linkStyle(pathname === "/leads")}
        >
          Leads
        </a>

        {isManager && (
          <a
            href="/manager/queue"
            style={linkStyle(pathname === "/manager/queue")}
          >
            Manager Queue
          </a>
        )}

        {isAdmin && (
          <a
            href="/admin"
            style={linkStyle(pathname === "/admin")}
          >
            Admin
          </a>
        )}

        {isAdmin && (
          <a
            href="/admin/users"
            style={linkStyle(pathname === "/admin/users")}
          >
            Users
          </a>
        )}

      </div>

      {/* RIGHT USER INFO */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>{me?.name}</span>
          <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
            ({me?.role})
          </span>
        </div>

        <button
          onClick={() => {
            clearSession();
            window.location.href = "/";
          }}
          style={{
            height: 34,
            padding: "0 14px",
            borderRadius: 10,
            background: "var(--surface)",
            boxShadow: "var(--shadow-sm)",
            border: "none",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all .18s ease",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}