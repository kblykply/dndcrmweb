export type Locale = "tr" | "en";
export const recordKinds = ["PROJECT", "PROCESS"] as const;
export const projectStatuses = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;
export const priorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export const healthValues = [
  "NOT_SET",
  "ON_TRACK",
  "AT_RISK",
  "BLOCKED",
] as const;
export const workstreamStatuses = [
  "PLANNED",
  "ACTIVE",
  "WAITING",
  "PAUSED",
  "DONE",
] as const;
export const factorImpacts = ["INFO", "RISK", "BLOCKING"] as const;
export const linkKinds = [
  "WEBSITE",
  "PANEL",
  "REPOSITORY",
  "DOCUMENT",
  "OTHER",
] as const;
export type RecordKind = (typeof recordKinds)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type Priority = (typeof priorities)[number];
export type Health = (typeof healthValues)[number];
export type WorkstreamStatus = (typeof workstreamStatuses)[number];
export type FactorImpact = (typeof factorImpacts)[number];
export type LinkKind = (typeof linkKinds)[number];

export type Person = { id: string; name: string; role: string };
export type TeamMember = {
  id: string;
  userId: string | null;
  name: string;
  title: string;
  contact: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type MemberInput = Pick<
  TeamMember,
  "userId" | "name" | "title" | "contact" | "isActive"
>;
export type ProjectLink = {
  id: string;
  label: string;
  url: string;
  kind: LinkKind;
};
export type Workstream = {
  id: string;
  title: string;
  description: string;
  ownerId: string | null;
  status: WorkstreamStatus;
  targetDate: string | null;
};
export type ExternalFactor = {
  id: string;
  title: string;
  source: string;
  impact: FactorImpact;
  status: "OPEN" | "RESOLVED";
  ownerId: string | null;
  targetDate: string | null;
  nextAction: string;
  notes: string;
  url: string;
};
export type ProjectInput = {
  kind: RecordKind;
  name: string;
  summary: string;
  objective: string;
  status: ProjectStatus;
  priority: Priority;
  health: Health;
  ownerId: string | null;
  startDate: string | null;
  targetDate: string | null;
  cadence: string;
  progress: number | null;
  nextStep: string;
  links: ProjectLink[];
  workstreams: Workstream[];
  factors: ExternalFactor[];
};
export type DigitalProject = ProjectInput & {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedByName: string;
};
export type ProjectActivity = {
  id: string;
  kind: "CREATED" | "UPDATED" | "NOTE";
  body: string;
  changedFields: string[];
  createdAt: string;
  actorName: string;
  projectVersion: number;
};
export type ProjectSummary = Omit<
  DigitalProject,
  "links" | "workstreams" | "factors"
> & {
  linkCount: number;
  workstreamCount: number;
  doneWorkstreamCount: number;
  openFactorCount: number;
  blockingFactorCount: number;
  lastUpdate: { body: string; createdAt: string; actorName: string } | null;
};
export type TeamWorkspace = {
  me: Person;
  canEdit: boolean;
  members: TeamMember[];
  candidates: Person[];
  projects: ProjectSummary[];
};
export type ProjectDetail = {
  project: DigitalProject;
  canEdit: boolean;
  updates: ProjectActivity[];
  nextCursor: string | null;
};
export type ActivityPage = {
  items: ProjectActivity[];
  nextCursor: string | null;
};
