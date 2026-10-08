// Standalone regression. Every business request and DELETE is mocked; no live data is read or written.
// PLAYWRIGHT_MODULE=/private/tmp/iso2026-browser-tools/node_modules/playwright node tests/admin-leads-pagination.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000")
  .origin;
const avatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Crect width='30' height='30' fill='blue'/%3E%3C/svg%3E";
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixtures() {
  return Array.from({ length: 137 }, (_, index) => ({
    id: `synthetic-${index + 1}`,
    fullName:
      index === 129
        ? "Synthetic Müşteri & %"
        : `Synthetic Lead ${String(index + 1).padStart(3, "0")}`,
    phone: "0000000000",
    email: `synthetic-${index + 1}@example.invalid`,
    source: "Isolated fixture",
    status: index < 110 ? "NEW" : "WON",
    avatarUrl: index === 0 ? avatar : null,
    createdAt: "2026-09-01T10:00:00.000Z",
  }));
}

async function setup(browser, role = "ADMIN", locale = "en") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const state = {
    requests: [],
    mutations: [],
    unexpected: [],
    errors: [],
    rows: fixtures(),
    dialogs: [],
    acceptDelete: false,
    failNext: false,
  };
  const initial = deferred(),
    stale = deferred();
  if (role !== "ADMIN") initial.resolve();
  await context.addInitScript(
    ({ role, locale }) => {
      localStorage.setItem("accessToken", "isolated-admin-pagination-test");
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "pagination-test",
          name: "Synthetic Tester",
          role,
        }),
      );
      localStorage.setItem("crm-locale", locale);
      localStorage.setItem("crm-theme", "light");
      window.__adminAborted = [];
      window.__adminFinished = [];
      const original = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = new URL(
          typeof input === "string" ? input : input.url,
          location.href,
        );
        if (!/\/leads$/.test(url.pathname)) return original(input, init);
        const q = url.searchParams.get("q");
        init?.signal?.addEventListener("abort", () =>
          window.__adminAborted.push(q),
        );
        // A completed transport may still deliver a response after cancellation.
        const response = await original(
          input,
          q === "old-slow" ? { ...init, signal: undefined } : init,
        );
        const json = response.json.bind(response);
        response.json = async () => {
          const data = await json();
          window.__adminFinished.push(q);
          return data;
        };
        return response;
      };
    },
    { role, locale },
  );
  await context.routeWebSocket("**/*", (socket) => socket.close());
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.startsWith("/socket.io"))
      return route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "1",
      });
    const isApi = ["fetch", "xhr"].includes(request.resourceType());
    if (
      url.origin === origin &&
      (url.pathname.startsWith("/_next/") ||
        url.pathname.startsWith("/__nextjs") ||
        (!isApi && !url.pathname.startsWith("/api/")) ||
        request.headers().rsc === "1")
    )
      return route.continue();
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,DELETE,OPTIONS",
    };
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    const path = url.pathname.replace(/^\/api(?=\/)/, "");
    let body,
      responseStatus = 200;
    if (request.method() === "GET" && path === "/leads") {
      state.requests.push(Object.fromEntries(url.searchParams));
      if (state.requests.length === 1) await initial.promise;
      const q = url.searchParams.get("q") || "";
      if (q === "old-slow") await stale.promise;
      if (state.failNext) {
        state.failNext = false;
        responseStatus = 503;
        body = { message: "Synthetic list unavailable" };
      } else {
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 25);
        let matching = state.rows.filter(
          (row) =>
            !url.searchParams.get("status") ||
            row.status === url.searchParams.get("status"),
        );
        if (q)
          matching = matching.filter((row) =>
            `${row.fullName} ${row.phone} ${row.email} ${row.source}`
              .toLocaleLowerCase()
              .includes(q.toLocaleLowerCase()),
          );
        body =
          q === "old-slow"
            ? {
                items: [
                  {
                    ...state.rows[0],
                    id: "old",
                    fullName: "STALE MUST NOT APPEAR",
                  },
                ],
                total: 999,
                totalPages: 40,
                page: 1,
                pageSize: 25,
              }
            : {
                items: matching.slice((page - 1) * pageSize, page * pageSize),
                total: matching.length,
                totalPages: Math.max(1, Math.ceil(matching.length / pageSize)),
                page,
                pageSize,
              };
      }
    } else if (request.method() === "DELETE" && path === "/leads/bulk") {
      const payload = request.postDataJSON();
      state.mutations.push(payload);
      const ids = new Set(payload.ids);
      const previous = state.rows.length;
      state.rows = state.rows.filter((row) => !ids.has(row.id));
      body = { deletedCount: previous - state.rows.length };
    } else if (request.method() === "GET" && path === "/notifications")
      body = [];
    else if (
      request.method() === "GET" &&
      path === "/notifications/unread-count"
    )
      body = { unread: 0 };
    else {
      state.unexpected.push(`${request.method()} ${url.href}`);
      body = {};
    }
    await route.fulfill({
      status: responseStatus,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", (error) => state.errors.push(error.message));
  page.on("console", (message) => {
    if (
      (message.type() === "error" &&
        !message.text().includes("503 (Service Unavailable)")) ||
      /hydrat|server rendered|did not match/i.test(message.text())
    )
      state.errors.push(message.text());
  });
  page.on("dialog", async (dialog) => {
    state.dialogs.push({ type: dialog.type(), message: dialog.message() });
    if (dialog.type() === "confirm" && !state.acceptDelete)
      await dialog.dismiss();
    else await dialog.accept();
  });
  return { context, page, state, initial, stale };
}

async function runAdmin(browser) {
  const { context, page, state, initial, stale } = await setup(browser);
  const main = page.locator("#crm-main-content");
  const rows = main.locator("tbody tr");
  const search = main.getByRole("searchbox", { name: "Search lead..." });
  const status = main.getByRole("combobox", { name: "STATUS", exact: true });
  const size = main.getByRole("combobox", {
    name: "Rows per page",
    exact: true,
  });
  const next = main.getByRole("button", { name: "Next", exact: true });
  const selectAll = main.getByRole("checkbox", {
    name: "Select all leads on this page",
    exact: true,
  });
  const deleteButton = main.getByRole("button", { name: /^Delete Selected/ });
  async function settled() {
    await page.waitForFunction(
      () =>
        document
          .querySelector("#crm-main-content table")
          ?.getAttribute("aria-busy") === "false",
    );
  }
  async function changed(action) {
    const response = page.waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        /\/leads$/.test(new URL(r.url()).pathname),
    );
    await action();
    await response;
    await settled();
  }
  try {
    await page.goto(`${origin}/admin/leads`);
    await main.getByRole("status").waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('select[aria-label="Language"]')?.value === "en",
    );
    assert.equal(await rows.count(), 0);
    assert.equal(
      await main.getByText("No leads found.", { exact: true }).count(),
      0,
    );
    assert.equal(state.requests.length, 1);
    assert.deepEqual(state.requests[0], { page: "1", pageSize: "25" });
    initial.resolve();
    await settled();
    assert.equal(await rows.count(), 25);
    assert(await main.getByText("1-25 / 137", { exact: true }).isVisible());
    assert(
      await rows.first().locator("img").isVisible(),
      "Existing avatar remains visible",
    );
    assert.equal(
      await status.locator('option[value="WON"]').count(),
      1,
      "Status options include values outside the current page",
    );

    await rows.first().getByRole("checkbox").check();
    await changed(() => next.click());
    assert.equal(await rows.count(), 25);
    assert(await main.getByText("26-50 / 137", { exact: true }).isVisible());
    assert.equal(
      await main.locator('input[type="checkbox"]:checked').count(),
      0,
      "Selections do not cross pages",
    );
    assert(await deleteButton.isDisabled());
    await changed(() => size.selectOption("50"));
    assert.equal(await rows.count(), 50);
    assert.equal(state.requests.at(-1).page, "1");

    await changed(() => status.selectOption("WON"));
    assert.equal(state.requests.at(-1).status, "WON");
    assert.equal(
      await rows.count(),
      27,
      "Status filter finds all matching rows beyond the original first 100",
    );
    await changed(() => search.fill("Müşteri & %"));
    assert.equal(
      state.requests.at(-1).q,
      "Müşteri & %",
      "Search is encoded and sent to the server",
    );
    assert.equal(state.requests.at(-1).status, "WON");
    assert.equal(await rows.count(), 1);
    assert(await main.locator('a[href="/leads/synthetic-130"]').isVisible());
    await changed(() => search.fill("no fixture matches"));
    assert.equal(await rows.count(), 0);
    assert(
      await main.getByText("No leads found.", { exact: true }).isVisible(),
    );
    assert(await next.isDisabled());

    const slow = page.waitForRequest(
      (r) =>
        /\/leads$/.test(new URL(r.url()).pathname) &&
        new URL(r.url()).searchParams.get("q") === "old-slow",
    );
    await search.fill("old-slow");
    await slow;
    await changed(() => search.fill("Müşteri & %"));
    stale.resolve();
    await page.waitForFunction(() =>
      window.__adminFinished.includes("old-slow"),
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(await rows.count(), 1);
    assert.equal(
      await main.getByText("STALE MUST NOT APPEAR", { exact: true }).count(),
      0,
    );
    assert(
      await page.evaluate(() => window.__adminAborted.includes("old-slow")),
      "Superseded request is aborted",
    );
    assert(
      await main.getByText("1-1 / 1", { exact: true }).isVisible(),
      "Late response cannot replace current totals",
    );

    await changed(() => search.fill(""));
    await changed(() => status.selectOption("ALL"));
    await changed(() => size.selectOption("100"));
    assert.equal(await rows.count(), 100);
    await rows.first().getByRole("checkbox").check();
    await changed(() => next.click());
    assert.equal(await rows.count(), 37);
    assert.equal(
      await main.locator('input[type="checkbox"]:checked').count(),
      0,
    );
    await selectAll.check();
    await deleteButton.click();
    assert.equal(
      state.mutations.length,
      0,
      "Canceling confirmation prevents deletion",
    );
    assert.match(
      state.dialogs.at(-1).message,
      /37 leads selected on this page/,
    );
    state.acceptDelete = true;
    const beforeDeleteGets = state.requests.length;
    await changed(() => deleteButton.click());
    assert.equal(state.mutations.length, 1);
    assert.deepEqual(
      state.mutations[0].ids,
      Array.from({ length: 37 }, (_, i) => `synthetic-${101 + i}`),
      "Only the visible page's selected IDs are deleted",
    );
    assert.equal(
      state.requests.length,
      beforeDeleteGets + 2,
      "Deletion refreshes exact count and refetches the valid page",
    );
    assert.equal(state.requests.at(-2).page, "2");
    assert.equal(state.requests.at(-1).page, "1");
    assert(await main.getByText("1-100 / 100", { exact: true }).isVisible());
    assert(await main.getByText("Page 1 / 1", { exact: true }).isVisible());
    assert(await deleteButton.isDisabled());

    state.failNext = true;
    await changed(() =>
      main.getByRole("button", { name: "Refresh", exact: true }).click(),
    );
    assert(await main.getByRole("alert").isVisible());
    assert.equal(
      await main.getByText("No leads found.", { exact: true }).count(),
      0,
      "A failed request is not an empty result",
    );
    await changed(() =>
      main.getByRole("button", { name: "Refresh", exact: true }).click(),
    );
    assert.equal(await main.getByRole("alert").count(), 0);
    assert.equal(await rows.count(), 100);
    await page.setViewportSize({ width: 390, height: 844 });
    const width = await page.evaluate(() => ({
      screen: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert(
      width.content <= width.screen + 1,
      `No mobile document overflow: ${JSON.stringify(width)}`,
    );
    assert(
      state.requests.every(
        (r) =>
          ["25", "50", "100"].includes(r.pageSize) &&
          r.includeTotal !== "false",
      ),
    );
    assert.deepEqual(
      state.unexpected,
      [],
      "No real API or mutation escaped the fixture",
    );
    assert.deepEqual(state.errors, [], "No runtime or hydration errors");
    console.log(
      `PASS admin lead pagination: page sizes, remote filters, stale response, page-only selection, cancel/delete, fresh totals + last-page correction, error recovery and mobile (${state.requests.length} mocked GETs, ${state.mutations.length} mocked DELETE)`,
    );
  } finally {
    initial.resolve();
    stale.resolve();
    await context.close();
  }
}

async function runUnauthorized(browser) {
  const { context, page, state, initial, stale } = await setup(
    browser,
    "SALES",
    "tr",
  );
  try {
    await page.goto(`${origin}/admin/leads`);
    await page
      .getByText("Bu sayfa yalnızca ADMIN kullanıcılar içindir.", {
        exact: true,
      })
      .waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(
      state.requests.length,
      0,
      "Non-admin users never fetch the administration list",
    );
    assert.equal(state.mutations.length, 0);
    assert.deepEqual(state.unexpected, []);
    assert.deepEqual(state.errors, []);
    console.log(
      "PASS admin authorization: denied role sends no list or deletion requests",
    );
  } finally {
    initial.resolve();
    stale.resolve();
    await context.close();
  }
}
async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    await runAdmin(browser);
    await runUnauthorized(browser);
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
