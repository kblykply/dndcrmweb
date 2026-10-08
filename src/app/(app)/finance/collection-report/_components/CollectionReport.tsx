"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, RefreshCw, Info } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { useTrackingAccess } from "../../payment-tracking/_components/TrackingShell";
import SourceFreshness from "../../payment-tracking/_components/SourceFreshness";
import { useSourceRefresh } from "../../payment-tracking/_lib/useSourceRefresh";
import { paymentListCacheTicket, invalidatePaymentListCache } from "../../payment-tracking/_lib/list-cache";
import { requireSourceAudit } from "../../payment-tracking/_lib/source-integrity";
import { ALL_CURRENCIES, currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { paymentKindLabel } from "../../payment-tracking/_lib/payment-kinds";
import { paymentProjectGroupLabel } from "../../payment-tracking/_lib/project-groups";
import { currencyName, dateLabel, money, problem, trackingHref } from "../../payment-tracking/_lib/utils";
import type { CollectionFilters, CollectionReportData } from "../_lib/types";
import { hasInvoiceOkContract, invoiceOkLabel, invoiceOkText, invoiceOkDetails } from "../../payment-tracking/_lib/invoice-ok";
import { hasReportContract, readReportFilters, reportCurrencyToken, reportDefaults, reportFilterError, reportQuery, usableReportSource } from "../_lib/report";
import { periodOutstanding } from "../_lib/charts";
import { agingLabel } from "../_lib/risk";
import CollectionInsights from "./CollectionInsights";
import CollectionFiltersPanel from "./CollectionFiltersPanel";
import CollectionOverview from "./CollectionOverview";
import { collectionCsv } from "../_lib/export";
import s from "../collection-report.module.css";

function ChartsLoading() {
  const { locale } = useLanguage();
  return <p className={s.empty} role="status">{locale === "tr" ? "Grafikler yükleniyor…" : "Loading charts…"}</p>;
}
const CollectionCharts = dynamic(() => import("./CollectionCharts"), { ssr: false, loading: ChartsLoading });
const CollectionBreakdowns = dynamic(() => import("./CollectionBreakdowns"), { ssr: false, loading: ChartsLoading });

const CollectionRisk = dynamic(() => import("./CollectionRisk"), { ssr: false, loading: ChartsLoading });

const monthFormatters = ["en-GB", "tr-TR"].map((locale) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }));
function monthLabel(month: string, tr: boolean) {
  return monthFormatters[tr ? 1 : 0].format(new Date(`${month}-01T12:00:00Z`));
}
const authorizationLabels: Record<string, [string, string]> = {
  all: ["Tüm yetki kodları", "All authorization codes"],
  blank: ["Yetki kodu boş", "Blank authorization code"],
  coded: ["Kodu bulunan", "Has a code"],
  mixed: ["Kodlu ve boş kayıt birlikte", "Code and blank records"],
  unmatched: ["Kaynakta eşleşmeyen", "Unmatched in source"],
  multiple: ["Birden fazla kodu bulunan", "Multiple codes"],
};

