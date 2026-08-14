"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
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

const MINI_CONTEXT = [
  ["4.1", "Organization"],
  ["4.2", "Parties"],
  ["4.3", "Scope"],
  ["4.4", "Processes"],
];

const MINI_OPERATIONAL = [
  ["8.1", "Plan"],
  ["8.2", "Terms"],
  ["8.3", "Design"],
  ["8.4", "Supply"],
  ["8.5", "Produce"],
  ["8.6", "Release"],
  ["8.7", "Control"],
];

const MINI_SUPPORT = [
  ["7.1", "Resources"],
  ["7.2", "Competence"],
  ["7.3", "Awareness"],
  ["7.4", "Info"],
  ["7.5", "Docs"],
];

const MINI_VALUES = [
  ["5", "Integrity"],
  ["7.4", "Courtesy"],
  ["7.4", "Clarity"],
  ["8.6", "Quality"],
  ["7.2", "Experience"],
];

function MiniQualityMap({
  currentCode,
  hrefByCode,
}: {
  currentCode: string;
  hrefByCode: Map<string, string>;
}) {
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
    <aside className="mini-map" aria-label="Quality process mini map">
      <header className="mini-poster-head">
        <img src="/dndblack.png" alt="DND" />
        <Link href="/quality-control">
          <strong>DND QUALITY MANAGEMENT SYSTEM</strong>
          <span>Trust | Quality | Value</span>
        </Link>
      </header>

      <div className="mini-poster-grid">
        <section className="mini-context">
          <Link className="mini-bar" href={hrefByCode.get("4.1") || "/quality-control"}>
            Context
          </Link>
          <div className="mini-context-list">
            {MINI_CONTEXT.map(([code, label]) => node(code, label))}
          </div>
        </section>

        <section className="mini-center-map">
          <Link className="mini-bar mini-operational-bar" href={hrefByCode.get("8") || "/quality-control"}>
            8. Operational
          </Link>
          <div className="mini-operational-row">
            {MINI_OPERATIONAL.map(([code, label]) => node(code, label, "mini-tall"))}
          </div>
          <div className="mini-main-flow">
            {node("8", "Operation", "mini-operation")}
            <div className="mini-core-row">
              {node("6", "Planning", "mini-blue")}
              {node("5", "Leadership", "mini-green")}
              {node("9", "Performance", "mini-blue")}
            </div>
            {node("10", "Improvement", "mini-blue mini-improvement")}
          </div>
          <div className="mini-support">
            <Link className="mini-bar" href={hrefByCode.get("7") || "/quality-control"}>
              7. Support
            </Link>
            <div>
              {MINI_SUPPORT.map(([code, label]) => node(code, label))}
            </div>
          </div>
        </section>

        <section className="mini-outputs">
          <Link href={hrefByCode.get("9.1") || "/quality-control"}>Customer satisfaction</Link>
          <Link href={hrefByCode.get("9") || "/quality-control"}>QMS results</Link>
          <Link href={hrefByCode.get("8.2") || "/quality-control"}>Products & services</Link>
          <Link href={hrefByCode.get("4.4") || "/quality-control"}>Management system</Link>
        </section>
      </div>

      <div className="mini-bottom-lanes">
        <section>
          <Link className="mini-bar" href={hrefByCode.get("İNŞAAT") || "/quality-control"}>
            Construction production
          </Link>
          <div>
            {node("6", "Project")}
            {node("8.3", "Design")}
            {node("8.4", "Supply")}
            {node("8.5", "Build")}
            {node("8.6", "Test")}
          </div>
        </section>
        <section>
          <Link className="mini-bar" href={hrefByCode.get("SATIŞ") || "/quality-control"}>
            Real estate sales
          </Link>
          <div>
            {node("7.4", "Market")}
            {node("4.2", "Customer")}
            {node("8.2", "Contract")}
            {node("8.6", "Deliver")}
            {node("9.1", "After sales")}
          </div>
        </section>
      </div>

      <footer className="mini-values">
        {MINI_VALUES.map(([code, label]) => (
          <Link key={label} href={hrefByCode.get(code) || "/quality-control"}>
            {label}
          </Link>
        ))}
      </footer>
    </aside>
  );
}

export default function QualityDetailPage() {
  const { locale } = useLanguage();
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

  return (
    <main className="quality-detail-page">
      <section className="detail-hero">
        <div className="hero-copy">
          <Link href="/quality-control">← {locale === "tr" ? "Kalite modülü" : "Quality module"}</Link>
          <div className="title-row">
            <span>{item.code}</span>
            <h1>{item.title}</h1>
          </div>
          <p>{item.description || "-"}</p>
        </div>
        <div className="hero-side">
          <MiniQualityMap currentCode={item.code} hrefByCode={hrefByCode} />
          <div className="hero-stats">
            <article>
              <span>{locale === "tr" ? "Checklist" : "Checklist"}</span>
              <strong>{completion}%</strong>
              <small>{checklistDone}/{checklistTotal}</small>
            </article>
            <article>
              <span>{locale === "tr" ? "Doküman" : "Documents"}</span>
              <strong>{item.documents?.length || 0}</strong>
              <small>{reviewDocs} review</small>
            </article>
          </div>
        </div>
      </section>

      {err ? <div className="error-box">{err}</div> : null}

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

  .detail-hero,
  .panel {
    border: 1px solid var(--stroke);
    border-radius: 22px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .detail-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(420px, 560px);
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

  .hero-side {
    display: grid;
    gap: 12px;
    align-self: start;
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

    .hero-stats,
    .hero-side,
    .form-grid,
    .document-form,
    .document-list article,
    .add-checklist {
      grid-template-columns: 1fr;
    }

    .document-actions {
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }
`;
