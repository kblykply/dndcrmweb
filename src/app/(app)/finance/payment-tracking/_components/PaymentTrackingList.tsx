"use client";

import Link from "next/link";
import ExportMenu from "../../_reports/ExportMenu";
import { reportSessionGuard } from "../../_reports/session";
import { downloadFinanceReport } from "../../_reports/download";
import { buildSalesLedgerReport } from "../../_reports/build";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  FileText,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import type { PaymentTrackingList as ListData } from "../_lib/types";
import { paymentKindLabel } from "../_lib/payment-kinds";
import {
  hasProjectGroupContract,
  paymentProjectGroupLabel,
} from "../_lib/project-groups";
import {
  currencyName,
  dateLabel,
  money,
  problem,
  statusLabel,
  trackingHref,
} from "../_lib/utils";
import {
  Access,
  ErrorMessage,
  Loading,
  useTrackingAccess,
} from "./TrackingShell";
import s from "../payment-tracking.module.css";

import PaymentListFilters from "./PaymentListFilters";
import SourceFreshness from "./SourceFreshness";
import { requireSourceAudit } from "../_lib/source-integrity";
import { useSourceExpiry } from "../_lib/useSourceExpiry";
import FilteredOverdueTotal from "./FilteredOverdueTotal";
import { useSourceRefresh } from "../_lib/useSourceRefresh";
import {
  invalidatePaymentListCache,
  isPaymentListSourceRecent,
  paymentListCacheTicket,
  readPaymentListCache,
  removePaymentListCache,
  writePaymentListCache,
} from "../_lib/list-cache";
import {
  defaults,
  readFilters,
  query,
  filterErrors,
  normalizeFilters,
  type Filters,
} from "../_lib/list-filters";

import { hasInvoiceOkContract } from "../_lib/invoice-ok";
import {
  currencyToken,
  hasCurrencyContract,
  selectedCurrencyToken,
} from "../_lib/list-currencies";

