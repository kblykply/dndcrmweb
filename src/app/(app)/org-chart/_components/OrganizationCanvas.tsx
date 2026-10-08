"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Background, ReactFlow, Handle, Position, type Node, type NodeProps, type ReactFlowInstance,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { Building2, BriefcaseBusiness, ChevronDown, ChevronUp, Expand, Maximize2, Minus, Plus, RotateCcw, Workflow } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { OrgNode } from "../_lib/types";
import type { Copy } from "../_lib/copy";
import s from "../organization.module.css";

type ChartNode = Node<{
  row: OrgNode; copy: Copy; horizontal: boolean; selected: boolean; hasChildren: boolean;
  collapsed: boolean; toggle: (id: string) => void; open: (id: string) => void;
}, "organization">;
const WIDTH = 264;
const HEIGHT = 164;
const smallScreenQuery = "(max-width: 760px)";
function subscribeScreen(callback: () => void) {
  const media = window.matchMedia(smallScreenQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getSmallScreen = () => window.matchMedia(smallScreenQuery).matches;
const getServerScreen = () => false;

function PositionNode({ data }: NodeProps<ChartNode>) {
  const { row, copy, horizontal } = data;
  const Icon = row.kind === "POSITION" ? BriefcaseBusiness : Building2;
  return <div className={s.graphNode} data-kind={row.kind} data-selected={data.selected}>
    <Handle type="target" position={horizontal ? Position.Left : Position.Top} isConnectable={false} />
    <div className={s.nodeTop}><span><Icon size={14} />{copy.kinds[row.kind]}</span><span>{row.code || "DND"}</span></div>
    <button type="button" className={s.nodeTitle + " nodrag nopan"} title={row.name}
      onClick={(event) => { event.stopPropagation(); data.open(row.id); }}>{row.name}</button>
    <div className={s.nodePerson} title={row.assignee?.name}>
      <span className={s.avatar}>{row.assignee ? row.assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("") : <Icon size={15} />}</span>
      <span>{row.kind === "POSITION" ? row.assignee?.name || copy.vacant : copy.kinds[row.kind]}</span>
    </div>
    <div className={s.nodeBottom}>
      <span className={s.badge} data-status={row.status}>{copy.statuses[row.status]}</span>
      {data.hasChildren && <button className={s.branchButton + " nodrag nopan"} type="button"
        title={data.collapsed ? copy.expand : copy.collapse} aria-label={data.collapsed ? copy.expand : copy.collapse}
        onClick={(event) => { event.stopPropagation(); data.toggle(row.id); }}>
        {data.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>}
    </div>
    <Handle type="source" position={horizontal ? Position.Right : Position.Bottom} isConnectable={false} />
  </div>;
}
const nodeTypes = { organization: PositionNode };

export default function OrganizationCanvas({ rows, allRows, copy, selectedId, collapsed, onToggle, onSelect }: {
  rows: OrgNode[]; allRows: OrgNode[]; copy: Copy; selectedId: string | null;
  collapsed: Set<string>; onToggle: (id: string) => void; onSelect: (id: string) => void;
}) {
  const smallScreen = useSyncExternalStore(subscribeScreen, getSmallScreen, getServerScreen);
  const [direction, setDirection] = useState<"LR" | "TB" | null>(null);
  const horizontal = direction ? direction === "LR" : smallScreen;
  const [flow, setFlow] = useState<ReactFlowInstance<ChartNode> | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const ref = useRef<HTMLDivElement>(null);
  const signature = rows.map((node) => node.id + node.parentId).join("|");
  const { nodes, edges } = useMemo(() => {
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: horizontal ? "LR" : "TB", nodesep: 30, ranksep: 64, marginx: 30, marginy: 30 });
    const ids = new Set(rows.map((row) => row.id));
    const parents = new Set(allRows.map((row) => row.parentId));
    for (const row of rows) graph.setNode(row.id, { width: WIDTH, height: HEIGHT });
    const edges = rows.filter((row) => row.parentId && ids.has(row.parentId))
      .map((row) => {
        graph.setEdge(row.parentId!, row.id);
        return { id: row.parentId + "-" + row.id, source: row.parentId!, target: row.id,
          type: "smoothstep", style: { stroke: "#9aabb6", strokeWidth: 1.6 }, selectable: false };
      });
    dagre.layout(graph);
    const nodes: ChartNode[] = rows.map((row) => ({
      id: row.id, type: "organization", width: WIDTH, height: HEIGHT,
      position: offsets[row.id] ?? { x: graph.node(row.id).x - WIDTH / 2, y: graph.node(row.id).y - HEIGHT / 2 },
      data: { row, copy, horizontal, selected: row.id === selectedId, hasChildren: parents.has(row.id),
        collapsed: collapsed.has(row.id), toggle: onToggle, open: onSelect },
      ariaLabel: row.name, focusable: true,
    }));
    return { nodes, edges };
  }, [rows, allRows, horizontal, copy, selectedId, collapsed, onToggle, onSelect, offsets]);

  useEffect(() => {
    const timer = setTimeout(() => { void flow?.fitView({ padding: 0.12, maxZoom: 1, duration: 250 }); }, 80);
    return () => clearTimeout(timer);
  }, [flow, signature, horizontal]);

  function fit() { void flow?.fitView({ padding: 0.18, maxZoom: 1, duration: 250 }); }
  async function fullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await ref.current?.requestFullscreen();
    setTimeout(fit, 150);
  }
  return <div ref={ref} className={s.canvas} data-testid="organization-canvas">
    <div className={s.canvasToolbar}>
      <button className={s.iconButton} title={copy.zoomIn} aria-label={copy.zoomIn} onClick={() => void flow?.zoomIn()}><Plus size={17} /></button>
      <button className={s.iconButton} title={copy.zoomOut} aria-label={copy.zoomOut} onClick={() => void flow?.zoomOut()}><Minus size={17} /></button>
      <button className={s.iconButton} title={copy.fit} aria-label={copy.fit} onClick={fit}><Expand size={17} /></button>
      <span className={s.toolbarDivider} />
      <button className={s.iconButton} title={horizontal ? copy.vertical : copy.horizontal} aria-label={horizontal ? copy.vertical : copy.horizontal}
        onClick={() => { setOffsets({}); setDirection(horizontal ? "TB" : "LR"); }}><Workflow size={17} /></button>
      <button className={s.iconButton} title={copy.reset} aria-label={copy.reset} onClick={() => { setOffsets({}); setTimeout(fit, 50); }}><RotateCcw size={17} /></button>
      <button className={s.iconButton} title={copy.fullscreen} aria-label={copy.fullscreen} onClick={() => void fullscreen().catch(() => undefined)}><Maximize2 size={17} /></button>
    </div>
    <ReactFlow<ChartNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setFlow}
      onNodeClick={(_, node) => onSelect(node.id)}
      onNodeDrag={(_, node) => setOffsets((current) => ({ ...current, [node.id]: node.position }))}
      onNodeDragStop={(_, node) => setOffsets((current) => ({ ...current, [node.id]: node.position }))}
      onNodeDoubleClick={(_, node) => onSelect(node.id)}
      nodesConnectable={false} edgesFocusable={false} deleteKeyCode={null} minZoom={0.12} maxZoom={1.8}
      fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} preventScrolling>
      <Background gap={22} size={1} color="#d9e1e6" />
    </ReactFlow>
    {!rows.length && <div className={s.canvasEmpty}><Workflow size={32} /><p>{copy.noResults}</p></div>}
  </div>;
}
