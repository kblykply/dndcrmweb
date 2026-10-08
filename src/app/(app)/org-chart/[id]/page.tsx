"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowLeft, ArrowUpRight, Check, CheckCheck, Circle, FileCheck2, History, Link2, Plus, Printer, RefreshCw, RotateCcw, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import Modal from "../_components/Modal";
import { orgCopy, errorText, type Copy } from "../_lib/copy";
import { definitionChecks, descendants, isOverdue } from "../_lib/model";
import { definitionFor, emptyWorkspace, type Definition, type Kind, type OrgDetail, type OrgLog, type OrgNode, type Responsibility, type Workspace } from "../_lib/types";
import s from "../organization.module.css";

const textFields = ["purpose", "responsibilities", "authority", "competencies", "performanceIndicators"] as const;
const historyFields = ["name", "code", "kind", "parentId", "order", ...textFields, "reviewDueAt", "status", "revision", "assignee", "processes", "approvedBy", "approvedAt", "acknowledgedAt"] as const;
type HistoryField = typeof historyFields[number];
function historyValue(node: OrgNode | null, key: HistoryField, copy: Copy, nodes: OrgNode[]): string {
  if (!node) return "-";
  if (key === "assignee" || key === "approvedBy") return node[key]?.name || "-";
  if (key === "kind") return copy.kinds[node.kind];
  if (key === "status") return copy.statuses[node.status];
  if (key === "parentId") return nodes.find((parent) => parent.id === node.parentId)?.name || node.parentId || copy.noParent;
  if (key === "processes") return node.processes?.map((link) => link.card.code + " " + link.card.title + " (" + copy.raci[link.responsibility] + ")").join("\n") || "-";
  return String(node[key] ?? "-");
}
function RevisionHistory({ logs, copy, nodes, locale }: { logs: OrgLog[]; copy: Copy; nodes: OrgNode[]; locale: string }) {
  return <>{logs.map((log) => <article className={s.historyItem} key={log.id}>
    <div className={s.historyTop}><strong>{copy.actions[log.action as keyof Copy["actions"]] || log.action}</strong><time>{new Date(log.createdAt).toLocaleString(locale)}</time></div>
    <p className={s.muted}>{log.actorName} · {copy.revision} {log.afterJson.revision}</p>
    {log.note && <p className={s.definitionText}>{log.note}</p>}
    <details><summary>{copy.viewRevision}</summary>
      <div className={s.diff}><strong /><strong>{copy.before}</strong><strong>{copy.after}</strong></div>
      {historyFields.filter((key) => !log.beforeJson || JSON.stringify(log.beforeJson[key]) !== JSON.stringify(log.afterJson[key]))
        .map((key) => <div className={s.diff} key={key}><strong>{copy[key]}</strong><div>{historyValue(log.beforeJson, key, copy, nodes)}</div><div>{historyValue(log.afterJson, key, copy, nodes)}</div></div>)}
    </details>
  </article>)}</>;
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLanguage();
  const copy = orgCopy[locale];
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [data, setData] = useState<OrgDetail | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [draft, setDraft] = useState<Definition>(definitionFor());
  const [assigneeId, setAssigneeId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [tab, setTab] = useState("definition");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState<"approve" | "archive" | "restore" | "assignment" | null>(null);
  const canEdit = !!me && ["ADMIN", "MANAGER"].includes(me.role);
  const canSeeQuality = !!me && ["ADMIN", "MANAGER", "AFTERSALES", "SALES"].includes(me.role);
  const editable = canEdit && data?.status !== "ARCHIVED";
  const dirty = !!data && JSON.stringify(draft) !== JSON.stringify(definitionFor(data));
  const excludedParents = useMemo(() => descendants(workspace.nodes, id), [workspace.nodes, id]);
  const parentOptions = workspace.nodes.filter((node) => !excludedParents.has(node.id) && node.status !== "ARCHIVED");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const [node, workspace] = await Promise.all([
        authedFetch("/org-chart/" + id, { signal }) as Promise<OrgDetail | null>,
        authedFetch("/org-chart/workspace", { signal }) as Promise<Workspace>,
      ]);
      if (signal?.aborted) return;
      setData(node); setWorkspace(workspace); setDraft(definitionFor(node || undefined));
      setAssigneeId(node?.assigneeId || ""); setAssignmentNote("");
    } catch (error) { if (!signal?.aborted) setError(errorText(error, copy)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [id, copy]);
  useEffect(() => {
    setMe(getUser());
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (!dirty && assigneeId === (data?.assigneeId || "") && !assignmentNote) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, assigneeId, assignmentNote, data?.assigneeId]);

  function field<K extends keyof Definition>(key: K, value: Definition[K]) {
    setDraft((old) => ({ ...old, [key]: value })); setSaved(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      await authedFetch("/org-chart/" + id, {
        method: "PATCH", body: JSON.stringify({ ...draft, parentId: draft.parentId || null, reviewDueAt: draft.reviewDueAt || null, version: data.version }),
      });
      await load(); setSaved(true);
    } catch (error) { setError(errorText(error, copy)); }
    finally { setSaving(false); }
  }
  async function action(name: string) {
    if (!data) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      await authedFetch("/org-chart/" + id + "/" + name, {
        method: "POST", body: JSON.stringify({ version: data.version, note: assignmentNote,
          ...(name === "assignment" ? { userId: assigneeId || null } : {}) }),
      });
      setConfirmation(null); await load(); setSaved(true);
    } catch (error) { setConfirmation(null); setError(errorText(error, copy)); }
    finally { setSaving(false); }
  }
  async function olderHistory() {
    if (!data?.logs.length) return;
    setSaving(true);
    try {
      const logs = await authedFetch("/org-chart/" + id + "/history?cursor=" + encodeURIComponent(data.logs[data.logs.length - 1].id)) as OrgLog[];
      setData((old) => old ? { ...old, logs: [...old.logs, ...logs] } : old);
    } catch (error) { setError(errorText(error, copy)); }
    finally { setSaving(false); }
  }
  const checks = data ? definitionChecks(data) : [];
  const filled = checks.filter((check) => check.complete).length;
  const confirmed = data?.acknowledgedRevision === data?.revision && !!data?.acknowledgedAt;
  const confirmMessage = confirmation === "approve" ? copy.approveConfirm : confirmation === "archive" ? copy.archiveConfirm : confirmation === "restore" ? copy.restoreConfirm : copy.assignmentConfirm;

  return <div className={s.page}>
    <Link className={s.back} href="/org-chart" onClick={(event) => {
      if ((dirty || assigneeId !== (data?.assigneeId || "") || assignmentNote) && !window.confirm(copy.unsaved)) event.preventDefault();
    }}><ArrowLeft size={14} />{copy.back}</Link>
    {error && <div className={s.error} role="alert">{error}</div>}
    {saved && <div className={s.success} role="status">{copy.saved}</div>}
    {!data ? <div className={s.empty}>{loading ? copy.loading : copy.noData}<button className={s.iconButton} aria-label={copy.refresh} title={copy.refresh} onClick={() => void load()}><RefreshCw size={16} /></button></div> : <>
      <header className={s.header}>
        <div><span className={s.eyebrow}>{copy.kinds[data.kind]} {data.code ? " / " + data.code : ""}</span><h1>{data.name}</h1>
          <div className={s.detailMeta}><span className={s.badge} data-status={data.status}>{copy.statuses[data.status]}</span><span>{copy.revision} {data.revision}</span><span>{workspace.nodes.find((node) => node.id === data.parentId)?.name || copy.noParent}</span></div>
        </div>
        <div className={s.actions}>
          {editable && tab === "definition" && <button className={s.primaryButton} type="submit" form="org-definition-form" disabled={saving || !dirty || !draft.name.trim()}><Save size={16} />{saving ? copy.saving : copy.save}</button>}
          <button className={s.iconButton} title={copy.refresh} aria-label={copy.refresh} disabled={loading || saving} onClick={() => { if (!(dirty || assigneeId !== (data.assigneeId || "") || assignmentNote) || window.confirm(copy.unsaved)) void load(); }}><RefreshCw size={17} /></button>
          <button className={s.iconButton} title={copy.print} aria-label={copy.print} onClick={() => window.print()}><Printer size={17} /></button>
        </div>
      </header>
      <div className={s.tabs + " " + s.noPrint} role="tablist" aria-label={data.name}>
        {[{ key: "definition", label: copy.definition, Icon: FileCheck2 }, { key: "assignment", label: copy.assignment, Icon: UserRound }, { key: "history", label: copy.history, Icon: History }]
          .map(({ key, label, Icon }) => <button className={s.tab} key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}><Icon size={16} />{label}</button>)}
      </div>
      <div className={s.printOnly}><h2>{copy.definition}</h2>{textFields.map((key) => <section key={key}><h3>{copy[key]}</h3><p className={s.definitionText}>{data[key] || copy.notSet}</p></section>)}
        <p>{copy.assignee}: {data.assignee?.name || copy.vacant}</p><p>{copy.approvedBy}: {data.approvedBy?.name || "-"} · {data.approvedAt || "-"}</p>
        <p>{copy.reviewDueAt}: {data.reviewDueAt?.slice(0, 10) || "-"}</p>
      </div>
      <div className={s.detailLayout + " " + s.noPrint}>
        <div className={s.detailMain}>
          {tab === "definition" && <form id="org-definition-form" onSubmit={(event) => void save(event)}>
            <section className={s.section}><h2>{copy.definition}</h2><div className={s.formGrid} style={{ marginTop: 18 }}>
              <label className={s.field + " " + s.full}>{copy.name}<input disabled={!editable || saving} required maxLength={160} value={draft.name} onChange={(event) => field("name", event.target.value)} /></label>
              <label className={s.field}>{copy.code}<input disabled={!editable || saving} maxLength={60} value={draft.code} onChange={(event) => field("code", event.target.value)} /></label>
              <label className={s.field}>{copy.kind}<select disabled={!editable || saving || !!data.assigneeId} value={draft.kind} onChange={(event) => field("kind", event.target.value as Kind)}>{Object.entries(copy.kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className={s.field}>{copy.parentId}<select disabled={!editable || saving} value={draft.parentId} onChange={(event) => field("parentId", event.target.value)}><option value="">{copy.noParent}</option>{parentOptions.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
                {data.parentId && !parentOptions.some((node) => node.id === data.parentId) && <option value={data.parentId}>{workspace.nodes.find((node) => node.id === data.parentId)?.name || data.parentId}</option>}
              </select></label>
              <label className={s.field}>{copy.order}<input disabled={!editable || saving} type="number" min={0} step={1} required value={draft.order} onChange={(event) => field("order", Number(event.target.value))} /></label>
              {textFields.map((key) => <label className={s.field + " " + s.full} key={key}>{copy[key]}
                <textarea disabled={!editable || saving} rows={key === "responsibilities" ? 7 : 4} maxLength={key === "responsibilities" ? 20000 : 10000} value={draft[key]} onChange={(event) => field(key, event.target.value)} /></label>)}
              <label className={s.field}>{copy.reviewDueAt}<input disabled={!editable || saving} type="date" value={draft.reviewDueAt} onChange={(event) => field("reviewDueAt", event.target.value)} /></label>
            </div></section>
            <section className={s.section}><div className={s.qualityIntro}><h2>{copy.processes}</h2>{editable && <button type="button" className={s.button} disabled={saving || draft.processes.length >= 100} onClick={() => field("processes", [...draft.processes, { cardId: "", responsibility: "RESPONSIBLE" }])}><Plus size={16} />{copy.addProcess}</button>}</div>
              {draft.processes.map((link, index) => <div className={s.processRow} key={index}>
                <select disabled={!editable || saving} required aria-label={copy.process + " " + (index + 1)} value={link.cardId} onChange={(event) => field("processes", draft.processes.map((item, i) => i === index ? { ...item, cardId: event.target.value } : item))}>
                  <option value="">{copy.chooseProcess}</option>
                  {workspace.qualityCards.filter((card) => card.id === link.cardId || !draft.processes.some((other) => other.cardId === card.id)).map((card) => <option key={card.id} value={card.id}>{card.code} · {card.title}</option>)}
                  {link.cardId && !workspace.qualityCards.some((card) => card.id === link.cardId) && <option value={link.cardId}>{data.processes.find((item) => item.cardId === link.cardId)?.card.title} ({copy.expiredProcess})</option>}
                </select>
                <select disabled={!editable || saving} aria-label={copy.responsibility + " " + (index + 1)} value={link.responsibility} onChange={(event) => field("processes", draft.processes.map((item, i) => i === index ? { ...item, responsibility: event.target.value as Responsibility } : item))}>
                  {Object.entries(copy.raci).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                {editable && <button type="button" className={s.iconButton} disabled={saving} title={copy.remove} aria-label={copy.remove + " " + (index + 1)} onClick={() => field("processes", draft.processes.filter((_, i) => i !== index))}><Trash2 size={16} /></button>}
              </div>)}
              {!draft.processes.length && <p className={s.muted}>{copy.noProcesses}</p>}
              {canSeeQuality && <div className={s.pillList}>{data.processes.map((link) => <Link key={link.cardId} className={s.button} href={"/quality-control/" + link.cardId} target="_blank" rel="noopener noreferrer"><Link2 size={14} />{link.card.code}<ArrowUpRight size={14} /></Link>)}</div>}
            </section>
            {editable && <section className={s.section}><label className={s.field}>{copy.note}<textarea rows={2} maxLength={2000} value={draft.note} onChange={(event) => field("note", event.target.value)} disabled={saving} /></label>
              <div className={s.actions} style={{ marginTop: 16 }}><button className={s.primaryButton} disabled={saving || !dirty || !draft.name.trim()}><Save size={16} />{saving ? copy.saving : copy.save}</button></div></section>}
          </form>}
          {tab === "assignment" && <section className={s.section}>
            <h2>{copy.assignment}</h2>
            <div className={s.infoLine}><span className={s.label}>{copy.assignee}</span><strong>{data.assignee?.name || copy.vacant}</strong>
              {data.assignee && !data.assignee.isActive && <p className={s.warn}>{copy.inactive}</p>}</div>
            {data.kind === "POSITION" && editable && <div style={{ marginTop: 20 }}>
              <label className={s.field}>{copy.assignee}<select disabled={saving || dirty} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">{copy.unassign}</option>{workspace.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                {data.assignee && !workspace.users.some((user) => user.id === data.assigneeId) && <option value={data.assignee.id}>{data.assignee.name} ({copy.inactive})</option>}
              </select></label>
              <label className={s.field} style={{ marginTop: 20 }}>{copy.note}<textarea disabled={saving || dirty} rows={3} maxLength={2000} value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} /></label>
              <button className={s.primaryButton} style={{ marginTop: 16 }} disabled={saving || dirty || assigneeId === (data.assigneeId || "")} onClick={() => setConfirmation("assignment")}><UserRound size={16} />{copy.assign}</button>
            </div>}
            {data.kind === "POSITION" && <div className={s.section}><h3>{confirmed ? copy.acknowledged : copy.acknowledgePending}</h3>
              {confirmed && <p className={s.muted}>{data.assignee?.name} · {new Date(data.acknowledgedAt!).toLocaleString(locale)} · {copy.revision} {data.acknowledgedRevision}</p>}
              {data.assigneeId === me?.id && data.status === "APPROVED" && !confirmed && <button className={s.primaryButton} disabled={saving || dirty} onClick={() => void action("acknowledge")}><CheckCheck size={16} />{copy.acknowledge}</button>}
            </div>}
            <h3>{copy.history}</h3><RevisionHistory logs={data.logs.filter((log) => ["ASSIGNMENT_CHANGED", "ACKNOWLEDGED"].includes(log.action))} copy={copy} nodes={workspace.nodes} locale={locale} />
            {data.logs.length < data.logCount && <button className={s.button} disabled={saving} onClick={() => void olderHistory()}>{copy.more}</button>}
          </section>}
          {tab === "history" && <section className={s.section}><h2>{copy.history}</h2>
            <RevisionHistory logs={data.logs} copy={copy} nodes={workspace.nodes} locale={locale} />
            {!data.logs.length && <p className={s.muted}>{copy.noHistory}</p>}
            {data.logs.length < data.logCount && <button className={s.button} disabled={saving} onClick={() => void olderHistory()}>{copy.more}</button>}
          </section>}
        </div>
        <aside className={s.sidePanel}>
          <h3><ShieldCheck size={17} /> {copy.definitionReadiness}</h3>
          <strong>{filled} / {checks.length}</strong><progress className={s.progress} max={checks.length} value={filled} />
          <ul className={s.checks}>{checks.map((check) => <li key={check.key}>{check.complete ? <Check className={s.ok} size={15} /> : <Circle className={s.warn} size={15} />}<span>{copy[check.key]}</span></li>)}</ul>
          <div className={s.infoLine}><span className={s.label}>{copy.reviewDueAt}</span><strong>{data.reviewDueAt?.slice(0, 10) || copy.notSet}</strong>{isOverdue(data) && <p className={s.warn}>{copy.overdue}</p>}</div>
          <div className={s.infoLine}><span className={s.label}>{copy.approvedBy}</span><strong>{data.approvedBy?.name || copy.notSet}</strong>{data.approvedAt && <p className={s.muted}>{new Date(data.approvedAt).toLocaleDateString(locale)}</p>}</div>
          <div className={s.infoLine}><span className={s.label}>{copy.assignee}</span><strong>{data.assignee?.name || (data.kind === "POSITION" ? copy.vacant : "-")}</strong></div>
          {canEdit && <div className={s.section}>
            {data.status === "DRAFT" && <button className={s.primaryButton} disabled={saving || dirty || filled !== checks.length || isOverdue(data)} onClick={() => setConfirmation("approve")}><ShieldCheck size={16} />{copy.approve}</button>}
            {data.status === "ARCHIVED" ? <button className={s.button} disabled={saving} onClick={() => setConfirmation("restore")}><RotateCcw size={16} />{copy.restore}</button>
              : <button className={s.dangerButton} disabled={saving || dirty} onClick={() => setConfirmation("archive")}><Archive size={16} />{copy.archive}</button>}
          </div>}
          <p className={s.muted}>ISO 9001:2015<br />4.4 · 5.3 · 7.2 · 7.3 · 7.5</p>
        </aside>
      </div>
    </>}
    {confirmation && <Modal title={copy.confirm} closeLabel={copy.close} onClose={() => { if (!saving) setConfirmation(null); }}>
      <p>{confirmMessage}</p>{confirmation === "assignment" && <p><strong>{data?.assignee?.name || copy.vacant} → {workspace.users.find((user) => user.id === assigneeId)?.name || copy.vacant}</strong></p>}
      <div className={s.actions}><button className={s.button} disabled={saving} onClick={() => setConfirmation(null)}>{copy.cancel}</button><button className={s.primaryButton} disabled={saving} onClick={() => void action(confirmation)}>{saving ? copy.saving : copy.confirm}</button></div>
    </Modal>}
  </div>;
}
