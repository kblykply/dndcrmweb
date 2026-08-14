"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type BulkRecipient = {
  customerId: string;
  fullName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  language?: string | null;
  nationality?: string | null;
  owner?: {
    id: string;
    name: string;
    email?: string | null;
    role?: string | null;
  } | null;
  units: Array<{
    id: string;
    project: ProjectType;
    unitNumber: string;
    deliveryStatus: UnitDeliveryStatus;
  }>;
};

type UnitDeliveryStatus = "NOT_READY" | "READY_TO_DELIVER" | "DELIVERED";
type TemplateLanguage = "tr" | "en" | "ru";
type TemplateKey =
  | "DELIVERY_UPDATE"
  | "DOCUMENT_REQUEST"
  | "PROJECT_UPDATE"
  | "PAYMENT_ACCOUNTING"
  | "AFTERSALES_NOTICE";

type BulkPreview = {
  project: ProjectType;
  projectLabel: string;
  filters?: {
    deliveryStatus?: UnitDeliveryStatus | null;
    ownerId?: string | null;
    language?: string | null;
    nationality?: string | null;
    q?: string | null;
    selectedCustomerIds?: string[];
  };
  totalUnits: number;
  uniqueCustomers: number;
  withEmailCount: number;
  missingEmailCount: number;
  recipients: BulkRecipient[];
  missingEmail: BulkRecipient[];
  facets?: {
    languages: string[];
    nationalities: string[];
  };
};

type BulkResult = {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  project: ProjectType;
  projectLabel: string;
  subject: string;
  sentAt: string;
  attempted: number;
  successCount: number;
  failedCount: number;
  skippedMissingEmailCount: number;
  successes: Array<{
    customerId: string;
    name: string;
    email: string;
    units: string[];
  }>;
  failures: Array<{
    customerId: string;
    name: string;
    email: string;
    units: string[];
    error: string;
  }>;
  missingEmail: BulkRecipient[];
};

type CampaignSummary = {
  id: string;
  name: string;
  project: ProjectType;
  subject: string;
  status: "SENDING" | "COMPLETED" | "PARTIAL" | "FAILED";
  totalUnits: number;
  uniqueCustomers: number;
  attemptedCount: number;
  successCount: number;
  failedCount: number;
  missingEmailCount: number;
  attachmentFileName?: string | null;
  sentAt: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email?: string | null;
    role?: string | null;
  } | null;
};

type CampaignRecipient = {
  id: string;
  customerId?: string | null;
  customerName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerRole?: string | null;
  unitNumbers: string;
  status: "SENT" | "FAILED" | "MISSING_EMAIL";
  error?: string | null;
  sentAt?: string | null;
};

type CampaignDetail = CampaignSummary & {
  message: string;
  recipients: CampaignRecipient[];
};

type BulkEmailReport = {
  dateFrom: string;
  dateTo: string;
  project?: ProjectType | null;
  totals: {
    campaigns: number;
    attempted: number;
    sent: number;
    failed: number;
    missingEmail: number;
    units: number;
  };
  byProject: Array<{
    project: ProjectType;
    projectLabel: string;
    campaigns: number;
    attempted: number;
    sent: number;
    failed: number;
    missingEmail: number;
  }>;
  byStatus: Array<{
    status: CampaignSummary["status"];
    count: number;
  }>;
  campaigns: CampaignSummary[];
  failedRecipients: Array<{
    campaignId: string;
    campaignName: string;
    project: ProjectType;
    projectLabel: string;
    sentAt: string;
    customerId?: string | null;
    customerName: string;
    email?: string | null;
    unitNumbers: string;
    error?: string | null;
  }>;
};

type AttachmentOption = {
  id: string;
  kind: "PROJECT_DOCUMENT" | "CUSTOMER_DOCUMENT";
  label: string;
  fileName: string;
  source: string;
  project?: ProjectType;
  customerId?: string;
  customerName?: string;
  units?: string[];
  mimeType?: string | null;
  size?: number | null;
  createdAt?: string | null;
};

type AttachmentOptions = {
  project: ProjectType;
  projectLabel: string;
  projectDocuments: AttachmentOption[];
  customerDocuments: AttachmentOption[];
};

type UserOption = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

const PROJECTS: ProjectType[] = [
  "LA_JOYA",
  "LA_JOYA_PERLA",
  "LA_JOYA_PERLA_II",
  "LAGOON_VERDE",
];

const PROJECT_LABELS: Record<ProjectType, string> = {
  LA_JOYA: "La Joya",
  LA_JOYA_PERLA: "La Joya Perla",
  LA_JOYA_PERLA_II: "La Joya Perla II",
  LAGOON_VERDE: "Lagoon Verde",
};

const DELIVERY_STATUSES: Array<UnitDeliveryStatus | ""> = [
  "",
  "DELIVERED",
  "READY_TO_DELIVER",
  "NOT_READY",
];

const TEMPLATE_LANGUAGES: TemplateLanguage[] = ["tr", "en", "ru"];

const MAIL_TEMPLATES: Record<
  TemplateKey,
  {
    label: Record<TemplateLanguage, string>;
    campaignName: Record<TemplateLanguage, string>;
    subject: Record<TemplateLanguage, string>;
    message: Record<TemplateLanguage, string>;
  }
> = {
  DELIVERY_UPDATE: {
    label: {
      tr: "Teslimat bilgilendirme",
      en: "Delivery update",
      ru: "Информация о передаче",
    },
    campaignName: {
      tr: "{project} Teslimat Bilgilendirme",
      en: "{project} Delivery Update",
      ru: "{project} - Информация о передаче",
    },
    subject: {
      tr: "{project} teslimat bilgilendirmesi",
      en: "{project} delivery update",
      ru: "{project}: информация о передаче",
    },
    message: {
      tr: "Merhaba {customerName},\n\n{project} projesindeki {units} unitiniz için teslimat süreciyle ilgili bilgilendirmemizi paylaşmak isteriz.\n\nDetaylar ve sonraki adımlar için ekibimiz sizinle iletişimde olacaktır.\n\nSorumlu: {salesName}\n\nSaygılarımızla,\nDND Cyprus",
      en: "Dear {customerName},\n\nWe would like to share an update about the delivery process for your unit(s) {units} in {project}.\n\nOur team will stay in touch with you regarding details and next steps.\n\nResponsible person: {salesName}\n\nKind regards,\nDND Cyprus",
      ru: "Уважаемый/ая {customerName},\n\nХотим сообщить вам информацию о процессе передачи вашей недвижимости {units} в проекте {project}.\n\nНаша команда свяжется с вами по деталям и следующим шагам.\n\nОтветственный: {salesName}\n\nС уважением,\nDND Cyprus",
    },
  },
  DOCUMENT_REQUEST: {
    label: {
      tr: "Evrak talebi",
      en: "Document request",
      ru: "Запрос документов",
    },
    campaignName: {
      tr: "{project} Evrak Talebi",
      en: "{project} Document Request",
      ru: "{project} - Запрос документов",
    },
    subject: {
      tr: "{project} evrak talebi",
      en: "{project} document request",
      ru: "{project}: запрос документов",
    },
    message: {
      tr: "Merhaba {customerName},\n\n{project} projesindeki {units} unitiniz için dosyamızı güncellememiz gerekiyor.\n\nLütfen gerekli evrakları bizimle paylaşmanızı rica ederiz.\n\nŞirket / kayıt adı: {companyName}\nSorumlu: {salesName}\n\nSaygılarımızla,\nDND Cyprus",
      en: "Dear {customerName},\n\nWe need to update our records for your unit(s) {units} in {project}.\n\nPlease share the required documents with our team.\n\nCompany / registered name: {companyName}\nResponsible person: {salesName}\n\nKind regards,\nDND Cyprus",
      ru: "Уважаемый/ая {customerName},\n\nНам необходимо обновить документы по вашей недвижимости {units} в проекте {project}.\n\nПросим вас отправить необходимые документы нашей команде.\n\nКомпания / имя в системе: {companyName}\nОтветственный: {salesName}\n\nС уважением,\nDND Cyprus",
    },
  },
  PROJECT_UPDATE: {
    label: {
      tr: "Proje güncellemesi",
      en: "Project update",
      ru: "Обновление проекта",
    },
    campaignName: {
      tr: "{project} Proje Güncellemesi",
      en: "{project} Project Update",
      ru: "{project} - Обновление проекта",
    },
    subject: {
      tr: "{project} proje güncellemesi",
      en: "{project} project update",
      ru: "{project}: обновление проекта",
    },
    message: {
      tr: "Merhaba {customerName},\n\n{project} projesiyle ilgili güncel bilgilendirmemizi paylaşmak isteriz.\n\nBu bilgilendirme {units} unitiniz için kayıt altına alınmıştır.\n\nSorumlu: {salesName}\n\nSaygılarımızla,\nDND Cyprus",
      en: "Dear {customerName},\n\nWe would like to share the latest update about {project}.\n\nThis notice is recorded for your unit(s): {units}.\n\nResponsible person: {salesName}\n\nKind regards,\nDND Cyprus",
      ru: "Уважаемый/ая {customerName},\n\nХотим поделиться актуальной информацией по проекту {project}.\n\nЭто уведомление относится к вашей недвижимости: {units}.\n\nОтветственный: {salesName}\n\nС уважением,\nDND Cyprus",
    },
  },
  PAYMENT_ACCOUNTING: {
    label: {
      tr: "Ödeme / muhasebe bilgilendirmesi",
      en: "Payment / accounting notice",
      ru: "Финансовое уведомление",
    },
    campaignName: {
      tr: "{project} Ödeme Bilgilendirmesi",
      en: "{project} Payment Notice",
      ru: "{project} - Финансовое уведомление",
    },
    subject: {
      tr: "{project} ödeme / muhasebe bilgilendirmesi",
      en: "{project} payment / accounting notice",
      ru: "{project}: финансовое уведомление",
    },
    message: {
      tr: "Merhaba {customerName},\n\n{project} projesindeki {units} unitiniz ile ilgili ödeme / muhasebe bilgilendirmemizi paylaşmak isteriz.\n\nDetayları kontrol edip gerekli durumda bizimle iletişime geçebilirsiniz.\n\nSorumlu: {salesName}\n\nSaygılarımızla,\nDND Cyprus",
      en: "Dear {customerName},\n\nWe would like to share a payment / accounting notice regarding your unit(s) {units} in {project}.\n\nPlease review the details and contact us if you need assistance.\n\nResponsible person: {salesName}\n\nKind regards,\nDND Cyprus",
      ru: "Уважаемый/ая {customerName},\n\nХотим направить вам финансовое уведомление по вашей недвижимости {units} в проекте {project}.\n\nПожалуйста, ознакомьтесь с деталями и свяжитесь с нами при необходимости.\n\nОтветственный: {salesName}\n\nС уважением,\nDND Cyprus",
    },
  },
  AFTERSALES_NOTICE: {
    label: {
      tr: "Satış sonrası servis duyurusu",
      en: "After sales service notice",
      ru: "Уведомление послепродажного сервиса",
    },
    campaignName: {
      tr: "{project} Satış Sonrası Duyurusu",
      en: "{project} After Sales Notice",
      ru: "{project} - Послепродажное уведомление",
    },
    subject: {
      tr: "{project} satış sonrası servis duyurusu",
      en: "{project} after sales service notice",
      ru: "{project}: уведомление послепродажного сервиса",
    },
    message: {
      tr: "Merhaba {customerName},\n\n{project} projesindeki {units} unitiniz için satış sonrası servis ekibimizin duyurusunu paylaşmak isteriz.\n\nTalep ve sorularınız için bizimle iletişime geçebilirsiniz.\n\nSorumlu: {salesName}\n\nSaygılarımızla,\nDND Cyprus",
      en: "Dear {customerName},\n\nWe would like to share an after sales service notice for your unit(s) {units} in {project}.\n\nYou can contact us for requests and questions.\n\nResponsible person: {salesName}\n\nKind regards,\nDND Cyprus",
      ru: "Уважаемый/ая {customerName},\n\nХотим поделиться уведомлением послепродажного сервиса по вашей недвижимости {units} в проекте {project}.\n\nВы можете связаться с нами по любым вопросам и запросам.\n\nОтветственный: {salesName}\n\nС уважением,\nDND Cyprus",
    },
  },
};

