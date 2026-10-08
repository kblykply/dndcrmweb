import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(new URL("../src/app/(app)/digital-team/_lib/" + name + ".ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  modules.set(name, exports);
  new Function("exports", "require", compiled)(exports, (path) => load(path.replace(/^\.\//, "")));
  return exports;
}
const { emptyProject, safeUrl, localToday, isOverdue, portfolioMetrics, memberName, initials, filterProjects, formatDate, formatDateTime } = load("model");
const { recordKinds, projectStatuses, priorities, healthValues, workstreamStatuses, factorImpacts, linkKinds } = load("types");
const { kindLabel, statusLabel, priorityLabel, healthLabel, workstreamStatusLabel, factorImpactLabel, linkKindLabel, activityFieldLabel } = load("copy");

function summary(id, fields = {}) {
  const { links, workstreams, factors, ...base } = emptyProject();
  return {
    ...base, id, name: id, version: 1, createdAt: "2026-09-01T12:00:00Z", updatedAt: "2026-09-01T12:00:00Z", updatedByName: "Admin",
    linkCount: links.length, workstreamCount: workstreams.length, doneWorkstreamCount: 0,
    openFactorCount: factors.length, blockingFactorCount: 0, lastUpdate: null, ...fields,
  };
}
const members = [
  { id: "member-a", name: "Ada Kaya", isActive: true },
  { id: "member-b", name: "Çağrı Şahin", isActive: false },
];

test("new project and process drafts contain no invented progress, work or business information", () => {
  const project = emptyProject();
  assert.equal(project.kind, "PROJECT");
  assert.equal(project.ownerId, null);
  assert.equal(project.name, "");
  assert.equal(project.status, "PLANNED");
  assert.equal(project.priority, "NORMAL");
  assert.equal(project.health, "NOT_SET");
  assert.equal(project.progress, null);
  assert.deepEqual([project.links, project.workstreams, project.factors], [[], [], []]);
  const process = emptyProject("PROCESS", "member-a");
  assert.equal(process.kind, "PROCESS");
  assert.equal(process.ownerId, "member-a");
  assert.equal(process.progress, null);
  assert.equal(process.cadence, "");
  project.links.push({ id: "link", label: "Edited" });
  assert.deepEqual(emptyProject().links, []);
});

test("portfolio counts do not double-count blockers or treat processes as finite overdue projects", () => {
  const projects = [
    summary("blocked-active", { status: "ACTIVE", health: "BLOCKED", blockingFactorCount: 3, targetDate: "2026-09-14" }),
    summary("blocked-planned", { status: "PLANNED", blockingFactorCount: 1, targetDate: "2026-09-14" }),
    summary("active-process", { kind: "PROCESS", status: "ACTIVE", health: "BLOCKED", targetDate: "2026-09-14" }),
    summary("done", { status: "COMPLETED", health: "BLOCKED", blockingFactorCount: 3, targetDate: "2026-09-14" }),
    summary("archived", { status: "ARCHIVED", health: "BLOCKED", blockingFactorCount: 1, targetDate: "2026-09-14" }),
    summary("paused", { status: "PAUSED", health: "AT_RISK", targetDate: "2026-09-14" }),
    summary("active-without-estimate", { status: "ACTIVE", targetDate: "2026-09-20", progress: null, doneWorkstreamCount: 4, workstreamCount: 4 }),
  ];
  const before = structuredClone(projects);
  assert.deepEqual(portfolioMetrics(projects, "2026-09-15"), { activeProjects: 2, activeProcesses: 1, blockedRecords: 3, overdueProjects: 3 });
  assert.deepEqual(projects, before);
  assert.equal(projects.at(-1).progress, null);
  assert.deepEqual(portfolioMetrics([], "2026-09-15"), { activeProjects: 0, activeProcesses: 0, blockedRecords: 0, overdueProjects: 0 });
});

test("a deadline becomes overdue only after its calendar day and while unfinished", () => {
  assert.equal(isOverdue({ status: "ACTIVE", targetDate: "2026-09-15" }, "2026-09-15"), false);
  assert.equal(isOverdue({ status: "PAUSED", targetDate: "2026-09-14" }, "2026-09-15"), true);
  assert.equal(isOverdue({ status: "PLANNED", targetDate: "2026-09-14T00:00:00.000Z" }, "2026-09-15"), true);
  assert.equal(isOverdue({ status: "COMPLETED", targetDate: "2026-09-14" }, "2026-09-15"), false);
  assert.equal(isOverdue({ status: "ARCHIVED", targetDate: "2026-09-14" }, "2026-09-15"), false);
  for (const targetDate of [null, "", "invalid", "2026-02-30", "2026-13-01", "2026-09-00"])
    assert.equal(isOverdue({ status: "ACTIVE", targetDate }, "2026-09-15"), false, targetDate || "missing");
  assert.equal(isOverdue({ status: "ACTIVE", targetDate: "2024-02-29" }, "2024-03-01"), true);
});

test("local calendar dates stay correct on either side of UTC midnight", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Kiritimati";
    assert.equal(localToday(new Date("2026-09-14T12:30:00Z")), "2026-09-15");
    assert.equal(isOverdue({ status: "ACTIVE", targetDate: "2026-09-14" }, localToday(new Date("2026-09-14T12:30:00Z"))), true);
    process.env.TZ = "America/Los_Angeles";
    assert.equal(localToday(new Date("2026-09-15T01:30:00Z")), "2026-09-14");
    assert.equal(isOverdue({ status: "ACTIVE", targetDate: "2026-09-14" }, localToday(new Date("2026-09-15T01:30:00Z"))), false);
    assert.equal(formatDate("2026-09-15T00:00:00.000Z", "en"), formatDate("2026-09-15", "en"));
    assert(formatDate("2026-09-15", "en").startsWith("15"));
    assert(formatDateTime("2026-09-15T01:30:00Z", "en").startsWith("14"));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("safe links accept explicit public and private HTTP(S) URLs without embedded credentials", () => {
  assert.equal(safeUrl(" https://example.com/docs "), "https://example.com/docs");
  assert.equal(safeUrl("http://100.81.139.12:8085/"), "http://100.81.139.12:8085/");
  assert.equal(safeUrl("HTTPS://EXAMPLE.COM"), "https://example.com/");
  for (const value of [null, undefined, "", "/relative", "//example.com", "https:example.com", "javascript:alert(1)", "data:text/html,hello", "file:///tmp/file", "mailto:a@example.com", "https://user:password@example.com/", "https://user@example.com", "https://example.com/\u0000", "https://exam\nple.com", "http://", "https://example.com/" + "x".repeat(2048)])
    assert.equal(safeUrl(value), "", String(value));
});

test("inactive member names remain available and unassigned differs from a missing member", () => {
  assert.equal(memberName(members, "member-b", "tr"), "Çağrı Şahin");
  assert.equal(memberName(members, null, "tr"), "Atanmadı");
  assert.equal(memberName(members, undefined, "en"), "Unassigned");
  assert.equal(memberName(members, "missing", "en"), "Member not found");
  assert.equal(initials("  Ada   Kaya  "), "AK");
  assert.equal(initials("Çağrı Şahin"), "ÇŞ");
  assert.equal(initials("Ada"), "A");
  assert.equal(initials("   "), "?");
});

test("search combines project details, localized labels and inactive owners without mutating input", () => {
  const projects = [
    summary("site", { name: "Şirket İletişimi", summary: "Yeni web sitesi", ownerId: "member-b", status: "ACTIVE", health: "AT_RISK" }),
    summary("process", { name: "Yedek kontrolü", kind: "PROCESS", status: "ACTIVE", ownerId: "member-a" }),
    summary("draft", { name: "Araştırma", status: "PLANNED", ownerId: null }),
  ];
  const before = structuredClone(projects);
  const ids = (filters, locale = "tr") => filterProjects(projects, filters, members, locale).map(project => project.id);
  assert.deepEqual(ids({ query: "SIRKET cagri" }), ["site"]);
  assert.deepEqual(ids({ query: "iletişimi riskli" }), ["site"]);
  assert.deepEqual(ids({ query: "active", kind: "PROCESS" }, "en"), ["process"]);
  assert.deepEqual(ids({ status: "ACTIVE", kind: "PROJECT", ownerId: "member-b", health: "AT_RISK" }), ["site"]);
  assert.deepEqual(ids({ ownerId: "UNASSIGNED" }), ["draft"]);
  assert.deepEqual(ids({ ownerId: null }), ["draft"]);
  assert.deepEqual(ids({ status: "ALL", ownerId: "", query: "  " }), ["site", "process", "draft"]);
  assert.deepEqual(ids({ health: "BLOCKED" }), []);
  assert.deepEqual(projects, before);
});

test("date formatting leaves unknown or impossible dates explicit", () => {
  for (const locale of ["tr", "en"]) {
    assert.equal(formatDate(null, locale), "—");
    assert.equal(formatDate("2026-02-30", locale), "—");
    assert.equal(formatDateTime("invalid", locale), "—");
    assert.notEqual(formatDate("2024-02-29", locale), "—");
  }
});

test("every editable enum and project activity field has Turkish and English labels", () => {
  const labels = [[recordKinds, kindLabel], [projectStatuses, statusLabel], [priorities, priorityLabel], [healthValues, healthLabel], [workstreamStatuses, workstreamStatusLabel], [factorImpacts, factorImpactLabel], [linkKinds, linkKindLabel]];
  for (const locale of ["tr", "en"]) {
    for (const [values, label] of labels) for (const value of values) assert(label(value, locale), `${locale}: ${value}`);
    for (const field of Object.keys(emptyProject())) assert.notEqual(activityFieldLabel(field, locale), field, `${locale}: ${field}`);
    assert.equal(activityFieldLabel("futureField", locale), "futureField");
  }
});
