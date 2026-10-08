"use client";
import Link from "next/link";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  dateTime,
  duration,
  statusColors,
  type Report,
  type Workspace,
} from "../_lib/types";
import type { Copy } from "../_lib/copy";
import s from "../work.module.css";
import WorkInfo from "./WorkInfo";
export default function Reports({
  report,
  workspace,
  copy: c,
  locale,
}: {
  report: Report;
  workspace: Workspace;
  copy: Copy;
  locale: string;
}) {
  const [now] = useState(() => Date.now());
  const workload = [...new Set(report.workload.map((row) => row.assignedToId))]
    .map((id) => {
      const rows = report.workload.filter((r) => r.assignedToId === id);
      return {
        id,
        name: workspace.users.find((u) => u.id === id)?.name || c.unassigned,
        open: rows
          .filter((r) => !["DONE", "CANCELLED"].includes(r.status))
          .reduce((n, r) => n + r._count, 0),
        done: rows
          .filter((r) => r.status === "DONE")
          .reduce((n, r) => n + r._count, 0),
        minutes: rows.reduce((n, r) => n + (r._sum.estimateMinutes || 0), 0),
      };
    })
    .sort((a, b) => b.open - a.open);
  const chartRows = report.status.map((r) => ({
    name: c.statuses[r.status],
    value: r._count,
    color: statusColors[r.status],
  }));
  return (
    <div className={s.reports}>
      <section className={s.reportSection}>
        <div className={s.sectionHeader}>
          <h2>{c.distribution}</h2>
          <WorkInfo topic="reports" />
        </div>
        {report.total ? (
          <div className={s.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ left: 10, right: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={118}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="value" name={c.total} radius={[0, 4, 4, 0]}>
                  {chartRows.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={s.empty}>{c.noEntries}</div>
        )}
      </section>
      <section className={s.reportSection}>
        <div className={s.sectionHeader}>
          <h2>{c.time}</h2>
          <WorkInfo topic="time" />
        </div>
        <div className={s.timeTotals}>
          <div>
            <span>{c.estimated}</span>
            <strong>{duration(report.estimateMinutes)}</strong>
          </div>
          <div>
            <span>{c.logged}</span>
            <strong>{duration(report.spentMinutes)}</strong>
          </div>
        </div>
        <div className={s.helpHeading}>
          <h3>{c.urgency}</h3>
          <WorkInfo topic="priority" />
        </div>
        {report.priority.map((row) => (
          <div className={s.priorityRow} key={row.priority}>
            <span className={s.priority} data-priority={row.priority}>
              {c.priorities[row.priority]}
            </span>
            <progress value={row._count} max={Math.max(1, report.total)} />
            <strong>{row._count}</strong>
          </div>
        ))}
      </section>
      <section className={s.reportSection}>
        <div className={s.sectionHeader}>
          <h2>{c.workload}</h2>
          <WorkInfo topic="workload" />
        </div>
        <div className={s.tableScroll}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{c.assignee}</th>
                <th>{c.open}</th>
                <th>{c.completed}</th>
                <th>{c.estimated}</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((r) => (
                <tr key={r.id || "none"}>
                  <td>{r.name}</td>
                  <td>{r.open}</td>
                  <td>{r.done}</td>
                  <td>{duration(r.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!workload.length && <div className={s.empty}>{c.noEntries}</div>}
      </section>
      <section className={s.reportSection}>
        <div className={s.sectionHeader}>
          <h2>{c.upcoming}</h2>
          <WorkInfo topic="upcoming" />
        </div>
        {report.due.map((item) => (
          <Link className={s.dueRow} href={"/tasks/" + item.id} key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <span className={s.muted}>
                {item.assignedTo?.name || c.unassigned}
              </span>
            </div>
            <time data-overdue={new Date(item.dueAt).getTime() < now}>
              {dateTime(item.dueAt, locale)}
            </time>
          </Link>
        ))}
        {!report.due.length && <div className={s.empty}>{c.noEntries}</div>}
      </section>
    </div>
  );
}
