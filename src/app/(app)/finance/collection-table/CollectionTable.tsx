"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import {
  Access,
  useTrackingAccess,
} from "../payment-tracking/_components/TrackingShell";
import SourceFreshness from "../payment-tracking/_components/SourceFreshness";
import { requireSourceAudit } from "../payment-tracking/_lib/source-integrity";
import {
  currencyName,
  money,
  problem,
  trackingHref,
} from "../payment-tracking/_lib/utils";
import { paymentProjectGroupLabel } from "../payment-tracking/_lib/project-groups";
import { currencyToken } from "../payment-tracking/_lib/list-currencies";
import {
  hasReportContract,
  reportDefaults,
  reportQuery,
  shiftMonth,
  usableReportSource,
} from "../collection-report/_lib/report";
import type {
  CollectionFilters,
  CollectionReportData,
  CollectionTotals,
} from "../collection-report/_lib/types";
import type { PaymentProjectGroup } from "../payment-tracking/_lib/types";
import s from "./table.module.css";

type Metric = "scheduled" | "paidToDate" | "outstanding";
type Drill = { project: PaymentProjectGroup; month: string; page: number };
const currentMonth = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Famagusta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
const filters = (
  currency: string,
  startMonth: string,
  drill?: Drill,
): CollectionFilters => ({
  ...reportDefaults,
  currency,
  startMonth,
  months: 12,
  pageSize: 25,
  ...(drill
    ? {
        projectGroup: drill.project,
        detailMonth: drill.month,
        page: drill.page,
      }
    : {}),
});
async function readReport(
  scope: CollectionFilters,
  signal: AbortSignal,
  tr: boolean,
) {
  const result = (await authedFetch(
    `/payment-collection-report?${reportQuery(scope)}`,
    { signal },
  )) as CollectionReportData;
  requireSourceAudit(result.source, tr);
  if (!hasReportContract(result, scope))
    throw new Error(
      tr
        ? "Tablonun veri kapsamı doğrulanamadı. Yeniden deneyin."
        : "The table data scope could not be verified. Please retry.",
    );
  return result;
}

