import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(name) {
  const source = readFileSync(new URL("../src/app/(app)/org-chart/_lib/" + name + ".ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("exports", compiled)(exports);
  return exports;
}
const { descendants, chartRows, isOverdue, definitionChecks } = load("model");
const { definitionFor } = load("types");
const { orgCopy, errorText } = load("copy");
const nodes = [
  { id: "root", parentId: null, name: "Company" },
  { id: "department", parentId: "root", name: "Department" },
  { id: "position", parentId: "department", name: "Quality lead" },
  { id: "other", parentId: "root", name: "Sales" },
];
test("finds all descendants without following a cycle forever", () => {
  assert.deepEqual([...descendants(nodes, "department")], ["department", "position"]);
  assert.deepEqual([...descendants([{ id: "a", parentId: "b" }, { id: "b", parentId: "a" }], "a")], ["a", "b"]);
});
test("filtered chart retains reporting ancestors", () => {
  assert.deepEqual(chartRows(nodes, new Set(["position"]), new Set(), true).map((node) => node.id), ["root", "department", "position"]);
});
test("collapsing a branch hides descendants, not siblings", () => {
  assert.deepEqual(chartRows(nodes, new Set(nodes.map((node) => node.id)), new Set(["department"]), false).map((node) => node.id), ["root", "department", "other"]);
});
test("search reveals matches in collapsed branches", () => {
  assert(chartRows(nodes, new Set(["position"]), new Set(["department"]), true).some((node) => node.id === "position"));
});
test("dates are overdue only after the calendar date and not for archived records", () => {
  assert.equal(isOverdue({ status: "DRAFT", reviewDueAt: "2026-09-10T00:00:00Z" }, "2026-09-10"), false);
  assert.equal(isOverdue({ status: "APPROVED", reviewDueAt: "2026-09-09T00:00:00Z" }, "2026-09-10"), true);
  assert.equal(isOverdue({ status: "ARCHIVED", reviewDueAt: "2026-09-09T00:00:00Z" }, "2026-09-10"), false);
});
test("position definition completeness matches the approval fields", () => {
  const checks = definitionChecks({ kind: "POSITION", code: " ", purpose: "Role purpose" });
  assert.equal(checks.length, 6);
  assert.equal(checks.filter((item) => item.complete).length, 1);
  assert.equal(definitionChecks({ kind: "DEPARTMENT" }).length, 5);
});
test("editable payload excludes assignment, approval and server version", () => {
  const definition = definitionFor({ ...nodes[0], kind: "COMPANY", processes: [], assigneeId: "person", status: "APPROVED", version: 4 });
  assert(!("assigneeId" in definition));
  assert(!("status" in definition));
  assert(!("version" in definition));
});
test("Turkish and English have the same translation keys", () => {
  const keys = (obj) => Object.entries(obj).flatMap(([key, value]) => typeof value === "object" ? keys(value).map((child) => key + "." + child) : [key]).sort();
  assert.deepEqual(keys(orgCopy.tr), keys(orgCopy.en));
  assert.equal(errorText(new Error(JSON.stringify({ code: "ORG_VERSION_CONFLICT" })), orgCopy.tr), orgCopy.tr.errors.ORG_VERSION_CONFLICT);
});
