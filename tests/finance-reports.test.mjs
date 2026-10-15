import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const base = path.resolve("src");
const loaded = new Map();
function load(filename) {
  if (loaded.has(filename)) return loaded.get(filename);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  loaded.set(filename, exports);
  new Function("exports", "require", output)(exports, (name) =>
    name.startsWith(".") || name.startsWith("@/")
      ? load(
          name.startsWith("@/")
            ? path.join(base, `${name.slice(2)}.ts`)
            : path.resolve(path.dirname(filename), `${name}.ts`),
        )
      : require(name),
  );
  return exports;
}
const { buildTableReport, buildStatementReport, buildSalesLedgerReport } = load(
  path.join(base, "app/(app)/finance/_reports/build.ts"),
);
const { downloadFinanceReport } = load(
  path.join(base, "app/(app)/finance/_reports/download.ts"),
);
const source = { asOf: "2026-10-15", importedAt: "2026-10-10T07:12:31Z" };
const total = (amount, paid, outstanding, count = 1) => ({
  amount,
  paid,
  outstanding,
  count,
});
const line = (overrides = {}) => ({
  caseKey: "case-gbp",
  id: "1",
  customerName: "İlker Şahin",
  customerCode: "C1",
  unitCode: "LJ-A1",
  unitName: "Daire 1",
  projectGroup: "LA_JOYA",
  representatives: ["Satış Görevlisi"],
  currency: "GBP",
  dueDate: "2026-10-10",
  amount: 100,
  paid: 25,
  outstanding: 75,
  paymentKind: "sale",
  projectCode: "LJ-A1",
  ...overrides,
});
function fixture() {
  return {
    source,
    currency: "__ALL__",
    search: "",
    year: "",
    month: "",
    previousMonthEnd: "2026-09-30",
    total: 3,
    rows: [
      line(),
      line({ id: "2", amount: null, paid: 0, outstanding: null }),
      line({
        caseKey: "case-eur",
        id: "3",
        currency: "EUR",
        amount: 1000,
        paid: 1000,
        outstanding: 0,
      }),
    ],
    overview: [
      {
        currency: "GBP",
        overall: total(null, 25, null, 2),
        throughPreviousMonth: total(0, 0, 0, 0),
      },
      {
        currency: "EUR",
        overall: total(1000, 1000, 0),
        throughPreviousMonth: total(0, 0, 0, 0),
      },
    ],
    years: [
      {
        year: "2026",
        currency: "GBP",
        ...total(null, 25, null, 2),
        months: [{ month: "2026-10", ...total(null, 25, null, 2) }],
      },
      {
        year: "2026",
        currency: "EUR",
        ...total(1000, 1000, 0),
        months: [{ month: "2026-10", ...total(1000, 1000, 0) }],
      },
    ],
  };
}
test("general report keeps currencies separate and records scope and actual import date", () => {
  const report = buildTableReport(fixture(), "general", true);
  assert.equal(report.sheets.length, 3);
  const annual = report.sheets[1];
  assert.equal(annual.rows.length, 2);
  assert.deepEqual(annual.rows[0].slice(2, 6), [null, 25, null, null]);
  assert.deepEqual(annual.rows[1].slice(2, 6), [1000, 1000, 0, 1]);
  assert(report.metadata.some((line) => line.includes("DND")));
  assert(
    report.metadata.some(
      (line) => line.includes("2026") && line.includes("aktarımı"),
    ),
  );
});
test("monthly customer report groups repeated installments without merging currencies or treating missing amounts as zero", () => {
  const data = fixture();
  data.year = "2026";
  data.month = "2026-10";
  const rows = buildTableReport(data, "customers", true).sheets[0].rows;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].slice(5), [null, 25, null, null]);
  assert.deepEqual(rows[1].slice(5), [1000, 1000, 0, 1]);
});
test("detail report preserves zero balances, missing dates, Turkish text and every returned row", () => {
  const data = fixture();
  data.rows[0].dueDate = null;
  const report = buildTableReport(data, "detail", true);
  assert.equal(report.sheets[0].rows.length, 3);
  assert.equal(report.sheets[0].rows[0][0], "İlker Şahin");
  assert.equal(report.sheets[0].rows[0][5], null);
  assert.equal(report.sheets[0].rows[2][9], 0);
});
test("customer statement limits by due year or month and includes all payment kinds and undated rows only in full statements", () => {
  const data = {
    source,
    item: {
      customerName: "İlker Şahin",
      key: "case-gbp",
      identity: { customerCode: "C1", unitCode: "LJ-A1" },
      unitName: "Daire 1",
    },
    portfolio: {
      installments: [
        line(),
        line({
          dueDate: "2026-11-10",
          paymentKind: "vat",
          amount: 50,
          paid: 0,
          outstanding: 50,
        }),
        line({ dueDate: "2027-01-01", amount: 70 }),
        line({ dueDate: null, amount: null }),
      ],
    },
  };
  assert.equal(buildStatementReport(data, "", true).sheets[1].rows.length, 4);
  assert.equal(
    buildStatementReport(data, "2026", true).sheets[1].rows.length,
    2,
  );
  const report = buildStatementReport(data, "2026-10", true);
  assert.equal(report.sheets[1].rows.length, 1);
  assert.deepEqual(report.sheets[0].rows[0], ["GBP", 100, 25, 75, 0.25]);
});
test("Excel output is a real workbook with numeric money, percentages, blanks, filters and frozen headers", async () => {
  const blobs = [];
  const originalDocument = globalThis.document,
    originalTimeout = globalThis.setTimeout,
    originalCreate = URL.createObjectURL;
  globalThis.document = {
    createElement: () => ({ click() {}, remove() {} }),
    body: { appendChild() {} },
  };
  URL.createObjectURL = (blob) => {
    blobs.push(blob);
    return "blob:test";
  };
  globalThis.setTimeout = () => 0;
  try {
    await downloadFinanceReport(
      buildTableReport(fixture(), "detail", true),
      "xlsx",
      true,
      () => true,
    );
    const { Workbook } = require("exceljs");
    const book = new Workbook();
    await book.xlsx.load(await blobs[0].arrayBuffer());
    const sheet = book.worksheets[0],
      header = sheet.views[0].ySplit,
      row = sheet.getRow(header + 1);
    assert.equal(row.getCell(1).value, "İlker Şahin");
    assert.equal(row.getCell(8).value, 100);
    assert.equal(row.getCell(11).value, 0.25);
    assert.equal(row.getCell(11).numFmt, "0.0%");
    assert.equal(sheet.getRow(header + 2).getCell(8).value, null);
    assert(sheet.autoFilter);
  } finally {
    globalThis.document = originalDocument;
    globalThis.setTimeout = originalTimeout;
    URL.createObjectURL = originalCreate;
  }
});
test("a session change blocks the download before any file is generated", async () => {
  await assert.rejects(
    downloadFinanceReport(
      buildTableReport(fixture(), "general", true),
      "xlsx",
      true,
      () => false,
    ),
    /Oturum değişti/,
  );
});
test("session changes while the Excel workbook is being prepared also prevent saving", async () => {
  let calls = 0;
  await assert.rejects(
    downloadFinanceReport(
      buildTableReport(fixture(), "general", true),
      "xlsx",
      true,
      () => ++calls === 1,
    ),
    /Oturum değişti/,
  );
  assert.equal(calls, 2);
});
test("PDF output embeds Turkish fonts and paginates long ledgers", async () => {
  const { jsPDF } = require("jspdf");
  const originalSave = jsPDF.API.save,
    originalFetch = globalThis.fetch;
  let output;
  jsPDF.API.save = function (filename) {
    output = {
      filename,
      pages: this.getNumberOfPages(),
      bytes: Buffer.from(this.output("arraybuffer")),
    };
  };
  globalThis.fetch = async (url) => {
    const bytes = readFileSync(path.join("public", String(url)));
    return {
      ok: true,
      arrayBuffer: async () =>
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
    };
  };
  try {
    const data = fixture();
    data.rows = Array.from({ length: 160 }, (_, i) =>
      line({ id: String(i), customerName: `İlker Şahin ${i}` }),
    );
    await downloadFinanceReport(
      buildTableReport(data, "detail", true),
      "pdf",
      true,
      () => true,
    );
    assert(output.filename.endsWith(".pdf"));
    assert(output.pages > 1);
    assert.equal(output.bytes.subarray(0, 4).toString(), "%PDF");
    assert(output.bytes.includes(Buffer.from("/FontFile2")));
  } finally {
    jsPDF.API.save = originalSave;
    globalThis.fetch = originalFetch;
  }
});

