"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";

type CalendarItemType =
  | "LEAD_FOLLOWUP"
  | "LEAD_CALL"
  | "AGENCY_MEETING"
  | "AGENCY_TASK"
  | "PRESENTATION"
  | "OTHER_MEETING";

type UserRole = "ALL" | "ADMIN" | "MANAGER" | "SALES" | "CALLCENTER";

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

type CalendarItem = {
  id: string;
  type: CalendarItemType;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string | null;
  entityId: string;
  entityType: "lead" | "agency" | "customer" | "meeting";
  entityLabel: string;
  subtitle?: string | null;
  notesPreview?: string | null;
  assignedUser?: string | null;
  assignedUserId?: string | null;
  assignedUserRole?: string | null;
  href?: string;
  meta?: Record<string, any>;
};

const ITEM_TYPES: CalendarItemType[] = [
  "LEAD_FOLLOWUP",
  "LEAD_CALL",
  "AGENCY_MEETING",
  "AGENCY_TASK",
  "PRESENTATION",
  "OTHER_MEETING",
];

const ROLE_OPTIONS: UserRole[] = [
  "ALL",
  "ADMIN",
  "MANAGER",
  "SALES",
  "CALLCENTER",
];

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function typeLabel(type: string, t: (path: string) => string) {
  const translated = t(`eventTypes.${type}`);
  if (translated !== `eventTypes.${type}`) return translated;

  const labels: Record<string, string> = {
    LEAD_FOLLOWUP: "Lead Follow-up",
    LEAD_CALL: "Lead Call",
    AGENCY_MEETING: "Agency Meeting",
    AGENCY_TASK: "Agency Task",
    PRESENTATION: "Presentation",
    OTHER_MEETING: "Other Meeting",
  };

  return labels[type] || type;
}

function typeColor(type: string) {
  if (type === "LEAD_FOLLOWUP") return "#3b82f6";
  if (type === "LEAD_CALL") return "#f59e0b";
  if (type === "AGENCY_MEETING") return "#22c55e";
  if (type === "AGENCY_TASK") return "#8b5cf6";
  if (type === "PRESENTATION") return "#06b6d4";
  if (type === "OTHER_MEETING") return "#64748b";
  return "#64748b";
}

function badgeClass(type: string) {
  if (type === "LEAD_FOLLOWUP") return "info";
  if (type === "LEAD_CALL") return "warning";
  if (type === "AGENCY_MEETING") return "success";
  if (type === "AGENCY_TASK") return "warning";
  if (type === "PRESENTATION") return "success";
  return "";
}