export default function PaymentTrackingList({
  salesMode = false,
}: {
  salesMode?: boolean;
}) {
  const apiBase = salesMode ? "/sales-ledger" : "/payment-tracking";
  const basePath = salesMode
    ? "/my-customer-accounts"
    : "/finance/payment-tracking";
  const { locale } = useLanguage(),
    tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const access = useTrackingAccess(salesMode);
  const [ready, setReady] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "search" | "filters" | "summary" | null
  >(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const applied = useRef<Filters>(defaults);
  const [filters, setFilters] = useState<Filters>(defaults);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [data, setData] = useState<ListData | null>(null);
  const confirmed = useRef<{ session: string | null; value: ListData } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backgroundError, setBackgroundError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const language = useRef(tr);
  useEffect(() => {
    language.current = tr;
  }, [tr]);
  const request = useRef({
    id: 0,
    busy: false,
    controller: null as AbortController | null,
  });
  useEffect(() => {
    const restore = () => {
      ++request.current.id;
      request.current.controller?.abort();
      const next = readFilters(new URLSearchParams(window.location.search));
      if (salesMode)
        Object.assign(next, {
          invoiceOk: "value:DND",
          authorizationState: "blank",
          authorizationCode: "",
        });
      applied.current = next;
      setRequestVersion((value) => value + 1);
      setFilters(next);
      setDraft(next);
      setLoading(true);
      setReady(true);
    };
    const frame = requestAnimationFrame(restore);
    window.addEventListener("popstate", restore);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", restore);
    };
  }, [salesMode]);
  const load = useCallback(
    async (
      scope: Filters,
      refresh = false,
      background = false,
      signal?: AbortSignal,
    ) => {
      const state = request.current;
      if (signal?.aborted || (background && state.busy)) return;
      const id = ++state.id;
      state.busy = true;
      state.controller?.abort();
      const controller = new AbortController();
      state.controller = controller;
      if (refresh) invalidatePaymentListCache();
      const cacheKey = query(normalizeFilters(scope)).toString();
      const cacheTicket = paymentListCacheTicket(
        salesMode ? "sales" : "finance",
      );
      const cached =
        !refresh && !background
          ? readPaymentListCache(cacheKey, cacheTicket)
          : null;
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (!background) {
        setLoading(!cached);
        setError("");
        if (cached) {
          setData(cached);
          setBackgroundError(false);
        }
      }
      const validation = Object.values(filterErrors(scope, language.current));
      if (validation.length) {
        setError(validation.join(" "));
        state.busy = false;
        setLoading(false);
        signal?.removeEventListener("abort", abort);
        return;
      }
      try {
        const params = query(scope);
        if (refresh) params.set("refresh", "true");
        const next = (await authedFetch(`${apiBase}?${params}`, {
          signal: controller.signal,
        })) as ListData;
        if (id !== state.id || controller.signal.aborted) return;
        requireSourceAudit(next.source, language.current);
        const responseTicket = paymentListCacheTicket(
          salesMode ? "sales" : "finance",
        );
        if (
          cacheTicket.identity !== responseTicket.identity ||
          !responseTicket.session
        ) {
          confirmed.current = null;
          setData(null);
          setError(
            language.current
              ? "Oturum değişti. Güncel oturumla verileri yeniden yükleyin."
              : "Your session changed. Reload the data with the current session.",
          );
          return;
        }
        if (
          typeof next.summary?.closedCount !== "number" ||
          typeof next.filteredSummary?.closedCount !== "number" ||
          next.rows.some((row) => typeof row.fullyPaid !== "boolean")
        ) {
          throw new Error(
            language.current
              ? "Dosyaların ödeme durumu doğrulanamadı. Sonuçları yeniden yükleyin."
              : "The cases' payment status could not be verified. Reload the results.",
          );
        }
        if (
          !hasProjectGroupContract(next) ||
          next.selectedProjectGroup !== scope.projectGroup
        ) {
          throw new Error(
            language.current
              ? "Proje doğrulanamadı. Sonuçları yeniden yükleyin."
              : "The project could not be verified. Reload the results.",
          );
        }
        if (!hasCurrencyContract(next, scope.currency)) {
          throw new Error(
            language.current
              ? "Para birimi kapsamı doğrulanamadı. Sonuçları yeniden yükleyin."
              : "The currency scope could not be verified. Reload the results.",
          );
        }
        if (!hasInvoiceOkContract(next, next.rows, scope.invoiceOk)) {
          throw new Error(
            JSON.stringify({
              code: "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID",
              message: language.current
                ? "Fatura OK kapsamı doğrulanamadı. Sonuçları yeniden yükleyin."
                : "The Invoice OK scope could not be verified. Reload the results.",
            }),
          );
        }
        if (next.selectedPaymentKind !== scope.paymentKind) {
          throw new Error(
            language.current
              ? "Ödeme türü doğrulanamadı. Sonuçları yeniden yükleyin."
              : "The payment type could not be verified. Reload the results.",
          );
        }
        confirmed.current = { session: responseTicket.session, value: next };
        setData(next);
        setBackgroundError(false);
        const normalized = {
          ...normalizeFilters(scope),
          paymentKind: next.selectedPaymentKind,
          projectGroup: next.selectedProjectGroup,
          currency: selectedCurrencyToken(next),
          page: next.page,
          pageSize: next.pageSize,
        };
        writePaymentListCache(cacheKey, next, cacheTicket);
        writePaymentListCache(query(normalized).toString(), next, cacheTicket);
        applied.current = normalized;
        setFilters(normalized);
        setDraft((current) => ({
          ...current,
          currency:
            current.currency === scope.currency
              ? normalized.currency
              : current.currency,
          page: normalized.page,
          pageSize: normalized.pageSize,
        }));
        window.history.replaceState(
          null,
          "",
          `${basePath}?${query(normalized)}`,
        );
      } catch (cause) {
        if (id === state.id && !controller.signal.aborted) {
          removePaymentListCache(cacheKey, cacheTicket);
          const parsed = problem(cause, language.current);
          if (parsed.discardSource) {
            invalidatePaymentListCache();
            confirmed.current = null;
            setData(null);
            setBackgroundError(false);
            setError(parsed.message);
          } else if (background) setBackgroundError(true);
          else {
            if (cached)
              setData(
                confirmed.current?.session === cacheTicket.session
                  ? confirmed.current.value
                  : null,
              );
            setError(problem(cause, language.current).message);
          }
        }
      } finally {
        signal?.removeEventListener("abort", abort);
        if (id === state.id) {
          state.busy = false;
          if (!background && !controller.signal.aborted) setLoading(false);
        }
      }
    },
    [apiBase, basePath, salesMode],
  );
  useSourceExpiry(data?.source, () => {
    invalidatePaymentListCache();
    confirmed.current = null;
    setData(null);
    setError(
      language.current
        ? "Kaynak verisi güncelliğini kaybetti. Tutarları görmek için yenileyin."
        : "Source data has expired. Refresh to view amounts.",
    );
  });
  useEffect(() => {
    if (!ready || access !== "allowed") return;
    const state = request.current;
    const frame = requestAnimationFrame(() => void load(applied.current));
    return () => {
      cancelAnimationFrame(frame);
      ++state.id;
      state.controller?.abort();
    };
  }, [ready, access, requestVersion, load]);
  const poll = useCallback(
    (signal: AbortSignal) => load(applied.current, false, true, signal),
    [load],
  );
  useSourceRefresh({
    freshness: data?.source.freshness,
    enabled: ready && access === "allowed" && !!data && !loading && !error,
    scopeKey: `${requestVersion}:${refreshVersion}`,
    onPoll: poll,
  });
  function refreshSource() {
    setRefreshVersion((value) => value + 1);
    void load(applied.current, true);
  }
  function apply(next: Filters) {
    const normalized = {
      ...normalizeFilters(next),
      ...(salesMode
        ? {
            invoiceOk: "value:DND",
            authorizationState: "blank",
            authorizationCode: "",
          }
        : {}),
      currency: next.currency || (data ? selectedCurrencyToken(data) : ""),
    };
    setDraft(normalized);
    const validation = Object.values(filterErrors(normalized, tr));
    if (validation.length) {
      setError(validation.join(" "));
      return;
    }
    if (
      data &&
      !error &&
      !backgroundError &&
      !loading &&
      isPaymentListSourceRecent(data) &&
      readPaymentListCache(
        query(normalized).toString(),
        paymentListCacheTicket(salesMode ? "sales" : "finance"),
      ) &&
      query(normalized).toString() === query(applied.current).toString()
    )
      return;
    ++request.current.id;
    request.current.controller?.abort();
    applied.current = normalized;
    setFilters(normalized);
    setLoading(true);
    setRequestVersion((value) => value + 1);
    window.history.pushState(null, "", `${basePath}?${query(normalized)}`);
  }
  const scopeLabel = (value: string) =>
    value === "all"
      ? t("Tüm dosyalar", "All cases")
      : value === "open"
        ? t("Açık bakiyeli", "Open balance")
        : value === "actionable"
          ? t("Takip zamanı gelen", "Ready to follow up")
          : value === "closed"
            ? t("Tamamen ödenenler", "Fully paid")
            : value === "paid"
              ? t("Seçili bakiye ödendi", "Selected balance paid")
              : statusLabel(value as "overdue", tr);
  const sortLabel = (value: string) =>
    ({
      overdueDays: t("Kaynak gecikme günü", "Source overdue days"),
      outstanding: t("Açık bakiye", "Outstanding balance"),
      effectiveDueDate: t("Takip tarihi", "Follow-up date"),
      customerName: t("Müşteri", "Customer"),
      unitName: t("Daire", "Unit"),
      amount: t("Toplam plan", "Scheduled amount"),
      paid: t("Kaynakta ödenen", "Paid in source"),
      overdueAmount: t("Kaynak gecikmiş tutarı", "Source overdue amount"),
      oldestDueDate: t("En eski açık vade", "Oldest open due date"),
      nextDueDate: t("Sonraki vade", "Next due date"),
      trackingOverdueDays: t("Takip gecikme günü", "Follow-up overdue days"),
    })[value] || value;
  function sortHeader(key: string, label: string) {
    return (
      <th
        scope="col"
        aria-sort={
          filters.sortBy === key
            ? filters.sortDir === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <button
          className={s.sortButton}
          onClick={() =>
            apply({
              ...draft,
              page: 1,
              sortBy: key,
              sortDir:
                filters.sortBy === key && filters.sortDir === "desc"
                  ? "asc"
                  : "desc",
            })
          }
          aria-label={`${label} · ${t("sırala", "sort")}`}
        >
          {label}
          {filters.sortBy !== key ? (
            <ArrowUpDown size={12} />
          ) : filters.sortDir === "asc" ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )}
        </button>
      </th>
    );
  }
  if (access !== "allowed")
    return (
      <div className={s.page}>
        <Access access={access} tr={tr} salesMode={salesMode} />
      </div>
    );
  const currencyTitle =
    data?.currencyMode === "all"
      ? t("Tüm para birimleri", "All currencies")
      : currencyName(data?.selectedCurrency, tr);
  const currencyBalances = data
    ? data.currencyMode === "all"
      ? data.currencyBreakdown
      : [
          {
            currency: data.selectedCurrency,
            total: data.total,
            summary: data.summary,
            filteredSummary: data.filteredSummary,
          },
        ]
    : [];
  return (
    <div className={`${s.page} ${s.listPage}`} aria-busy={loading}>
      <header className={`${s.header} ${s.listHeader}`}>
        <h1>
          {salesMode
            ? t("Müşteri Carilerim", "My Customer Accounts")
            : t("Ödeme Takip", "Payment Tracking")}
        </h1>
        <div className={s.actions}>
          <button
            type="button"
            className={s.iconButton}
            aria-label={t("Müşteri veya daire ara", "Search customer or unit")}
            title={
              filters.q
                ? `${t("Arama", "Search")}: ${filters.q}`
                : t("Ara", "Search")
            }
            aria-expanded={activePanel === "search"}
            aria-controls="payment-quick-search"
            data-active={!!filters.q}
            onClick={() =>
              setActivePanel((value) => (value === "search" ? null : "search"))
            }
          >
            <Search size={24} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={s.iconButton}
            aria-label={t("Arama ve filtreler", "Search and filters")}
            title={t("Arama ve filtreler", "Search and filters")}
            aria-expanded={activePanel === "filters"}
            aria-controls="payment-search-panel"
            onClick={() =>
              setActivePanel((value) =>
                value === "filters" ? null : "filters",
              )
            }
          >
            <Filter size={24} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={s.iconButton}
            aria-label={t("Takip özeti", "Follow-up summary")}
            title={t("Takip özeti", "Follow-up summary")}
            aria-expanded={activePanel === "summary"}
            aria-controls="payment-summary-panel"
            onClick={() =>
              setActivePanel((value) =>
                value === "summary" ? null : "summary",
              )
            }
          >
            <Wallet size={24} aria-hidden="true" />
          </button>
          {salesMode && (
            <ExportMenu
              tr={tr}
              disabled={loading || !data}
              options={[
                {
                  value: "current",
                  label: t("Gösterilen cari listesi", "Current customer list"),
                },
                {
                  value: "overdue",
                  label: t("Geciken cariler", "Overdue accounts"),
                },
                { value: "all", label: t("Tüm carilerim", "All my accounts") },
              ]}
              onExport={async (format, scope) => {
                const allowed = reportSessionGuard("sales");
                const values = {
                  ...filters,
                  ...(scope === "current" ? {} : { scope }),
                  invoiceOk: "value:DND",
                  authorizationState: "blank",
                  authorizationCode: "",
                };
                const result = (await authedFetch(
                  `${apiBase}/export?${query(values)}`,
                )) as ListData;
                requireSourceAudit(result.source, tr);
                if (
                  !allowed() ||
                  result.rows.length !== result.total ||
                  !hasCurrencyContract(result, filters.currency) ||
                  !hasInvoiceOkContract(result, result.rows, "value:DND")
                )
                  throw new Error(
                    t(
                      "Rapor kapsamı doğrulanamadı.",
                      "Report scope could not be verified.",
                    ),
                  );
                await downloadFinanceReport(
                  buildSalesLedgerReport(
                    result,
                    tr,
                    scope === "current"
                      ? scopeLabel(filters.scope)
                      : scopeLabel(scope),
                  ),
                  format,
                  tr,
                  allowed,
                );
              }}
            />
          )}
          {!salesMode && (
            <Link
              className={s.button}
              href="/finance/collection-report"
              aria-label={t("Tahsilat raporu", "Collection report")}
            >
              <FileText size={20} aria-hidden="true" />
              {t("Rapor", "Report")}
            </Link>
          )}
          <button
            className={s.button}
            disabled={loading}
            onClick={refreshSource}
            aria-label={t("Kaynağı yenile", "Refresh source")}
          >
            <RefreshCw size={20} className={loading ? s.spin : undefined} />
            {t("Yenile", "Refresh")}
          </button>
        </div>
      </header>
      {data &&
        (backgroundError || data.source.freshness?.status === "stale") && (
          <SourceFreshness
            source={data.source}
            tr={tr}
            failed={backgroundError}
          />
        )}
      {error && (
        <>
          <ErrorMessage
            message={error}
            retry={refreshSource}
            busy={loading}
            tr={tr}
          />
          {data && (
            <p className={s.hint}>
              {t(
                "Son başarılı okumaya ait sonuçlar gösteriliyor.",
                "Showing the last successful results.",
              )}
            </p>
          )}
        </>
      )}
      {activePanel === "search" && (
        <form
          id="payment-quick-search"
          className={s.quickSearch}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ ...draft, page: 1 });
          }}
        >
          <input
            autoFocus
            type="search"
            aria-label={t("Müşteri veya daire", "Customer or unit")}
            placeholder={t(
              "Müşteri veya daire ara…",
              "Search customer or unit…",
            )}
            maxLength={200}
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          />
          <button className={s.primary} disabled={loading}>
            {t("Ara", "Search")}
          </button>
          {filters.q && (
            <button
              type="button"
              className={s.button}
              disabled={loading}
              onClick={() => apply({ ...filters, q: "", page: 1 })}
            >
              {t("Temizle", "Clear")}
            </button>
          )}
        </form>
      )}
      <div id="payment-search-panel" hidden={activePanel !== "filters"}>
        <PaymentListFilters
          data={data}
          filters={filters}
          draft={draft}
          tr={tr}
          loading={loading}
          onDraft={setDraft}
          onApply={apply}
          scopeLabel={scopeLabel}
          sortLabel={sortLabel}
          salesMode={salesMode}
        />
      </div>
      {!data && loading ? <Loading tr={tr} /> : null}
      {data && (
        <>
          <div
            id="payment-summary-panel"
            hidden={activePanel !== "summary"}
            data-payment-management
          >
            <div className={s.managementBody}>
              {!backgroundError &&
                !["refreshing", "stale"].includes(
                  data.source.freshness?.status || "",
                ) && <SourceFreshness source={data.source} tr={tr} />}
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <div>
                    <h2>
                      <Wallet size={18} />
                      {t("Döviz bazında takip özeti", "Follow-up by currency")}
                    </h2>
                  </div>
                </div>
                {(loading || error) && (
                  <p className={s.hint} role="status">
                    {t(
                      "Güncel sonuçlar bekleniyor; aşağıdaki özet son başarılı sonuçlara aittir.",
                      "Waiting for current results; the summary below is from the last successful results.",
                    )}
                  </p>
                )}
                <div className={s.currencyGrid}>
                  {currencyBalances.map((balance) => (
                    <article
                      className={s.currencyCard}
                      key={currencyToken(balance.currency)}
                      aria-label={t(
                        `${currencyName(balance.currency, tr)} özeti`,
                        `${currencyName(balance.currency, tr)} summary`,
                      )}
                    >
                      <h3>
                        {currencyName(balance.currency, tr)} ·{" "}
                        {paymentKindLabel(data.selectedPaymentKind, tr)} ·{" "}
                        {data.selectedProjectGroup
                          ? paymentProjectGroupLabel(
                              data.selectedProjectGroup,
                              tr,
                            )
                          : t("Tüm projeler", "All projects")}
                      </h3>
                      <dl>
                        <dt>{t("Toplam açık bakiye", "Total outstanding")}</dt>
                        <dd>
                          <strong>
                            {money(balance.filteredSummary.outstanding, tr)}
                          </strong>
                        </dd>
                        <dt>
                          {t(
                            "Asıl vadeye göre gecikmiş",
                            "Overdue by original due date",
                          )}
                        </dt>
                        <dd className={s.red}>
                          {money(balance.filteredSummary.overdueAmount, tr)}
                        </dd>
                        <dt>
                          {t(
                            "Takip sırasındaki dosyaların açık bakiyesi",
                            "Open balance of files due for follow-up",
                          )}
                        </dt>
                        <dd>
                          {money(balance.filteredSummary.actionableAmount, tr)}
                        </dd>
                      </dl>
                    </article>
                  ))}
                  <article className={s.currencyCard}>
                    <h3>{t("Takip kapsamı", "Case coverage")}</h3>
                    <dl>
                      <dt>{t("Açık dosyalar", "Open cases")}</dt>
                      <dd>{data.filteredSummary.openCount}</dd>
                      <dt>{t("Sorumlu atanmamış", "Unassigned")}</dt>
                      <dd>{data.filteredSummary.unassignedCount}</dd>
                      <dt>
                        {t("Kaynak değerlendirme günü", "Source as-of date")}
                      </dt>
                      <dd>{dateLabel(data.source.asOf, tr)}</dd>
                    </dl>
                  </article>
                </div>
              </section>

              <section
                className={s.counts}
                aria-label={t("Takip durumları", "Follow-up statuses")}
              >
                {(
                  [
                    ["actionable", data.summary.actionableCount, CalendarClock],
                    ["overdue", data.summary.overdueCount, Clock3],
                    ["deferred", data.summary.deferredCount, CalendarDays],
                    ["today", data.summary.todayCount, CalendarDays],
                  ] as const
                ).map(([scope, count, Icon]) => (
                  <button
                    key={scope}
                    className={s.kpi}
                    aria-pressed={filters.scope === scope}
                    onClick={() => apply({ ...draft, scope, page: 1 })}
                  >
                    <span>
                      <Icon size={16} />
                      {scopeLabel(scope)}
                    </span>
                    <strong
                      className={
                        scope === "overdue"
                          ? s.red
                          : scope === "deferred"
                            ? s.amber
                            : undefined
                      }
                    >
                      {count}
                    </strong>
                    <small>{t("Dosyaları görüntüle", "View cases")}</small>
                  </button>
                ))}
              </section>
              <section
                className={s.closedScope}
                aria-label={t("Tamamlanan ödemeler", "Completed payments")}
              >
                <div className={s.actions}>
                  <button
                    type="button"
                    className={s.button}
                    aria-pressed={filters.scope === "closed"}
                    disabled={loading}
                    onClick={() =>
                      apply({ ...draft, scope: "closed", page: 1 })
                    }
                  >
                    {t("Tamamen ödenenler", "Fully paid")} (
                    {data.summary.closedCount})
                  </button>
                  {filters.scope === "closed" && (
                    <button
                      type="button"
                      className={s.button}
                      disabled={loading}
                      onClick={() =>
                        apply({ ...draft, scope: "open", page: 1 })
                      }
                    >
                      {t("Açık bakiyelilere dön", "Back to open balances")}
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
          {data.orphanedTrackingCount > 0 && (
            <div className={s.notice}>
              {data.orphanedTrackingCount}{" "}
              {t(
                "yerel takip dosyası güncel kaynakta eşleşmiyor. Bu kayıtlar kapanmış kabul edilmez.",
                "local cases no longer match the current source. These are not assumed to be paid.",
              )}
            </div>
          )}
        </>
      )}
      {data && activePanel === "summary" && (
        <FilteredOverdueTotal
          summary={data.filteredSummary}
          total={data.total}
          currency={currencyTitle}
          breakdown={
            data.currencyMode === "all" ? data.currencyBreakdown : undefined
          }
          paymentKind={paymentKindLabel(data.selectedPaymentKind, tr)}
          project={
            data.selectedProjectGroup
              ? paymentProjectGroupLabel(data.selectedProjectGroup, tr)
              : t("Tüm projeler", "All projects")
          }
          tr={tr}
          state={
            loading
              ? "updating"
              : error
                ? "error"
                : backgroundError || data.source.freshness?.status === "stale"
                  ? "stale"
                  : "current"
          }
        />
      )}
      {data && (
        <>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <div>
                <h2>
                  <Filter size={17} />
                  {t("Takip dosyaları", "Payment cases")}
                </h2>
                <p>
                  {data.total} {t("dosya", "cases")} · {currencyTitle} ·{" "}
                  {scopeLabel(filters.scope)}
                </p>
              </div>
              {loading && (
                <span className={s.hint} role="status">
                  {t("Güncelleniyor…", "Updating…")}
                </span>
              )}
            </div>
            <div className={`${s.tableWrap} ${loading ? s.stale : ""}`}>
              <table className={s.table}>
                <thead>
                  <tr>
                    {sortHeader(
                      "customerName",
                      t("Müşteri / daire", "Customer / unit"),
                    )}
                    {sortHeader("outstanding", t("Kalan borç", "Outstanding"))}
                    <th scope="col">{t("Gecikmiş ödeme", "Overdue amount")}</th>
                    {sortHeader(
                      "effectiveDueDate",
                      t("Takip tarihi", "Follow-up date"),
                    )}
                    <th scope="col">{t("Takip durumu", "Follow-up status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.key}
                      className={
                        row.overdueAmount != null && row.overdueAmount > 0
                          ? s.overdueRow
                          : undefined
                      }
                    >
                      <td>
                        <Link
                          href={`${salesMode ? `${basePath}/${encodeURIComponent(row.key)}` : trackingHref(row.key)}?returnTo=${encodeURIComponent(query(filters).toString())}`}
                        >
                          {row.customerName || row.identity.customerCode || "—"}
                        </Link>
                        <small>
                          {paymentProjectGroupLabel(row.projectGroup, tr)} ·{" "}
                          {row.unitName || row.identity.unitCode || "—"} ·{" "}
                          {currencyName(row.identity.currency, tr)}
                        </small>
                        {row.tracking?.priority === "high" && (
                          <small className={s.amber}>
                            {t("Yüksek öncelik", "High priority")}
                          </small>
                        )}
                        {row.sourceReview?.status === "review_required" && (
                          <small className={s.amber}>
                            {t(
                              "KDV iade / devir kontrolü",
                              "VAT return / transfer review",
                            )}
                          </small>
                        )}
                      </td>
                      <td className={s.numeric}>
                        {money(row.outstanding, tr)}
                        {data.currencyMode === "all" && (
                          <small>
                            {currencyName(row.identity.currency, tr)}
                          </small>
                        )}
                      </td>
                      <td
                        className={`${s.numeric} ${row.overdueAmount ? s.red : ""}`}
                      >
                        {money(row.overdueAmount, tr)}
                        {row.overdueDays > 0 && (
                          <small>
                            {row.overdueDays}{" "}
                            {t("gün gecikmiş", "days overdue")}
                          </small>
                        )}
                        {data.currencyMode === "all" && (
                          <small>
                            {currencyName(row.identity.currency, tr)}
                          </small>
                        )}
                      </td>

                      <td
                        className={
                          row.trackingStatus === "deferred"
                            ? s.amber
                            : undefined
                        }
                      >
                        {dateLabel(row.effectiveDueDate, tr)}
                        {row.tracking?.trackingDate && (
                          <small>{t("Ertelenmiş", "Deferred")}</small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${s.badge} ${row.trackingStatus === "overdue" ? s.badgeDanger : row.trackingStatus === "deferred" ? s.badgeAmber : row.trackingStatus === "paid" ? s.badgeGreen : ""}`}
                        >
                          {row.fullyPaid
                            ? t("Tamamen ödendi", "Fully paid")
                            : row.trackingStatus === "paid"
                              ? t(
                                  "Seçili bakiye ödendi",
                                  "Selected balance paid",
                                )
                              : statusLabel(row.trackingStatus, tr)}
                        </span>
                        <small>
                          {row.tracking?.assigneeName ||
                            t("Atanmamış", "Unassigned")}
                        </small>
                        {!row.canTrack && (
                          <small>
                            {row.trackingIssue ||
                              t("Takibe uygun değil", "Tracking unavailable")}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.rows.length && (
                <div className={s.empty}>
                  {t(
                    "Bu filtrelerle eşleşen takip dosyası yok.",
                    "No payment cases match these filters.",
                  )}
                </div>
              )}
            </div>
            <div className={s.pagination}>
              <label>
                {t("Sayfa boyutu", "Page size")}
                <select
                  aria-label={t("Sayfa boyutu", "Page size")}
                  value={data.pageSize}
                  disabled={loading}
                  onChange={(event) =>
                    apply({
                      ...draft,
                      pageSize: Number(event.target.value),
                      page: 1,
                    })
                  }
                >
                  {[25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                {t("Sayfa", "Page")} {data.page} /{" "}
                {Math.max(1, data.totalPages)} · {data.total}{" "}
                {t("dosya", "cases")}
              </span>
              <div className={s.actions}>
                <button
                  className={s.button}
                  disabled={loading || data.page <= 1}
                  onClick={() => apply({ ...draft, page: data.page - 1 })}
                >
                  <ChevronLeft size={16} />
                  {t("Önceki", "Previous")}
                </button>
                <button
                  className={s.button}
                  disabled={loading || data.page >= data.totalPages}
                  onClick={() => apply({ ...draft, page: data.page + 1 })}
                >
                  {t("Sonraki", "Next")}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
