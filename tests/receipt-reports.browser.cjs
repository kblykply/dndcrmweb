/* Synthetic browser traffic only. No real customer records, emails or uploads. */
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const { chromium, expect } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const origin = new URL(process.env.FRONTEND_URL || "http://127.0.0.1:43110")
  .origin;
const fixture = new Function(
  "require",
  "process",
  fs
    .readFileSync(path.join(__dirname, "payment-tracking.browser.cjs"), "utf8")
    .split("async function main()")[0] + "\nreturn {source,base,key};",
)(require, process);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE
      ? { executablePath: process.env.CHROME_EXECUTABLE }
      : {}),
  });
  try {
    for (const role of ["SALES", "ACCOUNTING"]) {
      const context = await browser.newContext({
          viewport: { width: role === "SALES" ? 1440 : 390, height: 1000 },
          acceptDownloads: true,
        }),
        user = { id: "synthetic-" + role, role, name: "Synthetic Report User" };
      await context.addInitScript((user) => {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("accessToken", "synthetic");
        localStorage.setItem("crm-locale", "tr");
      }, user);
      await context.routeWebSocket("**/*", (socket) => socket.close());
      const api = role === "SALES" ? "/sales-ledger" : "/payment-tracking",
        errors = [],
        unexpected = [];
      let receiptRequests = 0,
        receiptPolls = 0;
      const item = {
          ...fixture.base,
          sourceReview: null,
          authorization: { status: "matched", codes: [], hasBlank: true },
        },
        installment = {
          sequence: 1,
          projectCode: "SALE-A01",
          paymentKind: "sale",
          dueDate: "2026-11-01",
          amount: 2000,
          paid: 500,
          outstanding: 1500,
          overdueDays: 1,
          status: "overdue",
        };
      const detail = {
        source: {
          ...fixture.source,
          audit: {
            ...fixture.source.audit,
            status: "verified",
            reviewCaseCount: 0,
            excludedVatRows: 0,
          },
        },
        item,
        installments: [installment],
        portfolio: {
          fullyPaid: false,
          cases: [item],
          installments: [
            { ...installment, caseKey: fixture.key, currency: "GBP" },
          ],
        },
        contact: {
          status: "matched",
          source: "Synthetic",
          email: null,
          phone: null,
        },
        history: [],
        historyHasMore: false,
        assignees: [],
        followupAssignees: [],
      };
      const receipt = {
        key: fixture.key,
        source: {
          generatedAt: new Date().toISOString(),
          importedAt: new Date().toISOString(),
          asOf: fixture.source.asOf,
          sourceBatchId: "synthetic",
        },
        account: {
          customerCode: item.identity.customerCode,
          customerName: "Synthetic Customer",
          currency: "GBP",
          unitCodes: ["SYNTHETIC-A01"],
          scope: "customer_currency",
        },
        rows: [
          {
            id: "1",
            customerCode: item.identity.customerCode,
            customerName: "Synthetic Customer",
            date: "2026-03-04",
            ficheNo: "000001",
            documentNo: "",
            description: "Synthetic receipt",
            currency: "GBP",
            kind: "cash",
            amount: 100,
          },
          {
            id: "2",
            customerCode: item.identity.customerCode,
            customerName: "Synthetic Customer",
            date: "2026-04-01",
            ficheNo: "000002",
            documentNo: "R-2",
            description: "Synthetic transfer",
            currency: "GBP",
            kind: "transfer",
            amount: 50,
          },
        ],
        totals: {
          cash: 100,
          bank: 0,
          card: 0,
          cheque: 0,
          note: 0,
          transfer: 50,
          total: 150,
        },
      };
      await context.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        if (url.origin === origin) return route.continue();
        const headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        };
        if (req.method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        let data = {};
        const receiptEndpoint =
          url.pathname === api + "/" + fixture.key + "/receipt-report";
        if (receiptEndpoint && req.method() === "POST") {
          receiptRequests++;
          receiptPolls = 0;
          data = { status: "QUEUED" };
        } else if (receiptEndpoint && req.method() === "GET") {
          data =
            receiptPolls++ === 0
              ? { status: "RUNNING" }
              : { status: "READY", report: receipt };
        } else if (req.method() !== "GET") {
          unexpected.push(req.method() + " " + url.pathname);
          return route.abort();
        } else if (url.pathname === "/auth/me") data = user;
        else if (url.pathname.startsWith("/notifications"))
          data = url.pathname.endsWith("unread-count") ? { unread: 0 } : [];
        else if (
          url.pathname === api + "/" + fixture.key ||
          url.pathname === api + "/" + fixture.key + "/statement"
        )
          data = detail;
        else {
          unexpected.push(req.method() + " " + url.pathname);
          return route.fulfill({ status: 404, headers, body: "{}" });
        }
        return route.fulfill({
          status: 200,
          headers,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        origin +
          (role === "SALES"
            ? "/my-customer-accounts"
            : "/finance/payment-tracking") +
          "/" +
          fixture.key,
      );
      const exportButton = page.getByRole("button", {
        name: "Rapor indir",
        exact: true,
      });
      await expect(exportButton).toBeEnabled();
      for (const format of ["xlsx", "pdf"]) {
        await exportButton.click();
        const dialog = page.getByRole("dialog", {
            name: "Rapor indir",
            exact: true,
          }),
          reports = dialog.getByLabel("Rapor", { exact: true });
        await expect(dialog).toBeVisible();
        await expect(reports.locator("option")).toHaveCount(4);
        const labels = await reports.locator("option").allTextContents();
        assert.equal(labels.length, 4);
        assert(labels.includes("Ödeme Planı ve Borç Durumu (Tümü)"));
        assert(labels.includes("Tahsilat Raporu"));
        assert(!labels.some((s) => s.includes("cari ekstresi")));
        await reports.selectOption("receipts");
        await expect(
          dialog.getByText("belge numarası boş kayıtlar dahil listeler.", {
            exact: false,
          }),
        ).toBeVisible();
        await dialog
          .getByLabel("Dosya türü", { exact: true })
          .selectOption(format);
        await dialog.screenshot({
          path: "/tmp/crm-receipt-report-dialog-" + role + ".png",
        });
        const downloadEvent = page.waitForEvent("download");
        await dialog
          .getByRole("button", { name: "İndir", exact: true })
          .click();
        const download = await downloadEvent;
        assert(download.suggestedFilename().startsWith("tahsilat-raporu-"));
        const file = await download.path();
        if (format === "pdf") {
          assert.equal(fs.readFileSync(file).subarray(0, 4).toString(), "%PDF");
        } else {
          const { Workbook } = require("exceljs"),
            book = new Workbook();
          await book.xlsx.readFile(file);
          assert.equal(book.worksheets.length, 2);
          const sheet = book.worksheets[1],
            header = sheet.views[0].ySplit;
          assert.equal(sheet.getRow(header + 1).getCell(7).value, 100);
          assert.equal(sheet.getRow(header + 1).getCell(4).text, "");
          assert.equal(sheet.getRow(header + 2).getCell(7).value, 50);
          assert.equal(sheet.getRow(header + 1).getCell(1).value, "4 Mar 2026");
          assert.equal(sheet.getRow(1).getCell(1).value, "Tahsilat Raporu");
        }
      }
      await exportButton.click();
      const planDialog = page.getByRole("dialog", {
        name: "Rapor indir",
        exact: true,
      });
      await planDialog
        .getByLabel("Rapor", { exact: true })
        .selectOption("year");
      await expect(planDialog.getByLabel("Yıl", { exact: true })).toHaveValue(
        "2026",
      );
      await planDialog
        .getByLabel("Dosya türü", { exact: true })
        .selectOption("xlsx");
      const planEvent = page.waitForEvent("download");
      await planDialog
        .getByRole("button", { name: "İndir", exact: true })
        .click();
      const plan = await planEvent;
      assert(
        plan.suggestedFilename().startsWith("odeme-plani-ve-borc-durumu-"),
      );
      const { Workbook } = require("exceljs"),
        planBook = new Workbook();
      await planBook.xlsx.readFile(await plan.path());
      assert.equal(
        planBook.worksheets[0].getRow(1).getCell(1).value,
        "Ödeme Planı ve Borç Durumu",
      );
      assert.equal(receiptRequests, 2);
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpected, []);
      console.log(
        JSON.stringify({
          role,
          pdf: "passed",
          xlsx: "passed",
          realTransactionDates: "passed",
          renamedOptions: "passed",
          unexpectedWrites: 0,
        }),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
