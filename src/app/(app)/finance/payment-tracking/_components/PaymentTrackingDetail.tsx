"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock3,
  Flag,
  History,
  Mail,
  MessageCircle,
  NotebookPen,
  RefreshCw,
  RotateCcw,
  UserRound,
  Wallet,
} from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import type {
  PaymentTrackingAction,
  PaymentTrackingDetail as DetailData,
} from "../_lib/types";
import {
  authorizationLabel,
  currencyName,
  dateLabel,
  money,
  problem,
  statusLabel,
} from "../_lib/utils";
import {
  Access,
  ErrorMessage,
  Loading,
  useTrackingAccess,
} from "./TrackingShell";
import ComposeDialog from "./ComposeDialog";
import PaymentPortfolioSummary from "./PaymentPortfolioSummary";
import SourceFreshness from "./SourceFreshness";
import SourceReviewNotice from "./SourceReviewNotice";
import { requireSourceAudit } from "../_lib/source-integrity";
import { useSourceExpiry } from "../_lib/useSourceExpiry";
import { useSourceRefresh } from "../_lib/useSourceRefresh";
import { invalidatePaymentListCache } from "../_lib/list-cache";
import { query, readFilters } from "../_lib/list-filters";
import { paymentKinds, paymentKindLabel } from "../_lib/payment-kinds";
import { paymentProjectGroupLabel } from "../_lib/project-groups";
import s from "../payment-tracking.module.css";

function requirePortfolio(data: DetailData, tr: boolean) {
  if (
    typeof data.portfolio?.fullyPaid !== "boolean" ||
    !Array.isArray(data.portfolio?.cases) ||
    !data.portfolio.cases.some((item) => item.key === data.item.key) ||
    !Array.isArray(data.portfolio?.installments) ||
    data.portfolio.installments.some(
      (row) => typeof row.caseKey !== "string" || !("currency" in row),
    )
  ) {
    throw new Error(
      tr
        ? "Müşteri ve dairenin tüm ödemeleri doğrulanamadı. Dosyayı yeniden yükleyin."
        : "All payments for this customer and unit could not be verified. Reload the case.",
    );
  }
}

