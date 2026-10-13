"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
  dateLabel,
  money,
  problem,
  trackingHref,
} from "../payment-tracking/_lib/utils";
import { paymentProjectGroupLabel } from "../payment-tracking/_lib/project-groups";
import { usableReportSource } from "../collection-report/_lib/report";
import type {
  PaymentInstallment,
  PaymentProjectGroup,
  PaymentSourceSnapshot,
} from "../payment-tracking/_lib/types";
import s from "./table.module.css";

type Row = PaymentInstallment & {
  id: string;
  caseKey: string;
  customerCode: string | null;
  customerName: string;
  unitCode: string | null;
  unitName: string;
  currency: string | null;
  projectGroup: PaymentProjectGroup;
};
type Data = {
  source: Omit<PaymentSourceSnapshot, "cases">;
  currency: string;
  search: string;
  status: string;
  sort: string;
  direction: string;
  currencies: (string | null)[];
  rows: Row[];
  total: number;
  page: number;
  totalPages: number;
  totals: {
    amount: number | null;
    paid: number | null;
    outstanding: number | null;
  };
};
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
  const [currency, setCurrency] = useState("GBP"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const [sort, setSort] = useState<Sort>("dueDate"),
    [direction, setDirection] = useState("asc"),
    [page, setPage] = useState(1);
  const [version, setVersion] = useState(0),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [expanded, setExpanded] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (access !== "allowed") return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError("");
        setData(null);
        setExpanded(null);
        const params = new URLSearchParams({
          currency,
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
            setData(result);
          })
          .catch((cause) => {
            if (!controller.signal.aborted)
              setError(problem(cause, tr).message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [access, currency, search, status, sort, direction, page, version, tr]);
  if (access !== "allowed") return <Access access={access} tr={tr} />;
  const usable =
    !!data &&
    data.currency === currency &&
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
          <span className={s.eyebrow}>{text("Finans", "Finance")}</span>
          <h1>{text("Tahsilat Tablosu", "Collection Table")}</h1>
          <p>
            {text(
              "Her ödeme/vade ayrı satır. Başlıklardan sıralayın, müşteri veya daire arayın.",
              "One row per installment. Sort by column headers, search customers or units.",
            )}
          </p>
        </div>
        <button
          className={s.button}
          disabled={loading}
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={16} />
          {text("Yenile", "Refresh")}
        </button>
      </header>
      <div className={s.toolbar}>
        <label>
          {text("Ara", "Search")}
          <input
            type="search"
            placeholder={text("Müşteri veya daire…", "Customer or unit…")}
            maxLength={200}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          {text("Döviz", "Currency")}
          <select
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setPage(1);
            }}
          >
            {[
              ...new Set([
                currency,
                ...(data?.currencies || []).map((value) => value ?? "__NULL__"),
              ]),
            ].map((value) => (
              <option key={value} value={value}>
                {currencyName(value === "__NULL__" ? null : value, tr)}
              </option>
            ))}
          </select>
        </label>
        <div
          className={s.segment}
          aria-label={text("Ödeme durumu", "Payment status")}
        >
          {[
            ["all", text("Tümü", "All")],
            ["open", text("Kalan", "Open")],
            ["overdue", text("Gecikmiş", "Overdue")],
            ["paid", text("Ödenmiş", "Paid")],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className={s.note}>
        {text(
          "Normal satış · Fatura OK: DND · Yetki kodu boş. Ödenen tutarlar Logo'da vadeye dağıtılan ödemelerdir. Eksik tutarlar — ile gösterilir ve toplamı hesaplanmaz.",
          "Normal sales · Invoice OK: DND · Blank authorization code. Paid amounts are payments allocated to due dates in Logo. Missing amounts display as — and their total is not calculated.",
        )}
      </p>
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
          <SourceFreshness source={data.source} tr={tr} />
          <div
            className={s.scroll}
            tabIndex={0}
            aria-label={text("Ödeme/vade tablosu", "Installment table")}
          >
            <table className={s.table}>
              <caption className={s.sr}>
                {text("Her ödeme/vade ayrı satır", "One row per installment")} ·{" "}
                {currencyName(currency === "__NULL__" ? null : currency, tr)}
              </caption>
              <thead>
                <tr>
                  {heading("customerName", text("Müşteri", "Customer"))}
                  <th scope="col">{text("Proje", "Project")}</th>
                  {heading("unitCode", text("Daire", "Unit"))}
                  {heading("dueDate", text("Vade", "Due date"))}
                  {heading("amount", text("Planlanan", "Scheduled"))}
                  {heading("paid", text("Ödenen", "Paid"))}
                  {heading("outstanding", text("Kalan", "Outstanding"))}
                  <th scope="col">{text("Durum", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {!data.rows.length && (
                  <tr>
                    <td colSpan={8} className={s.status}>
                      {text("Kayıt bulunamadı.", "No records found.")}
                    </td>
                  </tr>
                )}
                {data.rows.map((row) => (
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
                      </th>
                      <td>{paymentProjectGroupLabel(row.projectGroup, tr)}</td>
                      <td>{row.unitCode || row.unitName || "—"}</td>
                      <td>{dateLabel(row.dueDate, tr)}</td>
                      <td>{money(row.amount, tr)}</td>
                      <td>{money(row.paid, tr)}</td>
                      <td className={row.status === "overdue" ? s.overdue : ""}>
                        {money(row.outstanding, tr)}
                      </td>
                      <td>
                        {row.status === "overdue"
                          ? `${row.overdueDays} ${text("gün gecikmiş", "days overdue")}`
                          : row.status === "paid"
                            ? text("Ödendi", "Paid")
                            : row.status === "unknown"
                              ? text("Bilgi eksik", "Incomplete")
                              : text("Bekleyen", "Pending")}
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr className={s.detailHeading}>
                        <td colSpan={8}>
                          <div>
                            <span>
                              {row.customerCode || "—"} ·{" "}
                              {row.unitName || row.unitCode || "—"} ·{" "}
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
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">
                    {text("Filtrelenen tüm satırlar", "All filtered rows")}
                  </th>
                  <td colSpan={3}>
                    {data.total} {text("ödeme/vade", "installments")}
                  </td>
                  <td>{money(data.totals.amount, tr)}</td>
                  <td>{money(data.totals.paid, tr)}</td>
                  <td>{money(data.totals.outstanding, tr)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
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
        </>
      )}
    </section>
  );
}
