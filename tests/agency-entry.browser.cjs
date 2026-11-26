const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

// Run against a local frontend with NEXT_PUBLIC_API_URL set to API_ORIGIN.
// All API requests are mocked. No real users, customers or messages are created.
const base = process.env.BASE_URL || "http://127.0.0.1:43110";
const api = process.env.API_ORIGIN || "http://127.0.0.1:43111";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE
      ? { executablePath: process.env.CHROME_EXECUTABLE }
      : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      timezoneId: "Europe/Istanbul",
    });
    const user = {
      id: "synthetic-entry",
      role: "AGENCY_ENTRY",
      name: "Agency Employee",
      email: "entry@example.invalid",
    };
    await context.addInitScript((account) => {
      localStorage.setItem("user", JSON.stringify(account));
      localStorage.setItem("accessToken", "synthetic-access");
      localStorage.setItem("refreshToken", "synthetic-refresh");
      localStorage.setItem("crm-locale", "tr");
    }, user);
    const rows = [
      {
        id: "synthetic-own",
        fullName: "Synthetic own customer",
        phone: "5550001",
        email: null,
        createdAt: "2026-11-26T10:00:00Z",
      },
    ];
    const forbiddenRequests = [];
    let submitted = null;
    await context.route(`${api}/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      let data,
        status = 200;
      if (request.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": base,
            "access-control-allow-headers": "*",
          },
        });
      if (url.pathname === "/auth/me") data = user;
      else if (url.pathname === "/agency-customers/context")
        data = {
          agency: { id: "synthetic-agency", name: "Synthetic Assigned Agency" },
        };
      else if (
        url.pathname === "/agency-customers" &&
        request.method() === "GET"
      )
        data = { rows, total: rows.length, page: 1, pageSize: 25 };
      else if (
        url.pathname === "/agency-customers" &&
        request.method() === "POST"
      ) {
        submitted = request.postDataJSON();
        const row = {
          ...submitted,
          id: "synthetic-new",
          createdAt: "2026-11-26T11:00:00Z",
        };
        rows.unshift(row);
        data = row;
        status = 201;
      } else {
        forbiddenRequests.push(url.pathname);
        status = 403;
        data = { message: "Forbidden" };
      }
      await route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": base },
        body: JSON.stringify(data),
      });
    });
    const page = await context.newPage();
    await page.goto(`${base}/agency-customers`);
    await page.getByRole("heading", { name: "Eklediğim müşteriler" }).waitFor();
    await page
      .getByRole("button", { name: "Synthetic own customer", exact: true })
      .waitFor();
    assert.equal(
      await page.locator('aside a[href="/agency-customers"]').count(),
      1,
    );
    assert.equal(
      await page
        .locator(
          'aside a[href="/customers"], aside a[href="/tasks"], aside a[href="/finance"]',
        )
        .count(),
      0,
    );
    await page.getByLabel(/^Ad soyad/).fill("Synthetic new customer");
    await page.getByLabel("Telefon", { exact: true }).fill("5551234");
    await page
      .getByRole("button", { name: "Müşteri ekle", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Synthetic new customer", exact: true })
      .waitFor();
    assert.equal(submitted.fullName, "Synthetic new customer");
    for (const key of ["agencyId", "ownerId", "createdById", "type"])
      assert.equal(Object.hasOwn(submitted, key), false);
    await page.getByRole("button", { name: "Profil", exact: true }).click();
    assert.equal(
      await page.getByRole("link", { name: "Profil Ayarları" }).count(),
      0,
    );
    await page.keyboard.press("Escape");
    for (const path of ["/admin/users", "/quality-control"]) {
      await page.goto(`${base}${path}`);
      await page.waitForURL(`${base}/agency-customers`);
      await page
        .getByRole("heading", { name: "Eklediğim müşteriler" })
        .waitFor();
    }
    assert.deepEqual(
      forbiddenRequests,
      [],
      "Restricted UI must not request employee resources",
    );
    console.log(
      JSON.stringify({
        navigation: "single customer module",
        customerCreation: "mocked and scoped",
        profileHidden: true,
        employeeRoutesRedirected: true,
        realDatabaseWrites: 0,
        messagesSent: 0,
      }),
    );
    await context.close();
    const adminContext = await browser.newContext();
    const admin = {
      id: "synthetic-admin",
      role: "ADMIN",
      name: "Admin",
      email: "admin@example.invalid",
      isActive: true,
    };
    await adminContext.addInitScript((account) => {
      localStorage.setItem("user", JSON.stringify(account));
      localStorage.setItem("accessToken", "synthetic-admin-access");
      localStorage.setItem("crm-locale", "tr");
    }, admin);
    let createdUser = null;
    await adminContext.route(`${api}/**`, async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (req.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": base,
            "access-control-allow-headers": "*",
          },
        });
      let data = [];
      if (url.pathname === "/auth/me") data = admin;
      else if (url.pathname === "/users/entry-agencies")
        data = [{ id: "synthetic-agency", name: "Synthetic Assigned Agency" }];
      else if (url.pathname === "/users" && req.method() === "POST") {
        createdUser = req.postDataJSON();
        data = { id: "synthetic-created", ...createdUser };
      } else if (url.pathname === "/users") data = [admin];
      else if (url.pathname === "/notifications/unread-count")
        data = { unread: 0 };
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": base },
        body: JSON.stringify(data),
      });
    });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${base}/admin/users`);
    await adminPage
      .getByPlaceholder("Ad Soyad", { exact: true })
      .fill("Synthetic Agency Employee");
    await adminPage
      .getByPlaceholder("E-posta", { exact: true })
      .fill("new-entry@example.invalid");
    await adminPage
      .getByPlaceholder("Şifre", { exact: true })
      .fill("synthetic-only-password");
    await adminPage
      .getByRole("combobox", { name: "Kullanıcı rolü", exact: true })
      .selectOption("AGENCY_ENTRY");
    const createButton = adminPage.getByRole("button", {
      name: "Oluştur",
      exact: true,
    });
    assert.equal(
      await createButton.isDisabled(),
      true,
      "An agency assignment is mandatory",
    );
    await adminPage
      .getByLabel("Bağlı acente", { exact: true })
      .selectOption("synthetic-agency");
    await createButton.click();
    await adminPage.waitForFunction(
      () => !document.querySelector('input[placeholder="Ad Soyad"]').value,
    );
    assert.equal(createdUser.role, "AGENCY_ENTRY");
    assert.equal(createdUser.entryAgencyId, "synthetic-agency");
    console.log(
      JSON.stringify({
        adminAssignment: "role and required agency submitted correctly",
        realAccountsCreated: 0,
      }),
    );
    await adminContext.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
