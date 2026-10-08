// Standalone regression: all API traffic is mocked and WebSockets are closed.
// PLAYWRIGHT_MODULE=/private/tmp/iso2026-browser-tools/node_modules/playwright node tests/navigation-hydration.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin;
const scenarios = [
  { name: "desktop-tr", locale: "tr", mobile: false, collapsed: false },
  { name: "desktop-en-collapsed", locale: "en", mobile: false, collapsed: true },
  { name: "mobile-en", locale: "en", mobile: true, collapsed: false },
];

async function checkTargets(page, prefix) {
  const result = await page.locator(`#${prefix}`).evaluate((scope) => {
    const nav = scope.querySelector("nav");
    const search = scope.querySelector('input[type="search"]');
    const buttons = [...scope.querySelectorAll("[data-nav-group] > button")];
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    return {
      navId: nav?.id,
      searchTarget: search?.getAttribute("aria-controls"),
      navUnique: ids.filter((id) => id === nav?.id).length === 1,
      groups: buttons.map((button) => {
        const id = button.getAttribute("aria-controls");
        const target = document.getElementById(id);
        return {
          id,
          valid: !!target && scope.contains(target) &&
            target.closest("[data-nav-group]") === button.closest("[data-nav-group]"),
          unique: ids.filter((value) => value === id).length === 1,
          expandedMatches: !!target && target.hidden === (button.getAttribute("aria-expanded") === "false"),
        };
      }),
    };
  });
  assert.equal(result.navId, `${prefix}-modules`);
  assert.equal(result.searchTarget, result.navId, "Search controls its own navigation");
  assert(result.navUnique, "Navigation ID is unique in the entire document");
  assert(result.groups.length > 0, "ADMIN navigation groups are populated");
  assert.equal(new Set(result.groups.map((group) => group.id)).size, result.groups.length);
  for (const group of result.groups)
    assert(group.valid && group.unique && group.expandedMatches, `Invalid group target: ${JSON.stringify(group)}`);
}

async function checkSearch(page, prefix) {
  const scope = page.locator(`#${prefix}`);
  const search = scope.locator('input[type="search"]');
  await search.fill("finans ödeme takip");
  await page.waitForFunction((id) => {
    const nav = document.getElementById(`${id}-modules`);
    const links = nav?.querySelectorAll("a[data-module-link]");
    return nav?.dataset.searching === "true" && links?.length === 1 &&
      links[0].getAttribute("href") === "/finance/payment-tracking";
  }, prefix);
  await search.press("Escape");
  await scope.locator('[data-nav-group="sales"] > button').waitFor();
  assert.equal(await search.inputValue(), "");
  await checkTargets(page, prefix);
}

async function checkMobile(page, locale) {
  const openLabel = locale === "tr" ? "Menüyü aç" : "Open menu";
  const closeLabel = locale === "tr" ? "Menüyü kapat" : "Close menu";
  const drawer = page.locator("#crm-mobile-navigation");
  await page.getByRole("button", { name: openLabel, exact: true }).click();
  await page.locator("#crm-mobile-navigation[open]").waitFor();
  assert.equal(await page.locator("#crm-sidebar nav").count(), 0);
  await checkTargets(page, "crm-mobile-navigation");
  await checkSearch(page, "crm-mobile-navigation");
  await drawer.getByRole("button", { name: closeLabel, exact: true }).click();
  await page.locator("#crm-mobile-navigation[open]").waitFor({ state: "detached" });
  assert(await page.getByRole("button", { name: openLabel, exact: true }).evaluate((el) => el === document.activeElement));
  await page.getByRole("button", { name: openLabel, exact: true }).click();
  await page.locator("#crm-mobile-navigation[open]").waitFor();
  // Resizing an open drawer must remove it without retaining duplicate IDs.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#crm-sidebar nav").waitFor();
  await page.locator("#crm-mobile-navigation[open]").waitFor({ state: "detached" });
  assert.equal(await drawer.locator("nav").count(), 0);
  await checkTargets(page, "crm-sidebar");
}

