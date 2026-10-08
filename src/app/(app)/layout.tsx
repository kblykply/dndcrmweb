"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppShell from "../_ui/AppShell";
import { navigationForRole } from "../_ui/navigation";
import { getUser } from "@/lib/auth";

function inArea(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<{ id?: string; role?: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMe(getUser());

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
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      );
    }
    resolveTheme();
    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") setTheme(attr);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (!localStorage.getItem("crm-theme"))
        setTheme(media.matches ? "dark" : "light");
    };
    if (media.addEventListener) media.addEventListener("change", onMediaChange);
    else media.addListener(onMediaChange);
    return () => {
      observer.disconnect();
      if (media.removeEventListener)
        media.removeEventListener("change", onMediaChange);
      else media.removeListener(onMediaChange);
    };
  }, []);

  // Preserve the existing role-specific route restrictions; grouping does not grant access.
  useEffect(() => {
    if (me?.role !== "AFTERSALES") return;
    const unitsAllowed =
      inArea(pathname, "/units") && !inArea(pathname, "/units/dashboard");
    if (
      unitsAllowed ||
      [
        "/org-chart",
        "/tasks",
        "/it-support",
        "/customers",
        "/profile",
        "/quality-control",
        "/iso-2026",
        "/bulk-email",
      ].some((path) => inArea(pathname, path))
    )
      return;
    window.location.replace("/units");
  }, [me?.role, pathname]);

  useEffect(() => {
    if (me?.role !== "ACCOUNTING") return;
    if (
      ["/finance", "/org-chart", "/tasks", "/it-support"].some((path) =>
        inArea(pathname, path),
      )
    )
      return;
    window.location.replace("/finance");
  }, [me?.role, pathname]);

  return (
    <AppShell
      logoSrc={theme === "dark" ? "/dndwhite.png" : "/dndblack.png"}
      userId={me?.id}
      navigation={navigationForRole(me?.role)}
    >
      {children}
    </AppShell>
  );
}