export default function CollectionTable() {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const text = (a: string, b: string) => (tr ? a : b);
  const access = useTrackingAccess();
  const [currency, setCurrency] = useState("GBP");
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [metric, setMetric] = useState<Metric>("outstanding");
  const [sort, setSort] = useState<"name" | "amount">("amount");
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<CollectionReportData | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [detail, setDetail] = useState<CollectionReportData | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (access !== "allowed") return;
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      setLoading(true);
      setData(null);
      setError("");
      setDrill(null);
      setDetail(null);
      readReport(filters(currency, startMonth), controller.signal, tr)
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(problem(cause, tr).message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    });
    return () => {
      cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [access, currency, startMonth, version, tr]);
  useEffect(() => {
    if (!drill || access !== "allowed") return;
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      setDetail(null);
      setDetailLoading(true);
      setDetailError("");
      readReport(filters(currency, startMonth, drill), controller.signal, tr)
        .then((result) => {
          if (!controller.signal.aborted) setDetail(result);
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          const failure = problem(cause, tr);
          setDetailError(failure.message);
          if (failure.discardSource) {
            setData(null);
            setDetail(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setDetailLoading(false);
        });
    });
    return () => {
      cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [access, currency, startMonth, drill, version, tr]);
  if (access !== "allowed") return <Access access={access} tr={tr} />;
  const usable =
    !!data &&
    data.startMonth === startMonth &&
    currencyToken(data.selectedCurrency) === currency &&
    usableReportSource(data.source, clock);
  const detailUsable =
    !!detail &&
    !!data &&
    detail.source.importedAt === data.source.importedAt &&
    detail.startMonth === startMonth &&
    currencyToken(detail.selectedCurrency) === currency &&
    detail.selectedProjectGroup === drill?.project &&
    detail.detail.month === drill?.month &&
    usableReportSource(detail.source, clock);
  const part = usable
    ? data.byCurrency.find((row) => currencyToken(row.currency) === currency)
    : undefined;
  const projects = [...(part?.projectBreakdown || [])].sort((a, b) =>
    sort === "amount"
      ? (b.period[metric] ?? -Infinity) - (a.period[metric] ?? -Infinity)
      : paymentProjectGroupLabel(a.projectGroup, tr).localeCompare(
          paymentProjectGroupLabel(b.projectGroup, tr),
        ),
  );
  const columns = (data?.periods.length || 12) + 2;
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${month}-01T12:00:00Z`));
  const metricLabel = (value: Metric) =>
    ({
      scheduled: text("Planlanan", "Scheduled"),
      paidToDate: text("Ödenen", "Paid to date"),
      outstanding: text("Kalan", "Outstanding"),
    })[value];
  const amount = (totals: CollectionTotals | undefined) =>
    totals ? money(totals[metric], tr) : "—";
  function open(project: PaymentProjectGroup, month: string) {
    setDetail(null);
    setDrill((current) =>
      current?.project === project && current.month === month
        ? null
        : { project, month, page: 1 },
    );
  }
  return (
    <section className={s.page}>
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>{text("Finans", "Finance")}</span>
          <h1>{text("Tahsilat Tablosu", "Collection Table")}</h1>
          <p>
            {text(
              "Bir ay tutarına tıklayın; müşteri ve daireleri aynı tabloda açın.",
              "Click a monthly amount to see customers and units in the same table.",
            )}
          </p>
        </div>
        <button
          className={s.button}
          onClick={() => setVersion((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {text("Yenile", "Refresh")}
        </button>
      </header>
      <div className={s.toolbar}>
        <div
          className={s.segment}
          aria-label={text("Gösterilen tutar", "Displayed amount")}
        >
          {(["outstanding", "scheduled", "paidToDate"] as Metric[]).map(
            (value) => (
              <button
                key={value}
                aria-pressed={metric === value}
                onClick={() => setMetric(value)}
              >
                {metricLabel(value)}
              </button>
            ),
          )}
        </div>
        <label>
          {text("Döviz", "Currency")}
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {(
              data?.currencies || [
                { value: "GBP", label: "GBP", recordCount: 0 },
              ]
            ).map((row) => (
              <option
                key={currencyToken(row.value)}
                value={currencyToken(row.value)}
              >
                {currencyName(row.value, tr)}
              </option>
            ))}
          </select>
        </label>
        <div className={s.period}>
          <button
            className={s.button}
            aria-label={text("Önceki yıl", "Previous year")}
            disabled={startMonth <= "1754-01"}
            onClick={() => setStartMonth(shiftMonth(startMonth, -12))}
          >
            <ChevronLeft size={16} />
          </button>
          <label>
            {text("Başlangıç ayı", "Starting month")}
            <input
              type="month"
              min="1753-01"
              max="9997-12"
              value={startMonth}
              onChange={(event) => {
                if (/^\d{4}-\d{2}$/.test(event.target.value))
                  setStartMonth(event.target.value);
              }}
            />
          </label>
          <button
            className={s.button}
            aria-label={text("Sonraki yıl", "Next year")}
            disabled={startMonth >= "9996-12"}
            onClick={() => setStartMonth(shiftMonth(startMonth, 12))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className={s.note}>
        {text(
          "Normal satış · Yetki kodu boş · ",
          "Normal sales · Blank authorization code · ",
        )}
        {text(
          "Ödenen tutarlar Logo'da vadelere dağıtılan ödemelerdir; aylık nakit girişi değildir. Eksik tutarlar — ile gösterilir.",
          "Paid amounts are payments allocated to due dates in Logo; they are not monthly cash receipts. Missing amounts display as —.",
        )}
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className={s.status} role="status">
          {text("Tablo yükleniyor…", "Loading table…")}
        </p>
      ) : !usable ? (
        <p className={s.status} role="status">
          {text(
            "Güncel veriler için Yenile'ye tıklayın.",
            "Click Refresh to load current data.",
          )}
        </p>
      ) : (
        <>
          <SourceFreshness source={data.source} tr={tr} />
          <div
            className={s.scroll}
            tabIndex={0}
            aria-label={text(
              "Aylık tahsilat tablosu, yatay kaydırılabilir",
              "Monthly collection table, scroll horizontally",
            )}
          >
            <table className={s.table}>
              <caption className={s.sr}>
                {metricLabel(metric)} · {currencyName(part?.currency, tr)} ·{" "}
                {text("12 aylık dönem", "12 month period")}
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      onClick={() =>
                        setSort((value) =>
                          value === "name" ? "amount" : "name",
                        )
                      }
                    >
                      {text("Proje", "Project")} {sort === "name" ? "A–Z" : "↓"}
                    </button>
                  </th>
                  {data.periods.map((month) => (
                    <th scope="col" key={month}>
                      {monthLabel(month)}
                    </th>
                  ))}
                  <th scope="col">
                    <button onClick={() => setSort("amount")}>
                      {text("Dönem toplamı", "Period total")} ↓
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={columns} className={s.status}>
                      {text(
                        "Bu döviz ve dönemde kayıt yok.",
                        "No records for this currency and period.",
                      )}
                    </td>
                  </tr>
                )}
                {projects.map((project) => (
                  <Fragment key={project.projectGroup}>
                    <tr className={s.project}>
                      <th scope="row">
                        {paymentProjectGroupLabel(project.projectGroup, tr)}
                        <small>
                          {project.period.caseCount} {text("dosya", "cases")}
                        </small>
                      </th>
                      {data.periods.map((month) => {
                        const row = project.monthly.find(
                          (value) => value.month === month,
                        );
                        const expanded =
                          drill?.project === project.projectGroup &&
                          drill.month === month;
                        return (
                          <td
                            key={month}
                            className={expanded ? s.selected : ""}
                          >
                            <button
                              disabled={!row?.installmentCount}
                              aria-expanded={expanded}
                              aria-label={`${paymentProjectGroupLabel(project.projectGroup, tr)}, ${monthLabel(month)}, ${metricLabel(metric)}: ${amount(row)}`}
                              onClick={() => open(project.projectGroup, month)}
                            >
                              {amount(row)}
                            </button>
                          </td>
                        );
                      })}
                      <td className={s.total}>{amount(project.period)}</td>
                    </tr>
                    {drill?.project === project.projectGroup && (
                      <>
                        <tr className={s.detailHeading}>
                          <td colSpan={columns}>
                            <div>
                              <strong>
                                {monthLabel(drill.month)} ·{" "}
                                {text("Müşteri / daire", "Customer / unit")}
                              </strong>
                              <button
                                className={s.button}
                                onClick={() => setDrill(null)}
                              >
                                {text("Kapat", "Close")}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {detailLoading && (
                          <tr>
                            <td
                              colSpan={columns}
                              className={s.status}
                              role="status"
                            >
                              {text("Dosyalar yükleniyor…", "Loading cases…")}
                            </td>
                          </tr>
                        )}
                        {detailError && (
                          <tr>
                            <td
                              colSpan={columns}
                              className={s.error}
                              role="alert"
                            >
                              {detailError}
                              <button
                                className={s.button}
                                onClick={() => setDrill({ ...drill })}
                              >
                                {text("Tekrar dene", "Retry")}
                              </button>
                            </td>
                          </tr>
                        )}
                        {detail && !detailUsable && (
                          <tr>
                            <td colSpan={columns} className={s.status}>
                              {text(
                                "Kaynak güncellendi. Tabloyu yenileyin.",
                                "The source has changed. Refresh the table.",
                              )}
                            </td>
                          </tr>
                        )}
                        {detail && detailUsable && (
                          <>
                            {detail.detail.rows.map((row) => (
                              <tr key={row.key} className={s.customer}>
                                <th scope="row">
                                  <Link href={trackingHref(row.key)}>
                                    {row.customerName}
                                  </Link>
                                  <small>
                                    {row.unitCode || row.unitName || "—"}
                                  </small>
                                </th>
                                {data.periods.map((month) => (
                                  <td
                                    key={month}
                                    className={
                                      month === drill.month ? s.selected : ""
                                    }
                                  >
                                    {month === drill.month
                                      ? amount(row.totals)
                                      : ""}
                                  </td>
                                ))}
                                <td>—</td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={columns}>
                                <div className={s.pagination}>
                                  <span>
                                    {detail.detail.total}{" "}
                                    {text("dosya", "cases")} · {drill.page}/
                                    {Math.max(1, detail.detail.totalPages)}
                                  </span>
                                  <button
                                    className={s.button}
                                    disabled={drill.page <= 1}
                                    onClick={() =>
                                      setDrill({
                                        ...drill,
                                        page: drill.page - 1,
                                      })
                                    }
                                  >
                                    {text("Önceki", "Previous")}
                                  </button>
                                  <button
                                    className={s.button}
                                    disabled={
                                      drill.page >= detail.detail.totalPages
                                    }
                                    onClick={() =>
                                      setDrill({
                                        ...drill,
                                        page: drill.page + 1,
                                      })
                                    }
                                  >
                                    {text("Sonraki", "Next")}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </>
                        )}
                      </>
                    )}
                  </Fragment>
                ))}
              </tbody>
              {part && (
                <tfoot>
                  <tr>
                    <th scope="row">{text("Genel toplam", "Grand total")}</th>
                    {part.monthly.map((row) => (
                      <td key={row.month}>{amount(row)}</td>
                    ))}
                    <td>{amount(part.period)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </section>
  );
}
