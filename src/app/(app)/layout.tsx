"use client";

import styles from "../page.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TopbarUser from "../_ui/TopbarUser";
import Notifications from "../_ui/Notifications";

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        
        <div style={{ padding: "10px 12px" }}>
          <img
            src="/dndblack.png"
            alt="Logo"
            style={{ width: 100, objectFit: "contain" }}
          />
        </div>

        <nav className={styles.navGroup}>
          <Link
            href="/leads"
            className={`${styles.navItem} ${
              pathname.startsWith("/leads") ? styles.navItemActive : ""
            }`}
          >
            <LeadsIcon />
            Leadler
          </Link>

          <Link
            href="/manager/queue"
            className={`${styles.navItem} ${
              pathname.startsWith("/manager") ? styles.navItemActive : ""
            }`}
          >
            <ManagerIcon />
            Yönetici Kuyruğu
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/help" className={styles.smallLink}>
            Yardım & Destek
          </Link>
        </div>
      </aside>

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