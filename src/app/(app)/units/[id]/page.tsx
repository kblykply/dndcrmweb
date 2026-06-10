"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
type LogSection = "UNIT_INFORMATION" | "CUSTOMER_RECORDS";

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

type UnitLog = {
  id: string;
  section: LogSection | string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt?: string;
  createdBy?: { id: string; name: string; email?: string | null; role?: string | null } | null;
};

type UnitDetail = {
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
  logs?: UnitLog[];
};

const DELIVERY_STATUSES: UnitDeliveryStatus[] = [
  "NOT_READY",
  "READY_TO_DELIVER",
  "DELIVERED",
];

const COMPANY_STATUSES: UnitCompanyStatus[] = ["UNKNOWN", "DND", "OTHER"];

function projectLabel(project: ProjectType) {
  const labels: Record<ProjectType, string> = {
    LA_JOYA: "La Joya",
    LA_JOYA_PERLA: "La Joya Perla",
    LA_JOYA_PERLA_II: "La Joya Perla II",
    LAGOON_VERDE: "Lagoon Verde",
  };

  return labels[project];
}

function deliveryLabel(status: UnitDeliveryStatus | string, locale: string) {
  if (status === "DELIVERED") return locale === "tr" ? "Teslim edildi" : "Delivered";
  if (status === "READY_TO_DELIVER") {
    return locale === "tr" ? "Teslime hazır" : "Ready to deliver";
  }
  return locale === "tr" ? "Henüz hazır değil" : "Not ready yet";
}