export default function CollectionReport() {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const t = (a: string, b: string) => tr ? a : b;
  const language = useRef(tr);
  useEffect(() => { language.current = tr; }, [tr]);
  const access = useTrackingAccess();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [draft, setDraft] = useState<CollectionFilters>(reportDefaults);
  const applied = useRef<CollectionFilters>(reportDefaults);
  const confirmed = useRef<CollectionFilters | null>(null);
  const [data, setData] = useState<CollectionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backgroundError, setBackgroundError] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("GBP");
  const [detailOpen, setDetailOpen] = useState(false);
  const [, tick] = useState(0);
  const detailRef = useRef<HTMLElement>(null);
  const scrollToDetail = useRef(false);
  const request = useRef({ id: 0, busy: false, controller: null as AbortController | null });

  useEffect(() => {
    const restore = () => {
      ++request.current.id;
      request.current.controller?.abort();
      const next = readReportFilters(new URLSearchParams(window.location.search));
      applied.current = next;
      setDraft(next);
      setReady(true);
      setLoading(true);
      setVersion((value) => value + 1);
    };
    const frame = requestAnimationFrame(restore);
    window.addEventListener("popstate", restore);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("popstate", restore); };
  }, []);

  const load = useCallback(async (scope: CollectionFilters, refresh = false, background = false, signal?: AbortSignal) => {
    const state = request.current;
    if (signal?.aborted || (background && state.busy)) return;
    const id = ++state.id;
    state.busy = true;
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;
    const session = paymentListCacheTicket();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (!background) { setLoading(true); setError(""); }
    try {
      const validation = reportFilterError(scope, language.current);
      if (validation) throw new Error(validation);
      const params = reportQuery(scope);
      if (refresh) params.set("refresh", "true");
      const next = await authedFetch(`/payment-collection-report?${params}`, { signal: controller.signal }) as CollectionReportData;
      if (id !== state.id || controller.signal.aborted) return;
      requireSourceAudit(next.source, language.current);
      const currentSession = paymentListCacheTicket();
      if (session.identity !== currentSession.identity || !currentSession.session) {
        confirmed.current = null;
        setData(null);
        throw new Error(language.current ? "Oturum değişti. Raporu yeniden yükleyin." : "Your session changed. Reload the report.");
      }
      if (!hasInvoiceOkContract(next, next.detail?.rows, scope.invoiceOk)) throw new Error(JSON.stringify({
        code: "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID",
        message: language.current ? "Fatura OK kapsamı doğrulanamadı. Raporu yeniden yükleyin." : "The Invoice OK scope could not be verified. Reload the report.",
      }));
      if (!hasReportContract(next, scope)) throw new Error(language.current
        ? "Raporun kapsamı veya kaynak güncelliği doğrulanamadı. Yeniden yükleyin."
        : "The report scope or source freshness could not be verified. Reload the report.");
      const normalized: CollectionFilters = {
        ...scope, currency: reportCurrencyToken(next), startMonth: next.startMonth,
        detailMonth: next.detail.month, detailScope: next.detail.scope, agingBucket: next.detail.agingBucket, page: next.detail.page, pageSize: next.detail.pageSize as CollectionFilters["pageSize"],
      };
      applied.current = normalized;
      confirmed.current = normalized;
      setDraft((current) => ({
        ...current,
        currency: current.currency === scope.currency ? normalized.currency : current.currency,
        startMonth: current.startMonth === scope.startMonth ? normalized.startMonth : current.startMonth,
        detailMonth: current.detailMonth === scope.detailMonth ? normalized.detailMonth : current.detailMonth,
        page: normalized.page,
      }));
      setData(next);
      setBackgroundError(false);
      window.history.replaceState(null, "", `/finance/collection-report?${reportQuery(normalized)}`);
      if (scrollToDetail.current && !background) {
        scrollToDetail.current = false;
        setDetailOpen(true);
        requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
      }
    } catch (cause) {
      if (id !== state.id || controller.signal.aborted) return;
      const parsed = problem(cause, language.current);
      if (parsed.discardSource || /401|403|Unauthorized|Forbidden/.test(cause instanceof Error ? cause.message : String(cause))) {
        invalidatePaymentListCache();
        confirmed.current = null;
        setData(null);
        setBackgroundError(false);
        setError(parsed.message);
      } else if (background) setBackgroundError(true);
      else setError(parsed.message);
    } finally {
      signal?.removeEventListener("abort", abort);
      if (id === state.id) { state.busy = false; if (!background && !controller.signal.aborted) setLoading(false); }
    }
  }, []);
  useEffect(() => {
    if (!ready || access !== "allowed") return;
    const state = request.current;
    const frame = requestAnimationFrame(() => void load(applied.current));
    return () => { cancelAnimationFrame(frame); ++state.id; state.controller?.abort(); };
  }, [ready, access, version, load]);
  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => tick((value) => value + 1), 15_000);
    return () => window.clearInterval(timer);
  }, [data]);
  const poll = useCallback((signal: AbortSignal) => load(applied.current, false, true, signal), [load]);
  const expired = !!data && !usableReportSource(data.source);
  useSourceRefresh({ freshness: data?.source.freshness, enabled: ready && access === "allowed" && !!data && !loading && !error && !expired,
    scopeKey: `${version}:${refreshVersion}`, onPoll: poll });
  function refresh() { setRefreshVersion((value) => value + 1); void load(applied.current, true); }
  function apply(next: CollectionFilters, draftPatch?: Partial<CollectionFilters>) {
    setDraft((current) => draftPatch ? { ...current, ...draftPatch } : next);
    const validation = reportFilterError(next, tr);
    if (validation) { setError(validation); return; }
    ++request.current.id;
    request.current.controller?.abort();
    applied.current = next;
    setLoading(true);
    setVersion((value) => value + 1);
    window.history.pushState(null, "", `/finance/collection-report?${reportQuery(next)}`);
  }
  function displayScope() {
    const scope = confirmed.current || applied.current;
    return { ...scope, currency: scope.currency === ALL_CURRENCIES ? activeCurrency : scope.currency };
  }
  function selectMonth(month: string, rowCurrency?: string) {
    scrollToDetail.current = true;
    const scope = displayScope();
    const patch = { currency: rowCurrency || scope.currency, detailScope: "month" as const, agingBucket: "" as const, detailMonth: month, page: 1 };
    apply({ ...scope, ...patch }, patch);
  }
  function selectDetail(detailScope: CollectionFilters["detailScope"]) {
    scrollToDetail.current = true;
    const scope = displayScope();
    const patch = { currency: scope.currency, detailScope, agingBucket: "" as const, page: 1 };
    apply({ ...scope, ...patch }, patch);
  }
  function changePage(page: number, pageSize?: CollectionFilters["pageSize"]) {
    const patch = { page, ...(pageSize ? { pageSize } : {}) };
    apply({ ...(confirmed.current || applied.current), ...patch }, patch);
  }
  function showFilteredDetails(detail: Pick<CollectionFilters, "detailScope" | "agingBucket" | "detailMonth">) {
    const scope = confirmed.current || applied.current;
    const patch = { ...detail, agingBucket: detail.detailScope === "overdue" ? detail.agingBucket : "" as const, page: 1 };
    const next = { ...scope, ...patch };
    const validation = reportFilterError(next, tr);
    if (validation) { setError(validation); return; }
    scrollToDetail.current = true;
    apply(next, patch);
  }
  const shown = expired ? null : data;
  const currencyTitle = shown?.currencyMode === "all" ? t("Tüm dövizler", "All currencies") : currencyName(shown?.selectedCurrency, tr);
  const confirmedScope = shown ? [paymentKindLabel(shown.selectedPaymentKind, tr), currencyTitle,
    shown.selectedProjectGroup ? paymentProjectGroupLabel(shown.selectedProjectGroup, tr) : "",
    shown.selectedRepresentative,
    shown.selectedRepresentativeState === "multiple" ? t("Birden fazla temsilci", "Multiple representatives") :
      shown.selectedRepresentativeState === "unassigned" ? t("Temsilcisi belirtilmemiş", "Unassigned representative") : "",
    authorizationLabels[shown.selectedAuthorizationState]?.[tr ? 0 : 1],
    shown.selectedInvoiceOk !== "all" ? `${t("Fatura OK", "Invoice OK")}: ${invoiceOkLabel(shown.selectedInvoiceOk, tr)}` : "",
  ].filter(Boolean).join(" · ") : "";
  const incomplete = shown?.byCurrency.some((part) => part.summary.incompleteRows > 0);
  const pendingScope = !!shown && (loading || !!error);
  const title = t("Tahsilat Raporu", "Collection Report");
  const activeCurrency = shown?.byCurrency.some((part) => currencyToken(part.currency) === displayCurrency)
    ? displayCurrency : shown?.byCurrency.length ? currencyToken(shown.byCurrency[0].currency) : "";
  const activePart = shown?.byCurrency.find((part) => currencyToken(part.currency) === activeCurrency);
  const detailLabel = shown?.detail.scope === "overdue"
    ? shown.detail.agingBucket ? `${agingLabel(shown.detail.agingBucket, tr)} ${t("geciken dosyalar", "overdue cases")}` : t("Gecikmiş dosyalar", "Overdue cases")
    : shown?.detail.scope === "period" ? t("Dönemin dosyaları", "Period cases")
      : shown?.detail.scope === "undated" ? t("Vadesi belirtilmemiş dosyalar", "Undated cases") : t("Ayın dosyaları", "Monthly cases");
  function exportReport() {
    if (!shown || pendingScope || !usableReportSource(shown.source) || backgroundError || shown.source.freshness?.status !== "fresh") return;
    const blob = new Blob([collectionCsv(shown, tr)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url;
    link.download = `tahsilat-${shown.source.asOf}-${shown.startMonth}.csv`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const periodLabel = shown ? `${monthLabel(shown.startMonth, tr)} – ${monthLabel(shown.periods.at(-1)!, tr)}` : "";
  function historyTable() {
    if (!shown) return null;
    const periods = shown.historicalPeriods
      .map((period, index) => ({ period, index }));
    periods.reverse();
    return <div className={`${s.tableWrap} ${s.monthTable}`}>
      <table><thead><tr><th>{t("Ay", "Month")}</th><th>{t("Döviz", "Currency")}</th><th>{t("Planlanan", "Scheduled")}</th><th>{t("Ödenen / kapatılan", "Paid / settled")}</th><th>{t("Tamamlanma", "Completion")}</th><th>{t("Kalan borç", "Outstanding")}</th></tr></thead>
        <tbody>{periods.flatMap(({ period, index }) => shown.byCurrency.map((part) => {
          const row = part.historical[index];
          return <tr key={`${period}:${currencyToken(part.currency)}`} data-selected={shown.detail.scope === "month" && period === shown.detail.month ? "true" : undefined}>
            <td><button className={s.monthLink} aria-label={`${t("Dosyaları göster", "View cases")}: ${monthLabel(period, tr)}`} onClick={() => selectMonth(period, currencyToken(part.currency))} disabled={loading}>{monthLabel(period, tr)}</button></td>
            <td>{currencyName(part.currency, tr)}</td>
            <td>{money(row.incompleteRows === 0 && part.currency !== null ? row.scheduled : null, tr)}</td>
            <td>{money(row.incompleteRows === 0 && part.currency !== null ? row.paidToDate : null, tr)}</td>
            <td>{row.completionPercent === null ? "—" : new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", { style: "percent", maximumFractionDigits: 1 }).format(row.completionPercent / 100)}</td>
            <td>{money(part.currency === null ? null : periodOutstanding([row]), tr)}</td>
          </tr>;
        }))}</tbody>
      </table>
    </div>;
  }
  if (access !== "allowed") return <main className={s.page}>
    <h1>{title}</h1>
    <p role="status">{access === "checking" ? t("Yetki kontrol ediliyor…", "Checking access…") : access === "login"
      ? t("Devam etmek için giriş yapın.", "Sign in to continue.")
      : t("Bu rapor yönetici ve muhasebe hesaplarına açıktır.", "This report is available to administrators and accounting accounts.")}</p>
    {access !== "checking" && <Link className={s.button} href={access === "login" ? "/" : "/finance"}>{t("Geri dön", "Go back")}</Link>}
  </main>;

  return <main className={s.page}>
    <header className={s.header}>
      <div><h1>{title}</h1><p className={s.subtitle}>{t("Vadeye göre kalan alacaklar", "Outstanding receivables by due date")}{shown && <> · {tr ? `${dateLabel(shown.source.asOf, tr)} itibarıyla` : `As of ${dateLabel(shown.source.asOf, tr)}`}</>}</p></div>
      <div className={s.headerTools}>
        <div className={s.actions}>
          <Link className={s.button} href="/finance/payment-tracking"><ArrowLeft size={15} />{t("Ödeme Takip", "Payment Tracking")}</Link>
          <button type="button" className={s.button} onClick={exportReport} disabled={!shown || pendingScope || backgroundError || shown?.source.freshness?.status !== "fresh"}><Download size={15} />{t("Excel / CSV", "Excel / CSV")}</button>
          <button type="button" className={s.button} onClick={refresh} disabled={loading} aria-label={t("Yenile", "Refresh")}><RefreshCw size={15} className={loading ? s.spin : ""} /></button>
        </div>
        {shown && <p className={s.updated}><span data-fresh={!backgroundError && shown.source.freshness?.status === "fresh"} />{t("Güncellendi", "Updated")}: <time dateTime={shown.source.generatedAt}>{dateLabel(shown.source.generatedAt, tr, true)}</time></p>}
      </div>
    </header>
    {shown?.source.importedAt && <p className={s.updated} role="status">{t("Tek seferlik Logo aktarımı", "One-time Logo import")}: {dateLabel(shown.source.importedAt, tr, true)}. {t("Logo değişiklikleri otomatik alınmaz.", "Logo changes are not synced automatically.")}</p>}
    <CollectionFiltersPanel draft={draft} applied={confirmed.current || applied.current} data={shown} loading={loading} tr={tr} onDraft={setDraft} onApply={apply} onShowDetails={showFilteredDetails} displayCurrency={activeCurrency} onDisplayCurrency={setDisplayCurrency} />
    {error && <div className={s.error} role="alert"><span>{error}</span><div className={s.actions}>
      {reportFilterError(draft, tr) && <button className={s.button} onClick={() => apply({ ...reportDefaults })} disabled={loading}>{t("Filtreleri sıfırla", "Reset filters")}</button>}
      <button className={s.button} onClick={refresh} disabled={loading}>{t("Yeniden dene", "Retry")}</button></div></div>}
    {expired && <div className={s.error} role="alert">{t("Kaynak verisi artık güncel değil. Tutarları görmek için raporu yenileyin.", "The source data is no longer current. Refresh the report to view amounts.")}</div>}
    {loading && !shown && <div className={s.loading} role="status"><p>{t("Tahsilat raporu yükleniyor…", "Loading collection report…")}</p><div className={s.skeletonCards}>{[1, 2, 3].map((key) => <span key={key} />)}</div><div className={s.skeletonChart} /></div>}
    {shown && <>
      <p className={s.srOnly} aria-label={t("Rapor kapsamı", "Report scope")}>{confirmedScope}</p>
      {(backgroundError || shown.source.freshness?.status !== "fresh") && <SourceFreshness source={shown.source} tr={tr} failed={backgroundError} />}
      {pendingScope && <p className={s.warning} role="status">{t("Son başarılı rapor gösteriliyor; kapsam ve tutarlar aşağıdaki veriye aittir.", "Showing the last successful report; its scope and amounts remain unchanged below.")}</p>}
      {incomplete && <p className={s.warning} role="status">{t("Bazı kaynak satırları eksik. — ile gösterilen tutarlar hesaplanamıyor; toplamları kesin kabul etmeyin.", "Some source rows are incomplete. Amounts marked — cannot be calculated; totals may be incomplete.")}</p>}
      {shown.source.authorizationSource.status === "unavailable" && <p className={s.warning} role="status">{t("Yetki kodu kaynağı okunamıyor; kod eşleşmeleri doğrulanamadı.", "The authorization source is unavailable; code mappings could not be verified.")}</p>}
      <CollectionOverview report={shown} currency={activeCurrency} tr={tr} loading={loading} onSelectMonth={selectMonth} onSelectOverdue={() => selectDetail("overdue")} />
      <div className={s.reportContext}>
        <p className={s.basisNote}>{t("Tutarlar vade planına dayanır; gerçekleşmiş nakit tahsilatı göstermez.", "Amounts follow the due-date plan; they are not actual cash receipts.")}</p>
        <details className={s.reportHelp} data-testid="collection-report-help"><summary><Info size={14} aria-hidden="true" />{t("Rapor nasıl okunur?", "How to read this report")}</summary><div>
          <dl>
            <div><dt>{t("Gelecek ay", "Next month")}</dt><dd>{t("Gelecek takvim ayında vadesi gelen kayıtların kalan alacağıdır. Rapor dönemi seçimi bu kartı değiştirmez.", "Outstanding amounts due next calendar month. The report period does not change this card.")}</dd></div>
            <div><dt>{t("Gecikmiş alacak", "Overdue receivables")}</dt><dd>{t("Rapor tarihinden önce vadesi gelen ve kapanmamış tutarlardır; seçili dönemden bağımsız tüm geçmişi kapsar.", "Unsettled amounts due before the report date, including all past due dates regardless of the selected period.")}</dd></div>
            <div><dt>{t("Ay sonuna kadar", "Through month end")}</dt><dd>{t("Bugünden bu ayın sonuna kadar vadesi gelecek kalan tutarlar. Bu ay içinde gecikmiş olanlar, gecikmiş alacağa dahildir.", "Remaining amounts due from today through month end. Earlier unpaid dues this month belong to overdue receivables.")}</dd></div>
            <div><dt>{t("Ödenen / kapanan", "Paid / settled")}</dt><dd>{t("İlgili vadeye işlenmiş ödeme ve kapamalardır. Mahsup içerebilir; o ay şirkete giren nakdi göstermez. Kapanma oranı planlanan tutara göre hesaplanır.", "Payments and settlements allocated to the due amount, potentially including offsets. This is not cash received that month. Settlement rates use scheduled amounts as their base.")}</dd></div>
            <div><dt>{t("Dönem ve para birimi", "Period and currency")}</dt><dd>{t("Aylık grafik ve dönem toplamı üstte seçilen döneme aittir. Kartlar ve grafik toplamları birbirine eklenmez; farklı para birimleri de toplanmaz.", "The monthly chart and period total follow the selected report period. Do not add cards to chart totals or combine different currencies.")}</dd></div>
            <div><dt>{t("Veri kaynağı", "Data source")}</dt><dd>{t("Logo ödeme planı, asıl vade tarihleriyle gösterilir. — işareti eksik veya doğrulanamayan tutardır; sıfır değildir.", "The Logo payment schedule uses original due dates. — means an incomplete or unverified amount, not zero.")}</dd></div>
          </dl>
        </div></details>
      </div>
      <div className={s.analysisGrid}>
      <CollectionCharts report={shown} currency={activeCurrency} selectedMonth={shown.detail.scope === "month" ? shown.detail.month : undefined} tr={tr} loading={loading} onSelectMonth={selectMonth} />
      <CollectionRisk report={shown} currency={activeCurrency} tr={tr} loading={loading} onSelectOverdue={() => selectDetail("overdue")} />
      </div>
      <CollectionBreakdowns report={shown} currency={activeCurrency} tr={tr} />
      {!!activePart?.undated.installmentCount && <div className={s.undatedNotice}><span>{t("Vadesi olmayan kayıtlar aylık plana dahil edilmez.", "Undated records are excluded from the monthly plan.")} <strong>{activePart.undated.caseCount} {t("dosya", "cases")}</strong></span><button className={s.button} disabled={loading} onClick={() => selectDetail("undated")}>{t("Kayıtları incele", "Review cases")}</button></div>}
      <CollectionInsights report={shown} tr={tr} />
      <section aria-label={t("Geçmiş aylar", "Past months")}>
        <details className={s.disclosure} data-report-history><summary>{t("Geçmiş aylar", "Past months")}<span>{shown.historicalPeriods.length} {t("ay", "months")}</span></summary>
          <div className={s.disclosureBody}>
            <p className={s.muted}>{t("Önceki vade aylarının bugünkü ödeme/kapama durumu. Ay içinde gerçekleşen nakit tahsilatı değildir; tamamen kapanan aylar da dahildir.", "Current payment and settlement status of earlier due months, including fully settled months. These are not cash receipts within those months.")}</p>
            {shown.historicalPeriods.length ? historyTable() : <p className={s.empty}>{t("Seçili filtrelerde geçmiş aylara ait vade bulunamadı.", "No past-month dues match the selected filters.")}</p>}
          </div>
        </details>
      </section>
      <section ref={detailRef} className={s.detailSection} aria-label={detailLabel}>
        <details className={s.disclosure} data-report-cases open={detailOpen} onToggle={(event) => setDetailOpen(event.currentTarget.open)}>
        <summary>{detailLabel}<span>{shown.detail.scope === "month" ? `${monthLabel(shown.detail.month, tr)} · ` : ""}{shown.detail.total} {t("dosya", "cases")} · {currencyTitle}</span></summary>
        <div className={s.disclosureBody}>
        <p className={s.muted}>{shown.detail.scope === "period" ? periodLabel : shown.detail.scope === "month" ? monthLabel(shown.detail.month, tr) : shown.source.asOf} · {t("Yalnız seçili kapsamdaki vadeler. Tüm ödeme dökümü için dosyayı açın.", "Dues within the selected scope. Open a case for its full payment history.")}</p>
        <div className={s.tableWrap}><table aria-label={detailLabel}><thead><tr><th>{t("Müşteri / daire", "Customer / unit")}</th><th>{t("Proje / temsilci", "Project / representative")}</th><th>{t("Döviz", "Currency")}</th><th>{t("Fatura OK", "Invoice OK")}</th><th>{t("Vade", "Due date")}</th><th>{t("Kalan tutar", "Outstanding")}</th></tr></thead>
          <tbody>{shown.detail.rows.map((row) => <tr key={row.key}><td><Link className={s.caseLink} href={trackingHref(row.key)}>{row.customerName}</Link><small>{row.unitName}</small></td><td>{paymentProjectGroupLabel(row.projectGroup, tr)}<small>{row.representatives.join(" · ") || t("Temsilci belirtilmemiş", "Unassigned")}</small></td><td>{currencyName(row.currency, tr)}</td><td title={invoiceOkDetails(row.invoiceOk, tr)}>{invoiceOkText(row.invoiceOk, tr)}{invoiceOkText(row.invoiceOk, tr) !== invoiceOkDetails(row.invoiceOk, tr) && <small>{invoiceOkDetails(row.invoiceOk, tr)}</small>}</td><td>{dateLabel(row.earliestDueDate, tr)}{row.lastDueDate !== row.earliestDueDate && <small>{dateLabel(row.lastDueDate, tr)}</small>}</td><td>{money(row.currency === null ? null : periodOutstanding([row.totals]), tr)}</td></tr>)}</tbody>
        </table></div>
        {!shown.detail.rows.length && <p className={s.empty}>{t("Bu kapsamda eşleşen dosya yok.", "No matching cases in this scope.")}</p>}
        <div className={s.pagination}>
          <label className={s.field}><span>{t("Sayfa başına", "Rows per page")}</span><select aria-label={t("Sayfa başına", "Rows per page")} value={shown.detail.pageSize} disabled={loading} onChange={(event) => changePage(1, Number(event.target.value) as CollectionFilters["pageSize"])}>{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <div className={s.actions}><span>{shown.detail.page} / {shown.detail.totalPages}</span><button className={s.button} aria-label={t("Önceki sayfa", "Previous page")} disabled={loading || shown.detail.page <= 1} onClick={() => changePage(shown.detail.page - 1)}><ChevronLeft size={16} /></button><button className={s.button} aria-label={t("Sonraki sayfa", "Next page")} disabled={loading || shown.detail.page >= shown.detail.totalPages} onClick={() => changePage(shown.detail.page + 1)}><ChevronRight size={16} /></button></div>
        </div>
        </div>
        </details>
      </section>
    </>}
  </main>;
}