async function runScenario(browser, scenario) {
  const context = await browser.newContext({
    viewport: scenario.mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const errors = [], unexpected = [], requests = [];
  try {
    await context.addInitScript(({ locale, collapsed }) => {
      localStorage.setItem("accessToken", "isolated-navigation-hydration-test");
      localStorage.setItem("user", JSON.stringify({ id: "navigation-test", name: "Navigation Test", role: "ADMIN" }));
      localStorage.setItem("crm-locale", locale);
      localStorage.setItem("crm-theme", "light");
      localStorage.setItem("crm-sidebar-collapsed", String(collapsed));
    }, scenario);
    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith("/socket.io"))
        return route.fulfill({ status: 200, contentType: "text/plain", body: "1" });
      const frontend = url.origin === origin;
      const apiRequest = ["fetch", "xhr"].includes(request.resourceType());
      if (frontend && (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/__nextjs") ||
          (!apiRequest && !url.pathname.startsWith("/api/")) || request.headers().rsc === "1"))
        return route.continue();
      const headers = { "access-control-allow-origin": origin, "access-control-allow-headers": "authorization,content-type" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const path = url.pathname.replace(/^\/api(?=\/)/, "");
      requests.push(`${request.method()} ${path}`);
      let body;
      if (request.method() === "GET" && path === "/leads")
        body = { items: [], total: 0, totalPages: 1, page: 1, pageSize: 25 };
      else if (request.method() === "GET" && path === "/notifications") body = [];
      else if (request.method() === "GET" && path === "/notifications/unread-count") body = { unread: 0 };
      else { unexpected.push(`${request.method()} ${url.href}`); body = {}; }
      return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat|server rendered|did not match/i.test(message.text()))
        errors.push(`console ${message.type()}: ${message.text()}`);
    });

    for (const reload of [false, true]) {
      const response = reload ? await page.reload() : await page.goto(`${origin}/leads`);
      assert.equal(response.status(), 200);
      const html = await response.text();
      const sidebar = html.match(/<aside\b[^>]*\bid="crm-sidebar"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
      const ssrNavId = sidebar?.match(/<nav\b[^>]*\bid="([^"]+)"/)?.[1];
      assert.equal(ssrNavId, "crm-sidebar-modules", "The SSR response contains deterministic navigation IDs");
      await page.locator('[data-module-link="leads"]').waitFor({ state: "attached" });
      await page.waitForFunction((locale) => document.querySelector('select[aria-label="Language"]')?.value === locale, scenario.locale);
      await page.locator("#crm-main-content table").waitFor();
      if (!scenario.mobile) {
        assert.equal(await page.locator("#crm-sidebar nav").getAttribute("id"), ssrNavId, "Hydrated navigation matches the SSR ID, including reload");
        await page.waitForFunction((collapsed) => document.querySelector("#crm-sidebar")?.parentElement?.dataset.collapsed === String(collapsed), scenario.collapsed);
        if (scenario.collapsed)
          await page.getByRole("button", { name: "Expand navigation", exact: true }).click();
        await checkTargets(page, "crm-sidebar");
      }
      // Let effect-triggered renders finish so late hydration diagnostics are included.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.deepEqual(errors, [], `${scenario.name}: initial load/reload diagnostics`);
    }
    if (scenario.mobile) await checkMobile(page, scenario.locale);
    else {
      await checkSearch(page, "crm-sidebar");
      if (scenario.locale === "tr") {
        await page.setViewportSize({ width: 390, height: 844 });
        await checkMobile(page, scenario.locale);
      }
    }
    assert(requests.some((request) => request === "GET /leads"), "Leads API was mocked");
    assert.deepEqual(unexpected, [], "No unmocked API, mutation, or external request is allowed");
    assert.deepEqual(errors, [], `${scenario.name}: hydration/runtime/console diagnostics`);
    console.log(`PASS ${scenario.name}: SSR/reload IDs, aria targets, search and responsive navigation (${requests.length} mocked API requests)`);
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    for (const scenario of scenarios) await runScenario(browser, scenario);
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
