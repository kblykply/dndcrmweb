"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type UnitDeliveryStatus = "NOT_READY" | "READY_TO_DELIVER" | "DELIVERED";
type UnitCompanyStatus = "UNKNOWN" | "DND" | "OTHER";
type PaymentStatus = "UNPAID" | "PAID";
type RentalStatus = "SHORT_TERM" | "LONG_TERM" | "DND_UNITS" | "NOT_INTERESTED";
type UnitIssueFilter = "" | "UNDONE_COMPLAINT";
type UnitListMode = "ACTIVE" | "CANCELED";

type UnitCustomer = {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  nationality?: string | null;
  oldCustomerCode?: string | null;
  oldCariCodes?: string | null;
  agency?: { id: string; name: string } | null;
  owner?: { id: string; name: string; email?: string | null; role?: string | null } | null;
};

type UnitRow = {
  id: string;
  customerId: string;
  project: ProjectType;
  unitNumber: string;
  deliveryStatus: UnitDeliveryStatus;
  companyStatus: UnitCompanyStatus;
  generalInfo?: string | null;
  unitInfo?: string | null;
  customerRequest?: string | null;
  customerComplaint?: string | null;
  unitComplaint?: string | null;
  isCanceled?: boolean;
  kdvStatus?: PaymentStatus | string;
  trafoStatus?: PaymentStatus | string;
  rentalStatus?: RentalStatus | string;
  createdAt?: string;
  updatedAt?: string;
  customer: UnitCustomer;
  previousCustomer?: UnitCustomer | null;
};

type UnitStats = {
  total: number;
  byProject: Array<{ project: ProjectType; count: number }>;
  byDeliveryStatus: Array<{ deliveryStatus: UnitDeliveryStatus; count: number }>;
  byCompanyStatus: Array<{ companyStatus: UnitCompanyStatus; count: number }>;
};

type UnitDayReport = {
  date: string;
  dateFrom?: string;
  dateTo?: string;
  total: number;
  byUser: Array<{ user?: { name?: string | null; role?: string | null } | null; count: number }>;
  items: Array<{
    id: string;
    section: string;
    field: string;
    oldValue?: string | null;
    newValue?: string | null;
    createdAt?: string;
    createdBy?: { name?: string | null; role?: string | null } | null;
    unit: {
      id: string;
      project?: ProjectType | string;
      unitNumber: string;
      customer?: { fullName?: string | null } | null;
    };
  }>;
};

const PROJECTS: ProjectType[] = [
  "LA_JOYA",
  "LA_JOYA_PERLA",
  "LA_JOYA_PERLA_II",
  "LAGOON_VERDE",
];

const DELIVERY_STATUSES: UnitDeliveryStatus[] = [
  "NOT_READY",
  "READY_TO_DELIVER",
  "DELIVERED",
];

const COMPANY_STATUSES: UnitCompanyStatus[] = ["UNKNOWN", "DND", "OTHER"];
const DEFAULT_PROJECT: ProjectType = "LA_JOYA";

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function projectLabel(project: ProjectType) {
  const labels: Record<ProjectType, string> = {
    LA_JOYA: "La Joya",
    LA_JOYA_PERLA: "La Joya Perla",
    LA_JOYA_PERLA_II: "La Joya Perla II",
    LAGOON_VERDE: "Lagoon Verde",
  };

  return labels[project];
}

function deliveryLabel(status: UnitDeliveryStatus, locale: string) {
  if (status === "DELIVERED") return locale === "tr" ? "Teslim edildi" : "Delivered";
  if (status === "READY_TO_DELIVER") {
    return locale === "tr" ? "Teslime hazır" : "Ready to deliver";
  }
  return locale === "tr" ? "Henüz hazır değil" : "Not ready yet";
}

function deliveryBadgeClass(status: UnitDeliveryStatus) {
  if (status === "DELIVERED") return "success";
  if (status === "READY_TO_DELIVER") return "info";
  return "warning";
}

function companyLabel(status: UnitCompanyStatus, locale: string) {
  if (status === "DND") return "DND";
  if (status === "OTHER") return locale === "tr" ? "Diğer" : "Other";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function companyBadgeClass(status: UnitCompanyStatus) {
  if (status === "DND") return "warning";
  if (status === "OTHER") return "info";
  return "";
}

function paymentLabel(status: string | undefined, locale: string) {
  return status === "PAID"
    ? locale === "tr" ? "Ödendi" : "Paid"
    : locale === "tr" ? "Ödenmedi" : "Unpaid";
}

function reportBooleanLabel(value: string, locale: string) {
  if (value === "true") return locale === "tr" ? "Evet" : "Yes";
  if (value === "false") return locale === "tr" ? "Hayır" : "No";
  return value;
}

function reportUtilityLabel(field: string, value: string, locale: string) {
  if (field === "electricityProvider") {
    if (value === "TIPTEK") return "Kiptek";
    if (value === "DND") return "DND";
    return locale === "tr" ? "Seçilmedi" : "Not selected";
  }

  if (field === "waterAccessStatus") {
    if (value === "ON") return locale === "tr" ? "Açık" : "On";
    if (value === "OFF") return locale === "tr" ? "Kapalı" : "Off";
    return locale === "tr" ? "Seçilmedi" : "Not selected";
  }

  if (field === "rentalPackage") {
    if (value === "FULL_FURNISHED") return "Full furnished";
    if (value === "CUSTOM") return locale === "tr" ? "Özel mobilya" : "Custom furniture";
    return locale === "tr" ? "İlgilenmiyor" : "Not interested";
  }

  return value;
}

function clampReportText(value: string, max = 220) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function parseCustomerComplaints(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((row) => ({
        complaint: String(row?.complaint || "").trim(),
        solution: String(row?.solution || "").trim(),
        status: row?.status === "DONE" ? "DONE" : "UNDONE",
      }))
      .filter((row) => row.complaint || row.solution);
  } catch {
    return [{ complaint: raw, solution: "", status: "UNDONE" }];
  }
}

