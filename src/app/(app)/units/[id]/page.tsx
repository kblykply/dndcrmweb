"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
type ElectricityProvider = "UNKNOWN" | "TIPTEK" | "DND";
type WaterAccessStatus = "UNKNOWN" | "ON" | "OFF";
type RentalPackage = "FULL_FURNISHED" | "NOT_INTERESTED" | "CUSTOM";
type RentalStatus = "SHORT_TERM" | "LONG_TERM" | "DND_UNITS" | "NOT_INTERESTED";
type LogSection = "UNIT_INFORMATION" | "CUSTOMER_RECORDS";

type UnitInstallment = {
  id: string;
  type: "INSTALLMENT" | "DEPOSIT" | "AIDAT";
  title: string;
  amount?: number | null;
  dueDate?: string | null;
  status: PaymentStatus;
  paidAt?: string | null;
  note?: string | null;
};

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
  isCanceled?: boolean;
  cancelReason?: string | null;
  canceledAt?: string | null;
  kdvStatus?: PaymentStatus | string;
  trafoStatus?: PaymentStatus | string;
  installments?: UnitInstallment[] | null;
  electricityProvider?: ElectricityProvider | string;
  waterAccessStatus?: WaterAccessStatus | string;
  rentalPackage?: RentalPackage | string;
  customFurniture?: string | null;
  rentalStatus?: RentalStatus | string;
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
const PAYMENT_STATUSES: PaymentStatus[] = ["UNPAID", "PAID"];
const ELECTRICITY_PROVIDERS: ElectricityProvider[] = ["UNKNOWN", "TIPTEK", "DND"];
const WATER_ACCESS_STATUSES: WaterAccessStatus[] = ["UNKNOWN", "ON", "OFF"];
const RENTAL_PACKAGES: RentalPackage[] = [
  "FULL_FURNISHED",
  "NOT_INTERESTED",
  "CUSTOM",
];
const RENTAL_STATUSES: RentalStatus[] = [
  "SHORT_TERM",
  "LONG_TERM",
  "DND_UNITS",
  "NOT_INTERESTED",
];

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

function paymentLabel(status: string | undefined, locale: string) {
  return status === "PAID"
    ? locale === "tr" ? "Ödendi" : "Paid"
    : locale === "tr" ? "Ödenmedi" : "Unpaid";
}

