// All business API requests are mocked; no real records or authentication are used.
// PLAYWRIGHT_MODULE=/private/tmp/iso2026-browser-tools/node_modules/playwright node tests/leads-loading.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function responseFor(params, overrides = {}) {
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 25);
  const total = overrides.total ?? 53;
  const label = params.get("status") || "ALL";
  const items = Array.from({ length: Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize)) }, (_, index) => ({
    id: `fixture-${label}-${(page - 1) * pageSize + index + 1}`,
    fullName: `Synthetic ${label} ${(page - 1) * pageSize + index + 1}`,
    phone: "0000000000",
    status: label === "ALL" ? "NEW" : label,
    source: "Isolated test",
  }));
  return {
    items, page, pageSize,
    ...(params.get("includeTotal") === "false" ? {} : { total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }),
    ...overrides,
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const requests = [], errors = [], unexpected = [], held = new Map();
  const initial = deferred(), secondPage = deferred();
  let mutationCount = 0;
  let tailRemoved = false;
  for (const status of ["NEW", "WORKING", "SALES_READY", "MANAGER_REVIEW"]) held.set(status, deferred());

  try {
    await context.addInitScript(() => {
      localStorage.setItem("accessToken", "isolated-leads-loading-test");
      localStorage.setItem("user", JSON.stringify({ id: "lead-loading-test", role: "ADMIN", name: "Synthetic Tester" }));
      localStorage.setItem("crm-locale", "en");
      localStorage.setItem("crm-theme", "light");
      window.__leadAborts = [];
      window.__leadFinished = [];
      window.__leadClockOffset = 0;
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + window.__leadClockOffset;
      const realFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = new URL(typeof input === "string" ? input : input.url, location.href);
        if (!/\/leads$/.test(url.pathname) || (init?.method && init.method !== "GET")) return realFetch(input, init);
        const status = url.searchParams.get("status") || "ALL";
        init?.signal?.addEventListener("abort", () => window.__leadAborts.push(status));
        // Simulate a transport that has already received a response when aborted.
        // The request sequence guard must still reject this late result.
        const response = await realFetch(input, ["NEW", "SALES_READY"].includes(status) ? { ...init, signal: undefined } : init);
        const json = response.json.bind(response);
        response.json = async () => {
          const body = await json();
          window.__leadFinished.push(status);
          return body;
        };
        return response;
      };
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname.startsWith("/socket.io")) return route.fulfill({ status: 200, contentType: "text/plain", body: "1" });
      const apiRequest = ["fetch", "xhr"].includes(request.resourceType());
      if (url.origin === origin && (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/__nextjs") ||
          (!apiRequest && !url.pathname.startsWith("/api/")) || request.headers().rsc === "1")) return route.continue();
      const headers = { "access-control-allow-origin": origin, "access-control-allow-headers": "authorization,content-type" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const path = url.pathname.replace(/^\/api(?=\/)/, "");
      let body;
      if (request.method() === "GET" && path === "/leads") {
        const params = url.searchParams;
        requests.push(Object.fromEntries(params));
        const status = params.get("status");
        if (requests.length === 1) await initial.promise;
        else if (requests.length === 2) await secondPage.promise;
        else if (held.has(status)) await held.get(status).promise;
        body = responseFor(params, status === "NEW" || status === "SALES_READY"
          ? { items: [{ id: "stale", fullName: "STALE MUST NOT APPEAR", phone: "000", status }], total: 999, page: 7, pageSize: 100 }
          : status === "WORKING" ? { total: 2 }
          : status === "MANAGER_REVIEW" ? { total: 0 }
          : {});
        if (tailRemoved && !status) {
          body = responseFor(params, { total: 25 });
          if (params.get("includeTotal") === "false") {
            delete body.total;
            delete body.totalPages;
          }
        }
      } else if (request.method() === "POST" && /^\/leads\/fixture-[^/]+\/activity$/.test(path)) {
        mutationCount += 1;
        body = { id: "synthetic-activity" };
      } else if (request.method() === "GET" && path === "/notifications") body = [];
      else if (request.method() === "GET" && path === "/notifications/unread-count") body = { unread: 0 };
      else { unexpected.push(`${request.method()} ${url.href}`); body = {}; }
      await route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat|server rendered|did not match/i.test(message.text())) errors.push(message.text());
    });
    const main = page.locator("#crm-main-content");
    const rows = main.locator("tbody tr");
    const table = main.locator("table");
    const statusFilter = main.locator("select").filter({ has: page.locator('option[value="ALL"]') });
    const pageSize = main.locator("select").filter({ has: page.locator('option[value="25"]') });
    async function settled() {
      await page.waitForFunction(() => document.querySelector("#crm-main-content table")?.getAttribute("aria-busy") === "false");
    }
    async function requested(status) {
      await page.waitForRequest((request) => {
        const url = new URL(request.url());
        return /\/leads$/.test(url.pathname) && url.searchParams.get("status") === status;
      });
    }
    async function reloadAfter(action) {
      const before = requests.length;
      const response = page.waitForResponse((response) =>
        response.request().method() === "GET" && /\/leads$/.test(new URL(response.url()).pathname));
      await action();
      await response;
      await settled();
      assert.equal(requests.length, before + 1, "The action issues exactly one list refresh");
    }

    await page.goto(`${origin}/leads`);
    await main.getByRole("status").waitFor();
    await page.waitForFunction(() => document.querySelector('select[aria-label="Language"]')?.value === "en");
    assert.equal(requests.length, 1, "Initial mount requests the list once");
    assert.equal(requests[0].pageSize, "25");
    assert.equal(requests[0].includeTotal, undefined);
    assert.equal(await rows.count(), 0);
    assert.equal(await main.getByText("No leads found.", { exact: true }).count(), 0, "No premature empty state");
    assert.equal(await table.getAttribute("aria-busy"), "true");
    initial.resolve();
    await settled();
    assert.equal(await rows.count(), 25, "Only one page is rendered");

    await main.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#crm-main-content table")?.getAttribute("aria-busy") === "true");
    assert.equal(requests.at(-1).includeTotal, "false");
    assert.equal(requests.at(-1).page, "2");
    assert.equal(await rows.count(), 25, "Previous rows remain visible during pagination");
    secondPage.resolve();
    await settled();
    assert(await main.getByText("26-50 / 53", { exact: true }).isVisible(), "Cached total survives response without totals");
    assert(await main.getByText("Page 2 / 3", { exact: true }).isVisible());

    await page.evaluate(() => { window.__leadClockOffset += 31_000; });
    await reloadAfter(() => main.getByRole("button", { name: "Previous", exact: true }).click());
    assert.equal(requests.at(-1).includeTotal, undefined, "Expired pagination cache requests a fresh count");
    await reloadAfter(() => main.getByRole("button", { name: "Next", exact: true }).click());
    assert.equal(requests.at(-1).includeTotal, "false");
    await reloadAfter(() => main.getByRole("button", { name: "Search", exact: true }).click());
    assert.equal(requests.at(-1).includeTotal, undefined, "Explicit search refreshes the count even for identical filters");
    assert.equal(requests.at(-1).page, "1");

    await reloadAfter(() => main.getByRole("button", { name: "Save call", exact: true }).first().click());
    assert.equal(mutationCount, 1, "Activity creation is mocked");
    assert.equal(requests.at(-1).includeTotal, undefined, "Mutation refetch refreshes the count");

    // A different user deletes the remaining pages during the count cache's TTL.
    tailRemoved = true;
    const beforeRecovery = requests.length;
    const recovered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === "GET" && /\/leads$/.test(url.pathname) &&
        url.searchParams.get("page") === "1" && !url.searchParams.has("includeTotal");
    });
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await recovered;
    await settled();
    assert.equal(requests.length, beforeRecovery + 2, "An empty later page triggers exactly one fresh first-page recovery");
    assert.equal(requests[beforeRecovery].includeTotal, "false");
    assert.equal(await rows.count(), 25);
    assert(await main.getByText("1-25 / 25", { exact: true }).isVisible());
    assert(await main.getByRole("button", { name: "Next", exact: true }).isDisabled());

    // The superseded request returns before the current one: loading must remain true.
    await Promise.all([requested("NEW"), statusFilter.selectOption("NEW")]);
    await Promise.all([requested("WORKING"), statusFilter.selectOption("WORKING")]);
    held.get("NEW").resolve();
    await page.waitForFunction(() => window.__leadFinished.includes("NEW"));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await table.getAttribute("aria-busy"), "true", "An old finally cannot end the latest loading state");
    assert.equal(await pageSize.inputValue(), "25");
    assert.equal(await main.getByText("STALE MUST NOT APPEAR", { exact: true }).count(), 0);
    held.get("WORKING").resolve();
    await settled();
    assert.equal(await rows.count(), 2);
    assert(await main.getByText("1-2 / 2", { exact: true }).isVisible());
    assert.equal(requests.at(-1).includeTotal, undefined, "Different filters always request their own count");

    // The superseded request now returns after the current response: rows/count/pageSize stay current.
    await Promise.all([requested("SALES_READY"), statusFilter.selectOption("SALES_READY")]);
    await Promise.all([requested("MANAGER_REVIEW"), statusFilter.selectOption("MANAGER_REVIEW")]);
    held.get("MANAGER_REVIEW").resolve();
    await settled();
    await main.getByText("No leads found.", { exact: true }).waitFor();
    held.get("SALES_READY").resolve();
    await page.waitForFunction(() => window.__leadFinished.includes("SALES_READY"));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await rows.count(), 0);
    assert.equal(await pageSize.inputValue(), "25");
    assert.equal(await table.getAttribute("aria-busy"), "false");
    assert.equal(await main.getByText("STALE MUST NOT APPEAR", { exact: true }).count(), 0);
    const aborted = await page.evaluate(() => window.__leadAborts);
    assert(aborted.includes("NEW") && aborted.includes("SALES_READY"), "Superseded requests receive abort signals");
    assert.deepEqual(errors, [], "No runtime, hydration or console errors");
    assert.deepEqual(unexpected, [], "All business API traffic stays within the synthetic fixture");
    console.log(`PASS leads loading: 25-row page, loading/empty states, count reuse/expiry, deletion recovery, explicit refresh, mutation count refresh and both response races (${requests.length} mocked list GETs)`);
  } finally {
    initial.resolve();
    secondPage.resolve();
    for (const gate of held.values()) gate.resolve();
    await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
