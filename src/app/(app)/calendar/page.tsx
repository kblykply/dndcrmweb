"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";

type CalendarItem = {
  id: string;
  type:
    | "LEAD_FOLLOWUP"
    | "LEAD_CALL"
    | "AGENCY_MEETING"
    | "AGENCY_TASK"
    | "PRESENTATION";
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string | null;
  entityId: string;
  entityType: "lead" | "agency" | "customer";
  entityLabel: string;
  subtitle?: string | null;
  notesPreview?: string | null;
  assignedUser?: string | null;
  href?: string;
  meta?: Record<string, any>;
};

function typeLabel(type: string, t: (path: string) => string) {
  return t(`eventTypes.${type}`);
}

function typeColor(type: string) {
  if (type === "LEAD_FOLLOWUP") return "#3b82f6";
  if (type === "LEAD_CALL") return "#f59e0b";
  if (type === "AGENCY_MEETING") return "#22c55e";
  if (type === "AGENCY_TASK") return "#8b5cf6";
  if (type === "PRESENTATION") return "#06b6d4";
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

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
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
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>

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
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr",
                gap: 14,
                textAlign: "left",
                padding: 0,
                borderRadius: 20,
                border: "1px solid var(--stroke)",
                background: "var(--surface)",
                cursor: "pointer",
                overflow: "hidden",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  background: "var(--surface-2)",
                  borderRight: "1px solid var(--stroke)",
                  padding: "16px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  minHeight: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.3,
                    color: "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  {formatDay(item.start, locale)}
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    marginTop: 10,
                  }}
                >
                  {formatTime(item.start, locale)}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  display: "grid",
                  gap: 10,
                  minWidth: 0,
                  alignContent: "start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 14,
                        color: "var(--text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {item.entityLabel}
                      {item.subtitle ? ` • ${item.subtitle}` : ""}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      flexShrink: 0,
                    }}
                  >
                    <span className={`badge ${badgeClass(item.type)}`}>
                      {typeLabel(item.type, t)}
                    </span>

                    {item.status ? (
                      <span className="badge">
                        {safeTranslate(t, `statuses.${item.status}`, item.status)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {item.assignedUser ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("common.assignedTo")}: {item.assignedUser}
                  </div>
                ) : null}

                {item.notesPreview ? (
                  <div
                    style={{
                      borderTop: "1px solid var(--stroke)",
                      paddingTop: 10,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {item.notesPreview}
                  </div>
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
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [type, setType] = useState("");
  const [currentRange, setCurrentRange] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const fullCalendarLocale = locale === "tr" ? "tr" : "en";

  const calendarEvents = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end || undefined,
      allDay: item.allDay ?? false,
      backgroundColor: typeColor(item.type),
      borderColor: typeColor(item.type),
      textColor: "#ffffff",
      extendedProps: {
        item,
      },
    }));
  }, [items]);

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
        if (type) params.set("type", type);

        const feed = await authedFetch(`/calendar/feed?${params.toString()}`);
        setItems(Array.isArray(feed?.items) ? feed.items : []);
      } catch (e: any) {
        setErr(String(e?.message || e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [currentRange, type]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!currentRange) return;
    loadFeed(currentRange);
  }, [type, currentRange, loadFeed]);

  function handleDatesSet(arg: DatesSetArg) {
    const nextRange = {
      from: arg.start.toISOString(),
      to: new Date(arg.end.getTime() - 1).toISOString(),
    };
    setCurrentRange(nextRange);
  }

  function handleEventClick(arg: EventClickArg) {
    const item = arg.event.extendedProps?.item as CalendarItem | undefined;
    if (!item) return;
    setSelected(item);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {t("calendar.label")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {t("calendar.title")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {t("calendar.subtitle")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">{t("calendar.allRecords")}</option>
            <option value="LEAD_FOLLOWUP">{t("calendar.leadFollowups")}</option>
            <option value="LEAD_CALL">{t("calendar.leadCalls")}</option>
            <option value="AGENCY_MEETING">{t("calendar.agencyMeetings")}</option>
            <option value="AGENCY_TASK">{t("calendar.agencyTasks")}</option>
            <option value="PRESENTATION">{t("calendar.presentations")}</option>
          </select>

          <button
            className="primary"
            onClick={() => {
              loadFeed();
              loadSummary();
            }}
            disabled={loading || summaryLoading}
          >
            {loading || summaryLoading ? t("common.loading") : t("common.refresh")}
          </button>
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
            <div style={{ fontWeight: 900, fontSize: 16 }}>{t("calendar.calendar")}</div>
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
                <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.title}</div>
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

            <div
              style={{
                border: "1px solid var(--stroke)",
                borderRadius: 12,
                background: "var(--surface-2)",
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
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
              <div
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  background: "var(--surface)",
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>{t("calendar.notes")}</div>
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
          items={todayItems}
          loading={summaryLoading}
          onSelect={setSelected}
          t={t}
          locale={locale}
        />

        <SummaryListCard
          title={t("common.upcoming")}
          items={upcomingItems.slice(0, 20)}
          loading={summaryLoading}
          onSelect={setSelected}
          t={t}
          locale={locale}
        />
      </div>

      <style jsx global>{`
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
      `}</style>
    </div>
  );
}