function projectLabel(project: ProjectType) {
  return PROJECT_LABELS[project];
}

function deliveryLabel(status: UnitDeliveryStatus | "", isTr: boolean) {
  if (!status) return isTr ? "Tüm teslim durumları" : "All delivery statuses";
  if (status === "DELIVERED") return isTr ? "Teslim edildi" : "Delivered";
  if (status === "READY_TO_DELIVER") {
    return isTr ? "Teslime hazır" : "Ready to deliver";
  }
  return isTr ? "Henüz hazır değil" : "Not ready yet";
}

function formatError(error: unknown) {
  const raw = String((error as any)?.message || error || "Request failed");

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.message)) return parsed.message.join(", ");
    if (parsed?.message) return String(parsed.message);
    if (parsed?.error) return String(parsed.error);
  } catch {
    // Plain text errors are fine.
  }

  return raw;
}

function unitsText(recipient: BulkRecipient) {
  return recipient.units.map((unit) => unit.unitNumber).join(", ");
}

function customerName(recipient: BulkRecipient) {
  return recipient.fullName || recipient.companyName || "-";
}

function renderPreviewText(
  text: string,
  recipient: BulkRecipient | null,
  project: ProjectType,
) {
  if (!text) return "";

  const units = recipient ? unitsText(recipient) : "{units}";
  const name = recipient ? customerName(recipient) : "{customerName}";
  const companyName = recipient?.companyName || recipient?.fullName || "{companyName}";
  const salesName = recipient?.owner?.name || "DND Cyprus";

  return text
    .replace(/\{customerName\}/g, name)
    .replace(/\{project\}/g, projectLabel(project))
    .replace(/\{units\}/g, units)
    .replace(/\{salesName\}/g, salesName)
    .replace(/\{companyName\}/g, companyName);
}

function roleAllowed(role?: string | null) {
  return (
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "AFTERSALES" ||
    role === "PREVIEW"
  );
}

function campaignStatusLabel(status: CampaignSummary["status"], isTr: boolean) {
  if (status === "COMPLETED") return isTr ? "Tamamlandı" : "Completed";
  if (status === "PARTIAL") return isTr ? "Kısmi başarılı" : "Partial";
  if (status === "FAILED") return isTr ? "Başarısız" : "Failed";
  return isTr ? "Gönderiliyor" : "Sending";
}

function recipientStatusLabel(status: CampaignRecipient["status"], isTr: boolean) {
  if (status === "SENT") return isTr ? "Gönderildi" : "Sent";
  if (status === "FAILED") return isTr ? "Hata" : "Failed";
  return isTr ? "Mail eksik" : "Missing email";
}

