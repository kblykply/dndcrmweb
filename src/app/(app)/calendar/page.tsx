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
  meta?: Record<string, unknown>;
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
  const meta = item.meta || {};
  return (
    item.assignedUserId ||
    (typeof meta.assignedUserId === "string" ? meta.assignedUserId : null) ||
    (typeof meta.assignedSalesId === "string" ? meta.assignedSalesId : null) ||
    (typeof meta.ownerId === "string" ? meta.ownerId : null) ||
    null
  );
}

function getItemUserRole(item: CalendarItem) {
  const metaRole = item.meta?.assignedUserRole;
  return item.assignedUserRole || (typeof metaRole === "string" ? metaRole : null);
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

  const typeCounts = useMemo(() => {
    return ITEM_TYPES.reduce(
      (acc, itemType) => {
        acc[itemType] = filteredItems.filter((item) => item.type === itemType).length;
        return acc;
      },
      {} as Record<CalendarItemType, number>,
    );
  }, [filteredItems]);

  const nextItem = useMemo(() => {
    const now = Date.now();
    return [...filteredItems]
      .filter((item) => new Date(item.start).getTime() >= now)
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      )[0];
  }, [filteredItems]);

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
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
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
    <div className="calendar-page">
      <section className="calendar-hero">
        <div className="calendar-hero-copy">
          <div className="calendar-kicker">{t("calendar.label")}</div>
          <h1>{t("calendar.title")}</h1>
          <p>{t("calendar.subtitle")}</p>
        </div>

        <div className="calendar-hero-actions">
          <div className="next-event">
            <span>{locale === "tr" ? "Sıradaki" : "Next up"}</span>
            <strong>{nextItem ? formatTime(nextItem.start, locale) : "-"}</strong>
            <small>{nextItem?.title || (locale === "tr" ? "Planlanan yok" : "Nothing scheduled")}</small>
          </div>

          <button
            className="primary refresh-button"
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
      </section>

      <section className="calendar-stats" aria-label="Calendar overview">
        <div className="stat-card featured">
          <span>{locale === "tr" ? "Görünen" : "Visible"}</span>
          <strong>{filteredItems.length}</strong>
          <small>
            {activeFiltersCount > 0
              ? locale === "tr"
                ? `${activeFiltersCount} aktif filtre`
                : `${activeFiltersCount} active filters`
              : locale === "tr"
                ? "Tüm kayıtlar"
                : "All records"}
          </small>
        </div>
        <div className="stat-card">
          <span>{t("calendar.todayEvents")}</span>
          <strong>{filteredTodayItems.length}</strong>
          <small>{locale === "tr" ? "Bugün planlı" : "Scheduled today"}</small>
        </div>
        <div className="stat-card">
          <span>{t("common.upcoming")}</span>
          <strong>{filteredUpcomingItems.length}</strong>
          <small>{locale === "tr" ? "Yaklaşan kayıt" : "Upcoming records"}</small>
        </div>
      </section>

      <section className="calendar-filter-panel">
        <div className="filter-header">
          <div>
            <div className="filter-title">
              {locale === "tr" ? "Filtreler" : "Filters"}
            </div>
            <div className="filter-subtitle">
              {locale === "tr"
                ? "Takvim, bugün ve yaklaşan listeleri birlikte daraltılır."
                : "Filters refine the calendar, today list, and upcoming list together."}
            </div>
          </div>

          <button type="button" className="quiet-button" onClick={clearAllFilters}>
            {locale === "tr" ? "Sifirla" : "Reset"}
          </button>
        </div>

        <div className="filter-search-row">
          <div className="search-field">
            <span aria-hidden="true">/</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === "tr"
                  ? "Başlık, kişi, ajans, müşteri veya not ara..."
                  : "Search title, person, agency, customer, or notes..."
              }
            />
          </div>

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

        <div className="filter-columns">
          <div className="filter-section">
            <div className="section-heading">
              <span>{locale === "tr" ? "Kayıt Tipleri" : "Item Types"}</span>
              <div className="inline-actions">
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
                  <span className="pill-count">{typeCounts[itemType] || 0}</span>
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="section-heading">
              <span>{locale === "tr" ? "Kullanıcılar" : "Users"}</span>
              <button type="button" onClick={() => setSelectedUserIds([])}>
                {locale === "tr" ? "Temizle" : "Clear"}
              </button>
            </div>

            {loadingUsers ? (
              <div className="empty-filter">{t("common.loading")}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-filter">
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
      </section>

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

      <section className={selected ? "calendar-workspace has-detail" : "calendar-workspace"}>
        <div className="calendar-card">
          <div className="calendar-card-header">
            <div>
              <div className="panel-title">{t("calendar.calendar")}</div>
              <div className="panel-subtitle">{t("calendar.visibleRange")}</div>
            </div>

            <div className="calendar-legend">
              {ITEM_TYPES.slice(0, 4).map((itemType) => (
                <span key={itemType}>
                  <i style={{ background: typeColor(itemType) }} />
                  {typeLabel(itemType, t)}
                </span>
              ))}
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
            <div className="loading-strip">
              {t("common.loading")}
            </div>
          ) : null}
        </div>

        {selected ? (
          <aside className="detail-panel">
            <div className="detail-accent" style={{ background: typeColor(selected.type) }} />
            <div className="detail-header">
              <div>
                <div className="detail-eyebrow">{typeLabel(selected.type, t)}</div>
                <div className="detail-title">{selected.title}</div>
                <div className="detail-time">{formatDateTime(selected.start, locale)}</div>
              </div>

              <button className="icon-button" onClick={() => setSelected(null)} aria-label={t("common.close")}>
                x
              </button>
            </div>

            <div className="detail-badges">
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
              <span>{t("calendar.record")}</span>
              <strong>{selected.entityLabel}</strong>

              {selected.subtitle ? (
                <p>{selected.subtitle}</p>
              ) : null}
            </div>

            {selected.assignedUser ? (
              <div className="detail-box compact">
                <span>{t("common.assignedTo")}</span>
                <strong>{selected.assignedUser}</strong>
              </div>
            ) : null}

            {selected.notesPreview ? (
              <div className="detail-box notes">
                <span>{t("calendar.notes")}</span>
                <p>{selected.notesPreview}</p>
              </div>
            ) : null}

            {selected.href ? (
              <a href={selected.href} className="open-record-link">
                {t("common.openRecord")} -&gt;
              </a>
            ) : null}
          </aside>
        ) : null}
      </section>

      <section className="agenda-grid">
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
      </section>

      <style jsx global>{`
        .calendar-page {
          display: grid;
          gap: 16px;
        }

        .calendar-hero {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 18px;
          padding: 22px;
          border: 1px solid var(--stroke);
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, var(--info)), var(--surface));
          box-shadow: var(--shadow-sm);
        }

        .calendar-hero-copy {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .calendar-kicker {
          width: fit-content;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          padding: 4px 10px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .calendar-hero h1 {
          margin: 0;
          font-size: 28px;
          letter-spacing: 0;
        }

        .calendar-hero p {
          max-width: 720px;
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .calendar-hero-actions {
          display: flex;
          align-items: stretch;
          gap: 10px;
          flex: 0 0 auto;
        }

        .next-event {
          min-width: 190px;
          display: grid;
          align-content: center;
          gap: 1px;
          padding: 12px 14px;
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          background: var(--surface);
        }

        .next-event span,
        .stat-card span,
        .detail-eyebrow,
        .detail-box span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .next-event strong {
          color: var(--text-primary);
          font-size: 18px;
          line-height: 1.2;
        }

        .next-event small {
          max-width: 180px;
          overflow: hidden;
          color: var(--text-secondary);
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .refresh-button {
          align-self: center;
          min-width: 112px;
        }

        .calendar-stats {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1fr;
          gap: 12px;
        }

        .stat-card {
          display: grid;
          gap: 3px;
          padding: 15px 16px;
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .stat-card.featured {
          border-color: color-mix(in srgb, var(--info) 22%, var(--stroke));
          background: color-mix(in srgb, var(--surface) 88%, var(--info));
        }

        .stat-card strong {
          color: var(--text-primary);
          font-size: 26px;
          line-height: 1.1;
        }

        .stat-card small {
          color: var(--text-secondary);
        }

        .calendar-filter-panel {
          display: grid;
          gap: 16px;
          padding: 16px;
          border: 1px solid var(--stroke);
          border-radius: var(--radius-lg);
          background: var(--surface);
          box-shadow: var(--shadow-sm);
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
          font-size: 16px;
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

        .search-field {
          display: grid;
          grid-template-columns: 34px 1fr;
          align-items: center;
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          background: var(--surface-2);
          overflow: hidden;
        }

        .search-field span {
          display: grid;
          place-items: center;
          color: var(--text-muted);
          font-weight: 900;
        }

        .search-field input {
          height: 42px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .filter-columns {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 16px;
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

        .quiet-button,
        .inline-actions button,
        .section-heading > button {
          height: 32px;
          padding: 0 10px;
          font-size: 12px;
        }

        .inline-actions {
          display: flex;
          gap: 8px;
        }

        .filter-section {
          display: grid;
          gap: 10px;
          min-width: 0;
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
          min-height: 38px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          padding: 8px 11px;
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

        .pill-count,
        .mini-role {
          border-radius: 999px;
          background: var(--surface-3);
          color: var(--text-muted);
          font-weight: 900;
        }

        .pill-count {
          min-width: 22px;
          padding: 2px 6px;
          font-size: 11px;
          text-align: center;
        }

        .mini-role {
          padding: 3px 7px;
          font-size: 10px;
        }

        .empty-filter {
          display: grid;
          min-height: 64px;
          place-items: center;
          border: 1px dashed var(--stroke);
          border-radius: var(--radius);
          color: var(--text-muted);
          background: var(--surface-2);
        }

        .calendar-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .calendar-workspace.has-detail {
          grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
        }

        .calendar-card,
        .detail-panel {
          border: 1px solid var(--stroke);
          border-radius: var(--radius-lg);
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .calendar-card {
          min-width: 0;
          overflow: hidden;
          padding: 16px;
        }

        .calendar-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 900;
          color: var(--text-primary);
        }

        .panel-subtitle {
          margin-top: 3px;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .calendar-legend {
          display: flex;
          justify-content: flex-end;
          gap: 8px 12px;
          flex-wrap: wrap;
          max-width: 520px;
        }

        .calendar-legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .calendar-legend i {
          width: 8px;
          height: 8px;
          border-radius: 999px;
        }

        .loading-strip {
          margin-top: 12px;
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 700;
        }

        .detail-panel {
          position: sticky;
          top: 14px;
          display: grid;
          gap: 14px;
          padding: 18px;
          overflow: hidden;
        }

        .detail-accent {
          height: 4px;
          margin: -18px -18px 2px;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .detail-title {
          margin-top: 4px;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 900;
          line-height: 1.25;
        }

        .detail-time {
          margin-top: 5px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
        }

        .icon-button {
          width: 34px;
          height: 34px;
          padding: 0;
          flex: 0 0 auto;
          border-radius: 999px;
          font-size: 16px;
          line-height: 1;
        }

        .detail-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .detail-box {
          display: grid;
          gap: 5px;
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          background: var(--surface-2);
          padding: 13px;
        }

        .detail-box strong {
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.4;
        }

        .detail-box p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .detail-box.compact,
        .detail-box.notes {
          background: var(--surface);
        }

        .open-record-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          border-radius: var(--radius-sm);
          background: var(--primary);
          color: var(--primary-foreground);
          font-weight: 900;
        }

        .agenda-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          align-items: start;
        }

        .summary-item {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 14px;
          min-height: 112px;
          text-align: left;
          padding: 0;
          border-radius: var(--radius);
          border: 1px solid var(--stroke);
          background: var(--surface);
          cursor: pointer;
          overflow: hidden;
          align-items: stretch;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            transform 0.15s ease;
        }

        .summary-item:hover {
          border-color: var(--stroke-2);
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
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
          overflow-wrap: anywhere;
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
          align-items: center;
        }

        .crm-calendar .fc-toolbar-title {
          font-size: 18px;
          font-weight: 900;
          color: var(--text-primary);
        }

        .crm-calendar .fc-button {
          background: var(--surface) !important;
          border: 1px solid var(--stroke) !important;
          border-radius: 10px !important;
          color: var(--text-primary) !important;
          box-shadow: none !important;
          font-weight: 800 !important;
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
          border-width: 0 !important;
          border-radius: 8px;
          padding: 3px 6px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
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

        .crm-calendar .fc-scrollgrid {
          border-radius: var(--radius);
          overflow: hidden;
        }

        @media (max-width: 980px) {
          .calendar-hero,
          .calendar-hero-actions,
          .calendar-card-header {
            display: grid;
          }

          .calendar-stats,
          .filter-columns,
          .calendar-workspace.has-detail,
          .agenda-grid {
            grid-template-columns: 1fr;
          }

          .filter-search-row {
            grid-template-columns: 1fr;
          }

          .summary-item {
            grid-template-columns: 82px 1fr;
          }

          .detail-panel {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
