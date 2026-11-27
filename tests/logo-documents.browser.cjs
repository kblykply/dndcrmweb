/* Synthetic browser traffic only; no real customer files or messages. */
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const { chromium, expect } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const origin = new URL(process.env.FRONTEND_URL || "http://127.0.0.1:43110")
  .origin;
const code = fs
  .readFileSync(path.join(__dirname, "payment-tracking.browser.cjs"), "utf8")
  .split("async function main()")[0];
const fixture = new Function(
  "require",
  "process",
  code + "\nreturn {source,base,key};",
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
      const context = await browser.newContext(),
        user = { id: "test-" + role, role, name: "Synthetic user" };
      await context.addInitScript((user) => {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("accessToken", "synthetic");
        localStorage.setItem("crm-locale", "tr");
      }, user);
      await context.routeWebSocket("**/*", (socket) => socket.close());
      const api = role === "SALES" ? "/sales-ledger" : "/payment-tracking";
      let metadataReads = 0,
        fetchRequests = 0,
        cacheTransfers = 0,
        cached = false,
        online = true,
        job = null;
      const errors = [],
        unexpected = [];
      await context.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        const headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        };
        if (request.method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        let data = {},
          status = 200;
        if (url.pathname === "/auth/me") data = user;
        else if (url.pathname.startsWith("/notifications"))
          data = url.pathname.endsWith("unread-count") ? { unread: 0 } : [];
        else if (url.pathname === `${api}/${fixture.key}`) {
          const item = {
            ...fixture.base,
            sourceReview: null,
            authorization: { status: "matched", codes: [], hasBlank: true },
            invoiceOk: { status: "matched", values: ["DND"], hasBlank: false },
          };
          const installments = [
            {
              sequence: 1,
              projectCode: "SALE-A01",
              paymentKind: "sale",
              dueDate: "2026-11-01",
              amount: 2000,
              paid: 500,
              outstanding: 1500,
              overdueDays: 1,
              status: "overdue",
            },
          ];
          data = {
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
            installments,
            portfolio: {
              fullyPaid: false,
              cases: [item],
              installments: installments.map((x) => ({
                ...x,
                caseKey: fixture.key,
                currency: "GBP",
              })),
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
        } else if (url.pathname === `${api}/${fixture.key}/documents`) {
          metadataReads++;
          data = {
            workerOnline: online,
            updatedAt: new Date().toISOString(),
            job,
            documents: [
              {
                id: "d".repeat(64),
                fileName: "synthetic-invoice.pdf",
                fileSize: 1000,
                kind: "invoice",
                number: "TEST-1",
                date: "2026-11-27",
                cached,
              },
            ],
          };
        } else if (url.pathname.endsWith("/documents/refresh")) {
          job = { status: "SUCCEEDED", error: null };
          data = {
            workerOnline: online,
            updatedAt: new Date().toISOString(),
            job,
            documents: [
              {
                id: "d".repeat(64),
                fileName: "synthetic-invoice.pdf",
                fileSize: 1000,
                kind: "invoice",
                number: "TEST-1",
                date: "2026-11-27",
                cached,
              },
            ],
          };
        } else if (url.pathname.endsWith("/open")) {
          fetchRequests++;
          if (!cached) {
            cacheTransfers++;
            cached = true;
            data = { status: "QUEUED" };
          } else
            data = {
              status: "READY",
              url: "https://pdf.example.invalid/fixture.pdf",
            };
        } else if (url.pathname.endsWith("/status"))
          data = {
            status: "READY",
            url: "https://pdf.example.invalid/fixture.pdf",
          };
        else if (url.origin === "https://pdf.example.invalid")
          return route.fulfill({
            status: 200,
            contentType: "text/plain",
            body: "Synthetic document response",
          });
        else {
          unexpected.push(request.method() + " " + url.pathname);
          status = 404;
        }
        return route.fulfill({
          status,
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
      const panel = page.getByRole("region", {
        name: "Fatura ve tahsilat belgeleri",
        exact: true,
      });
      await expect(panel).toBeVisible();
      assert.equal(metadataReads, 0);
      assert.equal(fetchRequests, 0);
      await panel
        .getByRole("button", { name: "Belgeleri göster", exact: true })
        .click();
      await expect(
        panel.getByText("synthetic-invoice.pdf", { exact: false }),
      ).toBeVisible();
      assert.equal(metadataReads, 1);
      assert.equal(fetchRequests, 0);
      let popupEvent = page.waitForEvent("popup");
      await panel
        .getByRole("button", { name: "PDF’yi aç", exact: true })
        .click();
      let popup = await popupEvent;
      await popup.waitForURL("https://pdf.example.invalid/fixture.pdf");
      await popup.close();
      assert.equal(cacheTransfers, 1);
      popupEvent = page.waitForEvent("popup");
      await panel
        .getByRole("button", { name: "PDF’yi aç", exact: true })
        .click();
      popup = await popupEvent;
      await popup.waitForURL("https://pdf.example.invalid/fixture.pdf");
      await popup.close();
      assert.equal(
        cacheTransfers,
        1,
        "Second open must reuse the cached document",
      );
      online = false;
      await panel.getByRole('button', {name:'Belge listesini yenile',exact:true}).click();
      await expect(panel.getByText('Yeni belgelere şu anda ulaşılamıyor. Hazır belgeleri açabilirsiniz.',{exact:true})).toBeVisible();
      await expect(panel.getByRole('button',{name:'PDF’yi aç',exact:true})).toBeEnabled();
      await panel.getByRole("button", { name: "Kapat", exact: true }).click();
      await panel
        .getByRole("button", { name: "Belgeleri göster", exact: true })
        .click();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpected, []);
      console.log(
        JSON.stringify({
          role,
          metadataOnlyBeforeOpen: true,
          firstTransfers: cacheTransfers,
          openRequests: fetchRequests,
          mobile: "passed",
          realPdfReads: 0,
        }),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
