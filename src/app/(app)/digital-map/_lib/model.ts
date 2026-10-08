import { kindLabel } from "./copy";
import type { EdgeKind, MapDocument, MapEdge, MapLocale, MapNode, NodeKind } from "./types";

export const CONTAINER_PADDING = 24;
export const CONTAINER_HEADER = 112;

const dimensions: Record<NodeKind, { width: number; height: number }> = {
  SERVER: { width: 620, height: 390 },
  MACHINE: { width: 550, height: 310 },
  CLOUD: { width: 900, height: 550 },
  SERVICE: { width: 700, height: 380 },
  BACKEND: { width: 225, height: 132 },
  DATABASE: { width: 220, height: 145 },
  WEBSITE: { width: 250, height: 155 },
  PANEL: { width: 260, height: 165 },
  SYSTEM: { width: 235, height: 145 },
  GROUP: { width: 225, height: 130 },
  GATEWAY: { width: 220, height: 130 },
};

export function createNode(kind: NodeKind, position = { x: 80, y: 80 }, locale: MapLocale = "tr"): MapNode {
  return {
    id: globalThis.crypto.randomUUID(), kind, name: kindLabel(kind, locale), parentId: null,
    position: { ...position }, ...dimensions[kind], address: "", technology: "", owner: "", notes: "",
    environment: "PRODUCTION", status: "PLANNED",
  };
}

export function createEdge(source: string, target: string, kind: EdgeKind = "ACCESS"): MapEdge {
  return { id: globalThis.crypto.randomUUID(), source, target, kind, label: "", protocol: "", access: "", notes: "" };
}

export function isContainer(kind: NodeKind): boolean {
  return ["SERVER", "MACHINE", "CLOUD", "SERVICE"].includes(kind);
}

export function canContain(parentKind: NodeKind, childKind: NodeKind): boolean {
  const allowed: Partial<Record<NodeKind, NodeKind[]>> = {
    SERVER: ["MACHINE", "SERVICE", "BACKEND", "DATABASE", "WEBSITE", "PANEL", "SYSTEM"],
    MACHINE: ["SERVICE", "BACKEND", "DATABASE", "WEBSITE", "PANEL", "SYSTEM"],
    CLOUD: ["SERVER", "MACHINE", "SERVICE", "BACKEND", "DATABASE", "WEBSITE", "PANEL", "SYSTEM", "GATEWAY"],
    SERVICE: ["BACKEND", "DATABASE", "WEBSITE", "PANEL", "SYSTEM"],
  };
  return allowed[parentKind]?.includes(childKind) ?? false;
}

/** Includes the node itself, so callers can remove or highlight a whole branch. */
export function descendants(nodes: MapNode[], id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  }
  const result = new Set<string>();
  const pending = [id];
  while (pending.length) {
    const current = pending.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    pending.push(...(children.get(current) ?? []));
  }
  return result;
}

export function removeNode(document: MapDocument, id: string): MapDocument {
  const removed = descendants(document.nodes, id);
  return {
    ...document,
    nodes: document.nodes.filter((node) => !removed.has(node.id)),
    edges: document.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
  };
}

export function absolutePosition(nodes: MapNode[], id: string): { x: number; y: number } {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const position = { x: 0, y: 0 };
  let node = byId.get(id);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    position.x += node.position.x;
    position.y += node.position.y;
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return position;
}