function electricityLabel(status: string | undefined, locale: string) {
  if (status === "TIPTEK") return "Tiptek";
  if (status === "DND") return "DND";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function waterLabel(status: string | undefined, locale: string) {
  if (status === "ON") return locale === "tr" ? "Açık" : "On";
  if (status === "OFF") return locale === "tr" ? "Kapalı" : "Off";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function rentalPackageLabel(status: string | undefined, locale: string) {
  if (status === "FULL_FURNISHED") return locale === "tr" ? "Full furnished" : "Full furnished";
  if (status === "CUSTOM") return locale === "tr" ? "Özel mobilya" : "Custom furniture";
  return locale === "tr" ? "İlgilenmiyor" : "Not interested";
}

function rentalStatusLabel(status: string | undefined, locale: string) {
  if (status === "SHORT_TERM") return locale === "tr" ? "Kısa dönem" : "Short term";
  if (status === "LONG_TERM") return locale === "tr" ? "Uzun dönem" : "Long term";
  if (status === "DND_UNITS") return "DND Units";
  return locale === "tr" ? "İlgilenmiyor" : "Not interested";
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
    isCanceled: { en: "Canceled", tr: "İptal" },
    cancelReason: { en: "Cancel reason", tr: "İptal nedeni" },
    kdvStatus: { en: "KDV status", tr: "KDV durumu" },
    trafoStatus: { en: "Trafo status", tr: "Trafo durumu" },
    installments: { en: "Installments", tr: "Taksitler" },
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

function displayValue(field: string, value: string | null | undefined, locale: string) {
  if (!value) return locale === "tr" ? "Boş" : "Empty";
  if (field === "deliveryStatus") return deliveryLabel(value, locale);
  if (field === "companyStatus") return companyLabel(value, locale);
  if (field === "kdvStatus" || field === "trafoStatus") {
    return paymentLabel(value, locale);
  }
  if (field === "electricityProvider") return electricityLabel(value, locale);
  if (field === "waterAccessStatus") return waterLabel(value, locale);
  if (field === "rentalPackage") return rentalPackageLabel(value, locale);
  if (field === "rentalStatus") return rentalStatusLabel(value, locale);
  if (field === "installments") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? `${parsed.length} ${locale === "tr" ? "kayıt" : "records"}`
        : value;
    } catch {
      return value;
    }
  }
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

function FieldSelect({
  label,
  value,
  onChange,
  options,
  labelFor,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labelFor: (value: string) => string;
}) {
  return (
    <label className="unit-detail-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFor(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function newInstallment(index: number): UnitInstallment {
  return {
    id: `installment-${Date.now()}-${index}`,
    type: "INSTALLMENT",
    title: `Installment ${index + 1}`,
    amount: null,
    dueDate: "",
    status: "UNPAID",
    paidAt: "",
    note: "",
  };
}

function serializeInstallments(rows?: UnitInstallment[] | null) {
  return JSON.stringify(rows || []);
}

function normalizeWhatsAppPhone(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}

function openExternalLink(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
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
  const [me, setMe] = useState<any>(null);
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
  const [isCanceled, setIsCanceled] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [kdvStatus, setKdvStatus] = useState<PaymentStatus>("UNPAID");
  const [trafoStatus, setTrafoStatus] = useState<PaymentStatus>("UNPAID");
  const [installments, setInstallments] = useState<UnitInstallment[]>([]);
  const [electricityProvider, setElectricityProvider] =
    useState<ElectricityProvider>("UNKNOWN");
  const [waterAccessStatus, setWaterAccessStatus] =
    useState<WaterAccessStatus>("UNKNOWN");
  const [rentalPackage, setRentalPackage] =
    useState<RentalPackage>("NOT_INTERESTED");
  const [customFurniture, setCustomFurniture] = useState("");
  const [rentalStatus, setRentalStatus] =
    useState<RentalStatus>("NOT_INTERESTED");
  const [communicationMessage, setCommunicationMessage] = useState("");
  const [communicationSending, setCommunicationSending] = useState<"" | "EMAIL" | "WHATSAPP">("");
  const [communicationNotice, setCommunicationNotice] = useState("");

  const isAdmin = me?.role === "ADMIN";

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
      cleanText(unitComplaint) !== cleanText(unit.unitComplaint) ||
      (isAdmin && isCanceled !== Boolean(unit.isCanceled)) ||
      (isAdmin && cleanText(cancelReason) !== cleanText(unit.cancelReason)) ||
      kdvStatus !== (unit.kdvStatus || "UNPAID") ||
      trafoStatus !== (unit.trafoStatus || "UNPAID") ||
      serializeInstallments(installments) !== serializeInstallments(unit.installments) ||
      electricityProvider !== (unit.electricityProvider || "UNKNOWN") ||
      waterAccessStatus !== (unit.waterAccessStatus || "UNKNOWN") ||
      rentalPackage !== (unit.rentalPackage || "NOT_INTERESTED") ||
      cleanText(customFurniture) !== cleanText(unit.customFurniture) ||
      rentalStatus !== (unit.rentalStatus || "NOT_INTERESTED")
    );
  }, [
    cancelReason,
    companyStatus,
    customFurniture,
    customerComplaint,
    customerRequest,
    deliveryStatus,
    electricityProvider,
    generalInfo,
    installments,
    isAdmin,
    isCanceled,
    kdvStatus,
    rentalPackage,
    rentalStatus,
    trafoStatus,
    unit,
    unitComplaint,
    unitInfo,
    waterAccessStatus,
  ]);

  function applyForm(next: UnitDetail) {
    setDeliveryStatus(next.deliveryStatus || "NOT_READY");
    setCompanyStatus(next.companyStatus || "UNKNOWN");
    setGeneralInfo(next.generalInfo || "");
    setUnitInfo(next.unitInfo || "");
    setCustomerRequest(next.customerRequest || "");
    setCustomerComplaint(next.customerComplaint || "");
    setUnitComplaint(next.unitComplaint || "");
    setIsCanceled(Boolean(next.isCanceled));
    setCancelReason(next.cancelReason || "");
    setKdvStatus((next.kdvStatus as PaymentStatus) || "UNPAID");
    setTrafoStatus((next.trafoStatus as PaymentStatus) || "UNPAID");
    setInstallments(Array.isArray(next.installments) ? next.installments : []);
    setElectricityProvider((next.electricityProvider as ElectricityProvider) || "UNKNOWN");
    setWaterAccessStatus((next.waterAccessStatus as WaterAccessStatus) || "UNKNOWN");
    setRentalPackage((next.rentalPackage as RentalPackage) || "NOT_INTERESTED");
    setCustomFurniture(next.customFurniture || "");
    setRentalStatus((next.rentalStatus as RentalStatus) || "NOT_INTERESTED");
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
      const body: any = {
        deliveryStatus,
        companyStatus,
        generalInfo,
        unitInfo,
        customerRequest,
        customerComplaint,
        unitComplaint,
        kdvStatus,
        trafoStatus,
        installments,
        electricityProvider,
        waterAccessStatus,
        rentalPackage,
        customFurniture,
        rentalStatus,
      };

      if (isAdmin) {
        body.isCanceled = isCanceled;
        body.cancelReason = cancelReason;
      }

      const updated = (await authedFetch(`/units/${unit.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })) as UnitDetail;

      setUnit(updated);
      applyForm(updated);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  function updateInstallment(id: string, patch: Partial<UnitInstallment>) {
    setInstallments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeInstallment(id: string) {
    setInstallments((prev) => prev.filter((item) => item.id !== id));
  }

  async function contactCustomer(type: "EMAIL" | "WHATSAPP") {
    if (!unit) return;

    const message = communicationMessage.trim();
    if (!message) {
      setErr(locale === "tr" ? "Mesaj boş olamaz." : "Message is required.");
      return;
    }

    setErr(null);
    setCommunicationNotice("");
    setCommunicationSending(type);

    if (type === "EMAIL") {
      if (!unit.customer.email) {
        setErr(locale === "tr" ? "Müşteri e-postası yok." : "Customer email is missing.");
        setCommunicationSending("");
        return;
      }

      try {
        const updated = (await authedFetch(`/units/${unit.id}/send-email`, {
          method: "POST",
          body: JSON.stringify({
            subject: `${unit.unitNumber} - ${projectLabel(unit.project)}`,
            message,
          }),
        })) as UnitDetail;

        setUnit(updated);
        applyForm(updated);
        setCommunicationMessage("");
        setCommunicationNotice(locale === "tr" ? "E-posta gönderildi." : "Email sent.");
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setCommunicationSending("");
      }

      return;
    }

    if (type === "WHATSAPP") {
      const phone = normalizeWhatsAppPhone(unit.customer.phone);
      if (!phone) {
        setErr(locale === "tr" ? "Müşteri telefonu yok." : "Customer phone is missing.");
        setCommunicationSending("");
        return;
      }

      openExternalLink(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    }

    try {
      const updated = (await authedFetch(`/units/${unit.id}/communication-log`, {
        method: "POST",
        body: JSON.stringify({ type, message }),
      })) as UnitDetail;

      setUnit(updated);
      applyForm(updated);
      setCommunicationMessage("");
      setCommunicationNotice(locale === "tr" ? "WhatsApp kaydı oluşturuldu." : "WhatsApp log saved.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setCommunicationSending("");
    }
  }

  useEffect(() => {
    setMe(getUser());
  }, []);

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

        .unit-detail-field input,
        .unit-detail-field select {
          width: 100%;
        }

        .unit-detail-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .unit-detail-installments {
          display: grid;
          gap: 10px;
        }

        .unit-detail-installment-row {
          display: grid;
          grid-template-columns: minmax(120px, 0.8fr) minmax(160px, 1fr) minmax(90px, 0.6fr) minmax(130px, 0.8fr) minmax(110px, 0.7fr) auto;
          gap: 8px;
          align-items: end;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-installment-row button {
          min-height: 38px;
          border-radius: 8px;
        }

        .unit-detail-contact-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .unit-detail-contact-actions button,
        .unit-detail-add-row {
          min-height: 38px;
          border-radius: 8px;
          padding: 0 12px;
          font-weight: 900;
        }

        .unit-detail-danger {
          border-color: color-mix(in srgb, var(--danger) 34%, var(--stroke));
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
        }

        .unit-detail-danger-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          font-weight: 900;
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
          .unit-detail-mini-grid,
          .unit-detail-installment-row,
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

                {isAdmin ? (
                  <LogList
                    title={locale === "tr" ? "Unit bilgi geçmişi" : "Unit information history"}
                    logs={unitInformationLogs}
                    locale={locale}
                  />
                ) : null}
              </section>

              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <h2>{locale === "tr" ? "Muhasebe" : "Accounting"}</h2>
                  <span className="unit-detail-muted">
                    {paymentLabel(kdvStatus, locale)} / {paymentLabel(trafoStatus, locale)}
                  </span>
                </div>

                <div className="unit-detail-mini-grid">
                  <FieldSelect
                    label="KDV"
                    value={kdvStatus}
                    onChange={(value) => setKdvStatus(value as PaymentStatus)}
                    options={PAYMENT_STATUSES}
                    labelFor={(value) => paymentLabel(value, locale)}
                  />
                  <FieldSelect
                    label="Trafo"
                    value={trafoStatus}
                    onChange={(value) => setTrafoStatus(value as PaymentStatus)}
                    options={PAYMENT_STATUSES}
                    labelFor={(value) => paymentLabel(value, locale)}
                  />
                </div>

                <div className="unit-detail-installments">
                  <div className="unit-detail-subhead">
                    <span>{locale === "tr" ? "Taksit / Depozito / Aidat" : "Installments / Deposit / Aidat"}</span>
                    <button
                      type="button"
                      className="unit-detail-add-row"
                      onClick={() => setInstallments((prev) => [...prev, newInstallment(prev.length)])}
                    >
                      {locale === "tr" ? "Satır ekle" : "Add row"}
                    </button>
                  </div>

                  {installments.map((item) => (
                    <div key={item.id} className="unit-detail-installment-row">
                      <FieldSelect
                        label={locale === "tr" ? "Tip" : "Type"}
                        value={item.type}
                        onChange={(value) => updateInstallment(item.id, { type: value as UnitInstallment["type"] })}
                        options={["INSTALLMENT", "DEPOSIT", "AIDAT"]}
                        labelFor={(value) =>
                          value === "DEPOSIT"
                            ? locale === "tr" ? "Depozito" : "Deposit"
                            : value === "AIDAT"
                              ? "Aidat"
                              : locale === "tr" ? "Taksit" : "Installment"
                        }
                      />
                      <label className="unit-detail-field">
                        <span>{locale === "tr" ? "Başlık" : "Title"}</span>
                        <input
                          value={item.title}
                          onChange={(e) => updateInstallment(item.id, { title: e.target.value })}
                        />
                      </label>
                      <label className="unit-detail-field">
                        <span>{locale === "tr" ? "Tutar" : "Amount"}</span>
                        <input
                          inputMode="decimal"
                          value={item.amount ?? ""}
                          onChange={(e) =>
                            updateInstallment(item.id, {
                              amount: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        />
                      </label>
                      <label className="unit-detail-field">
                        <span>{locale === "tr" ? "Vade" : "Due date"}</span>
                        <input
                          type="date"
                          value={item.dueDate || ""}
                          onChange={(e) => updateInstallment(item.id, { dueDate: e.target.value })}
                        />
                      </label>
                      <FieldSelect
                        label={locale === "tr" ? "Durum" : "Status"}
                        value={item.status}
                        onChange={(value) => updateInstallment(item.id, { status: value as PaymentStatus })}
                        options={PAYMENT_STATUSES}
                        labelFor={(value) => paymentLabel(value, locale)}
                      />
                      <button type="button" onClick={() => removeInstallment(item.id)}>
                        {locale === "tr" ? "Sil" : "Delete"}
                      </button>
                    </div>
                  ))}

                  {installments.length === 0 ? (
                    <div className="unit-detail-empty">
                      {locale === "tr" ? "Henüz ödeme satırı yok." : "No payment rows yet."}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <h2>{locale === "tr" ? "Bağlantılar ve kiralama" : "Utilities and rental"}</h2>
                </div>

                <div className="unit-detail-mini-grid">
                  <FieldSelect
                    label={locale === "tr" ? "Elektrik" : "Electricity"}
                    value={electricityProvider}
                    onChange={(value) => setElectricityProvider(value as ElectricityProvider)}
                    options={ELECTRICITY_PROVIDERS}
                    labelFor={(value) => electricityLabel(value, locale)}
                  />
                  <FieldSelect
                    label={locale === "tr" ? "Su erişimi" : "Water access"}
                    value={waterAccessStatus}
                    onChange={(value) => setWaterAccessStatus(value as WaterAccessStatus)}
                    options={WATER_ACCESS_STATUSES}
                    labelFor={(value) => waterLabel(value, locale)}
                  />
                  <FieldSelect
                    label={locale === "tr" ? "Kiralama paketi" : "Rental package"}
                    value={rentalPackage}
                    onChange={(value) => setRentalPackage(value as RentalPackage)}
                    options={RENTAL_PACKAGES}
                    labelFor={(value) => rentalPackageLabel(value, locale)}
                  />
                  <FieldSelect
                    label={locale === "tr" ? "Kiralama durumu" : "Rental status"}
                    value={rentalStatus}
                    onChange={(value) => setRentalStatus(value as RentalStatus)}
                    options={RENTAL_STATUSES}
                    labelFor={(value) => rentalStatusLabel(value, locale)}
                  />
                </div>

                {rentalPackage === "CUSTOM" ? (
                  <FieldArea
                    label={locale === "tr" ? "Eklenen mobilyalar" : "Added furniture"}
                    value={customFurniture}
                    onChange={setCustomFurniture}
                    minRows={3}
                  />
                ) : null}
              </section>

              {isAdmin ? (
                <section className="unit-detail-panel unit-detail-danger">
                  <div className="unit-detail-panel-head">
                    <h2>{locale === "tr" ? "Admin iptal" : "Admin cancellation"}</h2>
                  </div>
                  <label className="unit-detail-danger-toggle">
                    <input
                      type="checkbox"
                      checked={isCanceled}
                      onChange={(e) => setIsCanceled(e.target.checked)}
                    />
                    {locale === "tr" ? "Bu unit iptal edildi" : "This unit is canceled"}
                  </label>
                  <FieldArea
                    label={locale === "tr" ? "İptal nedeni" : "Cancel reason"}
                    value={cancelReason}
                    onChange={setCancelReason}
                    minRows={3}
                  />
                </section>
              ) : null}
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

                {isAdmin ? (
                  <LogList
                    title={locale === "tr" ? "Müşteri kayıt geçmişi" : "Customer record history"}
                    logs={customerRecordLogs}
                    locale={locale}
                  />
                ) : null}
              </section>

              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <h2>{locale === "tr" ? "İletişim" : "Communication"}</h2>
                  <span className="unit-detail-muted">
                    {unit.customer.email || unit.customer.phone || "-"}
                  </span>
                </div>

                <FieldArea
                  label={locale === "tr" ? "Mesaj" : "Message"}
                  value={communicationMessage}
                  onChange={setCommunicationMessage}
                  minRows={4}
                />

                {communicationNotice ? (
                  <div className="unit-detail-empty">{communicationNotice}</div>
                ) : null}

                <div className="unit-detail-contact-actions">
                  <button
                    type="button"
                    onClick={() => contactCustomer("EMAIL")}
                    disabled={
                      !unit.customer.email ||
                      !communicationMessage.trim() ||
                      Boolean(communicationSending)
                    }
                  >
                    {communicationSending === "EMAIL"
                      ? locale === "tr" ? "Gönderiliyor..." : "Sending..."
                      : locale === "tr" ? "E-posta gönder" : "Send email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => contactCustomer("WHATSAPP")}
                    disabled={
                      !unit.customer.phone ||
                      !communicationMessage.trim() ||
                      Boolean(communicationSending)
                    }
                  >
                    {communicationSending === "WHATSAPP" ? "..." : "WhatsApp"}
                  </button>
                </div>
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