export default function PaymentTrackingDetail({
  caseKey,
}: {
  caseKey: string;
}) {
  const { locale } = useLanguage(),
    tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const access = useTrackingAccess();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [backgroundError, setBackgroundError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const language = useRef(tr);
  useEffect(() => {
    language.current = tr;
  }, [tr]);
  const [success, setSuccess] = useState(false);
  const [backQuery, setBackQuery] = useState("");
  const [conflict, setConflict] = useState(false);
  const [mode, setMode] = useState<"defer" | "reset">("defer");
  const [followDate, setFollowDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [contactChannel, setContactChannel] = useState<
    "phone" | "email" | "whatsapp"
  >("phone");
  const [assignee, setAssignee] = useState("");
  const [compose, setCompose] = useState<"email" | "whatsapp" | null>(null);
  const [installmentScope, setInstallmentScope] = useState("all");
  const [installmentKind, setInstallmentKind] = useState("all");
  const [installmentCurrency, setInstallmentCurrency] = useState("all");
  const [installmentSort, setInstallmentSort] = useState("date_asc");
  const initialized = useRef(false);
  const request = useRef({
    id: 0,
    busy: false,
    controller: null as AbortController | null,
  });
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const value = new URLSearchParams(window.location.search).get("returnTo");
      if (value) {
        setBackQuery(query(readFilters(new URLSearchParams(value))).toString());
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(
    () => () => {
      mutation.current?.abort();
    },
    [],
  );
  const load = useCallback(
    async (refresh = false, background = false, signal?: AbortSignal) => {
      const state = request.current;
      if (mutation.current || signal?.aborted || (background && state.busy))
        return;
      const id = ++state.id;
      state.busy = true;
      state.controller?.abort();
      const controller = new AbortController();
      state.controller = controller;
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (!background) {
        setLoading(true);
        setError("");
      }
      try {
        const next = (await authedFetch(
          `/payment-tracking/${encodeURIComponent(caseKey)}${refresh ? "?refresh=true" : ""}`,
          { signal: controller.signal },
        )) as DetailData;
        if (state.id !== id || controller.signal.aborted) return;
        requirePortfolio(next, language.current);
        requireSourceAudit(next.source, language.current);
        setData(next);
        setBackgroundError(false);
        if (!background) setConflict(false);
        if (!initialized.current) {
          initialized.current = true;
          setAssignee(next.item.tracking?.assigneeId || "");
        }
      } catch (cause) {
        if (state.id === id && !controller.signal.aborted) {
          const parsed = problem(cause, language.current);
          if (parsed.discardSource) {
            invalidatePaymentListCache();
            setData(null);
            setBackgroundError(false);
            setError(parsed.message);
          } else if (background) setBackgroundError(true);
          else setError(problem(cause, language.current).message);
        }
      } finally {
        signal?.removeEventListener("abort", abort);
        if (state.id === id) {
          state.busy = false;
          if (!background && !controller.signal.aborted) setLoading(false);
        }
      }
    },
    [caseKey],
  );
  useEffect(() => {
    if (access !== "allowed") return;
    const state = request.current;
    const frame = requestAnimationFrame(() => void load());
    return () => {
      cancelAnimationFrame(frame);
      ++state.id;
      state.controller?.abort();
    };
  }, [access, load]);
  const poll = useCallback(
    (signal: AbortSignal) => load(false, true, signal),
    [load],
  );
  useSourceRefresh({
    freshness: data?.source.freshness,
    enabled:
      access === "allowed" &&
      !!data &&
      !loading &&
      !saving &&
      !conflict &&
      !error,
    scopeKey: `${caseKey}:${refreshVersion}`,
    onPoll: poll,
  });
  function refreshSource() {
    setRefreshVersion((value) => value + 1);
    void load(true);
  }
  useSourceExpiry(data?.source, () => {
    invalidatePaymentListCache();
    setData(null);
    setError(
      language.current
        ? "Kaynak verisi güncelliğini kaybetti. Tutarları görmek için yenileyin."
        : "Source data has expired. Refresh to view amounts.",
    );
  });
  async function act(action: Omit<PaymentTrackingAction, "expectedVersion">) {
    if (
      !data ||
      mutation.current ||
      saving ||
      loading ||
      conflict ||
      !data.item.canTrack
    )
      return;
    ++request.current.id;
    request.current.controller?.abort();
    request.current.busy = false;
    const controller = new AbortController();
    mutation.current = controller;
    setSaving(action.type);
    setError("");
    setSuccess(false);
    try {
      const next = (await authedFetch(
        `/payment-tracking/${encodeURIComponent(caseKey)}/actions`,
        {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            ...action,
            expectedVersion: data.item.tracking?.version ?? 0,
          }),
        },
      )) as DetailData;
      invalidatePaymentListCache();
      if (controller.signal.aborted) return;
      requirePortfolio(next, tr);
      requireSourceAudit(next.source, tr);
      setData(next);
      setBackgroundError(false);
      if (action.type === "defer" || action.type === "reset") {
        setReason("");
        setFollowDate("");
      }
      if (action.type === "note") setNote("");
      if (action.type === "contact") setContactNote("");
      setSuccess(true);
    } catch (cause) {
      if (!controller.signal.aborted) {
        const issue = problem(cause, tr);
        if (issue.discardSource) {
          invalidatePaymentListCache();
          setData(null);
        }
        setError(issue.message);
        setConflict(issue.conflict);
      }
    } finally {
      if (!controller.signal.aborted) {
        mutation.current = null;
        setSaving("");
      }
    }
  }
  function changeDate() {
    if (!data) return;
    if (!reason.trim()) {
      setError(
        t(
          "Tarih değişikliğinin nedenini yazın.",
          "Enter a reason for the date change.",
        ),
      );
      return;
    }
    const minimum = [
      data.source.asOf.slice(0, 10),
      data.item.oldestDueDate?.slice(0, 10) || "",
    ]
      .sort()
      .at(-1)!;
    if (mode === "defer" && (!followDate || followDate <= minimum)) {
      setError(
        t(
          "Yeni takip tarihi bugünden ve asıl vadeden sonra olmalıdır.",
          "The new follow-up date must be after today and the original due date.",
        ),
      );
      return;
    }
    void act({
      type: mode,
      body: reason.trim(),
      ...(mode === "defer" ? { trackingDate: followDate } : {}),
    });
  }
  if (access !== "allowed")
    return (
      <div className={s.page}>
        <Access access={access} tr={tr} />
      </div>
    );
  if (!data)
    return (
      <div className={s.page}>
        <Link className={s.back} href="/finance/payment-tracking">
          <ArrowLeft size={15} />
          {t("Takip dosyaları", "Payment cases")}
        </Link>
        {error ? (
          <ErrorMessage
            message={error}
            tr={tr}
            retry={refreshSource}
            busy={loading}
          />
        ) : (
          <Loading tr={tr} />
        )}
      </div>
    );
  const item = data.item,
    tracking = item.tracking;
  const disabled = !!saving || loading || conflict || !item.canTrack;
  const currency = currencyName(item.identity.currency, tr);
  const sourceOverdue = item.overdueAmount != null && item.overdueAmount > 0;
  const installments = data.portfolio.installments
    .filter(
      (row) =>
        installmentCurrency === "all" ||
        (row.currency ?? "__NULL__") === installmentCurrency,
    )
    .filter(
      (row) => installmentKind === "all" || row.paymentKind === installmentKind,
    )
    .filter(
      (row) =>
        installmentScope === "all" ||
        (installmentScope === "open"
          ? (row.outstanding || 0) > 0
          : row.status === installmentScope),
    )
    .sort((a, b) => {
      if (installmentSort === "outstanding_desc")
        return (
          (a.currency ?? "\uffff").localeCompare(b.currency ?? "\uffff") ||
          (b.outstanding ?? -Infinity) - (a.outstanding ?? -Infinity) ||
          a.caseKey.localeCompare(b.caseKey) ||
          a.sequence - b.sequence
        );
      if (!a.dueDate || !b.dueDate)
        return !a.dueDate && !b.dueDate
          ? a.sequence - b.sequence
          : a.dueDate
            ? -1
            : 1;
      return (
        (installmentSort === "date_desc" ? -1 : 1) *
          a.dueDate.localeCompare(b.dueDate) || a.sequence - b.sequence
      );
    });
  const eventTitle = (type: string) =>
    ({
      defer: t("Takip ertelendi", "Follow-up deferred"),
      reset: t("Asıl vadeye dönüldü", "Original due date restored"),
      note: t("Not eklendi", "Note added"),
      assign: t("Sorumlu değişti", "Owner changed"),
      priority: t("Öncelik değişti", "Priority changed"),
      contact: t("Görüşme kaydı", "Contact recorded"),
    })[type] || type;
  return (
    <div
      className={`${s.page} ${s.simpleDetail}`}
      aria-busy={loading || !!saving}
    >
      <header className={s.header}>
        <div>
          <Link
            className={s.back}
            href={`/finance/payment-tracking${backQuery ? `?${backQuery}` : ""}`}
          >
            <ArrowLeft size={15} />
            {t("Takip dosyaları", "Payment cases")}
          </Link>

          <h1>
            {item.customerName ||
              item.identity.customerCode ||
              t("Müşteri", "Customer")}
          </h1>
          <div className={s.identity}>
            <span className={s.badge}>
              <Building2 size={13} />
              {item.unitName || item.identity.unitCode || "—"}
            </span>
            <span className={s.badge}>
              {t("Seçili takip", "Selected follow-up")} · {currency}
            </span>
            <span
              className={`${s.badge} ${item.trackingStatus === "deferred" ? s.badgeAmber : item.trackingStatus === "overdue" ? s.badgeDanger : ""}`}
            >
              {data.portfolio.fullyPaid
                ? t("Tamamen ödendi", "Fully paid")
                : item.trackingStatus === "paid"
                  ? t("Seçili bakiye ödendi", "Selected balance paid")
                  : statusLabel(item.trackingStatus, tr)}
            </span>
            <span className={s.badge}>
              {paymentProjectGroupLabel(item.projectGroup, tr)}
            </span>
          </div>
          <details className={s.inlineDetails}>
            <summary>{t("Müşteri bilgileri", "Customer information")}</summary>{" "}
            <p>
              {item.identity.customerCode} · {item.identity.unitCode}
            </p>
            <dl className={s.sourceTags}>
              <div>
                <dt>{t("Yetki Kodu", "Authorization code")}</dt>
                <dd>{authorizationLabel(item.authorization, tr)}</dd>
              </div>
              <div>
                <dt>{t("Temsilci", "Representative")}</dt>
                <dd>{item.representatives?.join(" · ") || "—"}</dd>
              </div>
              <div>
                <dt>{t("Broker", "Broker")}</dt>
                <dd>{item.brokers?.join(" · ") || "—"}</dd>
              </div>
            </dl>
            {data.source.importedAt && (
              <p className={s.hint}>
                {t("Veri güncellemesi", "Data updated")}:{" "}
                {dateLabel(data.source.importedAt, tr, true)}
              </p>
            )}
          </details>
        </div>
        <div className={s.actions}>
          <button
            className={s.button}
            disabled={loading || !!saving}
            onClick={refreshSource}
          >
            <RefreshCw size={15} className={loading ? s.spin : undefined} />
            {t("Yenile", "Refresh")}
          </button>
          <button
            className={s.button}
            disabled={loading || !!saving}
            onClick={() => setCompose("email")}
          >
            <Mail size={15} />
            {t("E-posta taslağı", "Email draft")}
          </button>
          <button
            className={`${s.primary} ${s.whatsappButton}`}
            disabled={loading || !!saving}
            onClick={() => setCompose("whatsapp")}
          >
            <MessageCircle size={17} />
            {t("WhatsApp ödeme hatırlatması", "WhatsApp payment reminder")}
          </button>
        </div>
      </header>
      {backgroundError || data.source.freshness?.status === "stale" ? (
        <SourceFreshness
          source={data.source}
          tr={tr}
          failed={backgroundError}
        />
      ) : null}
      <SourceReviewNotice cases={data.portfolio.cases} tr={tr} />
      {error && (
        <>
          <ErrorMessage message={error} tr={tr} />
          <p className={s.hint}>
            {t(
              "Son başarılı okumaya ait sonuçlar gösteriliyor.",
              "Showing the last successful results.",
            )}
          </p>
        </>
      )}
      {conflict && (
        <div className={s.notice}>
          <p>
            {t(
              "Yazdığınız metinler korunuyor. Güncel kaydı yükledikten sonra yeniden kaydedebilirsiniz.",
              "Your draft text is preserved. Reload the latest case before saving again.",
            )}
          </p>
          <button
            className={s.button}
            disabled={loading || !!saving}
            onClick={() => void load()}
          >
            <RefreshCw size={15} />
            {t("Güncel dosyayı yükle", "Reload latest case")}
          </button>
        </div>
      )}
      {success && (
        <div className={s.success} role="status">
          {t("Takip dosyası güncellendi.", "The payment case was updated.")}
        </div>
      )}
      {!item.canTrack && (
        <div className={s.notice}>
          {item.trackingIssue ||
            t(
              "Bu dosyada takip işlemleri şu anda kullanılamıyor.",
              "Follow-up actions are currently unavailable for this case.",
            )}
        </div>
      )}
      {item.incompleteRows > 0 && (
        <div className={s.notice}>
          {item.incompleteRows}{" "}
          {t(
            "kaynak satırında eksik bilgi bulunuyor; bilinmeyen tutarlar sıfır sayılmaz.",
            "source rows contain incomplete data; unknown amounts are not treated as zero.",
          )}
        </div>
      )}
      {data.portfolio.cases.length > 1 && (
        <details className={s.disclosure}>
          <summary>
            {t("Diğer dövizlerdeki ödemeler", "Payments in other currencies")}
          </summary>
          <PaymentPortfolioSummary
            data={data}
            backQuery={backQuery}
            busy={loading || !!saving}
            tr={tr}
          />
        </details>
      )}
      <div className={s.detailGrid}>
        <div className={s.stack}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <div>
                <h2>
                  <Wallet size={18} />
                  {t("Borç özeti", "Balance summary")}
                </h2>
                <p>{currency}</p>
              </div>
            </div>
            <dl className={s.facts}>
              <div>
                <dt>{t("Kalan borç", "Outstanding balance")}</dt>
                <dd className={s.big}>{money(item.outstanding, tr)}</dd>
              </div>
              <div>
                <dt>{t("Gecikmiş borç", "Overdue balance")}</dt>
                <dd className={`${s.big} ${sourceOverdue ? s.red : ""}`}>
                  {money(item.overdueAmount, tr)}
                </dd>
              </div>
              <div>
                <dt>{t("Toplam plan", "Scheduled amount")}</dt>
                <dd>{money(item.amount, tr)}</dd>
              </div>
              <div>
                <dt>{t("Ödenen / kapatılan", "Paid / settled")}</dt>
                <dd>{money(item.paid, tr)}</dd>
              </div>
              <div>
                <dt>{t("Takip tarihi", "Follow-up date")}</dt>
                <dd>{dateLabel(item.effectiveDueDate, tr)}</dd>
              </div>
              <div>
                <dt>{t("Kaynak gecikmesi", "Source overdue days")}</dt>
                <dd className={sourceOverdue ? s.red : undefined}>
                  {item.overdueDays} {t("gün", "days")} · {item.overdueCount}{" "}
                  {t("taksit", "installments")}
                </dd>
              </div>
            </dl>
            <details className={s.inlineDetails}>
              <summary>{t("Tutarlar hakkında", "About these amounts")}</summary>
              <p className={s.hint}>
                {t(
                  "Ödenen tutar iade ve mahsup içerebilir. Takip tarihini değiştirmek borcu veya ödeme vadesini değiştirmez.",
                  "Paid amounts can include returns and offsets. Changing follow-up dates does not change the debt or payment due date.",
                )}
              </p>
            </details>
          </section>
          <details className={s.disclosure}>
            <summary>{t("Ödeme planı", "Payment schedule")}</summary>{" "}
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div>
                  <h2>
                    <CalendarDays size={18} />
                    {t(
                      "Ödeme planı ve Logo vadeleri",
                      "Payment plan and Logo due dates",
                    )}
                  </h2>
                  <p>
                    {installments.length} / {data.portfolio.installments.length}{" "}
                    {t(
                      "kaynak satırı · tüm dövizler ve ödeme türleri",
                      "source rows · all currencies and payment types",
                    )}
                  </p>
                </div>
              </div>
              <details className={s.inlineDetails}>
                <summary>
                  {t("Ödeme listesini filtrele", "Filter payments")}
                </summary>{" "}
                <div className={s.actions} style={{ marginBottom: 14 }}>
                  <label className={s.field}>
                    <span>{t("Taksit dövizi", "Installment currency")}</span>
                    <select
                      aria-label={t("Taksit dövizi", "Installment currency")}
                      value={installmentCurrency}
                      onChange={(event) =>
                        setInstallmentCurrency(event.target.value)
                      }
                    >
                      <option value="all">
                        {t("Tüm dövizler", "All currencies")}
                      </option>
                      {data.portfolio.cases.map((entry) => (
                        <option
                          key={entry.key}
                          value={entry.identity.currency ?? "__NULL__"}
                        >
                          {currencyName(entry.identity.currency, tr)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.field}>
                    <span>{t("Taksit türü", "Installment type")}</span>
                    <select
                      aria-label={t("Taksit türü", "Installment type")}
                      value={installmentKind}
                      onChange={(event) =>
                        setInstallmentKind(event.target.value)
                      }
                    >
                      {paymentKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {paymentKindLabel(kind, tr)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.field}>
                    <span>{t("Taksit durumu", "Installment status")}</span>
                    <select
                      aria-label={t("Taksit durumu", "Installment status")}
                      value={installmentScope}
                      onChange={(event) =>
                        setInstallmentScope(event.target.value)
                      }
                    >
                      <option value="all">{t("Tümü", "All")}</option>
                      <option value="open">{t("Açık", "Open")}</option>
                      <option value="overdue">
                        {t("Gecikmiş", "Overdue")}
                      </option>
                      <option value="paid">{t("Ödenmiş", "Paid")}</option>
                    </select>
                  </label>
                  <label className={s.field}>
                    <span>{t("Taksit sıralaması", "Installment sort")}</span>
                    <select
                      aria-label={t("Taksit sıralaması", "Installment sort")}
                      value={installmentSort}
                      onChange={(event) =>
                        setInstallmentSort(event.target.value)
                      }
                    >
                      <option value="date_asc">
                        {t("En eski vade önce", "Oldest due date first")}
                      </option>
                      <option value="date_desc">
                        {t("En yeni vade önce", "Newest due date first")}
                      </option>
                      <option value="outstanding_desc">
                        {t(
                          "Döviz içinde en yüksek kalan önce",
                          "Highest outstanding within each currency",
                        )}
                      </option>
                    </select>
                  </label>
                </div>
              </details>{" "}
              <div className={s.tableWrap}>
                <table className={s.table} style={{ minWidth: 690 }}>
                  <thead>
                    <tr>
                      <th>{t("Asıl vade", "Original due")}</th>
                      <th>{t("Döviz", "Currency")}</th>
                      <th>{t("Ödeme türü", "Payment type")}</th>
                      <th className={s.numeric}>{t("Tutar", "Amount")}</th>
                      <th className={s.numeric}>
                        {t("Ödenen / kapatılan", "Paid / settled")}
                      </th>
                      <th className={s.numeric}>{t("Kalan", "Outstanding")}</th>
                      <th>{t("Durum", "Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((row) => (
                      <tr
                        key={`${row.caseKey}:${row.sequence}`}
                        className={
                          row.status === "overdue" ? s.overdueRow : undefined
                        }
                      >
                        <td>{dateLabel(row.dueDate, tr)}</td>
                        <td>{currencyName(row.currency, tr)}</td>
                        <td>{paymentKindLabel(row.paymentKind, tr)}</td>
                        <td className={s.numeric}>{money(row.amount, tr)}</td>
                        <td className={s.numeric}>{money(row.paid, tr)}</td>
                        <td className={s.numeric}>
                          {money(row.outstanding, tr)}
                        </td>
                        <td>
                          <span
                            className={`${s.badge} ${row.status === "overdue" ? s.badgeDanger : ""}`}
                          >
                            {statusLabel(row.status, tr)}
                            {row.overdueDays > 0
                              ? ` · ${row.overdueDays} ${t("gün", "days")}`
                              : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!installments.length && (
                  <div className={s.empty}>
                    {t(
                      "Bu döviz, tür ve durumda taksit bulunmuyor.",
                      "No installments match this currency, type and status.",
                    )}
                  </div>
                )}
              </div>
            </section>
          </details>
          <details className={s.disclosure}>
            <summary>{t("Geçmiş işlemler", "Previous actions")}</summary>{" "}
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div>
                  <h2>
                    <History size={18} />
                    {t("Dosya geçmişi", "Case history")}
                  </h2>
                  <p>
                    {t(
                      `${currency} dosyasının yerel takip işlemleri ve ekip notları.`,
                      `Local follow-up actions and team notes for the ${currency} case.`,
                    )}
                  </p>
                </div>
              </div>
              {data.history.length ? (
                <ol className={s.history}>
                  {data.history.map((event) => (
                    <li key={event.id}>
                      <strong>
                        {eventTitle(event.type)}
                        {event.channel
                          ? ` · ${event.channel === "phone" ? t("Telefon", "Phone") : event.channel === "email" ? t("E-posta", "Email") : "WhatsApp"}`
                          : ""}
                      </strong>
                      <p>{event.body}</p>
                      {(event.previousDate || event.nextDate) && (
                        <p className={s.hint}>
                          {dateLabel(event.previousDate, tr)} →{" "}
                          {dateLabel(event.nextDate, tr)}
                        </p>
                      )}
                      <small>
                        {event.actorName} ·{" "}
                        {dateLabel(event.createdAt, tr, true)}
                      </small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={s.hint}>
                  {t(
                    "Henüz takip işlemi kaydedilmemiş.",
                    "No follow-up actions have been recorded yet.",
                  )}
                </p>
              )}
              {data.historyHasMore && (
                <p className={s.hint}>
                  {t(
                    `En son ${data.history.length} kayıt gösteriliyor. Daha eski kayıtlar saklanır.`,
                    `Showing the latest ${data.history.length} entries. Earlier history is retained.`,
                  )}
                </p>
              )}
            </section>
          </details>
        </div>
        <aside
          className={s.stack}
          aria-label={t("Takip işlemleri", "Follow-up actions")}
        >
          <div className={s.actionCurrencyScope}>
            {currency} · {t("Takip işlemleri", "Follow-up actions")}
          </div>
          <details className={s.disclosure}>
            <summary>
              {t("Takip tarihini değiştir", "Change follow-up date")}
            </summary>{" "}
            <section className={s.panel}>
              <div className={s.panelHead}>
                <div>
                  <h2>
                    <CalendarClock size={18} />
                    {t("Yerel takip tarihi", "Local follow-up date")}
                  </h2>
                  <p>
                    {t(
                      "Bu döviz dosyasının takip tarihini değiştirir.",
                      "Changes the follow-up date for this currency case.",
                    )}
                  </p>
                </div>
              </div>
              <dl className={s.facts}>
                <div className={s.wide}>
                  <dt>
                    {tracking?.trackingDate
                      ? t("Ertelenen takip tarihi", "Deferred follow-up date")
                      : t("Geçerli takip tarihi", "Current follow-up date")}
                  </dt>
                  <dd className={tracking?.trackingDate ? s.amber : undefined}>
                    {dateLabel(item.effectiveDueDate, tr)}
                  </dd>
                </div>
              </dl>
              <div className={s.divider} />
              <form
                className={s.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  changeDate();
                }}
              >
                <label className={s.field}>
                  <span>{t("Tarih işlemi", "Date action")}</span>
                  <select
                    aria-label={t("Tarih işlemi", "Date action")}
                    value={mode}
                    disabled={disabled}
                    onChange={(event) =>
                      setMode(event.target.value as "defer" | "reset")
                    }
                  >
                    <option value="defer">
                      {t("Takibi ertele", "Defer follow-up")}
                    </option>
                    <option value="reset" disabled={!tracking?.trackingDate}>
                      {t("Ertelemeyi kaldır", "Remove deferral")}
                    </option>
                  </select>
                </label>
                {mode === "defer" && (
                  <label className={s.field}>
                    <span>{t("Yeni takip tarihi", "New follow-up date")}</span>
                    <input
                      type="date"
                      required
                      disabled={disabled}
                      aria-label={t("Yeni takip tarihi", "New follow-up date")}
                      value={followDate}
                      onChange={(event) => setFollowDate(event.target.value)}
                    />
                  </label>
                )}
                <label className={s.field}>
                  <span>{t("Gerekçe · zorunlu", "Reason · required")}</span>
                  <textarea
                    rows={3}
                    required
                    maxLength={2000}
                    aria-label={t("Gerekçe · zorunlu", "Reason · required")}
                    value={reason}
                    disabled={!!saving || loading}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t(
                      "Neden ertelendi veya asıl vadeye dönüldü?",
                      "Why defer or restore the original due date?",
                    )}
                  />
                </label>
                <p className={s.hint}>
                  {t(
                    "Bu işlem Logo kaynağındaki vadeyi, ödeme planını veya borcu değiştirmez.",
                    "This does not modify due dates, payment schedules or balances in the Logo source.",
                  )}
                </p>
                <button
                  className={s.primary}
                  disabled={
                    disabled ||
                    !reason.trim() ||
                    (mode === "defer" && !followDate) ||
                    (mode === "reset" && !tracking?.trackingDate)
                  }
                >
                  {mode === "defer" ? (
                    <Clock3 size={15} />
                  ) : (
                    <RotateCcw size={15} />
                  )}
                  {saving === mode
                    ? t("Kaydediliyor…", "Saving…")
                    : mode === "defer"
                      ? t("Takibi ertele", "Defer follow-up")
                      : t("Ertelemeyi kaldır", "Remove deferral")}
                </button>
              </form>
            </section>
          </details>
          <details className={s.disclosure}>
            <summary>{t("Sorumlu ve öncelik", "Owner and priority")}</summary>{" "}
            <section className={s.panel}>
              <div className={s.panelHead}>
                <h2>
                  <UserRound size={18} />
                  {t("Sorumlu ve öncelik", "Owner and priority")}
                </h2>
              </div>
              <form
                className={s.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  void act({
                    type: "assign",
                    assigneeId: assignee || null,
                    body: "",
                  });
                }}
              >
                <p className={s.hint}>
                  {t("Mevcut sorumlu", "Current owner")}:{" "}
                  <strong>
                    {tracking?.assigneeName || t("Atanmamış", "Unassigned")}
                  </strong>
                </p>
                <label className={s.field}>
                  <span>{t("Dosya sorumlusu", "Case owner")}</span>
                  <select
                    aria-label={t("Dosya sorumlusu", "Case owner")}
                    value={assignee}
                    disabled={disabled}
                    onChange={(event) => setAssignee(event.target.value)}
                  >
                    <option value="">{t("Atanmamış", "Unassigned")}</option>
                    {data.assignees.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={s.button}
                  disabled={
                    disabled || assignee === (tracking?.assigneeId || "")
                  }
                >
                  {t("Sorumluyu kaydet", "Save owner")}
                </button>
              </form>
              <div className={s.divider} />
              <button
                className={s.button}
                disabled={disabled}
                aria-pressed={tracking?.priority === "high"}
                onClick={() =>
                  void act({
                    type: "priority",
                    priority: tracking?.priority === "high" ? "normal" : "high",
                    body: "",
                  })
                }
              >
                <Flag size={15} />
                {tracking?.priority === "high"
                  ? t(
                      "Yüksek öncelik · normale dön",
                      "High priority · set normal",
                    )
                  : t(
                      "Yüksek öncelik olarak işaretle",
                      "Mark as high priority",
                    )}
              </button>
            </section>
          </details>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <h2>
                <NotebookPen size={18} />
                {t("Ekip notu", "Team note")}
              </h2>
            </div>
            <form
              className={s.form}
              onSubmit={(event) => {
                event.preventDefault();
                if (note.trim()) void act({ type: "note", body: note.trim() });
              }}
            >
              <label className={s.field}>
                <span>{t("Dosya notu", "Case note")}</span>
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  aria-label={t("Dosya notu", "Case note")}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={!!saving || loading}
                />
              </label>
              <button className={s.primary} disabled={disabled || !note.trim()}>
                {t("Not ekle", "Add note")}
              </button>
            </form>
          </section>
          <details className={s.disclosure}>
            <summary>{t("Görüşme kaydet", "Record a contact")}</summary>{" "}
            <section className={s.panel}>
              <div className={s.panelHead}>
                <h2>
                  <MessageCircle size={18} />
                  {t("Görüşme kaydı", "Contact record")}
                </h2>
              </div>
              <p className={s.hint}>
                {t(
                  "Gerçekleşen görüşmeyi kendi beyanınızla kaydedin. Taslak açmak otomatik görüşme kaydı oluşturmaz.",
                  "Record a contact that took place. Opening a draft does not automatically create a contact record.",
                )}
              </p>
              <form
                className={s.form}
                style={{ marginTop: 14 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (contactNote.trim())
                    void act({
                      type: "contact",
                      channel: contactChannel,
                      body: contactNote.trim(),
                    });
                }}
              >
                <label className={s.field}>
                  <span>{t("Görüşme kanalı", "Contact channel")}</span>
                  <select
                    aria-label={t("Görüşme kanalı", "Contact channel")}
                    value={contactChannel}
                    onChange={(event) =>
                      setContactChannel(
                        event.target.value as "phone" | "email" | "whatsapp",
                      )
                    }
                    disabled={disabled}
                  >
                    <option value="phone">{t("Telefon", "Phone")}</option>
                    <option value="email">{t("E-posta", "Email")}</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
                <label className={s.field}>
                  <span>{t("Görüşme özeti", "Contact summary")}</span>
                  <textarea
                    required
                    maxLength={2000}
                    rows={3}
                    aria-label={t("Görüşme özeti", "Contact summary")}
                    value={contactNote}
                    onChange={(event) => setContactNote(event.target.value)}
                    disabled={!!saving || loading}
                  />
                </label>
                <button
                  className={s.button}
                  disabled={disabled || !contactNote.trim()}
                >
                  {t("Görüşmeyi kaydet", "Record contact")}
                </button>
              </form>
            </section>
          </details>
        </aside>
      </div>

      {compose && (
        <ComposeDialog
          channel={compose}
          data={data}
          tr={tr}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  );
}
