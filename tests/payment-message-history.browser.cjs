// Isolated UI regression. All API traffic, including writes, uses synthetic fixtures.
// PLAYWRIGHT_MODULE=/path/to/playwright FRONTEND_URL=http://localhost:3000 node tests/payment-message-history.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000")
  .origin;
const key = "a".repeat(64);
const siblingKey = "b".repeat(64);
const projectChoices = [
  ["LA_JOYA", "La Joya"],
  ["LA_JOYA_PERLA", "La Joya Perla"],
  ["LA_JOYA_PERLA_II", "La Joya Perla II"],
  ["LAGOON_VERDE", "Lagoon Verde"],
  ["GECITKALE_1_ETAP", "Geçitkale 1. Etap"],
  ["UNKNOWN", "Other / unmatched"],
];
const artifactDirectory = process.env.PERFORMANCE_OUTPUT
  ? require("node:path").dirname(process.env.PERFORMANCE_OUTPUT)
  : "/private/tmp";
const mixedInstallments = [
  { sequence: 1, projectCode: "SALE-A01", paymentKind: "sale", amount: 1000 },
  { sequence: 2, projectCode: "KDV-A01", paymentKind: "vat", amount: 100 },
  {
    sequence: 3,
    projectCode: "TRAFO-A01",
    paymentKind: "transformer",
    amount: 50,
  },
].map((row) => ({
  ...row,
  dueDate: "2026-09-01",
  paid: 0,
  outstanding: row.amount,
  overdueDays: 28,
  status: "overdue",
}));
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Famagusta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const source = {
  database: "LOGO_DND",
  view: "L_223_ODEME_PLANI",
  generatedAt: new Date().toISOString(),
  asOf: today.format(new Date()),
  recordCount: 52,
  audit: {
    status: "review_required",
    checkedAt: new Date().toISOString(),
    financialChecks: "passed",
    reviewCaseCount: 1,
    excludedVatRows: 1,
  },
  freshness: { status: "fresh", retryAfterMs: null, maxAgeSeconds: 300 },
  authorizationSource: {
    view: "L_223_FATURA_VADE",
    status: "available",
    matchedCases: 26,
    unmatchedCases: 0,
    multipleCodeCases: 1,
    message: null,
  },
};
const identity = {
  customerCode: "SYNTHETIC-C01",
  unitCode: "SYNTHETIC-A01",
  currency: "GBP",
};
const assignees = [
  { id: "fixture-admin", name: "Synthetic Admin", role: "ADMIN" },
  {
    id: "fixture-accountant",
    name: "Synthetic Accountant",
    role: "ACCOUNTING",
  },
];
const base = {
  key,
  sourceReview: {
    status: "review_required",
    vat: [
      {
        currency: "GBP",
        excludedRows: 1,
        excludedOutstanding: 2030,
        hasReturnLink: true,
        hasCustomerChange: false,
      },
    ],
  },
  invoiceOk: { status: "matched", values: ["DND"], hasBlank: false },
  fullyPaid: false,
  projectGroup: "LA_JOYA",
  identity,
  customerName: "Synthetic Customer",
  unitName: "Synthetic Unit A1",
  customerNames: ["Synthetic Customer"],
  unitNames: ["Synthetic Unit A1"],
  projects: [{ code: "P1", name: "Synthetic Project" }],
  representatives: ["Synthetic Representative"],
  brokers: ["Synthetic Broker"],
  invoiceDates: ["2026-08-01"],
  authorization: {
    codes: ["AUTH/ONE", "AUTH-TWO"],
    status: "matched",
    hasBlank: true,
  },
  installmentCount: 2,
  incompleteRows: 0,
  amount: 2000,
  paid: 500,
  outstanding: 1500,
  overdueAmount: 500,
  overdueCount: 1,
  dueTodayAmount: 0,
  oldestDueDate: "2026-09-01",
  nextDueDate: "2026-12-01",
  overdueDays: 28,
  canTrack: true,
  trackingIssue: null,
  tracking: null,
  effectiveDueDate: "2026-09-01",
  trackingStatus: "overdue",
  trackingOverdueDays: 28,
};

