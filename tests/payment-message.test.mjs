import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const path = name === "@/lib/projects" ? "../src/lib/projects.ts" : `../src/app/(app)/finance/payment-tracking/_lib/${name}.ts`;
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  modules.set(name, exports);
  new Function("exports", "require", compiled)(exports, (path) => load(path.replace(/^\.\//, "")));
  return exports;
}
const { buildPaymentMessage } = load("payment-message");
const defaultDate = "2026-10-02";
function installment(dueDate, amount, paid = 0, paymentKind = "sale") {
  return {
    sequence: 1, projectCode: paymentKind, paymentKind, dueDate,
    amount, paid, outstanding: Math.max(amount - paid, 0),
    // These presentation fields deliberately disagree: the message must derive
    // elapsed civil days from asOf and original dueDate, never local tracking.
    overdueDays: 9999, status: "upcoming",
  };
}
function entry(currency, installments, asOf = defaultDate) {
  const rows = installments.map((row, index) => ({ ...row, sequence: index + 1 }));
  const sum = (field, predicate = () => true) => rows.filter(predicate).reduce((total, row) => total + row[field], 0);
  const overdue = (row) => row.outstanding > 0 && row.dueDate < asOf;
  const item = {
    key: `synthetic-${currency}`,
    identity: { customerCode: "C-1", unitCode: "LJ-A1", currency },
    customerName: "Ayşe Yılmaz", unitName: "LA JOYA A1",
    customerNames: ["Ayşe Yılmaz"], unitNames: ["LA JOYA A1"],
    projects: [], representatives: [], brokers: [], invoiceDates: [],
    authorization: { codes: [], hasBlank: true, status: "matched" },
    installmentCount: rows.length, incompleteRows: 0,
    amount: sum("amount"), paid: sum("paid"), outstanding: sum("outstanding"),
    overdueAmount: sum("outstanding", overdue), overdueCount: rows.filter(overdue).length,
    dueTodayAmount: sum("outstanding", (row) => row.dueDate === asOf),
    oldestDueDate: null, nextDueDate: null, overdueDays: 8888,
    canTrack: true, trackingIssue: null, fullyPaid: false, projectGroup: "LA_JOYA",
    tracking: { key: `synthetic-${currency}`, trackingDate: "2027-01-01", version: 4 },
    effectiveDueDate: "2027-01-01", trackingStatus: "deferred", trackingOverdueDays: 0,
  };
  return { item, rows };
}
function detail(entries, asOf = defaultDate) {
  return {
    source: { asOf, generatedAt: `${asOf}T12:00:00.000Z` },
    item: entries[0].item,
    installments: entries[0].rows,
    portfolio: {
      fullyPaid: false,
      cases: entries.map((entry) => entry.item),
      installments: entries.flatMap(({ item, rows }) => rows.map((row) => ({ ...row, caseKey: item.key, currency: item.identity.currency }))),
    },
    contact: { status: "missing", email: null, phone: null, source: null },
    history: [], historyHasMore: false, assignees: [],
  };
}
function mixed() {
  return detail([
    entry("GBP", [
      installment("2026-08-01", 1000, 600),
      installment("2026-09-01", 600, 300, "vat"),
      installment("2026-10-02", 100, 0, "transformer"),
      installment("2026-11-01", 400),
    ]),
    entry("TL", [installment("2026-11-01", 350, 0, "transformer")]),
  ]);
}
function build(data, tr = true, scope = "portfolio") {
  return buildPaymentMessage(data, { tr, scope });
}
function section(body, currency) {
  return body.split("\n\n").find((paragraph) => paragraph.startsWith(`${currency}\n`));
}

test("portfolio draft separates currencies, partial balances and overdue months from today's and future debt", () => {
  const result = build(mixed());
  assert.equal(result.incomplete, false);
  assert.equal(result.tooLong, false);
  assert(result.body.startsWith("Sayın Ayşe Yılmaz,"));
  assert(result.body.includes("La Joya · LJ-A1 ödeme özeti"));
  assert(result.body.includes("Kaynak tarihi: 2 Eki 2026"));
  const gbp = section(result.body, "GBP");
  assert(gbp.includes("Toplam açık bakiye: 1.200,00 GBP"));
  assert(gbp.includes("Vadesi geçmiş: 700,00 GBP"));
  assert(gbp.includes("Bugün ve gelecek vadeli: 500,00 GBP"));
  assert(gbp.includes("En uzun gecikme: 62 gün"));
  assert(gbp.includes("• Ağustos 2026: 400,00 GBP · Normal satış · en fazla 62 gün gecikme"));
  assert(gbp.includes("• Eylül 2026: 300,00 GBP · KDV · en fazla 31 gün gecikme"));
  assert(!gbp.includes("Kasım 2026"));
  assert(!gbp.includes("• Ekim 2026"));
  const tl = section(result.body, "TL");
  assert(tl.includes("Toplam açık bakiye: 350,00 TL"));
  assert(tl.includes("Vadesi geçmiş: 0,00 TL"));
  assert(tl.includes("Bugün ve gelecek vadeli: 350,00 TL"));
  assert(tl.includes("Bu dövizde vadesi geçmiş borç bulunmuyor."));
  assert(!result.body.includes("1.550,00"), "Currencies must never be added together");
  assert(!result.body.includes("9999") && !result.body.includes("8888") && !result.body.includes("2027"));
});

test("English localization retains actual month years and source dates", () => {
  const result = build(mixed(), false);
  assert.equal(result.incomplete, false);
  assert(result.body.includes("Dear Ayşe Yılmaz,"));
  assert(result.body.includes("Source as of: 2 Oct 2026"));
  assert(result.body.includes("Total outstanding: 1,200.00 GBP"));
  assert(result.body.includes("• August 2026: 400.00 GBP · Normal sale · up to 62 days overdue"));
  assert(result.body.includes("• September 2026: 300.00 GBP · VAT · up to 31 days overdue"));
  assert(result.body.includes("Longest delay: 62 days"));
});

test("selected scope keeps every selected-currency payment kind but excludes siblings", () => {
  const result = build(mixed(), false, "selected");
  assert(result.body.includes("Total outstanding: 1,200.00 GBP"));
  assert(result.body.includes("VAT"));
  assert(!result.body.includes("TL"));
  assert(!result.body.includes("350.00"));
  assert.equal(result.incomplete, false);
});

test("duplicate installments remain in month sums and repeated months in different years stay separate", () => {
  const duplicate = installment("2026-10-01", 100, 20, "transformer");
  const data = detail([entry("GBP", [
    duplicate, duplicate,
    installment("2026-09-15", 80, 20, "vat"),
    installment("2025-09-01", 70, 20),
    installment("2026-09-01", 40, 20),
  ])]);
  const result = build(data, false);
  assert.equal(result.incomplete, false);
  assert(result.body.includes("Total outstanding: 290.00 GBP"));
  const older = result.body.indexOf("• September 2025: 50.00 GBP · Normal sale · up to 396 days overdue");
  const september = result.body.indexOf("• September 2026: 80.00 GBP · Normal sale, VAT · up to 31 days overdue");
  const october = result.body.indexOf("• October 2026: 160.00 GBP · Transformer · up to 1 day overdue");
  assert(older >= 0 && september > older && october > september);
});

test("overpayments are clamped per source installment and cannot offset another installment's debt", () => {
  const data = detail([entry("GBP", [
    installment("2026-09-01", 100, 150),
    installment("2026-09-15", 200, 50, "vat"),
  ])]);
  const result = build(data, false);
  assert.equal(result.incomplete, false);
  assert(result.body.includes("Total outstanding: 150.00 GBP"));
  assert(result.body.includes("• September 2026: 150.00 GBP · VAT · up to 17 days overdue"));
  assert(!result.body.includes("Normal sale"), "Paid/overpaid installments do not become overdue requests");
});

for (const [asOf, due, days] of [["2026-03-30", "2026-03-29", 1], ["2024-03-01", "2024-02-28", 2], ["2025-03-01", "2025-02-28", 1]]) {
  test(`civil-day differences use source date across daylight-saving/leap boundaries: ${due} to ${asOf}`, () => {
    const result = build(detail([entry("GBP", [installment(due, 100)], asOf)], asOf), false);
    assert.equal(result.incomplete, false);
    assert(result.body.includes(`Longest delay: ${days} ${days === 1 ? "day" : "days"}`));
  });
}

test("today and future obligations create no overdue payment demand", () => {
  const data = detail([entry("GBP", [installment(defaultDate, 100), installment("2026-12-01", 200)])]);
  const result = build(data, false);
  assert(result.body.includes("Due today and in the future: 300.00 GBP"));
  assert(result.body.includes("Your outstanding balance is not overdue"));
  assert(!result.body.includes("Please let us know the status of your overdue payments"));
  assert(!result.body.includes("payment receipt"));
  assert(!result.body.includes("Overdue months:"));
});

test("fully paid known records are informational even when closure metadata is stale", () => {
  const data = detail([entry("GBP", [installment("2026-09-01", 100, 100)]), entry("TL", [installment("2026-08-01", 200, 250)])]);
  const result = build(data, false);
  assert.equal(result.incomplete, false);
  assert(result.body.includes("Our records show no outstanding balance."));
  assert(!result.body.includes("payment receipt"));
  assert(!result.body.includes("Please let us know"));
  data.portfolio.fullyPaid = true;
  assert.equal(build(data, false).body, result.body);
});

const invalidMutations = [
  ["case incomplete", (data) => { data.item.incompleteRows = 1; }],
  ...["amount", "paid", "outstanding", "overdueAmount", "dueTodayAmount"].map((field) => [`null case ${field}`, (data) => { data.item[field] = null; }]),
  ...["amount", "paid", "outstanding"].flatMap((field) => [
    [`null installment ${field}`, (data) => { data.portfolio.installments[0][field] = null; }],
    [`negative installment ${field}`, (data) => { data.portfolio.installments[0][field] = -1; }],
    [`infinite installment ${field}`, (data) => { data.portfolio.installments[0][field] = Infinity; }],
  ]),
  ["NaN case amount", (data) => { data.item.amount = NaN; }],
  ["wrong case amount", (data) => { data.item.amount += 1; }],
  ["wrong case paid", (data) => { data.item.paid += 1; }],
  ["wrong case outstanding", (data) => { data.item.outstanding += 1; }],
  ["wrong overdue balance", (data) => { data.item.overdueAmount += 1; }],
  ["wrong due-today balance", (data) => { data.item.dueTodayAmount += 1; }],
  ["wrong installment count", (data) => { data.item.installmentCount += 1; }],
  ["wrong installment remaining", (data) => { data.portfolio.installments[0].outstanding += 0.01; }],
  ["missing installment", (data) => { data.portfolio.installments.splice(0, 1); }],
  ["unknown payment kind", (data) => { data.portfolio.installments[0].paymentKind = "mystery"; }],
  ["missing customer identity", (data) => { data.item.identity.customerCode = null; }],
  ["missing unit identity", (data) => { data.item.identity.unitCode = " "; }],
  ["foreign row key", (data) => { data.portfolio.installments[0].caseKey = "foreign"; }],
  ["duplicate case metadata", (data) => { data.portfolio.cases.push(data.item); }],
  ...[null, "", "2026-02-30", "2026-13-01", "2026-9-01", "2026-09-01T00:00:00Z"].map((due) => [`invalid original due ${due}`, (data) => { data.portfolio.installments[0].dueDate = due; }]),
];
for (const [name, mutate] of invalidMutations) {
  test(`${name} produces a neutral currency section instead of a definite amount`, () => {
    const data = mixed();
    mutate(data);
    const result = build(data, false);
    assert.equal(result.incomplete, true);
    assert(section(result.body, "GBP").includes("incomplete or inconsistent"));
    assert(!section(result.body, "GBP").includes("Total outstanding:"));
    assert(!section(result.body, "GBP").includes("Overdue months:"));
  });
}

test("one incomplete currency does not suppress a separate verified currency", () => {
  const data = mixed();
  data.item.incompleteRows = 1;
  const result = build(data, false);
  assert.equal(result.incomplete, true);
  assert(section(result.body, "GBP").includes("incomplete or inconsistent"));
  assert(section(result.body, "TL").includes("Total outstanding: 350.00 TL"));
});

for (const currency of [null, "", "999", "XYZ"]) {
  test(`unknown currency ${currency} never produces a definite monetary request`, () => {
    const result = build(detail([entry(currency, [installment("2026-09-01", 555)])]), false);
    assert.equal(result.incomplete, true);
    assert(!result.body.includes("555.00"));
    assert(result.body.includes("confirm the records"));
    assert(!result.body.includes("Our records show no outstanding balance"));
  });
}

test("invalid source date suppresses monetary assertions for every currency", () => {
  const data = mixed();
  data.source.asOf = "2026-02-30";
  const result = build(data, false);
  assert.equal(result.incomplete, true);
  assert(result.body.includes("The source date needs confirmation."));
  assert(!result.body.includes("Total outstanding:"));
});

test("empty portfolio is unknown, never an all-paid confirmation", () => {
  const data = mixed();
  data.portfolio.cases = [];
  data.portfolio.installments = [];
  const result = build(data, false);
  assert.equal(result.incomplete, true);
  assert(!result.body.includes("Our records show no outstanding balance"));
  assert(!result.body.includes("Total outstanding:"));
});

test("floating-point noise is accepted while a one-cent discrepancy is not", () => {
  const source = installment("2026-09-01", 0.3, 0.1);
  source.outstanding = 0.2;
  const data = detail([entry("GBP", [source, source])]);
  const result = build(data, false);
  assert.equal(result.incomplete, false);
  assert(result.body.includes("Total outstanding: 0.40 GBP"));
  data.item.paid += 0.01;
  assert.equal(build(data, false).incomplete, true);
});

test("finite input sums that overflow are withheld", () => {
  const data = detail([entry("GBP", [installment("2026-09-01", Number.MAX_VALUE), installment("2026-09-01", Number.MAX_VALUE)])]);
  const result = build(data, false);
  assert.equal(result.incomplete, true);
  assert(!result.body.includes("Infinity"));
  assert(!result.body.includes("Total outstanding:"));
});

test("a foreign customer's currency is not included under the selected customer's name", () => {
  const data = mixed();
  data.portfolio.cases[1].identity.customerCode = "OTHER";
  const result = build(data, false);
  assert.equal(result.incomplete, true);
  assert(section(result.body, "GBP").includes("Total outstanding: 1,200.00 GBP"));
  assert(!section(result.body, "TL").includes("350.00"));
});

test("blank customer names use a human greeting and unknown project names are not invented", () => {
  const data = mixed();
  data.item.customerName = " \n ";
  data.item.projectGroup = "UNKNOWN";
  const result = build(data);
  assert(result.body.startsWith("Sayın müşterimiz,"));
  assert(result.body.includes("LJ-A1 ödeme özeti"));
  assert(!result.body.includes("La Joya"));
});

test("long histories retain every month and report the app length limit without truncation", () => {
  const rows = Array.from({ length: 120 }, (_, index) => {
    const year = 2000 + Math.floor(index / 12);
    const month = String(index % 12 + 1).padStart(2, "0");
    return installment(`${year}-${month}-01`, 10);
  });
  const result = build(detail([entry("GBP", rows)]), false);
  assert.equal(result.incomplete, false);
  assert.equal(result.tooLong, true);
  assert(result.body.length > 4000);
  assert.equal(result.body.split("\n").filter((line) => line.startsWith("• ")).length, 120);
  assert(result.body.includes("• January 2000:"));
  assert(result.body.includes("• December 2009:"));
  assert(result.body.endsWith("Thank you."));
});

test("exactly 4000 characters is allowed and 4001 is flagged without alteration", () => {
  const data = detail([entry("GBP", [installment("2026-09-01", 10)])]);
  data.item.customerName = "A";
  const length = build(data, false).body.length;
  data.item.customerName = "A".repeat(4000 - length + 1);
  const exact = build(data, false);
  assert.equal(exact.body.length, 4000);
  assert.equal(exact.tooLong, false);
  data.item.customerName += "A";
  const longer = build(data, false);
  assert.equal(longer.body.length, 4001);
  assert.equal(longer.tooLong, true);
});

test("draft generation is deterministic and does not modify frozen source, workflow or installment data", () => {
  const data = mixed();
  const before = structuredClone(data);
  function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(freeze);
    }
    return value;
  }
  freeze(data);
  const first = build(data);
  assert.deepEqual(build(data), first);
  assert.deepEqual(data, before);
});
