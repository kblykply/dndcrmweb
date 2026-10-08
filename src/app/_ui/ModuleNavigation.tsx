"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ContactRound,
  ExternalLink,
  Gift,
  Globe,
  Handshake,
  Headset,
  House,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Mail,
  Network,
  RefreshCw,
  Search,
  SearchX,
  Settings2,
  Table2,
  Shield,
  ShieldCheck,
  Trash2,
  Trophy,
  UserCog,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { messages } from "@/i18n";
import { useLanguage } from "./LanguageProvider";
import {
  activeNavigationItem,
  readGroupPreference,
  searchNavigation,
  type NavigationGroup,
  type NavigationItem,
} from "./navigation";
import s from "./AppShell.module.css";

const icons: Record<string, LucideIcon> = {
  support: Headset,
  briefcase: BriefcaseBusiness,
  profile: UserRound,
  tasks: ListTodo,
  calendar: CalendarDays,
  meetings: CalendarCheck,
  handshake: Handshake,
  leads: ContactRound,
  customers: Users,
  agencies: Building2,
  mail: Mail,
  gift: Gift,
  trophy: Trophy,
  globe: Globe,
  chart: ChartNoAxesCombined,
  building: Building2,
  dashboard: LayoutDashboard,
  rent: House,
  network: Network,
  quality: ShieldCheck,
  cycle: RefreshCw,
  landmark: Landmark,
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  rates: ArrowLeftRight,
  shield: Shield,
  queue: ListChecks,
  settings: Settings2,
  table: Table2,
  users: UserCog,
  activity: Activity,
  cleanup: Trash2,
};

function searchLabels(key: string) {
  return (["tr", "en"] as const)
    .map((locale) => {
      let value: unknown = messages[locale];
      for (const part of key.split(".")) {
        if (!value || typeof value !== "object") return "";
        value = (value as Record<string, unknown>)[part];
      }
      return typeof value === "string" ? value : "";
    })
    .join(" ");
}

