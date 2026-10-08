import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(new URL("../src/app/(app)/it-support/_lib/" + name + ".ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  modules.set(name, exports);
  new Function("exports", "require", compiled)(exports, path => load(path.replace(/^\.\//, "")));
  return exports;
}
const {
  emptyTicket, suggestedPriority, isOpen, isOverdue, formatDateTime, formatBytes,
  typeLabel, categoryLabel, statusLabel, priorityLabel, impactLabel, urgencyLabel, fieldLabel,
} = load("model");
const { ticketTypes, categories, priorities, impacts, urgencies, statuses } = load("types");

test("new drafts contain no invented issue, asset, location or assignment", () => {
  const draft = emptyTicket();
  assert.deepEqual(draft, {
    subject: "", description: "", type: "INCIDENT", category: "OTHER",
    impact: "SINGLE", urgency: "NORMAL", system: "", location: "",
  });
  draft.subject = "Changed draft";
  assert.equal(emptyTicket().subject, "");
  assert.equal("assigneeId" in draft, false);
  assert.equal("requesterId" in draft, false);
});

test("priority suggestions weigh both business impact and urgency", () => {
  const matrix = {
    SINGLE: { LOW: "LOW", NORMAL: "NORMAL", HIGH: "NORMAL" },
    TEAM: { LOW: "NORMAL", NORMAL: "NORMAL", HIGH: "HIGH" },
    COMPANY: { LOW: "NORMAL", NORMAL: "HIGH", HIGH: "URGENT" },
  };
  for (const impact of impacts) for (const urgency of urgencies)
    assert.equal(suggestedPriority(impact, urgency), matrix[impact][urgency], `${impact}/${urgency}`);
});

test("resolved, closed and cancelled tickets never contribute to open or overdue work", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  for (const status of statuses) {
    const open = ["NEW", "IN_PROGRESS", "WAITING_REQUESTER", "WAITING_VENDOR"].includes(status);
    assert.equal(isOpen(status), open, status);
    assert.equal(isOverdue({ status, dueAt: "2026-09-15T09:00:00Z" }, now), open, status);
  }
});

test("a target is overdue only after its actual instant, including timezone offsets", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  const overdue = dueAt => isOverdue({ status: "IN_PROGRESS", dueAt }, now);
  assert.equal(overdue("2026-09-16T14:59:59+03:00"), true);
  assert.equal(overdue("2026-09-16T15:00:00+03:00"), false);
  assert.equal(overdue("2026-09-16T15:00:01+03:00"), false);
  for (const value of [null, "", "invalid", "2026-02-30T09:00:00Z", "2026-13-01T09:00:00Z", "2026-00-10T09:00:00Z"])
    assert.equal(overdue(value), false, String(value));
  assert.equal(isOverdue({ status: "NEW", dueAt: "2026-09-15T09:00:00Z" }, new Date("invalid")), false);
});

test("display dates preserve local time and do not turn missing or impossible dates into real deadlines", () => {
  for (const locale of ["tr", "en"]) {
    for (const value of [null, undefined, "", "invalid", "2026-02-30T09:00:00Z"])
      assert.equal(formatDateTime(value, locale), "—");
    assert.notEqual(formatDateTime("2024-02-29T09:00:00Z", locale), "—");
  }
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Asia/Famagusta";
    const formatted = formatDateTime("2026-09-15T22:30:00Z", "en");
    assert.match(formatted, /^16 /);
    assert.match(formatted, /01:30/);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("attachment sizes distinguish empty files and missing sizes without NaN or Infinity", () => {
  for (const [bytes, label] of [[0, "0 B"], [1023, "1023 B"], [1024, "1 KB"], [1536, "1.5 KB"], [1048576, "1 MB"], [5368709120, "5 GB"]])
    assert.equal(formatBytes(bytes), label);
  for (const invalid of [-1, NaN, Infinity, -Infinity]) assert.equal(formatBytes(invalid), "—");
});

test("all editable enums and recorded metadata have Turkish and English labels", () => {
  const labels = [[ticketTypes, typeLabel], [categories, categoryLabel], [priorities, priorityLabel], [impacts, impactLabel], [urgencies, urgencyLabel], [statuses, statusLabel]];
  for (const locale of ["tr", "en"]) {
    for (const [values, label] of labels) for (const value of values) {
      assert(label(value, locale));
      assert.notEqual(label(value, locale), value);
    }
    for (const field of [...Object.keys(emptyTicket()), "priority", "status", "assigneeId", "dueAt", "resolution", "visibility", "attachments"])
      assert.notEqual(fieldLabel(field, locale), field, `${locale}/${field}`);
    assert.equal(fieldLabel("futureField", locale), "futureField");
  }
  assert.equal(typeLabel("INCIDENT", "tr"), "Sorun / arıza");
  assert.equal(statusLabel("WAITING_REQUESTER", "tr"), "Kullanıcıdan bilgi bekleniyor");
  assert.equal(urgencyLabel("HIGH", "tr"), "Çalışamıyorum");
});
