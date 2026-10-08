"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, ListFilter, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { ALL_CURRENCIES, UNKNOWN_CURRENCY, currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { invoiceOkLabel } from "../../payment-tracking/_lib/invoice-ok";
import { paymentKinds, paymentKindLabel } from "../../payment-tracking/_lib/payment-kinds";
import { paymentProjectGroups, paymentProjectGroupLabel } from "../../payment-tracking/_lib/project-groups";
import { currencyName } from "../../payment-tracking/_lib/utils";
import { authorizationStates, reportDefaults } from "../_lib/report";
import { collectionPeriodPreset, collectionPresetPeriod, collectionScopeChanged, prepareCollectionFilters, type CollectionPeriodPreset } from "../_lib/filters";
import { agingKeys, agingLabel } from "../_lib/risk";
import type { CollectionFilters, CollectionReportData } from "../_lib/types";
import s from "../filters.module.css";

type DetailSelection = Pick<CollectionFilters, "detailScope" | "agingBucket" | "detailMonth">;
interface Props {
  draft: CollectionFilters;
  applied: CollectionFilters;
  data: CollectionReportData | null;
  loading: boolean;
  tr: boolean;
  onDraft: (next: CollectionFilters) => void;
  onApply: (next: CollectionFilters) => void;
  onShowDetails?: (selection: DetailSelection) => void;
  displayCurrency?: string;
  onDisplayCurrency?: (currency: string) => void;
}

const authorizationLabels: Record<string, [string, string]> = {
  all: ["Tüm yetki kodları", "All authorization codes"],
  blank: ["Yetki kodu boş", "Blank authorization code"],
  coded: ["Kodu bulunan", "Has a code"],
  mixed: ["Kodlu ve boş kayıt birlikte", "Code and blank records"],
  unmatched: ["Kaynakta eşleşmeyen", "Unmatched in source"],
  multiple: ["Birden fazla kodu bulunan", "Multiple codes"],
};
const presetLabels: Record<CollectionPeriodPreset, [string, string]> = {
  next6: ["Gelecek 6 ay", "Next 6 months"],
  next12: ["Gelecek 12 ay", "Next 12 months"],
  next24: ["Gelecek 24 ay", "Next 24 months"],
  past12: ["Geçmiş 12 ay", "Past 12 months"],
  custom: ["Özel dönem", "Custom period"],
};
const detailScopeLabels: Record<CollectionFilters["detailScope"], [string, string]> = {
  month: ["Seçili ay", "Selected month"],
  period: ["Rapor dönemi", "Report period"],
  overdue: ["Gecikmiş ödemeler", "Overdue payments"],
  undated: ["Vadesi belirtilmemiş", "No due date"],
};
function compactMonth(value: string, tr: boolean) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}-01T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Local list choices never apply any unsubmitted report filters. */
function CaseFilters({ initial, loading, pending, tr, onShowDetails }: {
  initial: DetailSelection;
  loading: boolean;
  pending: boolean;
  tr: boolean;
  onShowDetails: (selection: DetailSelection) => void;
}) {
  const [selection, setSelection] = useState(initial);
  const t = (turkish: string, english: string) => tr ? turkish : english;
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(selection.detailMonth) && selection.detailMonth >= "1753-01" && selection.detailMonth <= "9998-12";
  return <form className={s.caseBody} data-testid="collection-case-filters" noValidate onSubmit={(event) => {
    event.preventDefault();
    if (!loading && (selection.detailScope !== "month" || validMonth)) onShowDetails({ ...selection, agingBucket: selection.detailScope === "overdue" ? selection.agingBucket : "" });
  }}>
    <p className={s.caseHint}>{t("İncelemek istediğiniz vadeleri seçin. Bu seçim yalnızca dosya listesini değiştirir.", "Choose which dues to review. This selection changes only the case list.")}</p>
    <div className={s.caseControls}>
      <label className={s.field}><span>{t("Dosya kapsamı", "Case scope")}</span><select aria-label={t("Dosya kapsamı", "Case scope")} value={selection.detailScope} onChange={(event) => setSelection({ ...selection, detailScope: event.target.value as CollectionFilters["detailScope"], agingBucket: "" })}>
        {(Object.keys(detailScopeLabels) as CollectionFilters["detailScope"][]).map((scope) => <option value={scope} key={scope}>{detailScopeLabels[scope][tr ? 0 : 1]}</option>)}
      </select></label>
      {selection.detailScope === "month" && <label className={s.field}><span>{t("Vade ayı", "Due month")}</span><input aria-label={t("Vade ayı", "Due month")} type="month" min="1753-01" max="9998-12" value={selection.detailMonth} onChange={(event) => setSelection({ ...selection, detailMonth: event.target.value })} /></label>}
      {selection.detailScope === "overdue" && <label className={s.field}><span>{t("Gecikme süresi", "Overdue age")}</span><select aria-label={t("Gecikme süresi", "Overdue age")} value={selection.agingBucket} onChange={(event) => setSelection({ ...selection, agingBucket: event.target.value as CollectionFilters["agingBucket"] })}>
        <option value="">{t("Tüm gecikmeler", "All overdue payments")}</option>{agingKeys.map((key) => <option key={key} value={key}>{agingLabel(key, tr)}</option>)}
      </select></label>}
      <button className={s.showCases} type="submit" disabled={loading || (selection.detailScope === "month" && !validMonth)}><ListFilter size={15} aria-hidden="true" />{t("Dosyaları göster", "Show cases")}</button>
    </div>
    {pending && <p className={s.casePending}>{t("Yeni rapor filtrelerini kullanmak için önce Uygula’ya basın.", "Select Apply first to use your new report filters.")}</p>}
  </form>;
}

