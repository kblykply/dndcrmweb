// Every API request is intercepted. This test never writes to the live CRM.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
const apiPort = process.env.API_PORT || "3002";
const sourceBody =
  "Original source paragraph, supplied by the protected API.\n\nSecond source paragraph remains unchanged after workspace edits.";
const meta = (code, title = "Source clause") => ({
  code,
  title,
  titleTr: "Kaynak maddesi",
  parentCode: code === "0.3.1" ? "0.3" : null,
  kind: "clause",
  sourcePages: [7],
  relatedCodes: ["4.4"],
});
function response(code, item) {
  return {
    document: {
      title: "Quality management systems — Requirements",
      reference: "ISO 9001:2026(en)",
      status: "Sixth edition · 2026-09",
      language: "en",
      sourceFile: "ISO_9001_2026.pdf",
      totalPages: 48,
      sha256: "fixture",
    },
    clause: { ...meta(code), body: code === "4" ? "" : sourceBody },
    children: code === "4" ? [meta("4.1")] : [],
    ancestors: code === "0.3.1" ? [meta("0"), meta("0.3")] : [],
    previous: meta("0.3"),
    next: meta("0.3.2"),
    item: { ...item, code },
  };
}
async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const requests = [];
  const errors = [];
  let failNote = false;
  let completedMutations = 0;
  let observedMutations = 0;
  const item = {
    id: "virtual-code",
    code: "0.3.1",
    title: "Çalışma başlığı",
    description: null,
    ownerDepartment: null,
    status: "ACTIVE",
    updatedAt: null,
    checklists: [],
    documents: [],
    logs: [],
  };
  async function contextFor(role, locale = "tr") {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: "Asia/Nicosia",
      acceptDownloads: true,
    });
    await context.addInitScript(
      ({ role, locale }) => {
        localStorage.setItem("accessToken", "isolated-iso-test");
        localStorage.setItem(
          "user",
          JSON.stringify({ id: "test", name: "Test", role }),
        );
        localStorage.setItem("crm-locale", locale);
        localStorage.setItem("crm-theme", "light");
      },
      { role, locale },
    );
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.port !== apiPort) {
        if (url.origin === new URL(frontend).origin) return route.continue();
        return route.abort();
      }
      const method = request.method();
      const body = request.postDataJSON();
      requests.push({ path: url.pathname, method, body, role });
      if (url.pathname === "/iso-2026/source/pdf") {
        assert.equal(
          request.headers().authorization,
          "Bearer isolated-iso-test",
        );
        return route.fulfill({
          contentType: "application/pdf",
          body: "%PDF-1.4\nfixture\n%%EOF",
        });
      }
      const match = url.pathname.match(
        /^\/iso-2026\/([^/]+)(?:\/(checklists|documents|logs)(?:\/([^/]+))?)?$/,
      );
      if (!match)
        return route.fulfill({ contentType: "application/json", body: "[]" });
      const [, code, collection, recordId] = match;
      let result = {};
      if (method === "GET") result = response(decodeURIComponent(code), item);
      else {
        assert.notEqual(role, "PREVIEW", "preview must not mutate");
        assert.ok(
          !Object.keys(body || {}).some((key) =>
            ["code", "id", "body"].includes(key),
          ),
          "source/code must never be patched",
        );
        if (collection === "logs" && failNote) {
          failNote = false;
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ message: "Test notu kaydedilemedi" }),
          });
        }
        if (!collection)
          Object.assign(item, body, { updatedAt: "2026-09-25T12:00:00Z" });
        else if (method === "POST") {
          result = {
            id: `${collection}-1`,
            ...body,
            isChecked: false,
            createdAt: "2026-09-25T12:00:00Z",
            ...(collection === "logs"
              ? {
                  action: "ISO2026_NOTE_CREATE",
                  createdBy: { id: "test", name: "Test" },
                }
              : {}),
          };
          item[collection].push(result);
        } else if (method === "PATCH")
          Object.assign(
            item[collection].find((row) => row.id === recordId),
            body,
          );
        else if (method === "DELETE")
          item[collection] = item[collection].filter(
            (row) => row.id !== recordId,
          );
      }
      if (method !== "GET") completedMutations++;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    return { context, page };
  }
  async function saved(page) {
    const target = ++observedMutations;
    for (let count = 0; count < 500 && completedMutations < target; count++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(
      completedMutations >= target,
      "the expected mutation must reach the mock API",
    );
    await page
      .getByRole("status")
      .filter({ hasText: "Değişiklik kaydedildi." })
      .waitFor();
  }
  async function sourceIntact(page) {
    assert.equal(
      await page
        .locator('article[lang="en"] p')
        .allTextContents()
        .then((rows) => rows.join("\n\n")),
      sourceBody,
    );
  }
  async function noOverflow(page, width) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, `document overflow at ${width}px`);
  }
  try {
    const { page, context } = await contextFor("ADMIN");
    await page.goto(`${frontend}/iso-2026/0.3.1`);
    await page
      .getByRole("heading", { name: "İngilizce madde metni", exact: true })
      .waitFor();
    await sourceIntact(page);
    assert.equal(
      requests.filter((row) => row.path === "/iso-2026/0.3.1").length,
      1,
    );
    assert.ok((await page.locator('a[href="/iso-2026/4.4"]').count()) > 0);
    await page
      .getByLabel("Uygulama açıklaması", { exact: true })
      .fill("Yerel uygulama notları");
    await page
      .getByLabel("Sorumlu departman", { exact: true })
      .fill("Kalite ekibi");
    await page
      .getByLabel("Süreç durumu", { exact: true })
      .selectOption("NEEDS_REVIEW");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await saved(page);
    assert.equal(item.description, "Yerel uygulama notları");
    await sourceIntact(page);

    await page.getByRole("tab", { name: /Kontroller/ }).click();
    await page
      .getByLabel("Kontrol maddesi", { exact: true })
      .fill("Kanıt kontrolü");
    await page.getByLabel("Termin tarihi", { exact: true }).fill("2020-01-01");
    await page.getByLabel("Zorunlu kontrol", { exact: true }).check();
    await page
      .getByRole("button", { name: "Kontrol ekle", exact: true })
      .click();
    await saved(page);
    await page.getByText("Gecikmiş", { exact: true }).waitFor();
    await page
      .getByRole("checkbox", {
        name: "Kanıt kontrolü: tamamlandı olarak işaretle",
        exact: true,
      })
      .click();
    await saved(page);
    await page
      .getByRole("checkbox", {
        name: "Kanıt kontrolü: tamamlanmadı olarak işaretle",
        exact: true,
      })
      .waitFor();
    assert.equal(item.checklists[0].isChecked, true);
    assert.equal(await page.getByText("Gecikmiş", { exact: true }).count(), 0);
    await page
      .getByRole("button", {
        name: "Kanıt kontrolü kontrolünü sil",
        exact: true,
      })
      .click();
    await page
      .getByRole("alert")
      .getByRole("button", { name: "Sil", exact: true })
      .click();
    await saved(page);
    assert.equal(item.checklists.length, 0);

    await page.getByRole("tab", { name: /Belgeler/ }).click();
    await page.getByRole("button", { name: "Belge ekle", exact: true }).click();
    await page
      .getByLabel("Belge adı", { exact: true })
      .fill("Kalite prosedürü");
    await page
      .getByLabel("Belge bağlantısı", { exact: true })
      .fill("https://example.com/procedure");
    await page.getByLabel("Revizyon", { exact: true }).fill("R1");
    await page
      .getByRole("button", { name: "Belgeyi kaydet", exact: true })
      .click();
    await saved(page);
    assert.equal(
      await page
        .getByRole("link", { name: "Belgeyi aç", exact: true })
        .getAttribute("href"),
      "https://example.com/procedure",
    );
    await page.getByRole("button", { name: "Düzenle", exact: true }).click();
    await page.getByLabel("Revizyon", { exact: true }).fill("R2");
    await page
      .getByLabel("Belge durumu", { exact: true })
      .selectOption("NEEDS_REVIEW");
    await page
      .getByRole("button", { name: "Belgeyi kaydet", exact: true })
      .click();
    await saved(page);
    await page.getByText("Prosedür · Revizyon R2", { exact: true }).waitFor();
    assert.equal(item.documents[0].revision, "R2");
    assert.equal(item.documents[0].status, "NEEDS_REVIEW");
    await page.getByRole("button", { name: "Sil", exact: true }).click();
    await page
      .getByRole("alert")
      .getByRole("button", { name: "Sil", exact: true })
      .click();
    await saved(page);
    assert.equal(item.documents.length, 0);

    await page.getByRole("tab", { name: /Notlar/ }).click();
    await page
      .getByLabel("Yeni not", { exact: true })
      .fill("Denetim öncesi güncelleme");
    failNote = true;
    await page.getByRole("button", { name: "Not ekle", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Test notu kaydedilemedi" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Yeni not", { exact: true }).inputValue(),
      "Denetim öncesi güncelleme",
    );
    await page.getByRole("button", { name: "Not ekle", exact: true }).click();
    await saved(page);
    await page
      .getByRole("heading", { name: "Not eklendi", exact: true })
      .waitFor();
    await sourceIntact(page);

    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Kaynak PDF’yi indir", exact: true })
      .click();
    assert.equal(
      (await downloadEvent).suggestedFilename(),
      "ISO_9001_2026.pdf",
    );
    for (const width of [1440, 768, 390, 320]) await noOverflow(page, width);
    await page.screenshot({
      path: "/private/tmp/iso-clause-mobile.png",
      fullPage: true,
    });
    await page.goto(`${frontend}/iso-2026/4`);
    await page
      .getByText("Bu başlığın metni aşağıdaki alt maddelerde yer alıyor.", {
        exact: true,
      })
      .waitFor();
    assert.ok((await page.locator('a[href="/iso-2026/4.1"]').count()) > 0);
    await page.goto(`${frontend}/iso-2026/0.3.2`);
    await page
      .getByRole("heading", { name: "İngilizce madde metni", exact: true })
      .waitFor();
    await page.getByRole("figure").waitFor();
    assert.ok(
      (await page
        .getByRole("figure")
        .locator('a[href="/iso-2026/5"]')
        .count()) > 0,
    );
    await noOverflow(page, 390);
    await context.close();

    const preview = await contextFor("PREVIEW", "en");
    await preview.page.goto(`${frontend}/iso-2026/0.3.1`);
    await preview.page
      .getByText("Preview account: workspace records are read-only.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await preview.page
        .getByLabel("Implementation notes", { exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await preview.page
        .getByRole("button", { name: "Save", exact: true })
        .count(),
      0,
    );
    await preview.page.getByRole("tab", { name: /Checklist/ }).click();
    assert.equal(
      await preview.page
        .getByRole("button", { name: "Add item", exact: true })
        .count(),
      0,
    );
    await preview.page.getByRole("tab", { name: /Documents/ }).click();
    assert.equal(
      await preview.page
        .getByRole("button", { name: "Add document", exact: true })
        .count(),
      0,
    );
    await sourceIntact(preview.page);
    assert.equal(
      requests.some((row) => row.path.startsWith("/quality-control")),
      false,
    );
    assert.equal(
      requests.some((row) => row.role === "PREVIEW" && row.method !== "GET"),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        result: "PASS",
        checks: [
          "source immutability",
          "working record PATCH",
          "checklist create/toggle/delete",
          "document create/update/delete",
          "note retry",
          "authenticated PDF",
          "empty parent navigation",
          "embedded diagrams",
          "PREVIEW read-only",
          "EN navigation",
          "320–1440px overflow",
        ],
        isoRequests: requests.filter((row) => row.path.startsWith("/iso-2026"))
          .length,
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