export default function ModuleNavigation({
  idPrefix,
  groups,
  compact,
  userId,
  onExpand,
  onNavigate,
}: {
  idPrefix: string;
  groups: readonly NavigationGroup[];
  compact: boolean;
  userId?: string;
  onExpand: () => void;
  onNavigate: () => void;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const nav = useRef<HTMLElement>(null);
  const focusAfterExpand = useRef(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeItem = activeNavigationItem(groups, pathname);
  const activeGroup = groups.find((group) =>
    group.items.some((item) => item.id === activeItem?.id),
  )?.id;
  const storageKey = `crm-navigation-groups-v1:${userId || "anonymous"}`;
  const searching = !compact && query.trim().length > 0;
  const visible = searching
    ? searchNavigation(groups, query, searchLabels)
    : groups;
  const resultCount = visible.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  useEffect(() => {
    let saved: Record<string, boolean> = {};
    try {
      saved = readGroupPreference(localStorage.getItem(storageKey));
    } catch {
      /* Storage is optional. */
    }
    // Reveal the current page after navigation, including browser back/forward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded({ ...saved, ...(activeGroup ? { [activeGroup]: true } : {}) });
    setQuery("");
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey)
        setExpanded(readGroupPreference(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey, pathname, activeGroup]);

  useEffect(() => {
    if (!compact && focusAfterExpand.current) {
      input.current?.focus();
      focusAfterExpand.current = false;
    }
  }, [compact]);

  function toggleGroup(id: string, open: boolean) {
    const next = { ...expanded, [id]: !open };
    setExpanded(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Storage is optional. */
    }
  }

  function renderLink(item: NavigationItem) {
    const Icon = icons[item.icon] || ListTodo;
    const label = t(item.label);
    const accessibleLabel = item.newTab
      ? `${label} (${t("nav.newTab")})`
      : label;
    return (
      <Link
        key={item.id}
        href={item.href}
        className={s.navLink}
        aria-current={item.id === activeItem?.id ? "page" : undefined}
        aria-label={accessibleLabel}
        title={compact ? accessibleLabel : undefined}
        target={item.newTab ? "_blank" : undefined}
        rel={item.newTab ? "noopener noreferrer" : undefined}
        data-module-link={item.id}
        onClick={() => {
          setQuery("");
          onNavigate();
        }}
      >
        <Icon size={17} aria-hidden="true" />
        <span className={s.navLabel}>{label}</span>
        {item.newTab && !compact && (
          <ExternalLink
            className={s.externalIcon}
            size={12}
            aria-hidden="true"
          />
        )}
      </Link>
    );
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          className={`${s.iconButton} ${s.compactSearch}`}
          aria-label={t("nav.searchModules")}
          title={t("nav.searchModules")}
          onClick={() => {
            focusAfterExpand.current = true;
            onExpand();
          }}
        >
          <Search size={18} />
        </button>
      ) : (
        <form
          className={s.moduleSearch}
          role="search"
          aria-label={t("nav.searchModules")}
          onSubmit={(event) => {
            event.preventDefault();
            if (searching)
              nav.current
                ?.querySelector<HTMLAnchorElement>("a[data-module-link]")
                ?.click();
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              nav.current?.scrollTo({ top: 0 });
            }}
            placeholder={t("nav.searchModules")}
            aria-label={t("nav.searchModules")}
            aria-controls={`${idPrefix}-modules`}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                setQuery("");
              }
              if (event.key === "ArrowDown") {
                const first = nav.current?.querySelector<HTMLAnchorElement>(
                  "a[data-module-link]",
                );
                // Ignore links in closed groups when there is no search query.
                const visibleLink = Array.from(
                  nav.current?.querySelectorAll<HTMLAnchorElement>(
                    "a[data-module-link]",
                  ) || [],
                ).find((link) => link.getClientRects().length);
                const target = searching ? first : visibleLink;
                if (target) {
                  event.preventDefault();
                  target.focus();
                }
              }
            }}
          />
          {query && (
            <button
              type="button"
              className={s.clearSearch}
              aria-label={t("nav.clearSearch")}
              title={t("nav.clearSearch")}
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )}
        </form>
      )}
      <nav
        ref={nav}
        id={`${idPrefix}-modules`}
        className={s.navigation}
        aria-label={t("nav.mainNavigation")}
        data-searching={searching}
      >
        {searching && (
          <div className={s.searchCount} role="status" aria-live="polite">
            {resultCount} {t("nav.moduleResults")}
          </div>
        )}
        {searching && !resultCount && (
          <div className={s.noModules}>
            <SearchX size={24} aria-hidden="true" />
            <p>{t("nav.noModules")}</p>
          </div>
        )}
        {visible.map((group) => {
          const Icon = icons[group.icon] || ListTodo;
          const active = group.id === activeGroup;
          const open =
            expanded[group.id] ?? (group.id === "workspace" || active);
          const panelId = `${idPrefix}-${group.id}`;
          return (
            <section
              key={group.id}
              className={s.navGroup}
              data-nav-group={group.id}
              data-compact={compact}
              data-active={active}
            >
              {compact ? (
                <span className={s.srOnly}>{t(group.label)}</span>
              ) : searching ? (
                <div className={s.searchGroupTitle}>
                  <Icon size={15} aria-hidden="true" />
                  <h2>{t(group.label)}</h2>
                </div>
              ) : (
                <button
                  type="button"
                  className={s.groupToggle}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggleGroup(group.id, open)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{t(group.label)}</span>
                  {active && !open && (
                    <span className={s.activeGroupDot} aria-hidden="true" />
                  )}
                  <ChevronDown
                    size={15}
                    className={s.groupChevron}
                    aria-hidden="true"
                  />
                </button>
              )}
              <div
                id={panelId}
                className={s.groupItems}
                hidden={!compact && !searching && !open}
              >
                {group.items.map(renderLink)}
              </div>
            </section>
          );
        })}
      </nav>
    </>
  );
}
