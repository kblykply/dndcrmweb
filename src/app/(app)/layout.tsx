"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TopbarUser from "../_ui/TopbarUser";
import Notifications from "../_ui/Notifications";
import { getUser } from "@/lib/auth";

function LeadsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function ManagerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M4 20c1.5-4 6-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l2.3 2.3 3.2-.4.9 3.1 2.8 1.7-1.7 2.8.4 3.2-3.1.9L12 21l-2.3-2.3-3.2.4-.9-3.1-2.8-1.7 1.7-2.8-.4-3.2 3.1-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3.5 18c1-3 3.7-4.5 5.5-4.5S13.5 15 14.5 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M15.5 17.5c.7-1.9 2.2-3 4.2-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 4h6l1 3H8l1-3z" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  const role = me?.role as string | undefined;
  const isManager = role === "MANAGER" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  return (
    <div className={styles.page}>
      {/* ===== Sidebar ===== */}
      <aside className={styles.sidebar}>

        {/* Logo */}
        <div style={{ padding: "10px 12px" }}>
          <img
            src="/dndblack.png"
            alt="Logo"
            style={{ width: 100, objectFit: "contain" }}
          />
        </div>

        {/* Navigation */}
        <nav className={styles.navGroup}>
          <Link
            href="/leads"
            className={`${styles.navItem} ${pathname.startsWith("/leads") ? styles.navItemActive : ""}`}
          >
            <LeadsIcon />
            Leadler
          </Link>

          {mounted && isManager && (
            <Link
              href="/manager/queue"
              className={`${styles.navItem} ${pathname.startsWith("/manager") ? styles.navItemActive : ""}`}
            >
              <ManagerIcon />
              Yönetici Kuyruğu
            </Link>
          )}

          {mounted && isAdmin && (
            <>
              <Link
                href="/admin"
                className={`${styles.navItem} ${pathname === "/admin" ? styles.navItemActive : ""}`}
              >
                <AdminIcon />
                Admin Panel
              </Link>

              <Link
                href="/admin/users"
                className={`${styles.navItem} ${pathname.startsWith("/admin/users") ? styles.navItemActive : ""}`}
              >
                <UsersIcon />
                Kullanıcılar
              </Link>

              <Link
                href="/admin/leads"
                className={`${styles.navItem} ${pathname.startsWith("/admin/leads") ? styles.navItemActive : ""}`}
              >
                <DeleteIcon />
                Lead Temizliği
              </Link>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <Link href="/help" className={styles.smallLink}>
            Yardım & Destek
          </Link>
        </div>
      </aside>

      {/* ===== Content ===== */}
      <div className={styles.content}>
        <header className={styles.topbar}>
          <div />
          <div className={styles.topActions}>
            <Notifications />
            <TopbarUser />
          </div>
        </header>

        <main className={styles.container}>{children}</main>
      </div>
    </div>
  );
}