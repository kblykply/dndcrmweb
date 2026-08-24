"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import {
  QUALITY_MODULE_COPY,
  policyItemsForCard,
  qualityCardDescription,
  qualityCardTitle,
  type QualityLocale,
} from "@/lib/qualityPolicy";
import {
  ISO9001_FOUNDATION,
  ISO9001_GUIDE_COPY,
  iso9001ClausesForCard,
} from "@/lib/iso9001Requirements";
import {
  ISO9001_SOURCE_TR,
  iso9001FoundationFigureDetailsTr,
  iso9001FoundationSourceTr,
} from "@/lib/iso9001SourceTr";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type QualityProcessCategory =
  | "CONTEXT"
  | "PLANNING"
  | "LEADERSHIP"
  | "SUPPORT"
  | "OPERATIONAL"
  | "PERFORMANCE"
  | "IMPROVEMENT"
  | "CONSTRUCTION"
  | "REAL_ESTATE_SALES"
  | "VALUE";

type QualityProcessStatus = "ACTIVE" | "NEEDS_REVIEW" | "ARCHIVED";
type QualityDocumentType =
  | "PROCEDURE"
  | "POLICY"
  | "FORM"
  | "CHECKLIST"
  | "RECORD"
  | "DRAWING"
  | "CONTRACT"
  | "REPORT"
  | "OTHER";
type QualityDocumentStatus = "DRAFT" | "ACTIVE" | "NEEDS_REVIEW" | "ARCHIVED";

type UserLite = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ChecklistItem = {
  id: string;
  title: string;
  description?: string | null;
  required: boolean;
  isChecked: boolean;
  dueAt?: string | null;
  checkedAt?: string | null;
  checkedBy?: UserLite | null;
  createdBy?: UserLite | null;
};

type QualityDocument = {
  id: string;
  title: string;
  type: QualityDocumentType;
  status: QualityDocumentStatus;
  revision?: string | null;
  ownerDepartment?: string | null;
  url?: string | null;
  notes?: string | null;
  createdBy?: UserLite | null;
  updatedBy?: UserLite | null;
  createdAt: string;
  updatedAt: string;
};

type QualityLog = {
  id: string;
  action: string;
  note?: string | null;
  createdAt: string;
  createdBy?: UserLite | null;
};

type QualityDetail = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category: QualityProcessCategory;
  status: QualityProcessStatus;
  ownerDepartment?: string | null;
  color?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserLite | null;
  updatedBy?: UserLite | null;
  checklists: ChecklistItem[];
  documents: QualityDocument[];
  logs: QualityLog[];
};

type QualityMapItem = {
  id: string;
  code: string;
};

type QualityListResponse = {
  items?: QualityMapItem[];
};

const CATEGORY_OPTIONS: QualityProcessCategory[] = [
  "CONTEXT",
  "LEADERSHIP",
  "PLANNING",
  "SUPPORT",
  "OPERATIONAL",
  "PERFORMANCE",
  "IMPROVEMENT",
  "CONSTRUCTION",
  "REAL_ESTATE_SALES",
  "VALUE",
];

const STATUS_OPTIONS: QualityProcessStatus[] = ["ACTIVE", "NEEDS_REVIEW", "ARCHIVED"];
const DOC_TYPES: QualityDocumentType[] = [
  "PROCEDURE",
  "POLICY",
  "FORM",
  "CHECKLIST",
  "RECORD",
  "DRAWING",
  "CONTRACT",
  "REPORT",
  "OTHER",
];
const DOC_STATUSES: QualityDocumentStatus[] = ["DRAFT", "ACTIVE", "NEEDS_REVIEW", "ARCHIVED"];

function categoryLabel(value: string, locale: "tr" | "en") {
  const tr: Record<string, string> = {
    CONTEXT: "Bağlamsal Analiz",
    LEADERSHIP: "Liderlik",
    PLANNING: "Planlama",
    SUPPORT: "Destek",
    OPERATIONAL: "Operasyonel Süreçler",
    PERFORMANCE: "Performans Değerlendirme",
    IMPROVEMENT: "İyileştirme",
    CONSTRUCTION: "İnşaat Üretim",
    REAL_ESTATE_SALES: "Gayrimenkul Satış",
    VALUE: "Değerler",
  };
  const en: Record<string, string> = {
    CONTEXT: "Context Analysis",
    LEADERSHIP: "Leadership",
    PLANNING: "Planning",
    SUPPORT: "Support",
    OPERATIONAL: "Operational Processes",
    PERFORMANCE: "Performance Evaluation",
    IMPROVEMENT: "Improvement",
    CONSTRUCTION: "Construction Production",
    REAL_ESTATE_SALES: "Real Estate Sales",
    VALUE: "Values",
  };
  return (locale === "tr" ? tr : en)[value] || value;
}

function statusLabel(value: string, locale: "tr" | "en") {
  const tr: Record<string, string> = {
    ACTIVE: "Aktif",
    NEEDS_REVIEW: "Kontrol Gerekli",
    ARCHIVED: "Arşiv",
    DRAFT: "Taslak",
  };
  const en: Record<string, string> = {
    ACTIVE: "Active",
    NEEDS_REVIEW: "Needs Review",
    ARCHIVED: "Archived",
    DRAFT: "Draft",
  };
  return (locale === "tr" ? tr : en)[value] || value;
}

function documentTypeLabel(value: string, locale: "tr" | "en") {
  const tr: Record<string, string> = {
    PROCEDURE: "Prosedür",
    POLICY: "Politika",
    FORM: "Form",
    CHECKLIST: "Checklist",
    RECORD: "Kayıt",
    DRAWING: "Çizim",
    CONTRACT: "Sözleşme",
    REPORT: "Rapor",
    OTHER: "Diğer",
  };
  const en: Record<string, string> = {
    PROCEDURE: "Procedure",
    POLICY: "Policy",
    FORM: "Form",
    CHECKLIST: "Checklist",
    RECORD: "Record",
    DRAWING: "Drawing",
    CONTRACT: "Contract",
    REPORT: "Report",
    OTHER: "Other",
  };
  return (locale === "tr" ? tr : en)[value] || value;
}

