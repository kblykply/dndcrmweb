"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import type { PaymentTrackingList } from "../_lib/types";
import type { AppliedFilterChip } from "../_lib/filter-form";
import {
  defaults,
  scopes,
  sorts,
  rangeDefinitions,
  filterErrors,
  clearFilter,
  hasMoneyOrDaysFilter,
  hasAmountFilter,
  changeFilterCurrency,
  changeFilterAuthorizationCode,
  changeFilterAuthorizationState,
  type Filters,
  type TextFilterKey,
} from "../_lib/list-filters";
import { currencyName, dateLabel } from "../_lib/utils";
import { invoiceOkLabel } from "../_lib/invoice-ok";
import { ALL_CURRENCIES, currencyToken } from "../_lib/list-currencies";
import { paymentKinds, paymentKindLabel } from "../_lib/payment-kinds";
import {
  paymentProjectGroups,
  paymentProjectGroupLabel,
} from "../_lib/project-groups";
import {
  ActiveFilterChips,
  AdvancedFilterPanel,
  FilterGroup,
  FilterRangeFields,
} from "./AdvancedFilters";
import s from "../payment-tracking.module.css";
import compact from "../payment-list-filters.module.css";

export default function PaymentListFilters({
  data,
  filters,
  draft,
  tr,
  loading,
  onDraft,
  onApply,
  scopeLabel,
  sortLabel,
  salesMode = false,
}: {
  data: PaymentTrackingList | null;
  filters: Filters;
  draft: Filters;
  tr: boolean;
  loading: boolean;
  onDraft: (draft: Filters) => void;
  onApply: (filters: Filters) => void;
  scopeLabel: (value: string) => string;
  sortLabel: (value: string) => string;
  salesMode?: boolean;
}) {
  const t = (a: string, b: string) => (tr ? a : b);
  const [amountsCleared, setAmountsCleared] = useState(false);
  const errors = filterErrors(draft, tr);
  const errorKeys = Object.keys(errors).sort().join("|");
  const [expanded, setExpanded] = useState(() => !!errorKeys);
  const controlsId = useId();
  useEffect(() => {
    if (!errorKeys) return;
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(frame);
  }, [errorKeys]);
  const blankAuthorizationLabel = t(
    "Yetki Kodu boş — Gerçek müşteriler",
    "Blank authorization code — Real customers",
  );
  const labels: Partial<Record<TextFilterKey, string>> = {
    q: t("Arama", "Search"),
    project: t("Logo kayıt kodu", "Logo record code"),
    projectGroup: t("Proje", "Project"),
    scope: t("Takip durumu", "Follow-up status"),
    invoiceOk: t("Fatura OK", "Invoice OK"),
    authorizationCode: t("Yetki Kodu", "Authorization code"),
    authorizationState: t("Yetki kodu eşleşmesi", "Authorization mapping"),
    representative: t("Satış temsilcisi", "Sales representative"),
    broker: t("Broker", "Broker"),
    customer: t("Müşteri kodu", "Customer code"),
    unit: t("Daire kodu", "Unit code"),
    assignee: t("Sorumlu", "Assignee"),
    priority: t("Öncelik", "Priority"),
    paymentState: t("Ödeme durumu", "Payment status"),
    trackingRecord: t("Yerel takip kaydı", "Local tracking record"),
    dataQuality: t("Kaynak verisi", "Source data"),
    deferral: t("Yerel takip tarihi kaydı", "Local follow-up date record"),
  };
  const options: Partial<
    Record<TextFilterKey, Array<{ value: string; label: string }>>
  > = {
    scope: scopes.map((value) => ({ value, label: scopeLabel(value) })),
    projectGroup: paymentProjectGroups.map((value) => {
      const item = data?.projectGroups?.find((entry) => entry.value === value);
      return {
        value,
        label: paymentProjectGroupLabel(value, tr),
        ...(item ? { caseCount: item.caseCount } : {}),
      };
    }),
    project: (data?.projects || []).map((item) => ({
      value: item.code,
      label: item.name || item.code,
    })),
    invoiceOk: [
      { value: "all", label: t("Tümü", "All") },
      ...(data?.invoiceOkOptions || []).map((option) => ({
        ...option,
        label: invoiceOkLabel(option.value, tr),
      })),
    ],
    authorizationCode: data?.filterOptions?.authorizationCodes || [],
    representative: data?.filterOptions?.representatives || [],
    broker: data?.filterOptions?.brokers || [],
    customer: data?.filterOptions?.customers || [],
    unit: data?.filterOptions?.units || [],
    assignee: [
      { value: "all", label: t("Tüm sorumlular", "All owners") },
      { value: "me", label: t("Bana atananlar", "Assigned to me") },
      { value: "unassigned", label: t("Atanmamış", "Unassigned") },
      ...(data?.assignees || []).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    ],
    priority: [
      { value: "all", label: t("Tüm öncelikler", "All priorities") },
      { value: "high", label: t("Yüksek", "High") },
    ],
    authorizationState: [
      { value: "all", label: t("Tüm eşleşmeler", "All mappings") },
      { value: "coded", label: t("Kodu bulunan", "Has a code") },
      { value: "blank", label: blankAuthorizationLabel },
      {
        value: "mixed",
        label: t("Kodlu ve boş kayıt birlikte", "Code and blank records"),
      },
      {
        value: "unmatched",
        label: t("Kaynakta eşleşmeyen", "Unmatched in source"),
      },
      {
        value: "multiple",
        label: t("Birden fazla kodu bulunan", "Multiple codes"),
      },
    ],
    paymentState: [
      { value: "all", label: t("Tüm ödeme durumları", "All payment statuses") },
      { value: "unpaid", label: t("Ödenmemiş", "Unpaid") },
      { value: "partial", label: t("Kısmen ödenmiş", "Partially paid") },
      { value: "paid", label: t("Ödenmiş", "Paid") },
      { value: "unknown", label: t("Belirsiz", "Unknown") },
    ],
    trackingRecord: [
      { value: "all", label: t("Tümü", "All") },
      { value: "exists", label: t("Yerel kaydı var", "Has a local record") },
      { value: "none", label: t("Yerel kaydı yok", "No local record") },
    ],
    deferral: [
      { value: "all", label: t("Tümü", "All") },
      {
        value: "exists",
        label: t("Yerel tarih kaydı var", "Has a local date"),
      },
      { value: "none", label: t("Yerel tarih kaydı yok", "No local date") },
    ],
    dataQuality: [
      { value: "all", label: t("Tümü", "All") },
      { value: "complete", label: t("Eksiksiz", "Complete") },
      {
        value: "incomplete",
        label: t("Eksik bilgi içeriyor", "Contains incomplete data"),
      },
    ],
  };
  const unavailable =
    data?.source.authorizationSource?.status === "unavailable";
  function select(key: TextFilterKey, allLabel?: string) {
    if (
      salesMode &&
      [
        "invoiceOk",
        "authorizationState",
        "authorizationCode",
        "representative",
        "assignee",
      ].includes(key)
    )
      return null;
    const choices = options[key] || [];
    const value = draft[key];
    return (
      <label className={s.field} key={key}>
        <span>{labels[key]}</span>
        <select
          aria-label={labels[key]}
          value={value}
          disabled={
            (key === "projectGroup" || key === "representative") && loading
          }
          onChange={(event) => {
            if (key === "projectGroup") {
              onApply({
                ...draft,
                projectGroup: event.target.value,
                project: "",
                page: 1,
              });
              return;
            }
            if (key === "representative") {
              onApply({
                ...draft,
                representative: event.target.value,
                page: 1,
              });
              return;
            }
            onDraft(
              key === "authorizationState"
                ? changeFilterAuthorizationState(draft, event.target.value)
                : { ...draft, [key]: event.target.value },
            );
          }}
        >
          {allLabel && <option value="">{allLabel}</option>}
          {value && !choices.some((item) => item.value === value) && (
            <option value={value}>
              {key === "invoiceOk" ? invoiceOkLabel(value, tr) : value}
            </option>
          )}
          {choices.map((item) => (
            <option
              key={item.value}
              value={item.value}
              disabled={
                unavailable &&
                (key === "authorizationState"
                  ? item.value !== "all"
                  : key === "representative" || key === "broker")
              }
            >
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function authorizationSelect() {
    if (salesMode) return null;
    const choices = options.authorizationCode || [];
    const value =
      draft.authorizationState === "blank"
        ? "blank"
        : draft.authorizationCode
          ? `code:${draft.authorizationCode}`
          : "";
    return (
      <label className={s.field}>
        <span>{labels.authorizationCode}</span>
        <select
          aria-label={labels.authorizationCode}
          value={value}
          onChange={(event) =>
            onDraft(changeFilterAuthorizationCode(draft, event.target.value))
          }
        >
          <option value="">
            {t("Tüm yetki kodları", "All authorization codes")}
          </option>
          <option value="blank" disabled={unavailable}>
            {blankAuthorizationLabel}
          </option>
          {draft.authorizationCode &&
            !choices.some((item) => item.value === draft.authorizationCode) && (
              <option
                value={`code:${draft.authorizationCode}`}
                disabled={unavailable}
              >
                {draft.authorizationCode}
              </option>
            )}
          {choices.map((item) => (
            <option
              key={item.value}
              value={`code:${item.value}`}
              disabled={unavailable}
            >
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const chips: AppliedFilterChip[] = [];
  for (const [rawKey, label] of Object.entries(labels)) {
    const key = rawKey as TextFilterKey;
    if (
      salesMode &&
      ["invoiceOk", "authorizationCode", "authorizationState"].includes(key)
    )
      continue;
    if (
      filters[key] !==
        (key === "authorizationState" || key === "invoiceOk"
          ? "all"
          : defaults[key]) &&
      filters[key] !== ""
    ) {
      chips.push({
        key,
        label:
          key === "authorizationState" && filters.authorizationState === "blank"
            ? t("Yetki Kodu", "Authorization code")
            : label,
        value:
          options[key]?.find((item) => item.value === filters[key])?.label ||
          (key === "invoiceOk"
            ? invoiceOkLabel(filters[key], tr)
            : filters[key]),
      });
    }
  }
  for (const range of rangeDefinitions) {
    if (!filters[range.from] && !filters[range.to]) continue;
    const value = (raw: string) =>
      raw ? (range.kind === "date" ? dateLabel(raw, tr) : raw) : "…";
    chips.push({
      key: range.key,
      label: range.label[tr ? 0 : 1],
      value: `${value(filters[range.from])} – ${value(filters[range.to])}`,
    });
  }
  const quickKeys = [
    "projectGroup",
    "representative",
    "q",
    "scope",
    "authorizationCode",
    "invoiceOk",
  ];
  const advancedCount = chips.filter(
    (chip) =>
      !quickKeys.includes(chip.key) &&
      !(
        chip.key === "authorizationState" &&
        filters.authorizationState === "blank"
      ),
  ).length;
  const reset = () =>
    onApply({
      ...defaults,
      invoiceOk: "all",
      authorizationState: "all",
      currency: draft.currency,
    });
  const appliedCurrency =
    filters.currency ||
    (data?.currencyMode === "all"
      ? ALL_CURRENCIES
      : data
        ? currencyToken(data.selectedCurrency)
        : "");
  const scopeParts = [
    paymentKindLabel(filters.paymentKind, tr),
    appliedCurrency === ALL_CURRENCIES
      ? t("Tüm dövizler", "All currencies")
      : appliedCurrency
        ? currencyName(
            appliedCurrency === "__NULL__" ? null : appliedCurrency,
            tr,
          )
        : "",
    filters.projectGroup
      ? options.projectGroup?.find(
          (option) => option.value === filters.projectGroup,
        )?.label || filters.projectGroup
      : "",
    filters.authorizationState === "blank"
      ? t("Yetki kodu boş", "Blank authorization code")
      : filters.authorizationCode
        ? `${t("Yetki", "Code")}: ${filters.authorizationCode}`
        : filters.authorizationState !== "all"
          ? options.authorizationState?.find(
              (option) => option.value === filters.authorizationState,
            )?.label
          : "",
    filters.invoiceOk !== "all"
      ? `${t("Fatura OK", "Invoice OK")}: ${invoiceOkLabel(filters.invoiceOk, tr)}`
      : "",
    filters.representative
      ? options.representative?.find(
          (option) => option.value === filters.representative,
        )?.label || filters.representative
      : "",
    filters.scope !== defaults.scope ? scopeLabel(filters.scope) : "",
  ].filter(Boolean);
  const extraFilterCount = chips.filter(
    (chip) =>
      (chip.key === "authorizationState" && !!filters.authorizationCode) ||
      ![
        "q",
        "projectGroup",
        "authorizationCode",
        "authorizationState",
        "representative",
        "scope",
        "invoiceOk",
      ].includes(chip.key),
  ).length;
  return (
    <section
      className={`${s.panel} ${compact.panel}`}
      aria-label={t("Dosya filtreleri", "Case filters")}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (errorKeys) {
            setExpanded(true);
            return;
          }
          onApply({ ...draft, page: 1 });
        }}
      >
        <div className={compact.toolbar}>
          <label className={`${s.field} ${compact.search}`}>
            <span className={compact.srOnly}>
              {t("Müşteri / daire ara", "Search customer / unit")}
            </span>
            <input
              aria-label={t("Müşteri / daire ara", "Search customer / unit")}
              value={draft.q}
              maxLength={200}
              onChange={(event) => onDraft({ ...draft, q: event.target.value })}
              placeholder={t(
                "İsim, cari kodu veya daire…",
                "Name, customer code or unit…",
              )}
            />
          </label>
          <label className={s.field}>
            <span className={compact.srOnly}>
              {t("Takip durumu", "Follow-up status")}
            </span>
            <select
              aria-label={t("Liste durumu", "List status")}
              value={draft.scope}
              disabled={loading}
              onChange={(event) =>
                onApply({ ...draft, scope: event.target.value, page: 1 })
              }
            >
              {scopes.map((value) => (
                <option key={value} value={value}>
                  {scopeLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={s.primary} disabled={loading}>
            <Search size={15} aria-hidden="true" />
            {t("Ara", "Search")}
          </button>
          <button
            type="button"
            className={`${s.button} ${compact.toggle}`}
            aria-expanded={expanded}
            aria-controls={controlsId}
            onClick={() => setExpanded((value) => !value)}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t("Filtreler", "Filters")}
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={compact.chevron}
            />
          </button>
        </div>
        {!expanded && (
          <div
            className={compact.scope}
            aria-label={t("Uygulanan kapsam", "Applied scope")}
          >
            <span>{scopeParts.join(" · ")}</span>
            {extraFilterCount > 0 && (
              <span className={compact.badge}>
                +{extraFilterCount} {t("filtre", "filters")}
              </span>
            )}
          </div>
        )}
        {!expanded && errorKeys && (
          <p className={s.notice} role="alert">
            {t(
              "Bazı filtreler geçersiz. Düzeltmek için Filtreler'i açın.",
              "Some filters are invalid. Open Filters to correct them.",
            )}
          </p>
        )}
        <div id={controlsId} className={compact.controls} hidden={!expanded}>
          <div
            className={s.kindChoices}
            role="group"
            aria-label={t("Ödeme türü", "Payment type")}
          >
            {paymentKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                className={s.kindButton}
                aria-pressed={filters.paymentKind === kind}
                disabled={loading}
                onClick={() =>
                  onApply({ ...draft, paymentKind: kind, project: "", page: 1 })
                }
              >
                {paymentKindLabel(kind, tr)}
              </button>
            ))}
          </div>
          <div className={s.filters}>
            {select("projectGroup", t("Tüm projeler", "All projects"))}
            {select(
              "representative",
              t("Tüm satış temsilcileri", "All sales representatives"),
            )}
            <label className={s.field}>
              <span>{t("Para birimi", "Currency")}</span>
              <select
                aria-label={t("Para birimi", "Currency")}
                value={draft.currency}
                disabled={loading}
                onChange={(event) => {
                  setAmountsCleared(hasAmountFilter(draft));
                  onApply(changeFilterCurrency(draft, event.target.value));
                }}
              >
                {!draft.currency && (
                  <option value="" disabled>
                    {t("Yükleniyor…", "Loading…")}
                  </option>
                )}
                <option value={ALL_CURRENCIES}>
                  {t("Tüm para birimleri", "All currencies")}
                </option>
                {(data?.currencies || []).map((entry) => (
                  <option
                    key={currencyToken(entry.value)}
                    value={currencyToken(entry.value)}
                  >
                    {currencyName(entry.value, tr)}
                  </option>
                ))}
                {draft.currency &&
                  draft.currency !== ALL_CURRENCIES &&
                  !data?.currencies.some(
                    (entry) => currencyToken(entry.value) === draft.currency,
                  ) && (
                    <option value={draft.currency}>
                      {currencyName(
                        draft.currency === "__NULL__" ? null : draft.currency,
                        tr,
                      )}
                    </option>
                  )}
              </select>
            </label>

            {authorizationSelect()}
            {!salesMode && select("invoiceOk")}
            {select("scope")}
          </div>
          <p className={s.hint}>
            {t(
              "Birden fazla Fatura OK değeri bulunan dosyalar Karma seçeneğinde gösterilir.",
              "Cases with more than one Invoice OK value appear under Mixed.",
            )}
          </p>
          {amountsCleared && (
            <p className={s.hint} role="status">
              {t(
                "Para birimi değiştiği için tutar aralıkları temizlendi. Gün, tarih ve diğer filtreler korundu.",
                "Amount ranges were cleared because the currency changed. Day, date and other filters were preserved.",
              )}
            </p>
          )}
          {draft.currency === ALL_CURRENCIES && hasAmountFilter(draft) && (
            <div className={s.notice}>
              <p>
                {t(
                  "Tutar aralıkları için tek bir para birimi seçin veya bu aralıkları temizleyin.",
                  "Choose one currency for amount ranges, or clear these ranges.",
                )}
              </p>
              <button
                type="button"
                className={s.button}
                onClick={() =>
                  onApply(changeFilterCurrency(draft, ALL_CURRENCIES))
                }
              >
                {t("Tutar aralıklarını temizle", "Clear amount ranges")}
              </button>
            </div>
          )}
          {errors.authorization && (
            <p className={s.notice} role="alert">
              {errors.authorization}
            </p>
          )}
          {unavailable && (
            <p className={s.notice} role="status">
              {t(
                "Yetki kodu kaynağı şu anda okunamıyor. Kod filtreleri kullanılamıyor; ödeme dosyaları kaynakta bulunan bilgileriyle gösterilir.",
                "The authorization-code source is unavailable. Code filters are disabled; payment cases retain the available source information.",
              )}
            </p>
          )}
          <AdvancedFilterPanel
            tr={tr}
            activeCount={advancedCount}
            defaultOpen={advancedCount > 0 || Object.keys(errors).length > 0}
          >
            <FilterGroup
              title={t(
                "Kaynak ve müşteri eşleşmesi",
                "Source and customer matching",
              )}
            >
              {select("project", t("Tüm kayıt kodları", "All record codes"))}
              {select("authorizationState")}
              {select("broker", t("Tüm brokerlar", "All brokers"))}
              {select("customer", t("Tüm müşteriler", "All customers"))}
              {select("unit", t("Tüm daireler", "All units"))}
              {select("paymentState")}
            </FilterGroup>
            <FilterGroup title={t("Vadeler ve tutarlar", "Dates and balances")}>
              {draft.currency === ALL_CURRENCIES && (
                <p className={s.hint}>
                  {t(
                    "Tutar aralığı için tek bir para birimi seçin.",
                    "Select one currency to use amount ranges.",
                  )}
                </p>
              )}
              {rangeDefinitions.map((range) => (
                <FilterRangeFields
                  key={range.key}
                  label={range.label[tr ? 0 : 1]}
                  kind={range.kind}
                  disabled={
                    draft.currency === ALL_CURRENCIES && range.kind === "amount"
                  }
                  tr={tr}
                  from={draft[range.from]}
                  to={draft[range.to]}
                  error={errors[range.key]}
                  onChange={(from, to) =>
                    onDraft({ ...draft, [range.from]: from, [range.to]: to })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup
              title={t(
                "Yerel takip ve veri kalitesi",
                "Local follow-up and data quality",
              )}
            >
              {select("assignee")}
              {select("priority")}
              {select("trackingRecord")}
              {select("deferral")}
              {select("dataQuality")}
            </FilterGroup>
          </AdvancedFilterPanel>
          {(hasMoneyOrDaysFilter(draft) || hasMoneyOrDaysFilter(filters)) && (
            <p className={s.hint}>
              {t(
                "Tutar veya gecikme günü aralığında eksik kaynak bilgisi olan dosyalar hariç tutulur.",
                "Amount and overdue-day ranges exclude cases with incomplete source information.",
              )}
            </p>
          )}
          <details className={compact.help}>
            <summary>{t("Filtre yardımı", "Filter help")}</summary>
            <div>
              <p>
                {t(
                  "Yetki kodu, temsilci ve fatura tarihi dosya bazında seçilir; vade ve tutarlar seçili ödeme türüne aittir.",
                  "Authorization code, representative and invoice date select whole cases; due dates and amounts cover the selected payment type.",
                )}
              </p>
              <p>
                {t(
                  "Yerel takip tarihi tüm müşteri/daire/döviz dosyasında ortaktır. Tarihi geçmiş olsa bile yerel tarih kaydı var kabul edilir.",
                  "The local follow-up date is shared by the whole customer/unit/currency case. A local date counts as present even if it is in the past.",
                )}
              </p>
              <p>
                {t(
                  "Ödeme durumu ve kaynak gecikmesi yerel ertelemeden bağımsızdır.",
                  "Payment status and source overdue amounts are independent of local deferral.",
                )}
              </p>
              {draft.currency === ALL_CURRENCIES && (
                <p>
                  {t(
                    "Tutarlar döviz bazında ayrı gösterilir. Tutarlar önce dövize göre gruplanır, sonra kendi dövizi içinde sıralanır. Gün ve tarih aralıkları tüm dövizlerde kullanılabilir.",
                    "Amounts are shown separately and grouped by currency, then sorted within each currency. Day and date ranges work across all currencies.",
                  )}
                </p>
              )}
            </div>
          </details>
          <div className={s.filterActions}>
            <div className={s.actions}>
              <button
                className={s.primary}
                disabled={loading || Object.keys(errors).length > 0}
              >
                <Search size={15} />
                {t("Uygula", "Apply")}
              </button>
              <button
                className={s.button}
                type="button"
                disabled={loading}
                onClick={reset}
              >
                {t("Temizle", "Clear")}
              </button>
            </div>
            <label className={s.field}>
              <span>{t("Sıralama", "Sort")}</span>
              <select
                aria-label={t("Sıralama", "Sort")}
                value={`${draft.sortBy}:${draft.sortDir}`}
                onChange={(event) => {
                  const [sortBy, sortDir] = event.target.value.split(":");
                  onApply({
                    ...draft,
                    sortBy,
                    sortDir: sortDir as "asc" | "desc",
                    page: 1,
                  });
                }}
              >
                {sorts.flatMap((key) =>
                  (["desc", "asc"] as const).map((direction) => (
                    <option
                      key={`${key}:${direction}`}
                      value={`${key}:${direction}`}
                    >
                      {sortLabel(key)} ·{" "}
                      {direction === "asc"
                        ? t("artan", "ascending")
                        : t("azalan", "descending")}
                    </option>
                  )),
                )}
              </select>
            </label>
          </div>
          <ActiveFilterChips
            chips={chips}
            tr={tr}
            disabled={loading}
            onRemove={(key) => onApply(clearFilter(draft, key))}
            onClear={reset}
          />
        </div>
      </form>
    </section>
  );
}
