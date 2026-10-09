import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(path) {
  const output = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports = {};
  new Function("exports", output)(exports);
  return exports;
}
const {
  navigationGroups,
  navigationForRole,
  searchNavigation,
  normalizeModuleSearch,
  activeNavigationItem,
  readGroupPreference,
} = load("../src/app/_ui/navigation.ts");
const tr = load("../src/i18n/tr.ts").default;
const en = load("../src/i18n/en.ts").default;
const label = (dict, key) =>
  key.split(".").reduce((value, part) => value?.[part], dict);
const labels = (key) => `${label(tr, key)} ${label(en, key)}`;
const items = (groups) => groups.flatMap((group) => group.items);
const ids = (groups) =>
  items(groups)
    .map((item) => item.id)
    .sort();
const all = items(navigationGroups).map((item) => item.id);

test("six groups contain unique, translated links to existing modules", () => {
  assert.equal(navigationGroups.length, 6);
  assert.equal(all.length, 30);
  assert.equal(new Set(all).size, all.length);
  assert.equal(
    new Set(items(navigationGroups).map((item) => item.href)).size,
    all.length,
  );
  for (const group of navigationGroups) {
    for (const key of [group.label, ...group.items.map((item) => item.label)]) {
      assert.equal(typeof label(tr, key), "string", key);
      assert.equal(typeof label(en, key), "string", key);
    }
    for (const item of group.items) {
      assert(
        [
          `../src/app/(app)${item.href}/page.tsx`,
          `../src/app${item.href}/page.tsx`,
        ].some((path) => existsSync(new URL(path, import.meta.url))),
        item.href,
      );
    }
  }
});

test("grouping preserves the old role matrix, excluding the dead help link", () => {
  const expected = {
    ADMIN: all,
    MANAGER: all.filter(
      (id) =>
        ![
          "unit-dashboard",
          "users",
          "lead-cleanup",
          "digital-map",
          "digital-team",
          "payment-tracking",
          "collection-report",
        ].includes(id),
    ),
    PREVIEW: all.filter(
      (id) => !["payment-tracking", "collection-report", "digital-map", "digital-team", "it-support"].includes(id),
    ),
    SALES: [
      "call-followups",
      "it-support",
      "profile",
      "tasks",
      "calendar",
      "meetings",
      "leads",
      "customers",
      "agencies",
      "agent-wheel",
      "nationality",
      "demographics",
      "units",
      "rent-projection",
      "organization",
      "quality",
      "iso-2026",
      "pdca",
    ],
    CALLCENTER: [
      "call-followups",
      "it-support",
      "tasks",
      "calendar",
      "leads",
      "rent-projection",
      "organization",
      "pdca",
    ],
    AFTERSALES: [
      "it-support",
      "profile",
      "tasks",
      "customers",
      "bulk-email",
      "units",
      "organization",
      "quality",
      "iso-2026",
    ],
    ACCOUNTING: [
      "payment-tracking",
      "collection-report",
      "it-support",
      "tasks",
      "organization",
    ],
  };
  for (const [role, allowed] of Object.entries(expected)) {
    const groups = navigationForRole(role);
    assert.deepEqual(ids(groups), [...allowed].sort(), role);
    assert(groups.every((group) => group.items.length));
  }
  assert.deepEqual(navigationForRole(undefined), []);
});

test("Turkish characters, case, English labels and multi-word searches match", () => {
  const admin = navigationForRole("ADMIN");
  for (const query of ["MÜŞTERİ", "musteri", "müşteri", "customer"])
    assert(
      ids(searchNavigation(admin, query, labels)).includes("customers"),
      query,
    );
  for (const query of ["CARK", "ÇARK", "cark", "wheel"])
    assert(
      ids(searchNavigation(admin, query, labels)).includes("agent-wheel"),
      query,
    );
  assert.deepEqual(ids(searchNavigation(admin, "finans ödeme takip", labels)), [
    "payment-tracking",
  ]);
  assert.deepEqual(ids(searchNavigation(admin, "  iş   takibi  ", labels)), [
    "tasks",
  ]);
  assert.equal(normalizeModuleSearch("İŞ ŞEMASI ÇĞÖÜ ı"), "is semasi cgou i");
  assert.deepEqual(ids(searchNavigation(admin, "  ", labels)), [...all].sort());
  assert.deepEqual(searchNavigation(admin, "not-a-module-zzzz", labels), []);
});

