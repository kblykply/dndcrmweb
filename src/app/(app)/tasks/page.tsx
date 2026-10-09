"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FolderKanban,
  Funnel,
  GanttChart,
  Inbox,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { errorText, workCopy } from "./_lib/copy";
import {
  dateTime,
  emptyReport,
  emptyWorkspace,
  overdue,
  priorities,
  shortId,
  statuses,
  type Report,
  type Status,
  type WorkItem,
  type Workspace,
} from "./_lib/types";
import TaskForm from "./_components/TaskForm";
import ProjectForm from "./_components/ProjectForm";
import Board from "./_components/Board";
import Schedule from "./_components/Schedule";
import Reports from "./_components/Reports";
import Modal from "./_components/Modal";
import WorkInfo from "./_components/WorkInfo";
import s from "./work.module.css";

export default function TasksPage() {
  const { locale } = useLanguage();
  const c = workCopy[locale];
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState<Report>(emptyReport);
  const [section, setSection] = useState("my");
  const [view, setView] = useState<
    "board" | "list" | "calendar" | "timeline" | "reports"
  >("board");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [department, setDepartment] = useState("");
  const [range, setRange] = useState("");
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [taskForm, setTaskForm] = useState(false);
  const [projectForm, setProjectForm] = useState<"new" | "edit" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkForm, setBulkForm] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkError, setBulkError] = useState("");
  const generation = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const project = workspace.projects.find((p) => p.id === section);
  const projectId = !["my", "all", "created", "watching"].includes(section)
    ? section
    : "";
  const canCreate =
    !!workspace.me &&
    workspace.me.role !== "PREVIEW" && workspace.me.role !== "CALLCENTER" &&
    (!project || project.canEdit);
  const filtered = !!(
    query ||
    status ||
    priority ||
    assignee ||
    range ||
    department ||
    archived
  );
  const params = new URLSearchParams({
    scope: ["my", "created", "watching"].includes(section) ? section : "all",
    ...(projectId ? { projectId } : {}),
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assignee ? { assignedToId: assignee } : {}),
    ...(range ? { range } : {}),
    ...(department ? { departmentId: department } : {}),
    archived: String(archived),
  }).toString();
  const loadWorkspace = useCallback(async () => {
    setWorkspace(await authedFetch("/tasks/workspace"));
  }, []);
  const load = useCallback(
    async (skip = 0) => {
      const request = ++generation.current;
      setLoading(true);
      setError("");
      try {
        const result = (await authedFetch(
          `/tasks?${params}&skip=${skip}&take=100`,
        )) as { items: WorkItem[]; total: number };
        if (request !== generation.current) return;
        setItems((old) =>
          skip
            ? [
                ...old,
                ...result.items.filter(
                  (row) => !old.some((item) => item.id === row.id),
                ),
              ]
            : result.items,
        );
        setTotal(result.total);
        if (!skip) {
          setSelected(new Set());
          const report = (await authedFetch(
            "/tasks/report?" + params,
          )) as Report;
          if (request === generation.current) setReport(report);
        }
      } catch (error) {
        if (request === generation.current) setError(errorText(error, c));
      } finally {
        if (request === generation.current) setLoading(false);
      }
    },
    [params, c],
  );
  useEffect(() => {
    void loadWorkspace().catch((error) => setError(errorText(error, c)));
  }, [loadWorkspace, c]);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const title =
    project?.name ||
    (
      {
        my: c.my,
        all: c.all,
        created: c.created,
        watching: c.watching,
        personal: c.personal,
      } as Record<string, string>
    )[section] ||
    c.title;
  function select(id: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else if (next.size < 50) next.add(id);
      return next;
    });
  }
  async function move(item: WorkItem, status: Status) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authedFetch("/tasks/" + item.id, {
        method: "PATCH",
        body: JSON.stringify({ status, version: item.version }),
      });
      setNotice(c.moved);
      await load();
    } catch (error) {
      setError(errorText(error, c));
    } finally {
      setBusy(false);
    }
  }
  async function archiveProject() {
    if (
      !project ||
      !window.confirm(project.archivedAt ? c.restoreConfirm : c.archiveConfirm)
    )
      return;
    setBusy(true);
    setError("");
    try {
      await authedFetch(`/tasks/projects/${project.id}/archive`, {
        method: "POST",
        body: JSON.stringify({
          version: project.version,
          archived: !project.archivedAt,
        }),
      });
      await loadWorkspace();
      await load();
    } catch (e) {
      setError(errorText(e, c));
    } finally {
      setBusy(false);
    }
  }
  async function bulkSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setBulkError("");
    try {
      await authedFetch("/tasks/bulk", {
        method: "POST",
        body: JSON.stringify({
          items: items
            .filter((i) => selected.has(i.id))
            .map(({ id, version }) => ({ id, version })),
          ...(bulkStatus ? { status: bulkStatus } : {}),
          ...(bulkPriority ? { priority: bulkPriority } : {}),
          ...(bulkAssignee
            ? {
                assignedToId:
                  bulkAssignee === "unassigned" ? null : bulkAssignee,
              }
            : {}),
        }),
      });
      setBulkForm(false);
      setNotice(c.saved);
      await load();
    } catch (e) {
      setBulkError(errorText(e, c));
    } finally {
      setBusy(false);
    }
  }
  async function exportCsv() {
    setBusy(true);
    setError("");
    try {
      const rows: WorkItem[] = [];
      let count = 1;
      while (rows.length < count) {
        const page = await authedFetch(
          `/tasks?${params}&skip=${rows.length}&take=200`,
        );
        count = page.total;
        if (!page.items.length) break;
        rows.push(...page.items);
      }
      const cell = (value: unknown) => {
        let text = String(value ?? "");
        if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replaceAll('"', '""') + '"';
      };
      const csv = [
        [
          c.key,
          c.titleField,
          c.project,
          c.assignee,
          c.status,
          c.priority,
          c.start,
          c.due,
          c.estimated,
          c.logged,
        ],
        ...rows.map((i) => [
          shortId(i),
          i.title,
          i.project?.name || c.personal,
          i.assignedTo?.name || c.unassigned,
          c.statuses[i.status],
          c.priorities[i.priority],
          i.startAt,
          i.dueAt,
          i.estimateMinutes,
          i.spentMinutes,
        ]),
      ]
        .map((r) => r.map(cell).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download =
        "DND-work-" + new Date().toISOString().slice(0, 10) + ".csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorText(e, c));
    } finally {
      setBusy(false);
    }
  }
  const chosen = items.filter((i) => selected.has(i.id));
  const oneProject = new Set(chosen.map((i) => i.projectId)).size <= 1;
  const bulkProject = chosen[0]?.project;
  const bulkPeople = workspace.users.filter(
    (u) =>
      !bulkProject ||
      u.id === bulkProject.ownerId ||
      bulkProject.members.some((m) => m.userId === u.id && m.role !== "VIEWER"),
  );
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dndblack.png" alt="DND" width={70} height={40} />
          <div>
            <span className={s.eyebrow}>{c.company}</span>
            <div className={s.helpHeading}>
              <h1>{c.title}</h1>
              <WorkInfo topic="overview" />
            </div>
          </div>
        </div>
        <div className={s.actions}>
          <button
            className={s.iconButton}
            title={c.refresh}
            aria-label={c.refresh}
            disabled={loading || busy}
            onClick={() => {
              void load();
              void loadWorkspace().catch((e) => setError(errorText(e, c)));
            }}
          >
            <RefreshCw size={17} />
          </button>
          <button
            className={s.iconButton}
            title={c.export}
            aria-label={c.export}
            disabled={busy || loading}
            onClick={() => void exportCsv()}
          >
            <Download size={17} />
          </button>
          <WorkInfo topic="export" />
          <button
            className={s.primary}
            disabled={!canCreate || busy}
            onClick={() => setTaskForm(true)}
          >
            <Plus size={17} />
            {c.newTask}
          </button>
        </div>
      </header>
      <div className={s.scopeBar}>
        <div className={s.scopeLinks} role="group" aria-label={c.title}>
          {[
            { id: "my", label: c.my, Icon: UserRound },
            { id: "all", label: c.all, Icon: Users },
            { id: "created", label: c.created, Icon: Inbox },
            { id: "watching", label: c.watching, Icon: Eye },
            { id: "personal", label: c.personal, Icon: List },
          ].filter(({ id }) => workspace.me?.role !== "CALLCENTER" || id === "my").map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-pressed={section === id}
              onClick={() => {
                setSection(id);
                setNotice("");
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
          <WorkInfo topic="scopes" />
        </div>
        <div className={s.projectTools}>
          <WorkInfo topic="projects" />
          <div className={s.projectSelect}>
            <FolderKanban size={17} aria-hidden="true" />
            <select
              aria-label={c.project}
              value={project?.id || ""}
              disabled={!workspace.projects.length}
              onChange={(event) => {
                const next = workspace.projects.find(
                  (p) => p.id === event.target.value,
                );
                setSection(next?.id || "all");
                setNotice("");
                setArchived(!!next?.archivedAt);
              }}
            >
              <option value="">
                {workspace.projects.length ? c.projects : c.emptyProject}
              </option>
              {workspace.projects
                .filter((p) => !p.archivedAt || archived || p.id === section)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key} · {p.name}
                    {p.archivedAt ? " · " + c.archived : ""}
                  </option>
                ))}
            </select>
          </div>
          <button
            className={s.iconButton}
            disabled={!workspace.me || ["PREVIEW", "CALLCENTER"].includes(workspace.me.role) || busy}
            title={c.newProject}
            aria-label={c.newProject}
            onClick={() => setProjectForm("new")}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className={s.workspace}>
        <div className={s.main}>
          <div className={s.workspaceHeader}>
            <div>
              {project && (
                <span className={s.eyebrow}>
                  {project.key}
                  {project.department ? " · " + project.department.name : ""}
                </span>
              )}
              <h2>{title}</h2>
              {project?.description && (
                <p className={s.muted}>{project.description}</p>
              )}
            </div>
            {project && (
              <div className={s.actions}>
                {!project.canEdit && (
                  <span className={s.tag}>
                    {project.archivedAt ? c.archivedProject : c.readOnly}
                  </span>
                )}
                {project.canManage && (
                  <>
                    <button
                      className={s.iconButton}
                      disabled={busy || !!project.archivedAt}
                      title={c.settings}
                      aria-label={c.settings}
                      onClick={() => setProjectForm("edit")}
                    >
                      <Settings2 size={17} />
                    </button>
                    <button
                      className={s.iconButton}
                      disabled={busy}
                      title={project.archivedAt ? c.restore : c.archive}
                      aria-label={project.archivedAt ? c.restore : c.archive}
                      onClick={() => void archiveProject()}
                    >
                      <Archive size={17} />
                    </button>
                    <WorkInfo topic="archive" />
                  </>
                )}
              </div>
            )}
          </div>
          <div className={s.metrics}>
            {[
              {
                label: c.open,
                value:
                  report.total -
                  report.status
                    .filter((r) => ["DONE", "CANCELLED"].includes(r.status))
                    .reduce((n, r) => n + r._count, 0),
                Icon: FolderKanban,
                tone: "teal",
                topic: "open" as const,
              },
              {
                label: c.overdue,
                value: report.overdue,
                Icon: Clock3,
                tone: "red",
                topic: "overdue" as const,
              },
              {
                label: c.inReview,
                value:
                  report.status.find((r) => r.status === "IN_REVIEW")?._count ||
                  0,
                Icon: Eye,
                tone: "amber",
                topic: "review" as const,
              },
              {
                label: c.completed,
                value:
                  report.status.find((r) => r.status === "DONE")?._count || 0,
                Icon: CheckCircle2,
                tone: "green",
                topic: "completed" as const,
              },
            ].map(({ label, value, Icon, tone, topic }) => (
              <div key={label} className={s.metric} data-tone={tone}>
                <Icon size={20} />
                <div>
                  <strong>{loading ? "…" : value}</strong>
                  <span>{label}</span>
                </div>
                <WorkInfo topic={topic} corner />
              </div>
            ))}
          </div>
          <div className={s.viewBar}>
            <div className={s.tabs} role="tablist" aria-label={c.title}>
              {(
                [
                  { id: "board", label: c.board, Icon: LayoutGrid },
                  { id: "list", label: c.list, Icon: List },
                  { id: "calendar", label: c.calendar, Icon: CalendarDays },
                  { id: "timeline", label: c.timeline, Icon: GanttChart },
                  { id: "reports", label: c.reports, Icon: BarChart3 },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            <WorkInfo topic={view} />
          </div>
          <div className={s.toolbar}>
            <div className={s.search}>
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.search}
                aria-label={c.search}
              />
            </div>
            <WorkInfo topic="filters" />
            <button
              className={`${s.iconButton} ${s.mobileFilters}`}
              title={c.filters}
              aria-label={c.filters}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Funnel size={17} />
            </button>
            <div className={s.filters} data-open={filtersOpen}>
              <select
                aria-label={c.status}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">{c.allStatuses}</option>
                {statuses.map((v) => (
                  <option key={v} value={v}>
                    {c.statuses[v]}
                  </option>
                ))}
              </select>
              <select
                aria-label={c.assignee}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">{c.allPeople}</option>
                <option value="unassigned">{c.unassigned}</option>
                {workspace.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={c.priority}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">{c.allPriorities}</option>
                {priorities.map((v) => (
                  <option value={v} key={v}>
                    {c.priorities[v]}
                  </option>
                ))}
              </select>
              <select
                aria-label={c.range}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="">{c.allDates}</option>
                <option value="today">{c.today}</option>
                <option value="week">{c.week}</option>
                <option value="overdue">{c.overdue}</option>
              </select>
              <select
                aria-label={c.department}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">{c.allDepartments}</option>
                {workspace.departments.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <label className={s.checkLabel}>
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                {c.archived}
              </label>
              {filtered && (
                <button
                  className={s.iconButton}
                  aria-label={c.clear}
                  title={c.clear}
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                    setPriority("");
                    setAssignee("");
                    setDepartment("");
                    setRange("");
                    setArchived(false);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className={s.error} role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className={s.notice} role="status">
              {notice}
            </div>
          )}
          <div className={s.resultLine}>
            <span aria-live="polite">
              {loading ? c.loading : `${items.length} / ${total} ${c.results}`}
            </span>
            {selected.size > 0 && (
              <div className={s.actions}>
                <span>
                  {selected.size} {c.selected}
                </span>
                <button
                  className={s.button}
                  disabled={!oneProject || busy}
                  title={!oneProject ? c.sameProject : c.bulk}
                  onClick={() => {
                    setBulkStatus("");
                    setBulkPriority("");
                    setBulkAssignee("");
                    setBulkError("");
                    setBulkForm(true);
                  }}
                >
                  <Settings2 size={15} />
                  {c.bulk}
                </button>
                <WorkInfo topic="bulk" />
                <button
                  className={s.tinyButton}
                  title={c.clear}
                  onClick={() => setSelected(new Set())}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          {view === "board" && (
            <Board
              items={items}
              copy={c}
              locale={locale}
              disabled={busy || loading}
              onMove={(item, status) => void move(item, status)}
            />
          )}
          {view === "list" && (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label={c.selectAll}
                        checked={
                          !!items.filter((i) => i.canEdit).length &&
                          items
                            .filter((i) => i.canEdit)
                            .slice(0, 50)
                            .every((i) => selected.has(i.id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? new Set(
                                  items
                                    .filter((i) => i.canEdit)
                                    .slice(0, 50)
                                    .map((i) => i.id),
                                )
                              : new Set(),
                          )
                        }
                      />
                    </th>
                    <th>{c.task}</th>
                    <th>{c.status}</th>
                    <th>{c.assignee}</th>
                    <th>{c.priority}</th>
                    <th>{c.due}</th>
                    <th>{c.progress}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${c.selectItem}: ${item.title}`}
                          checked={selected.has(item.id)}
                          disabled={
                            !item.canEdit ||
                            busy ||
                            (selected.size >= 50 && !selected.has(item.id))
                          }
                          onChange={() => select(item.id)}
                        />
                      </td>
                      <td>
                        <Link
                          className={s.tableTitle}
                          href={"/tasks/" + item.id}
                        >
                          {item.title}
                        </Link>
                        <small>
                          {shortId(item)} · {c.kinds[item.kind]}
                        </small>
                      </td>
                      <td>
                        <select
                          aria-label={`${c.status}: ${item.title}`}
                          disabled={!item.canEdit || busy || loading}
                          value={item.status}
                          onChange={(e) =>
                            void move(item, e.target.value as Status)
                          }
                        >
                          {statuses.map((v) => (
                            <option value={v} key={v}>
                              {c.statuses[v]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{item.assignedTo?.name || c.unassigned}</td>
                      <td>
                        <span
                          className={s.priority}
                          data-priority={item.priority}
                        >
                          {c.priorities[item.priority]}
                        </span>
                      </td>
                      <td>
                        <time data-overdue={overdue(item)}>
                          {dateTime(item.dueAt, locale)}
                        </time>
                      </td>
                      <td>
                        {item.checklist.length
                          ? `${item.checklist.filter((i) => i.done).length}/${item.checklist.length}`
                          : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && !loading && (
                <div className={s.empty}>{c.empty}</div>
              )}
            </div>
          )}
          {(view === "calendar" || view === "timeline") && (
            <Schedule
              items={items}
              locale={locale}
              copy={c}
              timeline={view === "timeline"}
            />
          )}
          {view === "reports" && (
            <Reports
              report={report}
              workspace={workspace}
              copy={c}
              locale={locale}
            />
          )}
          {items.length < total && view !== "reports" && (
            <div className={s.loadMore}>
              <button
                className={s.button}
                disabled={loading}
                onClick={() => void load(items.length)}
              >
                {c.loadMore}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {taskForm && (
        <TaskForm
          copy={c}
          workspace={workspace}
          projectId={project?.id}
          onClose={() => setTaskForm(false)}
          onSaved={(id) => router.push("/tasks/" + id)}
        />
      )}
      {projectForm && (
        <ProjectForm
          copy={c}
          workspace={workspace}
          project={projectForm === "edit" ? project : undefined}
          onClose={() => setProjectForm(null)}
          onSaved={(id) => {
            setProjectForm(null);
            setSection(id);
            setArchived(false);
            void loadWorkspace().catch((e) => setError(errorText(e, c)));
          }}
        />
      )}
      {bulkForm && (
        <Modal
          title={`${c.bulk} · ${selected.size}`}
          help={<WorkInfo topic="bulk" />}
          closeLabel={c.close}
          onClose={() => {
            if (!busy) setBulkForm(false);
          }}
        >
          <form className={s.form} onSubmit={bulkSubmit}>
            <fieldset disabled={busy}>
              {bulkError && (
                <div className={s.error} role="alert">
                  {bulkError}
                </div>
              )}
              <label className={s.field}>
                {c.status}
                <select
                  aria-label={c.status}
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <option value="">{c.unchanged}</option>
                  {statuses.map((v) => (
                    <option value={v} key={v}>
                      {c.statuses[v]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                {c.priority}
                <select
                  aria-label={c.priority}
                  value={bulkPriority}
                  onChange={(e) => setBulkPriority(e.target.value)}
                >
                  <option value="">{c.unchanged}</option>
                  {priorities.map((v) => (
                    <option value={v} key={v}>
                      {c.priorities[v]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                {c.assignee}
                <select
                  aria-label={c.assignee}
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                >
                  <option value="">{c.unchanged}</option>
                  <option value="unassigned">{c.unassigned}</option>
                  {bulkPeople.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <footer className={s.formFooter}>
                <button
                  type="submit"
                  className={s.primary}
                  disabled={!bulkStatus && !bulkPriority && !bulkAssignee}
                >
                  {busy ? c.saving : c.apply}
                </button>
              </footer>
            </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
}