test("sales ledger exports preserve isolated cases and separate currency balances", () => {
  const data = {
    source,
    currencyMode: "all",
    currencyBreakdown: [
      {
        currency: "GBP",
        filteredSummary: { outstanding: 75, overdueAmount: 50 },
      },
      {
        currency: "EUR",
        filteredSummary: { outstanding: 20, overdueAmount: 10 },
      },
    ],
    selectedPaymentKind: "sale",
    rows: [
      {
        ...line(),
        identity: { customerCode: "C1", unitCode: "LJ-A1", currency: "GBP" },
        overdueAmount: 50,
        effectiveDueDate: "2026-10-10",
      },
    ],
  };
  const report = buildSalesLedgerReport(data, true, "Geciken");
  assert.equal(report.sheets[0].rows.length, 2);
  assert.equal(report.sheets[1].rows.length, 1);
  assert(report.metadata.some((row) => row.includes("Yalnız kendi carilerim")));
});
test("sales report guards accept only explicit sales mode and revoke downloads on role changes", () => {
  let user = { id: "bob", role: "SALES" };
  let version = 0;
  const source = readFileSync(
    path.join(base, "app/(app)/finance/_reports/session.ts"),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("exports", "require", output)(exports, () => ({
    getUser: () => user,
    getAuthSessionVersion: () => version,
  }));
  assert.equal(exports.reportSessionGuard()(), false);
  const allowed = exports.reportSessionGuard("sales");
  assert.equal(allowed(), true);
  user = { id: "sabina", role: "SALES" };
  assert.equal(allowed(), false);
  user = { id: "bob", role: "SALES" };
  version++;
  assert.equal(allowed(), false);
});
