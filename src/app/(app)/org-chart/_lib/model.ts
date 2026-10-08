import type { OrgNode } from "./types";

export function isOverdue(node: OrgNode, today = new Date().toISOString().slice(0, 10)) {
  return node.status !== "ARCHIVED" && !!node.reviewDueAt && node.reviewDueAt.slice(0, 10) < today;
}

export function definitionChecks(node: OrgNode) {
  const fields = ["code", "purpose", "responsibilities", "authority", "reviewDueAt"] as const;
  return [...fields, ...(node.kind === "POSITION" ? ["competencies" as const] : [])]
    .map((key) => ({ key, complete: Boolean(node[key]?.trim()) }));
}

export function descendants(nodes: OrgNode[], root: string): Set<string> {
  const result = new Set([root]);
  const queue = [root];
  const children = new Map<string, string[]>();
  for (const node of nodes) if (node.parentId) {
    children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  }
  for (let i = 0; i < queue.length; i++) {
    for (const id of children.get(queue[i]) ?? []) if (!result.has(id)) {
      result.add(id); queue.push(id);
    }
  }
  return result;
}

export function chartRows(nodes: OrgNode[], matches: Set<string>, collapsed: Set<string>, filtered: boolean) {
  const map = new Map(nodes.map((node) => [node.id, node]));
  const visible = new Set(matches);
  for (const id of matches) {
    let parent = map.get(id)?.parentId;
    const visited = new Set<string>([id]);
    while (parent && !visited.has(parent)) {
      visited.add(parent); visible.add(parent); parent = map.get(parent)?.parentId;
    }
  }
  const hidden = new Set<string>();
  if (!filtered) for (const id of collapsed) {
    for (const descendant of descendants(nodes, id)) if (descendant !== id) hidden.add(descendant);
  }
  return nodes.filter((node) => visible.has(node.id) && !hidden.has(node.id));
}
