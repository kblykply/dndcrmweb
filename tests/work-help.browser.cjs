// All API responses are isolated fixtures. No CRM records are read or modified.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = process.env.FRONTEND_URL || "http://localhost:3001";
const output = process.env.SCREENSHOT_DIR || "/private/tmp";
const person = {
  id: "help-user",
  name: "Example coordinator",
  role: "ADMIN",
  isActive: true,
};
const project = {
  id: "help-project",
  key: "OPS",
  name: "Handover preparation",
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
const task = {
  id: "help-task",
  title: "Prepare the handover file",
  description: "Example work record",
  projectId: project.id,
  project,
  status: "TODO",
  priority: "HIGH",
  kind: "TASK",
  labels: ["Handover"],
  assignedToId: person.id,
  assignedTo: person,
  createdById: person.id,
  createdBy: person,
  version: 1,
  canEdit: true,
  canArchive: true,
  startAt: "2026-09-12T06:00:00Z",
  dueAt: "2026-09-14T14:00:00Z",
  estimateMinutes: 120,
  spentMinutes: 105,
  updatedAt: "2026-09-10T06:00:00Z",
  checklist: [],
  blockers: [],
  subtasks: [],
  _count: { comments: 0, attachments: 0, subtasks: 0 },
};
async function setup(browser, locale = "en", role = "ADMIN") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    ({ locale, person, role }) => {
      localStorage.setItem("accessToken", "isolated-help-test");
      localStorage.setItem("user", JSON.stringify({ ...person, role }));
      localStorage.setItem("crm-locale", locale);
    },
    { locale, person, role },
  );
  const requests = [];
  await context.route("**/*", async (route) => {
    const request = route.request(),
      target = new URL(request.url());
    if (target.origin === new URL(url).origin) return route.continue();
    requests.push({ path: target.pathname, method: request.method() });
    let body = [];
    if (target.pathname === "/tasks/workspace")
      body = {
        projects: role === "PREVIEW" ? [] : [project],
        users: [person],
        departments: [project.department],
        me: { ...person, role },
      };
    else if (target.pathname === "/tasks/report")
      body = {
        total: role === "PREVIEW" ? 0 : 1,
        status: [{ status: "TODO", _count: 1 }],
        priority: [{ priority: "HIGH", _count: 1 }],
        workload: [
          {
            assignedToId: person.id,
            status: "TODO",
            _count: 1,
            _sum: { estimateMinutes: 120 },
          },
        ],
        due: [task],
        overdue: 0,
        estimateMinutes: 120,
        spentMinutes: 105,
      };
    else if (target.pathname === "/tasks")
      body = {
        items: role === "PREVIEW" ? [] : [task],
        total: role === "PREVIEW" ? 0 : 1,
      };
    else if (target.pathname === "/tasks/help-task")
      body = {
        ...task,
        comments: [],
        timeEntries: [],
        activity: [],
        attachments: [],
        blocking: [],
        watching: false,
        agency: { id: "example-agency", name: "Example agency" },
        me: person,
      };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url + "/tasks");
  await page.locator('[data-work-info="overview"]').waitFor();
  if (role !== "PREVIEW")
    await page.getByRole("link", { name: task.title, exact: true }).waitFor();
  return { page, context, requests, errors };
}
async function fits(page) {
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
    "Work area overflow",
  );
  const dialogs = page.locator("dialog[data-work-help][open]");
  if (await dialogs.count())
    assert(
      await dialogs.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= innerWidth + 1 &&
          r.bottom <= innerHeight + 1 &&
          el.scrollWidth <= el.clientWidth + 1
        );
      }),
      "Help dialog outside viewport",
    );
}
const covered = new Set();
async function help(page, topic, root = page) {
  const trigger = root.locator(`[data-work-info="${topic}"]`).first();
  await trigger.click();
  const dialog = page.locator(`dialog[data-work-help="${topic}"][open]`);
  await dialog.waitFor();
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert((await dialog.locator("ol li").count()) > 0);
  assert((await dialog.locator("ul li").count()) > 0);
  await fits(page);
  // Native modal focus must not escape into the underlying page or edit form.
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  assert(
    await trigger.evaluate((el) => el === document.activeElement),
    "Focus must return to help trigger",
  );
  covered.add(topic);
}
async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const { page, context, requests, errors } = await setup(browser);
    for (const topic of [
      "overview",
      "scopes",
      "projects",
      "export",
      "open",
      "overdue",
      "review",
      "completed",
      "filters",
      "board",
    ])
      await help(page, topic);
    await page.getByRole("tab", { name: "List", exact: true }).click();
    await help(page, "list");
    await page
      .getByRole("checkbox", { name: "Select visible items", exact: true })
      .check();
    await help(page, "bulk");
    await page
      .getByRole("button", { name: "Bulk update", exact: true })
      .click();
    await help(page, "bulk", page.getByRole("dialog"));
    await page.keyboard.press("Escape");
    for (const [tab, topic] of [
      ["Calendar", "calendar"],
      ["Timeline", "timeline"],
      ["Reports", "reports"],
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await help(page, topic);
    }
    for (const topic of ["time", "priority", "workload", "upcoming"])
      await help(page, topic);
    await page
      .getByRole("button", { name: "New work item", exact: true })
      .click();
    const form = page.locator("dialog:not([data-work-help])[open]");
    await form
      .getByLabel("Title", { exact: true })
      .fill("Keep this unsaved draft");
    for (const topic of [
      "task",
      "projects",
      "access",
      "workflow",
      "priority",
      "dates",
      "time",
      "labels",
    ])
      await help(page, topic, form);
    await form.locator("summary").click();
    await help(page, "crm", form);
    assert.equal(
      await form.getByLabel("Title", { exact: true }).inputValue(),
      "Keep this unsaved draft",
    );
    assert.equal(
      await form.count(),
      1,
      "Parent form must remain open after help closes",
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "New project", exact: true })
      .click();
    await help(page, "projects", form);
    await help(page, "access", form);
    await page.keyboard.press("Escape");
    await page.goto(url + "/tasks/help-task");
    await page
      .getByRole("heading", { name: task.title, exact: true })
      .waitFor();
    for (const topic of [
      "following",
      "task",
      "checklist",
      "subtasks",
      "dependencies",
      "files",
      "workflow",
      "access",
      "priority",
      "dates",
      "time",
      "labels",
      "crm",
      "archive",
      "comments",
    ])
      await help(page, topic);
    for (const [tab, topic] of [
      ["Time tracking", "time"],
      ["Activity", "activity"],
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await help(page, topic);
    }
    assert.equal(
      covered.size,
      33,
      "All help topics should be reachable in the UI",
    );
    await page.locator('[data-work-info="dependencies"]').click();
    await page.screenshot({ path: `${output}/work-help-desktop.png` });
    await page
      .getByRole("button", { name: "Close information", exact: true })
      .click();
    // Backdrop closes help, without an underlying action.
    await page.locator('[data-work-info="checklist"]').click();
    await page.mouse.click(2, 2);
    await page.locator("dialog[data-work-help]").waitFor({ state: "detached" });
    assert.equal(
      requests.filter((r) => !["GET", "OPTIONS"].includes(r.method)).length,
      0,
      "Help must not submit a form or change data",
    );
    assert(
      !requests.some(
        (r) =>
          /logo|provenance|help/.test(r.path) && r.path !== "/tasks/help-task",
      ),
    );
    assert.deepEqual(errors, []);
    await context.close();

    const turkish = await setup(browser, "tr");
    for (const width of [1920, 1024, 768, 390, 320]) {
      await turkish.page.setViewportSize({
        width,
        height: width <= 390 ? 720 : 900,
      });
      await help(turkish.page, "overview");
      await help(turkish.page, "completed");
    }
    await turkish.page
      .getByRole("button", { name: "Yeni iş", exact: true })
      .click();
    const mobileForm = turkish.page.locator(
      "dialog:not([data-work-help])[open]",
    );
    await mobileForm
      .getByLabel("Başlık", { exact: true })
      .fill("Kaybolmaması gereken taslak");
    await help(turkish.page, "access", mobileForm);
    await mobileForm.locator('[data-work-info="workflow"]').click();
    await turkish.page
      .getByRole("heading", { name: "Örnek uygulama", exact: true })
      .waitFor();
    await turkish.page.screenshot({ path: `${output}/work-help-mobile.png` });
    await turkish.page.keyboard.press("Escape");
    assert.equal(
      await mobileForm.getByLabel("Başlık", { exact: true }).inputValue(),
      "Kaybolmaması gereken taslak",
    );
    await turkish.page.keyboard.press("Escape");
    await turkish.page.setViewportSize({ width: 1440, height: 1000 });
    await turkish.page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    await turkish.page.locator('[data-work-info="overview"]').click();
    await turkish.page.screenshot({ path: `${output}/work-help-dark.png` });
    await fits(turkish.page);
    assert.deepEqual(turkish.errors, []);
    await turkish.context.close();

    const preview = await setup(browser, "en", "PREVIEW");
    await help(preview.page, "overview");
    assert.equal(
      preview.requests.filter((r) => !["GET", "OPTIONS"].includes(r.method))
        .length,
      0,
    );
    await preview.context.close();
    console.log(
      `PASS: ${covered.size} topics, TR/EN, five widths, dark theme, nested forms, focus/Escape/backdrop, preview, no writes.`,
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