function formatDateTime(date: string | null | undefined, locale: "tr" | "en") {
  if (!date) return "-";
  return new Date(date).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

function formatTime(date: string | null | undefined, locale: "tr" | "en") {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString(locale === "tr" ? "tr-TR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(date: string | null | undefined, locale: "tr" | "en") {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getItemUserId(item: CalendarItem) {
  return (
    item.assignedUserId ||
    item.meta?.assignedUserId ||
    item.meta?.assignedSalesId ||
    item.meta?.ownerId ||
    null
  );
}

function getItemUserRole(item: CalendarItem) {
  return item.assignedUserRole || item.meta?.assignedUserRole || null;
}

function FilterPill({
  active,
  children,
  onClick,
  dotColor,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "filter-pill active" : "filter-pill"}
    >
      {dotColor ? (
        <span className="filter-pill-dot" style={{ background: dotColor }} />
      ) : null}
      <span>{children}</span>
      {active ? <span className="filter-pill-check">✓</span> : null}
    </button>
  );
}

function SummaryListCard({
  title,
  items,
  loading,
  onSelect,
  t,
  locale,
}: {
  title: string;
  items: CalendarItem[];
  loading: boolean;
  onSelect: (item: CalendarItem) => void;
  t: (path: string) => string;
  locale: "tr" | "en";
}) {
  return (
    <div className="card" style={{ display: "grid", gap: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        <span className="badge">{items.length}</span>
      </div>

      {loading ? (
        <div className="muted">{t("common.loading")}</div>
      ) : items.length === 0 ? (
        <div className="muted">{t("common.noRecords")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="summary-item"
            >
              <div className="summary-date">
                <div className="summary-day">{formatDay(item.start, locale)}</div>
                <div className="summary-time">{formatTime(item.start, locale)}</div>
              </div>

              <div className="summary-content">
                <div className="summary-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="summary-title">{item.title}</div>
                    <div className="summary-subtitle">
                      {item.entityLabel}
                      {item.subtitle ? ` • ${item.subtitle}` : ""}
                    </div>
                  </div>

                  <span className={`badge ${badgeClass(item.type)}`}>
                    {typeLabel(item.type, t)}
                  </span>
                </div>

                {item.assignedUser ? (
                  <div className="summary-assigned">
                    {t("common.assignedTo")}: {item.assignedUser}
                  </div>
                ) : null}

                {item.notesPreview ? (
                  <div className="summary-note">{item.notesPreview}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { t, locale } = useLanguage();

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [todayItems, setTodayItems] = useState<CalendarItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<CalendarItem[]>([]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole>("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<CalendarItemType[]>(ITEM_TYPES);

  const [currentRange, setCurrentRange] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const fullCalendarLocale = locale === "tr" ? "tr" : "en";

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => roleFilter === "ALL" || u.role === roleFilter)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users, roleFilter]);

  const filterItem = useCallback(
    (item: CalendarItem) => {
      if (!selectedTypes.includes(item.type)) return false;

      const itemUserId = getItemUserId(item);
      const itemRole = getItemUserRole(item);

      if (
        selectedUserIds.length > 0 &&
        (!itemUserId || !selectedUserIds.includes(itemUserId))
      ) {
        return false;
      }

      if (roleFilter !== "ALL" && itemRole && itemRole !== roleFilter) {
        return false;
      }

      const q = search.trim().toLowerCase();

      if (q) {
        const hay = [
          item.title,
          item.entityLabel,
          item.subtitle,
          item.notesPreview,
          item.assignedUser,
          item.status,
          item.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(q)) return false;
      }

      return true;
    },
    [selectedTypes, selectedUserIds, roleFilter, search],
  );

  const filteredItems = useMemo(() => items.filter(filterItem), [items, filterItem]);
  const filteredTodayItems = useMemo(
    () => todayItems.filter(filterItem),
    [todayItems, filterItem],
  );
  const filteredUpcomingItems = useMemo(
    () => upcomingItems.filter(filterItem),
    [upcomingItems, filterItem],
  );

  const activeFiltersCount =
    (search.trim() ? 1 : 0) +
    (roleFilter !== "ALL" ? 1 : 0) +
    selectedUserIds.length +
    (selectedTypes.length !== ITEM_TYPES.length ? 1 : 0);

  const calendarEvents = useMemo(() => {
    return filteredItems.map((item) => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end || undefined,
      allDay: item.allDay ?? false,
      backgroundColor: typeColor(item.type),
      borderColor: typeColor(item.type),
      textColor: "#ffffff",
      extendedProps: { item },
    }));
  }, [filteredItems]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);

    try {
      const [admins, managers, sales, callcenters] = await Promise.all([
        authedFetch("/users?role=ADMIN"),
        authedFetch("/users?role=MANAGER"),
        authedFetch("/users?role=SALES"),
        authedFetch("/users?role=CALLCENTER"),
      ]);

      const map = new Map<string, UserRow>();

      [
        ...(Array.isArray(admins) ? admins : []),
        ...(Array.isArray(managers) ? managers : []),
        ...(Array.isArray(sales) ? sales : []),
        ...(Array.isArray(callcenters) ? callcenters : []),
      ].forEach((u) => {
        if (u?.id) map.set(u.id, u);
      });

      setUsers(Array.from(map.values()));
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const summary = await authedFetch("/calendar/summary");
      setTodayItems(Array.isArray(summary?.today) ? summary.today : []);
      setUpcomingItems(Array.isArray(summary?.upcoming) ? summary.upcoming : []);
    } catch {
      setTodayItems([]);
      setUpcomingItems([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadFeed = useCallback(
    async (range?: { from: string; to: string }) => {
      const activeRange = range || currentRange;
      if (!activeRange) return;

      setErr(null);
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("from", activeRange.from);
        params.set("to", activeRange.to);

        const feed = await authedFetch(`/calendar/feed?${params.toString()}`);
        setItems(Array.isArray(feed?.items) ? feed.items : []);
      } catch (e: any) {
        setErr(String(e?.message || e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [currentRange],
  );

  useEffect(() => {
    loadUsers();
    loadSummary();
  }, [loadUsers, loadSummary]);

  useEffect(() => {
    if (!currentRange) return;
    loadFeed(currentRange);
  }, [currentRange, loadFeed]);

  function handleDatesSet(arg: DatesSetArg) {
    setCurrentRange({
      from: arg.start.toISOString(),
      to: new Date(arg.end.getTime() - 1).toISOString(),
    });
  }

  function handleEventClick(arg: EventClickArg) {
    const item = arg.event.extendedProps?.item as CalendarItem | undefined;
    if (item) setSelected(item);
  }

  function toggleType(nextType: CalendarItemType) {
    setSelectedTypes((prev) =>
      prev.includes(nextType)
        ? prev.filter((x) => x !== nextType)
        : [...prev, nextType],
    );
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId],
    );
  }

  function clearAllFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setSelectedUserIds([]);
    setSelectedTypes(ITEM_TYPES);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("calendar.label")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{t("calendar.title")}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {t("calendar.subtitle")}
          </div>
        </div>

        <button
          className="primary"
          onClick={() => {
            loadFeed();
            loadSummary();
            loadUsers();
          }}
          disabled={loading || summaryLoading || loadingUsers}
        >
          {loading || summaryLoading || loadingUsers
            ? t("common.loading")
            : t("common.refresh")}
        </button>
      </div>

      <div className="calendar-filter-panel">
        <div className="filter-header">
          <div>
            <div className="filter-title">
              {locale === "tr" ? "Detaylı Filtreler" : "Detailed Filters"}
            </div>
            <div className="filter-subtitle">
              {locale === "tr"
                ? `${filteredItems.length} kayıt gösteriliyor`
                : `${filteredItems.length} records visible`}
              {activeFiltersCount > 0 ? ` • ${activeFiltersCount} active` : ""}
            </div>
          </div>

          <button type="button" onClick={clearAllFilters}>
            {locale === "tr" ? "Filtreleri Sıfırla" : "Reset Filters"}
          </button>
        </div>

        <div className="filter-search-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === "tr"
                ? "Başlık, kişi, ajans, müşteri veya not ara..."
                : "Search title, person, agency, customer, or notes..."
            }
          />

          <div className="role-tabs">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                className={roleFilter === role ? "role-tab active" : "role-tab"}
                onClick={() => {
                  setRoleFilter(role);
                  setSelectedUserIds([]);
                }}
              >
                {role === "ALL"
                  ? locale === "tr"
                    ? "Tümü"
                    : "All"
                  : safeTranslate(t, `roles.${role}`, role)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="section-heading">
            <span>{locale === "tr" ? "Kayıt Tipleri" : "Item Types"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setSelectedTypes(ITEM_TYPES)}>
                {locale === "tr" ? "Tümünü Seç" : "Select All"}
              </button>
              <button type="button" onClick={() => setSelectedTypes([])}>
                {locale === "tr" ? "Temizle" : "Clear"}
              </button>
            </div>
          </div>

          <div className="pill-grid">
            {ITEM_TYPES.map((itemType) => (
              <FilterPill
                key={itemType}
                active={selectedTypes.includes(itemType)}
                onClick={() => toggleType(itemType)}
                dotColor={typeColor(itemType)}
              >
                {typeLabel(itemType, t)}
              </FilterPill>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="section-heading">
            <span>{locale === "tr" ? "Kullanıcılar" : "Users"}</span>
            <button type="button" onClick={() => setSelectedUserIds([])}>
              {locale === "tr" ? "Kullanıcıları Temizle" : "Clear Users"}
            </button>
          </div>

          {loadingUsers ? (
            <div className="muted">{t("common.loading")}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="muted">
              {locale === "tr" ? "Kullanıcı bulunamadı." : "No users found."}
            </div>
          ) : (
            <div className="user-grid">
              {filteredUsers.map((user) => (
                <FilterPill
                  key={user.id}
                  active={selectedUserIds.includes(user.id)}
                  onClick={() => toggleUser(user.id)}
                >
                  <span>{user.name}</span>
                  {user.role ? (
                    <span className="mini-role">
                      {safeTranslate(t, `roles.${user.role}`, user.role)}
                    </span>
                  ) : null}
                </FilterPill>
              ))}
            </div>
          )}
        </div>
      </div>

      {err ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(239,68,68,.35)",
            background: "rgba(239,68,68,.08)",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected ? "1.55fr .75fr" : "1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              {t("calendar.calendar")}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
              {t("calendar.visibleRange")}
            </div>
          </div>

          <div className="crm-calendar">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              height="auto"
              locale={fullCalendarLocale}
              firstDay={1}
              nowIndicator={true}
              editable={false}
              selectable={false}
              events={calendarEvents}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              slotMinTime="08:00:00"
              slotMaxTime="22:00:00"
              scrollTime="08:00:00"
              slotDuration="00:30:00"
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              dayMaxEvents={4}
              moreLinkClick="popover"
            />
          </div>

          {loading ? (
            <div style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: 13 }}>
              {t("common.loading")}
            </div>
          ) : null}
        </div>

        {selected ? (
          <div className="card" style={{ display: "grid", gap: 12, padding: 18 }}>
            <div className="flex-between" style={{ gap: 10 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {selected.title}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {formatDateTime(selected.start, locale)}
                </div>
              </div>

              <button onClick={() => setSelected(null)}>{t("common.close")}</button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={`badge ${badgeClass(selected.type)}`}>
                {typeLabel(selected.type, t)}
              </span>
              {selected.status ? (
                <span className="badge">
                  {safeTranslate(t, `statuses.${selected.status}`, selected.status)}
                </span>
              ) : null}
            </div>

            <div className="detail-box">
              <div style={{ fontSize: 13 }}>
                <b>{t("calendar.record")}:</b> {selected.entityLabel}
              </div>

              {selected.subtitle ? (
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {selected.subtitle}
                </div>
              ) : null}

              {selected.assignedUser ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {t("common.assignedTo")}: {selected.assignedUser}
                </div>
              ) : null}
            </div>

            {selected.notesPreview ? (
              <div className="detail-box" style={{ background: "var(--surface)" }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>
                  {t("calendar.notes")}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {selected.notesPreview}
                </div>
              </div>
            ) : null}

            {selected.href ? (
              <a href={selected.href} style={{ fontWeight: 800 }}>
                {t("common.openRecord")} →
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <SummaryListCard
          title={t("calendar.todayEvents")}
          items={filteredTodayItems}
          loading={summaryLoading}
          onSelect={setSelected}
          t={t}
          locale={locale}
        />

        <SummaryListCard
          title={t("common.upcoming")}
          items={filteredUpcomingItems.slice(0, 20)}
          loading={summaryLoading}
          onSelect={setSelected}
          t={t}
          locale={locale}
        />
      </div>

      <style jsx global>{`
        .calendar-filter-panel {
          display: grid;
          gap: 16px;
          padding: 18px;
          border: 1px solid var(--stroke);
          border-radius: 20px;
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 35%),
            var(--surface);
        }

        .filter-header,
        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-title {
          font-size: 17px;
          font-weight: 900;
          color: var(--text-primary);
        }

        .filter-subtitle {
          margin-top: 3px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .filter-search-row {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .role-tabs {
          display: flex;
          gap: 6px;
          padding: 4px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          background: var(--surface-2);
          overflow-x: auto;
        }

        .role-tab {
          border: 0;
          border-radius: 999px;
          padding: 8px 12px;
          background: transparent;
          color: var(--text-secondary);
          white-space: nowrap;
          font-weight: 800;
        }

        .role-tab.active {
          background: var(--surface);
          color: var(--text-primary);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        }

        .filter-section {
          display: grid;
          gap: 10px;
        }

        .section-heading {
          font-size: 13px;
          font-weight: 900;
          color: var(--text-primary);
        }

        .pill-grid,
        .user-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          padding: 9px 12px;
          background: var(--surface);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .filter-pill:hover {
          transform: translateY(-1px);
          background: var(--surface-2);
        }

        .filter-pill.active {
          background: var(--surface-2);
          border-color: color-mix(in srgb, var(--text-primary) 26%, var(--stroke));
          color: var(--text-primary);
        }

        .filter-pill-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .filter-pill-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--text-primary);
          color: var(--surface);
          font-size: 11px;
          line-height: 1;
        }

        .mini-role {
          font-size: 10px;
          padding: 3px 7px;
          border-radius: 999px;
          background: var(--surface-3);
          color: var(--text-muted);
          font-weight: 900;
        }

        .summary-item {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 14px;
          text-align: left;
          padding: 0;
          border-radius: 18px;
          border: 1px solid var(--stroke);
          background: var(--surface);
          cursor: pointer;
          overflow: hidden;
          align-items: stretch;
        }

        .summary-date {
          background: var(--surface-2);
          border-right: 1px solid var(--stroke);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .summary-day {
          font-size: 11px;
          line-height: 1.3;
          color: var(--text-muted);
          font-weight: 800;
        }

        .summary-time {
          font-size: 16px;
          font-weight: 900;
          color: var(--text-primary);
          margin-top: 10px;
        }

        .summary-content {
          padding: 14px;
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .summary-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .summary-title {
          font-weight: 900;
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .summary-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .summary-assigned {
          font-size: 12px;
          color: var(--text-muted);
        }

        .summary-note {
          border-top: 1px solid var(--stroke);
          padding-top: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .detail-box {
          border: 1px solid var(--stroke);
          border-radius: 12px;
          background: var(--surface-2);
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .crm-calendar .fc {
          color: var(--text-primary);
        }

        .crm-calendar .fc-theme-standard td,
        .crm-calendar .fc-theme-standard th,
        .crm-calendar .fc-theme-standard .fc-scrollgrid {
          border-color: var(--stroke);
        }

        .crm-calendar .fc-toolbar {
          gap: 10px;
          flex-wrap: wrap;
        }

        .crm-calendar .fc-toolbar-title {
          font-size: 20px;
          font-weight: 900;
          color: var(--text-primary);
        }

        .crm-calendar .fc-button {
          background: var(--surface) !important;
          border: 1px solid var(--stroke) !important;
          color: var(--text-primary) !important;
          box-shadow: none !important;
        }

        .crm-calendar .fc-button:hover {
          background: var(--surface-2) !important;
        }

        .crm-calendar .fc-button-active {
          background: var(--surface-3) !important;
        }

        .crm-calendar .fc-col-header-cell-cushion,
        .crm-calendar .fc-daygrid-day-number,
        .crm-calendar .fc-timegrid-axis-cushion,
        .crm-calendar .fc-timegrid-slot-label-cushion {
          color: var(--text-primary);
        }

        .crm-calendar .fc-timegrid-slot-label-cushion,
        .crm-calendar .fc-timegrid-axis-cushion {
          font-size: 11px;
          color: var(--text-muted);
        }

        .crm-calendar .fc-event {
          border-radius: 10px;
          padding: 2px 6px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: none;
        }

        .crm-calendar .fc-event-title {
          font-size: 12px;
          line-height: 1.25;
        }

        .crm-calendar .fc-event-time {
          font-size: 11px;
          opacity: 0.95;
        }

        .crm-calendar .fc-day-today {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent) !important;
        }

        .crm-calendar .fc-timegrid-slot,
        .crm-calendar .fc-daygrid-day {
          background: var(--surface);
        }

        .crm-calendar .fc-timegrid-now-indicator-line {
          border-color: #ef4444;
        }

        .crm-calendar .fc-popover {
          background: var(--surface);
          border: 1px solid var(--stroke);
          color: var(--text-primary);
        }

        .crm-calendar .fc-popover-header {
          background: var(--surface-2);
        }

        @media (max-width: 980px) {
          .filter-search-row {
            grid-template-columns: 1fr;
          }

          .summary-item {
            grid-template-columns: 82px 1fr;
          }
        }
      `}</style>
    </div>
  );
}