function companyLabel(status: UnitCompanyStatus | string, locale: string) {
  if (status === "DND") return "DND";
  if (status === "OTHER") return locale === "tr" ? "Diğer" : "Other";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function deliveryTone(status: UnitDeliveryStatus) {
  if (status === "DELIVERED") return "success";
  if (status === "READY_TO_DELIVER") return "info";
  return "warning";
}

function companyTone(status: UnitCompanyStatus) {
  if (status === "DND") return "warning";
  if (status === "OTHER") return "info";
  return "";
}

function fieldLabel(field: string, locale: string) {
  const labels: Record<string, { en: string; tr: string }> = {
    deliveryStatus: { en: "Delivery status", tr: "Teslim durumu" },
    companyStatus: { en: "Company status", tr: "Firma durumu" },
    generalInfo: { en: "General info", tr: "Genel bilgi" },
    unitInfo: { en: "Unit info", tr: "Unit bilgisi" },
    customerRequest: { en: "Customer request", tr: "Müşteri talebi" },
    customerComplaint: { en: "Customer complaint", tr: "Müşteri şikayeti" },
    unitComplaint: { en: "Unit complaint", tr: "Unit şikayeti" },
  };

  return labels[field]?.[locale === "tr" ? "tr" : "en"] || field;
}

function displayValue(field: string, value: string | null | undefined, locale: string) {
  if (!value) return locale === "tr" ? "Boş" : "Empty";
  if (field === "deliveryStatus") return deliveryLabel(value, locale);
  if (field === "companyStatus") return companyLabel(value, locale);
  return value;
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function cleanText(value?: string | null) {
  return (value || "").trim();
}

function FieldArea({
  label,
  value,
  onChange,
  minRows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}) {
  return (
    <label className="unit-detail-field">
      <span>{label}</span>
      <textarea
        value={value}
        rows={minRows}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LogList({
  title,
  logs,
  locale,
}: {
  title: string;
  logs: UnitLog[];
  locale: string;
}) {
  return (
    <div className="unit-detail-history">
      <div className="unit-detail-subhead">
        <span>{title}</span>
        <span className="unit-detail-muted">{logs.length}</span>
      </div>

      {logs.length > 0 ? (
        <div className="unit-detail-log-list">
          {logs.map((log) => (
            <div key={log.id} className="unit-detail-log-row">
              <div className="unit-detail-log-top">
                <strong>{fieldLabel(log.field, locale)}</strong>
                <span>{formatDate(log.createdAt, locale)}</span>
              </div>
              <div className="unit-detail-log-actor">
                {log.createdBy?.name || (locale === "tr" ? "Sistem" : "System")}
              </div>
              <div className="unit-detail-diff">
                <div>
                  <span>{locale === "tr" ? "Eski" : "Old"}</span>
                  <p>{displayValue(log.field, log.oldValue, locale)}</p>
                </div>
                <div>
                  <span>{locale === "tr" ? "Yeni" : "New"}</span>
                  <p>{displayValue(log.field, log.newValue, locale)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="unit-detail-empty">
          {locale === "tr" ? "Henüz değişiklik kaydı yok." : "No change history yet."}
        </div>
      )}
    </div>
  );
}

export default function UnitDetailPage() {
  const { locale } = useLanguage();
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const unitId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
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

  const logs = useMemo(() => unit?.logs || [], [unit?.logs]);
  const unitInformationLogs = useMemo(
    () => logs.filter((log) => log.section === "UNIT_INFORMATION"),
    [logs],
  );
  const customerRecordLogs = useMemo(
    () => logs.filter((log) => log.section === "CUSTOMER_RECORDS"),
    [logs],
  );

  const isDirty = useMemo(() => {
    if (!unit) return false;

    return (
      deliveryStatus !== unit.deliveryStatus ||
      companyStatus !== unit.companyStatus ||
      cleanText(generalInfo) !== cleanText(unit.generalInfo) ||
      cleanText(unitInfo) !== cleanText(unit.unitInfo) ||
      cleanText(customerRequest) !== cleanText(unit.customerRequest) ||
      cleanText(customerComplaint) !== cleanText(unit.customerComplaint) ||
      cleanText(unitComplaint) !== cleanText(unit.unitComplaint)
    );
  }, [
    companyStatus,
    customerComplaint,
    customerRequest,
    deliveryStatus,
    generalInfo,
    unit,
    unitComplaint,
    unitInfo,
  ]);

  function applyForm(next: UnitDetail) {
    setDeliveryStatus(next.deliveryStatus || "NOT_READY");
    setCompanyStatus(next.companyStatus || "UNKNOWN");
    setGeneralInfo(next.generalInfo || "");
    setUnitInfo(next.unitInfo || "");
    setCustomerRequest(next.customerRequest || "");
    setCustomerComplaint(next.customerComplaint || "");
    setUnitComplaint(next.unitComplaint || "");
  }

  async function load() {
    if (!unitId) return;

    setLoading(true);
    setErr(null);

    try {
      const data = (await authedFetch(`/units/${unitId}`)) as UnitDetail;
      setUnit(data);
      applyForm(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setUnit(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!unit) return;

    setSaving(true);
    setErr(null);

    try {
      const updated = (await authedFetch(`/units/${unit.id}`, {
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
      })) as UnitDetail;

      setUnit(updated);
      applyForm(updated);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  return (
    <div className="unit-detail-page">
      <style jsx global>{`
        .unit-detail-page {
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .unit-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .unit-detail-title {
          display: grid;
          gap: 7px;
          min-width: min(100%, 440px);
        }

        .unit-detail-title h1 {
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: 0;
        }

        .unit-detail-eyebrow,
        .unit-detail-muted {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .unit-detail-eyebrow {
          text-transform: uppercase;
        }

        .unit-detail-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .unit-detail-link,
        .unit-detail-actions button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 8px;
          font-weight: 900;
        }

        .unit-detail-link {
          border: 1px solid var(--stroke);
          background: var(--surface);
          color: var(--text-primary);
        }

        .unit-detail-status-bar {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .unit-detail-stat,
        .unit-detail-panel {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          min-width: 0;
        }

        .unit-detail-stat {
          padding: 14px;
          display: grid;
          gap: 6px;
          border-left: 4px solid var(--text-muted);
        }

        .unit-detail-stat.success {
          border-left-color: var(--success);
        }

        .unit-detail-stat.warning {
          border-left-color: var(--warning);
        }

        .unit-detail-stat.info {
          border-left-color: var(--info);
        }

        .unit-detail-stat strong {
          color: var(--text-primary);
          font-size: 17px;
          overflow-wrap: anywhere;
        }

        .unit-detail-body {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          gap: 14px;
          align-items: start;
        }

        .unit-detail-column {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .unit-detail-panel {
          display: grid;
          gap: 14px;
          padding: 14px;
        }

        .unit-detail-panel-head,
        .unit-detail-subhead,
        .unit-detail-log-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .unit-detail-panel-head h2 {
          font-size: 17px;
          line-height: 1.2;
        }

        .unit-detail-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .unit-detail-info-line {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .unit-detail-info-line span,
        .unit-detail-field span,
        .unit-detail-diff span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .unit-detail-info-line strong,
        .unit-detail-info-line a {
          color: var(--text-primary);
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .unit-detail-status-picker {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .unit-detail-status-choice {
          min-height: 40px;
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-weight: 900;
          padding: 0 10px;
        }

        .unit-detail-status-choice[aria-pressed="true"] {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
        }

        .unit-detail-status-choice.success[aria-pressed="true"] {
          background: var(--success);
        }

        .unit-detail-status-choice.info[aria-pressed="true"] {
          background: var(--info);
        }

        .unit-detail-status-choice.warning[aria-pressed="true"] {
          background: var(--warning);
          color: #fff;
        }

        .unit-detail-fields {
          display: grid;
          gap: 10px;
        }

        .unit-detail-field {
          display: grid;
          gap: 6px;
        }

        .unit-detail-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .unit-detail-history {
          display: grid;
          gap: 10px;
          border-top: 1px solid var(--stroke);
          padding-top: 12px;
        }

        .unit-detail-log-list {
          display: grid;
          gap: 8px;
        }

        .unit-detail-log-row {
          display: grid;
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-log-top strong {
          color: var(--text-primary);
          font-size: 13px;
        }

        .unit-detail-log-top span,
        .unit-detail-log-actor {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .unit-detail-diff {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .unit-detail-diff div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .unit-detail-diff p {
          min-height: 42px;
          margin: 0;
          padding: 8px;
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .unit-detail-empty,
        .unit-detail-error {
          padding: 14px;
          color: var(--text-secondary);
        }

        .unit-detail-error {
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
          border-radius: 8px;
          color: var(--danger);
          white-space: pre-wrap;
        }

        @media (max-width: 1120px) {
          .unit-detail-body,
          .unit-detail-status-bar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .unit-detail-title h1 {
            font-size: 24px;
          }

          .unit-detail-actions,
          .unit-detail-actions > *,
          .unit-detail-info-grid,
          .unit-detail-status-picker,
          .unit-detail-diff {
            grid-template-columns: 1fr;
            width: 100%;
          }
        }
      `}</style>

      <div className="unit-detail-header">
        <div className="unit-detail-title">
          <div className="unit-detail-eyebrow">
            {locale === "tr" ? "Unit detayı" : "Unit detail"}
          </div>
          <h1>{unit ? unit.unitNumber : locale === "tr" ? "Unit" : "Unit"}</h1>
          <div className="unit-detail-muted">
            {unit ? `${projectLabel(unit.project)} / #${unit.id.slice(-6)}` : "-"}
          </div>
        </div>

        <div className="unit-detail-actions">
          <Link href="/units" className="unit-detail-link">
            {locale === "tr" ? "Tüm Unitler" : "All Units"}
          </Link>
          <button
            type="button"
            className="primary"
            onClick={save}
            disabled={!unit || loading || saving || !isDirty}
          >
            {saving ? (locale === "tr" ? "Kaydediliyor..." : "Saving...") : locale === "tr" ? "Kaydet" : "Save"}
          </button>
        </div>
      </div>

      {err ? <div className="unit-detail-error">{err}</div> : null}

      {loading ? (
        <div className="unit-detail-panel">
          <div className="unit-detail-empty">
            {locale === "tr" ? "Yükleniyor..." : "Loading..."}
          </div>
        </div>
      ) : null}

      {!loading && unit ? (
        <>
          <div className="unit-detail-status-bar">
            <div className="unit-detail-stat info">
              <span className="unit-detail-muted">{locale === "tr" ? "Müşteri" : "Customer"}</span>
              <strong>{unit.customer.fullName}</strong>
            </div>
            <div className={`unit-detail-stat ${deliveryTone(deliveryStatus)}`}>
              <span className="unit-detail-muted">{locale === "tr" ? "Teslim" : "Delivery"}</span>
              <strong>{deliveryLabel(deliveryStatus, locale)}</strong>
            </div>
            <div className={`unit-detail-stat ${companyTone(companyStatus)}`}>
              <span className="unit-detail-muted">{locale === "tr" ? "Firma" : "Company"}</span>
              <strong>{companyLabel(companyStatus, locale)}</strong>
            </div>
            <div className="unit-detail-stat">
              <span className="unit-detail-muted">{locale === "tr" ? "Son güncelleme" : "Last updated"}</span>
              <strong>{formatDate(unit.updatedAt, locale)}</strong>
            </div>
          </div>

          <div className="unit-detail-body">
            <div className="unit-detail-column">
              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <h2>{locale === "tr" ? "Müşteri özeti" : "Customer summary"}</h2>
                </div>

                <div className="unit-detail-info-grid">
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "Müşteri" : "Customer"}</span>
                    <Link href={`/customers/${unit.customer.id}`}>{unit.customer.fullName}</Link>
                  </div>
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "Sorumlu" : "Owner"}</span>
                    <strong>{unit.customer.owner?.name || "-"}</strong>
                  </div>
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "Telefon" : "Phone"}</span>
                    <strong>{unit.customer.phone || "-"}</strong>
                  </div>
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "E-posta" : "Email"}</span>
                    <strong>{unit.customer.email || "-"}</strong>
                  </div>
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "Ajans" : "Agency"}</span>
                    <strong>{unit.customer.agency?.name || unit.customer.companyName || "-"}</strong>
                  </div>
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "Uyruk" : "Nationality"}</span>
                    <strong>{unit.customer.nationality || "-"}</strong>
                  </div>
                </div>
              </section>

              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <h2>{locale === "tr" ? "Unit bilgileri" : "Unit information"}</h2>
                  <span className="unit-detail-muted">{unitInformationLogs.length}</span>
                </div>

                <div className="unit-detail-status-picker">
                  {DELIVERY_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`unit-detail-status-choice ${deliveryTone(status)}`}
                      aria-pressed={deliveryStatus === status}
                      onClick={() => setDeliveryStatus(status)}
                    >
                      {deliveryLabel(status, locale)}
                    </button>
                  ))}
                </div>

                <div className="unit-detail-status-picker">
                  {COMPANY_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`unit-detail-status-choice ${companyTone(status)}`}
                      aria-pressed={companyStatus === status}
                      onClick={() => setCompanyStatus(status)}
                    >
                      {companyLabel(status, locale)}
                    </button>
                  ))}
                </div>

                <div className="unit-detail-fields">
                  <FieldArea
                    label={locale === "tr" ? "Unit bilgisi" : "Unit info"}
                    value={unitInfo}
                    onChange={setUnitInfo}
                  />
                  <FieldArea
                    label={locale === "tr" ? "Unit şikayeti" : "Unit complaint"}
                    value={unitComplaint}
                    onChange={setUnitComplaint}
                  />
                </div>

                <LogList
                  title={locale === "tr" ? "Unit bilgi geçmişi" : "Unit information history"}
                  logs={unitInformationLogs}
                  locale={locale}
                />
              </section>
            </div>

            <div className="unit-detail-column">
              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <h2>{locale === "tr" ? "Müşteri kayıtları" : "Customer records"}</h2>
                  <span className="unit-detail-muted">{customerRecordLogs.length}</span>
                </div>

                <div className="unit-detail-fields">
                  <FieldArea
                    label={locale === "tr" ? "Genel bilgi" : "General info"}
                    value={generalInfo}
                    onChange={setGeneralInfo}
                  />
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
                </div>

                <LogList
                  title={locale === "tr" ? "Müşteri kayıt geçmişi" : "Customer record history"}
                  logs={customerRecordLogs}
                  locale={locale}
                />
              </section>
            </div>
          </div>
        </>
      ) : null}

      {!loading && !unit && !err ? (
        <div className="unit-detail-panel">
          <div className="unit-detail-empty">
            {locale === "tr" ? "Unit bulunamadı." : "Unit not found."}
          </div>
        </div>
      ) : null}
    </div>
  );
}
