"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FolderKanban,
  History,
  Link2,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserRound,
  Workflow,
} from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { errorText, useTeamWorkspace } from "../_lib/client";
import {
  activityFieldLabel,
  factorImpactLabel,
  healthLabel,
  kindLabel,
  linkKindLabel,
  priorityLabel,
  statusLabel,
  workstreamStatusLabel,
} from "../_lib/copy";
import {
  formatDate,
  formatDateTime,
  isOverdue,
  memberName,
  safeUrl,
} from "../_lib/model";
import type {
  ActivityPage,
  DigitalProject,
  ExternalFactor,
  ProjectActivity,
  ProjectDetail,
  ProjectInput,
  ProjectLink,
  Workstream,
} from "../_lib/types";
import ProjectForm from "./ProjectForm";
import {
  ConfirmForm,
  FactorForm,
  LinkForm,
  WorkstreamForm,
} from "./DetailForms";
import s from "../digital-team.module.css";
import d from "./detail.module.css";

type Tab = "overview" | "workstreams" | "factors" | "links" | "history";
type Collection = "workstreams" | "factors" | "links";
type Editor =
  | { type: "general" }
  | { type: "workstream"; initial: Workstream; isNew: boolean }
  | { type: "factor"; initial: ExternalFactor; isNew: boolean }
  | { type: "link"; initial: ProjectLink; isNew: boolean }
  | { type: "delete"; collection: Collection; id: string; name: string }
  | { type: "archive"; restore: boolean };

function editableInput(project: DigitalProject): ProjectInput {
  return {
    kind: project.kind,
    name: project.name,
    summary: project.summary,
    objective: project.objective,
    status: project.status,
    priority: project.priority,
    health: project.health,
    ownerId: project.ownerId,
    startDate: project.startDate,
    targetDate: project.targetDate,
    cadence: project.cadence,
    progress: project.progress,
    nextStep: project.nextStep,
    links: project.links,
    workstreams: project.workstreams,
    factors: project.factors,
  };
}

