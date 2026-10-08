// Isolated UI fixtures. All API requests and sockets are intercepted; no real records are written.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.FRONTEND_URL || "http://localhost:3001";
const screenshotDir = process.env.SCREENSHOT_DIR || "/private/tmp";
const user = {
  id: "team-test-admin",
  name: "Test Yöneticisi",
  role: "ADMIN",
  isActive: true,
};
const time = "2026-09-16T10:00:00Z";
const member = {
  id: "member-test",
  userId: user.id,
  name: user.name,
  title: "Yazılım geliştirme",
  contact: "",
  isActive: true,
  version: 1,
  createdAt: time,
  updatedAt: time,
};
const record = (id, extra = {}) => ({
  id,
  kind: "PROJECT",
  name: "Örnek geliştirme projesi",
  summary: "İç süreçleri tek panelden izleme çalışması.",
  objective: "Operasyon durumunu görünür kılmak",
  status: "ACTIVE",
  priority: "HIGH",
  health: "ON_TRACK",
  ownerId: member.id,
  startDate: "2026-09-01",
  targetDate: "2026-12-01",
  cadence: "",
  progress: 35,
  nextStep: "İlk ekranların değerlendirilmesi",
  links: [],
  workstreams: [],
  factors: [],
  version: 1,
  createdAt: time,
  updatedAt: time,
  updatedByName: user.name,
  ...extra,
});
async function setup(
  browser,
  { role = "ADMIN", dark = false, mobile = false, locale = "tr" } = {},
) {
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 900 }
      : { width: 1680, height: 1100 },
    colorScheme: dark ? "dark" : "light",
  });
  await context.addInitScript(
    ({ user, role, dark, locale }) => {
      localStorage.setItem("accessToken", "isolated-digital-team-test");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          role,
          ...(role === "PREVIEW"
            ? { originalRole: "PREVIEW", isPreview: true }
            : {}),
        }),
      );
      localStorage.setItem("crm-theme", dark ? "dark" : "light");
      localStorage.setItem("crm-locale", locale);
    },
    { user, role, dark, locale },
  );
  const projects = [
    record("project-example"),
    record("process-example", {
      kind: "PROCESS",
      name: "Haftalık veri kontrolleri",
      status: "PAUSED",
      progress: null,
      cadence: "Her pazartesi",
      health: "AT_RISK",
      priority: "NORMAL",
      nextStep: "Veri sağlayıcı yanıtını bekliyoruz",
    }),
    record("archive-example", {
      name: "Arşiv örneği",
      status: "ARCHIVED",
      progress: 100,
    }),
  ];
  const members = [structuredClone(member)],
    history = new Map(),
    requests = [],
    writes = [],
    errors = [];
  let rejectNext = false;
  const summary = (p) => {
    const { links, workstreams, factors, ...rest } = p;
    return {
      ...rest,
      linkCount: links.length,
      workstreamCount: workstreams.length,
      doneWorkstreamCount: workstreams.filter((w) => w.status === "DONE")
        .length,
      openFactorCount: factors.filter((f) => f.status === "OPEN").length,
      blockingFactorCount: factors.filter(
        (f) => f.status === "OPEN" && f.impact === "BLOCKING",
      ).length,
      lastUpdate:
        (history.get(p.id) || []).find((h) => h.kind === "NOTE") || null,
    };
  };
  const detail = (p) => ({
    project: structuredClone(p),
    canEdit: true,
    updates: history.get(p.id) || [],
    nextCursor: null,
  });
  const activity = (p, kind, body = "", changedFields = []) => {
    history.set(p.id, [
      {
        id: `history-${p.id}-${p.version}`,
        kind,
        body,
        changedFields,
        createdAt: time,
        actorName: user.name,
        projectVersion: p.version,
      },
      ...(history.get(p.id) || []),
    ]);
  };
  projects.forEach((p) => activity(p, "CREATED"));
  await context.routeWebSocket("**/*", (socket) => socket.close());
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    const landing =
      role === "AFTERSALES"
        ? "/units"
        : role === "ACCOUNTING"
          ? "/finance"
          : null;
    if (
      landing &&
      req.resourceType() === "document" &&
      url.origin === new URL(origin).origin &&
      url.pathname === landing
    )
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><h1>Allowed role landing</h1>",
      });
    const api =
      /^\/digital-team(?:\/|$)/.test(url.pathname) &&
      ["fetch", "xhr"].includes(req.resourceType()) &&
      !url.searchParams.has("_rsc");
    if (url.origin === new URL(origin).origin && !api) return route.continue();
    const send = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (!api)
      return send(/\/auth\/me$/.test(url.pathname) ? { ...user, role } : []);
    requests.push({ path: url.pathname, method: req.method() });
    assert(
      req.headers().authorization?.startsWith("Bearer "),
      "All module requests must be authenticated",
    );
    if (role !== "ADMIN")
      return send({ message: "Forbidden", statusCode: 403 }, 403);
    const body = req.postDataJSON();
    if (url.pathname.endsWith("/workspace"))
      return send({
        me: user,
        canEdit: true,
        members,
        candidates: [user],
        projects: projects.map(summary),
      });
    if (url.pathname.includes("/members")) {
      if (req.method() === "POST") {
        const result = {
          ...body,
          id: `member-${members.length}`,
          version: 1,
          createdAt: time,
          updatedAt: time,
        };
        members.push(result);
        writes.push("member");
        return send(result);
      }
      const result = members.find(
        (m) => m.id === url.pathname.split("/").pop(),
      );
      assert.equal(body.version, result.version);
      Object.assign(result, body, { version: result.version + 1 });
      return send(result);
    }
    if (url.pathname === "/digital-team/projects" && req.method() === "POST") {
      const result = record(`created-${projects.length}`, body);
      projects.push(result);
      activity(result, "CREATED");
      writes.push("create");
      return send(detail(result));
    }
    const match = url.pathname.match(
      /^\/digital-team\/projects\/([^/]+)(\/updates)?$/,
    );
    assert(match, url.pathname);
    const p = projects.find((p) => p.id === match[1]);
    if (!p) return send({ message: "Not found", statusCode: 404 }, 404);
    if (req.method() === "GET")
      return send(match[2] ? { items: [], nextCursor: null } : detail(p));
    if (rejectNext) {
      rejectNext = false;
      return send(
        { message: "Project version conflict", statusCode: 409 },
        409,
      );
    }
    assert.equal(
      body.version,
      p.version,
      "Writes must use the current loaded version",
    );
    if (match[2]) {
      p.version++;
      activity(p, "NOTE", body.body);
      writes.push("note");
    } else {
      const changedFields = Object.keys(body).filter(
        (k) =>
          k !== "version" && JSON.stringify(body[k]) !== JSON.stringify(p[k]),
      );
      Object.assign(p, body, { version: p.version + 1 });
      activity(p, "UPDATED", "", changedFields);
      writes.push("update");
    }
    return send(detail(p));
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(origin + "/digital-team");
  if (landingRole(role))
    await page.getByRole("heading", { name: "Allowed role landing" }).waitFor();
  else
    await page
      .getByRole("heading", {
        name:
          role === "ADMIN"
            ? locale === "tr"
              ? "Dijital Ekip"
              : "Digital Team"
            : locale === "tr"
              ? "Yalnızca ADMIN erişimi"
              : "ADMIN access only",
        exact: true,
      })
      .waitFor();
  return {
    page,
    context,
    requests,
    writes,
    errors,
    projects,
    members,
    rejectOnce: () => {
      rejectNext = true;
    },
  };
}
function landingRole(role) {
  return ["AFTERSALES", "ACCOUNTING"].includes(role);
}
async function fits(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Document horizontal overflow",
  );
  const main = page.locator("#crm-main-content");
  assert(
    await main.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    "Module horizontal overflow",
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
    const test = await setup(browser),
      { page } = test;
    await page
      .getByRole("heading", { name: "Örnek geliştirme projesi" })
      .waitFor();
    assert.equal(
      test.writes.length,
      0,
      "Loading the portfolio must not seed records",
    );
    assert.equal(
      await page.getByRole("heading", { name: "Arşiv örneği" }).count(),
      0,
    );
    await fits(page);
    await page.screenshot({
      path: screenshotDir + "/digital-team-desktop.png",
      fullPage: true,
    });
    await page
      .getByLabel("Durum filtresi", { exact: true })
      .selectOption("PAUSED");
    assert.equal(
      await page
        .getByRole("heading", { name: "Örnek geliştirme projesi" })
        .count(),
      0,
    );
    await page
      .getByRole("heading", { name: "Haftalık veri kontrolleri" })
      .waitFor();
    await page.getByLabel("Durum filtresi", { exact: true }).selectOption("");
    await page.getByLabel("Arşivi dahil et", { exact: true }).check();
    await page.getByRole("heading", { name: "Arşiv örneği" }).waitFor();
    await page.getByRole("button", { name: /^Ekip\s*1$/ }).click();
    await page.getByRole("button", { name: "Üye ekle", exact: true }).click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Ad soyad", { exact: true })
      .fill("Test Katılımcısı");
    await dialog
      .getByLabel("Görev / uzmanlık", { exact: true })
      .fill("Frontend");
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await page.getByRole("heading", { name: "Test Katılımcısı" }).waitFor();
    assert.equal(test.members.length, 2);
    await page
      .getByRole("button", { name: "Yeni proje / süreç", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Ad", { exact: true })
      .fill("Tarayıcı test projesi");
    await dialog
      .getByLabel("Kısa özet", { exact: true })
      .fill("Yalnızca izole test verisi");
    await dialog.getByLabel(/^Durum/).selectOption("ACTIVE");
    await dialog.getByLabel(/^İlerleme \(%\)/).fill("20");
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await page.waitForURL("**/digital-team/created-*");
    await page
      .getByRole("heading", { name: "Tarayıcı test projesi", exact: true })
      .waitFor();
    assert.equal(test.projects.at(-1).ownerId, member.id);
    await page.getByRole("tab", { name: /^İş dağılımı/ }).click();
    await page
      .getByRole("button", { name: "İş parçası ekle", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("İş parçası", { exact: true })
      .fill("Frontend ekranları");
    await dialog
      .getByLabel(/^Sorumlu/)
      .selectOption("member-1");
    await dialog.getByLabel(/^Durum/).selectOption("ACTIVE");
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await page.getByRole("heading", { name: "Frontend ekranları" }).waitFor();
    assert.equal(test.projects.at(-1).workstreams[0].ownerId, "member-1");
    await page.getByRole("tab", { name: /^Dış faktörler/ }).click();
    await page
      .getByRole("button", { name: "Dış faktör ekle", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Konu / bağımlılık", { exact: true })
      .fill("Servis sağlayıcı erişimi");
    await dialog
      .getByLabel("Kaynak kişi / kurum / sistem", { exact: true })
      .fill("Test sağlayıcı");
    await dialog.getByLabel(/^Etkisi/).selectOption("BLOCKING");
    await dialog
      .getByLabel("Sonraki adım", { exact: true })
      .fill("Erişim bilgisini bekle");
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await page
      .getByRole("heading", { name: "Servis sağlayıcı erişimi" })
      .waitFor();
    assert.equal(
      test.projects.at(-1).workstreams.length,
      1,
      "Factor save preserves other children",
    );
    await page.getByRole("tab", { name: /^Bağlantılar/ }).click();
    await page
      .getByRole("button", { name: "Bağlantı ekle", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Bağlantı adı", { exact: true })
      .fill("Test paneli");
    await dialog.getByLabel(/^Tür/).selectOption("PANEL");
    await dialog
      .getByLabel("URL", { exact: true })
      .fill("https://example.com/panel");
    test.rejectOnce();
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(
      await dialog.getByLabel("URL", { exact: true }).inputValue(),
      "https://example.com/panel",
      "Conflict retains draft",
    );
    // The simulated conflict did not mutate the record; retry can now succeed.
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    const panelLink = page.getByRole("link", {
      name: "Test paneli",
      exact: true,
    });
    await panelLink.waitFor();
    assert.equal(
      await panelLink.getAttribute("href"),
      "https://example.com/panel",
    );
    assert.equal(await panelLink.getAttribute("target"), "_blank");
    assert.equal(test.projects.at(-1).factors.length, 1);
    await page
      .getByRole("tab", { name: "Geçmiş ve notlar", exact: true })
      .click();
    await page
      .getByLabel("Yeni durum notu", { exact: true })
      .fill("İlk sürüm incelemeye hazır.");
    await page
      .getByRole("button", { name: "Notu paylaş", exact: true })
      .click();
    await page
      .getByText("İlk sürüm incelemeye hazır.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Düzenle", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Durum/).selectOption("COMPLETED");
    assert.equal(
      await dialog.getByLabel(/^İlerleme \(%\)/).inputValue(),
      "100",
    );
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(test.projects.at(-1).status, "COMPLETED");
    assert.equal(
      test.projects.at(-1).links.length,
      1,
      "General edit preserves child arrays",
    );
    await page.getByRole("button", { name: "Arşivle", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Arşivle", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Arşivden çıkar", exact: true })
      .waitFor();
    assert.equal(test.projects.at(-1).status, "ARCHIVED");
    await page
      .getByRole("button", { name: "Arşivden çıkar", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Arşivden çıkar", exact: true })
      .click();
    await page.getByRole("button", { name: "Arşivle", exact: true }).waitFor();
    assert.equal(test.projects.at(-1).status, "PLANNED");
    await page.getByRole("tab", { name: /^Bağlantılar/ }).click();
    await page
      .getByRole("button", { name: "Kaldır: Test paneli", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Kaldır", exact: true })
      .click();
    await page
      .getByText("Bu kayda henüz bağlantı eklenmedi.", { exact: true })
      .waitFor();
    assert.equal(test.projects.at(-1).links.length, 0);
    await page.getByRole("tab", { name: /^İş dağılımı/ }).click();
    await page.getByRole("tab", { name: /^İş dağılımı/ }).press("ArrowRight");
    await page.getByRole("heading", { name: "Dış faktörler ve bağımlılıklar", exact: true }).waitFor();
    await page.getByRole("tab", { name: /^Dış faktörler/ }).press("Home");
    assert.equal(await page.getByRole("tab", { name: "Genel bakış", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: /^İş dağılımı/ }).click();
    await page.getByRole("heading", { name: "Kim hangi bölümden sorumlu?", exact: true }).waitFor();
    await fits(page);
    await page.screenshot({
      path: screenshotDir + "/digital-team-detail.png",
      fullPage: true,
    });
    assert.deepEqual(test.errors, []);
    await test.context.close();
    for (const role of [
      "MANAGER",
      "SALES",
      "CALLCENTER",
      "AFTERSALES",
      "ACCOUNTING",
      "PREVIEW",
    ]) {
      const restricted = await setup(browser, { role });
      assert.equal(
        restricted.requests.length,
        0,
        `${role} must not fetch team data`,
      );
      assert.equal(
        await restricted.page.locator('a[href="/digital-team"]').count(),
        0,
        `${role} menu hidden`,
      );
      if (!landingRole(role)) {
        await restricted.page.goto(origin + "/digital-team/project-example");
        await restricted.page
          .getByText(/yalnızca.*ADMIN|Yalnızca ADMIN/i)
          .first()
          .waitFor();
        assert.equal(
          restricted.requests.length,
          0,
          `${role} detail data hidden`,
        );
      }
      assert.deepEqual(restricted.errors, []);
      await restricted.context.close();
    }
    for (const options of [{ mobile: true }, { dark: true, locale: "en" }]) {
      const view = await setup(browser, options);
      await view.page
        .getByRole("heading", { name: "Örnek geliştirme projesi" })
        .waitFor();
      await fits(view.page);
      await view.page.screenshot({
        path:
          screenshotDir +
          (options.mobile
            ? "/digital-team-mobile.png"
            : "/digital-team-dark.png"),
        fullPage: true,
      });
      assert.deepEqual(view.errors, []);
      await view.context.close();
    }
    console.log(
      "Digital Team browser checks passed: portfolio, filters, member/project creation, responsibilities, external factors, links, conflict retention, notes, archive/restore, ADMIN-only list/detail, mobile and dark mode.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