/** Parents precede children; growing a container never moves its contents on the canvas. */
export function normalizeDocument(document: MapDocument): MapDocument {
  const nodes = document.nodes.map((node) => ({ ...node, position: { ...node.position } }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (!node.parentId) continue;
    const parent = byId.get(node.parentId);
    if (!parent || parent.id === node.id || !canContain(parent.kind, node.kind)) node.parentId = null;
  }
  // Defensive cycle handling also keeps this helper safe for locally imported data.
  for (const node of nodes) {
    const seen = new Set([node.id]);
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    while (parent) {
      if (seen.has(parent.id)) { node.parentId = null; break; }
      seen.add(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
  }
  const children = new Map<string, MapNode[]>();
  for (const node of nodes) {
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  }
  const ordered: MapNode[] = [];
  function visit(node: MapNode) {
    ordered.push(node);
    const contents = children.get(node.id) ?? [];
    for (const child of contents) visit(child);
    if (!isContainer(node.kind) || !contents.length) return;
    const left = Math.min(0, ...contents.map((child) => child.position.x - CONTAINER_PADDING));
    const top = Math.min(0, ...contents.map((child) => child.position.y - CONTAINER_HEADER));
    node.position.x += left;
    node.position.y += top;
    node.width -= left;
    node.height -= top;
    for (const child of contents) {
      child.position.x -= left;
      child.position.y -= top;
    }
    node.width = Math.max(node.width, ...contents.map((child) => child.position.x + child.width + CONTAINER_PADDING));
    node.height = Math.max(node.height, ...contents.map((child) => child.position.y + child.height + CONTAINER_PADDING));
  }
  for (const node of nodes) if (!node.parentId) visit(node);
  return { ...document, nodes: ordered };
}

export function reparentNode(document: MapDocument, id: string, parentId: string | null): MapDocument {
  const node = document.nodes.find((item) => item.id === id);
  if (!node || node.parentId === parentId) return document;
  const parent = parentId ? document.nodes.find((item) => item.id === parentId) : undefined;
  if (parentId && (!parent || !canContain(parent.kind, node.kind) || descendants(document.nodes, id).has(parentId))) return document;
  const position = absolutePosition(document.nodes, id);
  const parentPosition = parent ? absolutePosition(document.nodes, parent.id) : { x: 0, y: 0 };
  return normalizeDocument({
    ...document,
    nodes: document.nodes.map((item) => item.id === id
      ? { ...item, parentId, position: { x: position.x - parentPosition.x, y: position.y - parentPosition.y } }
      : item),
  });
}

export type AccessRoute = { group: MapNode; target: MapNode; path: MapNode[]; edges: MapEdge[] };

/** Permission paths stop at assets; API/database links never imply a group's permission. */
export function accessRoutes(document: MapDocument): AccessRoute[] {
  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, MapEdge[]>();
  for (const edge of document.edges) {
    if (edge.kind === "ACCESS") outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }
  const routes: AccessRoute[] = [];
  for (const group of document.nodes.filter((node) => node.kind === "GROUP")) {
    const pending: { path: MapNode[]; edges: MapEdge[] }[] = [{ path: [group], edges: [] }];
    let traversed = 0;
    // Keep heavily interconnected imported gateway networks from blocking the UI.
    while (pending.length && traversed++ < 1000 && routes.length < 1000) {
      const route = pending.shift()!;
      const current = route.path[route.path.length - 1];
      for (const edge of outgoing.get(current.id) ?? []) {
        if (routes.length >= 1000) break;
        const target = byId.get(edge.target);
        if (!target || target.kind === "GROUP" || route.path.some((node) => node.id === target.id)) continue;
        const next = { path: [...route.path, target], edges: [...route.edges, edge] };
        if (target.kind === "GATEWAY") {
          if (pending.length < 1000) pending.push(next);
        } else routes.push({ group, target, ...next });
      }
    }
  }
  return routes;
}

/** A fictional starter map: names and addresses do not describe DND's infrastructure. */
export function createTemplate(locale: MapLocale): MapDocument {
  const tr = locale === "tr";
  const sample = tr ? "örnek" : "sample";
  const owner = tr ? "Örnek IT ekibi" : "Sample IT team";
  const note = tr ? "Örnek şablon öğesidir. Gerçek altyapınızı temsil etmez; bilgileri düzenleyin." : "Fictional template item. Edit these details to describe your actual infrastructure.";
  const nodes: MapNode[] = [];
  function node(kind: NodeKind, name: string, x: number, y: number, extra: Partial<MapNode> = {}) {
    const item = { ...createNode(kind, { x, y }, locale), name: `${name} · ${sample}`, owner, notes: note, ...extra };
    nodes.push(item);
    return item;
  }
  const sales = node("GROUP", tr ? "Satış ekibi" : "Sales team", 20, 30, { technology: tr ? "CRM kullanıcıları" : "CRM users" });
  const it = node("GROUP", tr ? "IT ekibi" : "IT team", 270, 30, { technology: tr ? "Altyapı yönetimi" : "Infrastructure operations" });
  const finance = node("GROUP", tr ? "Finans ekibi" : "Finance team", 520, 30, { technology: tr ? "Muhasebe kullanıcıları" : "Accounting users" });
  const gateway = node("GATEWAY", tr ? "Güvenli erişim" : "Secure access", 270, 245, { address: "access.example.com", technology: "HTTPS / VPN / MFA" });
  const website = node("WEBSITE", tr ? "Kurumsal web" : "Corporate website", 20, 475, { address: "www.example.com", technology: "Web / HTTPS" });
  const portal = node("WEBSITE", tr ? "Müşteri portalı" : "Customer portal", 405, 475, { address: "portal.example.com", technology: "Web / HTTPS" });
  const server = node("SERVER", tr ? "Uygulama sunucusu" : "Application server", 800, 20, { width: 680, height: 565, address: "host-01.example.com", technology: tr ? "Sanallaştırma sunucusu" : "Virtualization host" });
  const machine = node("MACHINE", "APP-VM-01", 30, 120, { parentId: server.id, width: 620, height: 410, address: "app-vm.example.com", technology: "Linux VM" });
  const backend = node("BACKEND", "CRM API", 30, 130, { parentId: machine.id, address: "api.example.com", technology: "Node.js / REST API" });
  const database = node("DATABASE", "CRM DB", 305, 130, { parentId: machine.id, address: "db.example.com", technology: "PostgreSQL" });
  const accounting = node("SERVER", tr ? "Muhasebe sunucusu" : "Accounting server", 800, 640, { width: 680, height: 320, address: "host-02.example.com", technology: "Windows Server" });
  const system = node("SYSTEM", tr ? "Muhasebe uygulaması" : "Accounting application", 30, 125, { parentId: accounting.id, address: "accounting.example.com", technology: "ERP" });
  const accountingDb = node("DATABASE", tr ? "Muhasebe DB" : "Accounting DB", 365, 125, { parentId: accounting.id, address: "accounting-db.example.com", technology: "SQL Server" });
  const edges: MapEdge[] = [];
  function edge(source: MapNode, target: MapNode, kind: EdgeKind, protocol: string, access: string) {
    edges.push({ ...createEdge(source.id, target.id, kind), protocol, access, label: protocol, notes: note });
  }
  edge(sales, portal, "ACCESS", "HTTPS + MFA", tr ? "CRM kullanıcısı" : "CRM user");
  edge(sales, website, "ACCESS", "HTTPS", tr ? "Web erişimi" : "Web access");
  edge(it, gateway, "ACCESS", "VPN + MFA", tr ? "Yönetici" : "Administrator");
  edge(finance, system, "ACCESS", "VPN / HTTPS + MFA", tr ? "Finans kullanıcısı" : "Finance user");
  edge(website, backend, "API", "HTTPS / REST", tr ? "Uygulama erişimi" : "Application access");
  edge(portal, backend, "API", "HTTPS / REST", tr ? "Uygulama erişimi" : "Application access");
  edge(backend, database, "DATABASE", "TCP / 5432", tr ? "Servis hesabı" : "Service account");
  edge(gateway, system, "ACCESS", "VPN / RDP", tr ? "Yalnızca IT grubu" : "IT group only");
  edge(system, accountingDb, "DATABASE", "TCP / 1433", tr ? "Servis hesabı" : "Service account");
  edge(gateway, server, "ACCESS", "VPN / SSH", tr ? "Yalnızca IT grubu" : "IT group only");
  return normalizeDocument({ name: tr ? "DND Dijital Harita · örnek şablon" : "DND Digital Map · sample template", nodes, edges });
}