function customerComplaintSummary(value: string | null | undefined, locale: string) {
  const rows = parseCustomerComplaints(value);
  if (rows.length === 0) return locale === "tr" ? "Boş" : "Empty";

  const done = rows.filter((row) => row.status === "DONE").length;
  const undone = rows.length - done;
  return locale === "tr"
    ? `${rows.length} şikayet · ${done} tamamlandı · ${undone} açık`
    : `${rows.length} complaints · ${done} done · ${undone} open`;
}

function hasUndoneComplaint(item: UnitRow) {
  return parseCustomerComplaints(item.customerComplaint).some(
    (row) => row.status !== "DONE",
  );
}

function issueFilterLabel(value: UnitIssueFilter, locale: string) {
  if (value === "UNDONE_COMPLAINT") {
    return locale === "tr" ? "Tamamlanmamış şikayet" : "Undone complaint";
  }

  return locale === "tr" ? "Tüm dikkatler" : "All attention";
}

function unitListModeLabel(value: UnitListMode, locale: string) {
  if (value === "CANCELED") return locale === "tr" ? "İptal edilen unitler" : "Canceled units";
  return locale === "tr" ? "Aktif unitler" : "Active units";
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rentalStatusLabel(status: string | undefined, locale: string) {
  if (status === "SHORT_TERM") return locale === "tr" ? "Kısa dönem" : "Short term";
  if (status === "LONG_TERM") return locale === "tr" ? "Uzun dönem" : "Long term";
  if (status === "DND_UNITS") return "DND Units";
  return locale === "tr" ? "İlgilenmiyor" : "Not interested";
}

function fieldLabelForReport(field: string, locale: string) {
  const labels: Record<string, { en: string; tr: string }> = {
    deliveryStatus: { en: "Delivery status", tr: "Teslim durumu" },
    companyStatus: { en: "Company status", tr: "Firma durumu" },
    unitInfo: { en: "Unit info", tr: "Unit bilgisi" },
    unitComplaint: { en: "Unit complaint", tr: "Unit şikayeti" },
    generalInfo: { en: "General info", tr: "Genel bilgi" },
    customerRequest: { en: "Customer request", tr: "Müşteri talebi" },
    customerComplaint: { en: "Customer complaint", tr: "Müşteri şikayeti" },
    isCanceled: { en: "Canceled", tr: "İptal" },
    cancelReason: { en: "Cancel reason", tr: "İptal nedeni" },
    kdvStatus: { en: "KDV status", tr: "KDV durumu" },
    trafoStatus: { en: "Trafo status", tr: "Trafo durumu" },
    electricityProvider: { en: "Electricity", tr: "Elektrik" },
    waterAccessStatus: { en: "Water access", tr: "Su erişimi" },
    rentalPackage: { en: "Rental package", tr: "Kiralama paketi" },
    customFurniture: { en: "Custom furniture", tr: "Özel mobilya" },
    rentalStatus: { en: "Rental status", tr: "Kiralama durumu" },
    EMAIL: { en: "Email", tr: "E-posta" },
    WHATSAPP: { en: "WhatsApp", tr: "WhatsApp" },
  };

  return labels[field]?.[locale === "tr" ? "tr" : "en"] || field;
}

function sectionLabelForReport(section: string, locale: string) {
  const labels: Record<string, { en: string; tr: string }> = {
    UNIT_INFORMATION: { en: "Unit information", tr: "Unit bilgileri" },
    CUSTOMER_RECORDS: { en: "Customer records", tr: "Müşteri kayıtları" },
    ACCOUNTING: { en: "Accounting", tr: "Muhasebe" },
    UTILITY: { en: "Utilities", tr: "Bağlantılar" },
    RENTAL: { en: "Rental", tr: "Kiralama" },
    ADMIN: { en: "Admin", tr: "Admin" },
    COMMUNICATION: { en: "Communication", tr: "İletişim" },
  };

  return labels[section]?.[locale === "tr" ? "tr" : "en"] || section;
}

function displayReportValue(field: string, value: string | null | undefined, locale: string) {
  const raw = (value || "").trim();
  if (!raw) return locale === "tr" ? "Boş" : "Empty";

  if (field === "deliveryStatus") {
    return deliveryLabel(raw as UnitDeliveryStatus, locale);
  }

  if (field === "companyStatus") {
    return companyLabel(raw as UnitCompanyStatus, locale);
  }

  if (field === "kdvStatus" || field === "trafoStatus") {
    return paymentLabel(raw, locale);
  }

  if (field === "isCanceled") {
    return reportBooleanLabel(raw, locale);
  }

  if (
    field === "electricityProvider" ||
    field === "waterAccessStatus" ||
    field === "rentalPackage"
  ) {
    return reportUtilityLabel(field, raw, locale);
  }

  if (field === "rentalStatus") {
    return rentalStatusLabel(raw, locale);
  }

  if (field === "customerComplaint") {
    const rows = parseCustomerComplaints(raw);
    if (rows.length === 0) return locale === "tr" ? "Boş" : "Empty";

    return rows
      .map(
        (row, index) =>
          `${index + 1}. ${row.complaint || "-"} / ${locale === "tr" ? "Çözüm" : "Solution"}: ${
            row.solution || "-"
          } / ${
            row.status === "DONE"
              ? locale === "tr" ? "Tamamlandı" : "Done"
              : locale === "tr" ? "Tamamlanmadı" : "Undone"
          }`,
      )
      .join("\n");
  }

  return raw;
}

function reportChangeText(
  item: UnitDayReport["items"][number],
  locale: string,
  max = 260,
) {
  const field = fieldLabelForReport(item.field, locale);
  const next = displayReportValue(item.field, item.newValue, locale);

  if (item.field === "EMAIL" || item.field === "WHATSAPP") {
    return `${field}: ${clampReportText(next, max)}`;
  }

  const previous = displayReportValue(item.field, item.oldValue, locale);
  return `${field}: ${clampReportText(previous, Math.floor(max / 2))} -> ${clampReportText(next, Math.floor(max / 2))}`;
}

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasRequest(item: UnitRow) {
  return hasText(item.customerRequest);
}

function hasComplaint(item: UnitRow) {
  return parseCustomerComplaints(item.customerComplaint).length > 0 || hasText(item.unitComplaint);
}

function hasInfo(item: UnitRow) {
  return hasText(item.generalInfo) || hasText(item.unitInfo);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortDate(value: string | undefined, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(value: string | undefined, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatReportPeriod(from: string | undefined, to: string | undefined, locale: string) {
  if (!from && !to) return "-";
  if (!to || from === to) return formatLongDate(from, locale);

  return `${formatLongDate(from, locale)} - ${formatLongDate(to, locale)}`;
}

function StatBox({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone?: "success" | "warning" | "info" | "danger";
}) {
  return (
    <div className={`units-stat ${tone || ""}`}>
      <div className="units-stat-label">{label}</div>
      <div className={`units-stat-value ${tone || ""}`}>{value}</div>
      {detail ? <div className="units-stat-detail">{detail}</div> : null}
    </div>
  );
}

export default function UnitsPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();

  const [items, setItems] = useState<UnitRow[]>([]);
  const [stats, setStats] = useState<UnitStats>({
    total: 0,
    byProject: [],
    byDeliveryStatus: [],
    byCompanyStatus: [],
  });
  const [projectFilter, setProjectFilter] = useState<"" | ProjectType>(DEFAULT_PROJECT);
  const [deliveryFilter, setDeliveryFilter] = useState<"" | UnitDeliveryStatus>("");
  const [companyFilter, setCompanyFilter] = useState<"" | UnitCompanyStatus>("");
  const [issueFilter, setIssueFilter] = useState<UnitIssueFilter>("");
  const [listMode, setListMode] = useState<UnitListMode>("ACTIVE");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [dayReport, setDayReport] = useState<UnitDayReport | null>(null);
  const [reportDateFrom, setReportDateFrom] = useState(() => dateKey(new Date()));
  const [reportDateTo, setReportDateTo] = useState(() => dateKey(new Date()));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canSeeDayReport =
    me?.role === "ADMIN" || me?.role === "MANAGER" || me?.role === "AFTERSALES";
  const canDeleteUnits = me?.role === "ADMIN";

  const statusCounts = useMemo(() => {
    const next: Record<UnitDeliveryStatus, number> = {
      NOT_READY: 0,
      READY_TO_DELIVER: 0,
      DELIVERED: 0,
    };

    for (const row of stats.byDeliveryStatus) {
      next[row.deliveryStatus] = row.count;
    }

    return next;
  }, [stats.byDeliveryStatus]);

  const companyStatusCounts = useMemo(() => {
    const next: Record<UnitCompanyStatus, number> = {
      UNKNOWN: 0,
      DND: 0,
      OTHER: 0,
    };

    for (const row of stats.byCompanyStatus || []) {
      next[row.companyStatus] = row.count;
    }

    return next;
  }, [stats.byCompanyStatus]);

  const projectCounts = useMemo(() => {
    const next = PROJECTS.reduce(
      (acc, project) => ({ ...acc, [project]: 0 }),
      {} as Record<ProjectType, number>,
    );

    for (const row of stats.byProject) {
      next[row.project] = row.count;
    }

    return next;
  }, [stats.byProject]);

  const topProject = useMemo(() => {
    const first = stats.byProject[0];
    return first ? `${projectLabel(first.project)} (${first.count})` : "-";
  }, [stats.byProject]);

  const requestCount = useMemo(
    () => items.filter((item) => hasRequest(item)).length,
    [items],
  );

  const complaintCount = useMemo(
    () => items.filter((item) => hasComplaint(item)).length,
    [items],
  );

  const infoCount = useMemo(
    () => items.filter((item) => hasInfo(item)).length,
    [items],
  );

  const displayedItems = useMemo(() => {
    if (issueFilter === "UNDONE_COMPLAINT") {
      return items.filter((item) => hasUndoneComplaint(item));
    }

    return items;
  }, [issueFilter, items]);

  const activeFilterCount = [
    projectFilter,
    deliveryFilter,
    companyFilter,
    issueFilter,
    listMode === "CANCELED" ? listMode : "",
    q.trim(),
  ].filter(Boolean).length;

  const activeFilterSummary = [
    listMode === "CANCELED" ? unitListModeLabel(listMode, locale) : null,
    projectFilter ? projectLabel(projectFilter) : null,
    deliveryFilter ? deliveryLabel(deliveryFilter, locale) : null,
    companyFilter ? companyLabel(companyFilter, locale) : null,
    issueFilter ? issueFilterLabel(issueFilter, locale) : null,
    q.trim() ? `"${q.trim()}"` : null,
  ].filter((item): item is string => Boolean(item));

  async function load(
    overrides?: Partial<{
      projectFilter: "" | ProjectType;
      deliveryFilter: "" | UnitDeliveryStatus;
      companyFilter: "" | UnitCompanyStatus;
      listMode: UnitListMode;
      q: string;
    }>,
  ) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      const nextProjectFilter = overrides?.projectFilter ?? projectFilter;
      const nextDeliveryFilter = overrides?.deliveryFilter ?? deliveryFilter;
      const nextCompanyFilter = overrides?.companyFilter ?? companyFilter;
      const nextListMode = overrides?.listMode ?? listMode;
      const nextQ = overrides?.q ?? q;

      params.set("unitState", nextListMode);
      if (nextProjectFilter) params.set("project", nextProjectFilter);
      if (nextDeliveryFilter) params.set("deliveryStatus", nextDeliveryFilter);
      if (nextCompanyFilter) params.set("companyStatus", nextCompanyFilter);
      if (nextQ.trim()) params.set("q", nextQ.trim());

      const data = (await authedFetch(
        `/units${params.toString() ? `?${params.toString()}` : ""}`,
      )) as { items?: UnitRow[]; stats?: UnitStats };
      const nextItems = Array.isArray(data.items) ? data.items : [];

      setItems(nextItems);
      setStats(
        data.stats || {
          total: nextItems.length,
          byProject: [],
          byDeliveryStatus: [],
          byCompanyStatus: [],
        },
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDayReport() {
    if (!canSeeDayReport) return;

    if (!reportDateFrom || !reportDateTo) {
      setErr(locale === "tr" ? "Rapor tarih aralığı gerekli." : "Report date range is required.");
      return;
    }

    if (reportDateFrom > reportDateTo) {
      setErr(
        locale === "tr"
          ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
          : "Start date cannot be after end date.",
      );
      return;
    }

    setErr(null);

    try {
      const params = new URLSearchParams();
      if (reportDateFrom) params.set("dateFrom", reportDateFrom);
      if (reportDateTo) params.set("dateTo", reportDateTo);

      const data = (await authedFetch(
        `/units/reports/end-of-day?${params.toString()}`,
      )) as UnitDayReport;
      setDayReport(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setDayReport(null);
    }
  }

  function printDayReport() {
    window.print();
  }

  async function deleteUnit(item: UnitRow) {
    const confirmed = window.confirm(
      locale === "tr"
        ? `${item.unitNumber} unit kaydı silinsin mi? Bu işlem geri alınamaz.`
        : `Delete unit record ${item.unitNumber}? This cannot be undone.`,
    );

    if (!confirmed) return;

    setErr(null);
    setDeletingId(item.id);

    try {
      await authedFetch(`/units/${item.id}`, { method: "DELETE" });
      await load();
      await loadDayReport();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setProjectFilter(DEFAULT_PROJECT);
    setDeliveryFilter("");
    setCompanyFilter("");
    setIssueFilter("");
    setListMode("ACTIVE");
    setQ("");
    load({
      projectFilter: DEFAULT_PROJECT,
      deliveryFilter: "",
      companyFilter: "",
      listMode: "ACTIVE",
      q: "",
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, deliveryFilter, companyFilter, listMode]);

  useEffect(() => {
    setMe(getUser());
  }, []);

  useEffect(() => {
    loadDayReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeDayReport]);

  return (
    <div className="units-page">
      <style jsx global>{`
        .units-page {
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .units-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .units-title {
          display: grid;
          gap: 6px;
          min-width: min(100%, 420px);
        }

        .units-title h1 {
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: 0;
        }

        .units-title p {
          max-width: 640px;
        }

        .units-eyebrow {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .units-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .units-link-button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid var(--stroke);
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 800;
        }

        .units-command-panel {
          display: grid;
          gap: 12px;
          padding: 12px;
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
        }

        .units-command-main {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) minmax(150px, 0.28fr) minmax(160px, 0.3fr) minmax(150px, 0.28fr) minmax(180px, 0.34fr) auto;
          gap: 10px;
          align-items: end;
        }

        .units-search-control {
          position: relative;
          min-width: 0;
        }

        .units-search-control input {
          height: 42px;
          padding-left: 40px;
        }

        .units-search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          line-height: 0;
          pointer-events: none;
        }

        .units-select-field {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .units-select-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .units-filter-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .units-filter-actions button {
          min-width: 96px;
        }

        .units-view-toggle {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          width: fit-content;
          padding: 4px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .units-view-toggle button {
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          padding: 0 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .units-view-toggle button[aria-pressed="true"] {
          border-color: var(--stroke);
          background: var(--surface);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .units-project-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .units-project-chip {
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 12px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-weight: 900;
          text-align: left;
        }

        .units-project-chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .units-project-chip strong {
          color: var(--text-primary);
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }

        .units-project-chip.active {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
        }

        .units-project-chip.active strong {
          color: var(--primary-foreground);
        }

        .units-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .units-report-panel {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          padding: 14px;
          display: grid;
          gap: 12px;
        }

        .units-report-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .units-report-head h2 {
          font-size: 16px;
        }

        .units-report-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .units-report-range {
          display: flex;
          align-items: end;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .units-report-date {
          display: grid;
          gap: 4px;
          min-width: 140px;
        }

        .units-report-date span {
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .units-report-date input {
          height: 34px;
          padding-inline: 10px;
        }

        .units-report-actions button {
          min-height: 34px;
        }

        .units-report-list {
          display: grid;
          gap: 8px;
        }

        .units-report-row {
          display: grid;
          grid-template-columns: minmax(120px, 0.25fr) minmax(140px, 0.28fr) minmax(0, 1fr) minmax(150px, 0.35fr);
          gap: 10px;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .units-report-detail-text {
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .units-print-report {
          display: none;
        }

        .units-stat {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-left: 4px solid var(--text-muted);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          padding: 14px 16px;
          display: grid;
          gap: 6px;
          min-width: 0;
          position: relative;
          overflow: hidden;
        }

        .units-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(15, 23, 42, 0.035), transparent 42%);
          pointer-events: none;
        }

        .units-stat.success {
          border-left-color: var(--success);
        }

        .units-stat.warning {
          border-left-color: var(--warning);
        }

        .units-stat.info {
          border-left-color: var(--info);
        }

        .units-stat.danger {
          border-left-color: var(--danger);
        }

        .units-stat-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
        }

        .units-stat-value {
          color: var(--text-primary);
          font-size: 28px;
          font-weight: 900;
          line-height: 1.15;
          overflow-wrap: anywhere;
          position: relative;
          z-index: 1;
        }

        .units-stat-detail {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
          min-height: 18px;
          position: relative;
          z-index: 1;
        }

        .units-stat-value.success {
          color: var(--success);
        }

        .units-stat-value.warning {
          color: var(--warning);
        }

        .units-stat-value.info {
          color: var(--info);
        }

        .units-stat-value.danger {
          color: var(--danger);
        }

        .units-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .units-table-panel,
        .units-detail {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          min-width: 0;
        }

        .units-table-panel {
          overflow: hidden;
        }

        .units-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 14px 12px;
          border-bottom: 1px solid var(--stroke);
          flex-wrap: wrap;
        }

        .units-panel-title {
          display: grid;
          gap: 3px;
        }

        .units-panel-title h2 {
          font-size: 16px;
        }

        .units-active-filters {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .units-table-wrap {
          overflow: auto;
          max-height: calc(100vh - 360px);
        }

        .units-table-wrap table {
          min-width: 1240px;
        }

        .units-table-wrap th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--surface);
        }

        .units-table-wrap td {
          height: 70px;
        }

        .units-row {
          cursor: pointer;
        }

        .units-row.canceled td {
          background: color-mix(in srgb, var(--danger) 6%, var(--surface));
        }

        .units-row.undone-complaint td {
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
        }

        .units-row td:first-child {
          box-shadow: inset 0 0 0 transparent;
        }

        .units-row.undone-complaint td:first-child {
          box-shadow: inset 3px 0 0 var(--danger);
        }

        .units-row.active td {
          background: var(--surface-3);
        }

        .units-row.active td:first-child {
          box-shadow: inset 3px 0 0 var(--info);
        }

        .units-cell-stack {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .units-primary-text {
          color: var(--text-primary);
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .units-unit-code {
          font-size: 18px;
          letter-spacing: 0;
          font-variant-numeric: tabular-nums;
        }

        .units-unit-link {
          color: var(--text-primary);
          font-weight: 900;
          text-decoration: none;
        }

        .units-unit-link:hover {
          color: var(--primary);
        }

        .units-secondary-text {
          color: var(--text-secondary);
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .units-customer-link {
          color: var(--text-primary);
          font-weight: 900;
        }

        .units-meta-line {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .units-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid var(--stroke);
          background: var(--surface-2);
          color: var(--text-primary);
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .units-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--text-muted);
          flex: 0 0 auto;
        }

        .units-status-pill.warning {
          color: var(--warning);
          border-color: color-mix(in srgb, var(--warning) 26%, transparent);
          background: color-mix(in srgb, var(--warning) 11%, transparent);
        }

        .units-status-pill.warning .units-status-dot {
          background: var(--warning);
        }

        .units-status-pill.success {
          color: var(--success);
          border-color: color-mix(in srgb, var(--success) 26%, transparent);
          background: color-mix(in srgb, var(--success) 11%, transparent);
        }

        .units-status-pill.success .units-status-dot {
          background: var(--success);
        }

        .units-status-pill.info {
          color: var(--info);
          border-color: color-mix(in srgb, var(--info) 26%, transparent);
          background: color-mix(in srgb, var(--info) 11%, transparent);
        }

        .units-status-pill.info .units-status-dot {
          background: var(--info);
        }

        .units-note-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .units-row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }

        .units-row-icon-button {
          width: 34px;
          height: 34px;
          min-height: 34px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 21px;
          font-weight: 900;
          line-height: 1;
        }

        .units-row-icon-button.danger {
          color: var(--danger);
          background: color-mix(in srgb, var(--danger) 7%, var(--surface));
          border-color: color-mix(in srgb, var(--danger) 22%, var(--stroke));
        }

        .units-detail {
          display: grid;
          grid-template-rows: auto 1fr auto;
          position: sticky;
          top: 78px;
          max-height: calc(100vh - 92px);
          overflow: hidden;
        }

        .units-detail-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          border-bottom: 1px solid var(--stroke);
        }

        .units-detail-body {
          display: grid;
          gap: 14px;
          padding: 14px;
          overflow: auto;
        }

        .units-detail-section {
          display: grid;
          gap: 12px;
        }

        .units-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--stroke);
        }

        .units-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 900;
        }

        .units-info-line {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .units-info-label,
        .units-field-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .units-info-value {
          color: var(--text-primary);
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .units-field-label {
          display: grid;
          gap: 6px;
        }

        .units-field-label span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .units-field-label textarea {
          min-height: 84px;
        }

        .units-status-picker {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .units-status-choice {
          height: 38px;
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-weight: 900;
        }

        .units-status-choice[aria-pressed="true"] {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
        }

        .units-status-choice.success[aria-pressed="true"] {
          background: var(--success);
        }

        .units-status-choice.info[aria-pressed="true"] {
          background: var(--info);
        }

        .units-status-choice.warning[aria-pressed="true"] {
          background: var(--warning);
          color: #fff;
        }

        .units-editor-grid {
          display: grid;
          gap: 10px;
        }

        .units-detail-footer {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-top: 1px solid var(--stroke);
          background: var(--surface);
        }

        .units-detail-footer button {
          width: 100%;
        }

        .units-empty,
        .units-error {
          padding: 14px;
          color: var(--text-secondary);
        }

        .units-error {
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
          border-radius: 8px;
          color: var(--danger);
          white-space: pre-wrap;
        }

        @media print {
          @page {
            margin: 14mm;
          }

          body * {
            visibility: hidden !important;
          }

          .units-print-report,
          .units-print-report * {
            visibility: visible !important;
          }

          .units-print-report {
            display: grid !important;
            gap: 18px;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            padding: 0;
            background: #fff;
            color: #111827;
            font-family: Arial, sans-serif;
          }

          .units-print-head {
            display: grid;
            gap: 6px;
            padding-bottom: 14px;
            border-bottom: 2px solid #111827;
          }

          .units-print-head h1 {
            margin: 0;
            font-size: 24px;
          }

          .units-print-head p,
          .units-print-muted {
            margin: 0;
            color: #4b5563;
            font-size: 12px;
          }

          .units-print-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .units-print-box {
            display: grid;
            gap: 4px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            break-inside: avoid;
          }

          .units-print-box span {
            color: #4b5563;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .units-print-box strong {
            color: #111827;
            font-size: 18px;
          }

          .units-print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }

          .units-print-table th,
          .units-print-table td {
            border: 1px solid #d1d5db;
            padding: 7px;
            text-align: left;
            vertical-align: top;
          }

          .units-print-table th {
            background: #f3f4f6;
            font-weight: 800;
          }
        }

        @media (max-width: 1180px) {
          .units-workspace {
            grid-template-columns: 1fr;
          }

          .units-detail {
            position: static;
            max-height: none;
          }
        }

        @media (max-width: 820px) {
          .units-title h1 {
            font-size: 24px;
          }

          .units-command-main,
          .units-view-toggle,
          .units-project-strip,
          .units-kpis,
          .units-report-row,
          .units-status-picker,
          .units-detail-grid {
            grid-template-columns: 1fr;
          }

          .units-actions,
          .units-actions > *,
          .units-filter-actions,
          .units-filter-actions > *,
          .units-view-toggle,
          .units-view-toggle button,
          .units-command-main > * {
            width: 100%;
          }

          .units-table-wrap {
            max-height: none;
          }
        }
      `}</style>

      <div className="units-header">
        <div className="units-title">
          <div className="units-eyebrow">
            {safeTranslate(t, "units.label", locale === "tr" ? "Portföy" : "Portfolio")}
          </div>
          <h1>{safeTranslate(t, "units.title", locale === "tr" ? "Tüm Unitler" : "All Units")}</h1>
          <p>
            {safeTranslate(
              t,
              "units.subtitle",
              locale === "tr"
                ? "Mülk sahipliği, teslim ve müşteri geri bildirimleri"
                : "Ownership, delivery and customer feedback",
            )}
          </p>
        </div>

        <div className="units-actions">
          {canDeleteUnits ? (
            <Link href="/units/dashboard" className="units-link-button">
              {safeTranslate(
                t,
                "units.dashboard",
                locale === "tr" ? "Dashboard" : "Dashboard",
              )}
            </Link>
          ) : null}
          <Link href="/customers" className="units-link-button">
            {safeTranslate(t, "units.backToCustomers", locale === "tr" ? "Müşteriler" : "Customers")}
          </Link>
          <button type="button" onClick={() => load()} disabled={loading}>
            {loading
              ? safeTranslate(t, "common.refreshing", locale === "tr" ? "Yenileniyor..." : "Refreshing...")
              : safeTranslate(t, "common.refresh", locale === "tr" ? "Yenile" : "Refresh")}
          </button>
        </div>
      </div>

      <div className="units-command-panel">
        <div className="units-command-main">
          <div className="units-search-control">
            <span className="units-search-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="m21 21-4.4-4.4M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              placeholder={
                locale === "tr"
                  ? "Unit, müşteri, telefon, e-posta veya eski kod ara..."
                  : "Search unit, customer, phone, email or old code..."
              }
            />
          </div>

          <label className="units-select-field">
            <span className="units-select-label">{locale === "tr" ? "Proje" : "Project"}</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value as ProjectType)}
            >
              {PROJECTS.map((project) => (
                <option key={project} value={project}>
                  {projectLabel(project)}
                </option>
              ))}
            </select>
          </label>

          <label className="units-select-field">
            <span className="units-select-label">{locale === "tr" ? "Teslim" : "Delivery"}</span>
            <select
              value={deliveryFilter}
              onChange={(e) =>
                setDeliveryFilter(e.target.value as "" | UnitDeliveryStatus)
              }
            >
              <option value="">
                {locale === "tr" ? "Tüm durumlar" : "All statuses"}
              </option>
              {DELIVERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {deliveryLabel(status, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="units-select-field">
            <span className="units-select-label">
              {locale === "tr" ? "Firma" : "Company"}
            </span>
            <select
              value={companyFilter}
              onChange={(e) =>
                setCompanyFilter(e.target.value as "" | UnitCompanyStatus)
              }
            >
              <option value="">
                {locale === "tr" ? "Tüm firmalar" : "All company statuses"}
              </option>
              {COMPANY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {companyLabel(status, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="units-select-field">
            <span className="units-select-label">
              {locale === "tr" ? "Dikkat" : "Attention"}
            </span>
            <select
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value as UnitIssueFilter)}
            >
              <option value="">{issueFilterLabel("", locale)}</option>
              <option value="UNDONE_COMPLAINT">
                {issueFilterLabel("UNDONE_COMPLAINT", locale)}
              </option>
            </select>
          </label>

          <div className="units-filter-actions">
            <button type="button" onClick={() => load()} disabled={loading}>
              {safeTranslate(t, "common.searchRefresh", locale === "tr" ? "Ara / Yenile" : "Search / Refresh")}
            </button>

            <button type="button" onClick={clearFilters} disabled={loading || activeFilterCount === 0}>
              {safeTranslate(t, "common.reset", locale === "tr" ? "Sıfırla" : "Reset")}
            </button>
          </div>
        </div>

        <div className="units-view-toggle" aria-label={locale === "tr" ? "Unit görünümü" : "Unit view"}>
          {(["ACTIVE", "CANCELED"] as UnitListMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={listMode === mode}
              onClick={() => setListMode(mode)}
            >
              {unitListModeLabel(mode, locale)}
            </button>
          ))}
        </div>

        <div className="units-project-strip">
          {PROJECTS.map((project) => (
            <button
              key={project}
              type="button"
              className={`units-project-chip ${projectFilter === project ? "active" : ""}`}
              onClick={() => setProjectFilter(project)}
            >
              <span>{projectLabel(project)}</span>
              <strong>{projectCounts[project]}</strong>
            </button>
          ))}
        </div>
      </div>

      {err ? <div className="units-error">{err}</div> : null}

      <div className="units-kpis">
        <StatBox
          label={safeTranslate(t, "units.stats.total", locale === "tr" ? "Toplam unit" : "Total units")}
          value={stats.total}
          detail={`${locale === "tr" ? "DND" : "DND"} ${companyStatusCounts.DND} / ${locale === "tr" ? "Diğer" : "Other"} ${companyStatusCounts.OTHER}`}
        />
        <StatBox
          label={locale === "tr" ? "Teslim edildi" : "Delivered"}
          value={statusCounts.DELIVERED}
          detail={`${locale === "tr" ? "En yoğun" : "Top"}: ${topProject}`}
          tone="success"
        />
        <StatBox
          label={locale === "tr" ? "Teslime hazır" : "Ready to deliver"}
          value={statusCounts.READY_TO_DELIVER}
          detail={`${requestCount} ${locale === "tr" ? "müşteri talebi" : "customer requests"}`}
          tone="info"
        />
        <StatBox
          label={locale === "tr" ? "Hazır değil" : "Not ready yet"}
          value={statusCounts.NOT_READY}
          detail={`${complaintCount} ${locale === "tr" ? "şikayet" : "complaints"} / ${infoCount} ${locale === "tr" ? "bilgi" : "info"}`}
          tone="warning"
        />
      </div>

      {canSeeDayReport ? (
        <div className="units-report-panel">
          <div className="units-report-head">
            <div>
              <h2>{locale === "tr" ? "Gün sonu unit raporu" : "End-of-day unit report"}</h2>
              <div className="units-secondary-text">
                {dayReport
                  ? `${dayReport.total} ${locale === "tr" ? "aktivite" : "activities"} · ${formatReportPeriod(dayReport.dateFrom || dayReport.date, dayReport.dateTo || dayReport.date, locale)}`
                  : locale === "tr" ? "Bugün kayıt yok" : "No activity today"}
              </div>
            </div>
            <div className="units-report-actions">
              <div className="units-report-range">
                <label className="units-report-date">
                  <span>{locale === "tr" ? "Başlangıç" : "From"}</span>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                  />
                </label>
                <label className="units-report-date">
                  <span>{locale === "tr" ? "Bitiş" : "To"}</span>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={loadDayReport}
                  disabled={
                    !reportDateFrom || !reportDateTo || reportDateFrom > reportDateTo
                  }
                >
                  {locale === "tr" ? "Uygula" : "Apply"}
                </button>
              </div>
              <div className="units-note-badges">
                {(dayReport?.byUser || []).slice(0, 4).map((item, index) => (
                  <span key={`${item.user?.name || "system"}-${index}`} className="badge info">
                    {item.user?.name || "System"}: {item.count}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="primary"
                onClick={printDayReport}
                disabled={!dayReport}
              >
                {locale === "tr" ? "PDF / Yazdır" : "PDF / Print"}
              </button>
            </div>
          </div>

          {dayReport?.items?.length ? (
            <div className="units-report-list">
              {dayReport.items.slice(0, 6).map((item) => (
                <div key={item.id} className="units-report-row">
                  <div>
                    <div className="units-primary-text">{item.unit.unitNumber}</div>
                    <div className="units-secondary-text">
                      {item.unit.project ? projectLabel(item.unit.project as ProjectType) : "-"}
                    </div>
                  </div>
                  <div className="units-secondary-text">
                    {sectionLabelForReport(item.section, locale)}
                    <br />
                    {fieldLabelForReport(item.field, locale)}
                  </div>
                  <div className="units-report-detail-text">
                    {reportChangeText(item, locale)}
                  </div>
                  <div className="units-secondary-text">
                    {item.unit.customer?.fullName || "-"}
                    <br />
                    {item.createdBy?.name || "System"} · {formatDate(item.createdAt, locale)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {canSeeDayReport && dayReport ? (
        <section className="units-print-report" aria-hidden="true">
          <div className="units-print-head">
            <h1>{locale === "tr" ? "Gün Sonu Unit Raporu" : "End-of-Day Unit Report"}</h1>
            <p>
              {locale === "tr" ? "Rapor dönemi" : "Report period"}:{" "}
              {formatReportPeriod(
                dayReport.dateFrom || dayReport.date,
                dayReport.dateTo || dayReport.date,
                locale,
              )}
            </p>
            <p>
              {locale === "tr" ? "Proje" : "Project"}:{" "}
              {projectFilter ? projectLabel(projectFilter) : locale === "tr" ? "Tüm projeler" : "All projects"}
            </p>
          </div>

          <div className="units-print-grid">
            <div className="units-print-box">
              <span>{locale === "tr" ? "Toplam aktivite" : "Total activities"}</span>
              <strong>{dayReport.total}</strong>
            </div>
            <div className="units-print-box">
              <span>{locale === "tr" ? "Aktif kullanıcı" : "Active users"}</span>
              <strong>{dayReport.byUser.length}</strong>
            </div>
            <div className="units-print-box">
              <span>{locale === "tr" ? "Oluşturma zamanı" : "Generated at"}</span>
              <strong>
                {new Date().toLocaleTimeString(locale === "tr" ? "tr-TR" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </div>
          </div>

          {dayReport.byUser.length ? (
            <table className="units-print-table">
              <thead>
                <tr>
                  <th>{locale === "tr" ? "Kullanıcı" : "User"}</th>
                  <th>{locale === "tr" ? "Rol" : "Role"}</th>
                  <th>{locale === "tr" ? "Aktivite" : "Activities"}</th>
                </tr>
              </thead>
              <tbody>
                {dayReport.byUser.map((item, index) => (
                  <tr key={`${item.user?.name || "system"}-${index}`}>
                    <td>{item.user?.name || "System"}</td>
                    <td>{item.user?.role || "-"}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <table className="units-print-table">
            <thead>
              <tr>
                <th>{locale === "tr" ? "Saat" : "Time"}</th>
                <th>{locale === "tr" ? "Unit" : "Unit"}</th>
                <th>{locale === "tr" ? "Müşteri" : "Customer"}</th>
                <th>{locale === "tr" ? "Bölüm" : "Section"}</th>
                <th>{locale === "tr" ? "Alan" : "Field"}</th>
                <th>{locale === "tr" ? "Eski değer" : "Old value"}</th>
                <th>{locale === "tr" ? "Yeni değer" : "New value"}</th>
                <th>{locale === "tr" ? "Kullanıcı" : "User"}</th>
              </tr>
            </thead>
            <tbody>
              {dayReport.items.length ? (
                dayReport.items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.createdAt, locale)}</td>
                    <td>
                      {item.unit.unitNumber}
                      <br />
                      <span className="units-print-muted">
                        {item.unit.project ? projectLabel(item.unit.project as ProjectType) : "-"}
                      </span>
                    </td>
                    <td>{item.unit.customer?.fullName || "-"}</td>
                    <td>{sectionLabelForReport(item.section, locale)}</td>
                    <td>{fieldLabelForReport(item.field, locale)}</td>
                    <td>{displayReportValue(item.field, item.oldValue, locale)}</td>
                    <td>{displayReportValue(item.field, item.newValue, locale)}</td>
                    <td>{item.createdBy?.name || "System"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="units-print-muted">
                    {locale === "tr" ? "Bugün aktivite yok." : "No activity today."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="units-workspace">
        <div className="units-table-panel">
          <div className="units-panel-head">
            <div className="units-panel-title">
              <h2>
                {listMode === "CANCELED"
                  ? locale === "tr"
                    ? "İptal edilen unitler"
                    : "Canceled units"
                  : locale === "tr"
                    ? "Aktif unit listesi"
                    : "Active unit list"}
              </h2>
              <div className="units-secondary-text">
                {displayedItems.length}{" "}
                {listMode === "CANCELED"
                  ? locale === "tr"
                    ? "iptal kaydı"
                    : "canceled records"
                  : locale === "tr"
                    ? "aktif kayıt"
                    : "active records"}
              </div>
            </div>

            <div className="units-active-filters">
              {activeFilterSummary.length > 0 ? (
                activeFilterSummary.map((item) => (
                  <span key={item} className="badge info">
                    {item}
                  </span>
                ))
              ) : (
                <span className="badge">{locale === "tr" ? "Tüm portföy" : "Full portfolio"}</span>
              )}
            </div>
          </div>

          <div className="units-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{locale === "tr" ? "Proje" : "Project"}</th>
                  <th>{locale === "tr" ? "Unit" : "Unit"}</th>
                  <th>{locale === "tr" ? "Müşteri" : "Customer"}</th>
                  <th>{locale === "tr" ? "Sorumlu" : "Owner"}</th>
                  <th>{locale === "tr" ? "Teslim" : "Delivery"}</th>
                  <th>{locale === "tr" ? "Firma" : "Company"}</th>
                  <th>{locale === "tr" ? "Kiralama" : "Rental"}</th>
                  <th>{locale === "tr" ? "Muhasebe" : "Accounting"}</th>
                  <th>{locale === "tr" ? "Kayıtlar" : "Records"}</th>
                  <th>{locale === "tr" ? "Güncelleme" : "Updated"}</th>
                  {canDeleteUnits ? <th aria-label={locale === "tr" ? "İşlemler" : "Actions"} /> : null}
                </tr>
              </thead>

              <tbody>
                {displayedItems.map((item) => {
                  const undoneComplaint = hasUndoneComplaint(item);

                  return (
                    <tr
                      key={item.id}
                      className={`units-row ${item.isCanceled ? "canceled" : ""} ${
                        undoneComplaint ? "undone-complaint" : ""
                      }`}
                      onClick={() => router.push(`/units/${item.id}`)}
                    >
                    <td>
                      <span className="badge info">{projectLabel(item.project)}</span>
                    </td>
                    <td>
                      <div className="units-cell-stack">
                        <Link
                          href={`/units/${item.id}`}
                          className="units-unit-link units-unit-code"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.unitNumber}
                        </Link>
                        {item.isCanceled ? (
                          <span className="badge danger">
                            {locale === "tr" ? "İptal" : "Canceled"}
                          </span>
                        ) : null}
                        <div className="units-secondary-text">#{item.id.slice(-6)}</div>
                      </div>
                    </td>
                    <td>
                      <div className="units-cell-stack">
                        <Link
                          href={`/customers/${item.customer.id}`}
                          className="units-customer-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.customer.fullName}
                        </Link>
                        <div className="units-secondary-text units-meta-line">
                          {[item.customer.phone, item.customer.email].filter(Boolean).join(" / ") || "-"}
                        </div>
                        <div className="units-secondary-text">
                          {item.customer.agency?.name || item.customer.companyName || "-"}
                        </div>
                        {item.isCanceled && item.previousCustomer ? (
                          <div className="units-secondary-text">
                            {locale === "tr" ? "Önceki sahibi" : "Previous owner"}:{" "}
                            {item.previousCustomer.fullName}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="units-cell-stack">
                        <div className="units-primary-text">{item.customer.owner?.name || "-"}</div>
                        <div className="units-secondary-text">{item.customer.owner?.role || "-"}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`units-status-pill ${deliveryBadgeClass(item.deliveryStatus)}`}>
                        <span className="units-status-dot" />
                        {deliveryLabel(item.deliveryStatus, locale)}
                      </span>
                    </td>
                    <td>
                      <span className={`units-status-pill ${companyBadgeClass(item.companyStatus)}`}>
                        <span className="units-status-dot" />
                        {companyLabel(item.companyStatus, locale)}
                      </span>
                    </td>
                    <td>
                      <span className="units-status-pill info">
                        <span className="units-status-dot" />
                        {rentalStatusLabel(item.rentalStatus, locale)}
                      </span>
                    </td>
                    <td>
                      <div className="units-note-badges">
                        <span className={`badge ${item.kdvStatus === "PAID" ? "success" : "warning"}`}>
                          KDV: {paymentLabel(item.kdvStatus, locale)}
                        </span>
                        <span className={`badge ${item.trafoStatus === "PAID" ? "success" : "warning"}`}>
                          Trafo: {paymentLabel(item.trafoStatus, locale)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="units-note-badges">
                        {hasRequest(item) ? (
                          <span className="badge info">
                            {locale === "tr" ? "Talep" : "Request"}
                          </span>
                        ) : null}
                        {hasComplaint(item) ? (
                          <span className="badge danger">
                            {locale === "tr" ? "Şikayet" : "Complaint"}
                          </span>
                        ) : null}
                        {undoneComplaint ? (
                          <span className="badge danger">
                            {locale === "tr" ? "Tamamlanmamış şikayet" : "Undone complaint"}
                          </span>
                        ) : null}
                        {hasInfo(item) ? (
                          <span className="badge">
                            {locale === "tr" ? "Bilgi" : "Info"}
                          </span>
                        ) : null}
                        {!hasRequest(item) && !hasComplaint(item) && !hasInfo(item) ? (
                          <span className="muted">-</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="units-cell-stack">
                        <div>{formatShortDate(item.updatedAt, locale)}</div>
                        <div className="units-secondary-text">
                          {formatDate(item.updatedAt, locale)}
                        </div>
                      </div>
                    </td>
                    {canDeleteUnits ? (
                      <td>
                        <div className="units-row-actions">
                          <button
                            type="button"
                            className="units-row-icon-button danger"
                            aria-label={locale === "tr" ? "Unit sil" : "Delete unit"}
                            title={locale === "tr" ? "Unit sil" : "Delete unit"}
                            disabled={deletingId === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteUnit(item);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && displayedItems.length === 0 ? (
            <div className="units-empty">
              {listMode === "CANCELED"
                ? locale === "tr"
                  ? "İptal edilen unit bulunamadı."
                  : "No canceled units found."
                : locale === "tr"
                  ? "Aktif unit bulunamadı."
                  : "No active units found."}
            </div>
          ) : null}

          {loading && displayedItems.length === 0 ? (
            <div className="units-empty">
              {safeTranslate(t, "common.loading", locale === "tr" ? "Yükleniyor..." : "Loading...")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
