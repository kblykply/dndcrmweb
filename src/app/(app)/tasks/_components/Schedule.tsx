"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { statusColors, type WorkItem } from "../_lib/types";
import type { Copy } from "../_lib/copy";
import s from "../work.module.css";
export default function Schedule({
  items,
  locale,
  copy: c,
  timeline,
}: {
  items: WorkItem[];
  locale: string;
  copy: Copy;
  timeline: boolean;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const scheduled = items.filter((item) => item.startAt || item.dueAt);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const period = end.getTime() - month.getTime();
  if (!timeline)
    return (
      <div className={s.calendar}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          locale={locale}
          firstDay={1}
          fixedWeekCount={false}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{ today: c.today }}
          events={scheduled.map((item) => ({
            id: item.id,
            title: item.title,
            start: item.dueAt || item.startAt!,
            color: statusColors[item.status],
          }))}
          eventClick={({ event }) => router.push("/tasks/" + event.id)}
          eventDidMount={({ el, event }) => {
            el.title = event.title;
          }}
        />
      </div>
    );
  const visible = scheduled.filter(
    (item) =>
      new Date(item.dueAt || item.startAt!).getTime() >= month.getTime() &&
      new Date(item.startAt || item.dueAt!).getTime() < end.getTime(),
  );
  return (
    <section className={s.timeline}>
      <div className={s.sectionHeader}>
        <h2>
          {new Intl.DateTimeFormat(locale, {
            month: "long",
            year: "numeric",
          }).format(month)}
        </h2>
        <div className={s.actions}>
          <button
            className={s.iconButton}
            title={c.previous}
            aria-label={c.previous}
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className={s.button}
            onClick={() =>
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              )
            }
          >
            {c.today}
          </button>
          <button
            className={s.iconButton}
            title={c.next}
            aria-label={c.next}
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className={s.timelineScroll}>
        <div className={s.timelineInner}>
          <div className={s.timelineRow}>
            <strong>{c.task}</strong>
            <div className={s.dayLabels}>
              {Array.from({ length: days }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
          </div>
          {visible.map((item) => {
            const start = Math.max(
              0,
              ((new Date(item.startAt || item.dueAt!).getTime() -
                month.getTime()) /
                period) *
                100,
            );
            const finish = Math.min(
              100,
              ((new Date(item.dueAt || item.startAt!).getTime() -
                month.getTime()) /
                period) *
                100 +
                100 / days,
            );
            return (
              <div className={s.timelineRow} key={item.id}>
                <Link href={"/tasks/" + item.id}>{item.title}</Link>
                <div className={s.track}>
                  <Link
                    href={"/tasks/" + item.id}
                    title={`${item.title} · ${c.statuses[item.status]}`}
                    className={s.bar}
                    style={{
                      left: `${Math.min(start, 99)}%`,
                      width: `${Math.max(1, finish - start)}%`,
                      background: statusColors[item.status],
                    }}
                  >
                    <span>{c.statuses[item.status]}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!visible.length && <div className={s.empty}>{c.noSchedule}</div>}
    </section>
  );
}