function formatDate(value?: string | null, locale?: "tr" | "en") {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function MiniQualityMap({
  currentCode,
  hrefByCode,
  locale,
}: {
  currentCode: string;
  hrefByCode: Map<string, string>;
  locale: QualityLocale;
}) {
  const copy = QUALITY_MODULE_COPY[locale].mini;

  function isActive(code: string) {
    return code === currentCode || currentCode.startsWith(`${code}.`);
  }

  function node(code: string, label: string, className = "") {
    const active = isActive(code);
    return (
      <Link
        key={`${code}-${label}`}
        className={`mini-node ${className} ${active ? "active" : ""}`}
        href={hrefByCode.get(code) || "/quality-control"}
        aria-current={active ? "page" : undefined}
      >
        <b>{code}</b>
        <em>{label}</em>
      </Link>
    );
  }

  return (
    <aside className="mini-map" aria-label={copy.title}>
      <header className="mini-poster-head">
        <img src="/dndblack.png" alt="DND" />
        <Link href="/quality-control">
          <strong>{copy.title}</strong>
          <span>{copy.values}</span>
        </Link>
      </header>

      <div className="mini-poster-grid">
        <section className="mini-context">
          <Link className="mini-bar" href={hrefByCode.get("4.1") || "/quality-control"}>
            {copy.context}
          </Link>
          <div className="mini-context-list">
            {copy.contextNodes.map(([code, label]) => node(code, label))}
          </div>
        </section>

        <section className="mini-center-map">
          <Link className="mini-bar mini-operational-bar" href={hrefByCode.get("8") || "/quality-control"}>
            {copy.operational}
          </Link>
          <div className="mini-operational-row">
            {copy.operationalNodes.map(([code, label]) => node(code, label, "mini-tall"))}
          </div>
          <div className="mini-main-flow">
            {node("8", locale === "tr" ? "Operasyon" : "Operation", "mini-operation")}
            <div className="mini-core-row">
              {node("6", locale === "tr" ? "Planlama" : "Planning", "mini-blue")}
              {node("5", locale === "tr" ? "Liderlik" : "Leadership", "mini-green")}
              {node("9", locale === "tr" ? "Performans" : "Performance", "mini-blue")}
            </div>
            {node("10", locale === "tr" ? "İyileştirme" : "Improvement", "mini-blue mini-improvement")}
          </div>
          <div className="mini-support">
            <Link className="mini-bar" href={hrefByCode.get("7") || "/quality-control"}>
              {copy.support}
            </Link>
            <div>
              {copy.supportNodes.map(([code, label]) => node(code, label))}
            </div>
          </div>
        </section>

        <section className="mini-outputs">
          <Link href={hrefByCode.get("9.1") || "/quality-control"}>{copy.outputs[0]}</Link>
          <Link href={hrefByCode.get("9") || "/quality-control"}>{copy.outputs[1]}</Link>
          <Link href={hrefByCode.get("8.2") || "/quality-control"}>{copy.outputs[2]}</Link>
          <Link href={hrefByCode.get("4.4") || "/quality-control"}>{copy.outputs[3]}</Link>
        </section>
      </div>

      <div className="mini-bottom-lanes">
        <section>
          <Link className="mini-bar" href={hrefByCode.get("İNŞAAT") || "/quality-control"}>
            {copy.construction}
          </Link>
          <div>
            {copy.constructionNodes.map(([code, label]) => node(code, label))}
          </div>
        </section>
        <section>
          <Link className="mini-bar" href={hrefByCode.get("SATIŞ") || "/quality-control"}>
            {copy.sales}
          </Link>
          <div>
            {copy.salesNodes.map(([code, label]) => node(code, label))}
          </div>
        </section>
      </div>

      <footer className="mini-values">
        {copy.valueNodes.map(([code, label]) => (
          <Link key={label} href={hrefByCode.get(code) || "/quality-control"}>
            {label}
          </Link>
        ))}
      </footer>
    </aside>
  );
}

export default function QualityDetailPage() {
  const { locale, setLocale } = useLanguage();
  const moduleCopy = QUALITY_MODULE_COPY[locale];
  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [item, setItem] = useState<QualityDetail | null>(null);
  const [mapItems, setMapItems] = useState<QualityMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<QualityProcessCategory>("OPERATIONAL");
  const [status, setStatus] = useState<QualityProcessStatus>("ACTIVE");
  const [ownerDepartment, setOwnerDepartment] = useState("");

  const [checkTitle, setCheckTitle] = useState("");
  const [checkDescription, setCheckDescription] = useState("");
  const [checkRequired, setCheckRequired] = useState(false);
  const [checkDueAt, setCheckDueAt] = useState("");

  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<QualityDocumentType>("PROCEDURE");
  const [docStatus, setDocStatus] = useState<QualityDocumentStatus>("ACTIVE");
  const [docRevision, setDocRevision] = useState("");
  const [docOwnerDepartment, setDocOwnerDepartment] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docNotes, setDocNotes] = useState("");

  const [newLog, setNewLog] = useState("");
  const [openIsoClauses, setOpenIsoClauses] = useState<string[]>([]);
  const [frameworkOpen, setFrameworkOpen] = useState(false);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(true);

  const role = me?.role as string | undefined;
  const canUse =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "AFTERSALES" ||
    role === "SALES" ||
    role === "PREVIEW";
  const canEdit = canUse && role !== "PREVIEW";

  const checklistTotal = item?.checklists?.length || 0;
  const checklistDone = item?.checklists?.filter((row) => row.isChecked).length || 0;
  const completion = checklistTotal === 0 ? 0 : Math.round((checklistDone / checklistTotal) * 100);
  const reviewDocs = item?.documents?.filter((doc) => doc.status === "NEEDS_REVIEW").length || 0;
  const policyLocale = locale === "tr" ? "tr" : "en";
  const relatedPolicyItems = policyItemsForCard(item?.code, item?.category);
  const isoGuideCopy = ISO9001_GUIDE_COPY[locale];
  const isoClauses = iso9001ClausesForCard(item?.code);
  const hrefByCode = new Map<string, string>();
  mapItems.forEach((row) => {
    if (row.code && row.id) hrefByCode.set(row.code, `/quality-control/${row.id}`);
  });
  if (item?.code && item?.id) hrefByCode.set(item.code, `/quality-control/${item.id}`);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr("");

    try {
      const [detailResult, listResult] = await Promise.allSettled([
        authedFetch(`/quality-control/${id}`),
        authedFetch("/quality-control"),
      ]);

      if (detailResult.status === "rejected") {
        throw detailResult.reason;
      }

      const data = detailResult.value as QualityDetail;
      if (listResult.status === "fulfilled") {
        const list = listResult.value as QualityListResponse;
        setMapItems(Array.isArray(list?.items) ? list.items : []);
      }

      setItem(data);
      setCode(data.code || "");
      setTitle(data.title || "");
      setDescription(data.description || "");
      setCategory(data.category || "OPERATIONAL");
      setStatus(data.status || "ACTIVE");
      setOwnerDepartment(data.ownerDepartment || "");
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveCard() {
    if (!id || !canEdit) return;
    if (!code.trim() || !title.trim()) {
      setErr(locale === "tr" ? "Kod ve başlık zorunludur." : "Code and title are required.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const data = (await authedFetch(`/quality-control/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          description: description.trim(),
          category,
          status,
          ownerDepartment: ownerDepartment.trim(),
        }),
      })) as QualityDetail;
      setItem(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function addChecklistItem() {
    if (!id || !canEdit) return;
    if (!checkTitle.trim()) {
      setErr(locale === "tr" ? "Checklist başlığı zorunludur." : "Checklist title is required.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/checklists`, {
        method: "POST",
        body: JSON.stringify({
          title: checkTitle.trim(),
          description: checkDescription.trim(),
          required: checkRequired,
          dueAt: checkDueAt || null,
        }),
      });
      setCheckTitle("");
      setCheckDescription("");
      setCheckRequired(false);
      setCheckDueAt("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleChecklist(row: ChecklistItem) {
    if (!id || !canEdit) return;
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/checklists/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isChecked: !row.isChecked }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function deleteChecklist(row: ChecklistItem) {
    if (!id || !canEdit) return;
    if (!window.confirm(locale === "tr" ? "Checklist maddesi silinsin mi?" : "Delete checklist item?")) return;
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/checklists/${row.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function addDocument() {
    if (!id || !canEdit) return;
    if (!docTitle.trim()) {
      setErr(locale === "tr" ? "Doküman adı zorunludur." : "Document title is required.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/documents`, {
        method: "POST",
        body: JSON.stringify({
          title: docTitle.trim(),
          type: docType,
          status: docStatus,
          revision: docRevision.trim(),
          ownerDepartment: docOwnerDepartment.trim(),
          url: docUrl.trim(),
          notes: docNotes.trim(),
        }),
      });
      setDocTitle("");
      setDocType("PROCEDURE");
      setDocStatus("ACTIVE");
      setDocRevision("");
      setDocOwnerDepartment("");
      setDocUrl("");
      setDocNotes("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function updateDocumentStatus(document: QualityDocument, nextStatus: QualityDocumentStatus) {
    if (!id || !canEdit) return;
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function deleteDocument(document: QualityDocument) {
    if (!id || !canEdit) return;
    if (!window.confirm(locale === "tr" ? "Doküman silinsin mi?" : "Delete document?")) return;
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/documents/${document.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function addLog() {
    if (!id || !canEdit) return;
    if (!newLog.trim()) {
      setErr(locale === "tr" ? "Log notu zorunludur." : "Log note is required.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      await authedFetch(`/quality-control/${id}/logs`, {
        method: "POST",
        body: JSON.stringify({ note: newLog.trim() }),
      });
      setNewLog("");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted || !canUse) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, canUse, id]);

  useEffect(() => {
    const clauses = iso9001ClausesForCard(item?.code);
    const directClause = clauses.find((row) => row.code === item?.code);
    setOpenIsoClauses(clauses.length > 0 ? [directClause?.code || clauses[0].code] : []);
  }, [item?.code]);

  useEffect(() => {
    setMapDrawerOpen(true);
  }, [id]);

  useEffect(() => {
    if (!mapDrawerOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMapDrawerOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mapDrawerOpen]);

  useEffect(() => {
    if (!mapDrawerOpen) return;

    function closeOnPageScroll() {
      setMapDrawerOpen(false);
    }

    document.addEventListener("scroll", closeOnPageScroll, { passive: true, capture: true });
    window.addEventListener("wheel", closeOnPageScroll, { passive: true });
    window.addEventListener("touchmove", closeOnPageScroll, { passive: true });

    return () => {
      document.removeEventListener("scroll", closeOnPageScroll, true);
      window.removeEventListener("wheel", closeOnPageScroll);
      window.removeEventListener("touchmove", closeOnPageScroll);
    };
  }, [mapDrawerOpen]);

  function toggleIsoClause(clauseCode: string) {
    setOpenIsoClauses((current) =>
      current.includes(clauseCode)
        ? current.filter((openCode) => openCode !== clauseCode)
        : [...current, clauseCode],
    );
  }

  if (mounted && !canUse) {
    return (
      <main className="quality-detail-page">
        <div className="panel">{locale === "tr" ? "Yetki yok" : "No access"}</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!mounted || loading) {
    return (
      <main className="quality-detail-page">
        <div className="panel">{locale === "tr" ? "Yükleniyor..." : "Loading..."}</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="quality-detail-page">
        <div className="panel">
          <Link href="/quality-control">← {locale === "tr" ? "Kalite modülüne dön" : "Back to quality module"}</Link>
          <p>{err || (locale === "tr" ? "Kart bulunamadı." : "Card not found.")}</p>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const displayTitle = qualityCardTitle(item.code, item.title, locale);
  const displayDescription = qualityCardDescription(item.code, item.description, locale);

  return (
    <main className="quality-detail-page">
      <button
        type="button"
        className={`map-drawer-toggle ${mapDrawerOpen ? "open" : ""}`}
        onClick={() => setMapDrawerOpen((current) => !current)}
        aria-controls="quality-map-drawer"
        aria-expanded={mapDrawerOpen}
      >
        <span aria-hidden="true">{mapDrawerOpen ? "×" : "▦"}</span>
        {mapDrawerOpen
          ? locale === "tr"
            ? "Haritayı kapat"
            : "Close map"
          : locale === "tr"
            ? "Süreç haritası"
            : "Process map"}
      </button>

      {mapDrawerOpen ? (
        <button
          type="button"
          className="map-drawer-backdrop"
          onClick={() => setMapDrawerOpen(false)}
          aria-label={locale === "tr" ? "Süreç haritasını kapat" : "Close process map"}
        />
      ) : null}

      <div
        id="quality-map-drawer"
        className={`map-drawer-panel ${mapDrawerOpen ? "open" : ""}`}
        role="region"
        aria-label={locale === "tr" ? "Kalite süreç haritası" : "Quality process map"}
        aria-hidden={!mapDrawerOpen}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setMapDrawerOpen(false);
        }}
      >
        <MiniQualityMap currentCode={item.code} hrefByCode={hrefByCode} locale={locale} />
      </div>

      <section className="detail-hero">
        <div className="hero-copy">
          <div className="hero-topline">
            <Link href="/quality-control">← {locale === "tr" ? "Kalite modülü" : "Quality module"}</Link>
            <div className="language-switch" aria-label={moduleCopy.language}>
              <button type="button" className={locale === "tr" ? "active" : ""} onClick={() => setLocale("tr")}>
                TR
              </button>
              <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>
                EN
              </button>
            </div>
          </div>
          <div className="title-row">
            <span>{item.code}</span>
            <h1>{displayTitle}</h1>
          </div>
          <p>{displayDescription || "-"}</p>
        </div>
        <div className="hero-side">
          <div className="hero-stats">
            <article>
              <span>{locale === "tr" ? "Checklist" : "Checklist"}</span>
              <strong>{completion}%</strong>
              <small>{checklistDone}/{checklistTotal}</small>
            </article>
            <article>
              <span>{locale === "tr" ? "Doküman" : "Documents"}</span>
              <strong>{item.documents?.length || 0}</strong>
              <small>{reviewDocs} {moduleCopy.stats.review}</small>
            </article>
          </div>
        </div>
      </section>

      {err ? <div className="error-box">{err}</div> : null}

      <section className="iso-guide">
        <header className="iso-guide-head">
          <div>
            <div className="iso-guide-eyebrow">
              <span>{isoGuideCopy.eyebrow}</span>
              <b>{isoGuideCopy.source}</b>
            </div>
            <h2>{isoGuideCopy.title}</h2>
            <p>{isoGuideCopy.description}</p>
          </div>
          {isoClauses.length > 0 ? (
            <div className="iso-guide-actions">
              <button type="button" onClick={() => setOpenIsoClauses(isoClauses.map((row) => row.code))}>
                {isoGuideCopy.openAll}
              </button>
              <button type="button" onClick={() => setOpenIsoClauses([])}>
                {isoGuideCopy.closeAll}
              </button>
            </div>
          ) : null}
        </header>

        {isoClauses.length > 0 ? (
          <div className="iso-clause-list">
            {isoClauses.map((isoClause) => {
              const isOpen = openIsoClauses.includes(isoClause.code);
              return (
                <article key={isoClause.code} className={isOpen ? "open" : ""}>
                  <button
                    type="button"
                    className="iso-clause-trigger"
                    onClick={() => toggleIsoClause(isoClause.code)}
                    aria-expanded={isOpen}
                  >
                    <span>{isoClause.code}</span>
                    <strong>{isoClause.title[locale]}</strong>
                    <i aria-hidden="true">{isOpen ? "−" : "+"}</i>
                  </button>
                  {isOpen ? (
                    <div className="iso-clause-body">
                      <div className="iso-clause-summary">
                        <b className="iso-section-label">{isoGuideCopy.implementationSummary}</b>
                        <ol>
                          {isoClause.points[locale].map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ol>
                        {isoClause.evidence ? (
                          <aside className="iso-evidence">
                            <b>{isoGuideCopy.evidence}</b>
                            <ul>
                              {isoClause.evidence[locale].map((evidence) => (
                                <li key={evidence}>{evidence}</li>
                              ))}
                            </ul>
                          </aside>
                        ) : null}
                      </div>
                      {ISO9001_SOURCE_TR[isoClause.code] ? (
                        <details className="iso-source-text">
                          <summary>
                            <span>
                              <b>{isoGuideCopy.licensedText}</b>
                              <small>{isoGuideCopy.originalLanguage}</small>
                            </span>
                          </summary>
                          <div className="iso-source-content">
                            {ISO9001_SOURCE_TR[isoClause.code].split("\n\n").map((paragraph, index) => (
                              <p key={`${isoClause.code}-source-${index}`}>{paragraph}</p>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="iso-empty">{isoGuideCopy.noClauses}</div>
        )}

        <div className="iso-framework">
          <button type="button" onClick={() => setFrameworkOpen((current) => !current)} aria-expanded={frameworkOpen}>
            <span>
              <b>{isoGuideCopy.framework}</b>
              <small>{isoGuideCopy.frameworkDescription}</small>
            </span>
            <i aria-hidden="true">{frameworkOpen ? "−" : "+"}</i>
          </button>
          {frameworkOpen ? (
            <div className="iso-framework-grid">
              {ISO9001_FOUNDATION.map((section) => (
                <article key={section.code} className={section.code === "B" ? "iso-annex-card" : undefined}>
                  <span>{section.code}</span>
                  <h3>{section.title[locale]}</h3>
                  <ul>
                    {section.points[locale].map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  {iso9001FoundationSourceTr(section.code) ? (
                    <details className="iso-foundation-source">
                      <summary>
                        <span>
                          <b>{isoGuideCopy.licensedText}</b>
                          <small>{isoGuideCopy.originalLanguage}</small>
                        </span>
                      </summary>
                      <div className="iso-foundation-source-content">
                        {iso9001FoundationSourceTr(section.code)
                          .split("\n\n")
                          .map((paragraph, index) => (
                            <p key={`${section.code}-foundation-source-${index}`}>{paragraph}</p>
                          ))}
                        {iso9001FoundationFigureDetailsTr(section.code).length > 0 ? (
                          <div className="iso-figure-transcription">
                            <b>{isoGuideCopy.figureTranscription}</b>
                            <ul>
                              {iso9001FoundationFigureDetailsTr(section.code).map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="detail-grid">
        <div className="main-column">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span>{locale === "tr" ? "Kart bilgisi" : "Card info"}</span>
                <h2>{locale === "tr" ? "Süreç kontrol kartı" : "Process control card"}</h2>
              </div>
              <button type="button" onClick={saveCard} disabled={!canEdit || saving}>
                {saving ? (locale === "tr" ? "Kaydediliyor..." : "Saving...") : locale === "tr" ? "Kaydet" : "Save"}
              </button>
            </div>

            <div className="form-grid">
              <label>
                <span>{locale === "tr" ? "Kod" : "Code"}</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} disabled={!canEdit} />
              </label>
              <label>
                <span>{locale === "tr" ? "Durum" : "Status"}</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as any)} disabled={!canEdit}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{locale === "tr" ? "Kategori" : "Category"}</span>
                <select value={category} onChange={(event) => setCategory(event.target.value as any)} disabled={!canEdit}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {categoryLabel(option, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{locale === "tr" ? "Sorumlu departman" : "Owner department"}</span>
                <input
                  value={ownerDepartment}
                  onChange={(event) => setOwnerDepartment(event.target.value)}
                  disabled={!canEdit}
                  placeholder={locale === "tr" ? "Operasyon, satış, saha..." : "Operations, sales, site..."}
                />
              </label>
              <label className="wide">
                <span>{locale === "tr" ? "Başlık" : "Title"}</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canEdit} />
              </label>
              <label className="wide">
                <span>{locale === "tr" ? "Açıklama" : "Description"}</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!canEdit}
                  rows={4}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span>{locale === "tr" ? "Checklist" : "Checklist"}</span>
                <h2>{locale === "tr" ? "Kontrol maddeleri" : "Control items"}</h2>
              </div>
            </div>

            {canEdit ? (
              <div className="add-checklist">
                <input
                  value={checkTitle}
                  onChange={(event) => setCheckTitle(event.target.value)}
                  placeholder={locale === "tr" ? "Yeni checklist maddesi" : "New checklist item"}
                />
                <input
                  value={checkDescription}
                  onChange={(event) => setCheckDescription(event.target.value)}
                  placeholder={locale === "tr" ? "Kısa açıklama" : "Short description"}
                />
                <input
                  type="date"
                  value={checkDueAt}
                  onChange={(event) => setCheckDueAt(event.target.value)}
                />
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={checkRequired}
                    onChange={(event) => setCheckRequired(event.target.checked)}
                  />
                  {locale === "tr" ? "Zorunlu" : "Required"}
                </label>
                <button type="button" onClick={addChecklistItem} disabled={saving}>
                  {locale === "tr" ? "Ekle" : "Add"}
                </button>
              </div>
            ) : null}

            <div className="checklist-list">
              {item.checklists?.map((row) => (
                <article key={row.id} className={row.isChecked ? "done" : ""}>
                  <button
                    type="button"
                    className="check-button"
                    onClick={() => toggleChecklist(row)}
                    disabled={!canEdit}
                    aria-label={row.isChecked ? "Mark unpaid" : "Mark paid"}
                  >
                    {row.isChecked ? "✓" : ""}
                  </button>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.description || "-"}</span>
                    <small>
                      {row.required ? (locale === "tr" ? "Zorunlu" : "Required") : locale === "tr" ? "Opsiyonel" : "Optional"} ·{" "}
                      {locale === "tr" ? "Termin" : "Due"}: {formatDate(row.dueAt, locale)}
                      {row.checkedBy?.name ? ` · ${row.checkedBy.name}` : ""}
                    </small>
                  </div>
                  {canEdit ? (
                    <button type="button" className="ghost-danger" onClick={() => deleteChecklist(row)}>
                      {locale === "tr" ? "Sil" : "Delete"}
                    </button>
                  ) : null}
                </article>
              ))}
              {item.checklists?.length === 0 ? (
                <div className="empty-line">{locale === "tr" ? "Checklist maddesi yok." : "No checklist items."}</div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span>{locale === "tr" ? "Dokümanlar" : "Documents"}</span>
                <h2>{locale === "tr" ? "Süreç dokümanları" : "Process documents"}</h2>
              </div>
            </div>

            {canEdit ? (
              <div className="document-form">
                <input
                  value={docTitle}
                  onChange={(event) => setDocTitle(event.target.value)}
                  placeholder={locale === "tr" ? "Doküman adı" : "Document title"}
                />
                <select value={docType} onChange={(event) => setDocType(event.target.value as any)}>
                  {DOC_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {documentTypeLabel(option, locale)}
                    </option>
                  ))}
                </select>
                <select value={docStatus} onChange={(event) => setDocStatus(event.target.value as any)}>
                  {DOC_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option, locale)}
                    </option>
                  ))}
                </select>
                <input
                  value={docRevision}
                  onChange={(event) => setDocRevision(event.target.value)}
                  placeholder={locale === "tr" ? "Revizyon" : "Revision"}
                />
                <input
                  value={docOwnerDepartment}
                  onChange={(event) => setDocOwnerDepartment(event.target.value)}
                  placeholder={locale === "tr" ? "Departman" : "Department"}
                />
                <input
                  className="wide"
                  value={docUrl}
                  onChange={(event) => setDocUrl(event.target.value)}
                  placeholder={locale === "tr" ? "Link / dosya URL" : "Link / file URL"}
                />
                <textarea
                  className="wide"
                  value={docNotes}
                  onChange={(event) => setDocNotes(event.target.value)}
                  placeholder={locale === "tr" ? "Notlar" : "Notes"}
                  rows={3}
                />
                <button type="button" onClick={addDocument} disabled={saving}>
                  {locale === "tr" ? "Doküman ekle" : "Add document"}
                </button>
              </div>
            ) : null}

            <div className="document-list">
              {item.documents?.map((document) => (
                <article key={document.id}>
                  <div>
                    <strong>{document.title}</strong>
                    <span>
                      {documentTypeLabel(document.type, locale)} · {document.revision || "rev -"} ·{" "}
                      {document.ownerDepartment || "-"}
                    </span>
                    {document.notes ? <p>{document.notes}</p> : null}
                    <small>
                      {locale === "tr" ? "Güncelleme" : "Updated"}: {formatDate(document.updatedAt, locale)}
                      {document.updatedBy?.name ? ` · ${document.updatedBy.name}` : ""}
                    </small>
                  </div>
                  <div className="document-actions">
                    <select
                      value={document.status}
                      onChange={(event) => updateDocumentStatus(document, event.target.value as any)}
                      disabled={!canEdit}
                    >
                      {DOC_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {statusLabel(option, locale)}
                        </option>
                      ))}
                    </select>
                    {document.url ? (
                      <a href={document.url} target="_blank" rel="noopener noreferrer">
                        {locale === "tr" ? "Aç" : "Open"}
                      </a>
                    ) : null}
                    {canEdit ? (
                      <button type="button" className="ghost-danger" onClick={() => deleteDocument(document)}>
                        {locale === "tr" ? "Sil" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              {item.documents?.length === 0 ? (
                <div className="empty-line">{locale === "tr" ? "Doküman yok." : "No documents."}</div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="panel">
            <div className="panel-head compact">
              <div>
                <span>{locale === "tr" ? "Süreç özeti" : "Process summary"}</span>
                <h2>{categoryLabel(item.category, locale)}</h2>
              </div>
            </div>
            <div className="summary-list">
              <div>
                <span>{locale === "tr" ? "Durum" : "Status"}</span>
                <strong>{statusLabel(item.status, locale)}</strong>
              </div>
              <div>
                <span>{locale === "tr" ? "Departman" : "Department"}</span>
                <strong>{item.ownerDepartment || "-"}</strong>
              </div>
              <div>
                <span>{locale === "tr" ? "Oluşturma" : "Created"}</span>
                <strong>{formatDate(item.createdAt, locale)}</strong>
              </div>
              <div>
                <span>{locale === "tr" ? "Son güncelleme" : "Updated"}</span>
                <strong>{formatDate(item.updatedAt, locale)}</strong>
              </div>
            </div>
          </section>

          <section className="panel policy-panel">
            <div className="panel-head compact">
              <div>
                <span>{locale === "tr" ? "Kalite politikası" : "Quality policy"}</span>
                <h2>{locale === "tr" ? "İlgili politika maddeleri" : "Related policy principles"}</h2>
              </div>
            </div>

            <div className="policy-principles">
              {relatedPolicyItems.map((policy) => (
                <article key={policy.key}>
                  <strong>{policy.title[policyLocale]}</strong>
                  <p>{policy.detail[policyLocale]}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head compact">
              <div>
                <span>{locale === "tr" ? "Aktivite" : "Activity"}</span>
                <h2>{locale === "tr" ? "Kayıtlar" : "Logs"}</h2>
              </div>
            </div>

            {canEdit ? (
              <div className="log-form">
                <textarea
                  value={newLog}
                  onChange={(event) => setNewLog(event.target.value)}
                  placeholder={locale === "tr" ? "Yeni not yaz..." : "Write a new note..."}
                  rows={3}
                />
                <button type="button" onClick={addLog} disabled={saving}>
                  {locale === "tr" ? "Not ekle" : "Add note"}
                </button>
              </div>
            ) : null}

            <div className="log-list">
              {item.logs?.map((log) => (
                <article key={log.id}>
                  <strong>{log.action.replaceAll("_", " ")}</strong>
                  <p>{log.note || "-"}</p>
                  <span>
                    {formatDate(log.createdAt, locale)}
                    {log.createdBy?.name ? ` · ${log.createdBy.name}` : ""}
                  </span>
                </article>
              ))}
              {item.logs?.length === 0 ? (
                <div className="empty-line">{locale === "tr" ? "Log yok." : "No logs."}</div>
              ) : null}
            </div>
          </section>
        </aside>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .quality-detail-page {
    display: grid;
    gap: 18px;
    padding: 8px 0 32px;
  }

  .map-drawer-toggle {
    position: fixed;
    z-index: 92;
    top: max(14px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
    min-width: 166px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 1px solid #082f67;
    border-radius: 8px;
    background: #0b3a75;
    box-shadow: 0 10px 24px rgba(7, 40, 84, 0.22);
    color: #ffffff;
    padding: 0 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    transition: background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .map-drawer-toggle:hover {
    background: #062f68;
    box-shadow: 0 13px 28px rgba(7, 40, 84, 0.28);
    transform: translateY(-1px);
  }

  .map-drawer-toggle.open {
    background: #10213b;
  }

  .map-drawer-toggle span {
    width: 19px;
    display: inline-grid;
    place-items: center;
    font-size: 21px;
    font-weight: 700;
    line-height: 1;
  }

  .map-drawer-backdrop {
    position: fixed;
    z-index: 80;
    inset: 0;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: default;
    animation: map-backdrop-in 180ms ease both;
  }

  .map-drawer-panel {
    position: fixed;
    z-index: 88;
    top: max(68px, calc(env(safe-area-inset-top) + 58px));
    right: max(16px, env(safe-area-inset-right));
    width: min(620px, calc(100vw - 32px));
    max-height: calc(100dvh - 84px);
    overflow: auto;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 28px 70px rgba(4, 29, 66, 0.3);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(calc(100% + 36px));
    transition:
      transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 180ms ease,
      visibility 0s linear 260ms;
    scrollbar-width: thin;
  }

  .map-drawer-panel.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(0);
    transition:
      transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 180ms ease,
      visibility 0s;
  }

  .map-drawer-panel .mini-map {
    min-width: 520px;
    border-radius: 12px;
    box-shadow: none;
  }

  @keyframes map-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .detail-hero,
  .panel {
    border: 1px solid var(--stroke);
    border-radius: 22px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .detail-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    padding: clamp(18px, 2.4vw, 30px);
    background:
      radial-gradient(circle at 85% 20%, rgba(11, 58, 117, 0.14), transparent 28%),
      linear-gradient(135deg, var(--surface), var(--surface-2));
  }

  .hero-copy {
    min-width: 0;
    align-self: end;
  }

  .hero-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .language-switch {
    display: inline-grid;
    grid-template-columns: repeat(2, 42px);
    gap: 4px;
    border: 1px solid var(--stroke);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.75);
    padding: 4px;
  }

  .language-switch button {
    min-height: 32px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #0b3a75;
    padding: 0;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
  }

  .language-switch button.active {
    background: #0b3a75;
    color: #fff;
  }

  .hero-side {
    display: grid;
    gap: 12px;
    align-self: start;
    padding-top: 48px;
  }

  a {
    color: #0b3a75;
    font-weight: 900;
    text-decoration: none;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 10px;
  }

  .title-row span {
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    border-radius: 999px;
    background: #0b3a75;
    color: #fff;
    padding: 0 14px;
    font-weight: 1000;
  }

  .title-row h1 {
    margin: 0;
    color: var(--text-primary);
    font-size: clamp(30px, 4vw, 54px);
    line-height: 1;
  }

  .detail-hero p {
    max-width: 860px;
    margin: 12px 0 0;
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.45;
  }

  .mini-map {
    border: 1.5px solid #0b3a75;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 16px 36px rgba(8, 41, 86, 0.1);
    padding: 8px;
    color: #082956;
  }

  .mini-poster-head {
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .mini-poster-head img {
    width: 54px;
    height: auto;
  }

  .mini-poster-head a {
    display: grid;
    gap: 2px;
    justify-items: center;
    color: #0b3a75;
    text-align: center;
  }

  .mini-poster-head strong {
    font-size: 12px;
    line-height: 1.05;
    font-weight: 1000;
  }

  .mini-poster-head span {
    color: #315f94;
    font-size: 9px;
    font-weight: 1000;
  }

  .mini-poster-grid {
    display: grid;
    grid-template-columns: 82px minmax(0, 1fr) 92px;
    gap: 6px;
    align-items: stretch;
  }

  .mini-context,
  .mini-center-map {
    border: 1px solid #86b3d8;
    border-radius: 9px;
    background: #fbfdff;
    padding: 5px;
  }

  .mini-bar {
    min-height: 19px;
    display: grid;
    place-items: center;
    border-radius: 5px;
    background: #053574;
    color: #fff;
    text-align: center;
    font-size: 7px;
    font-weight: 1000;
    text-transform: uppercase;
    line-height: 1.05;
  }

  .mini-context-list {
    display: grid;
    gap: 5px;
    margin-top: 6px;
  }

  .mini-node {
    min-height: 29px;
    display: grid;
    place-items: center;
    border: 1px solid #d8a94d;
    border-radius: 6px;
    background: #fff9ee;
    color: #0b3a75;
    padding: 2px;
    text-align: center;
    transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
  }

  .mini-node b {
    display: block;
    font-size: 8px;
    line-height: 1;
    font-weight: 1000;
  }

  .mini-node em {
    display: block;
    margin-top: 2px;
    color: #082956;
    font-size: 6px;
    font-style: normal;
    font-weight: 900;
    line-height: 1.05;
  }

  .mini-node:hover,
  .mini-node.active {
    border-color: #0b3a75;
    background: #eaf7ff;
    transform: translateY(-1px);
  }

  .mini-node.active {
    box-shadow: inset 0 0 0 1px #0b3a75;
  }

  .mini-operational-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    margin-top: 6px;
  }

  .mini-tall {
    min-height: 42px;
  }

  .mini-main-flow {
    position: relative;
    display: grid;
    gap: 6px;
    justify-items: center;
    margin: 8px 8px 6px;
    padding: 3px 0;
  }

  .mini-main-flow::before {
    content: "";
    position: absolute;
    left: 17%;
    right: 17%;
    top: 38px;
    height: 78px;
    border: 1.4px solid rgba(17, 24, 39, 0.58);
    border-left-color: transparent;
    border-right-color: transparent;
    border-radius: 50%;
    pointer-events: none;
  }

  .mini-operation,
  .mini-improvement {
    width: min(150px, 78%);
    min-height: 35px;
  }

  .mini-core-row {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    align-items: center;
  }

  .mini-blue {
    background: #eaf7ff;
    border-color: #78b7db;
  }

  .mini-green {
    background: #ecfdf3;
    border-color: #8ccf8f;
  }

  .mini-support {
    display: grid;
    gap: 5px;
  }

  .mini-support > div {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
  }

  .mini-outputs {
    display: grid;
    gap: 5px;
    align-content: start;
  }

  .mini-outputs a {
    min-height: 34px;
    display: grid;
    align-items: center;
    background: #053574;
    color: #fff;
    clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%);
    padding: 5px 14px 5px 8px;
    font-size: 7px;
    font-weight: 1000;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .mini-bottom-lanes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin-top: 6px;
  }

  .mini-bottom-lanes section {
    border: 1px solid #86b3d8;
    border-radius: 8px;
    padding: 5px;
  }

  .mini-bottom-lanes section > div {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    margin-top: 5px;
  }

  .mini-values {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin: 7px -8px -8px;
    background: #053574;
    border-radius: 0 0 10px 10px;
    overflow: hidden;
  }

  .mini-values a {
    min-height: 26px;
    display: grid;
    place-items: center;
    border-left: 1px solid rgba(255, 255, 255, 0.24);
    color: #fff;
    font-size: 7px;
    font-weight: 1000;
    text-align: center;
  }

  .mini-values a:first-child {
    border-left: 0;
  }

  .hero-stats {
    display: grid;
    grid-template-columns: repeat(2, 140px);
    gap: 10px;
  }

  .hero-stats article {
    border: 1px solid var(--stroke);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.82);
    padding: 14px;
  }

  .hero-stats span,
  .hero-stats small {
    display: block;
    color: var(--text-secondary);
    font-weight: 800;
  }

  .hero-stats strong {
    display: block;
    margin: 6px 0 3px;
    color: var(--text-primary);
    font-size: 30px;
    line-height: 1;
  }

  .error-box {
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 18px;
    background: rgba(254, 242, 242, 0.9);
    color: #b91c1c;
    padding: 14px;
    font-weight: 900;
  }

  .iso-guide {
    overflow: hidden;
    border: 1px solid #b8cce2;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: var(--shadow-sm);
  }

  .iso-guide-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: clamp(18px, 2.2vw, 26px);
    border-bottom: 1px solid #d8e3ef;
    background: #f5f9fd;
  }

  .iso-guide-head h2,
  .iso-guide-head p {
    margin: 0;
  }

  .iso-guide-head h2 {
    margin-top: 7px;
    color: #10213b;
    font-size: clamp(22px, 2vw, 30px);
  }

  .iso-guide-head p {
    max-width: 850px;
    margin-top: 8px;
    color: #5b6b80;
    line-height: 1.55;
  }

  .iso-guide-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    color: #0b3a75;
    font-size: 11px;
    font-weight: 1000;
    text-transform: uppercase;
  }

  .iso-guide-eyebrow span {
    border-radius: 999px;
    background: #0b3a75;
    color: #ffffff;
    padding: 5px 9px;
  }

  .iso-guide-eyebrow b {
    color: #60738b;
  }

  .iso-guide-actions {
    display: flex;
    gap: 8px;
    flex: 0 0 auto;
  }

  .iso-guide-actions button {
    min-height: 38px;
    border-radius: 8px;
    background: #ffffff;
    color: #0b3a75;
    padding: 0 12px;
  }

  .iso-clause-list article {
    border-bottom: 1px solid #e0e8f1;
  }

  .iso-clause-list article:last-child {
    border-bottom: 0;
  }

  .iso-clause-trigger {
    width: 100%;
    min-height: 66px;
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 14px;
    border: 0;
    border-radius: 0;
    background: #ffffff;
    color: #10213b;
    padding: 12px clamp(16px, 2.2vw, 26px);
    text-align: left;
  }

  .iso-clause-trigger:hover,
  .iso-clause-list article.open .iso-clause-trigger {
    background: #f3f8fd;
  }

  .iso-clause-trigger span {
    color: #0b3a75;
    font-size: 16px;
    font-weight: 1000;
  }

  .iso-clause-trigger strong {
    min-width: 0;
    font-size: 16px;
    line-height: 1.35;
  }

  .iso-clause-trigger i,
  .iso-framework > button i {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 1px solid #c8d7e6;
    border-radius: 50%;
    color: #0b3a75;
    font-style: normal;
    font-size: 20px;
    line-height: 1;
  }

  .iso-clause-body {
    display: grid;
    grid-template-columns: minmax(280px, 0.8fr) minmax(420px, 1.2fr);
    gap: 24px;
    padding: 4px clamp(16px, 2.2vw, 26px) 24px 128px;
    background: #f8fbfe;
  }

  .iso-clause-summary {
    min-width: 0;
  }

  .iso-section-label {
    display: block;
    margin-bottom: 12px;
    color: #0b3a75;
    font-size: 12px;
    text-transform: uppercase;
  }

  .iso-clause-summary > ol {
    display: grid;
    gap: 10px;
    margin: 0;
    padding-left: 22px;
    color: #34455c;
  }

  .iso-clause-summary > ol li {
    padding-left: 4px;
    line-height: 1.55;
  }

  .iso-clause-summary > ol li::marker {
    color: #0b3a75;
    font-weight: 1000;
  }

  .iso-evidence {
    margin-top: 18px;
    border-left: 3px solid #d6a649;
    background: #fff9ed;
    padding: 14px 16px;
  }

  .iso-evidence b {
    display: block;
    margin-bottom: 8px;
    color: #7a5204;
    font-size: 12px;
    text-transform: uppercase;
  }

  .iso-evidence ul {
    display: grid;
    gap: 6px;
    margin: 0;
    padding-left: 18px;
    color: #5d4b27;
    line-height: 1.4;
  }

  .iso-source-text {
    min-width: 0;
    align-self: start;
    border-left: 1px solid #cad8e7;
    padding-left: 24px;
  }

  .iso-source-text summary,
  .iso-foundation-source summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    list-style: none;
    border: 1px solid #d4e0eb;
    border-radius: 8px;
    background: #f7fafc;
    padding: 12px 14px;
    cursor: pointer;
    user-select: none;
  }

  .iso-source-text summary::-webkit-details-marker,
  .iso-foundation-source summary::-webkit-details-marker {
    display: none;
  }

  .iso-source-text summary::after,
  .iso-foundation-source summary::after {
    content: "+";
    flex: 0 0 auto;
    color: #0b3a75;
    font-size: 20px;
    font-style: normal;
    font-weight: 900;
    line-height: 1;
  }

  .iso-source-text[open] summary::after,
  .iso-foundation-source[open] summary::after {
    content: "−";
  }

  .iso-source-text summary span,
  .iso-foundation-source summary span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .iso-source-text summary b,
  .iso-foundation-source summary b {
    color: #10213b;
    font-size: 13px;
    text-transform: uppercase;
  }

  .iso-source-text summary small,
  .iso-foundation-source summary small {
    color: #61738a;
    font-size: 11px;
    font-weight: 900;
  }

  .iso-source-text[open] summary,
  .iso-foundation-source[open] summary {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    background: #edf5fb;
  }

  .iso-source-content,
  .iso-foundation-source-content {
    max-height: 560px;
    overflow-y: auto;
    border: 1px solid #d4e0eb;
    border-top: 0;
    border-radius: 0 0 8px 8px;
    background: #ffffff;
    padding: 16px;
    scrollbar-width: thin;
  }

  .iso-source-text p,
  .iso-foundation-source p {
    margin: 0 0 11px;
    color: #33445a;
    font-size: 13px;
    line-height: 1.58;
  }

  .iso-source-text p:last-child,
  .iso-foundation-source p:last-child {
    margin-bottom: 0;
  }

  .iso-empty {
    padding: 24px;
    color: #64748b;
    font-weight: 800;
    text-align: center;
  }

  .iso-framework {
    border-top: 1px solid #cbd9e7;
    background: #eef5fb;
  }

  .iso-framework > button {
    width: 100%;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #10213b;
    padding: 14px clamp(16px, 2.2vw, 26px);
    text-align: left;
  }

  .iso-framework > button span,
  .iso-framework > button b,
  .iso-framework > button small {
    display: block;
  }

  .iso-framework > button b {
    font-size: 16px;
  }

  .iso-framework > button small {
    margin-top: 4px;
    color: #60738b;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.4;
  }

  .iso-framework-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    border-top: 1px solid #d5e1ec;
    background: #ffffff;
  }

  .iso-framework-grid article {
    position: relative;
    padding: 22px 24px 22px 72px;
    border-right: 1px solid #e0e8f1;
    border-bottom: 1px solid #e0e8f1;
  }

  .iso-framework-grid article:nth-child(2n) {
    border-right: 0;
  }

  .iso-framework-grid .iso-annex-card {
    grid-column: 1 / -1;
    border-right: 0;
  }

  .iso-framework-grid article > span {
    position: absolute;
    top: 22px;
    left: 22px;
    color: #0b3a75;
    font-size: 15px;
    font-weight: 1000;
  }

  .iso-framework-grid h3 {
    margin: 0 0 10px;
    color: #10213b;
    font-size: 17px;
  }

  .iso-framework-grid ul {
    display: grid;
    gap: 7px;
    margin: 0;
    padding-left: 18px;
    color: #4b5d73;
    line-height: 1.5;
  }

  .iso-foundation-source {
    margin-top: 18px;
    border-top: 1px solid #d8e3ee;
    padding-top: 15px;
  }

  .iso-annex-card .iso-foundation-source-content {
    max-height: 620px;
  }

  .iso-figure-transcription {
    margin-top: 16px;
    border: 1px solid #c9ddec;
    border-radius: 8px;
    background: #f1f7fc;
    padding: 14px 16px;
  }

  .iso-figure-transcription > b {
    display: block;
    margin-bottom: 9px;
    color: #0b3a75;
    font-size: 12px;
  }

  .iso-figure-transcription ul {
    color: #334a64;
    font-size: 13px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 18px;
    align-items: start;
  }

  .main-column,
  .side-column {
    display: grid;
    gap: 18px;
  }

  .panel {
    padding: clamp(16px, 2vw, 22px);
  }

  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
  }

  .panel-head.compact {
    margin-bottom: 12px;
  }

  .panel-head span {
    display: block;
    color: #0b3a75;
    font-size: 12px;
    font-weight: 1000;
    text-transform: uppercase;
  }

  .panel-head h2 {
    margin: 4px 0 0;
    color: var(--text-primary);
    font-size: 24px;
  }

  button,
  .document-actions a {
    min-height: 44px;
    border: 1px solid var(--stroke);
    border-radius: 13px;
    background: #0b3a75;
    color: #fff;
    padding: 0 14px;
    font-weight: 900;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .form-grid,
  .document-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  label {
    display: grid;
    gap: 7px;
  }

  label span {
    color: var(--text-secondary);
    font-weight: 900;
    font-size: 13px;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid var(--stroke);
    border-radius: 14px;
    background: var(--surface-2);
    color: var(--text-primary);
    padding: 12px 14px;
    font-size: 15px;
    outline: none;
  }

  input,
  select {
    min-height: 48px;
  }

  textarea {
    resize: vertical;
  }

  .wide {
    grid-column: 1 / -1;
  }

  .add-checklist {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) 150px 120px auto;
    gap: 10px;
    margin-bottom: 14px;
  }

  .inline-check {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    border: 1px solid var(--stroke);
    border-radius: 14px;
    background: var(--surface-2);
    padding: 0 12px;
    color: var(--text-secondary);
    font-weight: 900;
  }

  .inline-check input {
    width: 18px;
    min-height: 18px;
    padding: 0;
  }

  .checklist-list,
  .document-list,
  .log-list {
    display: grid;
    gap: 10px;
  }

  .checklist-list article,
  .document-list article,
  .log-list article {
    border: 1px solid var(--stroke);
    border-radius: 16px;
    background: var(--surface-2);
    padding: 12px;
  }

  .checklist-list article {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .checklist-list article.done {
    background: rgba(220, 252, 231, 0.72);
  }

  .check-button {
    width: 34px;
    height: 34px;
    min-height: 34px;
    border-radius: 999px;
    background: #fff;
    color: #16a34a;
    padding: 0;
    font-size: 18px;
  }

  .checklist-list strong,
  .document-list strong,
  .log-list strong {
    display: block;
    color: var(--text-primary);
    font-size: 16px;
  }

  .checklist-list span,
  .document-list span,
  .checklist-list small,
  .document-list small,
  .log-list span {
    display: block;
    margin-top: 4px;
    color: var(--text-secondary);
    line-height: 1.35;
  }

  .document-form {
    margin-bottom: 14px;
  }

  .document-list article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 12px;
    align-items: center;
  }

  .document-list p,
  .log-list p {
    margin: 8px 0 0;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .document-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .document-actions select {
    min-width: 130px;
  }

  .ghost-danger {
    border-color: rgba(239, 68, 68, 0.28);
    background: rgba(254, 242, 242, 0.9);
    color: #b91c1c;
  }

  .summary-list {
    display: grid;
    gap: 10px;
  }

  .summary-list div {
    border: 1px solid var(--stroke);
    border-radius: 14px;
    background: var(--surface-2);
    padding: 12px;
  }

  .summary-list span,
  .summary-list strong {
    display: block;
  }

  .summary-list span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .summary-list strong {
    margin-top: 5px;
    color: var(--text-primary);
    line-height: 1.35;
  }

  .policy-panel {
    background:
      linear-gradient(135deg, rgba(11, 74, 148, 0.06), transparent 48%),
      var(--surface);
  }

  .policy-principles {
    display: grid;
    gap: 10px;
  }

  .policy-principles article {
    border: 1px solid color-mix(in srgb, #d4b76a 50%, var(--stroke));
    border-radius: 16px;
    background: color-mix(in srgb, #fff9ee 76%, var(--surface));
    padding: 12px;
  }

  .policy-principles strong {
    display: block;
    color: #0b3a75;
    font-size: 15px;
  }

  .policy-principles p {
    margin: 7px 0 0;
    color: var(--text-secondary);
    line-height: 1.45;
    font-size: 13px;
  }

  .log-form {
    display: grid;
    gap: 10px;
    margin-bottom: 14px;
  }

  .empty-line {
    border: 1px dashed var(--stroke);
    border-radius: 14px;
    color: var(--text-secondary);
    padding: 14px;
    text-align: center;
    font-weight: 800;
  }

  @media (max-width: 1100px) {
    .detail-grid,
    .detail-hero {
      grid-template-columns: 1fr;
      display: grid;
    }

    .hero-side,
    .form-grid,
    .document-form,
    .document-list article,
    .add-checklist {
      grid-template-columns: 1fr;
    }

    .hero-side {
      padding-top: 0;
    }

    .hero-copy {
      padding-top: 44px;
    }

    .document-actions {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .iso-guide-head,
    .iso-clause-body {
      grid-template-columns: 1fr;
      display: grid;
    }

    .iso-guide-actions {
      justify-content: flex-start;
    }

    .iso-clause-body {
      padding: 6px 18px 20px 54px;
    }

    .iso-source-text {
      border-top: 1px solid #cad8e7;
      border-left: 0;
      padding-top: 20px;
      padding-left: 0;
    }
  }

  @media (max-width: 640px) {
    .quality-detail-page {
      padding-top: 8px;
    }

    .map-drawer-toggle {
      top: max(10px, env(safe-area-inset-top));
      right: max(10px, env(safe-area-inset-right));
      min-width: 150px;
      min-height: 40px;
      padding-inline: 12px;
      font-size: 12px;
    }

    .map-drawer-panel {
      top: max(58px, calc(env(safe-area-inset-top) + 50px));
      right: max(8px, env(safe-area-inset-right));
      width: calc(100vw - 16px);
      max-height: calc(100dvh - 68px);
    }

    .hero-stats {
      grid-template-columns: 1fr;
      width: 100%;
    }

    .iso-guide-head {
      gap: 16px;
    }

    .iso-guide-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
    }

    .iso-clause-trigger {
      grid-template-columns: 54px minmax(0, 1fr) 28px;
      gap: 8px;
      padding-inline: 14px;
    }

    .iso-clause-trigger span,
    .iso-clause-trigger strong {
      font-size: 14px;
    }

    .iso-clause-body {
      padding: 4px 16px 18px 32px;
    }

    .iso-source-text summary,
    .iso-foundation-source summary {
      align-items: flex-start;
    }

    .iso-framework-grid {
      grid-template-columns: 1fr;
    }

    .iso-framework-grid article,
    .iso-framework-grid article:nth-child(2n) {
      border-right: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .map-drawer-toggle,
    .map-drawer-panel {
      transition: none;
    }

    .map-drawer-backdrop {
      animation: none;
    }
  }
`;
