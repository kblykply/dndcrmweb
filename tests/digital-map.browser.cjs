// All API responses and image uploads are isolated fixtures; all WebSockets are closed.
// Run with PLAYWRIGHT_MODULE pointing to Playwright and FRONTEND_URL to the local build.
const assert = require("node:assert/strict");
// Private topology stays in this Node fixture process and reaches the page only through the mocked API.
const { buildTopology } = require("../../api/scripts/install-digital-map.cjs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = process.env.FRONTEND_URL || "http://localhost:3001";
const output = process.env.SCREENSHOT_DIR || "/private/tmp";
const person = { id: "digital-map-ui-user", name: "Map test administrator", role: "ADMIN", isActive: true };
const topology = buildTopology();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=", "base64");

async function setup(browser, { locale = "tr", role = "ADMIN", dark = false, mobile = false, stored = null } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 900 } : { width: 1680, height: 1120 }, colorScheme: dark ? "dark" : "light" });
  await context.addInitScript(({ locale, role, person, dark }) => {
    localStorage.setItem("accessToken", "isolated-digital-map-test");
    localStorage.setItem("user", JSON.stringify({ ...person, role, ...(role === "PREVIEW" ? { isPreview: true, originalRole: "PREVIEW" } : {}) }));
    localStorage.setItem("crm-locale", locale);
    localStorage.setItem("crm-theme", dark ? "dark" : "light");
  }, { locale, role, person, dark });
  let workspace = stored ? structuredClone(stored) : { ...structuredClone(topology), id: "isolated-map", version: 1, canEdit: true, updatedAt: "2026-09-15T10:00:00Z", updatedByName: person.name };
  let imageBytes = png;
  const requests = [], writes = [], uploads = [], errors = [];
  await context.routeWebSocket("**/*", socket => socket.close());
  await context.route("**/*", async route => {
    const request = route.request(), target = new URL(request.url());
    // These existing app-wide role guards navigate away from forbidden modules.
    // Stub only the permitted landing document to keep this test inside its scope.
    const landing = role === "AFTERSALES" ? "/units" : role === "ACCOUNTING" ? "/finance" : null;
    if (landing && request.resourceType() === "document" && target.origin === new URL(url).origin && target.pathname === landing) {
      return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Allowed landing</title><h1>Allowed role landing</h1>" });
    }
    const isMapApi = /\/digital-map(?:\/images(?:\/[^/]+)?)?$/.test(target.pathname) && ["fetch", "xhr"].includes(request.resourceType()) && !target.searchParams.has("_rsc");
    if (target.origin === new URL(url).origin && !isMapApi) return route.continue();
    requests.push({ path: target.pathname, method: request.method(), origin: target.origin, resourceType: request.resourceType() });
    let body = [];
    if (/\/digital-map\/images\/[^/]+$/.test(target.pathname)) {
      assert(request.headers().authorization?.startsWith("Bearer "), "Private images must be requested with authentication");
      return route.fulfill({ contentType: "image/png", body: imageBytes });
    }
    if (/\/digital-map\/images$/.test(target.pathname) && request.method() === "POST") {
      assert(request.headers()["content-type"].includes("multipart/form-data"), "Uploads use multipart form data");
      uploads.push(request.postDataBuffer().length);
      body = { id: "map-image-fixture", name: "screen.png", mimeType: "image/png", size: imageBytes.length, createdAt: "2026-09-15T10:00:00Z" };
    } else if (isMapApi) {
      if (request.method() === "PUT") {
        const data = request.postDataJSON();
        assert.equal(data.version, workspace.version, "Save uses the loaded version");
        workspace = { ...workspace, ...data, version: workspace.version + 1, updatedAt: "2026-09-15T10:00:00Z", updatedByName: person.name };
        writes.push(structuredClone(workspace));
      }
      body = workspace;
    }
    if (/\/auth\/me$/.test(target.pathname)) body = { ...person, role };
    if (request.resourceType() === "document") return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Isolated preview</title><h1>Preview fixture</h1>" });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  await page.goto(url + "/digital-map");
  if (role === "AFTERSALES" || role === "ACCOUNTING") {
    await page.waitForURL(url + (role === "AFTERSALES" ? "/units" : "/finance"));
    await page.getByRole("heading", { name: "Allowed role landing", exact: true }).waitFor();
  } else await page.getByRole("heading", { name: locale === "tr" ? "Dijital Harita" : "Digital Map", exact: true }).waitFor();
  if (role === "ADMIN") await page.getByTestId("digital-map-canvas").waitFor();
  return { page, context, requests, writes, uploads, errors, getStored: () => structuredClone(workspace), setImageBytes: buffer => { imageBytes = buffer; } };
}
async function settled(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="digital-map-canvas"]');
    return canvas && document.querySelectorAll(".react-flow__node").length === Number(canvas.dataset.visibleNodes)
      && document.querySelectorAll(".react-flow__edge").length === Number(canvas.dataset.visibleEdges);
  });
  await page.waitForTimeout(400); // Inspector/filter refits animate for 280ms after a 100ms debounce.
}
async function fits(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Document must not overflow horizontally");
  const main = page.locator("#crm-main-content");
  if (await main.count()) assert(await main.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Main content must not overflow horizontally");
}
async function save(test, count = test.writes.length + 1) {
  await test.page.getByRole("button", { name: "Haritayı kaydet", exact: true }).click();
  await test.page.getByText("Tüm değişiklikler kaydedildi", { exact: true }).waitFor();
  assert.equal(test.writes.length, count);
}
const node = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
async function drag(page, locator, delta, position = { x: .5, y: .5 }) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(box, "The dragged item must be visible");
  const x = box.x + box.width * position.x, y = box.y + box.height * position.y;
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return { hit: element?.tagName, className: element?.getAttribute("class"), node: element?.closest(".react-flow__node")?.getAttribute("data-id"), width: innerWidth, height: innerHeight };
  }, { x, y });
  const expectedNode = await locator.evaluate(element => element.closest(".react-flow__node")?.getAttribute("data-id"));
  assert.equal(hit.node, expectedNode, "Geometry controls must be inside the visible canvas and receive the pointer");
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + delta.x, y + delta.y, { steps: 14 }); await page.mouse.up();
}
async function checkRestrictedRoles(browser) {
  for (const role of ["MANAGER", "SALES", "CALLCENTER", "AFTERSALES", "ACCOUNTING", "PREVIEW"]) {
    const restricted = await setup(browser, { role });
    try {
      if (!["AFTERSALES", "ACCOUNTING"].includes(role)) {
        await restricted.page.getByRole("alert").filter({ hasText: "yalnızca ADMIN" }).waitFor();
      }
      assert.equal(restricted.requests.filter(request => request.path.includes("/digital-map")).length, 0, `${role} must not request map data or images`);
      assert.equal(await restricted.page.getByTestId("digital-map-canvas").count(), 0, `${role} must not see the map`);
      assert.equal(await restricted.page.locator('a[href="/digital-map"]').count(), 0, `${role} must not have a navigation link`);
      assert.deepEqual(restricted.errors, [], role);
    } finally { await restricted.context.close(); }
  }
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  try {
    if (process.env.AUTH_ONLY === "1") {
      const admin = await setup(browser);
      try {
        await settled(admin.page);
        assert(admin.requests.some(request => request.path === "/digital-map"), "ADMIN can load the map");
        assert.deepEqual(admin.errors, []);
      } finally { await admin.context.close(); }
      await checkRestrictedRoles(browser);
      console.log("Digital Map ADMIN-only browser checks passed; all six non-admin roles blocked.");
      return;
    }
    const test = await setup(browser), { page } = test;
    await settled(page);
    assert.equal(await page.getByTestId("digital-map-canvas").getAttribute("data-view-mode"), "systems");
    assert.equal(await node(page, "service-dnd-crm-ubuntu-backend").count(), 0, "Backend service details collapse in overview");
    assert.equal(await node(page, "service-dnd-cyprus-vercel-website").count(), 1, "Frontend-only groups retain their browser cards");
    assert.equal(await node(page, "service-dnd-cyprus-vercel-panel").count(), 1);
    assert.equal(await page.locator(".react-flow__node.draggable").count(), 0, "Overview coordinates must not be persisted by dragging");
    await fits(page);
    await page.screenshot({ path: output + "/digital-map-desktop.png", fullPage: true });
    assert(await page.getByRole("button", { name: "Haritayı kaydet", exact: true }).isDisabled(), "Loading the saved API fixture must not create unsaved template changes");
    assert.equal(test.writes.length, 0, "Loading the map must not automatically save it");
    const original = test.getStored();
    assert.equal(original.nodes.length, 62);
    assert.equal(original.edges.length, 37);
    assert.equal(original.nodes.filter(item => item.kind === "SERVER").length, 2);
    const automaticPorts = await page.locator('.react-flow__edge[data-id="api-dnd-reserve-website"] .react-flow__edge-path').evaluate(path => {
      const matrix = path.getScreenCTM(), start = path.getPointAtLength(0), end = path.getPointAtLength(path.getTotalLength());
      const source = document.querySelector('[data-id="service-dnd-reserve-vercel-website"]').getBoundingClientRect();
      const target = document.querySelector('[data-id="service-dnd-reserve-ubuntu"]').getBoundingClientRect();
      return { start: new DOMPoint(start.x, start.y).matrixTransform(matrix).x, end: new DOMPoint(end.x, end.y).matrixTransform(matrix).x, sourceLeft: source.left, targetRight: target.right };
    });
    assert(Math.abs(automaticPorts.start - automaticPorts.sourceLeft) < 5 && Math.abs(automaticPorts.end - automaticPorts.targetRight) < 5, "Right-to-left API routes must use the facing card edges");
    await page.getByRole("button", { name: "Çalışma alanını büyüt", exact: true }).click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    assert(await page.getByRole("button", { name: "Teknik detay", exact: true }).isVisible(), "View controls remain inside the fullscreen workspace");
    await page.evaluate(() => document.exitFullscreen()); await settled(page);

    // Adding from a restrictive filter must reveal the new item, and undo restores the fixture.
    await page.getByLabel("Sisteme odaklan", { exact: true }).selectOption("dnd-cyprus");
    await page.getByRole("button", { name: "Erişim yolları", exact: true }).click();
    await page.getByRole("complementary", { name: "Öğe kütüphanesi" }).locator('button[data-kind="BACKEND"]').click();
    await settled(page);
    assert.equal(await page.getByTestId("digital-map-canvas").getAttribute("data-layer"), "ALL");
    assert.equal(await page.getByLabel("Sisteme odaklan", { exact: true }).inputValue(), "");
    assert.equal(await page.locator(".react-flow__node.selected").count(), 1, "The newly added backend must be visible and selected");
    await page.getByRole("button", { name: "Geri al", exact: true }).click();
    assert(await page.getByRole("button", { name: "Haritayı kaydet", exact: true }).isDisabled());

    await page.getByRole("button", { name: "Teknik detay", exact: true }).click();
    await settled(page);
    assert.equal(await page.locator(".react-flow__node").count(), 62);
    assert.equal(await page.locator(".react-flow__node.draggable").count(), 62);
    await page.screenshot({ path: output + "/digital-map-technical.png", fullPage: true });
    assert(await page.getByRole("button", { name: "Haritayı kaydet", exact: true }).isDisabled(), "Changing view must not mutate the saved geometry");

    // Focus a technical service before moving/resizing it inside the Vercel provider.
    await page.getByLabel("Sisteme odaklan", { exact: true }).selectOption("dnd-cyprus");
    await page.getByRole("tab", { name: "Envanter", exact: true }).click();
    await page.getByLabel("Öğe türü filtresi", { exact: true }).selectOption("SERVICE");
    await page.getByLabel("Envanterde ara", { exact: true }).fill("DND Cyprus");
    await page.locator("tbody tr button").click();
    await page.getByRole("tab", { name: "Altyapı haritası", exact: true }).click(); await settled(page);
    const serviceId = "service-dnd-cyprus-vercel", service = node(page, serviceId);
    const originalService = original.nodes.find(item => item.id === serviceId);
    const originalChild = original.nodes.find(item => item.id === serviceId + "-website");
    await drag(page, service, { x: 20, y: 15 }, { x: .3, y: .065 });
    await save(test);
    const moved = test.getStored().nodes.find(item => item.id === serviceId);
    assert.notDeepEqual(moved.position, originalService.position, "Technical dragging persists service coordinates");
    assert.equal(moved.parentId, originalService.parentId);
    assert.deepEqual(test.getStored().nodes.find(item => item.id === originalChild.id).position, originalChild.position, "Moving a service preserves child-relative positions");
    const resize = service.locator(".react-flow__resize-control.bottom.right.handle");
    await resize.waitFor(); await settled(page);
    await drag(page, resize, { x: 25, y: 20 }); await save(test);
    const resized = test.getStored().nodes.find(item => item.id === serviceId);
    assert(resized.width > moved.width && resized.height > moved.height, "Technical resize persists larger bounds");
    assert.deepEqual(test.getStored().nodes.find(item => item.id === originalChild.id).position, originalChild.position);
    await page.getByRole("button", { name: "Geri al", exact: true }).click();
    await page.getByRole("button", { name: "Geri al", exact: true }).click(); await save(test);
    await page.getByRole("button", { name: "Seçimi kapat", exact: true }).click();
    await page.getByLabel("Sisteme odaklan", { exact: true }).selectOption("");
    await page.getByRole("button", { name: "Veri akışı", exact: true }).click();
    await settled(page);
    assert.equal(await page.locator('.react-flow__edge[data-id^="access-"]').count(), 0);
    assert.equal(await page.locator(".react-flow__edge").count(), 12, "Data flow layer isolates the twelve business integrations");
    const bidirectional = page.locator('.react-flow__edge[data-id="data-simpra-pos-inventory"] .react-flow__edge-path');
    assert(await bidirectional.getAttribute("marker-start"), "Bidirectional data edges have a start arrow");
    assert(await bidirectional.getAttribute("marker-end"), "Bidirectional data edges have an end arrow");
    await page.getByRole("button", { name: "Sistem görünümü", exact: true }).click(); await settled(page);
    await page.screenshot({ path: output + "/digital-map-data-flows.png", fullPage: true });
    await page.getByRole("button", { name: "Erişim yolları", exact: true }).click();
    await settled(page);
    assert.equal(await page.locator(".react-flow__edge").count(), 6);
    assert.equal(await page.locator('.react-flow__edge[data-id^="data-"]').count(), 0);

    await page.getByRole("button", { name: "Sistem görünümü", exact: true }).click();
    await page.getByRole("button", { name: "Tüm bağlantılar", exact: true }).click();
    await page.getByLabel("Sisteme odaklan", { exact: true }).selectOption("dnd-crm");
    await settled(page);
    await page.screenshot({ path: output + "/digital-map-crm-filter.png", fullPage: true });
    assert.equal(await node(page, "service-dnd-cyprus-vercel").count(), 0);
    assert.equal(await node(page, "service-dnd-crm-ubuntu").count(), 1);
    await page.getByLabel("Sisteme odaklan", { exact: true }).selectOption("dnd-cyprus");
    await settled(page);
    assert.equal(await page.locator(".react-flow__node").count(), 4, "Cyprus has its Vercel provider, frontend group, site and panel only");
    assert.equal(await page.locator(".react-flow__edge").count(), 0);

    await page.getByLabel("Sisteme odaklan", { exact: true }).selectOption("dnd-reserve");
    await settled(page);
    const panelId = "service-dnd-reserve-vercel-panel";
    await node(page, panelId).click();
    await page.getByLabel("Tıklanabilir bağlantı", { exact: true }).fill("https://panel.example.test/");
    const privateScreenshot = await page.getByTestId("digital-map-canvas").screenshot();
    test.setImageBytes(privateScreenshot);
    await page.getByLabel("Ekran görüntüsü yükle", { exact: true }).setInputFiles({ name: "screen.png", mimeType: "image/png", buffer: privateScreenshot });
    await page.getByRole("button", { name: "Görseli büyüt", exact: true }).waitFor();
    assert.equal(test.uploads.length, 1);
    await save(test);
    const saved = test.getStored();
    assert.equal(saved.nodes.find(item => item.id === panelId).imageId, "map-image-fixture");
    assert.deepEqual(saved.nodes.map(item => item.position), original.nodes.map(item => item.position), "Overview operations must preserve all technical coordinates");
    await page.reload(); await settled(page);
    assert(test.requests.some(request => request.path.endsWith("/images/map-image-fixture")), "Saved screenshots reload through authenticated blob requests");
    await page.getByRole("tab", { name: "Website & paneller", exact: true }).click();
    const previewButton = page.getByRole("button", { name: "Önizle: DND Reserve Booking · panel", exact: true });
    await previewButton.click();
    const preview = page.getByRole("dialog", { name: "DND Reserve Booking · panel", exact: true });
    await preview.waitFor();
    assert(await preview.locator("img").evaluate(image => image.naturalWidth > 0), "The uploaded screenshot renders in the viewer");
    assert.equal(await preview.locator("iframe").count(), 0, "Preview opens the uploaded image before requesting a live website");
    assert.equal(test.requests.filter(request => request.origin === "https://panel.example.test").length, 0);
    assert.equal(await preview.getByRole("link", { name: "Yeni sekmede aç", exact: true }).getAttribute("href"), "https://panel.example.test/");
    await page.screenshot({ path: output + "/digital-map-image-preview.png", fullPage: true });
    await preview.getByRole("button", { name: "Canlı sayfa", exact: true }).click();
    await preview.locator("iframe").waitFor();
    assert.equal(await preview.locator("iframe").getAttribute("src"), "https://panel.example.test/");
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.getByRole("tab", { name: "Veri akışları", exact: true }).click();
    assert.equal(await page.locator("tbody tr").count(), 12);
    await page.getByRole("tab", { name: "Envanter", exact: true }).click();
    await page.getByLabel("Öğe türü filtresi", { exact: true }).selectOption("DATABASE");
    assert.equal(await page.locator("tbody tr").count(), 8);
    assert.deepEqual(test.errors, []);
    await test.context.close();

    const dark = await setup(browser, { locale: "en", dark: true, stored: original });
    await settled(dark.page); await fits(dark.page);
    await dark.page.screenshot({ path: output + "/digital-map-dark.png", fullPage: true });
    assert.deepEqual(dark.errors, []); await dark.context.close();
    const mobile = await setup(browser, { mobile: true, stored: original });
    await settled(mobile.page); await fits(mobile.page);
    assert((await mobile.page.getByRole("complementary", { name: "Öğe kütüphanesi" }).locator("button[data-kind]").evaluateAll(buttons => buttons.slice(0, 4).map(button => {
      const label = button.querySelector(":scope > span:nth-of-type(2)"), box = button.getBoundingClientRect(), text = label.getBoundingClientRect();
      return text.height > 0 && text.top >= box.top && text.bottom <= box.bottom + 1;
    }))).every(Boolean), "Mobile palette labels must remain visible");
    await mobile.page.screenshot({ path: output + "/digital-map-mobile.png", fullPage: true });
    await mobile.page.getByRole("tab", { name: "Website & paneller", exact: true }).click(); await fits(mobile.page);
    assert.deepEqual(mobile.errors, []); await mobile.context.close();
    await checkRestrictedRoles(browser);
    console.log("Digital Map infrastructure browser checks passed: 62 assets, hosting, overview/technical, layers, bidirectional arrows, filters, links, image upload/reload/preview, data flows, inventory, dark/mobile and preview restrictions.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
