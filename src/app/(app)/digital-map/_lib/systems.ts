import type { MapDocument } from "./types";

/** System names come from the authorized document, never a bundled inventory. */
export function getSystems(document: MapDocument): { key: string; name: string }[] {
  const systems = new Map<string, string>();
  for (const node of document.nodes) {
    if (!node.systemKey || systems.has(node.systemKey)) continue;
    const application = document.nodes.find(candidate => candidate.systemKey === node.systemKey && candidate.kind === "SERVICE");
    systems.set(node.systemKey, application?.name || node.name);
  }
  return [...systems].map(([key, name]) => ({ key, name }));
}