function formatBytes(size?: number | null) {
  if (!size || size <= 0) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function inputDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BulkEmailPage() {
  const { locale } = useLanguage();
  const isTr = locale === "tr";
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [project, setProject] = useState<ProjectType>("LA_JOYA");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(null);
  const [report, setReport] = useState<BulkEmailReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(inputDate());
  const [reportTo, setReportTo] = useState(inputDate());
  const [users, setUsers] = useState<UserOption[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<UnitDeliveryStatus | "">("");
  const [ownerId, setOwnerId] = useState("");
  const [language, setLanguage] = useState("");
  const [nationality, setNationality] = useState("");
  const [q, setQ] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [manualCustomerId, setManualCustomerId] = useState("");
  const [showMissingEmails, setShowMissingEmails] = useState(false);
  const [templateKey, setTemplateKey] = useState<TemplateKey>("DELIVERY_UPDATE");
  const [templateLanguage, setTemplateLanguage] = useState<TemplateLanguage>("tr");
  const [previewCustomerId, setPreviewCustomerId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentOptions, setAttachmentOptions] =
    useState<AttachmentOptions | null>(null);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSend = useMemo(
    () =>
      Boolean(selectedSendCount(preview, selectedCustomerIds)) &&
      subject.trim().length > 0 &&
      message.trim().length > 0 &&
      !sending &&
      me?.role !== "PREVIEW",
    [preview, selectedCustomerIds, subject, message, sending, me?.role],
  );

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadRecipients(project, { clearSelection: true });
    void loadCampaigns(project);
    void loadReport(project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, project, deliveryStatus, ownerId, language, nationality]);

  useEffect(() => {
    if (!mounted) return;
    void loadAttachmentOptions(project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mounted,
    project,
    deliveryStatus,
    ownerId,
    language,
    nationality,
    q,
    selectedCustomerIds.join(","),
  ]);

  const ownerOptions = useMemo(
    () =>
      users.filter((user) =>
        ["ADMIN", "MANAGER", "SALES", "AFTERSALES"].includes(String(user.role || "")),
      ),
    [users],
  );

  const selectedSet = useMemo(
    () => new Set(selectedCustomerIds),
    [selectedCustomerIds],
  );

  const selectedRecipients = useMemo(
    () =>
      (preview?.recipients || []).filter((recipient) =>
        selectedSet.has(recipient.customerId),
      ),
    [preview?.recipients, selectedSet],
  );

  const sendCount = selectedSendCount(preview, selectedCustomerIds);
  const previewRecipient = useMemo(() => {
    const recipients = preview?.recipients || [];
    if (!recipients.length) return null;
    return (
      recipients.find((recipient) => recipient.customerId === previewCustomerId) ||
      selectedRecipients[0] ||
      recipients[0]
    );
  }, [preview?.recipients, previewCustomerId, selectedRecipients]);
  const renderedSubject = useMemo(
    () => renderPreviewText(subject, previewRecipient, project),
    [subject, previewRecipient, project],
  );
  const renderedMessage = useMemo(
    () => renderPreviewText(message, previewRecipient, project),
    [message, previewRecipient, project],
  );
  const selectedAttachmentSet = useMemo(
    () => new Set(selectedAttachmentIds),
    [selectedAttachmentIds],
  );
  const selectedAttachmentOptions = useMemo(() => {
    const options = [
      ...(attachmentOptions?.projectDocuments || []),
      ...(attachmentOptions?.customerDocuments || []),
    ];
    return options.filter((option) => selectedAttachmentSet.has(option.id));
  }, [attachmentOptions, selectedAttachmentSet]);
  const totalAttachmentCount = files.length + selectedAttachmentOptions.length;

  async function loadUsers() {
    try {
      const data = await authedFetch("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  }

  function selectedSendCount(
    currentPreview: BulkPreview | null,
    selectedIds: string[],
  ) {
    if (!currentPreview) return 0;
    if (selectedIds.length === 0) return currentPreview.withEmailCount;
    const selected = new Set(selectedIds);
    return currentPreview.recipients.filter((recipient) =>
      selected.has(recipient.customerId),
    ).length;
  }

  function buildRecipientQuery(nextProject = project) {
    const params = new URLSearchParams();
    params.set("project", nextProject);
    if (deliveryStatus) params.set("deliveryStatus", deliveryStatus);
    if (ownerId) params.set("ownerId", ownerId);
    if (language) params.set("language", language);
    if (nationality) params.set("nationality", nationality);
    if (q.trim()) params.set("q", q.trim());
    return params;
  }

  async function loadRecipients(
    nextProject = project,
    options: { clearResult?: boolean; clearSelection?: boolean } = {},
  ) {
    setLoading(true);
    setErr(null);

    try {
      const data = await authedFetch(`/bulk-email/recipients?${buildRecipientQuery(nextProject)}`);
      setPreview(data);
      setPreviewCustomerId((current) => {
        if (data?.recipients?.some((recipient: BulkRecipient) => recipient.customerId === current)) {
          return current;
        }
        return data?.recipients?.[0]?.customerId || "";
      });
      if (options.clearResult ?? true) {
        setResult(null);
      }
      if (options.clearSelection ?? false) {
        setSelectedCustomerIds([]);
      }
    } catch (error) {
      setErr(formatError(error));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaigns(nextProject = project) {
    setCampaignsLoading(true);

    try {
      const data = await authedFetch(
        `/bulk-email/campaigns?project=${encodeURIComponent(nextProject)}`,
      );
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      setErr(formatError(error));
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }

  async function loadCampaignDetail(id: string) {
    setSelectedCampaignId(id);
    setDetailLoading(true);
    setErr(null);

    try {
      const data = await authedFetch(`/bulk-email/campaigns/${encodeURIComponent(id)}`);
      setCampaignDetail(data);
    } catch (error) {
      setErr(formatError(error));
      setCampaignDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadReport(nextProject = project) {
    setReportLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("dateFrom", reportFrom);
      params.set("dateTo", reportTo);
      if (nextProject) params.set("project", nextProject);
      const data = await authedFetch(`/bulk-email/report?${params}`);
      setReport(data);
    } catch (error) {
      setErr(formatError(error));
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  async function retryFailedCampaign(id: string) {
    setRetryingCampaignId(id);
    setErr(null);

    try {
      const data = await authedFetch(
        `/bulk-email/campaigns/${encodeURIComponent(id)}/retry-failed`,
        { method: "POST" },
      );
      setResult(data);
      await loadCampaigns(project);
      await loadReport(project);
      if (data?.campaignId) {
        await loadCampaignDetail(data.campaignId);
      }
    } catch (error) {
      setErr(formatError(error));
    } finally {
      setRetryingCampaignId(null);
    }
  }

  async function loadAttachmentOptions(nextProject = project) {
    setAttachmentsLoading(true);

    try {
      const params = buildRecipientQuery(nextProject);
      if (selectedCustomerIds.length > 0) {
        params.set("selectedCustomerIds", selectedCustomerIds.join(","));
      }

      const data = await authedFetch(`/bulk-email/attachment-options?${params}`);
      setAttachmentOptions(data);
      const allowed = new Set(
        [
          ...(data?.projectDocuments || []),
          ...(data?.customerDocuments || []),
        ].map((option: AttachmentOption) => option.id),
      );
      setSelectedAttachmentIds((current) =>
        current.filter((id) => allowed.has(id)),
      );
    } catch (error) {
      setErr(formatError(error));
      setAttachmentOptions(null);
      setSelectedAttachmentIds([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }

  function appendAttachments(body: FormData, selectedIds = selectedAttachmentIds) {
    files.forEach((item) => body.append("files", item));
    if (selectedIds.length > 0) {
      body.append("selectedAttachmentIds", selectedIds.join(","));
    }
  }

  function selectedAttachmentIdsForTest() {
    const previewCustomer = previewRecipient?.customerId;
    const previewCustomerDocIds = new Set(
      (attachmentOptions?.customerDocuments || [])
        .filter((option) => option.customerId === previewCustomer)
        .map((option) => option.id),
    );

    return selectedAttachmentIds.filter(
      (id) => id.startsWith("project:") || previewCustomerDocIds.has(id),
    );
  }

  async function sendBulkEmail() {
    if (!canSend) return;
    if (!confirmOpen) {
      setConfirmOpen(true);
      return;
    }

    setSending(true);
    setErr(null);
    setResult(null);

    try {
      const body = new FormData();
      body.append("project", project);
      body.append("campaignName", campaignName.trim());
      body.append("deliveryStatus", deliveryStatus);
      body.append("ownerId", ownerId);
      body.append("language", language);
      body.append("nationality", nationality);
      body.append("q", q.trim());
      if (selectedCustomerIds.length > 0) {
        body.append("selectedCustomerIds", selectedCustomerIds.join(","));
      }
      body.append("subject", subject.trim());
      body.append("message", message.trim());
      appendAttachments(body);

      const data = await authedFetch("/bulk-email/send", {
        method: "POST",
        body,
      });
      setResult(data);
      await loadRecipients(project, { clearResult: false });
      await loadCampaigns(project);
      await loadReport(project);
      if (data?.campaignId) {
        await loadCampaignDetail(data.campaignId);
      }
    } catch (error) {
      setErr(formatError(error));
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  async function sendTestEmail() {
    if (!subject.trim() || !message.trim()) {
      setErr(isTr ? "Konu ve mesaj boş olamaz." : "Subject and message are required.");
      return;
    }

    setTesting(true);
    setErr(null);
    setTestNotice(null);

    try {
      const body = new FormData();
      body.append("project", project);
      body.append("deliveryStatus", deliveryStatus);
      body.append("ownerId", ownerId);
      body.append("language", language);
      body.append("nationality", nationality);
      body.append("q", q.trim());
      if (selectedCustomerIds.length > 0) {
        body.append("selectedCustomerIds", selectedCustomerIds.join(","));
      }
      if (previewRecipient?.customerId) {
        body.append("previewCustomerId", previewRecipient.customerId);
      }
      body.append("subject", subject.trim());
      body.append("message", message.trim());
      appendAttachments(body, selectedAttachmentIdsForTest());

      const data = await authedFetch("/bulk-email/test", {
        method: "POST",
        body,
      });
      setTestNotice(
        isTr
          ? `Test maili ${data?.to || me?.email || "kendi mail adresine"} gönderildi.`
          : `Test email sent to ${data?.to || me?.email || "your email"}.`,
      );
    } catch (error) {
      setErr(formatError(error));
    } finally {
      setTesting(false);
    }
  }

  function applyTemplate(
    nextKey = templateKey,
    nextLanguage = templateLanguage,
  ) {
    const template = MAIL_TEMPLATES[nextKey];
    setCampaignName(template.campaignName[nextLanguage]);
    setSubject(template.subject[nextLanguage]);
    setMessage(template.message[nextLanguage]);
  }

  function toggleRecipient(customerId: string) {
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    );
  }

  function selectAllVisible() {
    setSelectedCustomerIds((preview?.recipients || []).map((recipient) => recipient.customerId));
  }

  function clearSelected() {
    setSelectedCustomerIds([]);
  }

  function removeSelected(customerId: string) {
    setSelectedCustomerIds((current) => current.filter((id) => id !== customerId));
  }

  function addManualCustomer() {
    const id = manualCustomerId.trim();
    if (!id) return;
    if ((preview?.recipients || []).some((recipient) => recipient.customerId === id)) {
      setSelectedCustomerIds((current) =>
        current.includes(id) ? current : [...current, id],
      );
    }
    setManualCustomerId("");
  }

  function addFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList || []);
    if (!nextFiles.length) return;

    setFiles((current) => {
      const existing = new Set(
        current.map((item) => `${item.name}-${item.size}-${item.lastModified}`),
      );
      const unique = nextFiles.filter(
        (item) => !existing.has(`${item.name}-${item.size}-${item.lastModified}`),
      );
      return [...current, ...unique].slice(0, 8);
    });
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function toggleAttachment(id: string) {
    setSelectedAttachmentIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function clearFilters() {
    setDeliveryStatus("");
    setOwnerId("");
    setLanguage("");
    setNationality("");
    setQ("");
    setSelectedCustomerIds([]);
  }

  if (!mounted) {
    return <div>{isTr ? "Yükleniyor..." : "Loading..."}</div>;
  }

  if (!roleAllowed(me?.role)) {
    return (
      <main className="bulk-email-page">
        <section className="permission-panel">
          <span>{isTr ? "Erişim kapalı" : "Access restricted"}</span>
          <h1>{isTr ? "Toplu Mail" : "Bulk Email"}</h1>
          <p>
            {isTr
              ? "Bu modül admin, manager ve satış sonrası ekipleri için açıktır."
              : "This module is available to admin, manager and after sales teams."}
          </p>
        </section>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  return (
    <main className="bulk-email-page">
      <section className="hero">
        <div>
          <span className="kicker">
            {isTr ? "Müşteri iletişimi" : "Customer communication"}
          </span>
          <h1>{isTr ? "Toplu Mail Gönderimi" : "Bulk Email Sender"}</h1>
          <p>
            {isTr
              ? "Projeye göre mevcut müşterileri bul, mail adreslerini kontrol et ve mesajı kişiye özel olarak tek tek gönder."
              : "Find existing customers by project, review email coverage and send a private one-to-one email to each owner."}
          </p>
        </div>

        <div className="hero-note">
          <strong>{preview?.projectLabel || projectLabel(project)}</strong>
          <span>
            {isTr
              ? "Her alıcı ayrı mail alır; diğer müşterileri görmez."
              : "Each recipient gets a separate email; no customer sees another recipient."}
          </span>
        </div>
      </section>

      <section className="project-strip" aria-label={isTr ? "Proje seçimi" : "Project selection"}>
        {PROJECTS.map((item) => (
          <button
            key={item}
            className={item === project ? "active" : ""}
            onClick={() => setProject(item)}
            type="button"
          >
            <span>{projectLabel(item)}</span>
          </button>
        ))}
      </section>

      <section className="filter-panel">
        <div className="filter-head">
          <div>
            <span className="kicker">{isTr ? "Alıcı filtresi" : "Recipient filters"}</span>
            <h2>{isTr ? "Kime gidecek?" : "Who will receive it?"}</h2>
          </div>
          <div className="filter-actions">
            <button className="secondary" type="button" onClick={clearFilters}>
              {isTr ? "Filtreleri temizle" : "Clear filters"}
            </button>
            <button
              className="primary"
              type="button"
              onClick={() => loadRecipients(project, { clearSelection: true })}
            >
              {isTr ? "Filtrele" : "Apply"}
            </button>
          </div>
        </div>

        <div className="filter-grid">
          <label>
            <span>{isTr ? "Teslim durumu" : "Delivery status"}</span>
            <select
              value={deliveryStatus}
              onChange={(event) =>
                setDeliveryStatus(event.target.value as UnitDeliveryStatus | "")
              }
            >
              {DELIVERY_STATUSES.map((status) => (
                <option key={status || "ALL"} value={status}>
                  {deliveryLabel(status, isTr)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{isTr ? "Owner / Sales" : "Owner / Sales"}</span>
            <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              <option value="">{isTr ? "Tüm sorumlular" : "All owners"}</option>
              {ownerOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{isTr ? "Dil" : "Language"}</span>
            <input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              list="bulk-email-language-list"
              placeholder={isTr ? "Örn. Turkish" : "Ex. English"}
            />
            <datalist id="bulk-email-language-list">
              {(preview?.facets?.languages || []).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label>
            <span>{isTr ? "Uyruk" : "Nationality"}</span>
            <input
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              list="bulk-email-nationality-list"
              placeholder={isTr ? "Örn. Turkey" : "Ex. Turkey"}
            />
            <datalist id="bulk-email-nationality-list">
              {(preview?.facets?.nationalities || []).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label className="wide">
            <span>{isTr ? "Müşteri / unit ara" : "Search customer / unit"}</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void loadRecipients(project, { clearSelection: true });
                }
              }}
              placeholder={
                isTr
                  ? "İsim, mail, telefon, unit no, sorumlu..."
                  : "Name, email, phone, unit no, owner..."
              }
            />
          </label>
        </div>
      </section>

      {err ? <div className="error-panel">{err}</div> : null}

      <section className="stats-grid">
        <div className="stat-card">
          <span>{isTr ? "Unit" : "Units"}</span>
          <strong>{loading ? "-" : preview?.totalUnits ?? 0}</strong>
          <small>{isTr ? "Aktif sahiplik kayıtları" : "Active ownership records"}</small>
        </div>
        <div className="stat-card ready">
          <span>{isTr ? "Gönderilecek" : "Will send"}</span>
          <strong>{loading ? "-" : sendCount}</strong>
          <small>{isTr ? "Tekilleştirilmiş müşteri" : "Deduplicated customers"}</small>
        </div>
        <div className="stat-card warning">
          <span>{isTr ? "Eksik mail" : "Missing email"}</span>
          <strong>{loading ? "-" : preview?.missingEmailCount ?? 0}</strong>
          <small>{isTr ? "Gönderimde atlanacak" : "Skipped during sending"}</small>
        </div>
        <div className="stat-card">
          <span>{isTr ? "Toplam müşteri" : "Total customers"}</span>
          <strong>{loading ? "-" : preview?.uniqueCustomers ?? 0}</strong>
          <small>{isTr ? "Bu proje için" : "For this project"}</small>
        </div>
      </section>

      <section className="workspace">
        <div className="compose-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">{isTr ? "Mesaj" : "Message"}</span>
              <h2>{isTr ? "Mail içeriği" : "Email content"}</h2>
            </div>
          </div>

          <div className="template-panel">
            <div className="template-controls">
              <label>
                <span>{isTr ? "Hazır şablon" : "Template"}</span>
                <select
                  value={templateKey}
                  onChange={(event) => setTemplateKey(event.target.value as TemplateKey)}
                >
                  {(Object.keys(MAIL_TEMPLATES) as TemplateKey[]).map((key) => (
                    <option key={key} value={key}>
                      {MAIL_TEMPLATES[key].label[templateLanguage]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{isTr ? "Dil" : "Language"}</span>
                <select
                  value={templateLanguage}
                  onChange={(event) => {
                    const nextLanguage = event.target.value as TemplateLanguage;
                    setTemplateLanguage(nextLanguage);
                  }}
                >
                  {TEMPLATE_LANGUAGES.map((languageCode) => (
                    <option key={languageCode} value={languageCode}>
                      {languageCode === "tr"
                        ? "Türkçe"
                        : languageCode === "en"
                          ? "English"
                          : "Русский"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="secondary" type="button" onClick={() => applyTemplate()}>
              {isTr ? "Şablonu uygula" : "Apply template"}
            </button>
          </div>

          <label className="field">
            <span>{isTr ? "Kampanya adı" : "Campaign name"}</span>
            <input
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              placeholder={
                isTr
                  ? "La Joya Teslimat Bilgilendirme"
                  : "La Joya Delivery Update"
              }
            />
          </label>

          <label className="field">
            <span>{isTr ? "Konu" : "Subject"}</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={
                isTr
                  ? "{project} teslimat bilgilendirmesi"
                  : "{project} delivery update"
              }
            />
          </label>
          {!subject.trim() ? (
            <small className="field-warning">
              {isTr ? "Konu boş bırakılamaz." : "Subject cannot be empty."}
            </small>
          ) : null}

          <label className="field">
            <span>{isTr ? "Mesaj" : "Message"}</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                isTr
                  ? "Merhaba {customerName}, ..."
                  : "Dear {customerName}, ..."
              }
            />
          </label>
          {!message.trim() ? (
            <small className="field-warning">
              {isTr ? "Mesaj boş bırakılamaz." : "Message cannot be empty."}
            </small>
          ) : null}

          <div className="tokens">
            <span>{isTr ? "Kişiselleştirme" : "Personalization"}</span>
            <code>{"{customerName}"}</code>
            <code>{"{project}"}</code>
            <code>{"{units}"}</code>
            <code>{"{salesName}"}</code>
            <code>{"{companyName}"}</code>
          </div>

          <div className="attachment-panel">
            <div className="attachment-head">
              <div>
                <strong>{isTr ? "Dosya ve dokümanlar" : "Files and documents"}</strong>
                <span>
                  {isTr
                    ? `${totalAttachmentCount} ek seçildi`
                    : `${totalAttachmentCount} attachments selected`}
                </span>
              </div>
              <button
                className="secondary compact"
                type="button"
                onClick={() => loadAttachmentOptions(project)}
              >
                {attachmentsLoading
                  ? isTr
                    ? "Yükleniyor..."
                    : "Loading..."
                  : isTr
                    ? "Yenile"
                    : "Refresh"}
              </button>
            </div>

            <label className="file-field">
              <span>
                {isTr
                  ? "Bilgisayardan birden fazla dosya ekle"
                  : "Attach multiple files from computer"}
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            {files.length ? (
              <div className="attachment-list">
                {files.map((item, index) => (
                  <p key={`${item.name}-${item.size}-${item.lastModified}`}>
                    <span>
                      {item.name}
                      {formatBytes(item.size) ? ` · ${formatBytes(item.size)}` : ""}
                    </span>
                    <button type="button" onClick={() => removeFile(index)}>
                      {isTr ? "Kaldır" : "Remove"}
                    </button>
                  </p>
                ))}
              </div>
            ) : null}

            <div className="document-grid">
              <div className="document-group">
                <div className="document-group-head">
                  <strong>{isTr ? "Proje hazır PDF" : "Ready project PDFs"}</strong>
                  <span>{attachmentOptions?.projectDocuments.length || 0}</span>
                </div>

                {attachmentsLoading ? (
                  <div className="mini-empty">
                    {isTr ? "PDF listesi yükleniyor..." : "Loading PDF list..."}
                  </div>
                ) : attachmentOptions?.projectDocuments.length ? (
                  attachmentOptions.projectDocuments.map((option) => (
                    <label className="doc-option" key={option.id}>
                      <input
                        type="checkbox"
                        checked={selectedAttachmentSet.has(option.id)}
                        onChange={() => toggleAttachment(option.id)}
                      />
                      <span className="doc-check" />
                      <div>
                        <strong>{option.fileName}</strong>
                        <small>
                          {projectLabel(project)}
                          {formatBytes(option.size)
                            ? ` · ${formatBytes(option.size)}`
                            : ""}
                        </small>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="mini-empty">
                    {isTr
                      ? "Bu proje için hazır PDF yok."
                      : "No ready PDFs for this project yet."}
                  </div>
                )}
              </div>

              <div className="document-group">
                <div className="document-group-head">
                  <strong>
                    {isTr ? "Müşteri / unit dokümanları" : "Customer / unit documents"}
                  </strong>
                  <span>{attachmentOptions?.customerDocuments.length || 0}</span>
                </div>

                {attachmentsLoading ? (
                  <div className="mini-empty">
                    {isTr
                      ? "Müşteri dokümanları yükleniyor..."
                      : "Loading customer documents..."}
                  </div>
                ) : attachmentOptions?.customerDocuments.length ? (
                  attachmentOptions.customerDocuments.map((option) => (
                    <label className="doc-option" key={option.id}>
                      <input
                        type="checkbox"
                        checked={selectedAttachmentSet.has(option.id)}
                        onChange={() => toggleAttachment(option.id)}
                      />
                      <span className="doc-check" />
                      <div>
                        <strong>{option.fileName}</strong>
                        <small>
                          {option.customerName || "-"}
                          {option.units?.length ? ` · ${option.units.join(", ")}` : ""}
                        </small>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="mini-empty">
                    {isTr
                      ? "Filtredeki alıcılar için doküman yok."
                      : "No documents for the filtered recipients."}
                  </div>
                )}
              </div>
            </div>

            {selectedAttachmentOptions.length ? (
              <div className="attachment-list selected-docs">
                {selectedAttachmentOptions.map((option) => (
                  <p key={option.id}>
                    <span>
                      {option.kind === "CUSTOMER_DOCUMENT"
                        ? `${option.customerName || "-"}: ${option.fileName}`
                        : option.fileName}
                    </span>
                    <button type="button" onClick={() => toggleAttachment(option.id)}>
                      {isTr ? "Kaldır" : "Remove"}
                    </button>
                  </p>
                ))}
              </div>
            ) : null}

            <small className="attachment-note">
              {isTr
                ? "Müşteri dokümanları sadece ilgili müşterinin mailine eklenir."
                : "Customer documents are attached only to that customer's email."}
            </small>
          </div>

          <div className="customer-preview-panel">
            <div className="selected-head">
              <strong>{isTr ? "Müşteri önizlemesi" : "Customer preview"}</strong>
              <span>{previewRecipient ? customerName(previewRecipient) : "-"}</span>
            </div>

            <label>
              <span>{isTr ? "Önizlenecek müşteri" : "Preview as customer"}</span>
              <select
                value={previewRecipient?.customerId || ""}
                onChange={(event) => setPreviewCustomerId(event.target.value)}
              >
                {(preview?.recipients || []).map((recipient) => (
                  <option key={recipient.customerId} value={recipient.customerId}>
                    {customerName(recipient)} - {unitsText(recipient)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mail-preview">
              <small>{isTr ? "Konu" : "Subject"}</small>
              <strong>{renderedSubject || "-"}</strong>
              <small>{isTr ? "Mesaj" : "Message"}</small>
              <p>{renderedMessage || "-"}</p>
            </div>
          </div>

          {testNotice ? <div className="success-panel">{testNotice}</div> : null}

          <div className="compose-actions">
            <button className="secondary" type="button" onClick={() => loadRecipients()}>
              {loading ? (isTr ? "Yükleniyor..." : "Loading...") : isTr ? "Alıcıları yenile" : "Refresh recipients"}
            </button>
            <button className="secondary" type="button" onClick={sendTestEmail} disabled={testing || !subject.trim() || !message.trim()}>
              {testing
                ? isTr
                  ? "Test gönderiliyor..."
                  : "Sending test..."
                : isTr
                  ? "Kendime test gönder"
                  : "Send test to me"}
            </button>
            <button className="primary" type="button" onClick={() => setConfirmOpen(true)} disabled={!canSend}>
              {sending
                ? isTr
                  ? "Gönderiliyor..."
                  : "Sending..."
                : isTr
                  ? `${sendCount} kişiye gönder`
                  : `Send to ${sendCount}`}
            </button>
          </div>
        </div>

        <div className="recipients-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">{isTr ? "Önizleme" : "Preview"}</span>
              <h2>{isTr ? "Alıcı listesi" : "Recipient list"}</h2>
            </div>
            <span className="pill">
              {selectedCustomerIds.length > 0
                ? `${selectedCustomerIds.length} ${isTr ? "seçili" : "selected"}`
                : `${preview?.withEmailCount || 0} email`}
            </span>
          </div>

          <div className="recipient-toolbar">
            <button className="secondary" type="button" onClick={selectAllVisible}>
              {isTr ? "Görünenleri seç" : "Select visible"}
            </button>
            <button className="secondary" type="button" onClick={clearSelected}>
              {isTr ? "Seçimi temizle" : "Clear selection"}
            </button>
            <button
              className={`secondary ${showMissingEmails ? "active" : ""}`}
              type="button"
              onClick={() => setShowMissingEmails((value) => !value)}
            >
              {isTr ? "Maili olmayanlar" : "Missing emails"}
            </button>
          </div>

          <div className="recipient-list">
            {loading ? (
              <div className="empty">{isTr ? "Alıcılar yükleniyor..." : "Loading recipients..."}</div>
            ) : preview?.recipients.length ? (
              preview.recipients.map((recipient) => (
                <article className="recipient-row" key={recipient.customerId}>
                  <label className="recipient-check">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(recipient.customerId)}
                      onChange={() => toggleRecipient(recipient.customerId)}
                    />
                    <span />
                  </label>
                  <div>
                    <strong>{customerName(recipient)}</strong>
                    <span>{recipient.email}</span>
                    <small>
                      {recipient.owner?.name
                        ? `${isTr ? "Sorumlu" : "Owner"}: ${recipient.owner.name}`
                        : isTr
                          ? "Sorumlu yok"
                          : "No owner"}
                      {recipient.language || recipient.nationality
                        ? ` · ${[recipient.language, recipient.nationality]
                            .filter(Boolean)
                            .join(" / ")}`
                        : ""}
                    </small>
                  </div>
                  <div className="unit-chips">
                    {recipient.units.slice(0, 5).map((unit) => (
                      <span key={unit.id}>{unit.unitNumber}</span>
                    ))}
                    {recipient.units.length > 5 ? (
                      <span>+{recipient.units.length - 5}</span>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                {isTr
                  ? "Bu projede mail adresi olan mevcut müşteri bulunamadı."
                  : "No existing customers with email found for this project."}
              </div>
            )}
          </div>

          <div className="selected-box">
            <div className="selected-head">
              <strong>{isTr ? "Seçili alıcılar" : "Selected recipients"}</strong>
              <span>{selectedCustomerIds.length || (isTr ? "Tüm filtre sonucu" : "All filtered")}</span>
            </div>

            {selectedRecipients.length ? (
              <div className="selected-list">
                {selectedRecipients.map((recipient) => (
                  <p key={recipient.customerId}>
                    <span>{customerName(recipient)}</span>
                    <button type="button" onClick={() => removeSelected(recipient.customerId)}>
                      {isTr ? "Çıkar" : "Remove"}
                    </button>
                  </p>
                ))}
              </div>
            ) : (
              <small>
                {selectedCustomerIds.length === 0
                  ? isTr
                    ? "Seçim yapmazsan filtredeki tüm maili olan müşterilere gönderilir."
                    : "If no one is selected, all filtered customers with email will receive it."
                  : isTr
                    ? "Seçili müşteriler mevcut filtrede görünmüyor."
                    : "Selected customers are not visible in the current filter."}
              </small>
            )}

            <div className="manual-add">
              <select
                value={manualCustomerId}
                onChange={(event) => setManualCustomerId(event.target.value)}
              >
                <option value="">{isTr ? "Listeden müşteri ekle" : "Add customer from list"}</option>
                {(preview?.recipients || [])
                  .filter((recipient) => !selectedSet.has(recipient.customerId))
                  .map((recipient) => (
                    <option key={recipient.customerId} value={recipient.customerId}>
                      {customerName(recipient)} - {unitsText(recipient)}
                    </option>
                  ))}
              </select>
              <button className="secondary" type="button" onClick={addManualCustomer}>
                {isTr ? "Ekle" : "Add"}
              </button>
            </div>
          </div>

          {showMissingEmails && preview?.missingEmail.length ? (
            <details className="missing-box">
              <summary>
                {isTr ? "Maili eksik müşteriler" : "Customers missing email"}{" "}
                <span>{preview.missingEmail.length}</span>
              </summary>
              <div>
                {preview.missingEmail.map((recipient) => (
                  <p key={recipient.customerId}>
                    <strong>{customerName(recipient)}</strong>
                    <small>{unitsText(recipient)}</small>
                  </p>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </section>

      {result ? (
        <section className="result-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">{isTr ? "Sonuç" : "Result"}</span>
              <h2>
                {isTr
                  ? `${result.campaignName}: ${result.successCount} başarılı, ${result.failedCount} hata`
                  : `${result.campaignName}: ${result.successCount} sent, ${result.failedCount} failed`}
              </h2>
            </div>
            <span className="pill">
              {new Date(result.sentAt).toLocaleString(
                isTr ? "tr-TR" : "en-US",
              )}
            </span>
          </div>

          {result.failures.length ? (
            <div className="failure-list">
              {result.failures.map((failure) => (
                <div key={`${failure.customerId}-${failure.email}`}>
                  <strong>{failure.name}</strong>
                  <span>{failure.email}</span>
                  <small>{failure.error}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>
              {isTr
                ? "Gönderim tamamlandı ve ilgili unit iletişim loglarına işlendi."
                : "Sending completed and related unit communication logs were updated."}
            </p>
          )}
        </section>
      ) : null}

      <section className="report-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">
              {isTr ? "Gönderim takibi" : "Sending tracking"}
            </span>
            <h2>{isTr ? "Gün sonu gönderim raporu" : "End-of-day report"}</h2>
          </div>
          <div className="report-filters">
            <input
              type="date"
              value={reportFrom}
              onChange={(event) => setReportFrom(event.target.value)}
            />
            <input
              type="date"
              value={reportTo}
              onChange={(event) => setReportTo(event.target.value)}
            />
            <button className="secondary compact" type="button" onClick={() => loadReport(project)}>
              {reportLoading
                ? isTr
                  ? "Yükleniyor..."
                  : "Loading..."
                : isTr
                  ? "Raporu getir"
                  : "Load report"}
            </button>
          </div>
        </div>

        <div className="report-grid">
          <div className="report-card">
            <span>{isTr ? "Kampanya" : "Campaigns"}</span>
            <strong>{reportLoading ? "-" : report?.totals.campaigns || 0}</strong>
          </div>
          <div className="report-card success">
            <span>{isTr ? "Başarılı mail" : "Sent emails"}</span>
            <strong>{reportLoading ? "-" : report?.totals.sent || 0}</strong>
          </div>
          <div className="report-card danger">
            <span>{isTr ? "Başarısız" : "Failed"}</span>
            <strong>{reportLoading ? "-" : report?.totals.failed || 0}</strong>
          </div>
          <div className="report-card warning">
            <span>{isTr ? "Mail eksik" : "Missing emails"}</span>
            <strong>{reportLoading ? "-" : report?.totals.missingEmail || 0}</strong>
          </div>
        </div>

        <div className="report-columns">
          <div>
            <strong>{isTr ? "Proje kırılımı" : "Project breakdown"}</strong>
            <div className="compact-list">
              {report?.byProject.length ? (
                report.byProject.map((row) => (
                  <p key={row.project}>
                    <span>{row.projectLabel}</span>
                    <small>
                      {row.sent}/{row.attempted} {isTr ? "başarılı" : "sent"}
                      {row.failed ? ` · ${row.failed} ${isTr ? "hata" : "failed"}` : ""}
                    </small>
                  </p>
                ))
              ) : (
                <div className="mini-empty">
                  {isTr ? "Bu aralıkta gönderim yok." : "No sends in this range."}
                </div>
              )}
            </div>
          </div>

          <div>
            <strong>{isTr ? "Durum özeti" : "Status summary"}</strong>
            <div className="compact-list">
              {(report?.byStatus || []).map((row) => (
                <p key={row.status}>
                  <span>{campaignStatusLabel(row.status, isTr)}</span>
                  <small>{row.count}</small>
                </p>
              ))}
            </div>
          </div>

          <div>
            <strong>{isTr ? "Son başarısız alıcılar" : "Recent failed recipients"}</strong>
            <div className="compact-list">
              {report?.failedRecipients.length ? (
                report.failedRecipients.slice(0, 5).map((row) => (
                  <p key={`${row.campaignId}-${row.customerId}-${row.email}`}>
                    <span>{row.customerName}</span>
                    <small>{row.error || (isTr ? "Hata kaydı yok" : "No error message")}</small>
                  </p>
                ))
              ) : (
                <div className="mini-empty">
                  {isTr ? "Başarısız gönderim yok." : "No failed sends."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="history-workspace">
        <div className="history-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">{isTr ? "Geçmiş" : "History"}</span>
              <h2>{isTr ? "Kampanyalar" : "Campaigns"}</h2>
            </div>
            <button className="secondary" type="button" onClick={() => loadCampaigns()}>
              {campaignsLoading
                ? isTr
                  ? "Yükleniyor..."
                  : "Loading..."
                : isTr
                  ? "Yenile"
                  : "Refresh"}
            </button>
          </div>

          <div className="campaign-list">
            {campaignsLoading ? (
              <div className="empty">{isTr ? "Kampanyalar yükleniyor..." : "Loading campaigns..."}</div>
            ) : campaigns.length ? (
              campaigns.map((campaign) => (
                <button
                  type="button"
                  className={`campaign-row ${selectedCampaignId === campaign.id ? "active" : ""}`}
                  key={campaign.id}
                  onClick={() => loadCampaignDetail(campaign.id)}
                >
                  <div>
                    <strong>{campaign.name}</strong>
                    <span>
                      {projectLabel(campaign.project)} · {campaign.subject}
                    </span>
                    <small>
                      {campaign.createdBy?.name || "-"} ·{" "}
                      {new Date(campaign.sentAt).toLocaleString(isTr ? "tr-TR" : "en-US")}
                    </small>
                  </div>
                  <div className="campaign-metrics">
                    <span className={`status ${campaign.status.toLowerCase()}`}>
                      {campaignStatusLabel(campaign.status, isTr)}
                    </span>
                    <small>
                      {campaign.successCount}/{campaign.attemptedCount}{" "}
                      {isTr ? "başarılı" : "sent"}
                    </small>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty">
                {isTr
                  ? "Bu proje için kampanya geçmişi yok."
                  : "No campaign history for this project."}
              </div>
            )}
          </div>
        </div>

        <div className="detail-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">{isTr ? "Detay" : "Detail"}</span>
              <h2>
                {campaignDetail
                  ? campaignDetail.name
                  : isTr
                    ? "Kampanya seç"
                    : "Select a campaign"}
              </h2>
            </div>
            {campaignDetail ? (
              <div className="detail-actions">
                <span className={`status ${campaignDetail.status.toLowerCase()}`}>
                  {campaignStatusLabel(campaignDetail.status, isTr)}
                </span>
                <button
                  className="secondary compact"
                  type="button"
                  disabled={
                    retryingCampaignId === campaignDetail.id ||
                    !campaignDetail.recipients.some((recipient) => recipient.status === "FAILED")
                  }
                  onClick={() => retryFailedCampaign(campaignDetail.id)}
                >
                  {retryingCampaignId === campaignDetail.id
                    ? isTr
                      ? "Tekrar deneniyor..."
                      : "Retrying..."
                    : isTr
                      ? "Başarısızları tekrar gönder"
                      : "Retry failed"}
                </button>
              </div>
            ) : null}
          </div>

          {detailLoading ? (
            <div className="empty">{isTr ? "Detay yükleniyor..." : "Loading detail..."}</div>
          ) : campaignDetail ? (
            <>
              <div className="detail-stats">
                <div>
                  <span>{isTr ? "Gönderilen" : "Sent"}</span>
                  <strong>{campaignDetail.successCount}</strong>
                </div>
                <div>
                  <span>{isTr ? "Hata" : "Failed"}</span>
                  <strong>{campaignDetail.failedCount}</strong>
                </div>
                <div>
                  <span>{isTr ? "Mail eksik" : "Missing"}</span>
                  <strong>{campaignDetail.missingEmailCount}</strong>
                </div>
                <div>
                  <span>{isTr ? "Unit" : "Units"}</span>
                  <strong>{campaignDetail.totalUnits}</strong>
                </div>
              </div>

              <div className="campaign-copy">
                <strong>{campaignDetail.subject}</strong>
                <p>{campaignDetail.message}</p>
                {campaignDetail.attachmentFileName ? (
                  <small>
                    {isTr ? "Ek" : "Attachment"}: {campaignDetail.attachmentFileName}
                  </small>
                ) : null}
              </div>

              <div className="recipient-result-list">
                {campaignDetail.recipients.map((recipient) => (
                  <article className="recipient-result" key={recipient.id}>
                    <div>
                      <strong>{recipient.customerName}</strong>
                      <span>{recipient.email || (isTr ? "Mail yok" : "No email")}</span>
                      <small>{recipient.unitNumbers}</small>
                    </div>
                    <div>
                      <span className={`status ${recipient.status.toLowerCase()}`}>
                        {recipientStatusLabel(recipient.status, isTr)}
                      </span>
                      {recipient.error ? (
                        <small className="recipient-error">{recipient.error}</small>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">
              {isTr
                ? "Soldan bir kampanya seçince sonuçlar burada açılır."
                : "Select a campaign on the left to review delivery results."}
            </div>
          )}
        </div>
      </section>

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true">
            <span className="kicker">{isTr ? "Son kontrol" : "Final check"}</span>
            <h2>
              {isTr
                ? `${sendCount} kişiye gönderilecek`
                : `${sendCount} recipients will receive this email`}
            </h2>
            <p>
              {isTr
                ? "Bu işlem her müşteriye ayrı mail gönderir ve kampanya geçmişine kaydedilir."
                : "This will send one separate email per customer and save the campaign history."}
            </p>

            <div className="confirm-stats">
              <div>
                <span>{isTr ? "Proje" : "Project"}</span>
                <strong>{projectLabel(project)}</strong>
              </div>
              <div>
                <span>{isTr ? "Gönderilecek" : "To send"}</span>
                <strong>{sendCount}</strong>
              </div>
              <div>
                <span>{isTr ? "Mail eksik" : "Missing email"}</span>
                <strong>{preview?.missingEmailCount || 0}</strong>
              </div>
            </div>

            <div className="confirm-preview">
              <small>{isTr ? "Konu önizleme" : "Subject preview"}</small>
              <strong>{renderedSubject || "-"}</strong>
            </div>

            <div className="confirm-actions">
              <button className="secondary" type="button" onClick={() => setConfirmOpen(false)}>
                {isTr ? "Vazgeç" : "Cancel"}
              </button>
              <button className="primary" type="button" onClick={sendBulkEmail} disabled={sending}>
                {sending
                  ? isTr
                    ? "Gönderiliyor..."
                    : "Sending..."
                  : isTr
                    ? "Onayla ve gönder"
                    : "Confirm and send"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const pageStyles = `
  .bulk-email-page {
    display: grid;
    gap: 18px;
    color: var(--text-primary);
  }

  .hero,
  .workspace,
  .history-workspace,
  .stats-grid,
  .project-strip,
  .filter-panel,
  .report-panel,
  .result-panel,
  .permission-panel {
    width: 100%;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 18px;
    align-items: stretch;
  }

  .hero > div:first-child,
  .hero-note,
  .filter-panel,
  .compose-panel,
  .recipients-panel,
  .history-panel,
  .detail-panel,
  .report-panel,
  .result-panel,
  .permission-panel {
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
  }

  .hero > div:first-child {
    padding: 28px;
  }

  .hero h1,
  .permission-panel h1 {
    font-size: 34px;
    line-height: 1.05;
    margin: 8px 0 10px;
    letter-spacing: 0;
  }

  .hero p,
  .permission-panel p {
    max-width: 760px;
    font-size: 15px;
  }

  .hero-note {
    padding: 22px;
    display: grid;
    align-content: center;
    gap: 8px;
    background:
      linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 48%),
      var(--surface);
  }

  .hero-note strong {
    font-size: 24px;
  }

  .hero-note span,
  .field span,
  .tokens span,
  .file-field span,
  .attachment-head span,
  .document-group-head span,
  .attachment-note,
  .recipient-row span,
  .recipient-row small,
  .stat-card small,
  .stat-card span,
  .missing-box small,
  .failure-list small,
  .failure-list span {
    color: var(--text-secondary);
  }

  .kicker {
    display: inline-flex;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--info);
  }

  .project-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .project-strip button,
  .primary,
  .secondary,
  .file-field {
    min-height: 48px;
    border-radius: 14px;
    border: 1px solid var(--stroke);
    background: var(--surface);
    color: var(--text-primary);
    font-weight: 900;
    cursor: pointer;
  }

  .project-strip button {
    padding: 12px;
  }

  .project-strip button.active {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }

  .filter-panel {
    padding: 20px;
  }

  .filter-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: end;
    margin-bottom: 14px;
  }

  .filter-head h2 {
    margin-top: 4px;
    font-size: 22px;
  }

  .filter-actions,
  .recipient-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .filter-grid label {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .filter-grid label.wide {
    grid-column: span 2;
  }

  .filter-grid label > span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .filter-grid input,
  .filter-grid select,
  .template-controls select,
  .customer-preview-panel select,
  .manual-add select {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    color: var(--text-primary);
    border-radius: 14px;
    padding: 0 13px;
    font: inherit;
    outline: none;
  }

  .filter-grid input:focus,
  .filter-grid select:focus,
  .template-controls select:focus,
  .customer-preview-panel select:focus,
  .manual-add select:focus {
    border-color: var(--info);
    box-shadow: 0 0 0 4px var(--focus);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .stat-card {
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 16px;
    padding: 18px;
    display: grid;
    gap: 5px;
    box-shadow: var(--shadow-sm);
    border-left: 5px solid var(--info);
  }

  .stat-card.ready {
    border-left-color: var(--success);
  }

  .stat-card.warning {
    border-left-color: var(--warning);
  }

  .stat-card strong {
    font-size: 30px;
    line-height: 1;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(420px, 0.95fr) minmax(0, 1.05fr);
    gap: 16px;
    align-items: start;
  }

  .history-workspace {
    display: grid;
    grid-template-columns: minmax(360px, 0.82fr) minmax(0, 1.18fr);
    gap: 16px;
    align-items: start;
  }

  .compose-panel,
  .recipients-panel,
  .history-panel,
  .detail-panel,
  .result-panel,
  .permission-panel {
    padding: 22px;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .panel-head h2 {
    margin-top: 4px;
    font-size: 22px;
  }

  .field {
    display: grid;
    gap: 8px;
    margin-bottom: 14px;
    font-weight: 800;
  }

  .template-panel {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 16px;
    padding: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: end;
    margin-bottom: 14px;
  }

  .template-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px;
    gap: 10px;
  }

  .template-controls label {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .template-controls label > span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    color: var(--text-primary);
    border-radius: 14px;
    padding: 14px 15px;
    font: inherit;
    outline: none;
  }

  .field textarea {
    min-height: 210px;
    resize: vertical;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: var(--info);
    box-shadow: 0 0 0 4px var(--focus);
  }

  .field-warning {
    display: block;
    margin: -8px 0 12px;
    color: var(--danger);
    font-weight: 800;
  }

  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 4px 0 14px;
  }

  .customer-preview-panel {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 16px;
    padding: 14px;
    display: grid;
    gap: 12px;
    margin-bottom: 14px;
  }

  .customer-preview-panel label {
    display: grid;
    gap: 7px;
  }

  .customer-preview-panel label > span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .mail-preview {
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    gap: 8px;
  }

  .mail-preview small {
    color: var(--text-secondary);
    font-weight: 900;
  }

  .mail-preview p {
    white-space: pre-wrap;
    max-height: 220px;
    overflow: auto;
  }

  .success-panel {
    border: 1px solid color-mix(in srgb, var(--success) 35%, var(--stroke));
    background: color-mix(in srgb, var(--success) 10%, var(--surface));
    color: var(--success);
    border-radius: 14px;
    padding: 12px 14px;
    font-weight: 900;
    margin-bottom: 14px;
  }

  .tokens code,
  .pill,
  .unit-chips span,
  .missing-box summary span {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 900;
  }

  .file-field {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 14px;
    color: var(--text-secondary);
  }

  .file-field input {
    display: none;
  }

  .attachment-panel {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 16px;
    padding: 14px;
    display: grid;
    gap: 12px;
    margin-bottom: 14px;
  }

  .attachment-head,
  .document-group-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .attachment-head > div {
    display: grid;
    gap: 3px;
  }

  .document-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .document-group {
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 14px;
    padding: 12px;
    display: grid;
    gap: 8px;
    align-content: start;
    min-height: 160px;
  }

  .document-group-head span {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 900;
  }

  .doc-option {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 12px;
    padding: 10px;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    cursor: pointer;
  }

  .doc-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .doc-check {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 2px solid var(--stroke-2);
    background: var(--surface);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .doc-option input:checked + .doc-check {
    border-color: var(--success);
    background: var(--success);
  }

  .doc-option input:checked + .doc-check::after {
    content: "";
    width: 8px;
    height: 12px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-top: -2px;
  }

  .doc-option div {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .doc-option strong,
  .doc-option small,
  .attachment-list span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-option small {
    color: var(--text-secondary);
  }

  .attachment-list {
    display: grid;
    gap: 8px;
  }

  .attachment-list p {
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 12px;
    padding: 9px 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }

  .attachment-list button {
    border: 0;
    background: transparent;
    color: var(--danger);
    font-weight: 900;
    cursor: pointer;
  }

  .selected-docs {
    border-top: 1px solid var(--stroke);
    padding-top: 10px;
  }

  .mini-empty {
    border: 1px dashed var(--stroke);
    background: var(--surface-2);
    border-radius: 12px;
    padding: 12px;
    color: var(--text-secondary);
    font-weight: 800;
  }

  .attachment-note {
    display: block;
    font-weight: 800;
  }

  .compose-actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
    gap: 10px;
  }

  .primary,
  .secondary {
    padding: 0 18px;
  }

  .secondary.compact {
    min-height: 38px;
    padding: 0 12px;
    border-radius: 12px;
  }

  .primary {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }

  .primary:disabled,
  .secondary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .recipient-list {
    display: grid;
    gap: 10px;
    max-height: 620px;
    overflow: auto;
    padding-right: 4px;
  }

  .recipient-toolbar {
    margin-bottom: 12px;
  }

  .recipient-toolbar .secondary.active {
    border-color: var(--info);
    color: var(--info);
    background: color-mix(in srgb, var(--info) 8%, var(--surface));
  }

  .campaign-list,
  .recipient-result-list {
    display: grid;
    gap: 10px;
    max-height: 560px;
    overflow: auto;
    padding-right: 4px;
  }

  .campaign-row {
    width: 100%;
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    color: var(--text-primary);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    text-align: left;
    cursor: pointer;
  }

  .campaign-row.active {
    border-color: var(--info);
    box-shadow: 0 0 0 4px var(--focus);
    background: color-mix(in srgb, var(--info) 7%, var(--surface));
  }

  .campaign-row div:first-child,
  .campaign-metrics,
  .recipient-result > div {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .campaign-row strong,
  .campaign-row span,
  .campaign-row small,
  .recipient-result strong,
  .recipient-result span,
  .recipient-result small {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-row span,
  .campaign-row small,
  .recipient-result span,
  .recipient-result small {
    color: var(--text-secondary);
  }

  .campaign-metrics {
    justify-items: end;
  }

  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--stroke);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 900;
    color: var(--text-primary);
    background: var(--surface);
    white-space: nowrap;
  }

  .status.completed,
  .status.sent {
    color: var(--success);
    border-color: color-mix(in srgb, var(--success) 35%, var(--stroke));
    background: color-mix(in srgb, var(--success) 10%, var(--surface));
  }

  .status.partial,
  .status.missing_email,
  .status.sending {
    color: var(--warning);
    border-color: color-mix(in srgb, var(--warning) 35%, var(--stroke));
    background: color-mix(in srgb, var(--warning) 10%, var(--surface));
  }

  .status.failed {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 35%, var(--stroke));
    background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  }

  .detail-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .detail-stats div {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 12px;
    display: grid;
    gap: 4px;
  }

  .detail-stats span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .detail-stats strong {
    font-size: 24px;
  }

  .report-filters,
  .detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }

  .report-filters input {
    min-height: 38px;
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    color: var(--text-primary);
    border-radius: 12px;
    padding: 0 10px;
    font: inherit;
    font-weight: 800;
    outline: none;
  }

  .report-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .report-card {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    gap: 5px;
    border-left: 4px solid var(--info);
  }

  .report-card.success {
    border-left-color: var(--success);
  }

  .report-card.danger {
    border-left-color: var(--danger);
  }

  .report-card.warning {
    border-left-color: var(--warning);
  }

  .report-card span,
  .compact-list small {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .report-card strong {
    font-size: 26px;
    line-height: 1;
  }

  .report-columns {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .report-columns > div {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .compact-list {
    display: grid;
    gap: 8px;
  }

  .compact-list p {
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 12px;
    padding: 10px;
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .compact-list span,
  .compact-list small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .campaign-copy {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    gap: 8px;
    margin-bottom: 12px;
  }

  .campaign-copy p {
    white-space: pre-wrap;
    max-height: 180px;
    overflow: auto;
  }

  .recipient-result {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(120px, auto);
    gap: 12px;
  }

  .recipient-result > div:last-child {
    justify-items: end;
  }

  .recipient-error {
    color: var(--danger) !important;
    max-width: 280px;
    white-space: normal;
    text-align: right;
  }

  .recipient-row {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) minmax(140px, auto);
    gap: 12px;
    align-items: center;
  }

  .recipient-check {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .recipient-check input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .recipient-check span {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 2px solid var(--stroke-2);
    background: var(--surface);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .recipient-check input:checked + span {
    border-color: var(--success);
    background: var(--success);
  }

  .recipient-check input:checked + span::after {
    content: "";
    width: 8px;
    height: 12px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-top: -2px;
  }

  .recipient-row > div:nth-child(2) {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .recipient-row strong,
  .recipient-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .unit-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .selected-box {
    margin-top: 12px;
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 14px;
    display: grid;
    gap: 10px;
  }

  .selected-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .selected-head span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .selected-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .selected-list p {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    border: 1px solid var(--stroke);
    background: var(--surface);
    border-radius: 999px;
    padding: 6px 7px 6px 10px;
    color: var(--text-primary);
  }

  .selected-list button {
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--danger) 10%, var(--surface));
    color: var(--danger);
    font-weight: 900;
    padding: 4px 8px;
    cursor: pointer;
  }

  .manual-add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .empty,
  .error-panel {
    border: 1px dashed var(--stroke);
    border-radius: 14px;
    padding: 18px;
    color: var(--text-secondary);
    background: var(--surface-2);
  }

  .error-panel {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 35%, var(--stroke));
    background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  }

  .missing-box {
    margin-top: 12px;
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 12px;
  }

  .missing-box summary {
    cursor: pointer;
    font-weight: 900;
  }

  .missing-box div {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }

  .missing-box p,
  .failure-list div {
    display: grid;
    gap: 2px;
    border-top: 1px solid var(--stroke);
    padding-top: 8px;
  }

  .failure-list {
    display: grid;
    gap: 10px;
  }

  .permission-panel {
    display: grid;
    gap: 8px;
    max-width: 720px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(15, 23, 42, 0.42);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .confirm-modal {
    width: min(620px, 100%);
    border: 1px solid var(--stroke);
    background: var(--surface);
    color: var(--text-primary);
    border-radius: 18px;
    box-shadow: var(--shadow);
    padding: 24px;
    display: grid;
    gap: 14px;
  }

  .confirm-modal h2 {
    font-size: 28px;
  }

  .confirm-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .confirm-stats div,
  .confirm-preview {
    border: 1px solid var(--stroke);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 12px;
    display: grid;
    gap: 5px;
  }

  .confirm-stats span,
  .confirm-preview small {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
  }

  .confirm-stats strong {
    font-size: 20px;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  @media (max-width: 1180px) {
    .hero,
    .workspace,
    .history-workspace {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .report-columns {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .hero h1,
    .permission-panel h1 {
      font-size: 28px;
    }

    .project-strip,
    .stats-grid,
    .report-grid,
    .filter-grid,
    .template-panel,
    .template-controls,
    .document-grid,
    .confirm-stats,
    .detail-stats,
    .compose-actions,
    .recipient-row,
    .campaign-row,
    .recipient-result {
      grid-template-columns: 1fr;
    }

    .filter-grid label.wide {
      grid-column: auto;
    }

    .unit-chips {
      justify-content: flex-start;
    }

    .campaign-metrics,
    .recipient-result > div:last-child {
      justify-items: start;
    }
  }
`;
