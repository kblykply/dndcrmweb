"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import {
  Access,
  useTrackingAccess,
} from "../payment-tracking/_components/TrackingShell";

import { requireSourceAudit } from "../payment-tracking/_lib/source-integrity";
import {
  currencyName,
  dateLabel,
  money,
  problem,
  trackingHref,
} from "../payment-tracking/_lib/utils";
import { paymentProjectGroupLabel } from "../payment-tracking/_lib/project-groups";
import { usableReportSource } from "../collection-report/_lib/report";
import type { InstallmentTableData as Data } from "./types";
import s from "./table.module.css";
import CaseStatement from "./CaseStatement";
import CollectionRate from "./CollectionRate";
import ExportMenu from "../_reports/ExportMenu";
import { buildTableReport } from "../_reports/build";
import { downloadFinanceReport } from "../_reports/download";
import { reportSessionGuard } from "../_reports/session";

type Sort =
  | "dueDate"
  | "customerName"
  | "unitCode"
  | "amount"
  | "paid"
  | "outstanding";
export default function CollectionTable() {
  const { locale } = useLanguage(),
    tr = locale === "tr";
  const text = (a: string, b: string) => (tr ? a : b);
  const access = useTrackingAccess();
  const [currency, setCurrency] = useState("__ALL__"),
    [search, setSearch] = useState(""),
    [status] = useState("all");
  const [sort, setSort] = useState<Sort>("dueDate"),
    [direction, setDirection] = useState("asc"),
    [page, setPage] = useState(1);
  const [version, setVersion] = useState(0),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [expanded, setExpanded] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const showRows = !!month || year === "undated";
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (access !== "allowed") return;
    const controller = new AbortController();
    let busy = false;
    const read = (background = false) => {
      if (busy || controller.signal.aborted) return;
      busy = true;
      if (!background) {
        setLoading(true);
        setError("");
        setData(null);
        setExpanded(null);
      }
      const params = new URLSearchParams({
        currency,
        year,
        month,
        search,
        status,
        sort,
        direction,
        page: String(page),
      });
      authedFetch(`/payment-installment-table?${params}`, {
        signal: controller.signal,
      })
        .then((result: Data) => {
          if (controller.signal.aborted) return;
          requireSourceAudit(result.source, tr);
          if (
            result.currency !== currency ||
            result.year !== year ||
            result.month !== month ||
            !Array.isArray(result.years) ||
            !Array.isArray(result.overview) ||
            result.search !== search.trim().toLocaleLowerCase("tr-TR") ||
            result.status !== status ||
            result.sort !== sort ||
            result.direction !== direction ||
            !Array.isArray(result.rows)
          )
            throw new Error(
              tr
                ? "Tablo kapsamı doğrulanamadı."
                : "Table scope could not be verified.",
            );
          setClock(Date.now());
          setData(result);
          setError("");
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          const failure = problem(cause, tr);
          if (failure.discardSource) setData(null);
          setError(failure.message);
        })
        .finally(() => {
          busy = false;
          if (!controller.signal.aborted) setLoading(false);
        });
    };
    const timer = setTimeout(() => read(), search ? 250 : 0);
    const refresh = () => {
      if (document.visibilityState === "visible") read(true);
    };
    const interval = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      controller.abort();
    };
  }, [
    access,
    currency,
    search,
    status,
    sort,
    direction,
    page,
    version,
    tr,
    year,
    month,
  ]);
  if (access !== "allowed") return <Access access={access} tr={tr} />;
  const usable =
    !!data &&
    data.currency === currency &&
    data.year === year &&
    data.month === month &&
    data.search === search.trim().toLocaleLowerCase("tr-TR") &&
    data.status === status &&
    data.sort === sort &&
    data.direction === direction &&
    data.page === Math.min(page, data.totalPages) &&
    usableReportSource(data.source, clock);
  function changeSort(next: Sort) {
    setSort(next);
    setDirection(next === sort && direction === "asc" ? "desc" : "asc");
    setPage(1);
  }
  const heading = (key: Sort, label: string) => (
    <th
      scope="col"
      aria-sort={
        sort === key
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button onClick={() => changeSort(key)}>
        {label} {sort === key ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </button>
    </th>
  );
  return (
    <section className={s.page}>
      <header className={s.heading}>
        <div>
          <h1>{text("Tahsilat Tablosu", "Collection Table")}</h1>
        </div>
        <div className={s.headerActions}>
          <ExportMenu
            tr={tr}
            disabled={loading || !usable}
            years={[
              ...new Set(
                data?.years
                  .map((part) => part.year)
                  .filter((value) => value !== "undated") || [],
              ),
            ]
              .sort()
              .reverse()}
            months={[
              ...new Set(
                data?.years.flatMap((part) =>
                  part.months.map((entry) => entry.month),
                ) || [],
              ),
            ]
              .sort()
              .reverse()}
            options={[
              {
                value: "general",
                label: text("Genel rapor", "General report"),
              },
              {
                value: "years",
                label: text("Tüm yılların özeti", "All years summary"),
              },
              {
                value: "year",
                label: text("Yıl raporu", "Annual report"),
                period: "year",
              },
              {
                value: "month",
                label: text("Ay raporu", "Monthly report"),
                period: "month",
              },
              {
                value: "customers",
                label: text("Ayın cari dökümü", "Monthly customer balances"),
                period: "month",
              },
              { value: "past", label: text("Geçmiş vadeler", "Past dues") },
              {
                value: "detail",
                label: text(
                  "Açık kapsamın tüm vadeleri",
                  "All installments in current scope",
                ),
              },
            ]}
            onExport={async (format, scope, period) => {
              const allowed = reportSessionGuard();
              const params = new URLSearchParams({
                currency: ["general", "years", "past"].includes(scope)
                  ? "__ALL__"
                  : currency,
                search,
                status,
                sort,
                direction,
              });
              if (scope === "year") params.set("year", period);
              if (scope === "month" || scope === "customers") {
                params.set("year", period.slice(0, 4));
                params.set("month", period);
              }
              if (scope === "detail") {
                params.set("year", year);
                params.set("month", month);
              }
              const result = (await authedFetch(
                `/payment-installment-table/export?${params}`,
              )) as Data;
              requireSourceAudit(result.source, tr);
              if (
                !allowed() ||
                result.rows.length !== result.total ||
                result.currency !== params.get("currency") ||
                result.year !== (params.get("year") || "") ||
                result.month !== (params.get("month") || "") ||
                result.search !== search.trim().toLocaleLowerCase("tr-TR")
              )
                throw new Error(
                  text(
                    "Rapor kapsamı doğrulanamadı.",
                    "The report scope could not be verified.",
                  ),
                );
              await downloadFinanceReport(
                buildTableReport(result, scope, tr),
                format,
                tr,
                allowed,
              );
            }}
          />

          <button
            type="button"
            className={s.iconButton}
            aria-label={text(
              "Müşteri veya daire ara",
              "Search customer or unit",
            )}
            title={
              search
                ? `${text("Arama", "Search")}: ${search}`
                : text("Ara", "Search")
            }
            aria-expanded={searchOpen}
            aria-controls="collection-quick-search"
            data-active={!!search}
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search size={24} aria-hidden="true" />
          </button>
          <button
            className={s.button}
            disabled={loading}
            onClick={() => setVersion((v) => v + 1)}
          >
            <RefreshCw size={16} />
            {text("Yenile", "Refresh")}
          </button>
        </div>
      </header>
      {searchOpen && (
        <div
          id="collection-quick-search"
          className={s.quickSearch}
          role="search"
        >
          <input
            autoFocus
            type="search"
            aria-label={text("Müşteri veya daire", "Customer or unit")}
            placeholder={text(
              "Müşteri veya daire ara…",
              "Search customer or unit…",
            )}
            value={search}
            maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className={s.button}
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              {text("Temizle", "Clear")}
            </button>
          )}
        </div>
      )}
      <nav
        className={s.breadcrumb}
        aria-label={text("Tablo ayrıntı seviyesi", "Table detail level")}
      >
        <button
          className={s.button}
          onClick={() => {
            setCurrency("__ALL__");
            setYear("");
            setMonth("");
            setPage(1);
          }}
        >
          {text("Tüm yıllar", "All years")}
        </button>
        {year && (
          <>
            <span>›</span>
            <button
              className={s.button}
              onClick={() => {
                setMonth("");
                setPage(1);
              }}
            >
              {year === "undated"
                ? text("Vadesi belirtilmemiş", "Undated")
                : year}
            </button>
          </>
        )}
        {month && (
          <>
            <span>›</span>
            <strong>
              {new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${month}-01T12:00:00Z`))}
            </strong>
          </>
        )}
      </nav>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className={s.status} role="status">
          {text("Ödeme satırları yükleniyor…", "Loading installments…")}
        </p>
      ) : !usable ? (
        <p className={s.status}>
          {text(
            "Güncel veriler için tabloyu yenileyin.",
            "Refresh the table to load current data.",
          )}
        </p>
      ) : (
        <>
          <div
            className={s.scroll}
            tabIndex={0}
            aria-label={text("Ödeme/vade tablosu", "Installment table")}
          >
            <table className={s.table}>
              <caption className={s.sr}>
                {text("Her ödeme/vade ayrı satır", "One row per installment")} ·{" "}
                {currency === "__ALL__"
                  ? text("Tüm dövizler", "All currencies")
                  : currencyName(currency === "__NULL__" ? null : currency, tr)}
              </caption>
              <thead>
                <tr>
                  {showRows ? (
                    <>
                      {heading("customerName", text("Müşteri", "Customer"))}
                      <th scope="col">{text("Proje", "Project")}</th>
                      {heading("unitCode", text("Daire", "Unit"))}
                      {heading("dueDate", text("Vade", "Due date"))}
                    </>
                  ) : (
                    <th scope="col" colSpan={1}>
                      {year ? text("Ay", "Month") : text("Dönem", "Period")}
                    </th>
                  )}
                  {showRows ? (
                    heading("amount", text("Planlanan", "Scheduled"))
                  ) : (
                    <th scope="col">{text("Planlanan", "Scheduled")}</th>
                  )}
                  {showRows ? (
                    heading("paid", text("Ödenen", "Paid"))
                  ) : (
                    <th scope="col">{text("Ödenen", "Paid")}</th>
                  )}
                  {showRows ? (
                    heading("outstanding", text("Kalan", "Outstanding"))
                  ) : (
                    <th scope="col">{text("Kalan", "Outstanding")}</th>
                  )}
                  <th scope="col">{text("Tahsilat %", "Collection %")}</th>
                </tr>
              </thead>
              <tbody>
                {!year &&
                  data.overview.map((summary) => (
                    <Fragment key={summary.currency ?? "__NULL__"}>
                      <tr className={s.overview}>
                        <th scope="row">
                          {text("Genel toplam", "Overall")} ·{" "}
                          {currencyName(summary.currency, tr)}
                        </th>
                        <td>{money(summary.overall.amount, tr)}</td>
                        <td>{money(summary.overall.paid, tr)}</td>
                        <td>{money(summary.overall.outstanding, tr)}</td>
                        <td>
                          <CollectionRate
                            amount={summary.overall.amount}
                            paid={summary.overall.paid}
                            tr={tr}
                          />
                        </td>
                      </tr>
                      <tr className={s.pastOverview}>
                        <th scope="row">
                          {text("Geçmiş vadeler", "Past due dates")} ·{" "}
                          {currencyName(summary.currency, tr)}
                          <small>
                            {dateLabel(data.previousMonthEnd, tr)}{" "}
                            {text(
                              "dahil · bu ay hariç",
                              "inclusive · excluding this month",
                            )}
                          </small>
                        </th>
                        <td>
                          {money(summary.throughPreviousMonth.amount, tr)}
                        </td>
                        <td>{money(summary.throughPreviousMonth.paid, tr)}</td>
                        <td className={s.overdue}>
                          {money(summary.throughPreviousMonth.outstanding, tr)}
                        </td>
                        <td>
                          <CollectionRate
                            amount={summary.throughPreviousMonth.amount}
                            paid={summary.throughPreviousMonth.paid}
                            tr={tr}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                {!year && data.overview.length > 0 && (
                  <tr className={s.sectionRow}>
                    <th colSpan={5}>{text("Yıllar", "Years")}</th>
                  </tr>
                )}
                {!data.total && (
                  <tr>
                    <td colSpan={showRows ? 8 : 5} className={s.status}>
                      {text("Kayıt bulunamadı.", "No records found.")}
                    </td>
                  </tr>
                )}
                {!showRows &&
                  (year
                    ? data.years.find((group) => group.year === year)?.months ||
                      []
                    : data.years
                  ).map((group) => {
                    const key = "year" in group ? group.year : group.month;
                    const label =
                      key === "undated"
                        ? text("Vadesi belirtilmemiş", "Undated")
                        : "year" in group
                          ? key
                          : new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
                              month: "long",
                              timeZone: "UTC",
                            }).format(new Date(`${key}-01T12:00:00Z`));
                    const drill = () => {
                      if ("year" in group) {
                        setYear(key);
                        setCurrency(group.currency ?? "__NULL__");
                        setMonth("");
                      } else setMonth(key);
                      setPage(1);
                    };
                    return (
                      <tr
                        key={`${key}:${"currency" in group ? group.currency : currency}`}
                        className={s.project}
                      >
                        <th scope="row" colSpan={1}>
                          <button
                            onClick={drill}
                            aria-label={`${label}, ${text("detayları aç", "open details")}`}
                          >
                            ▸ {label} ·{" "}
                            {currencyName(
                              "currency" in group
                                ? group.currency
                                : currency === "__NULL__"
                                  ? null
                                  : currency,
                              tr,
                            )}
                          </button>
                          <small>
                            {group.count} {text("ödeme/vade", "installments")}
                          </small>
                        </th>
                        <td>
                          <button onClick={drill}>
                            {money(group.amount, tr)}
                          </button>
                        </td>
                        <td>
                          <button onClick={drill}>
                            {money(group.paid, tr)}
                          </button>
                        </td>
                        <td>
                          <button onClick={drill}>
                            {money(group.outstanding, tr)}
                          </button>
                        </td>
                        <td>
                          <CollectionRate
                            amount={group.amount}
                            paid={group.paid}
                            tr={tr}
                          />
                        </td>
                      </tr>
                    );
                  })}
                {(showRows ? data.rows : []).map((row) => (
                  <Fragment key={row.id}>
                    <tr className={s.customer}>
                      <th scope="row">
                        <button
                          aria-expanded={expanded === row.id}
                          onClick={() =>
                            setExpanded((value) =>
                              value === row.id ? null : row.id,
                            )
                          }
                        >
                          {row.customerName}
                        </button>
                        <small>{row.representatives?.join(", ") || "—"}</small>
                      </th>
                      <td>{paymentProjectGroupLabel(row.projectGroup, tr)}</td>
                      <td>{row.unitCode || row.unitName || "—"}</td>
                      <td>{dateLabel(row.dueDate, tr)}</td>
                      <td>{money(row.amount, tr)}</td>
                      <td>{money(row.paid, tr)}</td>
                      <td className={row.status === "overdue" ? s.overdue : ""}>
                        {money(row.outstanding, tr)}
                        {row.status === "overdue" && (
                          <small>
                            {row.overdueDays}{" "}
                            {text("gün gecikmiş", "days overdue")}
                          </small>
                        )}
                      </td>
                      <td>
                        <CollectionRate
                          amount={row.amount}
                          paid={row.paid}
                          tr={tr}
                        />
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr className={s.detailHeading}>
                        <td colSpan={8}>
                          <div>
                            <span>
                              {row.customerCode || "—"} ·{" "}
                              {row.unitName || row.unitCode || "—"} ·{" "}
                              {row.brokers?.join(", ") || "—"} ·{" "}
                              {text("Ödeme satırı", "Installment")}{" "}
                              {row.sequence}
                            </span>
                            <Link
                              className={s.button}
                              href={trackingHref(row.caseKey)}
                            >
                              {text("Dosyayı aç", "Open case")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expanded === row.id && (
                      <CaseStatement
                        caseKey={row.caseKey}
                        importedAt={data.source.importedAt}
                        tr={tr}
                      />
                    )}
                  </Fragment>
                ))}
              </tbody>
              {currency !== "__ALL__" && (
                <tfoot>
                  <tr>
                    <th scope="row">{text("Toplam", "Total")}</th>
                    {showRows && (
                      <td colSpan={3}>
                        {data.total} {text("ödeme/vade", "installments")}
                      </td>
                    )}
                    <td>{money(data.totals.amount, tr)}</td>
                    <td>{money(data.totals.paid, tr)}</td>
                    <td>{money(data.totals.outstanding, tr)}</td>
                    <td>
                      <CollectionRate
                        amount={data.totals.amount}
                        paid={data.totals.paid}
                        tr={tr}
                      />
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {showRows && (
            <div className={s.pagination}>
              <span>
                {data.total} {text("satır", "rows")} · {data.page}/
                {data.totalPages}
              </span>
              <button
                className={s.button}
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                {text("Önceki", "Previous")}
              </button>
              <button
                className={s.button}
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                {text("Sonraki", "Next")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
