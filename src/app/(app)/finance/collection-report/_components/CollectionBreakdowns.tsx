"use client";

import { useMemo, useState } from "react";
import { Building2, UsersRound, ChevronDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from "recharts";
import { currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { paymentProjectGroupLabel } from "../../payment-tracking/_lib/project-groups";
import { currencyName, money } from "../../payment-tracking/_lib/utils";
import { buildBreakdownModel, type BreakdownInput, type BreakdownMetric, type BreakdownPoint } from "../_lib/breakdowns";
import { completionLabel } from "../_lib/charts";
import type { CollectionReportData } from "../_lib/types";
import s from "../breakdowns.module.css";

interface DisplayGroup extends BreakdownInput {
  representativeState?: "single" | "multiple" | "unassigned";
}
function compactAmount(value: number, tr: boolean) {
  const absolute = Math.abs(value);
  const scale = absolute >= 1_000_000_000 ? 1_000_000_000 : absolute >= 1_000_000 ? 1_000_000 : absolute >= 1_000 ? 1_000 : 1;
  const suffix = scale === 1_000_000_000 ? (tr ? " mlr" : " bn") : scale === 1_000_000 ? (tr ? " mn" : " m") : scale === 1_000 ? (tr ? " bin" : " k") : "";
  return `${new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", { maximumFractionDigits: 1 }).format(value / scale)}${suffix}`;
}

function GroupBar({ label, ...props }: BarShapeProps & { label: string }) {
  const key = (props.payload as Partial<BreakdownPoint> | undefined)?.key;
  return <g role="img" aria-label={label}><Rectangle {...props} data-group-key={key} /></g>;
}
function GroupTooltip({ active, payload, currency, amountLabel, tr }: {
  active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }>; currency: string; amountLabel: string; tr: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as BreakdownPoint;
  return <div className={s.tooltip}><strong>{point.label}</strong><span>{currency}</span>
    <p>{amountLabel}<b>{money(point.value, tr)}</b></p>
    {point.incomplete && <small>{tr ? "Kaynak bilgisi eksik." : "Source information is incomplete."}</small>}
  </div>;
}

function BreakdownPanel({ kind, title, rows, currency, metric, metricLabel, unavailable, tr }: {
  kind: "project" | "representative"; title: string; rows: DisplayGroup[]; currency: string;
  metric: BreakdownMetric; metricLabel: string; unavailable?: boolean; tr: boolean;
}) {
  const t = (a: string, b: string) => tr ? a : b;
  const model = useMemo(() => buildBreakdownModel(rows, metric, 6), [rows, metric]);
  return <section className={s.panel} data-breakdown={kind} data-breakdown-state={unavailable ? "unavailable" : model.state} aria-label={title}>
    <header className={s.panelHeader}><div className={s.panelTitle}><span className={s.icon}>{kind === "project" ? <Building2 size={17} aria-hidden="true" /> : <UsersRound size={17} aria-hidden="true" />}</span><div><h3>{title}</h3><p>{metricLabel} · {currency}</p></div></div></header>
    {unavailable ? <p className={s.empty}>{t("Satış temsilcisi bilgisine şu anda ulaşılamıyor.", "Sales representative information is currently unavailable.")}</p> : model.state === "empty" ? <p className={s.empty}>{t("Bu kapsamda kayıt yok.", "No records in this scope.")}</p> : <>
      <div className={s.plot} style={{ height: Math.max(185, model.visible.length * 44 + 28) }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={model.visible} layout="vertical" margin={{ top: 6, right: 60, left: 0, bottom: 0 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="var(--line)" strokeDasharray="3 5" />
            <XAxis type="number" domain={[0, "auto"]} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(value: number) => compactAmount(value, tr)} />
            <YAxis type="category" dataKey="label" width={123} axisLine={false} tickLine={false} interval={0} tick={{ fill: "var(--ink)", fontSize: 12 }} tickFormatter={(value: string) => value.length > 19 ? `${value.slice(0, 18)}…` : value} />
            <Tooltip content={(props) => <GroupTooltip {...props} currency={currency} amountLabel={metricLabel} tr={tr} />} filterNull={false} isAnimationActive={false} cursor={{ fill: "var(--accent-soft)" }} />
            <Bar dataKey="value" name={metricLabel} fill={kind === "project" ? "var(--project-bar)" : "var(--representative-bar)"} radius={[0, 6, 6, 0]} maxBarSize={23} shape={(props: BarShapeProps) => {
              const point = props.payload as BreakdownPoint<DisplayGroup>;
              return <GroupBar {...props} label={`${point.label} · ${money(point.value, tr)} ${currency}`} />;
            }} isAnimationActive={false}><LabelList dataKey="value" position="right" fill="var(--muted)" fontSize={12} formatter={(value) => typeof value === "number" ? compactAmount(value, tr) : "—"} /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {model.hiddenCount > 0 && <div className={s.totals}><span data-testid={`${kind}-other-groups`}>{t(`Grafik dışındaki ${model.hiddenCount} grup`, `${model.hiddenCount} groups outside the chart`)}<b>{money(model.hiddenAmount, tr)}</b></span></div>}
      {model.state === "partial" && <p className={s.notice}>{t("Eksik bilgili gruplar ve genel toplam gösterilemiyor.", "Groups with incomplete information and the overall total cannot be shown.")}</p>}
      <details className={s.details} data-testid={`${kind}-breakdown-table`}>
        <summary><span>{t("Tümünü göster", "Show all")} ({model.points.length})</span><ChevronDown size={14} aria-hidden="true" /></summary>
        <div className={s.tableScroll}><table aria-label={`${title} · ${currency}`}>
          <thead><tr><th>{title}</th><th>{metricLabel}</th>{metric === "period" && <><th>{t("Planlanan", "Scheduled")}</th><th>{t("Ödenen / kapanan", "Paid / settled")}</th><th>{t("Tamamlanma", "Completion")}</th></>}</tr></thead>
          <tbody>{model.points.map((point) => <tr key={point.key} data-breakdown-key={point.key}>
            <td><span className={s.groupLabel}>{point.label}</span></td>
            <td>{money(point.value, tr)}</td>
            {metric === "period" && <>
              <td>{money(point.row.period.incompleteRows === 0 ? point.row.period.scheduled : null, tr)}</td>
              <td>{money(point.row.period.incompleteRows === 0 ? point.row.period.paidToDate : null, tr)}</td>
              <td>{completionLabel(point.row.period.completionPercent ?? null, tr)}</td>
            </>}
          </tr>)}</tbody>
        </table></div>
      </details>
    </>}
  </section>;
}

export default function CollectionBreakdowns({ report, tr, currency: controlledCurrency }: {
  report: CollectionReportData; tr: boolean; currency?: string;
}) {
  const t = (a: string, b: string) => tr ? a : b;
  const [chosenCurrency, setChosenCurrency] = useState("");
  const [metric, setMetric] = useState<BreakdownMetric>("period");
  const current = controlledCurrency !== undefined ? report.byCurrency.find((part) => currencyToken(part.currency) === controlledCurrency) : report.byCurrency.find((part) => currencyToken(part.currency) === chosenCurrency) || report.byCurrency[0];
  const selectedCurrency = current ? currencyToken(current.currency) : "";
  const currency = currencyName(current?.currency, tr);
  const metricLabel = metric === "overdue" ? t("Gecikmiş alacak", "Overdue balance") : metric === "nextMonth" ? t("Gelecek ay beklenen", "Next month expected") : t("Seçili dönem kalanı", "Selected period balance");
  const projects: DisplayGroup[] = useMemo(() => (current?.projectBreakdown || []).map((row) => ({ ...row, key: row.projectGroup, label: paymentProjectGroupLabel(row.projectGroup, tr) })), [current, tr]);
  const representatives: DisplayGroup[] = useMemo(() => (current?.representativeBreakdown || []).map((row) => ({
    ...row,
    label: row.representativeState === "multiple" ? (tr ? "Birden fazla temsilci" : "Multiple representatives") : row.representativeState === "unassigned" ? (tr ? "Temsilci atanmamış" : "Unassigned representative") : row.representative || "—",
  })), [current, tr]);
  if (report.analyticsVersion !== 1 || !current) return null;
  return <section className={s.section} aria-label={t("Proje ve temsilci kırılımları", "Project and representative breakdowns")} data-testid="collection-breakdowns" data-breakdown-currency={selectedCurrency} data-breakdown-metric={metric}>
    <header className={s.header}>
      <div><h2>{t("Proje ve satış temsilcisi", "Projects and sales representatives")}</h2></div>
      <div className={s.tools}>
        <label><span>{t("Gösterilen tutar", "Shown amount")}</span><select aria-label={t("Gösterilen tutar", "Shown amount")} value={metric} onChange={(event) => setMetric(event.target.value as BreakdownMetric)}>
          <option value="period">{t("Seçili dönem kalanı", "Selected period balance")}</option><option value="overdue">{t("Gecikmiş alacak", "Overdue balance")}</option><option value="nextMonth">{t("Gelecek ay beklenen", "Next month expected")}</option>
        </select></label>
        {controlledCurrency === undefined && report.currencyMode === "all" && <label><span>{t("Döviz", "Currency")}</span><select aria-label={t("Kırılım para birimi", "Breakdown currency")} value={selectedCurrency} onChange={(event) => setChosenCurrency(event.target.value)}>
          {report.byCurrency.map((part) => <option key={currencyToken(part.currency)} value={currencyToken(part.currency)}>{currencyName(part.currency, tr)}</option>)}
        </select></label>}
      </div>
    </header>
    <div className={s.panels}>
      <BreakdownPanel kind="project" title={t("Projelere göre", "By project")} rows={projects} currency={currency} metric={metric} metricLabel={metricLabel} tr={tr} />
      <BreakdownPanel kind="representative" title={t("Satış temsilcilerine göre", "By sales representative")} rows={representatives} currency={currency} metric={metric} metricLabel={metricLabel} unavailable={report.source.authorizationSource.status !== "available"} tr={tr} />
    </div>
    {representatives.some((row) => row.representativeState === "multiple") && <p className={s.notice}>{t("Birden fazla temsilcisi olan dosyalar ayrı gruptadır; tutarlar temsilciler arasında çoğaltılmaz.", "Cases with multiple representatives form a separate group; amounts are not counted for each person.")}</p>}
  </section>;
}
