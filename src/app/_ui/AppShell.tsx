"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import Notifications from "./Notifications";
import TopbarUser from "./TopbarUser";
import { useLanguage } from "./LanguageProvider";
import ModuleNavigation from "./ModuleNavigation";
import type { NavigationGroup } from "./navigation";
import s from "./AppShell.module.css";

const preferenceKey = "crm-sidebar-collapsed";

export default function AppShell({
  logoSrc,
  navigation,
  userId,
  children,
}: {
  logoSrc: string;
  navigation: readonly NavigationGroup[];
  userId?: string;
  children: ReactNode;
}) {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Restore browser preferences after hydration, without changing the server markup.
    const media = window.matchMedia("(max-width: 820px)");
    const resize = () => {
      setMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    resize();
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(preferenceKey) === "true");
    } catch {
      /* The menu still works when browser storage is unavailable. */
    }
    media.addEventListener("change", resize);
    const syncPreference = (event: StorageEvent) => {
      if (event.key === preferenceKey) setCollapsed(event.newValue === "true");
    };
    window.addEventListener("storage", syncPreference);
    return () => {
      media.removeEventListener("change", resize);
      window.removeEventListener("storage", syncPreference);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (mobile && mobileOpen && !element.open) element.showModal();
    else if ((!mobile || !mobileOpen) && element.open) element.close();
  }, [mobile, mobileOpen]);

  function toggleNavigation() {
    if (mobile) {
      setMobileOpen(true);
      return;
    }
    setCompact(!collapsed);
  }

  function setCompact(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(preferenceKey, String(next));
    } catch {
      /* Optional preference. */
    }
  }

  const menuLabel = tr ? "Ana menü" : "Main navigation";
  const closeLabel = tr ? "Menüyü kapat" : "Close menu";
  const toggleLabel = mobile
    ? tr
      ? "Menüyü aç"
      : "Open menu"
    : collapsed
      ? tr
        ? "Menüyü genişlet"
        : "Expand navigation"
      : tr
        ? "Menüyü daralt"
        : "Collapse navigation";
  const ToggleIcon = mobile ? Menu : collapsed ? PanelLeftOpen : PanelLeftClose;

  function navigationContent(compact: boolean, drawer = false) {
    return (
      <>
        <div className={s.sidebarBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="DND" width={112} height={48} />
          {drawer && (
            <button
              className={s.iconButton}
              type="button"
              aria-label={closeLabel}
              title={closeLabel}
              onClick={() => setMobileOpen(false)}
            >
              <X size={19} />
            </button>
          )}
        </div>
        <ModuleNavigation
          key={userId || "anonymous"}
          // Each menu owns a stable scope shared by server and client markup.
          idPrefix={drawer ? "crm-mobile-navigation" : "crm-sidebar"}
          groups={navigation}
          compact={compact}
          userId={userId}
          onExpand={() => setCompact(false)}
          onNavigate={() => {
            if (drawer) setMobileOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className={s.shell} data-collapsed={collapsed}>
      <a href="#crm-main-content" className={s.skipLink}>
        {tr ? "İçeriğe geç" : "Skip to content"}
      </a>
      <aside id="crm-sidebar" className={s.sidebar} aria-label={menuLabel}>
        {!mobile && navigationContent(collapsed)}
      </aside>
      <dialog
        id="crm-mobile-navigation"
        ref={dialog}
        className={s.drawer}
        aria-label={menuLabel}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = items[0];
          const last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          setMobileOpen(false);
        }}
        onClose={() => {
          setMobileOpen(false);
          toggle.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            setMobileOpen(false);
        }}
      >
        {mobile && navigationContent(false, true)}
      </dialog>
      <div className={s.content}>
        <header className={s.topbar}>
          <div className={s.topbarStart}>
            <button
              ref={toggle}
              className={s.iconButton}
              type="button"
              onClick={toggleNavigation}
              aria-label={toggleLabel}
              title={toggleLabel}
              aria-expanded={mobile ? mobileOpen : !collapsed}
              aria-controls={mobile ? "crm-mobile-navigation" : "crm-sidebar"}
            >
              <ToggleIcon size={20} />
            </button>
            <span className={s.productName}>DND CRM</span>
          </div>
          <div className={s.topbarActions}>
            <LanguageSwitcher />
            <Notifications />
            <TopbarUser />
          </div>
        </header>
        <main id="crm-main-content" tabIndex={-1} className={s.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
