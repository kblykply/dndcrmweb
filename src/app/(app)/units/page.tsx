"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type UnitDeliveryStatus = "NOT_READY" | "READY_TO_DELIVER" | "DELIVERED";
type UnitCompanyStatus = "UNKNOWN" | "DND" | "OTHER";

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
  createdAt?: string;
  updatedAt?: string;
  customer: UnitCustomer;
};

type UnitStats = {
  total: number;
  byProject: Array<{ project: ProjectType; count: number }>;
  byDeliveryStatus: Array<{ deliveryStatus: UnitDeliveryStatus; count: number }>;
  byCompanyStatus: Array<{ companyStatus: UnitCompanyStatus; count: number }>;
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

function deliveryTone(status: UnitDeliveryStatus) {
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

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasRequest(item: UnitRow) {
  return hasText(item.customerRequest);
}

function hasComplaint(item: UnitRow) {
  return hasText(item.customerComplaint) || hasText(item.unitComplaint);
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

function FieldArea({
  label,
  value,
  onChange,
  minRows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}) {
  return (
    <label className="units-field-label">
      <span>{label}</span>
      <textarea
        value={value}
        rows={minRows}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function UnitsPage() {
  const { t, locale } = useLanguage();

  const [items, setItems] = useState<UnitRow[]>([]);
  const [stats, setStats] = useState<UnitStats>({
    total: 0,
    byProject: [],
    byDeliveryStatus: [],
    byCompanyStatus: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<"" | ProjectType>("");
  const [deliveryFilter, setDeliveryFilter] = useState<"" | UnitDeliveryStatus>("");
  const [companyFilter, setCompanyFilter] = useState<"" | UnitCompanyStatus>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [deliveryStatus, setDeliveryStatus] =
    useState<UnitDeliveryStatus>("NOT_READY");
  const [companyStatus, setCompanyStatus] =
    useState<UnitCompanyStatus>("UNKNOWN");
  const [generalInfo, setGeneralInfo] = useState("");
  const [unitInfo, setUnitInfo] = useState("");
  const [customerRequest, setCustomerRequest] = useState("");
  const [customerComplaint, setCustomerComplaint] = useState("");
  const [unitComplaint, setUnitComplaint] = useState("");

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

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

  const activeFilterCount = [
    projectFilter,
    deliveryFilter,
    companyFilter,
    q.trim(),
  ].filter(Boolean).length;

  const activeFilterSummary = [
    projectFilter ? projectLabel(projectFilter) : null,
    deliveryFilter ? deliveryLabel(deliveryFilter, locale) : null,
    companyFilter ? companyLabel(companyFilter, locale) : null,
    q.trim() ? `"${q.trim()}"` : null,
  ].filter((item): item is string => Boolean(item));

  async function load(
    overrides?: Partial<{
      projectFilter: "" | ProjectType;
      deliveryFilter: "" | UnitDeliveryStatus;
      companyFilter: "" | UnitCompanyStatus;
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
      const nextQ = overrides?.q ?? q;

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
      setSelectedId((current) =>
        current && nextItems.some((item) => item.id === current)
          ? current
          : nextItems[0]?.id || null,
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setProjectFilter("");
    setDeliveryFilter("");
    setCompanyFilter("");
    setQ("");
    load({ projectFilter: "", deliveryFilter: "", companyFilter: "", q: "" });
  }

  async function saveSelected() {
    if (!selected) return;

    setErr(null);
    setSaving(true);

    try {
      const updated = (await authedFetch(`/units/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          deliveryStatus,
          companyStatus,
          generalInfo,
          unitInfo,
          customerRequest,
          customerComplaint,
          unitComplaint,
        }),
      })) as UnitRow;

      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedId(updated.id);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, deliveryFilter, companyFilter]);

  useEffect(() => {
    if (!selected) {
      setDeliveryStatus("NOT_READY");
      setCompanyStatus("UNKNOWN");
      setGeneralInfo("");
      setUnitInfo("");
      setCustomerRequest("");
      setCustomerComplaint("");
      setUnitComplaint("");
      return;
    }

    setDeliveryStatus(selected.deliveryStatus || "NOT_READY");
    setCompanyStatus(selected.companyStatus || "UNKNOWN");
    setGeneralInfo(selected.generalInfo || "");
    setUnitInfo(selected.unitInfo || "");
    setCustomerRequest(selected.customerRequest || "");
    setCustomerComplaint(selected.customerComplaint || "");
    setUnitComplaint(selected.unitComplaint || "");
  }, [selected]);

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
          grid-template-columns: minmax(280px, 1fr) minmax(170px, 0.32fr) minmax(190px, 0.36fr) minmax(170px, 0.32fr) auto;
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

        .units-project-strip {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
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
          grid-template-columns: minmax(0, 1fr) minmax(360px, 430px);
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
          min-width: 1020px;
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

        .units-row td:first-child {
          box-shadow: inset 0 0 0 transparent;
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
          .units-project-strip,
          .units-kpis,
          .units-status-picker,
          .units-detail-grid {
            grid-template-columns: 1fr;
          }

          .units-actions,
          .units-actions > *,
          .units-filter-actions,
          .units-filter-actions > *,
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
              onChange={(e) => setProjectFilter(e.target.value as "" | ProjectType)}
            >
              <option value="">{locale === "tr" ? "Tüm projeler" : "All projects"}</option>
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

          <div className="units-filter-actions">
            <button type="button" onClick={() => load()} disabled={loading}>
              {safeTranslate(t, "common.searchRefresh", locale === "tr" ? "Ara / Yenile" : "Search / Refresh")}
            </button>

            <button type="button" onClick={clearFilters} disabled={loading || activeFilterCount === 0}>
              {safeTranslate(t, "common.reset", locale === "tr" ? "Sıfırla" : "Reset")}
            </button>
          </div>
        </div>

        <div className="units-project-strip">
          <button
            type="button"
            className={`units-project-chip ${projectFilter === "" ? "active" : ""}`}
            onClick={() => setProjectFilter("")}
          >
            <span>{locale === "tr" ? "Tümü" : "All"}</span>
            <strong>{stats.total}</strong>
          </button>
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

      <div className="units-workspace">
        <div className="units-table-panel">
          <div className="units-panel-head">
            <div className="units-panel-title">
              <h2>{locale === "tr" ? "Unit Listesi" : "Unit List"}</h2>
              <div className="units-secondary-text">
                {items.length} {locale === "tr" ? "kayıt" : "records"}
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
                  <th>{locale === "tr" ? "Kayıtlar" : "Records"}</th>
                  <th>{locale === "tr" ? "Güncelleme" : "Updated"}</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`units-row ${selectedId === item.id ? "active" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>
                      <span className="badge info">{projectLabel(item.project)}</span>
                    </td>
                    <td>
                      <div className="units-cell-stack">
                        <div className="units-primary-text units-unit-code">{item.unitNumber}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && items.length === 0 ? (
            <div className="units-empty">
              {locale === "tr" ? "Unit bulunamadı." : "No units found."}
            </div>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="units-empty">
              {safeTranslate(t, "common.loading", locale === "tr" ? "Yükleniyor..." : "Loading...")}
            </div>
          ) : null}
        </div>

        <aside className="units-detail">
          {selected ? (
            <>
              <div className="units-detail-head">
                <div className="units-cell-stack">
                  <div className="units-secondary-text">{projectLabel(selected.project)}</div>
                  <h2>{selected.unitNumber}</h2>
                </div>
                <div className="units-note-badges">
                  <span className={`units-status-pill ${deliveryBadgeClass(deliveryStatus)}`}>
                    <span className="units-status-dot" />
                    {deliveryLabel(deliveryStatus, locale)}
                  </span>
                  <span className={`units-status-pill ${companyBadgeClass(companyStatus)}`}>
                    <span className="units-status-dot" />
                    {companyLabel(companyStatus, locale)}
                  </span>
                </div>
              </div>

              <div className="units-detail-body">
                <div className="units-detail-grid">
                  <div className="units-info-line">
                    <div className="units-info-label">{locale === "tr" ? "Müşteri" : "Customer"}</div>
                    <Link href={`/customers/${selected.customer.id}`} className="units-info-value">
                      {selected.customer.fullName}
                    </Link>
                  </div>
                  <div className="units-info-line">
                    <div className="units-info-label">{locale === "tr" ? "Sorumlu" : "Owner"}</div>
                    <div className="units-info-value">{selected.customer.owner?.name || "-"}</div>
                  </div>
                  <div className="units-info-line">
                    <div className="units-info-label">{locale === "tr" ? "Telefon" : "Phone"}</div>
                    <div className="units-info-value">{selected.customer.phone || "-"}</div>
                  </div>
                  <div className="units-info-line">
                    <div className="units-info-label">{locale === "tr" ? "E-posta" : "Email"}</div>
                    <div className="units-info-value">{selected.customer.email || "-"}</div>
                  </div>
                  <div className="units-info-line">
                    <div className="units-info-label">{locale === "tr" ? "Ajans" : "Agency"}</div>
                    <div className="units-info-value">{selected.customer.agency?.name || "-"}</div>
                  </div>
                  <div className="units-info-line">
                    <div className="units-info-label">{locale === "tr" ? "Uyruk" : "Nationality"}</div>
                    <div className="units-info-value">{selected.customer.nationality || "-"}</div>
                  </div>
                </div>

                <section className="units-detail-section">
                  <div className="units-section-title">
                    <span>{locale === "tr" ? "Teslim durumu" : "Delivery status"}</span>
                    <span className="units-secondary-text">
                      {formatShortDate(selected.updatedAt, locale)}
                    </span>
                  </div>

                  <div className="units-status-picker">
                    {DELIVERY_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`units-status-choice ${deliveryTone(status)}`}
                        aria-pressed={deliveryStatus === status}
                        onClick={() => setDeliveryStatus(status)}
                      >
                        {deliveryLabel(status, locale)}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="units-detail-section">
                  <div className="units-section-title">
                    <span>{locale === "tr" ? "Firma durumu" : "Company status"}</span>
                  </div>

                  <div className="units-status-picker">
                    {COMPANY_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`units-status-choice ${companyBadgeClass(status)}`}
                        aria-pressed={companyStatus === status}
                        onClick={() => setCompanyStatus(status)}
                      >
                        {companyLabel(status, locale)}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="units-detail-section">
                  <div className="units-section-title">
                    <span>{locale === "tr" ? "Unit bilgileri" : "Unit information"}</span>
                  </div>

                  <div className="units-editor-grid">
                    <FieldArea
                      label={locale === "tr" ? "Genel bilgi" : "General info"}
                      value={generalInfo}
                      onChange={setGeneralInfo}
                    />
                    <FieldArea
                      label={locale === "tr" ? "Unit bilgisi" : "Unit info"}
                      value={unitInfo}
                      onChange={setUnitInfo}
                    />
                  </div>
                </section>

                <section className="units-detail-section">
                  <div className="units-section-title">
                    <span>{locale === "tr" ? "Müşteri kayıtları" : "Customer records"}</span>
                  </div>

                  <div className="units-editor-grid">
                    <FieldArea
                      label={locale === "tr" ? "Müşteri talebi" : "Customer request"}
                      value={customerRequest}
                      onChange={setCustomerRequest}
                    />
                    <FieldArea
                      label={locale === "tr" ? "Müşteri şikayeti" : "Customer complaint"}
                      value={customerComplaint}
                      onChange={setCustomerComplaint}
                    />
                    <FieldArea
                      label={locale === "tr" ? "Unit şikayeti" : "Unit complaint"}
                      value={unitComplaint}
                      onChange={setUnitComplaint}
                    />
                  </div>
                </section>
              </div>

              <div className="units-detail-footer">
                <button
                  type="button"
                  className="primary"
                  onClick={saveSelected}
                  disabled={saving}
                >
                  {saving
                    ? safeTranslate(t, "common.saving", locale === "tr" ? "Kaydediliyor..." : "Saving...")
                    : safeTranslate(t, "common.save", locale === "tr" ? "Kaydet" : "Save")}
                </button>

                <div className="units-secondary-text">
                  {locale === "tr" ? "Son güncelleme" : "Last updated"}:{" "}
                  {formatDate(selected.updatedAt, locale)}
                </div>
              </div>
            </>
          ) : (
            <div className="units-empty">
              {locale === "tr" ? "Unit seçili değil." : "No unit selected."}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