export default function CollectionFiltersPanel({ draft, applied, data, loading, tr, onDraft, onApply, onShowDetails, displayCurrency, onDisplayCurrency }: Props) {
  const t = (turkish: string, english: string) => tr ? turkish : english;
  const [expanded, setExpanded] = useState(false);
  const [caseExpanded, setCaseExpanded] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const advancedId = useId();
  const pendingId = useId();
  const caseId = useId();
  const pending = collectionScopeChanged(draft, applied);
  const preset = customMode ? "custom" : collectionPeriodPreset(draft, data?.source.asOf);
  const advancedCount = Number(!!applied.representativeState) + Number(applied.paymentKind !== "all") + Number(applied.invoiceOk !== "all") + Number(applied.authorizationState !== "all");
  const patch = (value: Partial<CollectionFilters>) => onDraft({ ...draft, ...value });
  const apply = (next: CollectionFilters) => onApply(prepareCollectionFilters(next, applied));
  const remove = (value: Partial<CollectionFilters>) => apply({ ...applied, ...value });
  const choosePreset = (value: CollectionPeriodPreset) => {
    setCustomMode(value === "custom");
    if (value === "custom") { setExpanded(true); return; }
    const period = collectionPresetPeriod(value, data?.source.asOf);
    if (period) patch(period);
  };
  const appliedPreset = collectionPeriodPreset(applied, data?.source.asOf);
  const periodLabel = appliedPreset === "custom"
    ? `${compactMonth(applied.startMonth, tr)} · ${applied.months} ${t("ay", "months")}`
    : presetLabels[appliedPreset][tr ? 0 : 1];
  const chips: Array<{ key: string; label: string; clear?: Partial<CollectionFilters> }> = [
    { key: "period", label: periodLabel },
    { key: "currency", label: applied.currency === ALL_CURRENCIES ? t("Tüm para birimleri", "All currencies") : applied.currency ? currencyName(applied.currency === UNKNOWN_CURRENCY ? null : applied.currency, tr) : t("Para birimi yükleniyor", "Loading currency"), clear: applied.currency && applied.currency !== ALL_CURRENCIES ? { currency: ALL_CURRENCIES } : undefined },
    ...(applied.projectGroup ? [{ key: "project", label: paymentProjectGroupLabel(applied.projectGroup, tr), clear: { projectGroup: "" as const } }] : []),
    ...(applied.paymentKind !== "all" ? [{ key: "kind", label: paymentKindLabel(applied.paymentKind, tr), clear: { paymentKind: "all" as const } }] : []),
    ...(applied.representative ? [{ key: "representative", label: applied.representative, clear: { representative: "" } }] : []),
    ...(applied.representativeState ? [{ key: "representativeState", label: applied.representativeState === "multiple" ? t("Birden fazla temsilci", "Multiple representatives") : t("Temsilcisi belirtilmemiş", "Unassigned representative"), clear: { representativeState: "" as const } }] : []),
    ...(applied.invoiceOk !== "all" ? [{ key: "invoiceOk", label: `${t("Fatura OK", "Invoice OK")}: ${invoiceOkLabel(applied.invoiceOk, tr)}`, clear: { invoiceOk: "all" } }] : []),
    ...(applied.authorizationState !== "all" ? [{ key: "authorization", label: authorizationLabels[applied.authorizationState]?.[tr ? 0 : 1] || applied.authorizationState, clear: { authorizationState: "all" } }] : []),
  ];
  const initialDetail: DetailSelection = { detailScope: applied.detailScope, agingBucket: applied.agingBucket, detailMonth: applied.detailMonth || data?.nextMonth || "" };
  const detailKey = `${initialDetail.detailScope}:${initialDetail.agingBucket}:${initialDetail.detailMonth}`;
  const selectedDetailLabel = detailScopeLabels[applied.detailScope][tr ? 0 : 1];

  return <section className={s.panel} aria-label={t("Rapor filtreleri", "Report filters")} data-testid="collection-filter-panel"><form noValidate onSubmit={(event) => { event.preventDefault(); setCustomMode(false); apply(draft); }}>
    <div className={s.primary}>
      <label className={s.field}><span>{t("Para birimi", "Currency")}</span><select aria-label={t("Para birimi", "Currency")} value={draft.currency} onChange={(event) => patch({ currency: event.target.value })}>
        {!draft.currency && <option value="" disabled>{t("Yükleniyor…", "Loading…")}</option>}
        <option value={ALL_CURRENCIES}>{t("Tüm para birimleri", "All currencies")}</option>
        {(data?.currencies || []).map((item) => <option key={currencyToken(item.value)} value={currencyToken(item.value)}>{currencyName(item.value, tr)}</option>)}
        {draft.currency && draft.currency !== ALL_CURRENCIES && !data?.currencies.some((item) => currencyToken(item.value) === draft.currency) && <option value={draft.currency}>{currencyName(draft.currency === UNKNOWN_CURRENCY ? null : draft.currency, tr)}</option>}
      </select></label>
      <label className={s.field}><span>{t("Proje", "Project")}</span><select aria-label={t("Proje", "Project")} value={draft.projectGroup} onChange={(event) => patch({ projectGroup: event.target.value as CollectionFilters["projectGroup"] })}>
        <option value="">{t("Tüm projeler", "All projects")}</option>
        {paymentProjectGroups.map((group) => <option key={group} value={group}>{paymentProjectGroupLabel(group, tr)}</option>)}
      </select></label>
      <label className={s.field}><span>{t("Satış temsilcisi", "Sales representative")}</span><select aria-label={t("Satış temsilcisi", "Sales representative")} value={draft.representative} onChange={(event) => patch({ representative: event.target.value, representativeState: "" })}>
        <option value="">{draft.representativeState === "multiple" ? t("Birden fazla temsilci", "Multiple representatives") : draft.representativeState === "unassigned" ? t("Temsilcisi belirtilmemiş", "Unassigned representative") : t("Tüm temsilciler", "All representatives")}</option>
        {draft.representative && !data?.representatives.some((item) => item.value === draft.representative) && <option value={draft.representative}>{draft.representative}</option>}
        {(data?.representatives || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
      <label className={s.field}><span>{t("Rapor dönemi", "Report period")}</span><select aria-label={t("Rapor dönemi", "Report period")} value={preset} onChange={(event) => choosePreset(event.target.value as CollectionPeriodPreset)}>
        {(Object.keys(presetLabels) as CollectionPeriodPreset[]).map((value) => <option key={value} value={value} disabled={value !== "custom" && !collectionPresetPeriod(value, data?.source.asOf)}>{presetLabels[value][tr ? 0 : 1]}</option>)}
      </select></label>
      <button className={s.apply} type="submit" disabled={loading} aria-describedby={pending ? pendingId : undefined}><Check size={15} aria-hidden="true" />{t("Uygula", "Apply")}</button>
    </div>

    <div className={s.actionBar}>
      <div className={s.actions}>
        <button type="button" className={s.advancedButton} aria-expanded={expanded} aria-controls={advancedId} onClick={() => setExpanded((value) => !value)}><SlidersHorizontal size={14} aria-hidden="true" />{t("Diğer filtreler", "More filters")}<span className={s.count}>{advancedCount}</span><ChevronDown size={14} className={expanded ? s.rotate : ""} aria-hidden="true" /></button>
        {onShowDetails && <button type="button" className={s.caseToggle} aria-expanded={caseExpanded} aria-controls={caseId} title={`${selectedDetailLabel}${applied.detailScope === "overdue" && applied.agingBucket ? ` · ${agingLabel(applied.agingBucket, tr)}` : ""}`} onClick={() => setCaseExpanded((value) => !value)}><ListFilter size={14} aria-hidden="true" />{t("Dosya listesi", "Case list")}<ChevronDown size={14} className={caseExpanded ? s.rotate : ""} aria-hidden="true" /></button>}
      </div>
      <button type="button" className={s.reset} disabled={loading} onClick={() => { setCustomMode(false); apply({ ...reportDefaults }); }} title={t("DND, normal satış ve yetki kodu boş filtrelerine dön", "Restore DND, normal sale and blank authorization filters")}><RotateCcw size={13} aria-hidden="true" />{t("Sıfırla", "Reset")}</button>
    </div>

    <div id={advancedId} className={s.advanced} hidden={!expanded}>
      <label className={s.field}><span>{t("Ödeme türü", "Payment type")}</span><select aria-label={t("Ödeme türü", "Payment type")} value={draft.paymentKind} onChange={(event) => patch({ paymentKind: event.target.value as CollectionFilters["paymentKind"] })}>
        {paymentKinds.map((kind) => <option key={kind} value={kind}>{paymentKindLabel(kind, tr)}</option>)}
      </select></label>
      <label className={s.field}><span>{t("Fatura OK", "Invoice OK")}</span><select aria-label={t("Fatura OK", "Invoice OK")} value={draft.invoiceOk} onChange={(event) => patch({ invoiceOk: event.target.value })}>
        <option value="all">{t("Tümü", "All")}</option>
        {draft.invoiceOk !== "all" && !data?.invoiceOkOptions.some((option) => option.value === draft.invoiceOk) && <option value={draft.invoiceOk}>{invoiceOkLabel(draft.invoiceOk, tr)}</option>}
        {(data?.invoiceOkOptions || []).map((option) => <option key={option.value} value={option.value}>{invoiceOkLabel(option.value, tr)}</option>)}
      </select></label>
      <label className={s.field}><span>{t("Yetki kodu", "Authorization code")}</span><select aria-label={t("Yetki kodu", "Authorization code")} value={draft.authorizationState} onChange={(event) => patch({ authorizationState: event.target.value })}>
        {authorizationStates.map((state) => <option key={state} value={state}>{authorizationLabels[state][tr ? 0 : 1]}</option>)}
      </select></label>
      <label className={s.field}><span>{t("Temsilci durumu", "Representative status")}</span><select aria-label={t("Temsilci durumu", "Representative status")} value={draft.representativeState} onChange={(event) => patch({ representative: "", representativeState: event.target.value as CollectionFilters["representativeState"] })}>
        <option value="">{t("Tümü", "All")}</option><option value="unassigned">{t("Temsilcisi belirtilmemiş", "Unassigned representative")}</option><option value="multiple">{t("Birden fazla temsilci", "Multiple representatives")}</option>
      </select></label>
      <div className={s.customPeriod}>
        <label className={s.field}><span>{t("Dönem başlangıcı", "Period start")}</span><input aria-label={t("Dönem başlangıcı", "Period start")} type="month" min="1753-01" max="9998-12" value={draft.startMonth} onChange={(event) => { setCustomMode(true); patch({ startMonth: event.target.value }); }} /></label>
        <label className={s.field}><span>{t("Dönem uzunluğu", "Period length")}</span><select aria-label={t("Dönem uzunluğu", "Period length")} value={draft.months} onChange={(event) => { setCustomMode(true); patch({ months: Number(event.target.value) as CollectionFilters["months"] }); }}>
          {[6, 12, 24].map((months) => <option key={months} value={months}>{months} {t("ay", "months")}</option>)}
        </select></label>
        <p className={s.hint}>{t("Dönem seçimi aylık planı belirler. Gecikmiş alacaklar tüm geçmiş vadeleri kapsar.", "The period sets the monthly plan. Overdue receivables include all past due dates.")}</p>
      </div>
    </div>

    {pending && <p id={pendingId} className={s.pending} role="status"><span />{t("Yeni seçimler henüz uygulanmadı. Raporu güncellemek için Uygula’ya basın.", "Your new selections are not applied yet. Select Apply to update the report.")}</p>}
    <div className={s.footer}>
      <div className={s.scope} aria-label={t("Uygulanan filtreler", "Applied filters")}><span className={s.scopeLabel}>{t("Görüntülenen", "Showing")}</span>{chips.map((chip) => chip.clear ? <button className={s.chip} type="button" key={chip.key} disabled={loading} aria-label={`${chip.label} ${t("filtresini kaldır", "remove filter")}`} onClick={() => remove(chip.clear!)}>{chip.label}<X size={12} aria-hidden="true" /></button> : <span className={s.chipStatic} key={chip.key}>{chip.label}</span>)}</div>
    </div>

    </form>

    {data?.currencyMode === "all" && onDisplayCurrency && <div className={s.currencyView}>
      <div className={s.currencyDescription}><span>{t("Grafik para birimi", "Chart currency")}</span><small>{t("Tutarlar döviz bazında ayrı gösterilir.", "Amounts are shown separately for each currency.")}</small></div>
      <div className={s.currencyTabs} role="group" aria-label={t("Grafik para birimi", "Chart currency")}>{data.byCurrency.map((part) => {
        const token = currencyToken(part.currency);
        return <button key={token} type="button" aria-pressed={token === displayCurrency} onClick={() => onDisplayCurrency(token)}>{currencyName(part.currency, tr)}</button>;
      })}</div>
    </div>}

    {onShowDetails && <div id={caseId} className={s.caseSection} hidden={!caseExpanded}><CaseFilters key={detailKey} initial={initialDetail} loading={loading} pending={pending} tr={tr} onShowDetails={onShowDetails} /></div>}
  </section>;
}
