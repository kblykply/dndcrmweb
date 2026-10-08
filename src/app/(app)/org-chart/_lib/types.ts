export type Kind = "COMPANY" | "DEPARTMENT" | "POSITION" | "TEAM";
export type DefinitionStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type Responsibility = "RESPONSIBLE" | "ACCOUNTABLE" | "CONSULTED" | "INFORMED";
export type Person = { id: string; name: string; isActive: boolean };
export type QualityCard = { id: string; code: string; title: string; status: string };
export type ProcessLink = { cardId: string; responsibility: Responsibility; card: QualityCard };
export type OrgNode = {
  id: string; name: string; code: string | null; kind: Kind; parentId: string | null; order: number;
  purpose: string | null; responsibilities: string | null; authority: string | null;
  competencies: string | null; performanceIndicators: string | null;
  reviewDueAt: string | null; status: DefinitionStatus; revision: number; version: number;
  assigneeId: string | null; assignee: Person | null; approvedBy: Person | null; approvedAt: string | null;
  acknowledgedAt: string | null; acknowledgedRevision: number | null;
  processes: ProcessLink[]; createdAt: string; updatedAt: string;
};
export type Workspace = { nodes: OrgNode[]; users: Person[]; qualityCards: QualityCard[] };
export type OrgLog = {
  id: string; actorName: string; action: string; note: string | null;
  beforeJson: OrgNode | null; afterJson: OrgNode; createdAt: string;
};
export type OrgDetail = OrgNode & { logs: OrgLog[]; logCount: number };
export type Definition = {
  name: string; code: string; kind: Kind; parentId: string; order: number;
  purpose: string; responsibilities: string; authority: string; competencies: string;
  performanceIndicators: string; reviewDueAt: string;
  processes: { cardId: string; responsibility: Responsibility }[];
  note: string;
};
export const emptyWorkspace: Workspace = { nodes: [], users: [], qualityCards: [] };
export function definitionFor(node?: OrgNode): Definition {
  return {
    name: node?.name ?? "", code: node?.code ?? "", kind: node?.kind ?? "POSITION",
    parentId: node?.parentId ?? "", order: node?.order ?? 0,
    purpose: node?.purpose ?? "", responsibilities: node?.responsibilities ?? "",
    authority: node?.authority ?? "", competencies: node?.competencies ?? "",
    performanceIndicators: node?.performanceIndicators ?? "", reviewDueAt: node?.reviewDueAt?.slice(0, 10) ?? "",
    processes: node?.processes.map(({ cardId, responsibility }) => ({ cardId, responsibility })) ?? [], note: "",
  };
}
