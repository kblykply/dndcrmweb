"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  GitBranch,
  Link2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { errorText, workCopy, type Copy } from "../_lib/copy";
import {
  dateTime,
  duration,
  emptyWorkspace,
  priorities,
  shortId,
  statuses,
  type Activity,
  type Brief,
  type Detail,
  type Workspace,
} from "../_lib/types";
import TaskForm from "../_components/TaskForm";
import Modal from "../_components/Modal";
import WorkInfo, { WorkField } from "../_components/WorkInfo";
import s from "../work.module.css";

type EntryForm = {
  kind: "comments" | "time" | "checklist";
  id: string;
  body: string;
  title: string;
  done: boolean;
  minutes: number;
  workedOn: string;
  note: string;
};
function Changes({
  entry,
  copy: c,
  workspace,
}: {
  entry: Activity;
  copy: Copy;
  workspace: Workspace;
}) {
  const names: Record<string, string> = {
    title: c.titleField,
    description: c.description,
    status: c.status,
    priority: c.priority,
    kind: c.kind,
    assignedToId: c.assignee,
    labels: c.labels,
    startAt: c.start,
    dueAt: c.due,
    estimateMinutes: c.estimated,
    completedAt: c.completed,
    minutes: c.minutes,
    workedOn: c.workedOn,
    note: c.note,
    body: c.comments,
    done: c.checklist,
    name: c.name,
    before: c.before,
    after: c.after,
  };
  function display(value: unknown): string {
    if (value === null || value === undefined || value === "") return "–";
    if (typeof value === "boolean") return value ? c.completed : c.open;
    if (typeof value === "string")
      return (
        workspace.users.find((u) => u.id === value)?.name ||
        (c.statuses as Record<string, string>)[value] ||
        (c.priorities as Record<string, string>)[value] ||
        (c.kinds as Record<string, string>)[value] ||
        value
      );
    if (Array.isArray(value)) return value.map(display).join(", ");
    if (typeof value === "object")
      return Object.entries(value)
        .filter(
          ([key]) =>
            !["id", "taskId", "userId", "authorId", "content"].includes(key),
        )
        .map(([key, v]) => `${names[key] || key}: ${display(v)}`)
        .join("\n");
    return String(value);
  }
  const fields = Object.entries(entry.changes).filter(
    ([key]) =>
      entry.action !== "CREATED" ||
      [
        "title",
        "description",
        "priority",
        "status",
        "kind",
        "dueAt",
        "assignedToId",
      ].includes(key),
  );
  return (
    <details>
      <summary>{c.changes}</summary>
      <dl className={s.changeList}>
        {fields.map(([key, value]) => (
          <div key={key}>
            <dt>{names[key] || key}</dt>
            <dd>{display(value)}</dd>
          </div>
        ))}
        {!fields.length && <dd>{c.noChanges}</dd>}
      </dl>
    </details>
  );
}
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLanguage();
  const c = workCopy[locale];
  const [data, setData] = useState<Detail | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<"edit" | "child" | null>(null);
  const [entryForm, setEntryForm] = useState<EntryForm | null>(null);
  const [entryError, setEntryError] = useState("");
  const [comment, setComment] = useState("");
  const [check, setCheck] = useState("");
  const [tab, setTab] = useState<"comments" | "time" | "activity">("comments");
  const [dependencyOpen, setDependencyOpen] = useState(false);
  const [dependencyId, setDependencyId] = useState("");
  const [candidates, setCandidates] = useState<Brief[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [history, setHistory] = useState<Activity[]>([]);
  const [moreHistory, setMoreHistory] = useState(true);
  const generation = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = (await authedFetch("/tasks/" + id)) as Detail | null;
      if (request !== generation.current) return;
      setData(result);
      setHistory(result?.activity || []);
      setMoreHistory((result?.activity.length || 0) === 50);
    } catch (e) {
      if (request === generation.current) setError(errorText(e, c));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [id, c]);
  useEffect(() => {
    setData(null);
    setError("");
    void load();
    void authedFetch("/tasks/workspace")
      .then(setWorkspace)
      .catch((e) => setError(errorText(e, c)));
    return invalidate;
  }, [load, c, invalidate]);
  useEffect(() => {
    if (!dependencyOpen || !data) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void authedFetch(
        `/tasks?projectId=${data.projectId || "personal"}&search=${encodeURIComponent(candidateSearch)}&take=100`,
        { signal: controller.signal },
      )
        .then((r) => setCandidates(r.items.filter((i: Brief) => i.id !== id)))
        .catch((e) => {
          if (!controller.signal.aborted) setEntryError(errorText(e, c));
        });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [dependencyOpen, data, candidateSearch, id, c]);
  async function mutate(
    path: string,
    body: Record<string, unknown>,
    method = "POST",
  ) {
    if (!data) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authedFetch(`/tasks/${id}${path}`, {
        method,
        body: JSON.stringify({ ...body, version: data.version }),
      });
      setNotice(c.saved);
      await load();
      return true;
    } catch (e) {
      setError(errorText(e, c));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function remove(kind: string, entryId: string) {
    if (window.confirm(c.removeConfirm))
      await mutate(`/${kind}/${entryId}`, {}, "DELETE");
  }
  async function saveEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !entryForm) return;
    setBusy(true);
    setEntryError("");
    try {
      const body =
        entryForm.kind === "comments"
          ? { body: entryForm.body }
          : entryForm.kind === "checklist"
            ? { title: entryForm.title, done: entryForm.done }
            : {
                minutes: entryForm.minutes,
                workedOn: entryForm.workedOn,
                note: entryForm.note,
              };
      await authedFetch(
        `/tasks/${id}/${entryForm.kind}${entryForm.id ? "/" + entryForm.id : ""}`,
        {
          method: entryForm.id ? "PATCH" : "POST",
          body: JSON.stringify({ ...body, version: data.version }),
        },
      );
      setEntryForm(null);
      await load();
    } catch (e) {
      setEntryError(errorText(e, c));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file || !data) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("version", String(data.version));
      body.append("file", file);
      await authedFetch(`/tasks/${id}/files`, { method: "POST", body });
      await load();
    } catch (e) {
      setError(errorText(e, c));
    } finally {
      setBusy(false);
    }
  }
  async function download(fileId: string, name: string) {
    setBusy(true);
    setError("");
    try {
      const blob = (await authedFetch(
        `/tasks/${id}/files/${fileId}`,
        {},
        "blob",
      )) as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorText(e, c));
    } finally {
      setBusy(false);
    }
  }
  const blankEntry: EntryForm = {
    kind: "time",
    id: "",
    body: "",
    title: "",
    done: false,
    minutes: 30,
    workedOn: new Intl.DateTimeFormat("en-CA").format(new Date()),
    note: "",
  };
  const canEdit = !!data?.canEdit && !busy && !loading;
  const canOwnEntry = (authorId: string | null) =>
    data?.me.id === authorId ||
    ["ADMIN", "MANAGER"].includes(data?.me.role || "");
  const people = data?.project
    ? workspace.users.filter(
        (u) =>
          u.id === data.project!.ownerId ||
          data.project!.members.some(
            (m) => m.userId === u.id && m.role !== "VIEWER",
          ),
      )
    : workspace.users;
  if (!data)
    return (
      <div className={s.page}>
        <Link href="/tasks" className={s.breadcrumb}>
          <ArrowLeft size={16} />
          {c.back}
        </Link>
        {error && (
          <div className={s.error} role="alert">
            {error}
          </div>
        )}
        <div className={s.empty}>{loading ? c.loading : c.noPermission}</div>
        <button className={s.button} onClick={() => void load()}>
          <RefreshCw size={16} />
          {c.refresh}
        </button>
      </div>
    );
  return (
    <div className={s.page}>
      <nav className={s.breadcrumb}>
        <Link href="/tasks">{c.back}</Link>
        <ChevronRight size={13} />
        <span>{data.project?.name || c.personal}</span>
        {data.parent && (
          <>
            <ChevronRight size={13} />
            <Link href={"/tasks/" + data.parent.id}>{data.parent.title}</Link>
          </>
        )}
      </nav>
      <header className={s.detailHeader}>
        <div>
          <div className={s.actions}>
            <span className={s.code}>{shortId(data)}</span>
            <span className={s.kind}>{c.kinds[data.kind]}</span>
            {data.archivedAt && <span className={s.tag}>{c.archived}</span>}
          </div>
          <h1>{data.title}</h1>
        </div>
        <div className={s.actions}>
          <button
            className={s.iconButton}
            title={c.refresh}
            aria-label={c.refresh}
            disabled={loading || busy}
            onClick={() => {
              setError("");
              void load();
            }}
          >
            <RefreshCw size={17} />
          </button>
          <button
            className={s.iconButton}
            title={data.watching ? c.unwatch : c.watch}
            aria-label={data.watching ? c.unwatch : c.watch}
            disabled={busy || loading}
            onClick={() => void mutate("/watch", { watching: !data.watching })}
          >
            {data.watching ? <BellOff size={17} /> : <Bell size={17} />}
          </button>
          <WorkInfo topic="following" />
          {data.canEdit && (
            <button
              className={s.primary}
              disabled={!canEdit}
              onClick={() => setForm("edit")}
            >
              <Edit3 size={16} />
              {c.edit}
            </button>
          )}
        </div>
      </header>
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
      <div className={s.detailLayout}>
        <div className={s.detailMain}>
          <section className={s.detailSection}>
            <div className={s.sectionHeader}>
              <h2>{c.description}</h2>
              <WorkInfo topic="task" />
            </div>
            <div className={s.description}>{data.description || "–"}</div>
          </section>
          <section className={s.detailSection}>
            <div className={s.sectionHeader}>
              <div className={s.helpHeading}>
                <h2>{c.checklist}</h2>
                <WorkInfo topic="checklist" />
              </div>
              <span className={s.muted}>
                {data.checklist.filter((i) => i.done).length} /{" "}
                {data.checklist.length}
              </span>
            </div>
            {!!data.checklist.length && (
              <progress
                className={s.progress}
                max={data.checklist.length}
                value={data.checklist.filter((i) => i.done).length}
                aria-label={c.progress}
              />
            )}
            {data.checklist.map((item) => (
              <div key={item.id} className={s.checkRow} data-done={item.done}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const previous = data;
                      const done = e.target.checked;
                      setData({
                        ...data,
                        checklist: data.checklist.map((row) =>
                          row.id === item.id ? { ...row, done } : row,
                        ),
                      });
                      void mutate(
                        "/checklist/" + item.id,
                        { title: item.title, done },
                        "PATCH",
                      ).then((ok) => {
                        if (!ok) setData(previous);
                      });
                    }}
                  />
                  <span>{item.title}</span>
                </label>
                {data.canEdit && (
                  <div className={s.actions}>
                    <button
                      className={s.tinyButton}
                      disabled={!canEdit}
                      aria-label={c.edit}
                      title={c.edit}
                      onClick={() => {
                        setEntryError("");
                        setEntryForm({
                          ...blankEntry,
                          ...item,
                          kind: "checklist",
                        });
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className={s.tinyButton}
                      disabled={!canEdit}
                      title={c.remove}
                      aria-label={c.remove}
                      onClick={() => void remove("checklist", item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {data.canEdit && (
              <form
                className={s.inlineForm}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await mutate("/checklist", { title: check, done: false }))
                    setCheck("");
                }}
              >
                <input
                  value={check}
                  onChange={(e) => setCheck(e.target.value)}
                  placeholder={c.addCheck}
                  aria-label={c.addCheck}
                  required
                  maxLength={500}
                  disabled={!canEdit}
                />
                <button
                  className={s.iconButton}
                  type="submit"
                  disabled={!canEdit || !check.trim()}
                  title={c.add}
                  aria-label={c.add}
                >
                  <Plus size={17} />
                </button>
              </form>
            )}
            {!data.checklist.length && !data.canEdit && (
              <p className={s.muted}>{c.noEntries}</p>
            )}
          </section>
          <section className={s.detailSection}>
            <div className={s.sectionHeader}>
              <div className={s.helpHeading}>
                <h2>{c.subtasks}</h2>
                <WorkInfo topic="subtasks" />
              </div>
              {data.canEdit &&
                !data.parentId &&
                !["DONE", "CANCELLED"].includes(data.status) && (
                  <button
                    className={s.button}
                    disabled={!canEdit}
                    onClick={() => setForm("child")}
                  >
                    <Plus size={15} />
                    {c.newTask}
                  </button>
                )}
            </div>
            {data.subtasks.map((item) => (
              <div className={s.subtaskRow} key={item.id}>
                <GitBranch size={16} />
                <Link href={"/tasks/" + item.id}>{item.title}</Link>
                <span className={s.statusTag}>{c.statuses[item.status]}</span>
              </div>
            ))}
            {!data.subtasks.length && <p className={s.muted}>{c.noEntries}</p>}
          </section>
          <section className={s.detailSection}>
            <div className={s.sectionHeader}>
              <div className={s.helpHeading}>
                <h2>{c.dependencies}</h2>
                <WorkInfo topic="dependencies" />
              </div>
              {data.canEdit && (
                <button
                  className={s.button}
                  disabled={!canEdit}
                  onClick={() => {
                    setDependencyOpen(true);
                    setError("");
                    setDependencyId("");
                    setEntryError("");
                    setCandidateSearch("");
                  }}
                >
                  <Link2 size={15} />
                  {c.addDependency}
                </button>
              )}
            </div>
            {!!data.blockers.length && <h3>{c.blockedBy}</h3>}
            {data.blockers.map(({ blocker }) => (
              <div className={s.subtaskRow} key={blocker.id}>
                <Link2 size={15} />
                <Link href={"/tasks/" + blocker.id}>{blocker.title}</Link>
                <span className={s.statusTag}>
                  {c.statuses[blocker.status]}
                </span>
                {data.canEdit && (
                  <button
                    className={s.tinyButton}
                    disabled={!canEdit}
                    title={c.remove}
                    aria-label={c.remove}
                    onClick={() => void remove("dependencies", blocker.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!!data.blocking.length && (
              <h3 style={{ marginTop: 16 }}>{c.blocking}</h3>
            )}
            {data.blocking.map(({ task }) => (
              <div className={s.subtaskRow} key={task.id}>
                <Link href={"/tasks/" + task.id}>{task.title}</Link>
                <span className={s.statusTag}>{c.statuses[task.status]}</span>
              </div>
            ))}
            {!data.blockers.length && !data.blocking.length && (
              <p className={s.muted}>{c.noEntries}</p>
            )}
          </section>
          <section className={s.detailSection}>
            <div className={s.sectionHeader}>
              <div className={s.helpHeading}>
                <h2>{c.files}</h2>
                <WorkInfo topic="files" />
              </div>
              {data.canEdit && (
                <label className={s.uploadLabel}>
                  <Upload size={15} />
                  {c.upload}
                  <input
                    type="file"
                    aria-label={c.upload}
                    disabled={!canEdit}
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv"
                    onChange={(e) => {
                      void upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className={s.muted}>{c.fileLimit}</p>
            {data.attachments.map((file) => (
              <div className={s.fileRow} key={file.id}>
                <FileText size={22} />
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {Math.ceil(file.size / 1024)} KB · {file.userName} ·{" "}
                    {dateTime(file.createdAt, locale)}
                  </small>
                </div>
                <div className={s.actions}>
                  <button
                    className={s.iconButton}
                    title={c.download}
                    aria-label={c.download}
                    disabled={busy}
                    onClick={() => void download(file.id, file.name)}
                  >
                    <Download size={16} />
                  </button>
                  {data.canEdit && canOwnEntry(file.userId) && (
                    <button
                      className={s.iconButton}
                      disabled={!canEdit}
                      title={c.remove}
                      aria-label={c.remove}
                      onClick={() => void remove("files", file.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!data.attachments.length && (
              <p className={s.muted}>{c.noEntries}</p>
            )}
          </section>
          <div className={s.viewBar}>
            <div className={s.tabs} role="tablist" aria-label={c.records}>
              {(["comments", "time", "activity"] as const).map((value) => (
                <button
                  role="tab"
                  aria-selected={tab === value}
                  key={value}
                  onClick={() => setTab(value)}
                >
                  {c[value as "comments" | "time" | "activity"]}
                </button>
              ))}
            </div>
            <WorkInfo topic={tab} />
          </div>
          {tab === "comments" && (
            <section>
              {data.canEdit && (
                <form
                  className={s.commentForm}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await mutate("/comments", { body: comment }))
                      setComment("");
                  }}
                >
                  <textarea
                    aria-label={c.addComment}
                    placeholder={c.commentPlaceholder}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    maxLength={10000}
                    rows={3}
                    disabled={!canEdit}
                  />
                  <button
                    type="submit"
                    className={s.primary}
                    disabled={!canEdit || !comment.trim()}
                  >
                    <Send size={15} />
                    {c.addComment}
                  </button>
                </form>
              )}
              {data.comments.map((entry) => (
                <article className={s.comment} key={entry.id}>
                  <header className={s.commentHeader}>
                    <span className={s.avatar}>
                      {entry.authorName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{entry.authorName}</strong>
                      <time>
                        {dateTime(entry.createdAt, locale, true)}
                        {entry.updatedAt !== entry.createdAt
                          ? " · " + c.updated
                          : ""}
                      </time>
                    </div>
                    {data.canEdit && canOwnEntry(entry.authorId) && (
                      <div className={s.actions}>
                        <button
                          className={s.tinyButton}
                          disabled={!canEdit}
                          title={c.edit}
                          aria-label={c.edit}
                          onClick={() => {
                            setEntryError("");
                            setEntryForm({
                              ...blankEntry,
                              kind: "comments",
                              id: entry.id,
                              body: entry.body,
                            });
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className={s.tinyButton}
                          disabled={!canEdit}
                          title={c.remove}
                          aria-label={c.remove}
                          onClick={() => void remove("comments", entry.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </header>
                  <p>{entry.body}</p>
                </article>
              ))}
              {!data.comments.length && (
                <div className={s.empty}>{c.noEntries}</div>
              )}
            </section>
          )}
          {tab === "time" && (
            <section style={{ paddingTop: 20 }}>
              <div className={s.sectionHeader}>
                <h2>{duration(data.spentMinutes)}</h2>
                {data.canEdit && (
                  <button
                    className={s.button}
                    disabled={!canEdit}
                    onClick={() => {
                      setEntryError("");
                      setEntryForm(blankEntry);
                    }}
                  >
                    <Plus size={15} />
                    {c.logTime}
                  </button>
                )}
              </div>
              {data.timeEntries.map((entry) => (
                <div className={s.entryRow} key={entry.id}>
                  <div>
                    <strong>
                      {duration(entry.minutes)} · {entry.userName}
                    </strong>
                    <small>
                      {dateTime(entry.workedOn, locale)}
                      {entry.note ? " · " + entry.note : ""}
                    </small>
                  </div>
                  {data.canEdit && canOwnEntry(entry.userId) && (
                    <div className={s.actions}>
                      <button
                        className={s.tinyButton}
                        disabled={!canEdit}
                        title={c.edit}
                        aria-label={c.edit}
                        onClick={() => {
                          setEntryError("");
                          setEntryForm({
                            ...blankEntry,
                            ...entry,
                            note: entry.note || "",
                            workedOn: entry.workedOn.slice(0, 10),
                          });
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className={s.tinyButton}
                        disabled={!canEdit}
                        title={c.remove}
                        aria-label={c.remove}
                        onClick={() => void remove("time", entry.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!data.timeEntries.length && (
                <div className={s.empty}>{c.noEntries}</div>
              )}
            </section>
          )}
          {tab === "activity" && (
            <section>
              <div className={s.activity}>
                {history.map((entry) => (
                  <article className={s.activityEntry} key={entry.id}>
                    <time>{dateTime(entry.createdAt, locale, true)}</time>
                    <strong>{entry.actorName}</strong>{" "}
                    {c.activityActions[
                      entry.action as keyof typeof c.activityActions
                    ] || entry.action}
                    <Changes entry={entry} copy={c} workspace={workspace} />
                  </article>
                ))}
              </div>
              {!history.length && <div className={s.empty}>{c.noEntries}</div>}
              {moreHistory && (
                <button
                  className={s.button}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const rows = (await authedFetch(
                        `/tasks/${id}/history?skip=${history.length}`,
                      )) as Activity[];
                      setHistory([...history, ...rows]);
                      setMoreHistory(rows.length === 50);
                    } catch (e) {
                      setError(errorText(e, c));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {c.moreHistory}
                </button>
              )}
            </section>
          )}
        </div>
        <aside className={s.detailAside}>
          <WorkField label={c.status} topic="workflow">
            <select
              aria-label={c.status}
              value={data.status}
              disabled={!canEdit}
              onChange={(e) =>
                void mutate("", { status: e.target.value }, "PATCH")
              }
            >
              {statuses.map((value) => (
                <option value={value} key={value}>
                  {c.statuses[value]}
                </option>
              ))}
            </select>
          </WorkField>
          <WorkField label={c.assignee} topic="access">
            <select
              aria-label={c.assignee}
              value={data.assignedToId || ""}
              disabled={!canEdit}
              onChange={(e) =>
                void mutate(
                  "",
                  { assignedToId: e.target.value || null },
                  "PATCH",
                )
              }
            >
              <option value="">{c.unassigned}</option>
              {data.assignedTo &&
                !people.some((u) => u.id === data.assignedToId) && (
                  <option value={data.assignedToId!} disabled>
                    {data.assignedTo.name}
                  </option>
                )}
              {people.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </WorkField>
          <WorkField label={c.priority} topic="priority">
            <select
              aria-label={c.priority}
              value={data.priority}
              disabled={!canEdit}
              onChange={(e) =>
                void mutate("", { priority: e.target.value }, "PATCH")
              }
            >
              {priorities.map((value) => (
                <option value={value} key={value}>
                  {c.priorities[value]}
                </option>
              ))}
            </select>
          </WorkField>
          <div className={s.metaLine}>
            <span className={s.helpHeading}>
              {c.start}
              <WorkInfo topic="dates" />
            </span>
            <strong>{dateTime(data.startAt, locale, true)}</strong>
          </div>
          <div className={s.metaLine}>
            <span className={s.helpHeading}>
              {c.due}
              <WorkInfo topic="dates" />
            </span>
            <strong>{dateTime(data.dueAt, locale, true)}</strong>
          </div>
          <div className={s.metaLine}>
            <span className={s.helpHeading}>
              {c.estimated}
              <WorkInfo topic="time" />
            </span>
            <strong>{duration(data.estimateMinutes)}</strong>
          </div>
          <div className={s.metaLine}>
            <span className={s.helpHeading}>
              {c.logged}
              <WorkInfo topic="time" />
            </span>
            <strong>{duration(data.spentMinutes)}</strong>
          </div>
          <div className={s.metaLine}>
            <span>{c.creator}</span>
            <strong>{data.createdBy.name}</strong>
          </div>
          <div className={s.metaLine}>
            <span>{c.updated}</span>
            <strong>{dateTime(data.updatedAt, locale, true)}</strong>
          </div>
          {!!data.labels.length && (
            <div>
              <div className={s.helpHeading}>
                <h3>{c.labels}</h3>
                <WorkInfo topic="labels" />
              </div>
              <div className={s.tags}>
                {data.labels.map((label) => (
                  <span className={s.tag} key={label}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(data.agency || data.customer || data.lead) && (
            <div>
              <div className={s.helpHeading}>
                <h3>{c.crm}</h3>
                <WorkInfo topic="crm" />
              </div>
              {data.agency && (
                <div className={s.metaLine}>
                  <span>{c.agency}</span>
                  <strong>{data.agency.name}</strong>
                </div>
              )}
              {data.customer && (
                <div className={s.metaLine}>
                  <span>{c.customer}</span>
                  <strong>{data.customer.fullName}</strong>
                </div>
              )}
              {data.lead && (
                <div className={s.metaLine}>
                  <span>{c.leadRef}</span>
                  <strong>{data.lead.fullName}</strong>
                </div>
              )}
            </div>
          )}
          {data.canArchive && (
            <div className={s.archiveActions}>
              <button
                className={`${s.button} ${s.dangerButton}`}
                disabled={busy || loading}
                onClick={() => {
                  if (
                    window.confirm(
                      data.archivedAt ? c.restoreConfirm : c.archiveConfirm,
                    )
                  )
                    void mutate("/archive", { archived: !data.archivedAt });
                }}
              >
                <Archive size={16} />
                {data.archivedAt ? c.restore : c.archive}
              </button>
              <WorkInfo topic="archive" />
            </div>
          )}
        </aside>
      </div>
      {form && (
        <TaskForm
          copy={c}
          workspace={workspace}
          item={form === "edit" ? data : undefined}
          projectId={data.projectId || ""}
          parentId={form === "child" ? id : undefined}
          onClose={() => setForm(null)}
          onSaved={(savedId) => {
            setForm(null);
            if (savedId === id) void load();
            else router.push("/tasks/" + savedId);
          }}
        />
      )}
      {entryForm && (
        <Modal
          title={entryForm.kind === "time" ? c.logTime : c.edit}
          help={<WorkInfo topic={entryForm.kind} />}
          closeLabel={c.close}
          onClose={() => {
            if (!busy) setEntryForm(null);
          }}
        >
          <form className={s.form} onSubmit={saveEntry}>
            <fieldset disabled={busy}>
              {entryError && (
                <div className={s.error} role="alert">
                  {entryError}
                </div>
              )}
              {entryForm.kind === "comments" && (
                <label className={s.field}>
                  {c.comments}
                  <textarea
                    required
                    value={entryForm.body}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, body: e.target.value })
                    }
                    rows={5}
                    maxLength={10000}
                  />
                </label>
              )}
              {entryForm.kind === "checklist" && (
                <label className={s.field}>
                  {c.titleField}
                  <input
                    required
                    value={entryForm.title}
                    maxLength={500}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, title: e.target.value })
                    }
                  />
                </label>
              )}
              {entryForm.kind === "time" && (
                <>
                  <div className={s.formGrid}>
                    <label className={s.field}>
                      {c.minutes}
                      <input
                        type="number"
                        required
                        min={1}
                        max={1440}
                        value={entryForm.minutes}
                        onChange={(e) =>
                          setEntryForm({
                            ...entryForm,
                            minutes: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className={s.field}>
                      {c.workedOn}
                      <input
                        type="date"
                        required
                        value={entryForm.workedOn}
                        max={blankEntry.workedOn}
                        onChange={(e) =>
                          setEntryForm({
                            ...entryForm,
                            workedOn: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className={s.field}>
                    {c.note}
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={entryForm.note}
                      onChange={(e) =>
                        setEntryForm({ ...entryForm, note: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
              <footer className={s.formFooter}>
                <button className={s.primary} type="submit">
                  {busy ? c.saving : c.save}
                </button>
              </footer>
            </fieldset>
          </form>
        </Modal>
      )}
      {dependencyOpen && (
        <Modal
          title={c.addDependency}
          help={<WorkInfo topic="dependencies" />}
          closeLabel={c.close}
          onClose={() => {
            if (!busy) setDependencyOpen(false);
          }}
        >
          <form
            className={s.form}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!dependencyId) return;
              if (await mutate("/dependencies", { blockerId: dependencyId }))
                setDependencyOpen(false);
            }}
          >
            <fieldset disabled={busy}>
              {(error || entryError) && (
                <div className={s.error} role="alert">
                  {error || entryError}
                </div>
              )}
              <label className={s.field}>
                {c.search}
                <input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                />
              </label>
              <label className={s.field}>
                {c.blockedBy}
                <select
                  required
                  value={dependencyId}
                  onChange={(e) => setDependencyId(e.target.value)}
                >
                  <option value="">{c.chooseItem}</option>
                  {candidates
                    .filter(
                      (item) =>
                        !data.blockers.some((b) => b.blockerId === item.id),
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {c.statuses[item.status]}
                      </option>
                    ))}
                </select>
              </label>
              <footer className={s.formFooter}>
                <button
                  className={s.primary}
                  type="submit"
                  disabled={!dependencyId}
                >
                  {busy ? c.saving : c.add}
                </button>
              </footer>
            </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
}
