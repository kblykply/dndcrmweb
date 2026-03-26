"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import TopbarUser from "./_ui/TopbarUser";
import Notifications from "./_ui/Notifications";
import { getUser } from "@/lib/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    setMe(getUser());
  }, []);

  const role = me?.role;

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER" || role === "ADMIN";
  const isSales = role === "SALES";

  const canSeeAgencies = isManager || isSales;
  const canSeeCustomers = isManager || isSales;

  function NavItem({ href, label }: { href: string; label: string }) {
    const active = pathname.startsWith(href);

    return (
      <Link
        href={href}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          fontWeight: active ? 700 : 500,
          background: active ? "var(--surface-2)" : "transparent",
        }}
      >
        {label}
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", padding: 12, gap: 12 }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 260,
          borderRadius: 20,
          border: "1px solid var(--stroke)",
          background: "var(--surface)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 900 }}>CRM</div>

        <NavItem href="/leads" label="Leadler" />

        {canSeeAgencies && <NavItem href="/agencies" label="Ajanslar" />}
        {canSeeCustomers && <NavItem href="/customers" label="Müşteriler" />}

        {isManager && <NavItem href="/manager/queue" label="Yönetici Kuyruğu" />}

        {isAdmin && (
          <>
            <NavItem href="/admin" label="Admin Panel" />
            <NavItem href="/admin/users" label="Kullanıcılar" />
            <NavItem href="/admin/leads" label="Lead Temizliği" />
          </>
        )}
      </aside>

      {/* CONTENT */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 60,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Notifications />
          <TopbarUser />
        </div>

        <div style={{ padding: 10 }}>{children}</div>
      </div>
    </div>
  );
}