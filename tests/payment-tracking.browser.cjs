// Isolated UI regression. All API traffic, including writes, uses synthetic fixtures.
// PLAYWRIGHT_MODULE=/private/tmp/iso2026-browser-tools/node_modules/playwright FRONTEND_URL=http://localhost:3000 node tests/payment-tracking.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000")
  .origin;
const key = "a".repeat(64);
const siblingKey = "b".repeat(64);
const projectChoices = [
  ["LA_JOYA", "La Joya"], ["LA_JOYA_PERLA", "La Joya Perla"],
  ["LA_JOYA_PERLA_II", "La Joya Perla II"], ["LAGOON_VERDE", "Lagoon Verde"],
  ["GECITKALE_1_ETAP", "Geçitkale 1. Etap"], ["UNKNOWN", "Other / unmatched"],
];
const artifactDirectory = process.env.PERFORMANCE_OUTPUT
  ? require("node:path").dirname(process.env.PERFORMANCE_OUTPUT)
  : "/private/tmp";
const mixedInstallments = [
  { sequence: 1, projectCode: "SALE-A01", paymentKind: "sale", amount: 1000 },
  { sequence: 2, projectCode: "KDV-A01", paymentKind: "vat", amount: 100 },
  { sequence: 3, projectCode: "TRAFO-A01", paymentKind: "transformer", amount: 50 },
].map((row) => ({ ...row, dueDate: "2026-09-01", paid: 0, outstanding: row.amount, overdueDays: 28, status: "overdue" }));
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Famagusta", year: "numeric", month: "2-digit", day: "2-digit",
});
const source = {
  database: "LOGO_DND",
  view: "L_223_ODEME_PLANI",
  generatedAt: new Date().toISOString(),
  asOf: today.format(new Date()),
  recordCount: 52,
  audit: { status: "review_required", checkedAt: new Date().toISOString(), financialChecks: "passed", reviewCaseCount: 1, excludedVatRows: 1 },
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
    vat: [{ currency: "GBP", excludedRows: 1, excludedOutstanding: 2030, hasReturnLink: true, hasCustomerChange: false }],
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
  unallocatedCredit: { status: "clear", recordCount: 0 },
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
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    serviceWorkers: "block",
  });
  const requests = [],
    actions = [],
    errors = [],
    unexpected = [],
    cacheTimings = [];
  let item = structuredClone(base),
    history = [],
    conflictNext = false,
    failedSource = false,
    failedAudit = false,
    expireNextList = false,
    unavailableAuthorization = false,
    summaryMode = "normal",
    mixedPaymentKinds = false,
    mismatchedKind = false,
    projectFixture = false,
    mismatchedProject = false,
    invalidCurrencyTotal = false;
  let syncPosts = 0, syncPolls = 0;
  const syncState = { workerOnline: true, source: { id: 'batch-old', importedAt: '2026-10-23T09:00:00Z' }, job: null };
  const heldReads = [];
  function holdRead(path, method = "GET") {
    let started, release;
    const startedPromise = new Promise((resolve) => {
      started = resolve;
    });
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    heldReads.push({ path, method, started, pending });
    return { started: startedPromise, release };
  }
  function detail(selectedKey = key) {
    const installments = mixedPaymentKinds ? mixedInstallments : [
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
      ...structuredClone(base), key: siblingKey,
      sourceReview: null,
      identity: { ...identity, currency: "TL" },
      amount: 350, paid: 0, outstanding: 350, overdueAmount: 350,
      installmentCount: 1, overdueCount: 1,
      projects: [{ code: "DEPOZITO ELEKTRIK", name: "" }],
    };
    const siblingInstallments = [{
      sequence: 1, projectCode: "DEPOZITO ELEKTRIK", paymentKind: "deposit",
      dueDate: "2026-09-01", amount: 350, paid: 0, outstanding: 350,
      overdueDays: 28, status: "overdue",
    }];
    return {
      source,
      item: selectedKey === siblingKey ? sibling : item,
      installments: selectedKey === siblingKey ? siblingInstallments : installments,
      portfolio: {
        fullyPaid: false,
        cases: mixedPaymentKinds ? [item, sibling] : [item],
        installments: [
          ...installments.map((row) => ({ ...row, caseKey: key, currency: "GBP" })),
          ...(mixedPaymentKinds ? siblingInstallments.map((row) => ({ ...row, caseKey: siblingKey, currency: "TL" })) : []),
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
  try {
    await context.addInitScript(() => {
      localStorage.setItem("accessToken", "isolated-payment-tracking-token");
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "fixture-admin",
          role: "ADMIN",
          name: "Synthetic Admin",
        }),
      );
      localStorage.setItem("crm-locale", "en");
      localStorage.setItem("crm-theme", "light");
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        method = request.method();
      if (url.pathname.startsWith("/socket.io"))
        return route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: "1",
        });
      const api = ["fetch", "xhr"].includes(request.resourceType());
      if (
        url.origin === origin &&
        (url.pathname.startsWith("/_next/") ||
          url.pathname.startsWith("/__nextjs") ||
          (!api && !url.pathname.startsWith("/api/")) ||
          request.headers().rsc === "1")
      )
        return route.continue();
      const headers = {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "authorization,content-type",
      };
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
      let path = url.pathname.replace(/^\/api(?=\/)/, "");
      if (process.env.CLOSURE_ONLY === "true") path = path.replace(/^\/sales-ledger(?=\/|$)/, "/payment-tracking");
      if (path === '/finance-sync') {
        if (method === 'POST') {
          syncPosts++;
          syncState.job = syncPosts === 1
            ? { id: 'sync-1', status: 'RUNNING', stage: 'READING', errorCode: null }
            : { id: 'sync-2', status: 'FAILED', stage: 'FAILED', errorCode: 'SOURCE_ATTRIBUTES_UNMATCHED' };
        } else if (syncState.job?.status === 'RUNNING') {
          syncPolls++;
          if (syncPolls === 1) syncState.job.stage = 'VALIDATING';
          else {
            syncState.job = { ...syncState.job, status: 'SUCCEEDED', stage: 'SUCCEEDED', recordCount: 52 };
            syncState.source = { id: 'batch-new', importedAt: new Date().toISOString() };
            source.importedAt = syncState.source.importedAt;
          }
        }
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(syncState) });
      }
      let body,
        status = 200;
      if (path.startsWith("/payment-tracking"))
        requests.push({
          method,
          path,
          query: Object.fromEntries(url.searchParams),
        });
      const holdIndex = heldReads.findIndex((hold) => hold.path === path && hold.method === method);
      if (holdIndex >= 0) {
        const hold = heldReads.splice(holdIndex, 1)[0];
        hold.started();
        await hold.pending;
      }
      if (method === "GET" && path === "/payment-tracking" && expireNextList) {
        expireNextList = false;
        return route.fulfill({ status: 401, headers, contentType: "application/json", body: JSON.stringify({ message: "Synthetic expired token" }) });
      }
      if (method === "GET" && failedAudit && (path === "/payment-tracking" || [key, siblingKey].some((entry) => path === `/payment-tracking/${entry}`))) {
        return route.fulfill({ status: 503, headers, contentType: "application/json", body: JSON.stringify({
          statusCode: 503, code: "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID", message: "Synthetic source audit failed",
        }) });
      }
      if (method === "GET" && path === "/payment-tracking") {
        const activeAuthorization =
          url.searchParams.has("authorizationCode") ||
          ![null, "all"].includes(url.searchParams.get("authorizationState"));
        if (unavailableAuthorization && activeAuthorization) {
          status = 503;
          body = {
            statusCode: 503,
            code: "PAYMENT_AUTHORIZATION_UNAVAILABLE",
            message: "Synthetic authorization source unavailable",
          };
        } else if (failedSource) {
          status = 503;
          body = {
            statusCode: 503,
            message: "Synthetic payment source unavailable",
          };
        } else {
          const page = Number(url.searchParams.get("page") || 1),
            pageSize = Number(url.searchParams.get("pageSize") || 25);
          const allCurrencies = url.searchParams.get("currency") === "__ALL__";
          const currency = allCurrencies ? "GBP" : url.searchParams.get("currency") || "GBP",
            scope = url.searchParams.get("scope") || "actionable";
          const paymentKind = url.searchParams.get("paymentKind") || "all";
          const projectGroup = url.searchParams.get("projectGroup") || "";
          const projectRows = ["LA_JOYA", "LA_JOYA_PERLA", "LA_JOYA_PERLA", "LA_JOYA_PERLA_II", "LAGOON_VERDE", "GECITKALE_1_ETAP", "UNKNOWN"]
            .filter((group) => !projectGroup || group === projectGroup);
          const selectedInstallments = mixedInstallments.filter((row) => paymentKind === "all" || row.paymentKind === paymentKind);
          const selectedAmount = selectedInstallments.reduce((sum, row) => sum + row.amount, 0);
          const total = projectFixture ? projectRows.length : scope === "closed" ? 2 : mixedPaymentKinds ? (selectedInstallments.length ? 1 : 0) :
            summaryMode === "zero"
              ? 0
              : summaryMode !== "normal"
                ? 1
                : scope === "deferred"
                  ? 1
                  : currency === "EUR"
                    ? 4
                    : 26;
          const all = Array.from({ length: total }, (_, index) => ({
            ...structuredClone(item),
            projectGroup: projectFixture ? projectRows[index] : "LA_JOYA",
            ...(mixedPaymentKinds ? {
              amount: selectedAmount, paid: 0, outstanding: selectedAmount,
              overdueAmount: selectedAmount, overdueCount: selectedInstallments.length,
              installmentCount: selectedInstallments.length,
            } : {}),
            key: index === 0 ? key : String(index).padStart(64, "0"),
            customerName:
              index === 0
                ? "Synthetic Customer"
                : `Synthetic Customer ${index + 1}`,
            identity: { ...identity, currency },
            ...(currency === "EUR"
              ? {
                  amount: 1000,
                  paid: 200,
                  outstanding: 800,
                  overdueAmount: 200,
                }
              : {}),
            ...(summaryMode === "unknown"
              ? {
                  amount: null,
                  paid: null,
                  outstanding: null,
                  overdueAmount: null,
                  incompleteRows: 2,
                }
              : {}),
            ...(summaryMode === "incompleteKnown" ? { incompleteRows: 2 } : {}),
            trackingStatus:
              scope === "closed" ? "paid" : scope === "deferred" ? "deferred" : item.trackingStatus,
            ...(scope === "closed" ? {
              fullyPaid: true, paid: 2000, outstanding: 0, overdueAmount: 0,
              overdueCount: 0, oldestDueDate: null, effectiveDueDate: null,
            } : {}),
          }));
          body = {
            source: {
              ...source,
              authorizationSource: {
                ...source.authorizationSource,
                status: unavailableAuthorization ? "unavailable" : "available",
              },
            },
            filterOptions: {
              authorizationCodes: [
                { value: "AUTH/ONE", label: "AUTH/ONE", caseCount: 26 },
                { value: "AUTH-TWO", label: "AUTH-TWO", caseCount: 1 },
              ],
              representatives: [
                {
                  value: "Synthetic Representative",
                  label: "Synthetic Representative",
                  caseCount: 26,
                },
              ],
              brokers: [
                {
                  value: "Synthetic Broker",
                  label: "Synthetic Broker",
                  caseCount: 26,
                },
              ],
              customers: [
                {
                  value: identity.customerCode,
                  label: "Synthetic Customer · SYNTHETIC-C01",
                  caseCount: 26,
                },
              ],
              units: [
                {
                  value: identity.unitCode,
                  label: "Synthetic Unit A1 · SYNTHETIC-A01",
                  caseCount: 26,
                },
              ],
            },
            currencyMode: allCurrencies ? "all" : "single",
            selectedCurrency: allCurrencies || currency === "__NULL__" ? null : currency,
            selectedProjectGroup: mismatchedProject ? "LA_JOYA" : projectGroup,
            projectGroups: projectChoices.map(([value, label]) => ({
              value, label,
              caseCount: projectFixture ? (value === "LA_JOYA_PERLA" ? 2 : 1) : value === "LA_JOYA" ? total : 0,
            })),
            selectedInvoiceOk: url.searchParams.get("invoiceOk") || "all",
            invoiceOkOptions: ["DND", "GÜL", "KOZANSOY"].map((code) => ({ value: `value:${code}`, label: code, caseCount: code === "DND" ? total : 0 })).concat([{ value: "blank", label: "Boş", caseCount: 0 }, { value: "mixed", label: "Karma", caseCount: 0 }, { value: "unknown", label: "Bilinmiyor", caseCount: 0 }]),
            selectedPaymentKind: mismatchedKind ? "all" : paymentKind,
            currencies: [
              { value: "GBP", label: "GBP", recordCount: 26 },
              { value: "EUR", label: "EUR", recordCount: 4 },
              { value: "USD", label: "USD", recordCount: 2 },
              { value: "TL", label: "TL", recordCount: 3 },
              { value: null, label: "Belirsiz / Unknown", recordCount: 1 },
            ],
            projects: base.projects,
            assignees,
            summary: mixedPaymentKinds ? {
              closedCount: 0,
              openCount: total, outstanding: selectedAmount, overdueCount: total,
              overdueAmount: selectedAmount, actionableCount: total, actionableAmount: selectedAmount,
              deferredCount: 0, todayCount: 0, unassignedCount: total, incompleteRows: 0,
            } : {
              closedCount: 2,
              openCount: 26,
              outstanding: 39000,
              overdueCount: 26,
              overdueAmount: 13000,
              actionableCount: 25,
              actionableAmount: 37500,
              deferredCount: 1,
              todayCount: 0,
              unassignedCount: 26,
              incompleteRows: 0,
            },
            filteredSummary: {
              closedCount: scope === "closed" ? total : 0,
              openCount: all.filter((row) => (row.outstanding || 0) > 0).length,
              outstanding:
                summaryMode === "unknown"
                  ? null
                  : all.reduce((sum, row) => sum + (row.outstanding || 0), 0),
              overdueCount: all.filter((row) => (row.overdueAmount || 0) > 0)
                .length,
              overdueAmount:
                summaryMode === "unknown"
                  ? null
                  : all.reduce((sum, row) => sum + (row.overdueAmount || 0), 0),
              actionableCount: scope === "deferred" ? 0 : total,
              actionableAmount:
                summaryMode === "unknown"
                  ? null
                  : scope === "deferred"
                    ? 0
                    : all.reduce((sum, row) => sum + (row.outstanding || 0), 0),
              deferredCount: scope === "deferred" ? total : 0,
              todayCount: 0,
              unassignedCount: total,
              incompleteRows: all.reduce(
                (sum, row) => sum + row.incompleteRows,
                0,
              ),
            },
            orphanedTrackingCount: 0,
            rows: all.slice((page - 1) * pageSize, page * pageSize),
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          };
          const emptySummary = Object.fromEntries(Object.keys(body.summary).map((field) => [field, 0]));
          body.currencyBreakdown = body.currencies.map(({ value }) => ({
            currency: value,
            total: value === body.selectedCurrency && !allCurrencies ? total : 0,
            summary: value === body.selectedCurrency && !allCurrencies ? { ...body.summary } : { ...emptySummary },
            filteredSummary: value === body.selectedCurrency && !allCurrencies ? { ...body.filteredSummary } : { ...emptySummary },
          }));
          if (allCurrencies || currency === "__NULL__") {
            // Distinct currencies deliberately have unequal balances and counts.
            // Their sum is never a valid monetary total.
            const currencyFixtures = [
              { currency: "GBP", count: 26, amount: 2000, paid: 500, overdueAmount: 500 },
              { currency: "EUR", count: 4, amount: 1000, paid: 200, overdueAmount: 200 },
              { currency: "USD", count: 2, amount: 90, paid: 30, overdueAmount: 60 },
              { currency: "TL", count: 3, amount: 1000, paid: 100, overdueAmount: 700 },
              { currency: null, count: 1, amount: null, paid: null, overdueAmount: null },
            ];
            const combinedRows = [];
            body.currencyBreakdown = currencyFixtures.map((entry, group) => {
              const excludedUnknown = entry.currency === null &&
                (url.searchParams.has("overdueDaysMin") || url.searchParams.has("overdueDaysMax"));
              const count = !excludedUnknown && (allCurrencies || entry.currency === null) ? entry.count : 0;
              const rows = Array.from({ length: count }, (_, index) => ({
                ...structuredClone(base),
                key: group === 0 && index === 0 ? key : `${group + 1}${String(index).padStart(63, "0")}`,
                identity: { ...identity, currency: entry.currency },
                amount: entry.amount,
                paid: entry.paid,
                outstanding: entry.amount === null ? null : entry.amount - entry.paid,
                overdueAmount: entry.overdueAmount,
                incompleteRows: entry.currency === null ? 1 : 0,
                canTrack: entry.currency !== null,
              }));
              combinedRows.push(...rows);
              const outstanding = entry.amount === null ? null : (entry.amount - entry.paid) * count;
              const summary = count ? {
                ...emptySummary, openCount: entry.currency === null ? 0 : count,
                outstanding, overdueCount: entry.currency === null ? 0 : count,
                overdueAmount: entry.overdueAmount === null ? null : entry.overdueAmount * count,
                actionableCount: entry.currency === null ? 0 : count,
                actionableAmount: outstanding,
                unassignedCount: count, incompleteRows: entry.currency === null ? count : 0,
              } : { ...emptySummary };
              return { currency: entry.currency, total: count, summary, filteredSummary: { ...summary } };
            });
            body.summary = Object.fromEntries(Object.keys(emptySummary).map((field) => [field,
              ["outstanding", "overdueAmount", "actionableAmount"].includes(field) ? null :
                body.currencyBreakdown.reduce((sum, entry) => sum + entry.summary[field], 0),
            ]));
            body.filteredSummary = { ...body.summary };
            body.total = combinedRows.length;
            body.totalPages = Math.max(1, Math.ceil(body.total / pageSize));
            body.rows = combinedRows.slice((page - 1) * pageSize, page * pageSize);
          }
          if (invalidCurrencyTotal && allCurrencies) body.filteredSummary.overdueAmount = 16020;
        }
      } else if (method === "GET" && [key, siblingKey].some((entry) => path === `/payment-tracking/${entry}/statement`)) {
        body = detail(path.split("/").at(-2));
        if (body.item.unallocatedCredit?.status !== "clear") { status = 409; body = { code: "PAYMENT_UNALLOCATED_CREDIT", message: "Finance review required" }; }
      } else if (method === "GET" && [key, siblingKey].some((entry) => path === `/payment-tracking/${entry}`))
        body = detail(path.split("/").at(-1));
      else if (
        method === "POST" &&
        path === `/payment-tracking/${key}/actions`
      ) {
        const action = request.postDataJSON();
        actions.push(action);
        const version = item.tracking?.version || 0;
        if (conflictNext) {
          conflictNext = false;
          item.tracking = { ...item.tracking, version: version + 1 };
          status = 409;
          body = {
            statusCode: 409,
            code: "PAYMENT_TRACKING_VERSION_CONFLICT",
            message: "Synthetic conflict",
          };
        } else {
          assert.equal(
            action.expectedVersion,
            version,
            "Each action submits the current server version",
          );
          assert(
            !("outstanding" in action) && !("dueDate" in action),
            "Source financial fields are never mutated",
          );
          const tracking = item.tracking || {
            key,
            sourceIdentity: identity,
            trackingDate: null,
            assigneeId: null,
            assigneeName: null,
            priority: "normal",
            version: 0,
            updatedAt: source.generatedAt,
            updatedByName: "Synthetic Admin",
          };
          const previousDate = tracking.trackingDate;
          if (action.type === "defer") {
            assert(action.body.trim());
            tracking.trackingDate = action.trackingDate;
            item.effectiveDueDate = action.trackingDate;
            item.trackingStatus = "deferred";
          }
          if (action.type === "reset") {
            assert(action.body.trim());
            tracking.trackingDate = null;
            item.effectiveDueDate = base.oldestDueDate;
            item.trackingStatus = "overdue";
          }
          if (action.type === "assign") {
            tracking.assigneeId = action.assigneeId;
            tracking.assigneeName =
              assignees.find((entry) => entry.id === action.assigneeId)?.name ||
              null;
          }
          if (action.type === "priority") tracking.priority = action.priority;
          tracking.version = version + 1;
          item.tracking = tracking;
          history = [
            {
              id: `event-${actions.length}`,
              type: action.type,
              body: action.body,
              previousDate,
              nextDate: tracking.trackingDate,
              actorName: "Synthetic Admin",
              channel: action.channel || null,
              createdAt: source.generatedAt,
            },
            ...history,
          ];
          body = detail();
        }
      } else if (method === "POST" && path === "/auth/refresh")
        body = { accessToken: "isolated-payment-refreshed-access-token" };
      else if (method === "GET" && path === "/auth/me") body = { id: "fixture-admin", role: "ADMIN", name: "Synthetic Admin" };
      else if (method === "GET" && path === "/notifications") body = [];
      else if (method === "GET" && path === "/notifications/unread-count")
        body = { unread: 0 };
      else {
        unexpected.push(`${method} ${url.href}`);
        body = {};
      }
      await route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !/401|409|503/.test(message.text()))
        errors.push(message.text());
    });
    const main = page.locator("#crm-main-content");
    if (process.env.CLOSURE_ONLY === 'true') {
      projectChoices.push(['NEOCITY', 'Neocity']);
      item.invoiceOk = { status: 'matched', values: ['DND'], hasBlank: false };
      item.unallocatedCredit = { status: 'blocked', recordCount: 2 };
      await page.goto(`${origin}/my-customer-accounts`);
      const blockedRow = main.locator('tr[data-closure-blocked]').first();
      await blockedRow.waitFor();
      assert.match(await blockedRow.innerText(), /Unallocated credit · Actions blocked/);
      assert.equal(await blockedRow.locator('td').first().locator('a').count(), 0);
      await blockedRow.getByRole('button', { name: 'Synthetic Customer', exact: true }).click();
      const warningDialog = page.getByRole('alertdialog');
      await warningDialog.waitFor();
      assert.match(await warningDialog.innerText(), /Ms\. Tanem/);
      assert.match(await warningDialog.innerText(), /cannot send a debt notification or perform any action/);
      const warningBounds = await warningDialog.boundingBox();
      assert(warningBounds && warningBounds.x > 100 && warningBounds.y > 100, 'Warning dialog is centered in the viewport');
      await page.screenshot({ path: '/private/tmp/payment-closure-warning.png', animations: 'disabled' });
      await warningDialog.getByRole('button', { name: 'Understood' }).click();
      await warningDialog.waitFor({ state: 'hidden' });
      assert.equal(new URL(page.url()).pathname, '/my-customer-accounts');
      await blockedRow.locator('td').nth(1).click();
      await warningDialog.waitFor();
      await page.keyboard.press('Escape');
      await warningDialog.waitFor({ state: 'hidden' });
      for (const route of ['/finance/payment-tracking', '/my-customer-accounts']) {
        for (const status of ['blocked', 'unavailable']) {
          item.unallocatedCredit = { status, recordCount: status === 'blocked' ? 2 : null };
          await page.goto(`${origin}${route}/${key}`);
          await main.locator('[data-closure-warning]').waitFor();
          assert.equal(await main.getByRole('button', { name: 'Email draft', exact: true }).isDisabled(), true);
          assert.equal(await main.getByRole('button', { name: 'WhatsApp payment reminder', exact: true }).isDisabled(), true);
          assert.equal(await main.getByRole('button', { name: 'Download report', exact: true }).isDisabled(), true);
          assert.match(await main.locator('[data-closure-warning]').innerText(), status === 'blocked' ? /Ms\. Tanem/ : /could not be verified/);
          for (const name of ['Add note', 'Record contact']) {
            const button = main.getByRole('button', { name, exact: true, includeHidden: true });
            assert.equal(await button.isDisabled(), true);
          }
        }
        item.unallocatedCredit = { status: 'clear', recordCount: 0 };
        await page.goto(`${origin}${route}/${key}`);
        await main.getByRole('button', { name: 'Email draft', exact: true }).waitFor();
        assert.equal(await main.getByRole('button', { name: 'Email draft', exact: true }).isEnabled(), true);
        assert.equal(await main.locator('[data-closure-warning]').count(), 0);
      }
      assert.equal(unexpected.length, 0, unexpected.join('\n'));
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log('PASS: blocked sales rows are highlighted and open the Tanem dialog; finance and sales details block actions/exports; clear accounts remain usable.');
      return;
    }
    if (process.env.FINANCE_SYNC_ONLY === 'true') {
      await page.goto(`${origin}/finance/payment-tracking`);
      const button = main.getByRole('button', { name: 'Update Logo data', exact: true });
      await button.waitFor();
      const before = requests.length;
      await button.click();
      const busy = main.getByRole('button', { name: 'Updating…', exact: true });
      await busy.waitFor();
      assert.equal(await busy.isDisabled(), true);
      await main.getByText('Update completed', { exact: true }).waitFor({ timeout: 20000 });
      await page.waitForTimeout(500);
      assert.equal(syncPosts, 1);
      assert.ok(requests.slice(before).some(r => r.query.refresh === 'true'), 'Success must reload the report');
      const successfulBatch = syncState.source.id;
      await button.click();
      await main.getByText('Logo payment and invoice records do not match. Finance review required; previous data retained.', { exact: true }).waitFor();
      assert.equal(syncState.source.id, successfulBatch);
      assert.equal(await button.isEnabled(), true);
      assert.equal(unexpected.length, 0, unexpected.join('\n'));
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log('PASS: CRM trigger, disabled duplicate button, progress, success refresh and retryable failure.');
      return;
    }

    const filterToggle = () => main.getByRole("button", { name: /^(Filters|Filtreler)$/, exact: true });
    const management = () => main.locator("details[data-payment-management]");
    async function setFiltersOpen(open) {
      const toggle = filterToggle();
      await toggle.waitFor();
      if ((await toggle.getAttribute("aria-expanded")) !== String(open)) await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), String(open));
      const target = await toggle.getAttribute("aria-controls");
      assert(target, "The filter disclosure identifies its controlled panel");
      if (open) await page.locator(`[id="${target}"]`).waitFor({ state: "visible" });
    }
    const ensureFiltersOpen = () => setFiltersOpen(true);
    async function setManagementOpen(open) {
      const details = management();
      await details.waitFor({ state: "attached" });
      if ((await details.getAttribute("open") !== null) !== open) await details.locator(":scope > summary").click();
      assert.equal(await details.evaluate((element) => element.open), open);
    }
    const ensureManagementOpen = () => setManagementOpen(true);
    async function responseAfter(action, method = "GET") {
      const response = page.waitForResponse(
        (response) =>
          response.request().method() === method &&
          /^(?:\/api)?\/payment-tracking(?:\/|$)/.test(new URL(response.url()).pathname),
      );
      await Promise.all([action(), response]);
      await page.waitForFunction(
        () =>
          document
            .querySelector("#crm-main-content > div")
            ?.getAttribute("aria-busy") === "false",
      );
    }
    async function checkVisibleKpis() {
      await ensureManagementOpen();
      const cards = await main
        .locator('[aria-label="Follow-up statuses"] > button')
        .evaluateAll((buttons) =>
          buttons.map((button) => {
            const card = button.getBoundingClientRect();
            const count = button
              .querySelector("strong")
              .getBoundingClientRect();
            const label = button.querySelector("small").getBoundingClientRect();
            return {
              count: button.querySelector("strong").textContent,
              fits:
                card.height >= 110 &&
                count.height > 0 &&
                count.top >= card.top &&
                label.bottom <= card.bottom,
            };
          }),
        );
      assert.deepEqual(
        cards.map((card) => card.count),
        ["25", "26", "1", "0"],
      );
      assert(
        cards.every((card) => card.fits),
        "All KPI counts and descriptions fit inside their visible cards",
      );
    }
    await page.goto(`${origin}/finance/payment-tracking`);
    await main
      .getByRole("heading", { name: "Payment Tracking", exact: true })
      .waitFor();
    await main.locator("tbody tr").first().waitFor();
    assert.equal(
      main.locator("tbody tr") && (await main.locator("tbody tr").count()),
      25,
    );
    assert.equal(
      requests.filter((request) => request.path === "/payment-tracking").length,
      1,
      "One initial list request",
    );
    assert.equal(requests[0].query.pageSize, "25");
    assert.equal(requests[0].query.paymentKind, "sale", "Initial screen explicitly selects normal sales");
    assert.equal(await filterToggle().getAttribute("aria-expanded"), "false", "Filters start collapsed on a valid first load");
    assert.equal(await management().evaluate((element) => element.open), false, "Management summary starts collapsed");
    assert(await main.getByLabel("Search customer / unit", { exact: true }).isVisible(), "Search stays immediately available");
    assert.equal(await main.getByLabel("Currency", { exact: true }).isVisible(), false, "Optional selectors are initially hidden");
    assert.equal(await main.getByRole("group", { name: "Payment type", exact: true }).isVisible(), false, "Payment-type controls are initially hidden");
    const initialFirstRow = await main.locator("tbody tr").first().boundingBox();
    assert(initialFirstRow && initialFirstRow.y >= 0 && initialFirstRow.y + initialFirstRow.height <= 1050, "The first payment row fits above the desktop fold before disclosures are opened");
    const beforeDisclosures = requests.length;
    await main.getByLabel("Search customer / unit", { exact: true }).fill("Unapplied disclosure draft");
    await ensureFiltersOpen();
    await main.getByLabel("Follow-up status", { exact: true }).selectOption("open");
    await setFiltersOpen(false);
    await ensureManagementOpen();
    await setManagementOpen(false);
    await ensureFiltersOpen();
    assert.equal(await main.getByLabel("Search customer / unit", { exact: true }).inputValue(), "Unapplied disclosure draft", "Toggling panels preserves the search draft");
    assert.equal(await main.getByLabel("Follow-up status", { exact: true }).inputValue(), "open", "Toggling panels preserves unapplied selector drafts");
    assert.equal(requests.length, beforeDisclosures, "Opening and closing optional panels never queries the API");
    await main.getByLabel("Search customer / unit", { exact: true }).fill("");
    await main.getByLabel("Follow-up status", { exact: true }).selectOption("actionable");
    await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    const hiddenInvalidDate = main.getByLabel("Invoice date · From", { exact: true });
    await hiddenInvalidDate.fill("1700-01-01");
    await hiddenInvalidDate.locator("xpath=ancestor::fieldset[1]").getByRole("alert").waitFor();
    await setFiltersOpen(false);
    assert(await main.getByRole("button", { name: "Search", exact: true }).isEnabled(), "Visible search can reveal hidden validation errors");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await hiddenInvalidDate.waitFor({ state: "visible" });
    assert.equal(await filterToggle().getAttribute("aria-expanded"), "true", "Submitting a hidden invalid date opens its filter panel");
    assert.equal(requests.length, beforeDisclosures, "Hidden invalid dates are rejected without an API request");
    await hiddenInvalidDate.fill("");
    await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    await setFiltersOpen(false);
    const filteredTotal = main.getByRole("region", {
      name: "Filtered overdue payment total",
      exact: true,
    });
    async function checkFilteredTotal(amount, currency, total, overdue) {
      assert.equal(await filteredTotal.locator("strong").innerText(), amount);
      await filteredTotal.getByText(currency, { exact: true }).waitFor();
      assert.equal(
        await filteredTotal
          .getByText("Matching cases", { exact: true })
          .locator("..")
          .locator("dd")
          .innerText(),
        String(total),
      );
      assert.equal(
        await filteredTotal
          .getByText("Overdue cases", { exact: true })
          .locator("..")
          .locator("dd")
          .innerText(),
        String(overdue),
      );
    }
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    assert.equal(
      await main.locator("tbody tr").count(),
      25,
      "Total covers26matches, not only25renderedrows",
    );
    const reads = () =>
      requests.filter(
        (entry) => entry.method === "GET" && entry.path === "/payment-tracking",
      ).length;
    assert.equal(requests[0].query.invoiceOk, "value:DND", "Invoice OK defaults to DND, independent of blank authorization");
    await main.getByRole("columnheader", { name: "Invoice OK", exact: true }).waitFor();
    await ensureFiltersOpen();
    assert.equal(await main.getByLabel("Invoice OK", { exact: true }).inputValue(), "value:DND");
    assert.equal(requests.at(-1).query.invoiceOk, "value:DND");
    assert.equal(requests.at(-1).query.authorizationState, "blank");
    assert.equal(new URL(page.url()).searchParams.get("invoiceOk"), "value:DND");
    assert((await main.locator("tbody tr").first().innerText()).includes("DND"));
    await responseAfter(() => main.getByRole("button", { name: "Remove filter: Invoice OK · DND", exact: true }).click());
    assert.equal(requests.at(-1).query.invoiceOk, "all");
    assert.equal(await main.getByLabel("Invoice OK", { exact: true }).inputValue(), "all");
    await setFiltersOpen(false);
    const beforeLocale = reads();
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main
      .getByRole("heading", { name: "Ödeme Takip", exact: true })
      .waitFor();
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: `${artifactDirectory}/payment-simple-interface-desktop-tr.png`, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await filterToggle().getAttribute("aria-expanded"), "false");
    assert.equal(await management().evaluate((element) => element.open), false);
    assert(await main.getByLabel("Müşteri / daire ara", { exact: true }).isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Collapsed interface fits the mobile viewport");
    await main.evaluate((element) => element.scrollTo(0, 0));
    const firstMobileAmount = main.locator("tbody tr").first().locator("td").nth(1);
    assert((await firstMobileAmount.innerText()).includes("1.500,00"), "Outstanding balance immediately follows the customer column");
    const mobileAmountBox = await firstMobileAmount.boundingBox();
    assert(mobileAmountBox && mobileAmountBox.x >= 0 && mobileAmountBox.x + mobileAmountBox.width <= 390, "The first outstanding amount is visible without horizontal scrolling on mobile");
    // Let the desktop-to-mobile shell transition settle before the viewport capture.
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.waitForTimeout(300);
    const mobileToolbarAudit = await page.evaluate(() => {
      const selectors = [...document.querySelectorAll('select[aria-label="Language"]')];
      const headers = [...new Set(selectors.map((element) => element.closest("header")))].filter(Boolean);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        languageControls: selectors.length,
        applicationHeaders: headers.length,
        headerRects: headers.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
        applicationHeaderAtBottom: document.elementsFromPoint(190, 780).some((element) => element.matches("header") && element.querySelector('select[aria-label="Language"]')),
      };
    });
    assert.equal(mobileToolbarAudit.languageControls, 1, "Mobile DOM contains one application language control");
    assert.equal(mobileToolbarAudit.applicationHeaders, 1, "Mobile DOM contains one application toolbar");
    assert.equal(mobileToolbarAudit.applicationHeaderAtBottom, false, "Application toolbar is not duplicated at the bottom of the viewport");
    await page.screenshot({ path: `${artifactDirectory}/payment-simple-interface-mobile-tr.png`, fullPage: false, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await main
      .getByRole("heading", { name: "Payment Tracking", exact: true })
      .waitFor();
    assert.equal(
      reads(),
      beforeLocale,
      "Language changes do not reload payment source data",
    );
    if (process.env.DISCLOSURE_SMOKE_ONLY === "1") {
      assert.deepEqual(errors, [], "No unexpected browser errors in the compact interface");
      assert.deepEqual(unexpected, [], "Every business or external request remains mocked");
      const focusedResult = {
        status: "PASS",
        scope: "Compact interface and changed disclosure/date-validation/column interactions only",
        filtersAndManagementInitiallyCollapsed: "PASS",
        firstPaymentRowAboveDesktopFold: "PASS",
        disclosureToggleNoRequestsOrDraftLoss: "PASS",
        hiddenInvalidDateRevealsPanelWithoutRequest: "PASS",
        mobileOutstandingColumnImmediatelyVisible: "PASS",
        compactTotalAndMatchingCounts: "PASS",
        localeChangeWithoutSourceRequest: "PASS",
        mobileNoOverflow: "PASS",
        mobileToolbarAudit,
        mockedRequests: requests.length,
        mockedActions: actions.length,
        allRequestsMocked: true,
        screenshots: ["payment-simple-interface-desktop-tr.png", "payment-simple-interface-mobile-tr.png"],
      };
      if (process.env.PERFORMANCE_OUTPUT) require("node:fs").writeFileSync(process.env.PERFORMANCE_OUTPUT, JSON.stringify(focusedResult, null, 2));
      console.log(`PASS compact payment interface: collapsed panels, draft/no-request toggles, hidden invalid date recovery, above-fold rows, mobile amount visibility (${requests.length} mocked requests)`);
      return;
    }
    await checkVisibleKpis();
    // A customer/unit has GBP sale/VAT/transformer and a separate TL obligation.
    // List filters must never hide any of these when opening the detail.
    mixedPaymentKinds = true;
    item = { ...structuredClone(base), amount: 1150, paid: 0, outstanding: 1150, overdueAmount: 1150, overdueCount: 3, installmentCount: 3 };
    source.generatedAt = new Date().toISOString();
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    await checkFilteredTotal("1,000.00", "GBP", 1, 1);
    mismatchedKind = true;
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    await main.getByRole("alert").filter({ hasText: "The payment type could not be verified" }).waitFor();
    await checkFilteredTotal("1,000.00", "GBP", 1, 1);
    mismatchedKind = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());
    await ensureFiltersOpen();
    const kindButtons = main.getByRole("group", { name: "Payment type", exact: true });
    assert.equal(await kindButtons.getByRole("button", { name: "Normal sale", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await main.getByLabel("Logo record code", { exact: true }).isVisible(), false, "Advanced source codes start collapsed");
    for (const [label, kind, amount] of [["VAT", "vat", "100.00"], ["Transformer", "transformer", "50.00"], ["All payments", "all", "1,150.00"], ["Normal sale", "sale", "1,000.00"]]) {
      await responseAfter(() => kindButtons.getByRole("button", { name: label, exact: true }).click());
      assert.equal(requests.at(-1).query.paymentKind, kind);
      assert.equal(new URL(page.url()).searchParams.get("paymentKind"), kind);
      await checkFilteredTotal(amount, "GBP", 1, 1);
    }
    await page.goto(`${origin}/finance/payment-tracking?project=P1`);
    await main.locator("tbody tr").first().waitFor();
    assert.equal(requests.at(-1).query.paymentKind, "all", "Legacy source-code links retain their all-types scope");
    assert.equal(requests.at(-1).query.project, "P1");
    await checkFilteredTotal("1,150.00", "GBP", 1, 1);
    await openCacheCase();
    assert.equal(await main.getByLabel("Installment type", { exact: true }).inputValue(), "all");
    await responseAfter(() => main.getByRole("link", { name: "Payment cases", exact: true }).click());
    await ensureFiltersOpen();
    assert.equal(new URL(page.url()).searchParams.get("paymentKind"), "all");
    assert.equal(new URL(page.url()).searchParams.get("project"), "P1");
    await responseAfter(() => kindButtons.getByRole("button", { name: "Normal sale", exact: true }).click());
    assert.equal(requests.at(-1).query.project, undefined);
    await checkFilteredTotal("1,000.00", "GBP", 1, 1);
    if (!(await main.getByLabel("Logo record code", { exact: true }).isVisible()))
      await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    await main.getByLabel("Logo record code", { exact: true }).selectOption("P1");
    await responseAfter(() => main.getByRole("button", { name: "Apply", exact: true }).click());
    assert.equal(requests.at(-1).query.project, "P1");
    await responseAfter(() => kindButtons.getByRole("button", { name: "VAT", exact: true }).click());
    assert.equal(requests.at(-1).query.project, undefined, "A quick type switch clears the old source-code restriction");
    assert.equal(requests.at(-1).query.page, "1");
    await openCacheCase();
    assert.equal(await main.getByLabel("Installment type", { exact: true }).inputValue(), "all", "A VAT-filtered list opens every payment type");
    assert.equal(await main.getByLabel("Installment currency", { exact: true }).inputValue(), "all");
    assert.equal(await main.locator("tbody tr").count(), 4, "All three GBP rows and the TL row are visible, including repeated sequence 1");
    await main.locator("tbody tr").getByText("VAT", { exact: true }).waitFor();
    const fullSummary = main.getByRole("heading", { name: "All payments in this case", exact: true }).locator("xpath=ancestor::section");
    assert((await fullSummary.innerText()).includes("1,150.00"), "Detail summary retains sale, VAT and transformer amounts");
    assert((await fullSummary.innerText()).includes("350.00"), "TL balance has a separate summary");
    assert(!(await fullSummary.innerText()).includes("1,500.00"), "Different currencies are never added together");
    const sourceReview = main.locator("[data-source-review]");
    await sourceReview.waitFor({ state: "visible" });
    assert.equal(await sourceReview.getAttribute("open"), null, "VAT review starts as a compact disclosure");
    await sourceReview.locator(":scope > summary").click();
    await sourceReview.getByText("Earlier VAT records for this unit need a return or transfer review. The amounts below are excluded from current balances and messages.", { exact: true }).waitFor();
    assert((await sourceReview.innerText()).includes("2,030.00 GBP"), "Excluded prior VAT is available for accounting review");
    assert((await sourceReview.innerText()).includes("Return linked"), "The return relationship is explicit");
    assert(!(await fullSummary.innerText()).includes("2,030.00") && !(await fullSummary.innerText()).includes("3,180.00"), "Prior VAT review is not part of current GBP debt");
    await sourceReview.locator(":scope > summary").click();
    const tlRow = main.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "TL", exact: true }) });
    assert.equal(await tlRow.count(), 1);
    assert((await tlRow.innerText()).includes("350.00"));
    await main.getByLabel("Installment currency", { exact: true }).selectOption("TL");
    assert.equal(await main.locator("tbody tr").count(), 1);
    await main.getByLabel("Installment currency", { exact: true }).selectOption("all");
    await main.getByLabel("Installment type", { exact: true }).selectOption("vat");
    assert.equal(await main.locator("tbody tr").count(), 1);
    await main.getByLabel("Installment type", { exact: true }).selectOption("all");
    async function openCurrencyCase(currency, targetKey) {
      await Promise.all([
        page.waitForResponse((response) => new URL(response.url()).pathname === `/payment-tracking/${targetKey}` && response.request().method() === "GET"),
        page.waitForURL(`**/finance/payment-tracking/${targetKey}?*`),
        main.getByRole("link", { name: `Open ${currency} follow-up`, exact: true }).click(),
      ]);
      await main.getByRole("heading", { name: "Selected currency follow-up", exact: true }).waitFor();
    }
    await openCurrencyCase("TL", siblingKey);
    assert.equal(new URL(page.url()).pathname.split("/").at(-1), siblingKey);
    assert.equal(await main.locator("tbody tr").count(), 4, "Switching the tracked currency retains the full portfolio");
    const followSummary = main.getByRole("heading", { name: "Selected currency follow-up", exact: true }).locator("xpath=ancestor::section");
    assert((await followSummary.innerText()).includes("350.00"));
    await openCurrencyCase("GBP", key);
    assert((await followSummary.innerText()).includes("1,150.00"));
    await main.getByText("Follow-up actions apply to every payment in this customer/unit/currency case; the installment type selection does not narrow the action.", { exact: true }).waitFor();
    await main.getByRole("button", { name: "Email draft", exact: true }).click();
    const mixedDraft = page.getByRole("dialog");
    await mixedDraft.getByText("The draft includes all payment types in this customer/unit/currency case. The installment type filter does not narrow the draft amount.", { exact: true }).waitFor();
    assert((await mixedDraft.getByLabel("Message", { exact: true }).inputValue()).includes("1,150.00 GBP"));
    await mixedDraft.getByRole("button", { name: "Close draft", exact: true }).click();
    const beforeReminder = actions.length;
    await main.getByRole("button", { name: "WhatsApp payment reminder", exact: true }).click();
    await mixedDraft.waitFor();
    const reminderBody = mixedDraft.getByLabel("Message", { exact: true });
    const reminderScope = mixedDraft.getByLabel("Message scope", { exact: true });
    const reminderLanguage = mixedDraft.getByLabel("Message language", { exact: true });
    assert.equal(await reminderScope.inputValue(), "portfolio");
    const allCurrencyReminder = await reminderBody.inputValue();
    assert(allCurrencyReminder.includes("1,150.00 GBP") && allCurrencyReminder.includes("350.00 TL"), "WhatsApp starts with all currencies, separately");
    assert(!allCurrencyReminder.includes("2,030.00") && !allCurrencyReminder.includes("3,180.00"), "Excluded VAT review amounts never enter the WhatsApp debt template");
    assert(allCurrencyReminder.includes("September 2026"), "Overdue installments identify their month and year");
    const overdueDays = Math.round((Date.parse(source.asOf) - Date.parse("2026-09-01")) / 86400000);
    assert(allCurrencyReminder.includes(`${overdueDays}`), "Reminder delay uses original due date and source as-of day");
    assert(allCurrencyReminder.includes("VAT") && allCurrencyReminder.includes("Transformer"), "Monthly debt retains payment-kind context");
    assert(!allCurrencyReminder.includes("1,500.00"), "Currencies are never added together");
    await reminderScope.selectOption("selected");
    assert(!(await reminderBody.inputValue()).includes("350.00 TL"), "Clean scope changes regenerate just the selected currency");
    const editedReminder = "Merhaba Çağrı,\nÖdeme hakkında görüşelim. £ & + # ?";
    await reminderBody.fill(editedReminder);
    await reminderScope.selectOption("portfolio");
    await reminderLanguage.selectOption("tr");
    assert.equal(await reminderBody.inputValue(), editedReminder, "Changing scope or language never discards a manually edited draft");
    await mixedDraft.getByRole("button", { name: "Regenerate template", exact: true }).click();
    const trReminder = await reminderBody.inputValue();
    assert(trReminder.includes("Eylül 2026") && trReminder.includes("1.150,00 GBP") && trReminder.includes("350,00 TL"));
    assert.equal(await mixedDraft.getByRole("button", { name: "Open in WhatsApp", exact: true }).isEnabled(), true, "The complete Unicode/multiline template can be recorded and opened");
    await reminderBody.fill("x".repeat(4001));
    assert.equal((await reminderBody.inputValue()).length, 4001, "Long messages are not silently truncated");
    assert.equal(await mixedDraft.getByRole("button", { name: "Open in WhatsApp", exact: true }).isDisabled(), true, "Overlong messages cannot open an incomplete reminder");
    await mixedDraft.getByRole("button", { name: "Regenerate template", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('dialog textarea')?.scrollTop === 0);
    await page.keyboard.press("Escape");
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main.getByRole("button", { name: "WhatsApp ödeme hatırlatması", exact: true }).click();
    await mixedDraft.getByLabel("Mesaj", { exact: true }).waitFor();
    await page.screenshot({ path: `${artifactDirectory}/payment-whatsapp-desktop.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await mixedDraft.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), "Reminder dialog fits mobile width");
    await page.screenshot({ path: `${artifactDirectory}/payment-whatsapp-mobile.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.keyboard.press("Escape");
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    assert.equal(actions.length, beforeReminder, "Reminder generation and editing never send a message or save a contact event");
    await main.getByLabel("Installment type", { exact: true }).selectOption("all");
    assert.equal(await main.locator("tbody tr").count(), 4);
    assert((await fullSummary.innerText()).includes("1,150.00"));
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main.getByRole("heading", { name: "Dosyanın tüm ödemeleri", exact: true }).waitFor();
    await page.screenshot({ path: `${artifactDirectory}/payment-portfolio-desktop-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "All-currency detail fits mobile viewport");
    await page.screenshot({ path: `${artifactDirectory}/payment-portfolio-mobile-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await responseAfter(() => main.getByRole("link", { name: "Payment cases", exact: true }).click());
    await ensureFiltersOpen();
    assert.equal(new URL(page.url()).searchParams.get("paymentKind"), "vat");
    await checkFilteredTotal("100.00", "GBP", 1, 1);
    await responseAfter(() => main.getByRole("button", { name: "Clear", exact: true }).click());
    assert.equal(requests.at(-1).query.paymentKind, "sale", "Reset returns to normal sales");
    await checkFilteredTotal("1,000.00", "GBP", 1, 1);
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main.getByRole("button", { name: "Normal satış", exact: true }).waitFor();
    const simpleFilters = main.getByRole("region", { name: "Dosya filtreleri", exact: true });
    await ensureManagementOpen();
    const simpleFilterTop = await simpleFilters.evaluate((element) => element.getBoundingClientRect().top);
    const kpiTop = await main.getByRole("region", { name: "Takip durumları", exact: true }).evaluate((element) => element.getBoundingClientRect().top);
    assert(simpleFilterTop < kpiTop, "Simple filters appear before the KPI panel");
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: `${artifactDirectory}/payment-simple-desktop-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await main.getByLabel("Takip durumu", { exact: true }).evaluate((element) => element.getBoundingClientRect().width > 290), "Mobile basic fields use a full-width column");
    assert.equal(await main.getByLabel("Para birimi", { exact: true }).locator("option:checked").innerText(), "GBP", "Currency labels do not display unfiltered source record counts");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Simple filters do not overflow mobile viewport");
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: `${artifactDirectory}/payment-simple-mobile-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    mixedPaymentKinds = false;
    item = structuredClone(base);
    source.generatedAt = new Date().toISOString();
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);

    await responseAfter(() => main.getByRole("button", { name: "Fully paid (2)", exact: true }).click());
    assert.equal(requests.at(-1).query.scope, "closed");
    assert.equal(new URL(page.url()).searchParams.get("scope"), "closed");
    assert.equal(await main.locator("tbody tr").count(), 2, "Closed cases are available through a secondary shortcut");
    assert.equal(await main.locator("tbody tr").filter({ hasText: "Fully paid" }).count(), 2);
    await checkFilteredTotal("0.00", "GBP", 2, 0);
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main.getByRole("button", { name: "Tamamen ödenenler (2)", exact: true }).waitFor();
    await page.screenshot({ path: `${artifactDirectory}/payment-closed-desktop-tr.png`, fullPage: true, animations: "disabled" });
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await responseAfter(() => main.getByRole("button", { name: "Back to open balances", exact: true }).click());
    assert.equal(requests.at(-1).query.scope, "open");
    await responseAfter(() => main.getByRole("button", { name: "Clear", exact: true }).click());
    assert.equal(requests.at(-1).query.scope, "actionable", "Open follow-ups retain the initial priority");

    projectFixture = true;
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    const projectSelect = main.getByLabel("Project", { exact: true });
    assert(await projectSelect.isVisible(), "Main projects are available without advanced filters");
    for (const [, label] of projectChoices.slice(0, 5)) {
      assert((await projectSelect.locator("option").allTextContents()).some((text) => text.includes(label)));
    }
    await responseAfter(() => projectSelect.selectOption("LA_JOYA_PERLA"));
    assert.equal(requests.at(-1).query.projectGroup, "LA_JOYA_PERLA");
    assert.equal(requests.at(-1).query.paymentKind, "sale");
    assert.equal(await main.locator("tbody tr").count(), 2);
    await checkFilteredTotal("1,000.00", "GBP", 2, 2);
    const beforeCollapseApplied = reads();
    await setFiltersOpen(false);
    assert.equal(reads(), beforeCollapseApplied, "Hiding active filters does not issue a new request");
    assert.equal(new URL(page.url()).searchParams.get("projectGroup"), "LA_JOYA_PERLA", "Collapsed filters remain in the applied URL");
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    assert.equal(requests.at(-1).query.projectGroup, "LA_JOYA_PERLA", "Refresh preserves filters while their panel is collapsed");
    await checkFilteredTotal("1,000.00", "GBP", 2, 2);
    assert.equal(await filterToggle().getAttribute("aria-expanded"), "false", "Refreshing does not open a valid filter panel");
    await page.reload();
    await main.locator("tbody tr").first().waitFor();
    await ensureFiltersOpen();
    assert.equal(await projectSelect.inputValue(), "LA_JOYA_PERLA", "Project selection survives reload");
    await openCacheCase();
    assert.equal(await main.getByLabel("Installment type", { exact: true }).inputValue(), "all");
    await responseAfter(() => main.getByRole("link", { name: "Payment cases", exact: true }).click());
    await ensureFiltersOpen();
    assert.equal(await projectSelect.inputValue(), "LA_JOYA_PERLA", "Project selection survives detail return");
    await responseAfter(() => kindButtons.getByRole("button", { name: "VAT", exact: true }).click());
    assert.equal(requests.at(-1).query.projectGroup, "LA_JOYA_PERLA", "Changing payment type keeps the main project");
    if (!(await main.getByLabel("Logo record code", { exact: true }).isVisible()))
      await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    await main.getByLabel("Logo record code", { exact: true }).selectOption("P1");
    await responseAfter(() => main.getByRole("button", { name: "Apply", exact: true }).click());
    await responseAfter(() => projectSelect.selectOption("LA_JOYA_PERLA_II"));
    assert.equal(requests.at(-1).query.project, undefined, "Changing main project clears a stale raw unit-code filter");
    assert.equal(requests.at(-1).query.paymentKind, "vat");
    assert.equal(requests.at(-1).query.page, "1");
    assert.equal(await main.locator("tbody tr").count(), 1, "Perla II is distinct from Perla");
    mismatchedProject = true;
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    await main.getByRole("alert").filter({ hasText: /project.*verified/i }).waitFor();
    mismatchedProject = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main.getByLabel("Proje", { exact: true }).waitFor();
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({ path: `${artifactDirectory}/payment-project-desktop-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Project selector fits mobile viewport");
    assert(await main.getByLabel("Proje", { exact: true }).evaluate((element) => element.getBoundingClientRect().width > 290));
    await page.screenshot({ path: `${artifactDirectory}/payment-project-mobile-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await responseAfter(() => projectSelect.selectOption("UNKNOWN"));
    assert.equal(requests.at(-1).query.projectGroup, "UNKNOWN");
    await responseAfter(() => projectSelect.selectOption(""));
    assert.equal(requests.at(-1).query.projectGroup || "", "");
    assert.equal(await main.locator("tbody tr").count(), 7, "All projects includes unmatched records");
    projectFixture = false;
    await responseAfter(() => main.getByRole("button", { name: "Clear", exact: true }).click());
    assert.equal(await projectSelect.inputValue(), "");
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);

    const beforeSameQuery = reads();
    await main.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForTimeout(150);
    assert.equal(reads(), beforeSameQuery, "An unchanged query does not issue another GET");

    async function openCacheCase() {
      await main.getByRole("link", { name: "Synthetic Customer", exact: true }).click();
      await main.getByRole("heading", { name: "All payments in this case", exact: true }).waitFor();
    }
    async function returnWithHeldRead() {
      const pending = holdRead("/payment-tracking");
      const startedAt = Date.now();
      await main.getByRole("link", { name: "Payment cases", exact: true }).click();
      await pending.started;
      return { ...pending, startedAt };
    }
    await openCacheCase();
    const cachedReturn = await returnWithHeldRead();
    await main.locator("tbody tr").first().waitFor({ timeout: 1500 });
    cacheTimings.push({ name: "detail-to-list-held-api", visibleMs: Date.now() - cachedReturn.startedAt });
    assert(cacheTimings.at(-1).visibleMs < 1500, "Cached rows appear before the held API completes");
    assert.equal(await main.locator("tbody tr").count(), 25);
    await main.getByText("Refreshing in the background; current results remain available.", { exact: true }).waitFor();
    assert.equal(await main.locator(":scope > div").getAttribute("aria-busy"), "false");
    await responseAfter(() => cachedReturn.release());

    // A successful write invalidates every list scope, including the return URL.
    await openCacheCase();
    await main.getByLabel("Case note", { exact: true }).fill("Synthetic cache invalidation note");
    await responseAfter(() => main.getByRole("button", { name: "Add note", exact: true }).click(), "POST");
    const afterMutation = await returnWithHeldRead();
    assert.equal(await main.locator("tbody tr").count(), 0, "Mutation prevents cached workflow state from reappearing");
    await responseAfter(() => afterMutation.release());

    // Even the same user's replacement token cannot reuse the previous session cache.
    await openCacheCase();
    await page.evaluate(() => localStorage.setItem("accessToken", "isolated-payment-tracking-next-session"));
    const afterSession = await returnWithHeldRead();
    assert.equal(await main.locator("tbody tr").count(), 0, "Token changes isolate cached responses");
    await responseAfter(() => afterSession.release());

    // Cached rows are provisional; a foreground error restores the closed error state.
    await openCacheCase();
    failedSource = true;
    const failedCachedReturn = await returnWithHeldRead();
    await main.locator("tbody tr").first().waitFor({ timeout: 1500 });
    await responseAfter(() => failedCachedReturn.release());
    await main.getByRole("alert").filter({ hasText: "Synthetic payment source unavailable" }).waitFor();
    assert.equal(await main.locator("tbody tr").count(), 0, "Failed cache validation does not retain financial results");
    failedSource = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());

    failedAudit = true;
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    await main.getByRole("alert").filter({ hasText: "Synthetic source audit failed" }).waitFor();
    assert.equal(await main.locator("tbody tr").count(), 0, "A source audit failure clears previously visible list rows");
    assert.equal(await filteredTotal.count(), 0, "A source audit failure clears previous money totals");
    failedAudit = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());

    await page.evaluate(() => localStorage.setItem("refreshToken", "isolated-refresh-token"));
    expireNextList = true;
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    assert.equal(await main.locator("tbody tr").count(), 25, "401 → token refresh → 200 keeps the successful response");
    assert.equal(await main.getByRole("alert").count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("accessToken")), "isolated-payment-refreshed-access-token");

    await ensureFiltersOpen();
    const beforeAgedApply = reads();
    await page.evaluate(() => {
      window.paymentTestOriginalNow = Date.now;
      Date.now = () => window.paymentTestOriginalNow() + 31_000;
    });
    await responseAfter(() => main.getByRole("button", { name: "Apply", exact: true }).click());
    assert.equal(reads(), beforeAgedApply + 1, "An unchanged query reloads after source data ages");
    await page.evaluate(() => {
      Date.now = window.paymentTestOriginalNow;
      delete window.paymentTestOriginalNow;
    });

    source.freshness = {
      status: "refreshing",
      retryAfterMs: 1,
      maxAgeSeconds: 300,
    };
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh source", exact: true }).click(),
    );
    assert.equal(requests.at(-1).query.refresh, "true");
    await main
      .getByText(
        "Refreshing in the background; current results remain available.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await main.locator("time").first().getAttribute("datetime"),
      source.generatedAt,
    );
    const pendingList = holdRead("/payment-tracking");
    const pollStartedAt = Date.now();
    await main
      .getByLabel("Search customer / unit", { exact: true })
      .fill("Unapplied draft preserved");
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    await pendingList.started;
    assert(
      Date.now() - pollStartedAt >= 2700,
      "Poll never runs faster than the 3-second minimum",
    );
    assert.equal(
      requests.at(-1).query.refresh,
      undefined,
      "Background polls never force source refresh",
    );
    assert.equal(
      await main.locator(":scope > div").getAttribute("aria-busy"),
      "false",
      "A held background poll does not block the page",
    );
    assert(
      await main
        .getByRole("button", { name: "Apply", exact: true })
        .isEnabled(),
    );
    assert(await main.getByLabel("Currency", { exact: true }).isEnabled());
    assert.equal(await main.locator("tbody tr").count(), 25);
    source.freshness = {
      status: "fresh",
      retryAfterMs: null,
      maxAgeSeconds: 300,
    };
    source.generatedAt = new Date().toISOString();
    const pollResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith("/payment-tracking"),
    );
    pendingList.release();
    await pollResponse;
    await page.waitForFunction(
      (generatedAt) =>
        document
          .querySelector("#crm-main-content time")
          ?.getAttribute("datetime") === generatedAt,
      source.generatedAt,
    );
    assert.equal(
      await main
        .getByLabel("Search customer / unit", { exact: true })
        .inputValue(),
      "Unapplied draft preserved",
    );
    assert.equal(
      await main
        .getByText(
          "Refreshing in the background; current results remain available.",
          { exact: true },
        )
        .count(),
      0,
    );
    source.freshness = { status: "stale", retryAfterMs: 1, maxAgeSeconds: 300 };
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh source", exact: true }).click(),
    );
    await main
      .getByText("Refresh failed. Showing the last successful data.", {
        exact: true,
      })
      .waitFor();
    failedSource = true;
    await page.waitForResponse(
      (response) =>
        response.status() === 503 &&
        new URL(response.url()).pathname.endsWith("/payment-tracking"),
    );
    assert.equal(
      await main.locator("tbody tr").count(),
      25,
      "Poll API errors retain the last rows",
    );
    assert(
      await main
        .getByRole("button", { name: "Apply", exact: true })
        .isEnabled(),
    );
    assert.equal(
      await main.locator("time").first().getAttribute("datetime"),
      source.generatedAt,
      "An error cannot fabricate a new success timestamp",
    );
    failedSource = false;
    source.freshness = {
      status: "refreshing",
      retryAfterMs: 1,
      maxAgeSeconds: 300,
    };
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh source", exact: true }).click(),
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const beforeHidden = reads();
    await page.waitForTimeout(3200);
    assert.equal(reads(), beforeHidden, "Hidden pages do not poll");
    const outdatedPoll = holdRead("/payment-tracking");
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await outdatedPoll.started;
    source.freshness = {
      status: "fresh",
      retryAfterMs: null,
      maxAgeSeconds: 300,
    };
    await main
      .getByLabel("Search customer / unit", { exact: true })
      .fill("Newer filter wins");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    outdatedPoll.release();
    assert.equal(
      new URL(page.url()).searchParams.get("q"),
      "Newer filter wins",
      "Filter change supersedes the old in-flight poll",
    );
    assert.equal(
      await main
        .getByLabel("Search customer / unit", { exact: true })
        .inputValue(),
      "Newer filter wins",
    );
    await responseAfter(() =>
      main.getByRole("button", { name: "Clear", exact: true }).click(),
    );
    await responseAfter(() =>
      main.getByRole("button", { name: "Next", exact: true }).click(),
    );
    assert.equal(requests.at(-1).query.page, "2");
    assert.equal(await main.locator("tbody tr").count(), 1);
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    const currencyRead = holdRead("/payment-tracking");
    const currencyUpdate = responseAfter(() =>
      main.getByLabel("Currency", { exact: true }).selectOption("EUR"),
    );
    await currencyRead.started;
    await filteredTotal
      .getByText(
        "Updating results. The amount below belongs to the previous successful results.",
        { exact: true },
      )
      .waitFor();
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    assert.equal(await filteredTotal.getAttribute("aria-busy"), "true");
    currencyRead.release();
    await currencyUpdate;
    assert.equal(requests.at(-1).query.currency, "EUR");
    assert.equal(requests.at(-1).query.page, "1");
    await checkFilteredTotal("800.00", "EUR", 4, 4);
    await ensureManagementOpen();
    const currencySummary = main
      .locator("section")
      .filter({
        has: page.getByRole("heading", {
          name: "Follow-up by currency",
          exact: true,
        }),
      });
    assert(
      (await currencySummary.innerText()).includes("3,200.00"),
      "Top balances use scope-filtered summary",
    );
    failedSource = true;
    await responseAfter(() =>
      main.getByLabel("Currency", { exact: true }).selectOption("GBP"),
    );
    await filteredTotal
      .getByText(
        "The latest request did not complete. The amount below is from the last successful results, not a confirmed total for new filters.",
        { exact: true },
      )
      .waitFor();
    await checkFilteredTotal("800.00", "EUR", 4, 4);
    failedSource = false;
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh source", exact: true }).click(),
    );
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    // A draft survives a quick project/currency change; only monetary bounds
    // lose their meaning when a currency changes. Days remain valid.
    await main.getByLabel("Search customer / unit", { exact: true }).fill("Across currencies");
    await responseAfter(() => main.getByLabel("Project", { exact: true }).selectOption("LA_JOYA"));
    assert.equal(requests.at(-1).query.q, "Across currencies");
    if (!(await main.getByLabel("Source overdue days · Minimum", { exact: true }).isVisible())) {
      await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    }
    await main.getByLabel("Source overdue days · Minimum", { exact: true }).fill("14");
    await main.getByLabel("Case outstanding balance · Minimum", { exact: true }).fill("100");
    await main.getByLabel("Follow-up status", { exact: true }).selectOption("all");
    await responseAfter(() => main.getByLabel("Currency", { exact: true }).selectOption("__ALL__"));
    assert.equal(requests.at(-1).query.currency, "__ALL__");
    assert.equal(requests.at(-1).query.balanceMin, undefined, "Changing currency clears only money bounds");
    assert.equal(requests.at(-1).query.overdueDaysMin, "14", "Currency-independent day range is preserved");
    assert.equal(requests.at(-1).query.q, "Across currencies");
    assert.equal(requests.at(-1).query.projectGroup, "LA_JOYA");
    assert.equal(await main.getByLabel("Case outstanding balance · Minimum", { exact: true }).isDisabled(), true);
    await responseAfter(() => main.getByRole("button", { name: /^Remove filter: Source overdue days/ }).click());
    assert.equal(requests.at(-1).query.overdueDaysMin, undefined);
    const multiCurrencyTotal = await filteredTotal.innerText();
    for (const value of ["13,000.00", "800.00", "120.00", "2,100.00", "GBP", "EUR", "USD", "TL"]) {
      assert(multiCurrencyTotal.includes(value), `All-currency overdue total retains ${value}`);
    }
    assert(!multiCurrencyTotal.includes("16,020.00"), "Currencies are never summed into one monetary total");
    assert.equal(await filteredTotal.getByText("Matching cases", { exact: true }).locator("..").locator("dd").innerText(), "36");
    assert.equal(await main.locator("tbody tr").count(), 25);
    await responseAfter(() => main.getByRole("button", { name: "Next", exact: true }).click());
    assert.equal(requests.at(-1).query.currency, "__ALL__");
    assert.equal(await main.locator("tbody tr").count(), 11);
    for (const value of ["GBP", "EUR", "USD", "TL"]) {
      assert((await main.locator("tbody").innerText()).includes(value), `Each visible amount has a currency context: ${value}`);
    }
    assert((await filteredTotal.innerText()).includes("13,000.00"), "Per-currency totals cover every page");
    invalidCurrencyTotal = true;
    await responseAfter(() => main.getByRole("button", { name: "Refresh source", exact: true }).click());
    await main.getByRole("alert").filter({ hasText: /currenc/i }).waitFor();
    assert(!(await filteredTotal.innerText()).includes("16,020.00"), "Invalid mixed-currency amount never replaces confirmed totals");
    invalidCurrencyTotal = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());
    await responseAfter(() => main.getByRole("button", { name: "Previous", exact: true }).click());
    await main.locator("tbody tr").first().getByRole("link").first().click();
    await main.getByRole("heading", { name: "Selected currency follow-up", exact: true }).waitFor();
    await main.getByRole("link", { name: "Payment cases", exact: true }).click();
    await main.getByRole("heading", { name: "Payment Tracking", exact: true }).waitFor();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("currency") === "__ALL__");
    await ensureFiltersOpen();
    assert.equal(await main.getByLabel("Currency", { exact: true }).inputValue(), "__ALL__");
    await responseAfter(() => main.getByLabel("Currency", { exact: true }).selectOption("__NULL__"));
    assert.equal(requests.at(-1).query.currency, "__NULL__", "Unknown currency is distinct from all currencies");
    await checkFilteredTotal("—", "Unspecified currency", 1, 0);
    await responseAfter(() => main.getByLabel("Currency", { exact: true }).selectOption("__ALL__"));
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main.getByLabel("Para birimi", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${artifactDirectory}/payment-all-currencies-desktop-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    await main.getByLabel("Para birimi", { exact: true }).scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "All-currency filters fit mobile");
    await page.screenshot({ path: `${artifactDirectory}/payment-all-currencies-mobile-tr.png`, fullPage: true, animations: "disabled" });
    await main.getByRole("region", { name: "Filtrelenen toplam gecikmiş ödeme", exact: true }).scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Separate currency totals fit mobile");
    await page.screenshot({ path: `${artifactDirectory}/payment-all-currencies-totals-mobile-tr.png`, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await responseAfter(() => main.getByLabel("Currency", { exact: true }).selectOption("GBP"));
    await responseAfter(() => main.getByRole("button", { name: "Clear", exact: true }).click());
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    for (const mode of ["zero", "unknown", "incompleteKnown"]) {
      summaryMode = mode;
      await responseAfter(() =>
        main
          .getByRole("button", { name: "Refresh source", exact: true })
          .click(),
      );
      if (mode === "zero") {
        await checkFilteredTotal("0.00", "GBP", 0, 0);
        assert.equal(await main.locator("tbody tr").count(), 0);
      } else {
        await checkFilteredTotal(
          mode === "unknown" ? "—" : "500.00",
          "GBP",
          1,
          mode === "unknown" ? 0 : 1,
        );
        await filteredTotal
          .getByText("Known overdue amount", { exact: true })
          .waitFor();
        assert(
          (await filteredTotal.innerText()).includes(
            "Unknown amounts are not zero",
          ),
        );
      }
    }
    summaryMode = "normal";
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh source", exact: true }).click(),
    );
    await checkFilteredTotal("13,000.00", "GBP", 26, 26);
    await main.getByLabel("Search customer / unit").fill("Synthetic");
    if (!(await main.getByLabel("Logo record code", { exact: true }).isVisible()))
      await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    await main.getByLabel("Logo record code", { exact: true }).selectOption("P1");
    await main
      .getByLabel("Assignee", { exact: true })
      .selectOption("unassigned");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    assert.equal(requests.at(-1).query.q, "Synthetic");
    assert.equal(requests.at(-1).query.project, "P1");
    assert.equal(requests.at(-1).query.assignee, "unassigned");
    await ensureManagementOpen();
    await responseAfter(() =>
      main
        .getByRole("button", { name: "Deferred 1 View cases", exact: true })
        .click(),
    );
    assert.equal(requests.at(-1).query.scope, "deferred");
    assert.equal(new URL(page.url()).searchParams.get("scope"), "deferred");
    await checkFilteredTotal("500.00", "GBP", 1, 1);
    assert(
      (await currencySummary.innerText()).includes("1,500.00"),
      "Status scope is included in top balances",
    );
    await checkVisibleKpis();
    await filteredTotal.screenshot({
      path: "/private/tmp/payment-tracking-filtered-total-desktop.png",
      animations: "disabled",
    });
    await responseAfter(() =>
      main
        .getByRole("button", { name: "Outstanding · sort", exact: true })
        .click(),
    );
    assert.equal(requests.at(-1).query.sortBy, "outstanding");
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({
      path: "/private/tmp/payment-tracking-list-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await checkVisibleKpis();
    await filteredTotal.screenshot({
      path: "/private/tmp/payment-tracking-filtered-total-mobile.png",
      animations: "disabled",
    });
    assert(
      await main
        .getByRole("combobox", { name: "Currency", exact: true })
        .evaluate((element) => element.getBoundingClientRect().width >= 130),
      "Selected currency remains legible on mobile",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Mobile list has no document overflow",
    );
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({
      path: "/private/tmp/payment-tracking-list-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 1050 });
    // Advanced filters persist across page/sort/back/reload within the selected payment type.
    if (!(await main.getByLabel("Authorization mapping", { exact: true }).isVisible()))
      await main.locator("summary").filter({ hasText: "Advanced filters" }).click();
    await main
      .getByLabel("Authorization code", { exact: true })
      .selectOption("code:AUTH/ONE");
    await main
      .getByLabel("Authorization mapping", { exact: true })
      .selectOption("mixed");
    await responseAfter(() => main
      .getByLabel("Sales representative", { exact: true })
      .selectOption("Synthetic Representative"));
    await main
      .getByLabel("Broker", { exact: true })
      .selectOption("Synthetic Broker");
    await main
      .getByLabel("Customer code", { exact: true })
      .selectOption(identity.customerCode);
    await main
      .getByLabel("Unit code", { exact: true })
      .selectOption(identity.unitCode);
    await main
      .getByLabel("Follow-up status", { exact: true })
      .selectOption("open");
    await main
      .getByLabel("Oldest open due date · From", { exact: true })
      .fill("2026-09-30");
    await main
      .getByLabel("Oldest open due date · To", { exact: true })
      .fill("2026-09-01");
    assert(
      await main
        .getByRole("button", { name: "Apply", exact: true })
        .isDisabled(),
      "Reversed dates cannot request data",
    );
    await main
      .getByLabel("Oldest open due date · From", { exact: true })
      .fill("2026-09-01");
    await main
      .getByLabel("Oldest open due date · To", { exact: true })
      .fill("2026-09-30");
    await main
      .getByLabel("Current follow-up date · From", { exact: true })
      .fill("2026-09-01");
    await main
      .getByLabel("Current follow-up date · To", { exact: true })
      .fill("2026-10-30");
    await main
      .getByLabel("Invoice date · From", { exact: true })
      .fill("2026-08-01");
    await main
      .getByLabel("Invoice date · To", { exact: true })
      .fill("2026-08-31");
    await main
      .getByLabel("Source overdue days · Minimum", { exact: true })
      .fill("0");
    await main
      .getByLabel("Source overdue days · Maximum", { exact: true })
      .fill("30");
    await main
      .getByLabel("Case outstanding balance · Minimum", { exact: true })
      .fill("0");
    await main
      .getByLabel("Case outstanding balance · Maximum", { exact: true })
      .fill("2000");
    await main
      .getByLabel("Case overdue amount · Minimum", { exact: true })
      .fill("0");
    await main
      .getByLabel("Case overdue amount · Maximum", { exact: true })
      .fill("1000");
    const beforeInvalid = requests.length;
    const applyButton = main.getByRole("button", {
      name: "Apply",
      exact: true,
    });
    const amountBound = main.getByLabel("Case overdue amount · Maximum", {
      exact: true,
    });
    for (const value of ["01", "1000000000000000", "1000.0000001"]) {
      await amountBound.fill(value);
      assert(
        await applyButton.isDisabled(),
        `Invalid API amount format rejected: ${value}`,
      );
    }
    for (const value of ["0", "0.000001", "999999999999999.999999"]) {
      await amountBound.fill(value);
      assert(
        await applyButton.isEnabled(),
        `API amount boundary accepted: ${value}`,
      );
    }
    await amountBound.fill("1000");
    const daysBound = main.getByLabel("Source overdue days · Maximum", {
      exact: true,
    });
    for (const value of ["01", "10000000", "30.0"]) {
      await daysBound.fill(value);
      assert(
        await applyButton.isDisabled(),
        `Invalid API day format rejected: ${value}`,
      );
    }
    await daysBound.fill("9999999");
    assert(await applyButton.isEnabled(), "Maximum API day boundary accepted");
    await daysBound.fill("30");
    const dateFrom = main.getByLabel("Invoice date · From", { exact: true });
    const dateTo = main.getByLabel("Invoice date · To", { exact: true });
    assert.equal(await dateFrom.getAttribute("min"), "1753-01-01");
    assert.equal(await dateTo.getAttribute("max"), "9998-12-31");
    await dateFrom.fill("1752-12-31");
    assert(
      await applyButton.isDisabled(),
      "Dates before the SQL calendar boundary are rejected",
    );
    await dateFrom.fill("1753-01-01");
    assert(await applyButton.isEnabled(), "Minimum API date accepted");
    await dateTo.fill("9999-01-01");
    assert(
      await applyButton.isDisabled(),
      "Dates after the API calendar boundary are rejected",
    );
    await dateTo.fill("9998-12-31");
    assert(await applyButton.isEnabled(), "Maximum API date accepted");
    await dateFrom.fill("2026-08-01");
    await dateTo.fill("2026-08-31");
    assert.equal(
      requests.length,
      beforeInvalid,
      "Range boundary checks do not call the API",
    );
    await main
      .getByLabel("Payment status", { exact: true })
      .selectOption("partial");
    await main
      .getByLabel("Local tracking record", { exact: true })
      .selectOption("none");
    await main
      .getByLabel("Local follow-up date record", { exact: true })
      .selectOption("none");
    await main
      .getByLabel("Source data", { exact: true })
      .selectOption("complete");
    await main
      .getByLabel("Case overdue amount · Maximum", { exact: true })
      .fill("1e3");
    assert(
      await main
        .getByRole("button", { name: "Apply", exact: true })
        .isDisabled(),
      "Scientific notation is rejected",
    );
    assert.equal(
      requests.length,
      beforeInvalid,
      "Invalid drafts never request data",
    );
    await main
      .getByLabel("Case overdue amount · Maximum", { exact: true })
      .fill("1000");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    const combined = {
      authorizationCode: "AUTH/ONE",
      authorizationState: "mixed",
      representative: "Synthetic Representative",
      broker: "Synthetic Broker",
      customer: identity.customerCode,
      unit: identity.unitCode,
      scope: "open",
      dueFrom: "2026-09-01",
      dueTo: "2026-09-30",
      followUpFrom: "2026-09-01",
      followUpTo: "2026-10-30",
      invoiceFrom: "2026-08-01",
      invoiceTo: "2026-08-31",
      overdueDaysMin: "0",
      overdueDaysMax: "30",
      balanceMin: "0",
      balanceMax: "2000",
      overdueAmountMin: "0",
      overdueAmountMax: "1000",
      paymentState: "partial",
      trackingRecord: "none",
      deferral: "none",
      dataQuality: "complete",
    };
    const assertCombined = () => {
      for (const [field, value] of Object.entries(combined))
        assert.equal(requests.at(-1).query[field], value, field);
    };
    assertCombined();
    await main
      .getByRole("button", {
        name: "Remove filter: Case outstanding balance · 0 – 2000",
        exact: true,
      })
      .waitFor();
    assert(
      (await main.locator("tbody tr").first().innerText()).includes("1,500.00"),
      "Case totals are unchanged by matching invoice/code records",
    );
    assert.equal(
      await main
        .getByLabel("Authorization code", { exact: true })
        .locator("option")
        .count(),
      4,
      "Other filters do not remove the blank choice or source code options",
    );
    await responseAfter(() =>
      main.getByRole("button", { name: "Next", exact: true }).click(),
    );
    assertCombined();
    assert.equal(requests.at(-1).query.page, "2");
    await responseAfter(() => page.goBack());
    await ensureFiltersOpen();
    assertCombined();
    assert.equal(requests.at(-1).query.page, "1");
    await responseAfter(() => page.reload());
    await ensureFiltersOpen();
    assertCombined();
    assert.equal(
      await main
        .getByLabel("Case outstanding balance · Minimum", { exact: true })
        .inputValue(),
      "0",
    );
    await responseAfter(() =>
      main
        .getByLabel("Sort", { exact: true })
        .selectOption("overdueAmount:desc"),
    );
    assertCombined();
    assert.equal(requests.at(-1).query.sortBy, "overdueAmount");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    await main
      .locator("summary")
      .filter({ hasText: "Advanced filters" })
      .scrollIntoViewIfNeeded();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Expanded filters do not overflow mobile viewport",
    );
    await page.screenshot({
      path: "/private/tmp/payment-tracking-filters-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "light"),
    );
    await page.setViewportSize({ width: 1440, height: 1050 });
    await responseAfter(() =>
      main
        .getByRole("button", {
          name: "Remove filter: Authorization code · AUTH/ONE",
          exact: true,
        })
        .click(),
    );
    assert.equal(requests.at(-1).query.authorizationCode, undefined);
    assert.equal(
      requests.at(-1).query.representative,
      "Synthetic Representative",
    );
    assert.equal(requests.at(-1).query.balanceMin, "0");
    await main
      .getByLabel("Case outstanding balance · Maximum", { exact: true })
      .fill("1e3");
    await responseAfter(() =>
      main.getByRole("button", { name: "Clear", exact: true }).click(),
    );
    assert.equal(requests.at(-1).query.balanceMin, undefined);
    assert.equal(requests.at(-1).query.authorizationState, "all");
    assert.equal(
      await main
        .getByLabel("Case outstanding balance · Maximum", { exact: true })
        .inputValue(),
      "",
    );
    // Explicit detail back link carries the applied query, including exact code values.
    await main
      .getByLabel("Authorization code", { exact: true })
      .selectOption("code:AUTH/ONE");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    const authorizationSelect = main.getByLabel("Authorization code", {
      exact: true,
    });
    await authorizationSelect.selectOption("blank");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    assert.equal(requests.at(-1).query.authorizationState, "blank");
    assert.equal(
      requests.at(-1).query.authorizationCode,
      undefined,
      "Blank replaces a previously selected real code",
    );
    assert.equal(
      new URL(page.url()).searchParams.has("authorizationCode"),
      false,
    );
    await responseAfter(() => page.reload());
    await ensureFiltersOpen();
    assert.equal(
      await authorizationSelect.inputValue(),
      "blank",
      "Blank choice survives reload",
    );
    assert.equal(requests.at(-1).query.authorizationState, "blank");
    await authorizationSelect.selectOption("code:AUTH/ONE");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    assert.equal(
      requests.at(-1).query.authorizationState,
      "all",
      "Selecting a code clears the incompatible blank state",
    );
    assert.equal(
      requests.at(-1).query.authorizationCode,
      "AUTH/ONE",
      "Only the raw code reaches the API",
    );
    await authorizationSelect.selectOption("blank");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    await authorizationSelect.selectOption("");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    assert.equal(
      requests.at(-1).query.authorizationState,
      "all",
      "All clears the special blank state",
    );
    assert.equal(requests.at(-1).query.authorizationCode, undefined);
    await authorizationSelect.selectOption("code:AUTH/ONE");
    if (
      !(await main
        .getByLabel("Authorization mapping", { exact: true })
        .isVisible())
    )
      await main
        .locator("summary")
        .filter({ hasText: "Advanced filters" })
        .click();
    await main
      .getByLabel("Authorization mapping", { exact: true })
      .selectOption("blank");
    assert.equal(
      await authorizationSelect.inputValue(),
      "blank",
      "Advanced blank selection also clears a drafted real code",
    );
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    assert.equal(requests.at(-1).query.authorizationState, "blank");
    assert.equal(requests.at(-1).query.authorizationCode, undefined);
    await authorizationSelect.selectOption("code:AUTH/ONE");
    await responseAfter(() =>
      main.getByRole("button", { name: "Apply", exact: true }).click(),
    );
    const returnUrl = new URL(
      await main
        .getByRole("link", { name: "Synthetic Customer", exact: true })
        .getAttribute("href"),
      origin,
    );
    assert.equal(
      new URLSearchParams(returnUrl.searchParams.get("returnTo")).get(
        "authorizationCode",
      ),
      "AUTH/ONE",
    );
    await main
      .getByRole("link", { name: "Synthetic Customer", exact: true })
      .click();
    await main
      .getByRole("heading", { name: "All payments in this case", exact: true })
      .waitFor();
    assert.equal(
      new URL(
        await main
          .getByRole("link", { name: "Payment cases", exact: true })
          .getAttribute("href"),
        origin,
      ).searchParams.get("authorizationCode"),
      "AUTH/ONE",
    );
    await main
      .getByText("AUTH/ONE · AUTH-TWO · also has blank records", {
        exact: true,
      })
      .waitFor();
    const sourcePanel = main.locator("section").filter({
      has: page.getByRole("heading", {
        name: "All payments in this case",
        exact: true,
      }),
    });
    assert((await sourcePanel.innerText()).includes("500.00"));
    failedAudit = true;
    await Promise.all([
      page.waitForResponse((response) => response.status() === 503 && new URL(response.url()).pathname === `/payment-tracking/${key}`),
      main.getByRole("button", { name: "Refresh", exact: true }).click(),
    ]);
    await main.getByRole("alert").filter({ hasText: "Synthetic source audit failed" }).waitFor();
    assert.equal(await sourcePanel.count(), 0, "A source audit failure clears the previous detail portfolio");
    assert.equal(await main.locator("[data-source-review]").count(), 0, "A failed audit does not retain a stale review notice");
    assert.equal(await main.getByRole("button", { name: "WhatsApp payment reminder", exact: true }).count(), 0, "A failed audit cannot produce a draft from old amounts");
    failedAudit = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());
    await sourcePanel.waitFor({ state: "visible" });
    assert((await sourcePanel.innerText()).includes("500.00"), "A successful audit retry restores source amounts");
    source.freshness = {
      status: "refreshing",
      retryAfterMs: 1,
      maxAgeSeconds: 300,
    };
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh", exact: true }).click(),
    );
    assert.equal(
      requests.at(-1).query.refresh,
      "true",
      "Detail explicit refresh requests source refresh",
    );
    const pendingDetail = holdRead(`/payment-tracking/${key}`);
    await pendingDetail.started;
    assert.equal(
      requests.at(-1).query.refresh,
      undefined,
      "Detail background poll uses a normal GET",
    );
    assert(
      await main
        .getByRole("button", { name: "Email draft", exact: true })
        .isEnabled(),
      "Background polling does not block case actions",
    );
    source.freshness = {
      status: "fresh",
      retryAfterMs: null,
      maxAgeSeconds: 300,
    };
    await main
      .getByLabel("New follow-up date", { exact: true })
      .fill("2026-10-10");
    assert(
      await main
        .getByRole("button", { name: "Defer follow-up", exact: true })
        .isDisabled(),
      "A reason is mandatory",
    );
    await main
      .getByLabel("Reason · required", { exact: true })
      .fill("Synthetic promise to pay next week");
    await responseAfter(
      () =>
        main
          .getByRole("button", { name: "Defer follow-up", exact: true })
          .click(),
      "POST",
    );
    assert.equal(actions.at(-1).trackingDate, "2026-10-10");
    pendingDetail.release();
    assert.equal(item.overdueAmount, 500);
    assert.equal(item.oldestDueDate, "2026-09-01");
    assert(
      (await sourcePanel.innerText()).includes("500.00"),
      "Source overdue amount remains visible after deferral",
    );
    await main.getByLabel("Date action", { exact: true }).selectOption("reset");
    await main
      .getByLabel("Reason · required", { exact: true })
      .fill("Synthetic return to original schedule");
    await responseAfter(
      () =>
        main
          .getByRole("button", {
            name: "Restore original due date",
            exact: true,
          })
          .click(),
      "POST",
    );
    assert.equal(item.tracking.trackingDate, null);

    conflictNext = true;
    await main
      .getByLabel("Case note", { exact: true })
      .fill("Preserve this unsaved synthetic note");
    await responseAfter(
      () => main.getByRole("button", { name: "Add note", exact: true }).click(),
      "POST",
    );
    assert.equal(
      await main.getByLabel("Case note", { exact: true }).inputValue(),
      "Preserve this unsaved synthetic note",
    );
    assert(
      await main
        .getByRole("button", { name: "Add note", exact: true })
        .isDisabled(),
    );
    await responseAfter(() =>
      main
        .getByRole("button", { name: "Reload latest case", exact: true })
        .click(),
    );
    await responseAfter(
      () => main.getByRole("button", { name: "Add note", exact: true }).click(),
      "POST",
    );
    assert.equal(
      await main.getByLabel("Case note", { exact: true }).inputValue(),
      "",
    );
    await main
      .getByLabel("Case owner", { exact: true })
      .selectOption("fixture-accountant");
    await responseAfter(
      () =>
        main.getByRole("button", { name: "Save owner", exact: true }).click(),
      "POST",
    );
    await responseAfter(
      () =>
        main
          .getByRole("button", { name: "Mark as high priority", exact: true })
          .click(),
      "POST",
    );
    assert.equal(item.tracking.assigneeId, "fixture-accountant");
    assert.equal(item.tracking.priority, "high");

    const beforeDraft = actions.length;
    await main
      .getByRole("button", { name: "Email draft", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert(
      (
        await dialog.getByLabel("Message", { exact: true }).inputValue()
      ).includes("500.00 GBP"),
    );
    assert(
      !(
        await dialog.getByLabel("Message", { exact: true }).inputValue()
      ).includes("1,500.00"),
      "Future installments are not described as overdue",
    );
    await dialog
      .getByLabel("Recipient email", { exact: true })
      .fill("edited@example.test");
    assert.equal(await dialog.getByRole("button", { name: "Open in email app", exact: true }).isEnabled(), true);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    await main.getByRole("button", { name: "WhatsApp payment reminder", exact: true }).click();
    await dialog.waitFor();
    await dialog
      .getByLabel("Phone · with country code", { exact: true })
      .fill("0533 000 2222");
    assert.equal(await dialog.getByRole("button", { name: "Open in WhatsApp", exact: true }).isDisabled(), true, "Local leading-zero numbers are not international numbers");
    await dialog.getByLabel("Phone · with country code", { exact: true }).fill("0090 533 000 2222");
    assert.equal(await dialog.getByRole("button", { name: "Open in WhatsApp", exact: true }).isEnabled(), true);
    await page.evaluate(() => {
      window.__paymentExternal = [];
      window.open = () => ({ opener: null, closed: false, close() {}, location: { set href(value) { window.__paymentExternal.push(value); } } });
    });
    await dialog.getByRole("button", { name: "Open in WhatsApp", exact: true }).click();
    await dialog.getByRole("button", { name: "I sent it · save", exact: true }).waitFor();
    const openedHref = await page.evaluate(() => window.__paymentExternal[0]);
    assert(openedHref.startsWith("https://wa.me/905330002222?text="), "The international 00 prefix is normalized without guessing a country");
    assert.equal(new URL(openedHref).searchParams.get("text"), await dialog.getByLabel("Message", { exact: true }).inputValue());
    assert.equal(actions.length, beforeDraft + 1, "Opening records a draft, not a confirmed send");
    assert.equal(actions.at(-1).type, "message_draft");
    await page.keyboard.press("Escape");
    await main
      .getByLabel("Contact summary", { exact: true })
      .fill("Synthetic call completed; customer will confirm");
    await responseAfter(
      () =>
        main
          .getByRole("button", { name: "Record contact", exact: true })
          .click(),
      "POST",
    );
    assert.equal(actions.at(-1).type, "contact");

    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({
      path: "/private/tmp/payment-tracking-detail-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
    item = { ...item, incompleteRows: 1 };
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh", exact: true }).click(),
    );
    await main
      .getByRole("button", { name: "Email draft", exact: true })
      .click();
    await dialog.waitFor();
    const incompleteDraft = await dialog
      .getByLabel("Message", { exact: true })
      .inputValue();
    assert(incompleteDraft.includes("discuss the payment records"));
    assert(
      !incompleteDraft.includes("500.00") &&
        !incompleteDraft.includes("Original due date"),
      "Incomplete records produce a neutral draft without definite amounts or due dates",
    );
    await dialog
      .getByText(
        "The source has incomplete payment information. No definite amount or due date was included in the draft; review the records.",
        { exact: true },
      )
      .waitFor();
    await page.keyboard.press("Escape");
    item = { ...item, incompleteRows: 0 };
    await responseAfter(() =>
      main.getByRole("button", { name: "Refresh", exact: true }).click(),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Language", { exact: true }).selectOption("tr");
    await main
      .getByRole("heading", { name: "Dosyanın tüm ödemeleri", exact: true })
      .waitFor();
    assert.equal(
      await main
        .getByText("The payment case was updated.", { exact: true })
        .count(),
      0,
      "Success feedback follows the current language",
    );
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Mobile document has no horizontal overflow",
    );
    await main.evaluate((element) => element.scrollTo(0, 0));
    await page.screenshot({
      path: "/private/tmp/payment-tracking-detail-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    unavailableAuthorization = true;
    await page.goto(
      `${origin}/finance/payment-tracking?authorizationCode=AUTH%2FONE`,
    );
    await main
      .getByRole("alert")
      .filter({ hasText: "Synthetic authorization source unavailable" })
      .waitFor();
    assert.equal(
      await main.locator("tbody tr").count(),
      0,
      "Unavailable code enrichment does not silently ignore an active filter",
    );
    await ensureFiltersOpen();
    await responseAfter(() =>
      main.getByRole("button", { name: "Clear", exact: true }).click(),
    );
    await main
      .getByText(
        "The authorization-code source is unavailable. Code filters are disabled; payment cases retain the available source information.",
        { exact: true },
      )
      .waitFor();
    const unavailableCodeSelect = main.getByLabel("Authorization code", { exact: true });
    assert.equal(await unavailableCodeSelect.isDisabled(), false, "All codes remains selectable to recover from unavailable metadata");
    // Read the native option property: the accessibility helper can retarget
    // an option inside a wrapping label to its enabled select control.
    assert.equal(await unavailableCodeSelect.locator('option[value="blank"]').evaluate((option) => option.disabled), true);
    assert.equal(await unavailableCodeSelect.locator('option[value="code:AUTH/ONE"]').evaluate((option) => option.disabled), true);
    unavailableAuthorization = false;
    failedSource = true;
    await page.goto(`${origin}/finance/payment-tracking`);
    await main
      .getByRole("alert")
      .filter({ hasText: "Synthetic payment source unavailable" })
      .waitFor();
    assert.equal(await main.locator("tbody tr").count(), 0);
    assert.equal(
      await main
        .getByRole("button", { name: /View cases|Dosyaları görüntüle/ })
        .count(),
      0,
      "Source failure is not shown as zero-valued KPIs",
    );
    failedSource = false;
    await responseAfter(() => main.getByRole("button", { name: "Retry", exact: true }).click());
    await openCacheCase();
    const obsoleteAction = holdRead(`/payment-tracking/${key}/actions`, "POST");
    await main.getByLabel("Case note", { exact: true }).fill("Must not reappear after a session change");
    await main.getByRole("button", { name: "Add note", exact: true }).click();
    await obsoleteAction.started;
    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({ id: "preview", role: "ADMIN", originalRole: "PREVIEW", isPreview: true }));
      window.dispatchEvent(new Event("crm:session-changed"));
    });
    await main.getByText("This workspace is available to administrators and accounting accounts.", { exact: true }).waitFor();
    obsoleteAction.release();
    await page.waitForTimeout(150);
    assert.equal(await main.getByRole("heading", { name: "All payments in this case", exact: true }).count(), 0,
      "Changing session clears detail data and rejects a previous session's action response");
    const beforeDenied = requests.length;
    await context.addInitScript(() =>
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "preview",
          role: "ADMIN",
          originalRole: "PREVIEW",
          isPreview: true,
        }),
      ),
    );
    await page.goto(`${origin}/finance/payment-tracking`);
    await main
      .getByText(
        "This workspace is available to administrators and accounting accounts.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      requests.length,
      beforeDenied,
      "Preview does not call payment APIs",
    );
    assert.deepEqual(errors, [], "No unexpected browser errors");
    assert.deepEqual(
      unexpected,
      [],
      "No real business API or external request escaped the fixtures",
    );
    console.log(
      `PASS payment tracking: filtered totals/scope/currency/null/error/whole-resultset, non-blocking freshness/visibility/poll cancellation, authorization blank/code transitions/advanced filters/back/reload/zero bounds, list sort/paging, source preservation, defer/reset, version conflict, owner/priority/notes/contact, safe drafts, mobile dark/TR, unavailable source and Preview guard (${requests.length} mocked requests, ${actions.length} mocked actions)`,
    );
    console.log("Payment list cache timings:", JSON.stringify(cacheTimings));
    if (process.env.PERFORMANCE_OUTPUT)
      require("node:fs").writeFileSync(process.env.PERFORMANCE_OUTPUT, JSON.stringify({
        mismatchedPaymentTypeRejected: "PASS",
        mixedKindExactTotals: "PASS: sale 1000 / VAT 100 / transformer 50 / all 1150",
        paymentKindDefaultAndRoundtrip: "PASS",
        legacySourceCodeLinks: "PASS",
        wholeCaseDraftScope: "PASS",
        wholeCaseDetailAndActions: "PASS",
        allCurrenciesAndPaymentTypesOnEntry: "PASS",
        separateGbpAndTlTotals: "PASS",
        selectedCurrencyFollowUpNavigation: "PASS",
        closedCasesSecondaryNavigation: "PASS",
        canonicalProjectFilterAndTotals: "PASS",
        projectKindIntersectionAndLegacyCodeReset: "PASS",
        projectReturnReloadAndUnknownRecords: "PASS",
        mismatchedProjectRejected: "PASS",
        whatsappMonthlyDebtAndDaysTemplate: "PASS",
        whatsappAllCurrenciesAndSelectedScope: "PASS",
        whatsappDraftEditsPreserved: "PASS",
        whatsappLongMessageNotTruncated: "PASS",
        whatsappUnicodeLinkRoundtrip: "PASS",
        whatsappPreviewMakesNoWritesOrSends: "PASS",
        vatReturnReviewVisibleAndExcludedFromDebt: "PASS: excluded GBP 2030 does not change current GBP 1150 or TL 350",
        vatReturnReviewExcludedFromWhatsApp: "PASS",
        auditFailureClearsListAndDetailAmounts: "PASS",
        simpleFiltersBeforeKpis: "PASS",
        filtersAndManagementInitiallyCollapsed: "PASS",
        firstPaymentRowAboveDesktopFold: "PASS",
        disclosureToggleNoRequestsOrDraftLoss: "PASS",
        hiddenInvalidDateRevealsPanelWithoutRequest: "PASS",
        mobileOutstandingColumnImmediatelyVisible: "PASS",
        collapsedFiltersRemainApplied: "PASS",
        allCurrenciesListSeparateAmounts: "PASS: GBP/EUR/USD/TL/unknown, 36 rows across two pages",
        allCurrencyQueryDetailRoundtrip: "PASS",
        quickFilterDraftPreservation: "PASS",
        currencyChangePreservesDaysClearsOnlyMoney: "PASS",
        unknownCurrencyDistinctFromAll: "PASS",
        invalidMixedCurrencyTotalRejected: "PASS",
        mobileNoOverflow: "PASS",
        screenshots: ["payment-simple-interface-desktop-tr.png", "payment-simple-interface-mobile-tr.png", "payment-simple-desktop-tr.png", "payment-simple-mobile-tr.png", "payment-portfolio-desktop-tr.png", "payment-portfolio-mobile-tr.png", "payment-closed-desktop-tr.png", "payment-project-desktop-tr.png", "payment-project-mobile-tr.png", "payment-whatsapp-desktop.png", "payment-whatsapp-mobile.png"],
        cachedReturns: cacheTimings,
        cacheInvalidation: "PASS",
        sessionIsolation: "PASS",
        cachedValidationError: "PASS",
        sameQueryNoRequest: "PASS",
        expiredTokenRefresh: "PASS",
        agedSameQueryReload: "PASS",
        activeSessionMutationIsolation: "PASS",
        mockedRequests: requests.length,
        mockedActions: actions.length,
        allRequestsMocked: true,
      }, null, 2));
  } catch (error) {
    const currentPage = context.pages()[0];
    if (currentPage) {
      console.error("Last mocked payment requests:", requests.slice(-3));
      console.error(
        "Visible form labels:",
        await currentPage.locator("#crm-main-content label").allTextContents(),
      );
      await currentPage.screenshot({
        path: "/private/tmp/payment-tracking-test-failure.png",
        fullPage: true,
        animations: "disabled",
      });
    }
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
