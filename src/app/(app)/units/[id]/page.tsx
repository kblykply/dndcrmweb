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
type CustomerComplaintStatus = "UNDONE" | "DONE";
type ElectricityProvider = "UNKNOWN" | "TIPTEK" | "DND";
type WaterAccessStatus = "UNKNOWN" | "ON" | "OFF";
type RentalPackage = "FULL_FURNISHED" | "NOT_INTERESTED" | "CUSTOM";
type RentalStatus = "SHORT_TERM" | "LONG_TERM" | "DND_UNITS" | "NOT_INTERESTED";
type LogSection =
  | "UNIT_INFORMATION"
  | "CUSTOMER_RECORDS"
  | "ACCOUNTING"
  | "UTILITY"
  | "RENTAL"
  | "ADMIN"
  | "COMMUNICATION";

type CustomerComplaintRow = {
  id: string;
  complaint: string;
  solution: string;
  status: CustomerComplaintStatus;
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
  electricityProvider?: ElectricityProvider | string;
  waterAccessStatus?: WaterAccessStatus | string;
  rentalPackage?: RentalPackage | string;
  customFurniture?: string | null;
  rentalStatus?: RentalStatus | string;
  createdAt?: string;
  updatedAt?: string;
  customer: UnitCustomer;
  previousCustomer?: UnitCustomer | null;
  logs?: UnitLog[];
};

const DELIVERY_STATUSES: UnitDeliveryStatus[] = [
  "NOT_READY",
  "READY_TO_DELIVER",
  "DELIVERED",
];

const COMPANY_STATUSES: UnitCompanyStatus[] = ["UNKNOWN", "DND", "OTHER"];
const PAYMENT_STATUSES: PaymentStatus[] = ["UNPAID", "PAID"];
const COMPLAINT_STATUSES: CustomerComplaintStatus[] = ["UNDONE", "DONE"];
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
  if (status === "TIPTEK") return "Kiptek";
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

function complaintStatusLabel(status: string | undefined, locale: string) {
  return status === "DONE"
    ? locale === "tr" ? "Tamamlandı" : "Done"
    : locale === "tr" ? "Tamamlanmadı" : "Undone";
}

function paymentTone(status: string | undefined) {
  return status === "PAID" ? "success" : "warning";
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
  if (field === "customerComplaint") {
    const rows = normalizeCustomerComplaints(value);
    if (rows.length === 0) return locale === "tr" ? "Boş" : "Empty";

    return rows
      .map(
        (row, index) =>
          `${index + 1}. ${row.complaint || "-"} / ${locale === "tr" ? "Çözüm" : "Solution"}: ${
            row.solution || "-"
          } / ${complaintStatusLabel(row.status, locale)}`,
      )
      .join("\n");
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

function newCustomerComplaint(index: number): CustomerComplaintRow {
  return {
    id: `complaint-${Date.now()}-${index}`,
    complaint: "",
    solution: "",
    status: "UNDONE",
  };
}

function normalizeCustomerComplaints(value?: string | null): CustomerComplaintRow[] {
  const raw = cleanText(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((row, index) => ({
        id: cleanText(String(row?.id || "")) || `complaint-${index}`,
        complaint: cleanText(String(row?.complaint || "")),
        solution: cleanText(String(row?.solution || "")),
        status: row?.status === "DONE" ? ("DONE" as const) : ("UNDONE" as const),
      }))
      .filter((row) => row.complaint || row.solution);
  } catch {
    return [
      {
        id: "complaint-legacy-0",
        complaint: raw,
        solution: "",
        status: "UNDONE",
      },
    ];
  }
}

function serializeCustomerComplaints(rows: CustomerComplaintRow[]) {
  const cleaned = rows
    .map((row, index) => ({
      id: cleanText(row.id) || `complaint-${index}`,
      complaint: cleanText(row.complaint),
      solution: cleanText(row.solution),
      status: row.status === "DONE" ? "DONE" : "UNDONE",
    }))
    .filter((row) => row.complaint || row.solution);

  return cleaned.length ? JSON.stringify(cleaned) : "";
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labelFor: (value: string) => string;
  disabled?: boolean;
}) {
  return (
    <label className="unit-detail-field">
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFor(option)}
          </option>
        ))}
      </select>
    </label>
  );
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
                {locale === "tr" ? "Değiştiren" : "Changed by"}:{" "}
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

