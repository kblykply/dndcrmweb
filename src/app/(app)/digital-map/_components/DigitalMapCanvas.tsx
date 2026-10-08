"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges, Background, BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
  Handle, MarkerType, MiniMap, NodeResizer, Position, ReactFlow,
  type Edge, type EdgeProps, type Node, type NodeChange, type NodeProps, type ReactFlowInstance,
} from "@xyflow/react";
import {
  AppWindow, ArrowLeftRight, ArrowRight, Cloud, Code2, Database, Expand, ExternalLink, Globe2, HardDrive,
  Image as ImageIcon, Layers3, LayoutDashboard, LockKeyhole, Maximize2, Minus, Monitor, MousePointer2, Plus, Server, ShieldCheck, Users,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import { absolutePosition, canContain, CONTAINER_HEADER, descendants, isContainer, normalizeDocument, reparentNode } from "../_lib/model";
import { safeWebUrl } from "../_lib/media";
import { nodeKinds, type MapDocument, type MapEdge, type MapLayer, type MapLocale, type MapNode, type MapSelection, type MapViewMode, type NodeKind } from "../_lib/types";
import s from "./canvas.module.css";

export type DigitalMapCanvasProps = {
  document: MapDocument;
  selection: MapSelection;
  editable: boolean;
  locale: MapLocale;
  viewMode: MapViewMode;
  layer: MapLayer;
  systemFilter: string;
  focusId?: string | null;
  imageUrls: Record<string, string>;
  onPreview: (nodeId: string) => void;
  onSelect: (selection: MapSelection) => void;
  onChange: (document: MapDocument) => void;
  onConnect: (source: string, target: string) => void;
  onAdd: (kind: NodeKind, position: { x: number; y: number }, parentId?: string) => void;
};

type AssetNode = Node<{
  row: MapNode;
  locale: MapLocale;
  editable: boolean;
  overview: boolean;
  collapsed: boolean;
  muted: boolean;
  imageUrl?: string;
  preview: () => void;
  contents: MapNode[];
  childCount: number;
  minWidth: number;
  minHeight: number;
  addChild: (id: string) => void;
  resize: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void;
}, "asset">;
type LinkEdge = Edge<{ row: MapEdge; locale: MapLocale; select: () => void; muted: boolean; emphasized: boolean; aggregated: number; lane: number }, "link">;
type TransientState = { source: MapNode[]; key: string; nodes: AssetNode[] } | null;

const palette: Record<NodeKind, string> = {
  SERVER: "#50657f", MACHINE: "#7a8ca3", BACKEND: "#279d92", DATABASE: "#9570c7",
  WEBSITE: "#5793d5", SYSTEM: "#5f79b1", GROUP: "#c69a4d", GATEWAY: "#d58271",
  CLOUD: "#7097b7", SERVICE: "#538f87", PANEL: "#8977bf",
};
const icons = { SERVER: Server, MACHINE: Monitor, CLOUD: Cloud, SERVICE: Layers3, BACKEND: Code2, DATABASE: Database, WEBSITE: Globe2, PANEL: LayoutDashboard, SYSTEM: AppWindow, GROUP: Users, GATEWAY: ShieldCheck };
const kindNames: Record<MapLocale, Record<NodeKind, string>> = {
  tr: { SERVER: "Sunucu", MACHINE: "Sanal makine", CLOUD: "Bulut sağlayıcı", SERVICE: "Uygulama grubu", BACKEND: "Backend", DATABASE: "Veritabanı", WEBSITE: "Web sitesi", PANEL: "Yönetim paneli", SYSTEM: "Sistem", GROUP: "Erişim grubu", GATEWAY: "Ağ geçidi" },
  en: { SERVER: "Server", MACHINE: "Virtual machine", CLOUD: "Cloud provider", SERVICE: "Application group", BACKEND: "Backend", DATABASE: "Database", WEBSITE: "Website", PANEL: "Admin panel", SYSTEM: "System", GROUP: "Access group", GATEWAY: "Gateway" },
};
const edgeNames = {
  tr: { ACCESS: "Erişim", API: "API bağlantısı", DATABASE: "Veri bağlantısı", NETWORK: "Ağ bağlantısı", DATA: "Veri akışı" },
  en: { ACCESS: "Access", API: "API connection", DATABASE: "Data connection", NETWORK: "Network connection", DATA: "Data flow" },
};
const statusNames = {
  tr: { ACTIVE: "Aktif", PLANNED: "Planlanan", MAINTENANCE: "Bakımda" },
  en: { ACTIVE: "Active", PLANNED: "Planned", MAINTENANCE: "Maintenance" },
};
const edgeColors = { ACCESS: "#bd914a", API: "#4e9d96", DATABASE: "#9570c7", NETWORK: "#778ba3", DATA: "#348eb4" };

function Asset({ data, selected }: NodeProps<AssetNode>) {
  const { row, locale, editable, childCount } = data;
  const Icon = icons[row.kind];
  const container = isContainer(row.kind) && !data.collapsed;
  const browser = row.kind === "WEBSITE" || row.kind === "PANEL";
  const url = safeWebUrl(row.url);
  const addLabel = locale === "tr" ? (row.kind === "CLOUD" ? "Buluta sunucu ekle" : row.kind === "SERVER" ? "Sunucuya uygulama grubu ekle" : "Gruba backend ekle") : (row.kind === "CLOUD" ? "Add a server to this cloud" : row.kind === "SERVER" ? "Add an application group to this server" : "Add a backend to this group");
  return <div className={s.asset} data-kind={row.kind} data-selected={!!selected} data-status={row.status}
    data-compact={row.height <= 150} data-overview={data.overview} data-collapsed={data.collapsed} data-muted={data.muted} data-has-image={!!data.imageUrl}>
    {container && editable && <NodeResizer
      isVisible={selected} minWidth={data.minWidth} minHeight={data.minHeight}
      color={palette[row.kind]} handleClassName={s.resizeHandle}
      onResizeEnd={(_, bounds) => data.resize(row.id, bounds)}
    />}
    <Handle className={s.handle} type="target" position={Position.Left} isConnectable={editable} />
    <Handle id="target-right" className={s.autoHandle} type="target" position={Position.Right} isConnectable={false} />
    <Handle id="target-top" className={s.autoHandle} type="target" position={Position.Top} isConnectable={false} />
    <Handle id="target-bottom" className={s.autoHandle} type="target" position={Position.Bottom} isConnectable={false} />
    <Handle id="source-left" className={s.autoHandle} type="source" position={Position.Left} isConnectable={false} />
    <Handle id="source-top" className={s.autoHandle} type="source" position={Position.Top} isConnectable={false} />
    <Handle id="source-bottom" className={s.autoHandle} type="source" position={Position.Bottom} isConnectable={false} />
    {row.kind === "SERVER" && <><div className={s.rackRailLeft} /><div className={s.rackRailRight} /></>}
    {row.kind === "CLOUD" && <div className={s.cloudCrown}><Cloud size={35} strokeWidth={1.4} /><span>{row.technology || "CLOUD"}</span></div>}
    {row.kind === "DATABASE" && <div className={s.databaseCap}><Database size={23} strokeWidth={1.5} /></div>}
    {browser && <div className={s.browserBar}><span /><span /><span /><div><LockKeyhole size={9} />{row.address || row.url || (locale === "tr" ? "URL eklenecek" : "URL not set")}</div></div>}
    {row.kind === "BACKEND" && <div className={s.terminalBar}><span /><span /><span /><code>~/services</code><Code2 size={13} /></div>}
    {row.kind === "GROUP" && <div className={s.people}><span /><span /><span /><Users size={29} strokeWidth={1.5} /></div>}
    {row.kind === "GATEWAY" && <div className={s.firewall}><ShieldCheck size={28} strokeWidth={1.6} /><span /><span /><span /></div>}
    <div className={s.assetHeader}>
      <span className={s.kind}><Icon size={container ? 16 : 13} strokeWidth={1.7} />{kindNames[locale][row.kind]}</span>
      {container ? <div className={s.containerActions}><span className={s.childCount}>{childCount}</span>{editable && <button
        type="button" className={s.addChild + " nodrag nopan"} title={addLabel} aria-label={addLabel}
        onClick={(event) => { event.stopPropagation(); data.addChild(row.id); }}><Plus size={15} /></button>}</div>
        : <div className={s.leafActions}>{url && <a className="nodrag nopan" href={url} target="_blank" rel="noopener noreferrer"
          title={locale === "tr" ? "Yeni sekmede aç" : "Open in a new tab"} aria-label={`${row.name}: ${locale === "tr" ? "Yeni sekmede aç" : "Open in a new tab"}`}
          onClick={event => event.stopPropagation()}><ExternalLink size={14} /></a>}<span className={s.statusDot} title={statusNames[locale][row.status]} aria-label={statusNames[locale][row.status]} /></div>}
    </div>
    <div className={s.assetContent}>
      {row.kind === "SYSTEM" && <span className={s.systemIcon}><AppWindow size={25} strokeWidth={1.5} /></span>}
      <strong className={s.assetName} title={row.name}>{row.name}</strong>
      <span className={s.assetTechnology} title={row.technology}>{row.technology || kindNames[locale][row.kind]}</span>
      {!container && row.address && !browser && <span className={s.assetAddress} title={row.address}>{row.address}</span>}
    </div>
    {data.collapsed && <div className={s.serviceContents}>{data.contents.slice(0, 4).map(child => {
      const ChildIcon = icons[child.kind];
      return <span key={child.id} title={child.name}><ChildIcon size={12} />{child.kind === "DATABASE" ? child.technology || kindNames[locale][child.kind] : kindNames[locale][child.kind]}</span>;
    })}{data.contents.length > 4 && <span>+{data.contents.length - 4}</span>}</div>}
    {data.imageUrl && <button type="button" className={s.nodePreview + " nodrag nopan"} style={{ backgroundImage: `url("${data.imageUrl}")` }}
      title={locale === "tr" ? "Ekran görüntüsünü büyüt" : "View screenshot"} aria-label={`${row.name}: ${locale === "tr" ? "Ekran görüntüsünü büyüt" : "View screenshot"}`}
      onClick={event => { event.stopPropagation(); data.preview(); }}><ImageIcon size={12} /></button>}
    {container && !childCount && <div className={s.emptyContainer}><HardDrive size={24} strokeWidth={1.2} /><span>{locale === "tr" ? "Öğeleri buraya sürükleyin" : "Drag assets into this space"}</span></div>}
    {container && <div className={s.containerFooter}><span className={s.statusDot} /><span title={row.address}>{row.address || (locale === "tr" ? "Adres eklenmedi" : "No address yet")}</span><span className={s.vent} /></div>}
    {!container && <div className={s.assetFooter}><span>{row.environment === "PRODUCTION" ? "PROD" : row.environment === "STAGING" ? "STAGE" : "DEV"}</span><span title={row.owner}>{row.owner || statusNames[locale][row.status]}</span></div>}
    <Handle className={s.handle} type="source" position={Position.Right} isConnectable={editable} />
  </div>;
}

function Link({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerStart, markerEnd, style, selected, data }: EdgeProps<LinkEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14, offset: 34 + (data?.lane ?? 0) * 14 });
  if (!data) return null;
  const { row, locale } = data;
  const title = row.label || edgeNames[locale][row.kind];
  const details = [...new Set([row.protocol, row.access])].filter(value => value && value !== title).join(" · ");
  return <>
    <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} interactionWidth={24} style={{ ...style, strokeWidth: selected || data.emphasized ? 2.8 : 1.8 }} />
    <EdgeLabelRenderer><button type="button" className={s.edgeLabel + " nodrag nopan"} data-selected={!!selected} data-muted={data.muted} data-emphasized={data.emphasized}
      style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + (data.lane % 3 - 1) * 15}px)` }}
      onClick={(event) => { event.stopPropagation(); data.select(); }} aria-pressed={!!selected}
      title={[row.label || edgeNames[locale][row.kind], details].filter(Boolean).join(" · ")}>
      <span>{row.bidirectional ? <ArrowLeftRight size={12} /> : <ArrowRight size={12} />}{title}{data.aggregated > 1 && <b>×{data.aggregated}</b>}</span>
      {details && <small>{details}</small>}
    </button></EdgeLabelRenderer>
  </>;
}
const nodeTypes = { asset: Asset };
const edgeTypes = { link: Link };

function depth(nodes: MapNode[], node: MapNode) {
  let count = 0;
  let parent = node.parentId;
  const seen = new Set<string>([node.id]);
  while (parent && !seen.has(parent)) {
    seen.add(parent); count += 1;
    parent = nodes.find((candidate) => candidate.id === parent)?.parentId ?? null;
  }
  return count;
}

type ProjectedEdge = { row: MapEdge; source: string; target: string; originalIds: string[] };
type Projection = { nodes: MapNode[]; edges: ProjectedEdge[]; representative: Map<string, string>; collapsed: Set<string> };

/** The overview has its own geometry; its coordinates never enter the saved document. */
function compactOverview(rows: MapNode[], collapsed: Set<string>) {
  const children = new Map<string | null, MapNode[]>();
  for (const row of rows) children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
  const placed = new Map<string, MapNode>();
  function measure(row: MapNode): MapNode {
    const contents = (children.get(row.id) ?? []).sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    if (!isContainer(row.kind) || collapsed.has(row.id) || !contents.length) {
      const width = row.kind === "SERVICE" ? 328 : 286;
      const height = row.kind === "SERVICE" ? 186 : row.kind === "DATABASE" ? 170 : 164;
      const node = { ...row, width, height, position: { x: 0, y: 0 } };
      placed.set(row.id, node);
      return node;
    }
    const measured = contents.map(measure);
    const nestedHosts = measured.every(node => ["CLOUD", "SERVER", "MACHINE"].includes(node.kind));
    const frontendGroup = row.kind === "SERVICE" && measured.every(node => ["WEBSITE", "PANEL"].includes(node.kind));
    const columns = frontendGroup || nestedHosts || measured.length > 4 ? 2 : 1;
    const horizontalGap = nestedHosts ? 64 : 28;
    const verticalGap = nestedHosts ? 64 : 34;
    const cellWidth = Math.max(...measured.map(node => node.width));
    const header = row.kind === "SERVICE" ? 90 : 114;
    let y = header;
    for (let start = 0; start < measured.length; start += columns) {
      const line = measured.slice(start, start + columns);
      line.forEach((node, index) => { node.position = { x: 28 + index * (cellWidth + horizontalGap), y }; });
      y += Math.max(...line.map(node => node.height)) + verticalGap;
    }
    const width = 56 + Math.min(columns, measured.length) * cellWidth + (Math.min(columns, measured.length) - 1) * horizontalGap;
    const node = { ...row, width, height: y - verticalGap + 38, position: { x: 0, y: 0 } };
    placed.set(row.id, node);
    return node;
  }
  const roots = (children.get(null) ?? []).sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  const rootGroups = roots.filter(node => isContainer(node.kind));
  const standalone = roots.filter(node => !isContainer(node.kind));
  const accessNodes = standalone.filter(node => ["GROUP", "GATEWAY"].includes(node.kind));
  const otherNodes = standalone.filter(node => !["GROUP", "GATEWAY"].includes(node.kind));
  const measuredGroups = rootGroups.map(measure);
  const startX = accessNodes.length || otherNodes.length ? 390 : 36;
  let x = startX, y = 40, tallest = 0, vendorY = 40;
  measuredGroups.forEach((node, index) => {
    if (index > 0 && (x + node.width > 4000 || index === 2)) { x = startX; y += tallest + 130; tallest = 0; vendorY = y; }
    node.position = { x, y }; x += node.width + 160; tallest = Math.max(tallest, node.height);
  });
  accessNodes.map(measure).forEach((node, index) => { node.position = { x: 36, y: 70 + index * 245 }; });
  otherNodes.map(measure).forEach((node, index) => { node.position = { x: 36, y: Math.max(vendorY, accessNodes.length * 245 + 100) + index * 230 }; });
  return rows.map(row => placed.get(row.id) ?? row).sort((a, b) => depth(rows, a) - depth(rows, b));
}

function projectDocument(document: MapDocument, mode: MapViewMode, layer: MapLayer, systemFilter: string): Projection {
  const byId = new Map(document.nodes.map(node => [node.id, node]));
  const collapsed = new Set<string>();
  if (mode === "systems") for (const row of document.nodes) {
    if (row.kind !== "SERVICE") continue;
    const contents = document.nodes.filter(node => node.parentId === row.id);
    // Frontend-only groups retain their public site and management panel cards.
    if (!contents.length || !contents.every(node => ["WEBSITE", "PANEL"].includes(node.kind))) collapsed.add(row.id);
  }
  const representative = new Map<string, string>();
  for (const row of document.nodes) {
    let representativeId = row.id, parent = row.parentId;
    const seen = new Set<string>();
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      if (collapsed.has(parent)) representativeId = parent;
      parent = byId.get(parent)?.parentId ?? null;
    }
    representative.set(row.id, representativeId);
  }
  const base = document.nodes.filter(node => representative.get(node.id) === node.id);
  const scoped = new Set<string>();
  const hasFilter = !!systemFilter && systemFilter !== "ALL";
  if (hasFilter) for (const row of document.nodes) if (row.systemKey === systemFilter) {
    for (const id of descendants(document.nodes, row.id)) scoped.add(representative.get(id) ?? id);
  }
  const seenEdges = new Map<string, ProjectedEdge>();
  for (const row of document.edges) {
    if (layer === "ACCESS" && row.kind !== "ACCESS") continue;
    if (layer === "DATA" && row.kind !== "DATA") continue;
    const source = representative.get(row.source), target = representative.get(row.target);
    if (!source || !target || source === target || (hasFilter && !scoped.has(source) && !scoped.has(target))) continue;
    const key = JSON.stringify([source, target, row.kind, row.label, row.protocol, row.access, !!row.bidirectional]);
    const existing = seenEdges.get(key);
    if (existing) existing.originalIds.push(row.id);
    else seenEdges.set(key, { row, source, target, originalIds: [row.id] });
  }
  const edges = [...seenEdges.values()];
  const visible = new Set<string>(layer === "ALL" && !hasFilter ? base.map(node => node.id) : hasFilter ? scoped : []);
  edges.forEach(edge => { visible.add(edge.source); visible.add(edge.target); });
  for (const id of [...visible]) {
    let parent = byId.get(id)?.parentId;
    while (parent) { visible.add(parent); parent = byId.get(parent)?.parentId; }
  }
  let nodes = base.filter(node => visible.has(node.id));
  if (mode === "systems") {
    for (const row of nodes) if (row.kind === "SERVICE" && !nodes.some(node => node.parentId === row.id)) collapsed.add(row.id);
    nodes = compactOverview(nodes, collapsed);
  }
  return { nodes, edges, representative, collapsed };
}

/** Use the innermost compatible container, excluding the dragged node and its descendants. */
function containerAt(document: MapDocument, kind: NodeKind, point: { x: number; y: number }, excludedId?: string) {
  return document.nodes.filter((candidate) => {
    if (candidate.id === excludedId || !canContain(candidate.kind, kind)) return false;
    let parent = candidate.parentId;
    const seen = new Set<string>();
    while (parent && !seen.has(parent)) {
      if (parent === excludedId) return false;
      seen.add(parent);
      parent = document.nodes.find((node) => node.id === parent)?.parentId ?? null;
    }
    const pos = absolutePosition(document.nodes, candidate.id);
    return point.x >= pos.x + 12 && point.x <= pos.x + candidate.width - 12 && point.y >= pos.y + CONTAINER_HEADER && point.y <= pos.y + candidate.height - 22;
  }).sort((a, b) => depth(document.nodes, b) - depth(document.nodes, a) || a.width * a.height - b.width * b.height)[0];
}

export default function DigitalMapCanvas({ document: mapDocument, selection, editable, locale, viewMode, layer, systemFilter, focusId, imageUrls, onPreview, onSelect, onChange, onConnect, onAdd }: DigitalMapCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<AssetNode, LinkEdge> | null>(null);
  const [transient, setTransient] = useState<TransientState>(null);
  const [dropActive, setDropActive] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const tr = locale === "tr";
  const geometryEditable = editable && viewMode === "technical";
  const geometryKey = [viewMode, layer, systemFilter].join("|");
  const projection = useMemo(() => projectDocument(mapDocument, viewMode, layer, systemFilter), [mapDocument, viewMode, layer, systemFilter]);
  const selectedId = selection?.type === "node" ? projection.representative.get(selection.id) : undefined;
  const emphasis = useMemo(() => {
    const branch = selectedId ? descendants(projection.nodes, selectedId) : new Set<string>();
    const neighbors = new Set(branch);
    const edgeIds = new Set<string>();
    for (const edge of projection.edges) {
      if (branch.has(edge.source) || branch.has(edge.target) || (selection?.type === "edge" && edge.originalIds.includes(selection.id))) {
        edgeIds.add(edge.row.id); neighbors.add(edge.source); neighbors.add(edge.target);
      }
    }
    for (const id of [...neighbors]) {
      let parent = projection.nodes.find(node => node.id === id)?.parentId;
      while (parent) { neighbors.add(parent); parent = projection.nodes.find(node => node.id === parent)?.parentId; }
    }
    const active = selection?.type === "node" ? projection.nodes.some(node => node.id === selectedId)
      : selection?.type === "edge" ? projection.edges.some(edge => edge.originalIds.includes(selection.id)) : false;
    return { neighbors, edgeIds, active };
  }, [projection, selectedId, selection]);
  const latestView = useRef(projection);
  useEffect(() => { latestView.current = projection; }, [projection]);

  useEffect(() => {
    if (!flow) return;
    const timer = setTimeout(() => {
      const current = latestView.current;
      const focused = focusId ? current.representative.get(focusId) : undefined;
      const ids = focused ? descendants(current.nodes, focused) : undefined;
      const targets = ids ? current.nodes.filter(node => ids.has(node.id)).map(node => ({ id: node.id })) : undefined;
      void flow.fitView({ nodes: targets, padding: focused ? 0.3 : 0.12, minZoom: 0.08, maxZoom: focused ? 1.05 : 0.9, duration: 280 });
    }, 100);
    return () => clearTimeout(timer);
  }, [flow, geometryKey, focusId]);

  // Opening the inspector changes the available viewport. Metadata edits do not.
  useEffect(() => {
    const element = ref.current;
    if (!flow || !element) return;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect;
      if (Math.abs(next.width - width) < 2 && Math.abs(next.height - height) < 2) return;
      width = next.width; height = next.height;
      clearTimeout(timer);
      timer = setTimeout(() => { void flow.fitView({ padding: 0.12, minZoom: 0.08, maxZoom: 1, duration: 220 }); }, 80);
    });
    observer.observe(element);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [flow]);

  const resize = useCallback((id: string, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!geometryEditable) return;
    const live = new Map(flow?.getNodes().map((node) => [node.id, node]));
    onChange(normalizeDocument({ ...mapDocument, nodes: mapDocument.nodes.map((node) => {
      const current = live.get(node.id);
      if (node.id === id) return { ...node, position: { x: bounds.x, y: bounds.y }, width: bounds.width, height: bounds.height };
      return current ? { ...node, position: current.position } : node;
    }) }));
  }, [geometryEditable, flow, mapDocument, onChange]);

  const addChild = useCallback((id: string) => {
    if (!geometryEditable) return;
    const parent = mapDocument.nodes.find((node) => node.id === id);
    if (!parent) return;
    const position = absolutePosition(mapDocument.nodes, id);
    const children = mapDocument.nodes.filter((node) => node.parentId === id);
    const nextY = children.reduce((bottom, node) => Math.max(bottom, node.position.y + node.height + 24), CONTAINER_HEADER + 16);
    onAdd(parent.kind === "CLOUD" ? "SERVER" : parent.kind === "SERVER" ? "SERVICE" : "BACKEND", { x: position.x + 28, y: position.y + nextY }, id);
  }, [geometryEditable, mapDocument, onAdd]);

  const baseNodes = useMemo<AssetNode[]>(() => [...projection.nodes]
    .sort((a, b) => depth(projection.nodes, a) - depth(projection.nodes, b))
    .map((row) => {
      const children = projection.nodes.filter((node) => node.parentId === row.id);
      const contents = mapDocument.nodes.filter(node => node.parentId === row.id);
      return {
        id: row.id, type: "asset", parentId: row.parentId ?? undefined, position: row.position,
        width: row.width, height: row.height, style: { width: row.width, height: row.height },
        selected: selectedId === row.id,
        draggable: geometryEditable, connectable: geometryEditable, deletable: false,
        zIndex: isContainer(row.kind) && !projection.collapsed.has(row.id) ? depth(projection.nodes, row) : 20,
        ariaLabel: `${kindNames[locale][row.kind]}: ${row.name}`,
        data: { row, locale, editable: geometryEditable, overview: viewMode === "systems", collapsed: projection.collapsed.has(row.id),
          muted: emphasis.active && !emphasis.neighbors.has(row.id), imageUrl: row.imageId ? imageUrls[row.imageId] : undefined,
          preview: () => onPreview(row.id), contents, childCount: contents.length,
          minWidth: children.reduce((size, node) => Math.max(size, node.position.x + node.width + 28), row.kind === "SERVER" ? 380 : 290),
          minHeight: children.reduce((size, node) => Math.max(size, node.position.y + node.height + 42), row.kind === "SERVER" ? 300 : 260),
          addChild, resize },
      };
    }), [projection, mapDocument.nodes, selectedId, geometryEditable, locale, addChild, resize, viewMode, emphasis, imageUrls, onPreview]);

  const nodes = useMemo(() => {
    if (transient?.source !== mapDocument.nodes || transient.key !== geometryKey) return baseNodes;
    const moving = new Map(transient.nodes.map((node) => [node.id, node]));
    return baseNodes.map((node) => {
      const current = moving.get(node.id);
      return current ? { ...node, position: current.position, width: current.width, height: current.height,
        style: { ...node.style, width: current.width, height: current.height }, measured: current.measured, dragging: current.dragging } : node;
    });
  }, [baseNodes, mapDocument.nodes, transient, geometryKey]);

  const edges = useMemo<LinkEdge[]>(() => projection.edges.map((edge, index) => {
    const selected = selection?.type === "edge" && edge.originalIds.includes(selection.id);
    const row = selected ? mapDocument.edges.find(item => item.id === selection.id) ?? edge.row : edge.row;
    const emphasized = emphasis.edgeIds.has(edge.row.id), muted = emphasis.active && !emphasized;
    const marker = { type: MarkerType.ArrowClosed, color: edgeColors[row.kind], width: 19, height: 19 };
    const sourceNode = projection.nodes.find(node => node.id === edge.source)!;
    const targetNode = projection.nodes.find(node => node.id === edge.target)!;
    const sourcePosition = absolutePosition(projection.nodes, edge.source), targetPosition = absolutePosition(projection.nodes, edge.target);
    const dx = targetPosition.x + targetNode.width / 2 - sourcePosition.x - sourceNode.width / 2;
    const dy = targetPosition.y + targetNode.height / 2 - sourcePosition.y - sourceNode.height / 2;
    const vertical = Math.abs(dy) > Math.abs(dx) * 1.4;
    const sourceHandle = vertical ? dy > 0 ? "source-bottom" : "source-top" : dx < 0 ? "source-left" : undefined;
    const targetHandle = vertical ? dy > 0 ? "target-top" : "target-bottom" : dx < 0 ? "target-right" : undefined;
    return {
      id: edge.row.id, source: edge.source, target: edge.target, type: "link", zIndex: selected || emphasized ? 10 : 8,
      selected, sourceHandle, targetHandle,
      data: { row, locale, muted, emphasized, aggregated: edge.originalIds.length, lane: index % 4, select: () => onSelect({ type: "edge", id: row.id }) },
      style: { stroke: edgeColors[row.kind], strokeDasharray: row.kind === "ACCESS" ? "6 4" : undefined, opacity: muted ? 0.13 : 1 },
      markerStart: row.bidirectional ? marker : undefined, markerEnd: marker,
      deletable: false, ariaLabel: [row.label || edgeNames[locale][row.kind], row.protocol, row.access].filter(Boolean).join(" · "),
    };
  }), [projection.edges, projection.nodes, mapDocument.edges, locale, selection, onSelect, emphasis]);

  function changeNodes(changes: NodeChange<AssetNode>[]) {
    const geometry = changes.filter((change) => change.type === "position" || change.type === "dimensions");
    if (!geometry.length) return;
    setTransient((current) => ({ source: mapDocument.nodes, key: geometryKey, nodes: applyNodeChanges(geometry, current?.source === mapDocument.nodes && current.key === geometryKey ? current.nodes : baseNodes) }));
  }

  function stopDrag(node: AssetNode) {
    if (!geometryEditable) return;
    let next: MapDocument = { ...mapDocument, nodes: mapDocument.nodes.map((row) => row.id === node.id ? { ...row, position: node.position } : row) };
    const row = next.nodes.find((candidate) => candidate.id === node.id);
    if (!row) return;
    const position = absolutePosition(next.nodes, row.id);
    const parent = containerAt(next, row.kind, { x: position.x + row.width / 2, y: position.y + Math.min(row.height / 2, 112) }, row.id);
    if ((parent?.id ?? null) !== row.parentId) next = reparentNode(next, row.id, parent?.id ?? null);
    onChange(normalizeDocument(next));
  }

  function fit() { void flow?.fitView({ padding: 0.12, minZoom: 0.08, maxZoom: 1, duration: 250 }); }
  async function fullscreen() {
    try {
      if (window.document.fullscreenElement) await window.document.exitFullscreen();
      else await ref.current?.requestFullscreen();
      setFullscreenError(false);
      setTimeout(fit, 120);
    } catch { setFullscreenError(true); }
  }

  return <div ref={ref} className={s.canvas} data-testid="digital-map-canvas" data-drop-active={dropActive}
    data-view-mode={viewMode} data-layer={layer} data-visible-nodes={projection.nodes.length} data-visible-edges={projection.edges.length}
    onDragOver={(event) => {
      if (!geometryEditable || !event.dataTransfer.types.includes("application/dnd-digital-map")) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDropActive(true);
    }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) setDropActive(false); }}
    onDrop={(event) => {
      event.preventDefault(); setDropActive(false);
      if (!geometryEditable || !flow) return;
      const kind = event.dataTransfer.getData("application/dnd-digital-map");
      if (!nodeKinds.includes(kind as NodeKind)) return;
      const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const parent = containerAt(mapDocument, kind as NodeKind, position);
      onAdd(kind as NodeKind, position, parent?.id);
    }}>
    <div className={s.canvasBadge}><span className={s.liveDot} />{viewMode === "systems" ? tr ? "SİSTEM ÖZETİ" : "SYSTEM OVERVIEW" : tr ? "TEKNİK HARİTA" : "TECHNICAL MAP"}<span>{projection.nodes.length}/{mapDocument.nodes.length} {tr ? "öğe görünür" : "assets shown"}</span></div>
    <div className={s.toolbar}>
      <button type="button" title={tr ? "Yakınlaştır" : "Zoom in"} aria-label={tr ? "Yakınlaştır" : "Zoom in"} onClick={() => void flow?.zoomIn({ duration: 180 })}><Plus size={17} /></button>
      <button type="button" title={tr ? "Uzaklaştır" : "Zoom out"} aria-label={tr ? "Uzaklaştır" : "Zoom out"} onClick={() => void flow?.zoomOut({ duration: 180 })}><Minus size={17} /></button>
      <span />
      <button type="button" title={tr ? "Haritayı ekrana sığdır" : "Fit map to screen"} aria-label={tr ? "Haritayı ekrana sığdır" : "Fit map to screen"} onClick={fit}><Expand size={17} /></button>
      <button type="button" title={tr ? "Tam ekran" : "Full screen"} aria-label={tr ? "Tam ekran" : "Full screen"} onClick={() => void fullscreen()}><Maximize2 size={16} /></button>
    </div>
    <ReactFlow<AssetNode, LinkEdge>
      nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onInit={setFlow}
      onNodesChange={changeNodes} onNodeDragStop={(_, node) => stopDrag(node)}
      onNodeClick={(_, node) => onSelect({ type: "node", id: node.id })}
      onEdgeClick={(_, edge) => edge.data?.select()}
      onPaneClick={() => onSelect(null)}
      onConnect={(connection) => { if (geometryEditable && connection.source && connection.target && connection.source !== connection.target) onConnect(connection.source, connection.target); }}
      isValidConnection={(connection) => connection.source !== connection.target}
      nodesDraggable={geometryEditable} nodesConnectable={geometryEditable} edgesReconnectable={false}
      deleteKeyCode={null} multiSelectionKeyCode={null} selectionKeyCode={null}
      elevateNodesOnSelect={false} elevateEdgesOnSelect={false}
      minZoom={0.08} maxZoom={1.8} fitView fitViewOptions={{ padding: 0.12, maxZoom: 0.9 }}
      connectionLineStyle={{ stroke: "#4e9d96", strokeWidth: 2 }}
      defaultEdgeOptions={{ focusable: true }}
      preventScrolling>
      <Background gap={24} size={1} color="var(--map-dot)" />
      <MiniMap<AssetNode> className={s.minimap} nodeColor={(node) => palette[node.data.row.kind]} nodeStrokeWidth={2}
        maskColor="var(--map-minimap-mask)" pannable zoomable ariaLabel={tr ? "Harita genel görünümü" : "Map overview"} />
    </ReactFlow>
    <div className={s.canvasHint}><MousePointer2 size={13} /><span>{geometryEditable
      ? tr ? "Öğeleri taşıyın · Noktaları sürükleyerek bağlayın" : "Move assets · Drag between ports to connect"
      : viewMode === "systems" ? tr ? "Bir sistemi seçerek bağlantılarını izleyin · Yerleşimi teknik görünümde düzenleyin" : "Select a system to follow its connections · Edit the layout in technical view"
      : tr ? "İncelemek için bir öğeye veya bağlantıya tıklayın" : "Select an asset or connection to inspect"}</span></div>
    {dropActive && <div className={s.dropHint}><Plus size={18} />{tr ? "Haritaya veya bir sunucunun içine bırakın" : "Drop onto the map or into a server"}</div>}
    {fullscreenError && <div className={s.feedback} role="status">{tr ? "Tarayıcı tam ekran modunu açamadı." : "Your browser could not enter full screen."}</div>}
    {!projection.nodes.length && <div className={s.empty}><Server size={36} strokeWidth={1.2} /><strong>{mapDocument.nodes.length ? tr ? "Bu görünümde gösterilecek bağlantı yok" : "No connections to show in this view" : tr ? "Dijital altyapınızı görünür kılın" : "Bring your infrastructure into view"}</strong><p>{mapDocument.nodes.length ? tr ? "Başka bir katman veya sistem seçin." : "Choose another layer or system." : tr ? "Başlamak için paletten bir öğe ekleyin." : "Add an asset from the palette to begin."}</p></div>}
  </div>;
}
