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
      {/* Left */}
      <div style={{ display: "flex", gap: 6 }}>
        <a
          href="/leads"
          style={linkStyle(pathname === "/leads")}
          onMouseEnter={(e) => {
            if (pathname !== "/leads") {
              e.currentTarget.style.background = "var(--surface-2)";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/leads") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          Leads
        </a>

        {isManager && (
          <a
            href="/manager/queue"
            style={linkStyle(pathname === "/manager/queue")}
            onMouseEnter={(e) => {
              if (pathname !== "/manager/queue") {
                e.currentTarget.style.background = "var(--surface-2)";
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/manager/queue") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            Manager Queue
          </a>
        )}
      </div>

      {/* Right */}
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
            transition: "all .18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-2)";
            e.currentTarget.style.boxShadow = "var(--shadow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--surface)";
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}