"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TopbarUser from "../_ui/TopbarUser";
import Notifications from "../_ui/Notifications";
import LanguageSwitcher from "../_ui/LanguageSwitcher";
import { getUser } from "@/lib/auth";
import { useLanguage } from "../_ui/LanguageProvider";

function LeadsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ManagerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c1.5-4 6-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 4h6l1 3H8l1-3z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    borderRadius: 14,
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    textDecoration: "none",
    fontWeight: active ? 700 : 600,
    transition: "all .18s ease",
    position: "relative",
    border: `1px solid ${active ? "var(--stroke)" : "transparent"}`,
    background: active ? "var(--surface-2)" : "transparent",
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const [me, setMe] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMe(getUser());

    function handleResize() {
      setMobile(window.innerWidth <= 820);
    }

    function resolveTheme() {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") {
        setTheme(attr);
        return;
      }

      const saved = localStorage.getItem("crm-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        return;
      }

      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }

    handleResize();
    resolveTheme();

    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") {
        setTheme(attr);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      const saved = localStorage.getItem("crm-theme");
      if (!saved) {
        setTheme(media.matches ? "dark" : "light");
      }
    };

    window.addEventListener("resize", handleResize);

    if (media.addEventListener) {
      media.addEventListener("change", onMediaChange);
    } else {
      media.addListener(onMediaChange);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (media.removeEventListener) {
        media.removeEventListener("change", onMediaChange);
      } else {
        media.removeListener(onMediaChange);
      }
    };
  }, []);

  const role = me?.role as string | undefined;
  const isManager = role === "MANAGER" || role === "ADMIN";
  const isAdmin = role === "ADMIN";
  const canSeeCRM = role === "ADMIN" || role === "MANAGER" || role === "SALES";

  const logoSrc = theme === "dark" ? "/dndwhite.png" : "/dndblack.png";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg)",
        color: "var(--text-primary)",
        padding: mobile ? 0 : 12,
        gap: mobile ? 0 : 12,
      }}
    >
      {!mobile ? (
        <aside
          style={{
            width: 268,
            background: "var(--surface)",
            border: "1px solid var(--stroke)",
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            padding: "18px 14px",
            gap: 14,
            boxShadow: "var(--shadow-sm)",
            minHeight: "calc(100vh - 24px)",
            position: "sticky",
            top: 12,
          }}
        >
          <div style={{ padding: "10px 12px" }}>
            <img
              src={logoSrc}
              alt="Logo"
              style={{ width: 100, objectFit: "contain" }}
            />
          </div>

          <nav
            style={{
              display: "grid",
              gap: 6,
              marginTop: 8,
            }}
          >
            <Link href="/leads" style={navItemStyle(pathname.startsWith("/leads"))}>
              <LeadsIcon />
              {t("nav.leads")}
            </Link>

            <Link href="/calendar" style={navItemStyle(pathname.startsWith("/calendar"))}>
              <UsersIcon />
              {t("nav.calendar")}
            </Link>

            {canSeeCRM ? (
              <Link href="/customers" style={navItemStyle(pathname.startsWith("/customers"))}>
                <UsersIcon />
                {t("nav.customers")}
              </Link>
            ) : null}

            {canSeeCRM ? (
              <Link href="/agencies" style={navItemStyle(pathname.startsWith("/agencies"))}>
                <UsersIcon />
                {t("nav.agencies")}
              </Link>
            ) : null}

            {isManager ? (
              <>
                <Link href="/manager/queue" style={navItemStyle(pathname.startsWith("/manager"))}>
                  <ManagerIcon />
                  {t("nav.managerQueue")}
                </Link>

                <Link href="/admin" style={navItemStyle(pathname === "/admin")}>
                  <AdminIcon />
                  {t("nav.admin")}
                </Link>
              </>
            ) : null}

            {isAdmin ? (
              <>
                <Link href="/admin/users" style={navItemStyle(pathname.startsWith("/admin/users"))}>
                  <UsersIcon />
                  {t("nav.users")}
                </Link>

                <Link href="/admin/leads" style={navItemStyle(pathname.startsWith("/admin/leads"))}>
                  <DeleteIcon />
                  Lead Temizliği
                </Link>
              </>
            ) : null}
          </nav>

          <div
            style={{
              marginTop: "auto",
              display: "grid",
              gap: 6,
              paddingTop: 12,
              borderTop: "1px solid var(--stroke)",
            }}
          >
            <Link href="/help" style={navItemStyle(false)}>
              {t("nav.help")}
            </Link>
          </div>
        </aside>
      ) : null}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <header
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: mobile ? "0 14px" : "0 6px 0 10px",
            gap: 14,
            position: "sticky",
            top: 0,
            zIndex: 1000,
          }}
        >
          <div />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <LanguageSwitcher />
            <Notifications />
            <TopbarUser />
          </div>
        </header>

        <main
          style={{
            padding: mobile ? 14 : 6,
            display: "grid",
            gap: 14,
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}