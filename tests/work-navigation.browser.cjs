// Run against the local frontend with PLAYWRIGHT_MODULE pointing to Playwright.
// All backend reads are mocked; no CRM records are read or changed.
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = process.env.FRONTEND_URL || "http://localhost:3001";
const output = process.env.SCREENSHOT_DIR || "/private/tmp";
const person = {
  id: "ui-user",
  name: "Navigation test",
  role: "ADMIN",
  isActive: true,
};
const project = {
  id: "ui-project",
  key: "OPS",
  name: "Operations and quality coordination",
  ownerId: person.id,
  owner: person,
  members: [],
  department: { id: "dept", name: "Operations" },
  canEdit: true,
  canManage: true,
  version: 1,
  color: "#147d73",
  archivedAt: null,
};
const tasks = Array.from({ length: 18 }, (_, index) => ({
  id: "ui-task-" + index,
  title: "Operations work item " + (index + 1),
  status: "TODO",
  priority: "MEDIUM",
  kind: "TASK",
  labels: ["Operations"],
  projectId: project.id,
  project,
  assignedToId: person.id,
  assignedTo: person,
  createdById: person.id,
  createdBy: person,
  version: 1,
  canEdit: true,
  canArchive: true,
  checklist: [],
  blockers: [],
  subtasks: [],
  _count: { comments: 0, attachments: 0, subtasks: 0 },
}));
const requests = [];
async function setup(browser, role = "ADMIN", locale = "en") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    ({ person, role, locale }) => {
      localStorage.setItem("accessToken", "isolated-navigation-test");
      localStorage.setItem("user", JSON.stringify({ ...person, role }));
      localStorage.setItem("crm-locale", locale);
    },
    { person, role, locale },
  );
  await context.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.port !== "3002") return route.continue();
    requests.push({ path: requestUrl.pathname, method: request.method() });
    let body = [];
    if (requestUrl.pathname === "/tasks/workspace")
      body = {
        projects: [project],
        users: [person],
        departments: [project.department],
        me: { ...person, role },
      };
    else if (requestUrl.pathname === "/tasks/report")
      body = {
        total: tasks.length,
        status: [{ status: "TODO", _count: tasks.length }],
        priority: [],
        workload: [],
        due: [],
        overdue: 0,
        estimateMinutes: 0,
        spentMinutes: 0,
      };
    else if (requestUrl.pathname === "/tasks")
      body = { items: tasks, total: tasks.length };
    else if (requestUrl.pathname.startsWith("/tasks/ui-task-"))
      body = {
        ...tasks[0],
        comments: [],
        timeEntries: [],
        activity: [],
        attachments: [],
        blocking: [],
        watching: false,
        me: person,
      };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url + "/tasks");
  await page.getByRole("link", { name: tasks[0].title, exact: true }).waitFor();
  return { context, page, errors };
}
async function noOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Document overflow",
  );
  assert(
    await page
      .locator("#crm-main-content")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    "Main content overflow",
  );
}
async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const { page, context, errors } = await setup(browser);
    const main = page.locator("#crm-main-content");
    const sidebar = page.locator("#crm-sidebar");
    const search = sidebar.getByRole("searchbox", {
      name: "Search modules",
      exact: true,
    });
    const group = (id) => sidebar.locator(`[data-nav-group="${id}"] > button`);
    assert.equal(
      await group("workspace").getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(await group("sales").getAttribute("aria-expanded"), "false");
    assert.equal(await sidebar.locator('[aria-current="page"]').count(), 1);
    await group("sales").click();
    assert(
      await sidebar
        .getByRole("link", { name: "Customers", exact: true })
        .isVisible(),
    );
    await page.reload();
    await main
      .getByRole("link", { name: tasks[0].title, exact: true })
      .waitFor();
    assert.equal(
      await group("sales").getAttribute("aria-expanded"),
      "true",
      "Expanded groups persist",
    );
    await group("sales").click();
    const requestsBeforeSearch = requests.filter((r) =>
      r.path.startsWith("/tasks"),
    ).length;
    for (const value of ["customer", "MÜŞTERİ", "musteri"]) {
      await search.fill(value);
      assert(
        await sidebar
          .getByRole("link", { name: "Customers", exact: true })
          .isVisible(),
      );
      assert.equal(
        await sidebar.locator('[data-nav-group="sales"] > button').count(),
        0,
        "Search reveals results without changing collapsed preferences",
      );
    }
    await page.screenshot({ path: output + "/navigation-search.png" });
    assert.equal(
      await sidebar.locator("a[data-module-link]").first().getAttribute("href"),
      "/customers",
      "A module-name match must rank ahead of related pages",
    );
    await search.fill("finans ödeme takip");
    assert.equal(await sidebar.locator("a[data-module-link]").count(), 1);
    assert.equal(
      await sidebar.locator("a[data-module-link]").getAttribute("href"),
      "/finance/payment-tracking",
    );
    await search.fill("no-such-module-zzzzz");
    assert(
      await sidebar.getByText("No modules found", { exact: true }).isVisible(),
    );
    assert.equal(await sidebar.locator("a[data-module-link]").count(), 0);
    await search.press("Escape");
    assert.equal(await search.inputValue(), "");
    assert.equal(
      await group("sales").getAttribute("aria-expanded"),
      "false",
      "Clearing restores group preferences",
    );
    await search.fill("work management");
    await search.press("ArrowDown");
    assert(
      await sidebar
        .getByRole("link", { name: "Work management", exact: true })
        .evaluate((el) => el === document.activeElement),
    );
    assert.equal(
      requests.filter((r) => r.path.startsWith("/tasks")).length,
      requestsBeforeSearch,
      "Module search must stay local",
    );
    await search.focus();
    await search.press("Enter");
    assert.equal(await search.inputValue(), "");
    assert(new URL(page.url()).pathname === "/tasks");
    await search.fill("cark");
    assert.equal(
      await sidebar
        .locator('[data-module-link="agent-wheel"]')
        .getAttribute("target"),
      "_blank",
    );
    assert.equal(
      await sidebar
        .locator('[data-module-link="agent-wheel"]')
        .getAttribute("rel"),
      "noopener noreferrer",
    );
    await sidebar
      .getByRole("button", { name: "Clear module search", exact: true })
      .click();
    assert.equal(
      await main.locator("aside").count(),
      0,
      "Second sidebar must be removed",
    );
    await noOverflow(page);
    await page.screenshot({ path: output + "/navigation-expanded.png" });
    const before = await main.boundingBox();
    await page
      .getByRole("button", { name: "Collapse navigation", exact: true })
      .click();
    await page.waitForTimeout(250);
    assert.equal(Math.round((await sidebar.boundingBox()).width), 72);
    assert((await main.boundingBox()).width > before.width + 150);
    assert.equal(
      await sidebar
        .getByRole("link", { name: "Work management", exact: true })
        .getAttribute("title"),
      "Work management",
    );
    await page.screenshot({ path: output + "/navigation-collapsed.png" });
    await page.reload();
    await page
      .getByRole("button", { name: "Expand navigation", exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: tasks[0].title, exact: true })
      .waitFor();
    await main.evaluate((el) => {
      el.scrollTop = 400;
    });
    const mainScroll = await main.evaluate((el) => el.scrollTop);
    assert(mainScroll > 0);
    const nav = sidebar.getByRole("navigation");
    assert.equal(await nav.evaluate((el) => el.scrollTop), 0);
    await nav.evaluate((el) => {
      el.scrollTop = 250;
    });
    assert((await nav.evaluate((el) => el.scrollTop)) > 0);
    assert.equal(await main.evaluate((el) => el.scrollTop), mainScroll);
    await main.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.getByRole("button", { name: "Following", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Following", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByLabel("Work project", { exact: true })
      .selectOption(project.id);
    await page
      .getByRole("heading", { name: project.name, exact: true })
      .waitFor();
    await page.getByLabel("Work project", { exact: true }).selectOption("");
    await page
      .getByRole("heading", { name: "All accessible work", exact: true })
      .waitFor();
    for (const width of [1920, 1280, 1024, 820, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const drawer = page.getByRole("dialog", {
      name: "Main navigation",
      exact: true,
    });
    await drawer.waitFor();
    await page.waitForTimeout(250);
    await page.screenshot({ path: output + "/navigation-mobile-open.png" });
    const mobileSearch = drawer.getByRole("searchbox", {
      name: "Search modules",
      exact: true,
    });
    await mobileSearch.fill("müşteri");
    assert(
      await drawer
        .getByRole("link", { name: "Customers", exact: true })
        .isVisible(),
    );
    await page.screenshot({ path: output + "/navigation-mobile-search.png" });
    await mobileSearch.press("Escape");
    assert.equal(await mobileSearch.inputValue(), "");
    assert(
      await drawer.isVisible(),
      "First Escape clears search without closing the drawer",
    );
    for (let i = 0; i < 35; i++) {
      await page.keyboard.press("Tab");
      assert(
        await drawer.evaluate((el) => el.contains(document.activeElement)),
        "Mobile focus escaped drawer",
      );
    }
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    assert(
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .evaluate((el) => el === document.activeElement),
    );
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.waitForTimeout(250);
    await page.mouse.click(384, 400);
    await drawer.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await drawer
      .getByRole("link", { name: "Work management", exact: true })
      .click();
    await drawer.waitFor({ state: "hidden" });
    await page.screenshot({ path: output + "/navigation-mobile-closed.png" });
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await drawer.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Expand navigation", exact: true })
      .click();
    await page.waitForTimeout(250);
    await page
      .getByRole("button", { name: "Collapse navigation", exact: true })
      .click();
    await sidebar
      .getByRole("button", { name: "Search modules", exact: true })
      .click();
    await search.waitFor();
    assert(
      await search.evaluate((el) => el === document.activeElement),
      "Search on the icon rail expands and focuses the input",
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("crm-sidebar-collapsed")),
      "false",
    );
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    await main.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: output + "/navigation-dark.png" });
    assert.equal(
      await sidebar.locator("img").getAttribute("src"),
      "/dndwhite.png",
    );
    assert.deepEqual(errors, []);
    await context.close();
    const turkish = await setup(browser, "ADMIN", "tr");
    const turkishNav = turkish.page.locator("#crm-sidebar");
    const turkishSearch = turkishNav.getByRole("searchbox", {
      name: "Modül ara",
      exact: true,
    });
    await turkishSearch.fill("CUSTOMERS");
    assert(
      await turkishNav
        .getByRole("link", { name: "Müşteriler", exact: true })
        .isVisible(),
    );
    await turkishNav
      .getByRole("button", { name: "Modül aramasını temizle", exact: true })
      .click();
    await turkish.page.screenshot({ path: output + "/navigation-turkish.png" });
    await noOverflow(turkish.page);
    await turkish.page
      .getByRole("button", { name: "Menüyü daralt", exact: true })
      .click();
    await turkish.page.waitForTimeout(250);
    await turkish.page.screenshot({
      path: output + "/navigation-turkish-collapsed.png",
    });
    assert.deepEqual(turkish.errors, []);
    await turkish.context.close();
    const accounting = await setup(browser, "ACCOUNTING");
    const accountingNav = accounting.page.locator("#crm-sidebar");
    await accountingNav.locator('[data-nav-group="finance"] > button').click();
    assert.equal(
      await accountingNav
        .getByRole("link", { name: "Customers", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await accountingNav
        .getByRole("link", { name: "Work management", exact: true })
        .count(),
      1,
    );
    const accountingSearch = accountingNav.getByRole("searchbox", {
      name: "Search modules",
      exact: true,
    });
    await accountingSearch.fill("customers");
    assert.equal(
      await accountingNav.locator("a[data-module-link]").count(),
      0,
      "Search cannot expose restricted modules",
    );
    await accountingSearch.press("Escape");
    assert.equal(
      await accountingNav
        .getByRole("link", { name: "Payment Tracking", exact: true })
        .count(),
      1,
    );
    await accounting.page.setViewportSize({ width: 390, height: 844 });
    await accounting.page
      .getByRole("button", { name: "Open menu", exact: true })
      .click();
    assert.equal(
      await accounting.page
        .getByRole("dialog")
        .getByRole("link", { name: "Customers", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(accounting.errors, []);
    assert(
      requests.every((r) => ["GET", "OPTIONS"].includes(r.method)),
      "Unexpected API mutation",
    );
    console.log(
      JSON.stringify({
        desktop: "passed",
        mobile: "passed",
        independentScroll: "passed",
        persistence: "passed",
        groupedNavigation: "passed",
        bilingualModuleSearch: "passed",
        searchPermissions: "passed",
        projectSelection: "passed",
        keyboard: "passed",
        roles: "passed",
        viewports: 7,
        backendWrites: 0,
      }),
    );
    await accounting.context.close();
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