test("search cannot bring back modules hidden from a role", () => {
  assert.deepEqual(
    searchNavigation(navigationForRole("SALES"), "finance", labels),
    [],
  );
  assert.deepEqual(
    searchNavigation(navigationForRole("ACCOUNTING"), "customer", labels),
    [],
  );
  assert.deepEqual(
    searchNavigation(navigationForRole("AFTERSALES"), "user", labels),
    [],
  );
  assert.deepEqual(
    searchNavigation(navigationForRole(undefined), "", labels),
    [],
  );
});

test("Digital Map is searchable only for administrators and hidden from all other roles", () => {
  for (const role of ["ADMIN"]) {
    assert(ids(navigationForRole(role)).includes("digital-map"), role);
    for (const query of ["dijital harita", "digital map"])
      assert(ids(searchNavigation(navigationForRole(role), query, labels)).includes("digital-map"), `${role}: ${query}`);
  }
  for (const role of ["MANAGER", "PREVIEW", "SALES", "CALLCENTER", "AFTERSALES", "ACCOUNTING"]) {
    assert(!ids(navigationForRole(role)).includes("digital-map"), role);
    assert.deepEqual(searchNavigation(navigationForRole(role), "digital map", labels), [], role);
  }
  assert.equal(activeNavigationItem(navigationGroups, "/digital-map")?.id, "digital-map");
});

test("Digital Team and deep project routes are visible only to ADMIN", () => {
  assert(ids(searchNavigation(navigationForRole("ADMIN"), "dijital ekip", labels)).includes("digital-team"));
  assert(ids(searchNavigation(navigationForRole("ADMIN"), "digital team", labels)).includes("digital-team"));
  for (const role of ["MANAGER", "PREVIEW", "SALES", "CALLCENTER", "AFTERSALES", "ACCOUNTING"]) {
    assert(!ids(navigationForRole(role)).includes("digital-team"), role);
  }
  assert.equal(activeNavigationItem(navigationGroups, "/digital-team/project-id")?.id, "digital-team");
});

test("direct name matches precede aliases, without mutating the catalog", () => {
  const before = JSON.stringify(navigationGroups);
  assert.equal(
    items(searchNavigation(navigationGroups, "musteri", labels))[0].id,
    "customers",
  );
  assert.equal(
    items(searchNavigation(navigationGroups, "customers", labels))[0].id,
    "customers",
  );
  assert.equal(
    items(searchNavigation(navigationGroups, "work management", labels))[0].id,
    "tasks",
  );
  assert.equal(JSON.stringify(navigationGroups), before);
});

test("deep routes select exactly the closest module, not an overlapping parent", () => {
  const cases = {
    "/tasks/123": "tasks",
    "/units/123": "units",
    "/units/dashboard": "unit-dashboard",
    "/customers/nationality-report": "nationality",
    "/customers/demographics-report": "demographics",
    "/finance/payment-tracking/abc": "payment-tracking",
    "/admin/users/1": "users",
    "/agent-wheel-management": "wheel-management",
    "/my-customers": "profile",
  };
  for (const [path, id] of Object.entries(cases))
    assert.equal(activeNavigationItem(navigationGroups, path)?.id, id);
  assert.equal(
    activeNavigationItem(navigationGroups, "/units-other"),
    undefined,
  );
});

test("invalid saved preferences are ignored, known boolean values survive", () => {
  for (const value of [null, "broken", "null", "[]", "true", "17"])
    assert.deepEqual(readGroupPreference(value), {});
  assert.deepEqual(
    readGroupPreference(
      '{"sales":false,"company":true,"finance":"true","unknown":true,"__proto__":{}}',
    ),
    { sales: false, company: true },
  );
});

test("the wheel retains its separate-tab launch", () => {
  assert.equal(
    items(navigationGroups).find((item) => item.id === "agent-wheel").newTab,
    true,
  );
  assert.equal(items(navigationGroups).filter((item) => item.newTab).length, 1);
});


test("IT Support is available to every real employee role, never preview", () => {
  for (const role of ["ADMIN", "MANAGER", "SALES", "CALLCENTER", "AFTERSALES", "ACCOUNTING"]) {
    assert(ids(navigationForRole(role)).includes("it-support"), role);
    assert(ids(searchNavigation(navigationForRole(role), "ticket", labels)).includes("it-support"), role);
  }
  assert(!ids(navigationForRole("PREVIEW")).includes("it-support"));
  assert.equal(activeNavigationItem(navigationGroups, "/it-support/ticket-id")?.id, "it-support");
});