function communicationTypeLabel(field: string, locale: string) {
  if (field === "EMAIL") return locale === "tr" ? "E-posta" : "Email";
  if (field === "WHATSAPP") return "WhatsApp";
  return fieldLabel(field, locale);
}

function CommunicationLogList({
  logs,
  locale,
}: {
  logs: UnitLog[];
  locale: string;
}) {
  return (
    <div className="unit-detail-communication-history">
      <div className="unit-detail-subhead">
        <span>{locale === "tr" ? "İletişim geçmişi" : "Communication history"}</span>
        <span className="unit-detail-muted">
          {logs.length} {locale === "tr" ? "mesaj" : "messages"}
        </span>
      </div>

      {logs.length > 0 ? (
        <div className="unit-detail-communication-list">
          {logs.map((log) => (
            <div key={log.id} className="unit-detail-communication-row">
              <div className="unit-detail-communication-top">
                <span
                  className={`unit-detail-message-type ${
                    log.field === "EMAIL" ? "email" : "whatsapp"
                  }`}
                >
                  {communicationTypeLabel(log.field, locale)}
                </span>
                <span className="unit-detail-muted">
                  {formatDate(log.createdAt, locale)}
                </span>
              </div>

              <div className="unit-detail-communication-meta">
                {locale === "tr" ? "Gönderen" : "Sent by"}:{" "}
                <strong>{log.createdBy?.name || (locale === "tr" ? "Sistem" : "System")}</strong>
              </div>

              <p className="unit-detail-communication-message">
                {displayValue(log.field, log.newValue, locale)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="unit-detail-empty">
          {locale === "tr"
            ? "Henüz e-posta veya WhatsApp mesaj kaydı yok."
            : "No email or WhatsApp message history yet."}
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
  const [customerComplaints, setCustomerComplaints] = useState<CustomerComplaintRow[]>([]);
  const [unitComplaint, setUnitComplaint] = useState("");
  const [isCanceled, setIsCanceled] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [kdvStatus, setKdvStatus] = useState<PaymentStatus>("UNPAID");
  const [trafoStatus, setTrafoStatus] = useState<PaymentStatus>("UNPAID");
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
  const [communicationAttachment, setCommunicationAttachment] = useState<File | null>(null);
  const [communicationAttachmentKey, setCommunicationAttachmentKey] = useState(0);
  const [communicationSending, setCommunicationSending] = useState<"" | "EMAIL" | "WHATSAPP">("");
  const [communicationNotice, setCommunicationNotice] = useState("");

  const isAdmin = me?.role === "ADMIN" || me?.role === "PREVIEW";
  const canCancelUnit = isAdmin || me?.role === "AFTERSALES";

  const logs = useMemo(() => unit?.logs || [], [unit?.logs]);
  const unitInformationLogs = useMemo(
    () => logs.filter((log) => log.section === "UNIT_INFORMATION"),
    [logs],
  );
  const customerRecordLogs = useMemo(
    () => logs.filter((log) => log.section === "CUSTOMER_RECORDS"),
    [logs],
  );
  const customFurnitureLogs = useMemo(
    () => logs.filter((log) => log.field === "customFurniture"),
    [logs],
  );
  const communicationLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          log.section === "COMMUNICATION" ||
          log.field === "EMAIL" ||
          log.field === "WHATSAPP",
      ),
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
      serializeCustomerComplaints(customerComplaints) !==
        serializeCustomerComplaints(normalizeCustomerComplaints(unit.customerComplaint)) ||
      cleanText(unitComplaint) !== cleanText(unit.unitComplaint) ||
      (canCancelUnit && isCanceled !== Boolean(unit.isCanceled)) ||
      (canCancelUnit && cleanText(cancelReason) !== cleanText(unit.cancelReason)) ||
      kdvStatus !== (unit.kdvStatus || "UNPAID") ||
      trafoStatus !== (unit.trafoStatus || "UNPAID") ||
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
    customerComplaints,
    customerRequest,
    deliveryStatus,
    electricityProvider,
    generalInfo,
    canCancelUnit,
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
    setCustomerComplaints(normalizeCustomerComplaints(next.customerComplaint));
    setUnitComplaint(next.unitComplaint || "");
    setIsCanceled(Boolean(next.isCanceled));
    setCancelReason(next.cancelReason || "");
    setKdvStatus((next.kdvStatus as PaymentStatus) || "UNPAID");
    setTrafoStatus((next.trafoStatus as PaymentStatus) || "UNPAID");
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
        customerComplaint: serializeCustomerComplaints(customerComplaints),
        unitComplaint,
        kdvStatus,
        trafoStatus,
        electricityProvider,
        waterAccessStatus,
        rentalPackage,
        customFurniture,
        rentalStatus,
      };

      if (canCancelUnit) {
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

  function updateCanceled(nextCanceled: boolean) {
    setIsCanceled(nextCanceled);
  }

  function updateCustomerComplaint(id: string, patch: Partial<CustomerComplaintRow>) {
    setCustomerComplaints((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeCustomerComplaint(id: string) {
    setCustomerComplaints((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCommunicationAttachment() {
    setCommunicationAttachment(null);
    setCommunicationAttachmentKey((key) => key + 1);
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
        const body = new FormData();
        body.set("subject", `${unit.unitNumber} - ${projectLabel(unit.project)}`);
        body.set("message", message);

        if (communicationAttachment) {
          body.set("file", communicationAttachment);
        }

        const updated = (await authedFetch(`/units/${unit.id}/send-email`, {
          method: "POST",
          body,
        })) as UnitDetail;

        setUnit(updated);
        applyForm(updated);
        setCommunicationMessage("");
        clearCommunicationAttachment();
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
          gap: 18px;
          min-width: 0;
        }

        .unit-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          padding: 18px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .unit-detail-title {
          display: grid;
          gap: 8px;
          min-width: min(100%, 440px);
        }

        .unit-detail-title h1 {
          font-size: 34px;
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
          justify-content: flex-end;
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

        .unit-detail-save-note {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
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
          position: relative;
          overflow: hidden;
        }

        .unit-detail-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(15, 23, 42, 0.035), transparent 44%);
          pointer-events: none;
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
          position: relative;
          z-index: 1;
        }

        .unit-detail-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
          gap: 16px;
          align-items: start;
        }

        .unit-detail-column {
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .unit-detail-side {
          position: sticky;
          top: 14px;
        }

        .unit-detail-panel {
          display: grid;
          gap: 16px;
          padding: 16px;
          overflow: hidden;
        }

        .unit-detail-panel-head,
        .unit-detail-subhead,
        .unit-detail-log-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .unit-detail-panel-head h2 {
          font-size: 18px;
          line-height: 1.2;
        }

        .unit-detail-panel-title {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .unit-detail-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .unit-detail-side-info-grid {
          grid-template-columns: 1fr;
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

        .unit-detail-badge-strip,
        .unit-detail-summary-grid {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .unit-detail-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
        }

        .unit-detail-summary-card {
          display: grid;
          gap: 4px;
          min-width: 0;
          padding: 12px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-summary-card span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .unit-detail-summary-card strong {
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .unit-detail-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 28px;
          max-width: 100%;
          padding: 0 10px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .unit-detail-pill::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--text-muted);
          flex: 0 0 auto;
        }

        .unit-detail-pill.success::before {
          background: var(--success);
        }

        .unit-detail-pill.warning::before {
          background: var(--warning);
        }

        .unit-detail-pill.info::before {
          background: var(--info);
        }

        .unit-detail-status-picker {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .unit-detail-status-choice {
          min-height: 42px;
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-weight: 900;
          padding: 0 10px;
          white-space: normal;
          line-height: 1.2;
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
          min-width: 0;
        }

        .unit-detail-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .unit-detail-field input,
        .unit-detail-field select {
          width: 100%;
          min-width: 0;
        }

        .unit-detail-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .unit-detail-complaints {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .unit-detail-complaint-list {
          display: grid;
          gap: 10px;
        }

        .unit-detail-complaint-row {
          display: grid;
          gap: 10px;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-complaint-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
        }

        .unit-detail-complaint-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 40px;
          gap: 8px;
          align-items: end;
        }

        .unit-detail-complaint-row textarea {
          min-height: 72px;
        }

        .unit-detail-icon-button {
          width: 38px;
          height: 38px;
          min-height: 38px;
          border-radius: 8px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--danger);
          font-size: 24px;
          font-weight: 900;
          line-height: 1;
          background: color-mix(in srgb, var(--danger) 7%, var(--surface));
          border-color: color-mix(in srgb, var(--danger) 22%, var(--stroke));
        }

        .unit-detail-icon-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .unit-detail-contact-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .unit-detail-attachment-field {
          display: grid;
          gap: 7px;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-attachment-field > span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
        }

        .unit-detail-attachment-field input {
          width: 100%;
          min-width: 0;
        }

        .unit-detail-attachment-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .unit-detail-attachment-meta button {
          min-height: 30px;
          padding: 0 10px;
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 900;
        }

        .unit-detail-contact-actions button,
        .unit-detail-add-row {
          min-height: 38px;
          border-radius: 8px;
          padding: 0 12px;
          font-weight: 900;
        }

        .unit-detail-add-row {
          background: var(--surface);
        }

        .unit-detail-notice {
          padding: 10px 12px;
          border: 1px solid color-mix(in srgb, var(--success) 28%, var(--stroke));
          border-radius: 8px;
          background: color-mix(in srgb, var(--success) 8%, var(--surface));
          color: var(--text-primary);
          font-weight: 800;
        }

        .unit-detail-communication-history {
          display: grid;
          gap: 10px;
          border-top: 1px solid var(--stroke);
          padding-top: 12px;
        }

        .unit-detail-communication-list {
          display: grid;
          gap: 8px;
          max-height: 360px;
          overflow: auto;
          padding-right: 2px;
        }

        .unit-detail-communication-row {
          display: grid;
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-communication-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .unit-detail-message-type {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 10px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          color: var(--text-primary);
          background: var(--surface);
          font-size: 12px;
          font-weight: 900;
        }

        .unit-detail-message-type.email {
          border-color: color-mix(in srgb, var(--info) 26%, var(--stroke));
          background: color-mix(in srgb, var(--info) 8%, var(--surface));
        }

        .unit-detail-message-type.whatsapp {
          border-color: color-mix(in srgb, var(--success) 26%, var(--stroke));
          background: color-mix(in srgb, var(--success) 8%, var(--surface));
        }

        .unit-detail-communication-meta {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
        }

        .unit-detail-communication-meta strong {
          color: var(--text-primary);
          font-weight: 900;
        }

        .unit-detail-communication-message {
          margin: 0;
          padding: 10px;
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
          font-size: 13px;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .unit-detail-cancel-strip {
          gap: 12px;
          padding: 14px;
          border-color: color-mix(in srgb, var(--danger) 22%, var(--stroke));
          border-left: 3px solid color-mix(in srgb, var(--danger) 64%, var(--stroke));
          background: color-mix(in srgb, var(--danger) 3%, var(--surface));
        }

        .unit-detail-cancel-strip.active {
          background: color-mix(in srgb, var(--danger) 7%, var(--surface));
          border-color: color-mix(in srgb, var(--danger) 34%, var(--stroke));
        }

        .unit-detail-cancel-strip h2 {
          font-size: 15px;
        }

        .unit-detail-cancel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .unit-detail-cancel-badge {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          background: var(--surface);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .unit-detail-cancel-badge.danger {
          border-color: color-mix(in srgb, var(--danger) 28%, var(--stroke));
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          color: var(--danger);
        }

        .unit-detail-cancel-body {
          display: grid;
          grid-template-columns: minmax(250px, 340px) minmax(0, 1fr);
          gap: 10px;
          align-items: stretch;
        }

        .unit-detail-danger-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 58px;
          padding: 10px 12px;
          border: 1px solid color-mix(in srgb, var(--danger) 24%, var(--stroke));
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 900;
          cursor: pointer;
        }

        .unit-detail-danger-toggle input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .unit-detail-owner-note {
          display: grid;
          gap: 4px;
          padding: 10px 12px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .unit-detail-owner-note span,
        .unit-detail-owner-note small {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 850;
        }

        .unit-detail-toggle-switch {
          position: relative;
          width: 42px;
          height: 24px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: var(--surface-3);
          border: 1px solid var(--stroke);
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .unit-detail-toggle-switch::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          transition: transform 0.18s ease;
        }

        .unit-detail-danger-toggle input:checked + .unit-detail-toggle-switch {
          background: var(--danger);
          border-color: var(--danger);
        }

        .unit-detail-danger-toggle input:checked + .unit-detail-toggle-switch::after {
          transform: translateX(18px);
        }

        .unit-detail-toggle-copy {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .unit-detail-toggle-copy strong {
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.2;
        }

        .unit-detail-toggle-copy small {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.35;
        }

        .unit-detail-cancel-strip textarea {
          min-height: 72px;
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

          .unit-detail-side {
            position: static;
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
          .unit-detail-summary-grid,
          .unit-detail-contact-actions,
          .unit-detail-cancel-body,
          .unit-detail-complaint-grid,
          .unit-detail-complaint-actions,
          .unit-detail-diff {
            grid-template-columns: 1fr;
            width: 100%;
          }

          .unit-detail-header {
            padding: 14px;
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
          <span className="unit-detail-save-note">
            {isDirty
              ? locale === "tr" ? "Kaydedilmemiş değişiklik var" : "Unsaved changes"
              : locale === "tr" ? "Güncel" : "Up to date"}
          </span>
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
                  <div className="unit-detail-panel-title">
                    <h2>{locale === "tr" ? "Unit bilgileri" : "Unit information"}</h2>
                    <span className="unit-detail-muted">
                      {locale === "tr" ? "Teslim, firma ve unit notları" : "Delivery, company and unit notes"}
                    </span>
                  </div>
                  <span className="unit-detail-pill info">
                    {unitInformationLogs.length} {locale === "tr" ? "log" : "logs"}
                  </span>
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
                  <div className="unit-detail-panel-title">
                    <h2>{locale === "tr" ? "Muhasebe" : "Accounting"}</h2>
                    <span className="unit-detail-muted">
                      {locale === "tr"
                        ? "KDV ve trafo ödeme durumları"
                        : "KDV and trafo payment status"}
                    </span>
                  </div>
                  <div className="unit-detail-badge-strip">
                    <span className={`unit-detail-pill ${paymentTone(kdvStatus)}`}>
                      KDV {paymentLabel(kdvStatus, locale)}
                    </span>
                    <span className={`unit-detail-pill ${paymentTone(trafoStatus)}`}>
                      Trafo {paymentLabel(trafoStatus, locale)}
                    </span>
                  </div>
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
              </section>

              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <div className="unit-detail-panel-title">
                    <h2>{locale === "tr" ? "Bağlantılar ve kiralama" : "Utilities and rental"}</h2>
                    <span className="unit-detail-muted">
                      {electricityLabel(electricityProvider, locale)} / {waterLabel(waterAccessStatus, locale)}
                    </span>
                  </div>
                  <span className="unit-detail-pill info">
                    {rentalStatusLabel(rentalStatus, locale)}
                  </span>
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

                {isAdmin && (rentalPackage === "CUSTOM" || customFurnitureLogs.length > 0) ? (
                  <LogList
                    title={locale === "tr" ? "Eklenen mobilya geçmişi" : "Added furniture history"}
                    logs={customFurnitureLogs}
                    locale={locale}
                  />
                ) : null}
              </section>

              {canCancelUnit ? (
                <section className={`unit-detail-panel unit-detail-cancel-strip ${isCanceled ? "active" : ""}`}>
                  <div className="unit-detail-cancel-header">
                    <div className="unit-detail-panel-title">
                      <h2>{locale === "tr" ? "Unit iptal" : "Unit cancellation"}</h2>
                      <span className="unit-detail-muted">
                        {locale === "tr"
                          ? "Admin ve satış sonrası ekibi bu durumu güncelleyebilir."
                          : "Admin and aftersales can update this status."}
                      </span>
                    </div>
                    <span className={`unit-detail-cancel-badge ${isCanceled ? "danger" : ""}`}>
                      {isCanceled
                        ? locale === "tr" ? "İptal edildi" : "Canceled"
                        : locale === "tr" ? "Aktif unit" : "Active unit"}
                    </span>
                  </div>

                  <div className="unit-detail-cancel-body">
                    <label className="unit-detail-danger-toggle">
                      <input
                        type="checkbox"
                        checked={isCanceled}
                        onChange={(e) => updateCanceled(e.target.checked)}
                      />
                      <span className="unit-detail-toggle-switch" aria-hidden="true" />
                      <span className="unit-detail-toggle-copy">
                        <strong>{locale === "tr" ? "Unit iptal" : "Cancel unit"}</strong>
                        <small>
                          {locale === "tr"
                            ? "İptal edilen unit sahibi DND Cyprus olur."
                            : "Canceled units become owned by DND Cyprus."}
                        </small>
                      </span>
                    </label>

                    {isCanceled ? (
                      <div className="unit-detail-fields">
                        {unit.previousCustomer ? (
                          <div className="unit-detail-owner-note">
                            <span>{locale === "tr" ? "Önceki sahibi" : "Previous owner"}</span>
                            <strong>{unit.previousCustomer.fullName}</strong>
                            <small>
                              {[unit.previousCustomer.phone, unit.previousCustomer.email]
                                .filter(Boolean)
                                .join(" / ") || "-"}
                            </small>
                          </div>
                        ) : null}
                        <FieldArea
                          label={locale === "tr" ? "İptal nedeni" : "Cancel reason"}
                          value={cancelReason}
                          onChange={setCancelReason}
                          minRows={2}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="unit-detail-column unit-detail-side">
              <section className="unit-detail-panel">
                <div className="unit-detail-panel-head">
                  <div className="unit-detail-panel-title">
                    <h2>{locale === "tr" ? "Müşteri özeti" : "Customer summary"}</h2>
                    <span className="unit-detail-muted">
                      {unit.customer.owner?.name || (locale === "tr" ? "Sorumlu yok" : "No owner")}
                    </span>
                  </div>
                  <Link href={`/customers/${unit.customer.id}`} className="unit-detail-link">
                    {locale === "tr" ? "Kart" : "Card"}
                  </Link>
                </div>

                <div className="unit-detail-info-grid unit-detail-side-info-grid">
                  <div className="unit-detail-info-line">
                    <span>{locale === "tr" ? "Müşteri" : "Customer"}</span>
                    <strong>{unit.customer.fullName}</strong>
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
                  <div className="unit-detail-panel-title">
                    <h2>{locale === "tr" ? "Müşteri kayıtları" : "Customer records"}</h2>
                    <span className="unit-detail-muted">
                      {locale === "tr" ? "Talep, şikayet ve genel notlar" : "Requests, complaints and general notes"}
                    </span>
                  </div>
                  <span className="unit-detail-pill info">
                    {customerRecordLogs.length} {locale === "tr" ? "log" : "logs"}
                  </span>
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
                  <div className="unit-detail-complaints">
                    <div className="unit-detail-subhead">
                      <span>{locale === "tr" ? "Müşteri şikayetleri" : "Customer complaints"}</span>
                      <button
                        type="button"
                        className="unit-detail-add-row"
                        onClick={() =>
                          setCustomerComplaints((prev) => [
                            ...prev,
                            newCustomerComplaint(prev.length),
                          ])
                        }
                      >
                        {locale === "tr" ? "Şikayet ekle" : "Add complaint"}
                      </button>
                    </div>

                    {customerComplaints.length > 0 ? (
                      <div className="unit-detail-complaint-list">
                        {customerComplaints.map((item) => (
                          <div key={item.id} className="unit-detail-complaint-row">
                            <div className="unit-detail-complaint-grid">
                              <FieldArea
                                label={locale === "tr" ? "Şikayet" : "Complaint"}
                                value={item.complaint}
                                onChange={(value) =>
                                  updateCustomerComplaint(item.id, { complaint: value })
                                }
                                minRows={3}
                              />
                              <FieldArea
                                label={locale === "tr" ? "Çözüm" : "Solution"}
                                value={item.solution}
                                onChange={(value) =>
                                  updateCustomerComplaint(item.id, { solution: value })
                                }
                                minRows={3}
                              />
                            </div>
                            <div className="unit-detail-complaint-actions">
                              <FieldSelect
                                label={locale === "tr" ? "Durum" : "Status"}
                                value={item.status}
                                onChange={(value) =>
                                  updateCustomerComplaint(item.id, {
                                    status: value as CustomerComplaintStatus,
                                  })
                                }
                                options={COMPLAINT_STATUSES}
                                labelFor={(value) => complaintStatusLabel(value, locale)}
                              />
                              <button
                                type="button"
                                className="unit-detail-icon-button"
                                aria-label={locale === "tr" ? "Şikayeti sil" : "Delete complaint"}
                                title={locale === "tr" ? "Şikayeti sil" : "Delete complaint"}
                                onClick={() => removeCustomerComplaint(item.id)}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="unit-detail-empty">
                        {locale === "tr" ? "Henüz şikayet yok." : "No complaints yet."}
                      </div>
                    )}
                  </div>
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
                  <div className="unit-detail-panel-title">
                    <h2>{locale === "tr" ? "İletişim" : "Communication"}</h2>
                    <span className="unit-detail-muted">
                      {unit.customer.email || unit.customer.phone || "-"}
                    </span>
                  </div>
                </div>

                <FieldArea
                  label={locale === "tr" ? "Mesaj" : "Message"}
                  value={communicationMessage}
                  onChange={setCommunicationMessage}
                  minRows={4}
                />

                <label className="unit-detail-attachment-field">
                  <span>
                    {locale === "tr" ? "E-posta eki" : "Email attachment"}{" "}
                    <span className="unit-detail-muted">
                      ({locale === "tr" ? "isteğe bağlı" : "optional"})
                    </span>
                  </span>
                  <input
                    key={communicationAttachmentKey}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;

                      if (file && file.size > 10 * 1024 * 1024) {
                        setErr(
                          locale === "tr"
                            ? "Ek dosya 10MB veya daha küçük olmalı."
                            : "Attachment must be 10MB or smaller.",
                        );
                        clearCommunicationAttachment();
                        return;
                      }

                      setErr(null);
                      setCommunicationAttachment(file);
                    }}
                  />
                  <div className="unit-detail-attachment-meta">
                    <span>
                      {communicationAttachment
                        ? communicationAttachment.name
                        : locale === "tr"
                          ? "PDF, Word, Excel, resim veya metin dosyası"
                          : "PDF, Word, Excel, image or text document"}
                    </span>
                    {communicationAttachment ? (
                      <button type="button" onClick={clearCommunicationAttachment}>
                        {locale === "tr" ? "Kaldır" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </label>

                {communicationNotice ? (
                  <div className="unit-detail-notice">{communicationNotice}</div>
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

                <CommunicationLogList logs={communicationLogs} locale={locale} />
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
