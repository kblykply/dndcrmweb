// Isolated UI regression: every API request and Socket.IO connection is mocked.
// Uses only catalog metadata; never reads a real session or authenticates.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
const output = process.env.SCREENSHOT_DIR || "/private/tmp";
const source = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../api/src/iso-2026/iso-2026-source.json"),
    "utf8",
  ),
);
const clauses = source.clauses.map((clause) => {
  const metadata = { ...clause };
  delete metadata.body;
  return metadata;
});
const codes = new Set(clauses.map((clause) => clause.code));
const fixture = {
  document: source.document,
  clauses,
  items: ["4", "5", "6", "7", "8", "9", "10"].map((code) => ({
    code,
    status: code === "6" ? "NEEDS_REVIEW" : "ACTIVE",
    ownerDepartment: null,
    checklistTotal: 0,
    checklistDone: 0,
    documentsTotal: 0,
  })),
  totals: {
    checklistTotal: 0,
    checklistDone: 0,
    documents: 0,
    cardsNeedReview: 1,
    overdueChecklist: 0,
  },
};

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1250 },
      timezoneId: "Asia/Nicosia",
    });
    await context.addInitScript(() => {
      localStorage.setItem("accessToken", "browser-fixture-only");
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "iso-browser-fixture",
          name: "Browser fixture",
          role: "ADMIN",
        }),
      );
      localStorage.setItem("crm-locale", "tr");
      localStorage.setItem("crm-theme", "light");
      localStorage.setItem("crm-sidebar-collapsed", "false");
    });
    await context.routeWebSocket("**/socket.io/**", (socket) => socket.close());
    const requests = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const applicationFetch =
        ["fetch", "xhr"].includes(request.resourceType()) &&
        !url.pathname.startsWith("/_next") &&
        request.headers().rsc !== "1";
      if (url.origin === new URL(frontend).origin && !applicationFetch)
        return route.continue();
      requests.push({ path: url.pathname, method: request.method() });
      assert(
        ["GET", "OPTIONS"].includes(request.method()),
        `Unexpected mutation: ${request.method()} ${url.pathname}`,
      );
      let body = [];
      if (url.pathname === "/iso-2026") body = fixture;
      else if (url.pathname === "/notifications/unread-count")
        body = { unread: 0 };
      else if (url.pathname === "/users/me" || url.pathname === "/auth/me")
        body = {
          id: "iso-browser-fixture",
          name: "Browser fixture",
          role: "ADMIN",
        };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`${frontend}/iso-2026`);
    const main = page.locator("#crm-main-content");
    await main.locator("[data-chapter]").first().waitFor();
    assert.equal(await main.count(), 1);
    assert.equal(await main.locator("[data-chapter]").count(), 7);
    assert.equal(
      await page.locator('#crm-sidebar a[href="/iso-2026"]').count(),
      1,
      "New navigation entry",
    );
    assert.equal(
      await page.locator('#crm-sidebar a[href="/quality-control"]').count(),
      1,
      "Existing quality entry",
    );
    assert.equal(
      await main
        .getByRole("link", { name: "Mevcut kalite modülü" })
        .getAttribute("href"),
      "/quality-control",
    );
    assert.equal(
      await page.locator("#pdca-tab").getAttribute("aria-selected"),
      "true",
    );
    const diagramLinks = [];
    async function verifyDiagram(expected) {
      const links = await page
        .locator("#map-panel figure a")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            href: element.getAttribute("href"),
            label: element.getAttribute("aria-label"),
          })),
        );
      assert.equal(links.length, expected);
      for (const link of links) {
        assert(link.label, `Missing accessible label: ${link.href}`);
        const code = decodeURIComponent(
          new URL(link.href, frontend).pathname.split("/").at(-1),
        );
        assert(
          codes.has(code),
          `Diagram targets missing source clause ${code}`,
        );
      }
      diagramLinks.push(...links);
    }
    async function checkLayout(width) {
      await page.setViewportSize({ width, height: 1250 });
      await page.waitForTimeout(120);
      const result = await main.evaluate((element) => ({
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        mainWidth: element.clientWidth,
        mainScrollWidth: element.scrollWidth,
        issues: [...element.querySelectorAll("figure a")].flatMap((link) => {
          const rect = link.getBoundingClientRect();
          return rect.left < 0 ||
            rect.right > innerWidth + 1 ||
            link.scrollWidth > link.clientWidth + 1
            ? [
                {
                  label: link.getAttribute("aria-label"),
                  left: rect.left,
                  right: rect.right,
                  scroll: link.scrollWidth,
                  client: link.clientWidth,
                },
              ]
            : [];
        }),
      }));
      assert(
        result.documentWidth <= width + 1,
        `Document overflow at ${width}`,
      );
      assert(
        result.mainScrollWidth <= result.mainWidth + 1,
        `AppShell main overflow at ${width}`,
      );
      assert.deepEqual(result.issues, [], `Diagram overflow at ${width}`);
      return result;
    }
    await verifyDiagram(13);
    const layouts = [await checkLayout(1440)];
    await page.screenshot({
      path: path.join(output, "iso-2026-overview-desktop.png"),
    });
    await page.locator("#process-tab").click();
    await page.waitForFunction(
      () => document.querySelectorAll("#map-panel figure a").length === 9,
    );
    assert.equal(
      await page.locator("#process-tab").getAttribute("aria-selected"),
      "true",
    );
    assert.equal(
      await page.locator("#map-panel").getAttribute("aria-labelledby"),
      "process-tab",
    );
    await verifyDiagram(9);
    assert.equal(diagramLinks.length, 22);
    await page.locator("#pdca-tab").click();

    const directory = page.locator("#clause-index");
    const search = page.getByRole("searchbox", {
      name: "Madde ara",
      exact: true,
    });
    await search.fill("6.1.2");
    await directory.getByRole("status").waitFor();
    assert.equal(
      await directory.locator('a[href="/iso-2026/6.1.2"]').count(),
      1,
    );
    assert.match(await directory.innerText(), /Risklere yönelik faaliyetler/);
    await search.fill("GENEL");
    assert(
      (await directory.locator("a").count()) > 0,
      "Turkish generic titles must be searchable",
    );
    assert.match(await directory.innerText(), /Genel/);
    await search.fill("kurulusun");
    assert.equal(
      await directory.locator('a[href="/iso-2026/4.1"]').count(),
      1,
      "ASCII Turkish title search",
    );
    await search.fill("");
    await page
      .getByRole("combobox", { name: "Bölüm filtresi", exact: true })
      .selectOption("6");
    const chapterHrefs = await directory
      .locator("a")
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute("href"))
          .filter((href) => href.startsWith("/iso-2026/")),
      );
    assert(
      chapterHrefs.length > 1 &&
        chapterHrefs.every((href) => /\/6(?:\.|$)/.test(href)),
      "Chapter scope",
    );
    await search.fill("zz-no-clause-match");
    await directory
      .getByRole("heading", { name: "Eşleşen madde bulunamadı" })
      .waitFor();
    assert.equal(await directory.locator("a").count(), 0);
    await directory
      .getByRole("button", { name: "Filtreleri temizle", exact: true })
      .click();
    assert.equal(await main.locator("[data-chapter]").count(), 7);
    assert.equal(await search.inputValue(), "");
    assert.equal(
      await page
        .getByRole("combobox", { name: "Bölüm filtresi", exact: true })
        .inputValue(),
      "ALL",
    );

    layouts.push(await checkLayout(390));
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Ana menü", exact: true });
    await drawer.waitFor();
    assert.equal(await drawer.locator('a[href="/iso-2026"]').count(), 1);
    assert.equal(await drawer.locator('a[href="/quality-control"]').count(), 1);
    await drawer
      .getByRole("button", { name: "Menüyü kapat", exact: true })
      .click();
    await drawer.waitFor({ state: "hidden" });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.getElementById("crm-main-content").scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(output, "iso-2026-overview-mobile.png"),
      fullPage: true,
    });
    await page.locator("#map-panel").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(output, "iso-2026-overview-map-mobile.png"),
    });
    await page.locator("#process-tab").click();
    layouts.push(await checkLayout(390));
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.getElementById("crm-main-content").scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(output, "iso-2026-overview-process-mobile.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("crm-theme", "dark");
    });
    await page.locator("#pdca-tab").click();
    layouts.push(await checkLayout(1440));
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.getElementById("crm-main-content").scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(output, "iso-2026-overview-dark.png"),
    });
    assert(
      requests.some((request) => request.path === "/iso-2026"),
      "Overview used mocked API",
    );
    assert(
      requests.every((request) => ["GET", "OPTIONS"].includes(request.method)),
      "No mutation",
    );
    assert.deepEqual(errors, [], "Browser console/runtime errors");
    console.log(
      JSON.stringify({
        passed: true,
        clauseMetadataCount: clauses.length,
        diagramLinks: diagramLinks.length,
        layouts,
        mockRequests: requests,
      }),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
