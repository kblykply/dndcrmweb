"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps } from "recharts";
import { ArrowUpRight, ChartNoAxesCombined, ChevronDown } from "lucide-react";
import { currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { currencyName, money } from "../../payment-tracking/_lib/utils";
import type { CollectionReportData } from "../_lib/types";
import { buildCollectionChartModel, completionLabel, type PaymentChartPoint } from "../_lib/charts";
import s from "../charts.module.css";

const longMonths = ["en-GB", "tr-TR"].map((locale) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }));
const shortMonths = ["en-GB", "tr-TR"].map((locale) => new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "UTC" }));
function compactAmount(value: number, tr: boolean) {
  const absolute = Math.abs(value);
  const scale = absolute >= 1_000_000_000 ? 1_000_000_000 : absolute >= 1_000_000 ? 1_000_000 : absolute >= 1_000 ? 1_000 : 1;
  const suffix = scale === 1_000_000_000 ? (tr ? " mlr" : " bn") : scale === 1_000_000 ? (tr ? " mn" : " m") : scale === 1_000 ? (tr ? " bin" : " k") : "";
  return `${new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", { maximumFractionDigits: 1 }).format(value / scale)}${suffix}`;
}
function monthLabel(value: string, tr: boolean, short = false) {
  return (short ? shortMonths : longMonths)[tr ? 1 : 0].format(new Date(`${value}-01T12:00:00Z`));
}
function MonthTooltip({ active, payload, label, currency, amountLabel, performance, cumulative, tr }: {
  active?: boolean; payload?: ReadonlyArray<{ value?: unknown; payload?: unknown }>; label?: unknown; currency: string; amountLabel: string; performance: boolean; cumulative: boolean; tr: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as Partial<PaymentChartPoint> | undefined;
  const month = typeof label === "string" && /^\d{4}-\d{2}$/.test(label) ? label : point?.month;
  return <div className={s.tooltip}>
    <strong>{month ? monthLabel(month, tr) : currency}</strong><span>{currency}</span>
    {performance ? <>
      <p>{tr ? "Planlanan" : "Scheduled"}<b>{money(point?.scheduled ?? null, tr)}</b></p>
      <p>{tr ? "Ödenen / kapanan" : "Paid / settled"}<b>{money(point?.paidToDate ?? null, tr)}</b></p>
      <p>{tr ? "Kalan" : "Outstanding"}<b>{money(point?.outstanding ?? null, tr)}</b></p>
      <p>{tr ? "Tamamlanma" : "Completion"}<b>{completionLabel(point?.completionPercent ?? null, tr)}</b></p>
    </> : <>
      <p>{amountLabel}<b>{money(point?.outstanding ?? null, tr)}</b></p>
      {cumulative && <p>{tr ? "Birikimli kalan" : "Cumulative remaining"}<b>{money(point?.cumulativeOutstanding ?? null, tr)}</b></p>}
    </>}
    <small>{point?.incomplete ? (tr ? "Kaynak bilgisi eksik." : "Source information is incomplete.") : `${point?.installmentCount ?? 0} ${tr ? "vade kaydı" : "scheduled entries"}`}</small>
  </div>;
}
function MonthBar({ selected, label, ...props }: BarShapeProps & {
  selected: boolean; label: string;
}) {
  const month = (props.payload as Partial<PaymentChartPoint> | undefined)?.month;
  return <g role="img" aria-label={label}><Rectangle {...props} data-month={month} data-selected={selected} stroke={selected ? "var(--accent)" : "none"} strokeWidth={selected ? 2 : 0} /></g>;
}

export default function CollectionCharts({ report, tr, loading, onSelectMonth, currency: controlledCurrency, selectedMonth }: {
  report: CollectionReportData; tr: boolean; loading: boolean; onSelectMonth: (month: string) => void;
  currency?: string; selectedMonth?: string;
}) {
  const t = (a: string, b: string) => tr ? a : b;
  const gradient = useId().replace(/:/g, "");
  const [chosenCurrency, setChosenCurrency] = useState("");
  const [mode, setMode] = useState<"remaining" | "performance" | "cumulative">("remaining");
  const currencyKeys = report.byCurrency.map((entry) => currencyToken(entry.currency));
  const selectedCurrency = controlledCurrency !== undefined ? controlledCurrency : currencyKeys.includes(chosenCurrency) ? chosenCurrency : currencyKeys[0] || "";
  const current = report.byCurrency.find((entry) => currencyToken(entry.currency) === selectedCurrency);
  const model = useMemo(() => current ? buildCollectionChartModel(current) : null, [current]);
  const currency = currencyName(current?.currency, tr);
  const includesPast = report.startMonth < report.nextMonth;
  const title = includesPast ? t("Vadelere göre kalan alacak", "Outstanding by due month") : t("Aylık tahsilat planı", "Monthly collection plan");
  const amountLabel = includesPast ? t("Kalan tutar", "Outstanding amount") : t("Beklenen tutar", "Expected amount");
  const chartState = (mode === "performance" ? model?.performanceState : model?.monthlyState) || "empty";
  const firstMonth = model?.monthly[0]?.month;
  const lastMonth = model?.monthly.at(-1)?.month;
  const activeMonth = selectedMonth ?? (report.detail.scope === "month" ? report.detail.month : "");
  const cumulativeDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: PaymentChartPoint }) => {
    if (!payload || payload.cumulativeOutstanding === null || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
    return <circle cx={cx} cy={cy} r={payload.month === activeMonth ? 5 : 4} fill="var(--paper)" stroke="var(--chart-amount)" strokeWidth={2} role="img" data-month={payload.month} aria-label={`${monthLabel(payload.month, tr)} · ${money(payload.cumulativeOutstanding, tr)} ${currency}`} />;
  };
  const axis = <>
    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} tickMargin={12} tickFormatter={(month: string) => monthLabel(month, tr, true)} />
    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} width={61} domain={[(minimum: number) => Math.min(0, minimum), "auto"]} tickFormatter={(value: number) => compactAmount(value, tr)} />
    <Tooltip content={(props) => <MonthTooltip {...props} currency={currency} amountLabel={amountLabel} performance={mode === "performance"} cumulative={mode === "cumulative"} tr={tr} />} filterNull={false} isAnimationActive={false} cursor={{ fill: "var(--accent-soft)", stroke: "var(--line)" }} />
  </>;
  const barShape = (props: BarShapeProps) => {
    const month = (props.payload as PaymentChartPoint).month;
    return <MonthBar {...props} selected={month === activeMonth} label={`${monthLabel(month, tr)} · ${money(typeof props.value === "number" ? props.value : null, tr)} ${currency}`} />;
  };
  return <section className={s.dashboard} aria-label={t("Tahsilat grafikleri", "Collection charts")} data-testid="collection-charts" data-chart-currency={selectedCurrency} data-chart-mode={mode} data-chart-range="selected">
    <section className={s.card} aria-label={title} data-chart="monthly" data-chart-state={chartState}>
      <header className={s.header}>
        <div className={s.title}><span className={s.icon}><ChartNoAxesCombined size={19} aria-hidden="true" /></span><div><h2>{title}</h2>{firstMonth && lastMonth && <p>{monthLabel(firstMonth, tr)} – {monthLabel(lastMonth, tr)}</p>}</div></div>
        <div className={s.currencyTools}>
          {controlledCurrency === undefined && report.currencyMode === "all" && current && <label className={s.currencyChoice}><span>{t("Grafik para birimi", "Graph currency")}</span><select aria-label={t("Grafik para birimi", "Graph currency")} value={selectedCurrency} onChange={(event) => setChosenCurrency(event.target.value)}>{report.byCurrency.map((entry) => <option key={currencyToken(entry.currency)} value={currencyToken(entry.currency)}>{currencyName(entry.currency, tr)}</option>)}</select></label>}
          {current && <span className={s.currencyBadge}>{currency}</span>}
        </div>
      </header>
      {!model || !current ? <p className={s.empty}>{t("Bu kapsamda ödeme yok.", "No payments in this scope.")}</p> : <>
        <div className={s.viewTools}>
          <div className={s.periodSummary}><span>{t("Seçili dönem toplamı", "Selected period total")}</span><strong data-period-total>{money(model.total, tr)} <small>{currency}</small></strong></div>
          <label className={s.viewChoice}><span>{t("Grafik görünümü", "Chart view")}</span><select aria-label={t("Grafik görünümü", "Chart view")} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="remaining">{t("Aylık kalan", "Monthly outstanding")}</option>
            <option value="cumulative">{t("Birikimli kalan", "Cumulative outstanding")}</option>
            <option value="performance">{t("Plan ve kapanma", "Schedule and settlement")}</option>
          </select></label>
        </div>
        {chartState === "empty" ? <p className={s.empty}>{t("Seçili dönemde ödeme planı yok.", "No payments are scheduled in this period.")}</p> : <div className={`${s.plot} ${model.monthly.length > 6 ? s.denseLabels : ""}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {mode === "cumulative" ? <AreaChart data={model.monthly} margin={{ top: 20, right: 16, bottom: 8, left: 0 }} accessibilityLayer>
              <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-amount)" stopOpacity={0.27} /><stop offset="100%" stopColor="var(--chart-amount)" stopOpacity={0.025} /></linearGradient></defs>{axis}
              <Area type="linear" dataKey="cumulativeOutstanding" name={t("Birikimli kalan", "Cumulative remaining")} stroke="var(--chart-amount)" strokeWidth={3} fill={`url(#${gradient})`} connectNulls={false} isAnimationActive={false} dot={cumulativeDot} activeDot={cumulativeDot} />
            </AreaChart> : <BarChart data={model.monthly} margin={{ top: 25, right: 12, bottom: 8, left: 0 }} barCategoryGap="32%" accessibilityLayer>
              {axis}
              {mode === "performance" && <Bar dataKey="scheduled" name={t("Planlanan", "Scheduled")} fill="var(--chart-scheduled)" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} shape={barShape} />}
              {mode === "performance" && <Bar dataKey="paidToDate" name={t("Ödenen / kapanan", "Paid / settled")} fill="var(--chart-settled)" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} shape={barShape} />}
              <Bar dataKey="outstanding" name={amountLabel} fill="var(--chart-amount)" radius={[7, 7, 0, 0]} maxBarSize={mode === "performance" ? 30 : 56} isAnimationActive={false} shape={barShape}>
                {mode === "remaining" && model.monthly.length <= 12 && <LabelList className={s.valueLabel} dataKey="outstanding" position="top" fill="var(--ink)" fontSize={12} offset={8} formatter={(value) => typeof value === "number" ? compactAmount(value, tr) : "—"} />}
              </Bar>
            </BarChart>}
          </ResponsiveContainer>
        </div>}
        {mode === "performance" && <><div className={s.legend} aria-label={t("Grafik açıklaması", "Chart legend")}><span><i style={{ background: "var(--chart-scheduled)" }} />{t("Planlanan", "Scheduled")}</span><span><i style={{ background: "var(--chart-settled)" }} />{t("Ödenen / kapanan", "Paid / settled")}</span><span><i style={{ background: "var(--chart-amount)" }} />{t("Kalan", "Outstanding")}</span></div><p className={s.notice}>{t("Kapanma, ilgili vadelerin bugüne kadar ödenen veya mahsup edilen kısmıdır; o ay şirkete giren nakit değildir.", "Settlement is the part of each due amount paid or offset to date; it is not cash received during that month.")}</p></>}
        {mode === "cumulative" && <p className={s.notice}>{t("Her nokta, grafikteki ilk aydan o aya kadar kalan vadelerin toplamıdır.", "Each point adds the remaining dues from the first shown month through that month.")}</p>}
        <details className={s.monthlyDetails} data-testid="collection-monthly-table">
          <summary><span>{t("Aylık vade detayları", "Monthly due details")}</span><ChevronDown size={15} aria-hidden="true" /></summary>
          <div className={s.performanceTable}><table aria-label={t("Aylık vade detayları", "Monthly due details")}>
            <thead><tr><th>{t("Ay", "Month")}</th><th>{t("Planlanan", "Scheduled")}</th><th>{t("Ödenen / kapanan", "Paid / settled")}</th><th>{t("Kalan", "Outstanding")} · {currency}</th><th>{t("Tamamlanma", "Completion")}</th>{mode === "cumulative" && <th>{t("Birikimli kalan", "Cumulative remaining")}</th>}</tr></thead>
            <tbody>{model.monthly.map((month) => <tr key={month.month} data-chart-month={month.month} data-performance-month={month.month} data-selected={month.month === activeMonth}>
              <td><button type="button" disabled={loading} aria-label={`${t("Dosyaları göster", "View cases")}: ${monthLabel(month.month, tr)}`} onClick={() => onSelectMonth(month.month)}>{monthLabel(month.month, tr)}<ArrowUpRight size={12} aria-hidden="true" /></button></td>
              <td>{money(month.scheduled, tr)}</td><td>{money(month.paidToDate, tr)}</td><td data-month-outstanding>{money(month.outstanding, tr)}{month.incomplete && <small>{t("Eksik bilgi", "Incomplete")}</small>}</td><td>{completionLabel(month.completionPercent, tr)}</td>{mode === "cumulative" && <td>{money(month.cumulativeOutstanding, tr)}</td>}
            </tr>)}</tbody>
          </table></div>
          <p className={s.notice}>{t("Tüm tutarlar", "All amounts in")} {currency}. {t("Ödenen / kapanan: ilgili vadeye yapılan ödeme ve mahsuplar; ay içindeki nakit girişi değildir.", "Paid / settled: payments and offsets against that due amount; not cash received during the month.")}</p>
        </details>
        {chartState === "partial" && <p className={s.notice}>{t("Eksik bilgili ayların tutarı gösterilemiyor.", "Amounts cannot be shown for months with incomplete information.")}</p>}
      </>}
    </section>
  </section>;
}
