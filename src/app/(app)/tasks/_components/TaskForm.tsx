"use client";
import { useEffect, useState } from "react";
import { Save, Search, X } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { errorText, type Copy } from "../_lib/copy";
import {
  kinds,
  localInput,
  priorities,
  statuses,
  type WorkItem,
  type Workspace,
} from "../_lib/types";
import Modal from "./Modal";
import WorkInfo, { WorkField } from "./WorkInfo";
import s from "../work.module.css";

export default function TaskForm({
  copy: c,
  workspace,
  item,
  projectId = "",
  parentId,
  onClose,
  onSaved,
}: {
  copy: Copy;
  workspace: Workspace;
  item?: WorkItem;
  projectId?: string;
  parentId?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [project, setProject] = useState(item?.projectId || projectId);
  const [assigned, setAssigned] = useState(item?.assignedToId || "");
  const [status, setStatus] = useState(item?.status || "TODO");
  const [priority, setPriority] = useState(item?.priority || "MEDIUM");
  const [kind, setKind] = useState(item?.kind || "TASK");
  const [start, setStart] = useState(localInput(item?.startAt));
  const [due, setDue] = useState(localInput(item?.dueAt));
  const [estimate, setEstimate] = useState(item?.estimateMinutes || 0);
  const [labels, setLabels] = useState(item?.labels.join(", ") || "");
  const [links, setLinks] = useState<
    Record<string, { id: string; name: string } | null>
  >({
    agency: item?.agency || null,
    customer: item?.customer
      ? { id: item.customer.id, name: item.customer.fullName }
      : null,
    lead: item?.lead ? { id: item.lead.id, name: item.lead.fullName } : null,
  });
  const [referenceKind, setReferenceKind] = useState("customer");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedProject = workspace.projects.find((p) => p.id === project);
  const people = selectedProject
    ? workspace.users.filter(
        (u) =>
          u.id === selectedProject.ownerId ||
          selectedProject.members.some(
            (m) => m.userId === u.id && m.role !== "VIEWER",
          ),
      )
    : workspace.users;
  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      void authedFetch(
        `/tasks/references/${referenceKind}?search=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then(setMatches)
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorText(e, c));
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, referenceKind, c]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError(c.taskTitleRequired);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title,
        description: description || null,
        assignedToId: assigned || null,
        status,
        priority,
        kind,
        startAt: start ? new Date(start).toISOString() : null,
        dueAt: due ? new Date(due).toISOString() : null,
        estimateMinutes: estimate,
        labels: labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        agencyId: links.agency?.id || null,
        customerId: links.customer?.id || null,
        leadId: links.lead?.id || null,
        ...(item
          ? { version: item.version }
          : { projectId: project || null, parentId: parentId || null }),
      };
      const result = await authedFetch(item ? "/tasks/" + item.id : "/tasks", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved(item?.id || result.id);
    } catch (e) {
      setError(errorText(e, c));
      setSaving(false);
    }
  }
  return (
    <Modal
      title={item ? c.edit : c.newTask}
      help={<WorkInfo topic={parentId ? "subtasks" : "task"} />}
      closeLabel={c.close}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form className={s.form} onSubmit={submit}>
        <fieldset disabled={saving}>
          {error && (
            <div className={s.error} role="alert">
              {error}
            </div>
          )}
          <label className={s.field}>
            {c.titleField}
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={240}
            />
          </label>
          <label className={s.field}>
            {c.description}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={20000}
            />
          </label>
          <div className={s.formGrid}>
            <WorkField label={c.project} topic="projects">
              <select
                aria-label={c.project}
                disabled={!!item || !!parentId}
                value={project}
                onChange={(e) => {
                  setProject(e.target.value);
                  setAssigned("");
                }}
              >
                <option value="">{c.personal}</option>
                {workspace.projects
                  .filter((p) => p.canEdit || p.id === project)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.key} · {p.name}
                    </option>
                  ))}
              </select>
            </WorkField>
            <WorkField label={c.assignee} topic="access">
              <select
                aria-label={c.assignee}
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
              >
                <option value="">{c.unassigned}</option>
                {item?.assignedTo &&
                  !people.some((u) => u.id === item.assignedToId) && (
                    <option value={item.assignedToId!} disabled>
                      {item.assignedTo.name}
                    </option>
                  )}
                {people.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </WorkField>
            <WorkField label={c.status} topic="workflow">
              <select
                aria-label={c.status}
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                {statuses.map((v) => (
                  <option value={v} key={v}>
                    {c.statuses[v]}
                  </option>
                ))}
              </select>
            </WorkField>
            <WorkField label={c.priority} topic="priority">
              <select
                aria-label={c.priority}
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
              >
                {priorities.map((v) => (
                  <option value={v} key={v}>
                    {c.priorities[v]}
                  </option>
                ))}
              </select>
            </WorkField>
            <WorkField label={c.kind} topic="task">
              <select
                aria-label={c.kind}
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                {kinds.map((v) => (
                  <option value={v} key={v}>
                    {c.kinds[v]}
                  </option>
                ))}
              </select>
            </WorkField>
            <WorkField label={c.estimate} topic="time">
              <input
                type="number"
                min={0}
                max={1000000}
                value={estimate}
                onChange={(e) => setEstimate(Number(e.target.value))}
              />
            </WorkField>
            <WorkField label={c.start} topic="dates">
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </WorkField>
            <WorkField label={c.due} topic="dates">
              <input
                type="datetime-local"
                min={start || undefined}
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </WorkField>
          </div>
          <WorkField label={c.labels} topic="labels">
            <input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder={c.labelsHint}
            />
          </WorkField>
          {workspace.me?.role !== "ACCOUNTING" && (
            <details className={s.disclosure}>
              <summary>
                {c.crm} <span className={s.muted}>{c.optional}</span>
              </summary>
              <div className={s.helpHeading}>
                <h3>{c.crm}</h3>
                <WorkInfo topic="crm" />
              </div>
              <div className={s.actions}>
                {Object.entries(links)
                  .filter(([, v]) => v)
                  .map(([key, value]) => (
                    <span key={key} className={s.tag}>
                      {value?.name}
                      <button
                        type="button"
                        className={s.tinyButton}
                        title={c.remove}
                        aria-label={c.remove}
                        onClick={() => setLinks({ ...links, [key]: null })}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
              </div>
              <div className={s.formGrid}>
                <label className={s.field}>
                  {c.crmType}
                  <select
                    value={referenceKind}
                    onChange={(e) => {
                      setReferenceKind(e.target.value);
                      setQuery("");
                    }}
                  >
                    <option value="customer">{c.customer}</option>
                    <option value="agency">{c.agency}</option>
                    <option value="lead">{c.leadRef}</option>
                  </select>
                </label>
                <label className={s.field}>
                  {c.crmSearch}
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className={s.lookup}>
                {query.trim().length >= 2 &&
                  matches.map((match) => (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() => {
                        setLinks({ ...links, [referenceKind]: match });
                        setQuery("");
                      }}
                    >
                      <Search size={14} />
                      {match.name}
                    </button>
                  ))}
              </div>
            </details>
          )}
          <footer className={s.formFooter}>
            <button type="button" className={s.button} onClick={onClose}>
              {c.cancel}
            </button>
            <button type="submit" className={s.primary}>
              <Save size={16} />
              {saving ? c.saving : c.save}
            </button>
          </footer>
        </fieldset>
      </form>
    </Modal>
  );
}
