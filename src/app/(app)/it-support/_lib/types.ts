export type Locale = "tr" | "en";
export const ticketTypes = ["INCIDENT", "REQUEST"] as const;
export const categories = [
  "HARDWARE",
  "SOFTWARE",
  "ACCESS",
  "NETWORK",
  "EMAIL",
  "WEBSITE",
  "DATA",
  "OTHER",
] as const;
export const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const impacts = ["SINGLE", "TEAM", "COMPANY"] as const;
export const urgencies = ["LOW", "NORMAL", "HIGH"] as const;
export const statuses = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "WAITING_VENDOR",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;
export type TicketType = (typeof ticketTypes)[number];
export type Category = (typeof categories)[number];
export type Priority = (typeof priorities)[number];
export type Impact = (typeof impacts)[number];
export type Urgency = (typeof urgencies)[number];
export type TicketStatus = (typeof statuses)[number];
export type Scope = "MINE" | "ALL" | "ASSIGNED" | "UNASSIGNED";
export type TicketAction = "CONFIRM" | "REOPEN" | "CANCEL";
export type Person = { id: string; name: string; role: string };
export type Workspace = { me: Person; canManage: boolean; agents: Person[] };
export type CreateTicket = {
  subject: string;
  description: string;
  type: TicketType;
  category: Category;
  impact: Impact;
  urgency: Urgency;
  system: string;
  location: string;
};
export type TicketSummary = {
  id: string;
  number: number;
  code: string;
  subject: string;
  type: TicketType;
  category: Category;
  status: TicketStatus;
  priority: Priority;
  impact: Impact;
  urgency: Urgency;
  system: string;
  location: string;
  requester: { id: string | null; name: string };
  assignee: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  version: number;
};
export type Ticket = TicketSummary & {
  description: string;
  resolution: string;
};
export type Attachment = {
  id: string;
  entryId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};
export type Entry = {
  id: string;
  kind: "CREATED" | "REPLY" | "NOTE" | "STATUS" | "UPDATED";
  visibility: "PUBLIC" | "INTERNAL";
  body: string;
  authorName: string;
  authorId: string | null;
  createdAt: string;
  status: TicketStatus | null;
  changedFields: string[];
  attachments: Attachment[];
};
export type TicketDetail = {
  ticket: Ticket;
  canManage: boolean;
  canReply: boolean;
  actions: TicketAction[];
  allowedStatuses: TicketStatus[];
  entries: Entry[];
  nextCursor: string | null;
  attachments: Attachment[];
};
export type EntryPage = { items: Entry[]; nextCursor: string | null };
export type TicketStats = {
  open: number;
  waitingRequester: number;
  resolved: number;
  unassigned: number;
  overdue: number;
};
export type TicketList = {
  items: TicketSummary[];
  total: number;
  skip: number;
  take: number;
  stats: TicketStats;
};
export type TriageInput = {
  version: number;
  category: Category;
  priority: Priority;
  status: TicketStatus;
  assigneeId: string | null;
  dueAt: string | null;
  reason: string;
};
