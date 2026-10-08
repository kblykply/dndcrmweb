import { healthLabel, kindLabel, priorityLabel, statusLabel } from "./copy";
import type {
  Locale,
  ProjectInput,
  ProjectSummary,
  RecordKind,
  TeamMember,
} from "./types";

export function emptyProject(
  kind: RecordKind = "PROJECT",
  ownerId: string | null = null,
): ProjectInput {
  return {
    kind,
    name: "",
    summary: "",
    objective: "",
    status: "PLANNED",
    priority: "NORMAL",
    health: "NOT_SET",
    ownerId,
    startDate: null,
    targetDate: null,
    cadence: "",
    progress: null,
    nextStep: "",
    links: [],
    workstreams: [],
    factors: [],
  };
}

/** Public sites, private-network tools and repositories use explicit HTTP(S) links. */
export function safeUrl(value?: string | null): string {
  const input = value?.trim();
  if (
    !input ||
    input.length > 2048 ||
    !/^https?:\/\//i.test(input) ||
    /[\u0000-\u001f\u007f]/.test(input)
  )
    return "";
  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

/** Calendar deadlines use the viewer's local date, never a UTC date produced by toISOString. */
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function calendarDate(value?: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = value.slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setFullYear(year, month - 1, day);
  parsed.setHours(12, 0, 0, 0);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? date
    : null;
}

export function isOverdue(
  record: Pick<ProjectInput, "status" | "targetDate">,
  today = localToday(),
): boolean {
  const target = calendarDate(record.targetDate);
  const current = calendarDate(today);
  return (
    !!target &&
    !!current &&
    !["COMPLETED", "ARCHIVED"].includes(record.status) &&
    target < current
  );
}

export function portfolioMetrics(
  projects: readonly ProjectSummary[],
  today = localToday(),
) {
  return {
    activeProjects: projects.filter(
      (project) => project.kind === "PROJECT" && project.status === "ACTIVE",
    ).length,
    activeProcesses: projects.filter(
      (project) => project.kind === "PROCESS" && project.status === "ACTIVE",
    ).length,
    blockedRecords: projects.filter(
      (project) =>
        !["COMPLETED", "ARCHIVED"].includes(project.status) &&
        (project.health === "BLOCKED" || project.blockingFactorCount > 0),
    ).length,
    overdueProjects: projects.filter(
      (project) => project.kind === "PROJECT" && isOverdue(project, today),
    ).length,
  };
}

/** Inactive catalog members retain their names in current and historical assignments. */
export function memberName(
  members: readonly TeamMember[],
  id?: string | null,
  locale: Locale = "tr",
): string {
  if (!id) return locale === "tr" ? "Atanmadı" : "Unassigned";
  return (
    members.find((member) => member.id === id)?.name ||
    (locale === "tr" ? "Üye bulunamadı" : "Member not found")
  );
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (
    Array.from(words[0])[0] +
    (words.length > 1 ? Array.from(words[words.length - 1])[0] : "")
  ).toLocaleUpperCase();
}

export type ProjectFilters = {
  query?: string;
  status?: string;
  kind?: string;
  ownerId?: string | null;
  health?: string;
};

function searchable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .toLowerCase();
}

/** Empty/ALL filters include all values. null or UNASSIGNED owner filters select unassigned records. */
export function filterProjects<T extends ProjectSummary>(
  projects: readonly T[],
  filters: ProjectFilters = {},
  members: readonly TeamMember[] = [],
  locale: Locale = "tr",
): T[] {
  const terms = searchable(filters.query?.trim() || "")
    .split(/\s+/)
    .filter(Boolean);
  return projects.filter((project) => {
    if (
      filters.status &&
      filters.status !== "ALL" &&
      project.status !== filters.status
    )
      return false;
    if (filters.kind && filters.kind !== "ALL" && project.kind !== filters.kind)
      return false;
    if (
      filters.health &&
      filters.health !== "ALL" &&
      project.health !== filters.health
    )
      return false;
    if (filters.ownerId === null || filters.ownerId === "UNASSIGNED") {
      if (project.ownerId) return false;
    } else if (
      filters.ownerId &&
      filters.ownerId !== "ALL" &&
      project.ownerId !== filters.ownerId
    )
      return false;
    const haystack = searchable(
      [
        project.name,
        project.summary,
        project.objective,
        project.nextStep,
        memberName(members, project.ownerId, locale),
        kindLabel(project.kind, locale),
        statusLabel(project.status, locale),
        priorityLabel(project.priority, locale),
        healthLabel(project.health, locale),
      ].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

/** Date-only fields preserve their recorded calendar day across time zones. */
export function formatDate(
  value?: string | null,
  locale: Locale = "tr",
): string {
  const date = calendarDate(value);
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setFullYear(year, month - 1, day);
  parsed.setHours(12, 0, 0, 0);
  return parsed.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(
  value?: string | null,
  locale: Locale = "tr",
): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(locale === "tr" ? "tr-TR" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
