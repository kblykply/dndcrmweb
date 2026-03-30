"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
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

function typeLabel(type: string) {
  if (type === "LEAD_FOLLOWUP") return "Lead Takibi";
  if (type === "LEAD_CALL") return "Lead Araması";
  if (type === "AGENCY_MEETING") return "Ajans Toplantısı";
  if (type === "AGENCY_TASK") return "Ajans Görevi";
  if (type === "PRESENTATION") return "Sunum";
  return type;
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

function formatDateTime(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [todayItems, setTodayItems] = useState<CalendarItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [type, setType] = useState("");
  const [currentRange, setCurrentRange] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<CalendarItem | null>(null);

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
            CRM Takvim
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            Operasyon Takvimi
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Lead takipleri, ajans toplantıları, görevler, sunumlar ve aktiviteler
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">Tüm Kayıtlar</option>
            <option value="LEAD_FOLLOWUP">Lead Takipleri</option>
            <option value="LEAD_CALL">Lead Aramaları</option>
            <option value="AGENCY_MEETING">Ajans Toplantıları</option>
            <option value="AGENCY_TASK">Ajans Görevleri</option>
            <option value="PRESENTATION">Sunumlar</option>
          </select>

          <button
            className="primary"
            onClick={() => {
              loadFeed();
              loadSummary();
            }}
            disabled={loading || summaryLoading}
          >
            {loading || summaryLoading ? "Yükleniyor..." : "Takvimi Yenile"}
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
          gridTemplateColumns: selected ? "1.5fr .7fr" : "1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Takvim</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
              Varsayılan görünüm haftalık takvimdir. Görünür tarih aralığı kadar veri yüklenir.
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
              locale="tr"
              firstDay={1}
              nowIndicator={true}
              editable={false}
              selectable={false}
              events={calendarEvents}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
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
              Takvim verileri yükleniyor…
            </div>
          ) : null}
        </div>

        {selected ? (
          <div className="card" style={{ display: "grid", gap: 12, padding: 18 }}>
            <div className="flex-between" style={{ gap: 10 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{selected.title}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {formatDateTime(selected.start)}
                </div>
              </div>

              <button onClick={() => setSelected(null)}>Kapat</button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={`badge ${badgeClass(selected.type)}`}>
                {typeLabel(selected.type)}
              </span>
              {selected.status ? <span className="badge">{selected.status}</span> : null}
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
                <b>Kayıt:</b> {selected.entityLabel}
              </div>

              {selected.subtitle ? (
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {selected.subtitle}
                </div>
              ) : null}

              {selected.assignedUser ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Sorumlu: {selected.assignedUser}
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
                <div style={{ fontWeight: 800, fontSize: 13 }}>Not / Detay</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                  {selected.notesPreview}
                </div>
              </div>
            ) : null}

            {selected.href ? (
              <a href={selected.href} style={{ fontWeight: 800 }}>
                Kaydı Aç →
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
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Bugün Olanlar</div>

          {summaryLoading ? (
            <div className="muted">Yükleniyor…</div>
          ) : todayItems.length === 0 ? (
            <div className="muted">Bugün kayıt yok.</div>
          ) : (
            todayItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 10,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 6,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div className="flex-between" style={{ gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{item.title}</div>
                  <span className={`badge ${badgeClass(item.type)}`}>
                    {typeLabel(item.type)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {formatDateTime(item.start)}
                </div>
                <div style={{ fontSize: 12 }}>{item.entityLabel}</div>
              </button>
            ))
          )}
        </div>

        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Yaklaşanlar</div>

          {summaryLoading ? (
            <div className="muted">Yükleniyor…</div>
          ) : upcomingItems.length === 0 ? (
            <div className="muted">Yaklaşan kayıt yok.</div>
          ) : (
            upcomingItems.slice(0, 20).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  padding: 10,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 6,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div className="flex-between" style={{ gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{item.title}</div>
                  <span className={`badge ${badgeClass(item.type)}`}>
                    {typeLabel(item.type)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {formatDateTime(item.start)}
                </div>
                <div style={{ fontSize: 12 }}>{item.entityLabel}</div>
              </button>
            ))
          )}
        </div>
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

        .crm-calendar .fc-event {
          border-radius: 10px;
          padding: 2px 4px;
          cursor: pointer;
          font-weight: 700;
        }

        .crm-calendar .fc-event-title {
          font-size: 12px;
        }

        .crm-calendar .fc-day-today {
          background: color-mix(in srgb, var(--surface-2) 70%, transparent) !important;
        }

        .crm-calendar .fc-timegrid-slot,
        .crm-calendar .fc-daygrid-day {
          background: var(--surface);
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