export default function ProjectDetailView({ id }: { id: string }) {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const {
    workspace,
    loading: workspaceLoading,
    denied,
    error: workspaceError,
    reload: reloadWorkspace,
  } = useTeamWorkspace();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const tabButtons = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<unknown>(null);
  const historyRevision = useRef(0);
  const path = "/digital-team/projects/" + encodeURIComponent(id);
  const applyDetail = useCallback((value: ProjectDetail) => {
    historyRevision.current += 1;
    setDetail(value);
    setActivities(value.updates);
    setNextCursor(value.nextCursor);
    setHistoryError(null);
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = (await authedFetch(path, { signal })) as ProjectDetail;
        if (!signal?.aborted) applyDetail(result);
      } catch (err) {
        if (!signal?.aborted) setLoadError(err);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [path, applyDetail],
  );
  useEffect(() => {
    if (!workspace || denied) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [workspace, denied, load]);

  const editable =
    !!workspace?.canEdit && !!detail?.canEdit && !busy && !loading;
  async function save(input: ProjectInput) {
    if (!detail || !editable)
      throw new Error(
        t(
          "Kayıt şu anda düzenlenemiyor.",
          "This record cannot be edited right now.",
        ),
      );
    setBusy(true);
    try {
      const progress =
        input.kind === "PROCESS"
          ? null
          : input.status === "COMPLETED" && input.progress !== null
            ? 100
            : input.progress;
      const result = (await authedFetch(path, {
        method: "PUT",
        body: JSON.stringify({
          ...input,
          progress,
          version: detail.project.version,
        }),
      })) as ProjectDetail;
      applyDetail(result);
    } finally {
      setBusy(false);
    }
  }
  async function savePatch(patch: Partial<ProjectInput>) {
    if (!detail) return;
    await save({ ...editableInput(detail.project), ...patch });
  }
  async function postNote(event: FormEvent) {
    event.preventDefault();
    if (!detail || !editable || !note.trim()) return;
    setBusy(true);
    setNoteError(null);
    try {
      const result = (await authedFetch(path + "/updates", {
        method: "POST",
        body: JSON.stringify({
          version: detail.project.version,
          body: note.trim(),
        }),
      })) as ProjectDetail;
      applyDetail(result);
      setNote("");
    } catch (err) {
      setNoteError(err);
    } finally {
      setBusy(false);
    }
  }
  async function moreHistory() {
    if (!nextCursor || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(null);
    const revision = historyRevision.current;
    try {
      const result = (await authedFetch(
        path + "/updates?cursor=" + encodeURIComponent(nextCursor),
      )) as ActivityPage;
      if (revision !== historyRevision.current) return;
      setActivities((current) => [
        ...current,
        ...result.items.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (revision === historyRevision.current) setHistoryError(err);
    } finally {
      setHistoryLoading(false);
    }
  }
  const closeEditor = () => setEditor(null);
  const back = (
    <Link href="/digital-team" className={d.back}>
      <ArrowLeft size={15} />
      {t("Dijital Ekip'e dön", "Back to Digital Team")}
    </Link>
  );

  if (denied)
    return (
      <div className={s.page}>
        {back}
        <div className={s.empty}>
          <ShieldAlert size={34} />
          <h1>{t("Erişim yetkisi gerekiyor", "Access required")}</h1>
          <p>
            {t(
              "Dijital Ekip modülüne yalnızca aktif ADMIN kullanıcıları erişebilir.",
              "Only active ADMIN users can access Digital Team.",
            )}
          </p>
        </div>
      </div>
    );
  if (workspaceLoading || (workspace && loading && !detail))
    return (
      <div className={s.page}>
        {back}
        <div className={s.empty} role="status">
          <LoaderCircle size={28} className={d.spin} />
          <p>{t("Kayıt yükleniyor…", "Loading record…")}</p>
        </div>
      </div>
    );
  if (workspaceError || loadError || !detail || !workspace) {
    const error = workspaceError || loadError;
    const notFound =
      error instanceof Error && /404|not found|bulunamadı/i.test(error.message);
    return (
      <div className={s.page}>
        {back}
        <div className={s.empty}>
          <FolderKanban size={34} />
          <h1>
            {notFound
              ? t("Kayıt bulunamadı", "Record not found")
              : t("Kayıt yüklenemedi", "Could not load record")}
          </h1>
          <p className={s.error} role="alert">
            {error
              ? errorText(error, locale)
              : t(
                  "Kayıt bilgilerine ulaşılamadı.",
                  "Record information is unavailable.",
                )}
          </p>
          <button
            className={s.secondary}
            onClick={() => {
              if (workspace) void load();
              else void reloadWorkspace();
            }}
          >
            <RotateCcw size={15} />
            {t("Tekrar dene", "Retry")}
          </button>
        </div>
      </div>
    );
  }

  const project = detail.project;
  const members = workspace.members;
  const owner = (ownerId: string | null) =>
    memberName(members, ownerId, locale);
  const openFactors = project.factors.filter(
    (factor) => factor.status === "OPEN",
  );
  const blockers = openFactors.filter((factor) => factor.impact === "BLOCKING");
  const completedParts = project.workstreams.filter(
    (part) => part.status === "DONE",
  ).length;
  const defaultChildOwner =
    members.find((member) => member.id === project.ownerId && member.isActive)
      ?.id || null;
  const addWorkstream = () =>
    setEditor({
      type: "workstream",
      isNew: true,
      initial: {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        ownerId: defaultChildOwner,
        status: "PLANNED",
        targetDate: null,
      },
    });
  const addFactor = () =>
    setEditor({
      type: "factor",
      isNew: true,
      initial: {
        id: crypto.randomUUID(),
        title: "",
        source: "",
        impact: "INFO",
        status: "OPEN",
        ownerId: defaultChildOwner,
        targetDate: null,
        nextAction: "",
        notes: "",
        url: "",
      },
    });
  const addLink = () =>
    setEditor({
      type: "link",
      isNew: true,
      initial: { id: crypto.randomUUID(), label: "", url: "", kind: "WEBSITE" },
    });
  const tabs = [
    {
      id: "overview",
      label: t("Genel bakış", "Overview"),
      Icon: FolderKanban,
      count: null,
    },
    {
      id: "workstreams",
      label: t("İş dağılımı", "Responsibilities"),
      Icon: Workflow,
      count: project.workstreams.length,
    },
    {
      id: "factors",
      label: t("Dış faktörler", "External factors"),
      Icon: ShieldAlert,
      count: openFactors.length,
    },
    {
      id: "links",
      label: t("Bağlantılar", "Links"),
      Icon: Link2,
      count: project.links.length,
    },
    {
      id: "history",
      label: t("Geçmiş ve notlar", "History and notes"),
      Icon: History,
      count: null,
    },
  ] as const;

  return (
    <div className={s.page}>
      {back}
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>
            DND · {t("DİJİTAL EKİP", "DIGITAL TEAM")} /{" "}
            {kindLabel(project.kind, locale)}
          </div>
          <h1>{project.name}</h1>
          <div className={s.badges}>
            <span
              className={s.badge}
              data-tone={
                project.status === "ACTIVE" || project.status === "COMPLETED"
                  ? "green"
                  : undefined
              }
            >
              {statusLabel(project.status, locale)}
            </span>
            <span
              className={s.badge}
              data-tone={
                project.priority === "CRITICAL"
                  ? "red"
                  : project.priority === "HIGH"
                    ? "amber"
                    : undefined
              }
            >
              {priorityLabel(project.priority, locale)}
            </span>
            <span
              className={s.badge}
              data-tone={
                project.health === "BLOCKED"
                  ? "red"
                  : project.health === "AT_RISK"
                    ? "amber"
                    : project.health === "ON_TRACK"
                      ? "green"
                      : undefined
              }
            >
              {healthLabel(project.health, locale)}
            </span>
            {isOverdue(project) && (
              <span className={s.badge} data-tone="red">
                {t("Hedef tarihi geçti", "Past target date")}
              </span>
            )}
          </div>
          <div className={s.meta}>
            <span>
              {t("Sorumlu", "Owner")}: {owner(project.ownerId)}
            </span>
            <span>
              {t("Son düzenleme", "Last edited")}:{" "}
              {formatDateTime(project.updatedAt, locale)} ·{" "}
              {project.updatedByName}
            </span>
          </div>
        </div>
        <div className={s.actions}>
          <button
            className={s.secondary}
            disabled={!editable}
            onClick={() =>
              setEditor({
                type: "archive",
                restore: project.status === "ARCHIVED",
              })
            }
          >
            {project.status === "ARCHIVED" ? (
              <RotateCcw size={15} />
            ) : (
              <Archive size={15} />
            )}
            {project.status === "ARCHIVED"
              ? t("Arşivden çıkar", "Restore")
              : t("Arşivle", "Archive")}
          </button>
          <button
            className={s.primary}
            disabled={!editable}
            onClick={() => setEditor({ type: "general" })}
          >
            <Pencil size={15} />
            {t("Düzenle", "Edit")}
          </button>
        </div>
      </header>
      <nav
        className={s.tabs}
        role="tablist"
        aria-orientation="horizontal"
        aria-label={t("Kayıt bölümleri", "Record sections")}
      >
        {tabs.map(({ id: tabId, label, Icon, count }, index) => (
          <button
            key={tabId}
            ref={(element) => {
              tabButtons.current[tabId] = element;
            }}
            type="button"
            role="tab"
            tabIndex={tab === tabId ? 0 : -1}
            aria-selected={tab === tabId}
            aria-controls={`project-${tabId}`}
            id={`tab-${tabId}`}
            className={tab === tabId ? s.activeTab : s.tab}
            onClick={() => setTab(tabId)}
            onKeyDown={(event) => {
              if (
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              const next = tabs[nextIndex].id;
              setTab(next);
              tabButtons.current[next]?.focus();
            }}
          >
            <Icon size={15} />
            {label}
            {count !== null && <span>{count}</span>}
          </button>
        ))}
      </nav>
      <section
        id={`project-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && (
          <div className={d.detailsGrid}>
            <div className={s.panel}>
              <div className={s.panelHeader}>
                <h2>
                  {t("Amaç ve mevcut durum", "Purpose and current state")}
                </h2>
              </div>
              <div className={s.stack}>
                <div>
                  <h3>{t("Özet", "Summary")}</h3>
                  <p className={d.summary}>
                    {project.summary ||
                      t("Henüz özet eklenmedi.", "No summary yet.")}
                  </p>
                </div>
                <div>
                  <h3>
                    {t("Amaç / beklenen sonuç", "Purpose / expected outcome")}
                  </h3>
                  <p className={d.summary}>
                    {project.objective ||
                      t(
                        "Beklenen sonuç henüz belirtilmedi.",
                        "The expected outcome has not been specified.",
                      )}
                  </p>
                </div>
                <div className={s.notice}>
                  <h3>{t("Sonraki adım", "Next step")}</h3>
                  <p className={d.summary}>
                    {project.nextStep ||
                      t(
                        "Sonraki adım henüz belirtilmedi.",
                        "The next step has not been specified.",
                      )}
                  </p>
                </div>
              </div>
            </div>
            <div className={s.panel}>
              <div className={s.panelHeader}>
                <h2>{t("Plan ve sorumluluk", "Plan and responsibility")}</h2>
              </div>
              <dl className={d.facts}>
                <div>
                  <dt>{t("Ana sorumlu", "Lead owner")}</dt>
                  <dd>{owner(project.ownerId)}</dd>
                </div>
                <div>
                  <dt>{t("Başlangıç", "Start")}</dt>
                  <dd>{formatDate(project.startDate, locale)}</dd>
                </div>
                <div>
                  <dt>{t("Hedef tarihi", "Target date")}</dt>
                  <dd className={isOverdue(project) ? d.warning : undefined}>
                    {formatDate(project.targetDate, locale)}
                  </dd>
                </div>
                <div>
                  <dt>
                    {project.kind === "PROCESS"
                      ? t("Çalışma sıklığı", "Cadence")
                      : t("Elle girilen ilerleme", "Manually entered progress")}
                  </dt>
                  <dd>
                    {project.kind === "PROCESS" ? (
                      project.cadence || t("Belirtilmedi", "Not specified")
                    ) : project.progress === null ? (
                      t("Belirtilmedi", "Not specified")
                    ) : (
                      <>
                        {project.progress}%
                        <progress
                          className={d.progress}
                          max={100}
                          value={project.progress}
                          aria-label={t("Proje ilerlemesi", "Project progress")}
                        />
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    {t("Tamamlanan iş parçaları", "Completed workstreams")}
                  </dt>
                  <dd>
                    {completedParts} / {project.workstreams.length}
                  </dd>
                </div>
                <div>
                  <dt>{t("Açık dış faktörler", "Open external factors")}</dt>
                  <dd>
                    {openFactors.length}
                    {blockers.length > 0 && (
                      <span className={d.warning}>
                        {" "}
                        · {blockers.length} {t("engelleyici", "blocking")}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              <p className={s.muted}>
                {t(
                  "İş parçası sayısı proje yüzdesine çevrilmez. Atamalar uygulama erişim yetkisi vermez.",
                  "Workstream counts do not set project progress. Assignments do not grant application access.",
                )}
              </p>
            </div>
          </div>
        )}

        {tab === "workstreams" && (
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <div>
                <h2>
                  {t("Kim hangi bölümden sorumlu?", "Who owns each part?")}
                </h2>
                <p className={s.muted}>
                  {completedParts} / {project.workstreams.length}{" "}
                  {t("iş parçası tamamlandı", "workstreams completed")}
                </p>
              </div>
              <button
                className={s.primary}
                disabled={!editable || project.workstreams.length >= 50}
                onClick={addWorkstream}
              >
                <Plus size={15} />
                {t("İş parçası ekle", "Add workstream")}
              </button>
            </div>
            {project.workstreams.length >= 50 && (
              <p className={s.notice}>
                {t(
                  "En fazla 50 iş parçası eklenebilir.",
                  "Up to 50 workstreams are allowed.",
                )}
              </p>
            )}
            {!project.workstreams.length ? (
              <div className={s.empty}>
                <Workflow size={30} />
                <p>
                  {t(
                    "Bu kayıt için iş dağılımı henüz tanımlanmadı. Bir bölüm ve sorumlusunu ekleyin.",
                    "Responsibilities have not been defined yet. Add a workstream and its owner.",
                  )}
                </p>
              </div>
            ) : (
              <div className={d.rows}>
                {project.workstreams.map((part) => (
                  <article className={d.row} key={part.id}>
                    <div className={d.rowHead}>
                      <div>
                        <h3>{part.title}</h3>
                        {part.description && (
                          <p className={d.summary}>{part.description}</p>
                        )}
                      </div>
                      <div className={d.rowActions}>
                        <button
                          className={s.secondary}
                          disabled={!editable}
                          onClick={() =>
                            setEditor({
                              type: "workstream",
                              initial: part,
                              isNew: false,
                            })
                          }
                          aria-label={t("Düzenle: ", "Edit: ") + part.title}
                        >
                          <Pencil size={14} />
                          {t("Düzenle", "Edit")}
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!editable}
                          onClick={() =>
                            setEditor({
                              type: "delete",
                              collection: "workstreams",
                              id: part.id,
                              name: part.title,
                            })
                          }
                          aria-label={t("Kaldır: ", "Remove: ") + part.title}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className={d.rowMeta}>
                      <span>
                        <UserRound size={14} />
                        {owner(part.ownerId)}
                      </span>
                      <span
                        className={s.badge}
                        data-tone={
                          part.status === "DONE"
                            ? "green"
                            : part.status === "WAITING"
                              ? "amber"
                              : undefined
                        }
                      >
                        {workstreamStatusLabel(part.status, locale)}
                      </span>
                      {part.targetDate && (
                        <span
                          className={
                            isOverdue({
                              status:
                                part.status === "DONE" ? "COMPLETED" : "ACTIVE",
                              targetDate: part.targetDate,
                            })
                              ? d.warning
                              : undefined
                          }
                        >
                          <CalendarDays size={14} />
                          {formatDate(part.targetDate, locale)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "factors" && (
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <div>
                <h2>
                  {t(
                    "Dış faktörler ve bağımlılıklar",
                    "External factors and dependencies",
                  )}
                </h2>
                <p className={s.muted}>
                  {openFactors.length} {t("açık", "open")} · {blockers.length}{" "}
                  {t("engelleyici", "blocking")}
                </p>
              </div>
              <button
                className={s.primary}
                disabled={!editable || project.factors.length >= 30}
                onClick={addFactor}
              >
                <Plus size={15} />
                {t("Dış faktör ekle", "Add external factor")}
              </button>
            </div>
            {project.factors.length >= 30 && (
              <p className={s.notice}>
                {t(
                  "En fazla 30 dış faktör eklenebilir.",
                  "Up to 30 external factors are allowed.",
                )}
              </p>
            )}
            {!project.factors.length ? (
              <div className={s.empty}>
                <ShieldAlert size={30} />
                <p>
                  {t(
                    "Dış bağımlılık veya engel henüz tanımlanmadı.",
                    "No external dependency or blocker has been recorded.",
                  )}
                </p>
              </div>
            ) : (
              <div className={d.rows}>
                {project.factors.map((factor) => (
                  <article className={d.row} key={factor.id}>
                    <div className={d.rowHead}>
                      <div>
                        <h3>{factor.title}</h3>
                        {factor.source && (
                          <p className={s.muted}>
                            {t("Kaynak", "Source")}: {factor.source}
                          </p>
                        )}
                      </div>
                      <div className={d.rowActions}>
                        <button
                          className={s.secondary}
                          disabled={!editable}
                          onClick={() =>
                            setEditor({
                              type: "factor",
                              initial: factor,
                              isNew: false,
                            })
                          }
                          aria-label={t("Düzenle: ", "Edit: ") + factor.title}
                        >
                          <Pencil size={14} />
                          {t("Düzenle", "Edit")}
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!editable}
                          onClick={() =>
                            setEditor({
                              type: "delete",
                              collection: "factors",
                              id: factor.id,
                              name: factor.title,
                            })
                          }
                          aria-label={t("Kaldır: ", "Remove: ") + factor.title}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className={d.rowMeta}>
                      <span
                        className={s.badge}
                        data-tone={
                          factor.status === "RESOLVED"
                            ? "green"
                            : factor.impact === "BLOCKING"
                              ? "red"
                              : factor.impact === "RISK"
                                ? "amber"
                                : undefined
                        }
                      >
                        {factorImpactLabel(factor.impact, locale)}
                      </span>
                      <span>
                        {factor.status === "RESOLVED" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <ShieldAlert size={14} />
                        )}
                        {factor.status === "RESOLVED"
                          ? t("Çözüldü", "Resolved")
                          : t("Açık", "Open")}
                      </span>
                      <span>
                        <UserRound size={14} />
                        {owner(factor.ownerId)}
                      </span>
                      {factor.targetDate && (
                        <span>
                          <CalendarDays size={14} />
                          {formatDate(factor.targetDate, locale)}
                        </span>
                      )}
                    </div>
                    {(factor.nextAction || factor.notes) && (
                      <div className={d.factorDetails}>
                        {factor.nextAction && (
                          <div>
                            <h4>{t("SONRAKİ ADIM", "NEXT ACTION")}</h4>
                            <p>{factor.nextAction}</p>
                          </div>
                        )}
                        {factor.notes && (
                          <div>
                            <h4>{t("NOTLAR", "NOTES")}</h4>
                            <p>{factor.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {safeUrl(factor.url) && (
                      <p>
                        <a
                          href={safeUrl(factor.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={d.externalLink}
                        >
                          <ExternalLink size={14} />
                          {t("İlgili bağlantıyı aç", "Open related link")}
                        </a>
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "links" && (
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <div>
                <h2>{t("Proje bağlantıları", "Project links")}</h2>
                <p className={s.muted}>
                  {t(
                    "Web sitesi, panel, kod deposu ve dokümanlar.",
                    "Websites, panels, repositories and documents.",
                  )}
                </p>
              </div>
              <button
                className={s.primary}
                disabled={!editable || project.links.length >= 20}
                onClick={addLink}
              >
                <Plus size={15} />
                {t("Bağlantı ekle", "Add link")}
              </button>
            </div>
            {project.links.length >= 20 && (
              <p className={s.notice}>
                {t(
                  "En fazla 20 bağlantı eklenebilir.",
                  "Up to 20 links are allowed.",
                )}
              </p>
            )}
            {!project.links.length ? (
              <div className={s.empty}>
                <Link2 size={30} />
                <p>
                  {t(
                    "Bu kayda henüz bağlantı eklenmedi.",
                    "No links have been added yet.",
                  )}
                </p>
              </div>
            ) : (
              <div className={d.rows}>
                {project.links.map((link) => (
                  <article className={d.row} key={link.id}>
                    <div className={d.rowHead}>
                      <div>
                        <span className={s.badge}>
                          {linkKindLabel(link.kind, locale)}
                        </span>
                        <h3>
                          {safeUrl(link.url) ? (
                            <a
                              href={safeUrl(link.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={d.externalLink}
                            >
                              {link.label}
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            link.label
                          )}
                        </h3>
                        <span className={d.linkUrl}>{link.url}</span>
                      </div>
                      <div className={d.rowActions}>
                        <button
                          className={s.secondary}
                          disabled={!editable}
                          onClick={() =>
                            setEditor({
                              type: "link",
                              initial: link,
                              isNew: false,
                            })
                          }
                          aria-label={t("Düzenle: ", "Edit: ") + link.label}
                        >
                          <Pencil size={14} />
                          {t("Düzenle", "Edit")}
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!editable}
                          onClick={() =>
                            setEditor({
                              type: "delete",
                              collection: "links",
                              id: link.id,
                              name: link.label,
                            })
                          }
                          aria-label={t("Kaldır: ", "Remove: ") + link.label}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <div>
                <h2>
                  {t(
                    "Güncellemeler ve değişiklik geçmişi",
                    "Updates and change history",
                  )}
                </h2>
                <p className={s.muted}>
                  {t(
                    "Son durum, kararlar ve sonraki adımları buraya kaydedin.",
                    "Record the current state, decisions and next steps here.",
                  )}
                </p>
              </div>
            </div>
            <form className={d.noteForm} onSubmit={postNote}>
              <label className={s.field}>
                {t("Yeni durum notu", "New status note")}
                <textarea
                  maxLength={5000}
                  rows={4}
                  disabled={!editable}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t(
                    "Ne değişti? Bekleyen konu veya sıradaki adım nedir?",
                    "What changed? What is pending or coming next?",
                  )}
                />
              </label>
              {noteError !== null && (
                <p className={s.error} role="alert">
                  {errorText(noteError, locale)}
                </p>
              )}
              <div className={d.noteFooter}>
                <small>
                  {t(
                    "Notu paylaşan kişi ve tarih otomatik kaydedilir.",
                    "The author and time are saved automatically.",
                  )}
                </small>
                <button
                  className={s.primary}
                  type="submit"
                  disabled={!editable || !note.trim()}
                >
                  {busy ? (
                    <LoaderCircle size={15} className={d.spin} />
                  ) : (
                    <MessageSquare size={15} />
                  )}
                  {busy
                    ? t("Kaydediliyor…", "Saving…")
                    : t("Notu paylaş", "Post note")}
                </button>
              </div>
            </form>
            {!activities.length ? (
              <div className={s.empty}>
                <History size={30} />
                <p>{t("Henüz geçmiş kaydı yok.", "No activity yet.")}</p>
              </div>
            ) : (
              <ol className={d.history}>
                {activities.map((activity) => (
                  <li key={activity.id}>
                    <div className={d.historyTop}>
                      <strong>
                        {activity.actorName} ·{" "}
                        {activity.kind === "NOTE"
                          ? t("Durum notu", "Status note")
                          : activity.kind === "CREATED"
                            ? t("Kayıt oluşturuldu", "Record created")
                            : t("Kayıt güncellendi", "Record updated")}
                      </strong>
                      <time dateTime={activity.createdAt}>
                        {formatDateTime(activity.createdAt, locale)}
                      </time>
                    </div>
                    {activity.changedFields.length > 0 && (
                      <div className={d.historyFields}>
                        {activity.changedFields
                          .map((field) => activityFieldLabel(field, locale))
                          .join(" · ")}
                      </div>
                    )}
                    {activity.body && <p>{activity.body}</p>}
                  </li>
                ))}
              </ol>
            )}
            {(!!nextCursor || historyError !== null) && (
              <div className={d.pagination}>
                {historyError !== null && (
                  <p className={s.error} role="alert">
                    {errorText(historyError, locale)}
                  </p>
                )}
                <button
                  className={s.secondary}
                  disabled={historyLoading || !nextCursor || busy}
                  onClick={() => void moreHistory()}
                >
                  {historyLoading && (
                    <LoaderCircle size={15} className={d.spin} />
                  )}
                  {historyLoading
                    ? t("Yükleniyor…", "Loading…")
                    : t("Daha eski kayıtları yükle", "Load older activity")}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {editor?.type === "general" && (
        <ProjectForm
          initial={editableInput(project)}
          members={members}
          locale={locale}
          title={t("Proje / süreç düzenle", "Edit project / process")}
          onClose={closeEditor}
          onSubmit={save}
        />
      )}
      {editor?.type === "workstream" && (
        <WorkstreamForm
          initial={editor.initial}
          isNew={editor.isNew}
          members={members}
          locale={locale}
          onClose={closeEditor}
          onSubmit={async (value) => {
            await savePatch({
              workstreams: editor.isNew
                ? [...project.workstreams, value]
                : project.workstreams.map((item) =>
                    item.id === value.id ? value : item,
                  ),
            });
          }}
        />
      )}
      {editor?.type === "factor" && (
        <FactorForm
          initial={editor.initial}
          isNew={editor.isNew}
          members={members}
          locale={locale}
          onClose={closeEditor}
          onSubmit={async (value) => {
            await savePatch({
              factors: editor.isNew
                ? [...project.factors, value]
                : project.factors.map((item) =>
                    item.id === value.id ? value : item,
                  ),
            });
          }}
        />
      )}
      {editor?.type === "link" && (
        <LinkForm
          initial={editor.initial}
          isNew={editor.isNew}
          locale={locale}
          onClose={closeEditor}
          onSubmit={async (value) => {
            await savePatch({
              links: editor.isNew
                ? [...project.links, value]
                : project.links.map((item) =>
                    item.id === value.id ? value : item,
                  ),
            });
          }}
        />
      )}
      {editor?.type === "delete" && (
        <ConfirmForm
          title={t("Öğeyi kaldır", "Remove item")}
          message={t(
            `“${editor.name}” bu kayıttan kaldırılacak. Değişiklik geçmişte tutulacak.`,
            `“${editor.name}” will be removed from this record. The change will remain in its history.`,
          )}
          action={t("Kaldır", "Remove")}
          locale={locale}
          onClose={closeEditor}
          onConfirm={async () => {
            await savePatch({
              [editor.collection]: project[editor.collection].filter(
                (item) => item.id !== editor.id,
              ),
            });
          }}
        />
      )}
      {editor?.type === "archive" && (
        <ConfirmForm
          title={
            editor.restore
              ? t("Arşivden çıkar", "Restore record")
              : t("Kaydı arşivle", "Archive record")
          }
          message={
            editor.restore
              ? t(
                  "Kayıt Planlandı durumuna alınacak. Ayrıntılar ve geçmiş korunacak.",
                  "The record will return to Planned. Its details and history will be preserved.",
                )
              : t(
                  "Kayıt Arşivlendi durumuna alınacak. Ayrıntılar ve geçmiş korunacak; daha sonra arşivden çıkarabilirsiniz.",
                  "The record will be archived. Its details and history will be preserved, and it can be restored later.",
                )
          }
          action={
            editor.restore
              ? t("Arşivden çıkar", "Restore")
              : t("Arşivle", "Archive")
          }
          locale={locale}
          onClose={closeEditor}
          onConfirm={async () => {
            await savePatch({
              status: editor.restore ? "PLANNED" : "ARCHIVED",
            });
          }}
        />
      )}
    </div>
  );
}
