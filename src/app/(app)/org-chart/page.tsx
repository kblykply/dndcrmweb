"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCheck, CircleAlert, FileCheck2, List, Network, Plus, RefreshCw, Search, UserRound, Users, X } from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { errorText, orgCopy } from "./_lib/copy";
import { chartRows, definitionChecks, isOverdue } from "./_lib/model";
import { definitionFor, emptyWorkspace, type Kind, type OrgNode, type Workspace } from "./_lib/types";
import OrganizationCanvas from "./_components/OrganizationCanvas";
import Modal from "./_components/Modal";
import s from "./organization.module.css";

export default function OrganizationPage() {
  const { locale } = useLanguage();
  const copy = orgCopy[locale];
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("chart");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [create, setCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<Kind>("POSITION");
  const [newParent, setNewParent] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const canEdit = !!me && ["ADMIN", "MANAGER"].includes(me.role);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await authedFetch("/org-chart/workspace") as Workspace); }
    catch (error) { setError(errorText(error, copy)); }
    finally { setLoading(false); }
  }, [copy]);
  useEffect(() => { setMe(getUser()); void load(); }, [load]);
  const active = useMemo(() => data.nodes.filter((node) => node.status !== "ARCHIVED"), [data.nodes]);
  const filtered = useMemo(() => data.nodes.filter((node) => {
    if (status === "ARCHIVED" ? node.status !== "ARCHIVED" : node.status === "ARCHIVED") return false;
    if (kind && node.kind !== kind) return false;
    if (status === "VACANT" && (node.kind !== "POSITION" || node.assigneeId)) return false;
    if (["APPROVED", "DRAFT"].includes(status) && node.status !== status) return false;
    return [node.name, node.code, node.assignee?.name].filter(Boolean).join(" ").toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
  }), [data.nodes, kind, status, query, locale]);
  const rows = useMemo(() => chartRows(
    status === "ARCHIVED" ? data.nodes : active, new Set(filtered.map((node) => node.id)), collapsed, !!query || !!kind || !!status,
  ), [active, data.nodes, filtered, collapsed, query, kind, status]);
  const toggle = useCallback((id: string) => setCollapsed((old) => {
    const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next;
  }), []);
  const selected = data.nodes.find((node) => node.id === selectedId);
  const positions = active.filter((node) => node.kind === "POSITION");
  const occupied = positions.filter((node) => node.assignee?.isActive).length;
  const needsReview = active.filter((node) => node.status === "DRAFT" || isOverdue(node)).length;
  const parentName = (node: OrgNode) => data.nodes.find((parent) => parent.id === node.parentId)?.name || copy.noParent;
  function closeCreate() { if (!saving) { setCreate(false); setCreateError(""); } }
  async function createRecord(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setCreateError("");
    try {
      const node = await authedFetch("/org-chart", { method: "POST", body: JSON.stringify({
        ...definitionFor(), name: newName, kind: newKind, parentId: newParent || null, reviewDueAt: null,
      }) }) as OrgNode;
      router.push("/org-chart/" + node.id);
    } catch (error) { setCreateError(errorText(error, copy)); setSaving(false); }
  }

  return <div className={s.page}>
    <header className={s.header}>
      <div className={s.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dndblack.png" alt="DND" width={72} height={40} />
        <div><span className={s.eyebrow}>{copy.company}</span><h1>{copy.title}</h1></div>
      </div>
      <div className={s.actions}>
        <button className={s.iconButton} title={copy.refresh} aria-label={copy.refresh} disabled={loading} onClick={() => void load()}><RefreshCw size={17} /></button>
        {canEdit && <button className={s.primaryButton} onClick={() => { setNewName(""); setNewKind("POSITION"); setNewParent(selectedId || ""); setCreate(true); }}><Plus size={17} />{copy.newRecord}</button>}
      </div>
    </header>
    <div className={s.metrics}>
      {[{ title: copy.departments, value: active.filter((node) => node.kind === "DEPARTMENT").length, Icon: Building2 },
        { title: copy.positionsCount, value: positions.length, Icon: Users },
        { title: copy.occupied, value: occupied, Icon: UserRound },
        { title: copy.reviewNeeded, value: needsReview, Icon: FileCheck2 }].map(({ title, value, Icon }) =>
        <div className={s.metric} key={title}><div className={s.metricIcon}><Icon size={20} /></div><div><strong>{loading ? "..." : value}</strong><span>{title}</span></div></div>)}
    </div>
    {error && <div className={s.error} role="alert">{error}</div>}
    <div className={s.tabs} role="tablist" aria-label={copy.title}>
      {[{ id: "chart", title: copy.chart, Icon: Network }, { id: "positions", title: copy.positions, Icon: List }, { id: "quality", title: copy.quality, Icon: CheckCheck }]
        .map(({ id, title, Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={s.tab} onClick={() => setTab(id)}><Icon size={16} />{title}</button>)}
    </div>
    {tab !== "quality" && <div className={s.toolbar}>
      <div className={s.search}><Search size={17} /><input aria-label={copy.search} placeholder={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label={copy.kind}>
        <option value="">{copy.allKinds}</option>{Object.entries(copy.kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={copy.status}>
        <option value="">{copy.allStatuses}</option><option value="VACANT">{copy.vacancy}</option>
        <option value="DRAFT">{copy.statuses.DRAFT}</option><option value="APPROVED">{copy.statuses.APPROVED}</option><option value="ARCHIVED">{copy.archived}</option>
      </select>
      {(query || kind || status) && <button className={s.iconButton} title={copy.clear} aria-label={copy.clear} onClick={() => { setQuery(""); setKind(""); setStatus(""); }}><X size={16} /></button>}
      <span className={s.count}>{filtered.length} / {data.nodes.length}</span>
    </div>}
    {loading && !data.nodes.length ? <div className={s.empty} role="status">{copy.loading}</div> : <>
      {tab === "chart" && <div className={s.workspace}>
        <OrganizationCanvas rows={rows} allRows={active} copy={copy} selectedId={selectedId} collapsed={collapsed} onToggle={toggle} onSelect={setSelectedId} />
        {selected && <aside className={s.summary}>
          <div className={s.actions}><span className={s.badge} data-status={selected.status}>{copy.statuses[selected.status]}</span>
            <button className={s.iconButton} style={{ marginLeft: "auto" }} title={copy.close} aria-label={copy.close} onClick={() => setSelectedId(null)}><X size={16} /></button></div>
          <h2>{selected.name}</h2><span className={s.muted}>{selected.code || copy.kinds[selected.kind]} · {copy.revision} {selected.revision}</span>
          {selected.kind === "POSITION" && <div className={s.infoLine}><span className={s.label}>{copy.assignee}</span><strong>{selected.assignee?.name || copy.vacant}</strong>
            {selected.assignee && !selected.assignee.isActive && <p>{copy.inactive}</p>}</div>}
          <div className={s.infoLine}><span className={s.label}>{copy.parentId}</span><strong>{parentName(selected)}</strong></div>
          <div className={s.infoLine}><span className={s.label}>{copy.definitionReadiness}</span><strong>{definitionChecks(selected).filter((item) => item.complete).length} / {definitionChecks(selected).length}</strong>
            <progress className={s.progress} value={definitionChecks(selected).filter((item) => item.complete).length} max={definitionChecks(selected).length} /></div>
          <p>{selected.purpose || copy.notSet}</p>
          <Link className={s.primaryButton} href={"/org-chart/" + selected.id}>{copy.detail}<ArrowRight size={16} /></Link>
        </aside>}
      </div>}
      {tab === "positions" && <div className={s.tableWrap}><table className={s.table}>
        <thead><tr><th>{copy.name}</th><th>{copy.parentId}</th><th>{copy.assignee}</th><th>{copy.status}</th><th>{copy.reviewDueAt}</th><th /></tr></thead>
        <tbody>{filtered.map((node) => <tr key={node.id}>
          <td><Link className={s.textLink} href={"/org-chart/" + node.id}>{node.name}</Link><small>{node.code || copy.kinds[node.kind]}</small></td>
          <td>{parentName(node)}</td><td>{node.assignee?.name || (node.kind === "POSITION" ? copy.vacant : "-")}{node.assignee && !node.assignee.isActive && <small>{copy.inactive}</small>}</td>
          <td><span className={s.badge} data-status={node.status}>{copy.statuses[node.status]}</span><small>{copy.revision} {node.revision}</small></td>
          <td>{node.reviewDueAt?.slice(0, 10) || copy.notSet}{isOverdue(node) && <small className={s.warn}>{copy.overdue}</small>}</td>
          <td><Link className={s.iconButton} title={copy.detail} aria-label={copy.detail + ": " + node.name} href={"/org-chart/" + node.id}><ArrowRight size={16} /></Link></td>
        </tr>)}</tbody>
      </table>{!filtered.length && <div className={s.empty}>{copy.noResults}</div>}</div>}
      {tab === "quality" && <>
        <div className={s.qualityIntro}><h2>{copy.quality}</h2><span className={s.muted}>ISO 9001:2015 · 4.4 / 5.3 / 7.2 / 7.5</span></div>
        <div className={s.tableWrap}><table className={s.table}><thead><tr><th>{copy.process}</th><th>{copy.raci.ACCOUNTABLE}</th><th>{copy.raci.RESPONSIBLE}</th><th>{copy.raci.CONSULTED} / {copy.raci.INFORMED}</th></tr></thead>
          <tbody>{data.qualityCards.map((card) => {
            const linked = active.filter((node) => node.processes.some((link) => link.cardId === card.id));
            return <tr key={card.id}><td><strong>{card.code}</strong><small>{card.title}</small></td>
              {(["ACCOUNTABLE", "RESPONSIBLE", "OTHER"] as const).map((raci) => {
                const assigned = linked.filter((node) => node.processes.some((link) => link.cardId === card.id &&
                  (raci === "OTHER" ? ["CONSULTED", "INFORMED"].includes(link.responsibility) : link.responsibility === raci)));
                return <td key={raci}><div className={s.pillList}>{assigned.map((node) => <Link key={node.id} className={s.badge} href={"/org-chart/" + node.id}>{node.name}</Link>)}
                  {!assigned.length && (raci === "ACCOUNTABLE" ? <span className={s.muted}><CircleAlert size={13} /> {copy.missingOwner}</span> : "-")}</div></td>;
              })}</tr>;
          })}</tbody></table>{!data.qualityCards.length && <div className={s.empty}>{copy.noQuality}</div>}</div>
      </>}
    </>}
    {create && <Modal title={copy.newRecord} closeLabel={copy.close} onClose={closeCreate}>
      <form onSubmit={(event) => void createRecord(event)}>
        {createError && <div className={s.error} role="alert">{createError}</div>}
        <div className={s.formGrid}>
          <label className={s.field + " " + s.full}>{copy.name}<input autoFocus required maxLength={160} value={newName} onChange={(event) => setNewName(event.target.value)} /></label>
          <label className={s.field}>{copy.kind}<select value={newKind} onChange={(event) => setNewKind(event.target.value as Kind)}>{Object.entries(copy.kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className={s.field}>{copy.parentId}<select value={newParent} onChange={(event) => setNewParent(event.target.value)}><option value="">{copy.noParent}</option>{active.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
        </div>
        <div className={s.actions}><button type="button" className={s.button} onClick={closeCreate} disabled={saving}>{copy.cancel}</button><button className={s.primaryButton} disabled={saving || !newName.trim()}><Plus size={16} />{saving ? copy.saving : copy.newRecord}</button></div>
      </form>
    </Modal>}
  </div>;
}
