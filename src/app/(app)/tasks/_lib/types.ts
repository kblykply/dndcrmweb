export const statuses = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
] as const;
export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const kinds = ["TASK", "BUG", "REQUEST", "MILESTONE"] as const;
export type Status = (typeof statuses)[number];
export type Priority = (typeof priorities)[number];
export type Kind = (typeof kinds)[number];
export type Person = { id: string; name: string; isActive?: boolean };
export type Member = {
  userId: string;
  role: "LEAD" | "MEMBER" | "VIEWER";
  user: Person;
};
export type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  owner: Person;
  departmentId: string | null;
  department: Person | null;
  members: Member[];
  version: number;
  archivedAt: string | null;
  canManage: boolean;
  canEdit: boolean;
};
export type Workspace = {
  projects: Project[];
  users: Person[];
  departments: Person[];
  me: (Person & { role: string }) | null;
};
export const emptyWorkspace: Workspace = {
  projects: [],
  users: [],
  departments: [],
  me: null,
};
export type Brief = {
  id: string;
  title: string;
  status: Status;
  archivedAt: string | null;
  version: number;
  assignedToId: string | null;
};
export type Check = { id: string; title: string; done: boolean };
export type WorkItem = Brief & {
  description: string | null;
  priority: Priority;
  kind: Kind;
  labels: string[];
  projectId: string | null;
  project: Project | null;
  parentId: string | null;
  parent: Brief | null;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  estimateMinutes: number;
  spentMinutes: number;
  createdById: string;
  createdBy: Person;
  assignedTo: Person | null;
  agencyId: string | null;
  customerId: string | null;
  leadId: string | null;
  agency: { id: string; name: string } | null;
  customer: { id: string; fullName: string } | null;
  lead: { id: string; fullName: string } | null;
  checklist: Check[];
  blockers: { blockerId: string; blocker: Brief }[];
  _count: { comments: number; attachments: number; subtasks: number };
  canEdit: boolean;
  canArchive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type Comment = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};
export type TimeEntry = {
  id: string;
  minutes: number;
  workedOn: string;
  note: string | null;
  userId: string | null;
  userName: string;
  createdAt: string;
};
export type Attachment = {
  id: string;
  name: string;
  size: number;
  userId: string | null;
  userName: string;
  createdAt: string;
};
export type Activity = {
  id: string;
  action: string;
  actorName: string;
  changes: Record<string, unknown>;
  createdAt: string;
};
export type Detail = WorkItem & {
  comments: Comment[];
  timeEntries: TimeEntry[];
  attachments: Attachment[];
  activity: Activity[];
  subtasks: Brief[];
  blocking: { task: Brief }[];
  watching: boolean;
  me: Person & { role: string };
};
export type Report = {
  total: number;
  overdue: number;
  status: { status: Status; _count: number }[];
  priority: { priority: Priority; _count: number }[];
  workload: {
    assignedToId: string | null;
    status: Status;
    _count: number;
    _sum: { estimateMinutes: number | null };
  }[];
  due: {
    id: string;
    title: string;
    dueAt: string;
    status: Status;
    priority: Priority;
    assignedTo: Person | null;
  }[];
  estimateMinutes: number;
  spentMinutes: number;
};
export const emptyReport: Report = {
  total: 0,
  overdue: 0,
  status: [],
  priority: [],
  workload: [],
  due: [],
  estimateMinutes: 0,
  spentMinutes: 0,
};
export const statusColors: Record<Status, string> = {
  TODO: "#64748b",
  IN_PROGRESS: "#2879c9",
  BLOCKED: "#d34654",
  IN_REVIEW: "#9b6a19",
  DONE: "#168268",
  CANCELLED: "#8b8791",
};
export function overdue(task: Pick<WorkItem, "status" | "dueAt">) {
  return (
    !!task.dueAt &&
    !["DONE", "CANCELLED"].includes(task.status) &&
    new Date(task.dueAt).getTime() < Date.now()
  );
}
export function shortId(task: Pick<WorkItem, "id" | "project">) {
  return (task.project?.key || "DND") + "-" + task.id.slice(-6).toUpperCase();
}
export function duration(minutes: number) {
  return Math.floor(minutes / 60) + "h " + (minutes % 60) + "m";
}
export function dateTime(
  value: string | null | undefined,
  locale: string,
  time = false,
) {
  if (!value) return "–";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));
}
export function localInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