async function main() {
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    for (const sales of [false, true]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        serviceWorkers: "block",
      });
      let item = structuredClone(base),
        history = [],
        mixedPaymentKinds = false,
        failNext = false;
      const writes = [],
        errors = [];
      function detail(selectedKey = key) {
        const installments = mixedPaymentKinds
          ? mixedInstallments
          : [
              {
                sequence: 1,
                projectCode: "P1",
                paymentKind: "sale",
                dueDate: "2026-09-01",
                amount: 1000,
                paid: 500,
                outstanding: 500,
                overdueDays: 28,
                status: "overdue",
              },
              {
                sequence: 2,
                projectCode: "P1",
                paymentKind: "sale",
                dueDate: "2026-12-01",
                amount: 1000,
                paid: 0,
                outstanding: 1000,
                overdueDays: 0,
                status: "upcoming",
              },
            ];
        const sibling = {
          ...structuredClone(base),
          key: siblingKey,
          sourceReview: null,
          identity: { ...identity, currency: "TL" },
          amount: 350,
          paid: 0,
          outstanding: 350,
          overdueAmount: 350,
          installmentCount: 1,
          overdueCount: 1,
          projects: [{ code: "DEPOZITO ELEKTRIK", name: "" }],
        };
        const siblingInstallments = [
          {
            sequence: 1,
            projectCode: "DEPOZITO ELEKTRIK",
            paymentKind: "deposit",
            dueDate: "2026-09-01",
            amount: 350,
            paid: 0,
            outstanding: 350,
            overdueDays: 28,
            status: "overdue",
          },
        ];
        return {
          source,
          canAssignFollowup: true,
          followupAssignees: [
            { id: "synthetic-okan", name: "Synthetic Okan", role: "SALES" },
          ],
          item: selectedKey === siblingKey ? sibling : item,
          installments:
            selectedKey === siblingKey ? siblingInstallments : installments,
          portfolio: {
            fullyPaid: false,
            cases: mixedPaymentKinds ? [item, sibling] : [item],
            installments: [
              ...installments.map((row) => ({
                ...row,
                caseKey: key,
                currency: "GBP",
              })),
              ...(mixedPaymentKinds
                ? siblingInstallments.map((row) => ({
                    ...row,
                    caseKey: siblingKey,
                    currency: "TL",
                  }))
                : []),
            ],
          },
          contact: {
            email: "synthetic@example.test",
            phone: "+905330001111",
            source: "Synthetic fixture",
            status: "matched",
          },
          history,
          historyHasMore: false,
          assignees,
        };
      }

      await context.addInitScript(
        ({ sales }) => {
          localStorage.setItem("accessToken", "isolated-message-history-token");
          localStorage.setItem(
            "user",
            JSON.stringify({
              id: "fixture-admin",
              role: sales ? "MANAGER" : "ADMIN",
              name: "Synthetic Admin",
            }),
          );
          localStorage.setItem("crm-locale", "en");
          localStorage.setItem("crm-theme", "light");
          window.__external = [];
          window.open = () => ({
            opener: null,
            closed: false,
            close() {
              this.closed = true;
            },
            location: {
              set href(value) {
                window.__external.push(value);
              },
            },
          });
        },
        { sales },
      );
      await context.routeWebSocket("**/*", (socket) => socket.close());
      await context.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          api = ["fetch", "xhr"].includes(req.resourceType());
        if (
          url.origin === origin &&
          (url.pathname.startsWith("/_next/") ||
            url.pathname.startsWith("/__nextjs") ||
            (!api && !url.pathname.startsWith("/api/")) ||
            req.headers().rsc === "1")
        )
          return route.continue();
        const headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "authorization,content-type",
        };
        if (req.method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        const path = url.pathname
          .replace(/^\/api(?=\/)/, "")
          .replace(/^\/sales-ledger/, "/payment-tracking");
        let body = {},
          status = 200;
        if (
          req.method() === "POST" &&
          path === `/payment-tracking/${key}/actions`
        ) {
          const action = req.postDataJSON();
          writes.push(action);
          if (failNext) {
            failNext = false;
            status = 503;
            body = { message: "Synthetic save failure" };
          } else {
            assert.equal(action.expectedVersion, item.tracking?.version || 0);
            const draft = history.find(
              (e) =>
                e.type === "message_draft" && e.message.id === action.messageId,
            );
            const message =
              action.type === "message_draft"
                ? {
                    id: action.messageId,
                    recipient: action.recipient,
                    subject: action.subject,
                  }
                : draft.message;
            history.unshift({
              id: `event-${history.length}`,
              type: action.type,
              message,
              body: action.type === "message_draft" ? action.body : draft.body,
              actorId: "fixture-admin",
              actorName: "Synthetic Admin",
              channel:
                action.type === "message_draft"
                  ? action.channel
                  : draft.channel,
              createdAt: new Date().toISOString(),
              previousDate: null,
              nextDate: null,
            });
            item.tracking = {
              key,
              version: (item.tracking?.version || 0) + 1,
              priority: "normal",
              trackingDate: null,
              assigneeId: null,
              assigneeName: null,
              updatedAt: new Date().toISOString(),
              updatedByName: "Synthetic Admin",
            };
            body = detail();
          }
        } else if (
          req.method() === "GET" &&
          path === `/payment-tracking/${key}`
        )
          body = detail();
        else if (path === "/notifications") body = [];
        else if (path === "/notifications/unread-count") body = { count: 0 };
        else if (path === "/auth/refresh")
          body = { accessToken: "isolated-message-history-token" };
        return route.fulfill({
          status,
          headers,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      const path = sales
        ? "/my-customer-accounts/"
        : "/finance/payment-tracking/";
      await page.goto(origin + path + key);
      await page
        .getByRole("button", { name: "WhatsApp payment reminder", exact: true })
        .click();
      let dialog = page.getByRole("dialog");
      const text = "Account reminder\n" + "Full text ".repeat(230);
      await dialog
        .getByRole("textbox", { name: "Message", exact: true })
        .fill(text);
      failNext = true;
      await dialog
        .getByRole("button", { name: "Open in WhatsApp", exact: true })
        .click();
      await dialog.getByRole("alert").waitFor();
      assert.equal(
        (await page.evaluate(() => window.__external)).length,
        0,
        "no navigation if persistence fails",
      );
      await dialog
        .getByRole("button", { name: "Open in WhatsApp", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "I sent it · save", exact: true })
        .waitFor();
      assert.equal(
        writes[0].messageId,
        writes[1].messageId,
        "retry keeps request ID",
      );
      assert.equal(history.length, 1);
      assert.equal(history[0].type, "message_draft");
      assert.equal(history[0].body, text);
      assert.equal((await page.evaluate(() => window.__external)).length, 1);
      assert.equal(
        await dialog
          .getByRole("textbox", { name: "Message", exact: true })
          .isDisabled(),
        true,
      );
      await dialog
        .getByRole("button", { name: "I sent it · save", exact: true })
        .click();
      await dialog
        .getByText("Recorded as sent · user confirmation.", { exact: true })
        .waitFor();
      assert.equal(history.length, 2);
      assert.equal(history[0].body, text);
      assert.equal(history[0].type, "message_sent");
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await page.reload();
      await page.getByText("Messages and history", { exact: false }).click();
      await page
        .getByText("Sent · user confirmation · WhatsApp", { exact: true })
        .waitFor();
      const entry = page
        .locator("li")
        .filter({ hasText: "Sent · user confirmation · WhatsApp" });
      await entry.getByText("View message", { exact: true }).click();
      assert((await entry.innerText()).includes(text));
      assert.equal(
        await page
          .getByRole("button", { name: "I sent it · save", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("button", { name: "Email draft", exact: true })
        .click();
      dialog = page.getByRole("dialog");
      await dialog
        .getByRole("textbox", { name: "Subject", exact: true })
        .fill("Unit A2 payment follow-up");
      await dialog
        .getByRole("textbox", { name: "Message", exact: true })
        .fill("Synthetic email body");
      await dialog
        .getByRole("button", { name: "Open in email app", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "I sent it · save", exact: true })
        .waitFor();
      assert.equal(history[0].message.subject, "Unit A2 payment follow-up");
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await page.reload();
      await page.getByText("Messages and history", { exact: false }).click();
      await page
        .getByRole("button", { name: "I sent it · save", exact: true })
        .click();
      await page
        .getByText("Sent · user confirmation · Email", { exact: true })
        .waitFor();
      assert.equal(history.length, 4);
      assert.equal(history[0].body, "Synthetic email body");
      assert.equal(
        await page
          .getByText("Message draft saved · Email", { exact: true })
          .count(),
        0,
        "confirmed draft is folded into the sent entry",
      );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: `/private/tmp/payment-message-history-${sales ? "sales" : "finance"}.png`,
      });
      console.log(
        `PASS ${sales ? "sales-ledger" : "payment-tracking"}: persistence failure, retry ID, full text, no auto-send claim, explicit confirmation, reload, email subject, shared history`,
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
