"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckSquare,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import {
  isoClauseHref,
  type IsoClauseMeta,
  type IsoDetailResponse,
  type IsoDocumentStatus,
  type IsoDocumentType,
  type IsoProcessStatus,
  type IsoWorkspace,
  type IsoWorkspaceDocument,
} from "../_lib/types";
import s from "./iso-detail.module.css";

const ProcessDiagram = dynamic(() =>
  import("./IsoDiagrams").then((module) => module.ProcessDiagram),
);
const PdcaDiagram = dynamic(() =>
  import("./IsoDiagrams").then((module) => module.PdcaDiagram),
);

type Tab = "overview" | "checklist" | "documents" | "activity";
type Access = "loading" | "allowed" | "denied" | "login";
type CardDraft = {
  title: string;
  description: string;
  ownerDepartment: string;
  status: IsoProcessStatus;
};
type DocumentDraft = {
  title: string;
  type: IsoDocumentType;
  status: IsoDocumentStatus;
  revision: string;
  ownerDepartment: string;
  url: string;
  notes: string;
};
const ROLES = ["ADMIN", "MANAGER", "AFTERSALES", "SALES", "PREVIEW"];
const DOC_TYPES: IsoDocumentType[] = [
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
const DOC_STATUSES: IsoDocumentStatus[] = [
  "DRAFT",
  "ACTIVE",
  "NEEDS_REVIEW",
  "ARCHIVED",
];
const EMPTY_CARD: CardDraft = {
  title: "",
  description: "",
  ownerDepartment: "",
  status: "ACTIVE",
};
const emptyDocument = (): DocumentDraft => ({
  title: "",
  type: "PROCEDURE",
  status: "ACTIVE",
  revision: "",
  ownerDepartment: "",
  url: "",
  notes: "",
});
const fromCard = (card: IsoWorkspace): CardDraft => ({
  title: card.title || "",
  description: card.description || "",
  ownerDepartment: card.ownerDepartment || "",
  status: card.status,
});

function requestMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  try {
    const body = JSON.parse(error.message) as { message?: string | string[] };
    const message = Array.isArray(body.message)
      ? body.message.join(" · ")
      : body.message;
    return typeof message === "string" && message.trim()
      ? message.slice(0, 600)
      : fallback;
  } catch {
    return fallback;
  }
}
function safeDocumentUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function dateInput(value: string | null | undefined) {
  return value?.slice(0, 10) || "";
}
function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Famagusta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function IsoClauseDetail({ code }: { code: string }) {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const t = (turkish: string, english: string) => (tr ? turkish : english);
  const id = useId();
  const [access, setAccess] = useState<Access>("loading");
  const [canEdit, setCanEdit] = useState(false);
  const [data, setData] = useState<IsoDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [cardDraft, setCardDraft] = useState<CardDraft>(EMPTY_CARD);
  const [checkDraft, setCheckDraft] = useState({
    title: "",
    description: "",
    required: false,
    dueAt: "",
  });
  const [documentDraft, setDocumentDraft] =
    useState<DocumentDraft>(emptyDocument);
  const [editingDocument, setEditingDocument] = useState<string | null>(null);
  const [documentFormOpen, setDocumentFormOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "checklists" | "documents";
    id: string;
    title: string;
  } | null>(null);
  const tracker = useRef({
    id: 0,
    controller: null as AbortController | null,
    mounted: true,
    mutation: false,
  });
  const documentTitle = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const endpoint = `/iso-2026/${encodeURIComponent(code)}`;

  const load = useCallback(
    async (refreshDraft = false) => {
      const state = tracker.current;
      state.controller?.abort();
      const controller = new AbortController();
      state.controller = controller;
      const requestId = ++state.id;
      setLoading(true);
      try {
        const response = (await authedFetch(endpoint, {
          signal: controller.signal,
        })) as IsoDetailResponse;
        if (!state.mounted || requestId !== state.id) return null;
        setData(response);
        if (refreshDraft) setCardDraft(fromCard(response.item));
        setError("");
        return response;
      } catch (cause) {
        if (
          state.mounted &&
          !controller.signal.aborted &&
          requestId === state.id
        )
          setError(
            requestMessage(
              cause,
              "Madde yüklenemedi. / The clause could not be loaded.",
            ),
          );
        return null;
      } finally {
        if (state.mounted && requestId === state.id) setLoading(false);
      }
    },
    [endpoint],
  );

  useEffect(() => {
    const state = tracker.current;
    state.mounted = true;
    const frame = requestAnimationFrame(() => {
      const user = getUser() as {
        role?: string;
        originalRole?: string;
        isPreview?: boolean;
      } | null;
      if (!user) {
        setAccess("login");
        return;
      }
      if (!ROLES.includes(user.role || "")) {
        setAccess("denied");
        return;
      }
      setAccess("allowed");
      setCanEdit(
        user.role !== "PREVIEW" &&
          user.originalRole !== "PREVIEW" &&
          !user.isPreview,
      );
      void load(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      state.mounted = false;
      state.id++;
      state.controller?.abort();
    };
  }, [load]);

  async function mutate(
    suffix: string,
    method: "POST" | "PATCH" | "DELETE",
    payload: unknown,
    key: string,
    onSaved?: () => void,
  ) {
    const state = tracker.current;
    if (!canEdit || state.mutation) return;
    state.mutation = true;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await authedFetch(`${endpoint}${suffix}`, {
        method,
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });
      if (!state.mounted) return;
      onSaved?.();
      const refreshed = await load(key === "card");
      if (state.mounted)
        setNotice(
          refreshed
            ? t("Değişiklik kaydedildi.", "Your change was saved.")
            : t(
                "Değişiklik kaydedildi; güncel kayıtları görmek için yeniden yükleyin.",
                "Your change was saved; reload to see the updated records.",
              ),
        );
    } catch (cause) {
      if (state.mounted)
        setError(
          requestMessage(
            cause,
            t(
              "Değişiklik kaydedilemedi. Lütfen tekrar deneyin.",
              "The change could not be saved. Please try again.",
            ),
          ),
        );
    } finally {
      state.mutation = false;
      if (state.mounted) setBusy("");
    }
  }

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const blob = (await authedFetch(
        "/iso-2026/source/pdf",
        {},
        "blob",
      )) as Blob;
      if (!(blob instanceof Blob) || !blob.size) throw new Error("Empty PDF");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        data?.document.sourceFile?.split(/[\\/]/).pop() ||
        "ISO-2026-source.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      if (tracker.current.mounted)
        setError(
          requestMessage(
            cause,
            t(
              "Kaynak PDF indirilemedi.",
              "The source PDF could not be downloaded.",
            ),
          ),
        );
    } finally {
      if (tracker.current.mounted) setDownloading(false);
    }
  }

  function formatDate(value?: string | null) {
    if (!value || Number.isNaN(new Date(value).getTime())) return "—";
    return new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  }
  function statusLabel(value: string) {
    const names: Record<string, [string, string]> = {
      ACTIVE: ["Aktif", "Active"],
      NEEDS_REVIEW: ["İnceleme gerekli", "Needs review"],
      ARCHIVED: ["Arşiv", "Archived"],
      DRAFT: ["Taslak", "Draft"],
    };
    return names[value] ? t(...names[value]) : value;
  }
  function documentTypeLabel(value: string) {
    const names: Record<string, [string, string]> = {
      PROCEDURE: ["Prosedür", "Procedure"],
      POLICY: ["Politika", "Policy"],
      FORM: ["Form", "Form"],
      CHECKLIST: ["Kontrol listesi", "Checklist"],
      RECORD: ["Kayıt", "Record"],
      DRAWING: ["Çizim", "Drawing"],
      CONTRACT: ["Sözleşme", "Contract"],
      REPORT: ["Rapor", "Report"],
      OTHER: ["Diğer", "Other"],
    };
    return names[value] ? t(...names[value]) : value;
  }
  function clauseTitle(clause: IsoClauseMeta) {
    return tr ? clause.titleTr || clause.title : clause.title;
  }
  function startDocumentEdit(document: IsoWorkspaceDocument) {
    setEditingDocument(document.id);
    setDocumentDraft({
      title: document.title,
      type: document.type,
      status: document.status,
      revision: document.revision || "",
      ownerDepartment: document.ownerDepartment || "",
      url: document.url || "",
      notes: document.notes || "",
    });
    setDocumentFormOpen(true);
    requestAnimationFrame(() => documentTitle.current?.focus());
  }
  function saveDocument(event: FormEvent) {
    event.preventDefault();
    if (documentDraft.url.trim() && !safeDocumentUrl(documentDraft.url)) {
      setError(
        t(
          "Belge bağlantısı http:// veya https:// ile başlamalıdır.",
          "Document links must start with http:// or https://.",
        ),
      );
      return;
    }
    const payload = {
      ...documentDraft,
      title: documentDraft.title.trim(),
      url: documentDraft.url.trim() || null,
    };
    void mutate(
      editingDocument
        ? `/documents/${encodeURIComponent(editingDocument)}`
        : "/documents",
      editingDocument ? "PATCH" : "POST",
      payload,
      "document",
      () => {
        setDocumentDraft(emptyDocument());
        setEditingDocument(null);
        setDocumentFormOpen(false);
      },
    );
  }
  function actionLabel(action: string) {
    const names: Record<string, [string, string]> = {
      ISO2026_CARD_CREATE: ["Çalışma alanı oluşturuldu", "Workspace created"],
      ISO2026_CARD_UPDATE: ["Çalışma alanı güncellendi", "Workspace updated"],
      ISO2026_CHECKLIST_CREATE: [
        "Kontrol maddesi eklendi",
        "Checklist item added",
      ],
      ISO2026_CHECKLIST_UPDATE: [
        "Kontrol maddesi güncellendi",
        "Checklist item updated",
      ],
      ISO2026_CHECKLIST_DELETE: [
        "Kontrol maddesi silindi",
        "Checklist item deleted",
      ],
      ISO2026_DOCUMENT_CREATE: ["Belge eklendi", "Document added"],
      ISO2026_DOCUMENT_UPDATE: ["Belge güncellendi", "Document updated"],
      ISO2026_DOCUMENT_DELETE: ["Belge silindi", "Document deleted"],
      ISO2026_NOTE_CREATE: ["Not eklendi", "Note added"],
    };
    return names[action] ? t(...names[action]) : action.replaceAll("_", " ");
  }

  if (access === "login" || access === "denied")
    return (
      <main className={s.page}>
        <section className={s.emptyState}>
          <BookOpen size={30} />
          <h1>ISO 2026</h1>
          <p>
            {access === "login"
              ? t(
                  "Bu maddeyi görüntülemek için hesabınıza giriş yapın.",
                  "Sign in to view this clause.",
                )
              : t(
                  "Bu modüle erişim yetkiniz yok.",
                  "You do not have access to this module.",
                )}
          </p>
          <Link
            className={s.primaryButton}
            href={access === "login" ? "/" : "/leads"}
          >
            {access === "login"
              ? t("Giriş yap", "Sign in")
              : t("CRM’ye dön", "Back to CRM")}
          </Link>
        </section>
      </main>
    );
  if (!data)
    return (
      <main className={s.page}>
        <Link className={s.backLink} href="/iso-2026">
          <ArrowLeft size={16} /> ISO 2026
        </Link>
        <section className={s.emptyState} aria-live="polite">
          {error ? (
            <>
              <AlertCircle size={26} />
              <h1>{t("Madde görüntülenemedi", "Clause unavailable")}</h1>
              <p role="alert">{error}</p>
              <button
                className={s.primaryButton}
                disabled={loading}
                onClick={() => void load(true)}
              >
                <RefreshCw size={16} /> {t("Tekrar dene", "Try again")}
              </button>
            </>
          ) : (
            <>
              <LoaderCircle size={28} className={s.spin} />
              <p>{t("Madde yükleniyor…", "Loading clause…")}</p>
            </>
          )}
        </section>
      </main>
    );

  const { clause, item } = data;
  const done = item.checklists.filter((row) => row.isChecked).length;
  const required = item.checklists.filter((row) => row.required);
  const requiredDone = required.filter((row) => row.isChecked).length;
  const completion = item.checklists.length
    ? Math.round((done / item.checklists.length) * 100)
    : 0;
  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: "overview", label: t("Süreç", "Process") },
    {
      key: "checklist",
      label: t("Kontroller", "Checklist"),
      count: item.checklists.length,
    },
    {
      key: "documents",
      label: t("Belgeler", "Documents"),
      count: item.documents.length,
    },
    {
      key: "activity",
      label: t("Notlar", "Activity"),
      count: item.logs.length,
    },
  ];
  const dirty = JSON.stringify(cardDraft) !== JSON.stringify(fromCard(item));
  const selectedRelated = [...new Set(clause.relatedCodes || [])].filter(
    (value) => value !== clause.code,
  );
  const readonly = !canEdit || Boolean(busy);

  return (
    <main className={s.page}>
      <nav
        className={s.breadcrumbs}
        aria-label={t("Madde konumu", "Clause location")}
      >
        <Link href="/iso-2026">ISO 2026</Link>
        {data.ancestors.map((ancestor) => (
          <span key={ancestor.code}>
            <ChevronRight size={13} aria-hidden="true" />
            <Link
              href={isoClauseHref(ancestor.code)}
              title={clauseTitle(ancestor)}
            >
              {ancestor.code}
            </Link>
          </span>
        ))}
        <span>
          <ChevronRight size={13} aria-hidden="true" />
          <b aria-current="page">{clause.code}</b>
        </span>
      </nav>
      <header className={s.hero}>
        <div>
          <div className={s.eyebrow}>
            ISO 2026 <span>·</span> {data.document.reference}
          </div>
          <h1>
            <span>{clause.code}</span>
            {clauseTitle(clause)}
          </h1>
          {tr && clause.titleTr ? <p lang="en">{clause.title}</p> : null}
          <div className={s.heroMeta}>
            <span>{data.document.status}</span>
            <span>
              {t("Kaynak dili: İngilizce", "Source language: English")}
            </span>
            <span>
              {t("PDF sayfaları", "PDF pages")}:{" "}
              {clause.sourcePages.join(", ") || "—"}
            </span>
          </div>
        </div>
        <button
          className={s.pdfButton}
          type="button"
          onClick={() => void downloadPdf()}
          disabled={downloading}
        >
          {downloading ? (
            <LoaderCircle size={17} className={s.spin} />
          ) : (
            <Download size={17} />
          )}
          {t("Kaynak PDF’yi indir", "Download source PDF")}
        </button>
      </header>

      {error ? (
        <div className={s.error} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || Boolean(busy)}
            aria-label={t("Yeniden yükle", "Reload")}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className={s.notice} role="status">
          <Check size={17} />
          {notice}
        </div>
      ) : null}

      <div className={s.columns}>
        <div className={s.sourceColumn}>
          <section className={s.sourcePanel} aria-labelledby={`${id}-source`}>
            <header className={s.panelHead}>
              <div>
                <span className={s.overline}>
                  {t("Özgün kaynak", "Original source")}
                </span>
                <h2 id={`${id}-source`}>
                  <BookOpen size={19} />{" "}
                  {t("İngilizce madde metni", "English clause text")}
                </h2>
              </div>
              <span className={s.languageBadge}>EN</span>
            </header>
            <article className={s.sourceText} lang="en">
              <h3>
                {clause.code} {clause.title}
              </h3>
              {clause.body.trim() ? (
                clause.body
                  .split(/\n\s*\n/)
                  .map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p className={s.sourceEmpty} lang={locale}>
                  {t(
                    "Bu başlığın metni aşağıdaki alt maddelerde yer alıyor.",
                    "The content of this heading appears in its subclauses below.",
                  )}
                </p>
              )}
            </article>
            {clause.code === "0.3.1" ? (
              <div className={s.sourceDiagram}>
                <ProcessDiagram locale={locale} />
              </div>
            ) : null}
            {clause.code === "0.3.2" ? (
              <div className={s.sourceDiagram}>
                <PdcaDiagram locale={locale} />
              </div>
            ) : null}
            <footer className={s.sourceFooter}>
              <FileText size={15} />
              <span>
                {data.document.reference} · {t("PDF sayfa", "PDF page")}{" "}
                {clause.sourcePages.join(", ") || "—"}
              </span>
            </footer>
          </section>
          {data.children.length ? (
            <section className={s.sectionPanel}>
              <header className={s.panelHead}>
                <h2>{t("Alt maddeler", "Subclauses")}</h2>
                <span className={s.count}>{data.children.length}</span>
              </header>
              <div className={s.clauseLinks}>
                {data.children.map((child) => (
                  <Link href={isoClauseHref(child.code)} key={child.code}>
                    <b>{child.code}</b>
                    <span>{clauseTitle(child)}</span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {selectedRelated.length ? (
            <section className={s.sectionPanel}>
              <header className={s.panelHead}>
                <h2>{t("İlgili maddeler", "Related clauses")}</h2>
              </header>
              <div className={s.relatedLinks}>
                {selectedRelated.map((relatedCode) => (
                  <Link href={isoClauseHref(relatedCode)} key={relatedCode}>
                    {t("Madde", "Clause")} {relatedCode}
                    <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <nav
            className={s.stepNav}
            aria-label={t("Maddeler arasında gezin", "Browse clauses")}
          >
            {data.previous ? (
              <Link href={isoClauseHref(data.previous.code)}>
                <ArrowLeft size={17} />
                <span>
                  <small>{t("Önceki madde", "Previous clause")}</small>
                  <b>
                    {data.previous.code} · {clauseTitle(data.previous)}
                  </b>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {data.next ? (
              <Link href={isoClauseHref(data.next.code)}>
                <span>
                  <small>{t("Sonraki madde", "Next clause")}</small>
                  <b>
                    {data.next.code} · {clauseTitle(data.next)}
                  </b>
                </span>
                <ArrowRight size={17} />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>

        <aside className={s.workspace} aria-labelledby={`${id}-workspace`}>
          <header className={s.workspaceHead}>
            <div>
              <span className={s.overline}>
                {t("Bu madde için", "For this clause")}
              </span>
              <h2 id={`${id}-workspace`}>{t("Çalışma alanı", "Workspace")}</h2>
            </div>
            <span
              className={`${s.statusBadge} ${item.status === "NEEDS_REVIEW" ? s.reviewBadge : ""}`}
            >
              {statusLabel(item.status)}
            </span>
          </header>
          <div className={s.progressArea}>
            <div>
              <span>{t("Kontrol listesi", "Checklist")}</span>
              <b>
                {done}/{item.checklists.length}{" "}
                <small>· {tr ? `%${completion}` : `${completion}%`}</small>
              </b>
            </div>
            <progress
              value={completion}
              max={100}
              aria-label={t(
                "Kontrol listesi tamamlanma oranı",
                "Checklist completion",
              )}
            />
            <small>
              {t("Zorunlu maddeler", "Required items")}: {requiredDone}/
              {required.length}
            </small>
          </div>
          {!canEdit ? (
            <p className={s.readonlyNote}>
              {t(
                "Önizleme hesabı: çalışma kayıtlarını görüntüleyebilirsiniz.",
                "Preview account: workspace records are read-only.",
              )}
            </p>
          ) : null}
          <div
            className={s.tabs}
            role="tablist"
            aria-label={t("Çalışma alanı bölümleri", "Workspace sections")}
            ref={tabsRef}
            onKeyDown={(event) => {
              const current = tabs.findIndex((entry) => entry.key === tab);
              const next =
                event.key === "ArrowRight"
                  ? (current + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (current + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setTab(tabs[next].key);
              tabsRef.current
                ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
                [next]?.focus();
            }}
          >
            {tabs.map((entry) => (
              <button
                key={entry.key}
                id={`${id}-tab-${entry.key}`}
                role="tab"
                type="button"
                aria-selected={tab === entry.key}
                aria-controls={`${id}-panel-${entry.key}`}
                tabIndex={tab === entry.key ? 0 : -1}
                onClick={() => setTab(entry.key)}
              >
                {entry.label}
                {entry.count !== undefined ? <span>{entry.count}</span> : null}
              </button>
            ))}
          </div>
          {confirmDelete ? (
            <div className={s.confirmDelete} role="alert">
              <p>
                <strong>{confirmDelete.title}</strong>{" "}
                {t("kaydı silinsin mi?", "— delete this record?")}
              </p>
              <div>
                <button
                  className={s.dangerButton}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void mutate(
                      `/${confirmDelete.kind}/${encodeURIComponent(confirmDelete.id)}`,
                      "DELETE",
                      undefined,
                      "delete",
                      () => {
                        if (editingDocument === confirmDelete.id) {
                          setEditingDocument(null);
                          setDocumentFormOpen(false);
                          setDocumentDraft(emptyDocument());
                        }
                        setConfirmDelete(null);
                      },
                    )
                  }
                >
                  {t("Sil", "Delete")}
                </button>
                <button
                  className={s.secondaryButton}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmDelete(null)}
                >
                  {t("Vazgeç", "Cancel")}
                </button>
              </div>
            </div>
          ) : null}

          <section
            className={s.tabContent}
            id={`${id}-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${tab}`}
            aria-busy={Boolean(busy)}
          >
            {tab === "overview" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void mutate(
                    "",
                    "PATCH",
                    { ...cardDraft, title: cardDraft.title.trim() },
                    "card",
                  );
                }}
              >
                <fieldset className={s.form} disabled={readonly}>
                  <label>
                    <span>{t("Çalışma başlığı", "Working title")}</span>
                    <input
                      required
                      maxLength={240}
                      value={cardDraft.title}
                      onChange={(event) =>
                        setCardDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className={s.fieldPair}>
                    <label>
                      <span>{t("Sorumlu departman", "Owner department")}</span>
                      <input
                        maxLength={160}
                        value={cardDraft.ownerDepartment}
                        onChange={(event) =>
                          setCardDraft((current) => ({
                            ...current,
                            ownerDepartment: event.target.value,
                          }))
                        }
                        placeholder={t(
                          "Örn. Kalite yönetimi",
                          "e.g. Quality management",
                        )}
                      />
                    </label>
                    <label>
                      <span>{t("Süreç durumu", "Process status")}</span>
                      <select
                        aria-label={t("Süreç durumu", "Process status")}
                        value={cardDraft.status}
                        onChange={(event) =>
                          setCardDraft((current) => ({
                            ...current,
                            status: event.target.value as IsoProcessStatus,
                          }))
                        }
                      >
                        {(
                          [
                            "ACTIVE",
                            "NEEDS_REVIEW",
                            "ARCHIVED",
                          ] as IsoProcessStatus[]
                        ).map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>
                      {t("Uygulama açıklaması", "Implementation notes")}
                    </span>
                    <textarea
                      rows={6}
                      aria-label={t(
                        "Uygulama açıklaması",
                        "Implementation notes",
                      )}
                      value={cardDraft.description}
                      onChange={(event) =>
                        setCardDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t(
                        "Bu maddeyi kuruluşunuzda nasıl uyguladığınızı yazın.",
                        "Describe how your organization implements this clause.",
                      )}
                    />
                  </label>
                  {canEdit ? (
                    <div className={s.formActions}>
                      <button
                        className={s.primaryButton}
                        type="submit"
                        disabled={!dirty}
                      >
                        {busy === "card" ? (
                          <LoaderCircle size={16} className={s.spin} />
                        ) : (
                          <Save size={16} />
                        )}
                        {t("Kaydet", "Save")}
                      </button>
                      {dirty ? (
                        <span className={s.draftNote}>
                          {t("Kaydedilmemiş değişiklikler", "Unsaved changes")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
                {item.updatedAt ? (
                  <p className={s.smallNote}>
                    {t("Son güncelleme", "Last updated")}:{" "}
                    {formatDate(item.updatedAt)}
                  </p>
                ) : null}
              </form>
            ) : null}

            {tab === "checklist" ? (
              <div className={s.stack}>
                {canEdit ? (
                  <form
                    className={s.addForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void mutate(
                        "/checklists",
                        "POST",
                        {
                          ...checkDraft,
                          title: checkDraft.title.trim(),
                          dueAt: checkDraft.dueAt || null,
                        },
                        "check-new",
                        () =>
                          setCheckDraft({
                            title: "",
                            description: "",
                            required: false,
                            dueAt: "",
                          }),
                      );
                    }}
                  >
                    <fieldset className={s.form} disabled={readonly}>
                      <h3>
                        <Plus size={16} />
                        {t("Kontrol maddesi ekle", "Add a checklist item")}
                      </h3>
                      <label>
                        <span>{t("Kontrol maddesi", "Checklist item")}</span>
                        <input
                          required
                          maxLength={240}
                          value={checkDraft.title}
                          onChange={(event) =>
                            setCheckDraft((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t("Kısa açıklama", "Short description")}</span>
                        <textarea
                          rows={2}
                          aria-label={t("Kısa açıklama", "Short description")}
                          value={checkDraft.description}
                          onChange={(event) =>
                            setCheckDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className={s.fieldPair}>
                        <label>
                          <span>{t("Termin tarihi", "Due date")}</span>
                          <input
                            type="date"
                            value={checkDraft.dueAt}
                            onChange={(event) =>
                              setCheckDraft((current) => ({
                                ...current,
                                dueAt: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className={s.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={checkDraft.required}
                            onChange={(event) =>
                              setCheckDraft((current) => ({
                                ...current,
                                required: event.target.checked,
                              }))
                            }
                          />
                          <span>{t("Zorunlu kontrol", "Required item")}</span>
                        </label>
                      </div>
                      <button className={s.primaryButton} type="submit">
                        {busy === "check-new" ? (
                          <LoaderCircle size={16} className={s.spin} />
                        ) : (
                          <Plus size={16} />
                        )}
                        {t("Kontrol ekle", "Add item")}
                      </button>
                    </fieldset>
                  </form>
                ) : null}
                <div className={s.checklist}>
                  {item.checklists.map((row) => {
                    const overdue =
                      !row.isChecked &&
                      Boolean(row.dueAt) &&
                      dateInput(row.dueAt) < localToday();
                    return (
                      <article
                        className={`${s.checkItem} ${row.isChecked ? s.completed : ""} ${overdue ? s.overdue : ""}`}
                        key={row.id}
                      >
                        <input
                          type="checkbox"
                          checked={row.isChecked}
                          disabled={readonly}
                          aria-label={`${row.title}: ${row.isChecked ? t("tamamlanmadı olarak işaretle", "mark incomplete") : t("tamamlandı olarak işaretle", "mark complete")}`}
                          onChange={() =>
                            void mutate(
                              `/checklists/${encodeURIComponent(row.id)}`,
                              "PATCH",
                              { isChecked: !row.isChecked },
                              `check:${row.id}`,
                            )
                          }
                        />
                        <div>
                          <h3>{row.title}</h3>
                          {row.description ? <p>{row.description}</p> : null}
                          <div className={s.itemMeta}>
                            {row.required ? (
                              <span>{t("Zorunlu", "Required")}</span>
                            ) : null}
                            {row.dueAt ? (
                              <span>
                                {t("Termin", "Due")}: {formatDate(row.dueAt)}
                              </span>
                            ) : null}
                            {overdue ? (
                              <strong>{t("Gecikmiş", "Overdue")}</strong>
                            ) : null}
                            {row.checkedBy?.name ? (
                              <span>
                                {row.checkedBy.name} ·{" "}
                                {formatDate(row.checkedAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {canEdit ? (
                          <button
                            className={s.iconButton}
                            type="button"
                            disabled={readonly}
                            aria-label={`${row.title} ${t("kontrolünü sil", "delete checklist item")}`}
                            onClick={() =>
                              setConfirmDelete({
                                kind: "checklists",
                                id: row.id,
                                title: row.title,
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                {!item.checklists.length ? (
                  <div className={s.emptyList}>
                    <CheckSquare size={24} />
                    <p>
                      {t(
                        "Bu madde için henüz kontrol eklenmedi.",
                        "No checklist items have been added for this clause.",
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "documents" ? (
              <div className={s.stack}>
                {canEdit && !documentFormOpen ? (
                  <button
                    className={s.secondaryButton}
                    type="button"
                    disabled={readonly}
                    onClick={() => {
                      setEditingDocument(null);
                      setDocumentDraft(emptyDocument());
                      setDocumentFormOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    {t("Belge ekle", "Add document")}
                  </button>
                ) : null}
                {canEdit && documentFormOpen ? (
                  <form className={s.addForm} onSubmit={saveDocument}>
                    <fieldset className={s.form} disabled={readonly}>
                      <div className={s.formTitle}>
                        <h3>
                          {editingDocument
                            ? t("Belgeyi düzenle", "Edit document")
                            : t("Yeni belge", "New document")}
                        </h3>
                        <button
                          className={s.iconButton}
                          type="button"
                          aria-label={t(
                            "Belge formunu kapat",
                            "Close document form",
                          )}
                          onClick={() => {
                            setDocumentFormOpen(false);
                            setEditingDocument(null);
                            setDocumentDraft(emptyDocument());
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <label>
                        <span>{t("Belge adı", "Document title")}</span>
                        <input
                          ref={documentTitle}
                          required
                          maxLength={240}
                          value={documentDraft.title}
                          onChange={(event) =>
                            setDocumentDraft((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className={s.fieldPair}>
                        <label>
                          <span>{t("Belge türü", "Document type")}</span>
                          <select
                            aria-label={t("Belge türü", "Document type")}
                            value={documentDraft.type}
                            onChange={(event) =>
                              setDocumentDraft((current) => ({
                                ...current,
                                type: event.target.value as IsoDocumentType,
                              }))
                            }
                          >
                            {DOC_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {documentTypeLabel(type)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>{t("Belge durumu", "Document status")}</span>
                          <select
                            aria-label={t("Belge durumu", "Document status")}
                            value={documentDraft.status}
                            onChange={(event) =>
                              setDocumentDraft((current) => ({
                                ...current,
                                status: event.target.value as IsoDocumentStatus,
                              }))
                            }
                          >
                            {DOC_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className={s.fieldPair}>
                        <label>
                          <span>{t("Revizyon", "Revision")}</span>
                          <input
                            value={documentDraft.revision}
                            onChange={(event) =>
                              setDocumentDraft((current) => ({
                                ...current,
                                revision: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>
                            {t(
                              "Belge sorumlusu / departman",
                              "Document owner / department",
                            )}
                          </span>
                          <input
                            value={documentDraft.ownerDepartment}
                            onChange={(event) =>
                              setDocumentDraft((current) => ({
                                ...current,
                                ownerDepartment: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label>
                        <span>{t("Belge bağlantısı", "Document URL")}</span>
                        <input
                          type="url"
                          placeholder="https://"
                          value={documentDraft.url}
                          onChange={(event) =>
                            setDocumentDraft((current) => ({
                              ...current,
                              url: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t("Belge notu", "Document notes")}</span>
                        <textarea
                          rows={3}
                          aria-label={t("Belge notu", "Document notes")}
                          value={documentDraft.notes}
                          onChange={(event) =>
                            setDocumentDraft((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button className={s.primaryButton} type="submit">
                        {busy === "document" ? (
                          <LoaderCircle size={16} className={s.spin} />
                        ) : (
                          <Save size={16} />
                        )}
                        {t("Belgeyi kaydet", "Save document")}
                      </button>
                    </fieldset>
                  </form>
                ) : null}
                {item.documents.map((document) => (
                  <article className={s.documentCard} key={document.id}>
                    <div className={s.documentHeading}>
                      <FileText size={20} />
                      <div>
                        <h3>{document.title}</h3>
                        <p>
                          {documentTypeLabel(document.type)}
                          {document.revision
                            ? ` · ${t("Revizyon", "Revision")} ${document.revision}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`${s.statusBadge} ${document.status === "NEEDS_REVIEW" ? s.reviewBadge : ""}`}
                      >
                        {statusLabel(document.status)}
                      </span>
                    </div>
                    {document.ownerDepartment ? (
                      <p>{document.ownerDepartment}</p>
                    ) : null}
                    {document.notes ? <p>{document.notes}</p> : null}
                    <div className={s.documentActions}>
                      {safeDocumentUrl(document.url) ? (
                        <a
                          className={s.textButton}
                          href={safeDocumentUrl(document.url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={14} />
                          {t("Belgeyi aç", "Open document")}
                        </a>
                      ) : null}
                      {canEdit ? (
                        <>
                          <button
                            className={s.textButton}
                            type="button"
                            disabled={readonly}
                            onClick={() => startDocumentEdit(document)}
                          >
                            <Pencil size={14} />
                            {t("Düzenle", "Edit")}
                          </button>
                          <button
                            className={s.textButton}
                            type="button"
                            disabled={readonly}
                            onClick={() =>
                              setConfirmDelete({
                                kind: "documents",
                                id: document.id,
                                title: document.title,
                              })
                            }
                          >
                            <Trash2 size={14} />
                            {t("Sil", "Delete")}
                          </button>
                        </>
                      ) : null}
                    </div>
                    {document.updatedAt ? (
                      <small>
                        {formatDate(document.updatedAt)}
                        {document.updatedBy?.name
                          ? ` · ${document.updatedBy.name}`
                          : ""}
                      </small>
                    ) : null}
                  </article>
                ))}
                {!item.documents.length ? (
                  <div className={s.emptyList}>
                    <FileText size={24} />
                    <p>
                      {t(
                        "Bu maddeye henüz belge bağlanmadı.",
                        "No documents have been linked to this clause.",
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "activity" ? (
              <div className={s.stack}>
                {canEdit ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void mutate(
                        "/logs",
                        "POST",
                        { note: note.trim() },
                        "note",
                        () => setNote(""),
                      );
                    }}
                  >
                    <fieldset className={s.form} disabled={readonly}>
                      <label>
                        <span>{t("Yeni not", "New note")}</span>
                        <textarea
                          required
                          rows={4}
                          aria-label={t("Yeni not", "New note")}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder={t(
                            "İlerleme, karar veya takip notu ekleyin.",
                            "Add a progress update, decision or follow-up note.",
                          )}
                        />
                      </label>
                      <button className={s.primaryButton} type="submit">
                        {busy === "note" ? (
                          <LoaderCircle size={16} className={s.spin} />
                        ) : (
                          <Plus size={16} />
                        )}
                        {t("Not ekle", "Add note")}
                      </button>
                    </fieldset>
                  </form>
                ) : null}
                <div className={s.timeline}>
                  {item.logs.map((log) => (
                    <article key={log.id}>
                      <span className={s.timelineDot} />
                      <div>
                        <h3>{actionLabel(log.action)}</h3>
                        {log.note ? <p>{log.note}</p> : null}
                        <small>
                          {formatDate(log.createdAt)}
                          {log.createdBy?.name
                            ? ` · ${log.createdBy.name}`
                            : ""}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
                {!item.logs.length ? (
                  <div className={s.emptyList}>
                    <History size={24} />
                    <p>
                      {t(
                        "Bu maddenin işlem geçmişi henüz boş.",
                        "There is no activity for this clause yet.",
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
