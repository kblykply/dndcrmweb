// Isolated browser fixtures. API requests and sockets are intercepted; no real records are written.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.FRONTEND_URL || "http://localhost:3001";
const screenshotDir = process.env.SCREENSHOT_DIR || "/private/tmp";
const time = "2026-09-16T10:00:00Z";
const admin = { id: "support-admin", name: "Test IT Yöneticisi", role: "ADMIN", isActive: true };
const employee = { id: "support-sales", name: "Test Çalışanı", role: "SALES", isActive: true };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNQqCr+DwAD2AINlIIgnQAAAABJRU5ErkJggg==", "base64");
const openStatuses = ["NEW", "IN_PROGRESS", "WAITING_REQUESTER", "WAITING_VENDOR"];
const screenshotFile = (name = "hata-ekrani.png") => ({ name, mimeType: "image/png", buffer: png });
const clone = value => structuredClone(value);
const actorFor = role => role === "ADMIN" ? admin : role === "SALES" ? employee : { id: `support-${role.toLowerCase()}`, name: `${role} test kullanıcısı`, role, isActive: true };

function createStore() {
  const records = new Map(), files = new Map(), writes = [];
  let sequence = 0, entrySequence = 0;
  function addEntry(ticket, { kind = "REPLY", visibility = "PUBLIC", body = "", actor = admin, status = null, changedFields = [] } = {}, uploads = []) {
    const entry = { id: `entry-${++entrySequence}`, kind, visibility, body, authorName: actor.name, authorId: actor.id, createdAt: time, status, changedFields, attachments: [] };
    uploads.forEach(file => {
      const attachment = { id: `file-${files.size + 1}`, entryId: entry.id, name: file.name, mimeType: file.mimeType, size: file.buffer.length, createdAt: time };
      files.set(attachment.id, { ...attachment, ticketId: ticket.id, visibility, buffer: file.buffer });
      entry.attachments.push(attachment);
    });
    records.get(ticket.id).entries.push(entry);
    return entry;
  }
  function addTicket(input = {}, requester = employee, uploads = []) {
    const number = ++sequence;
    const ticket = {
      id: `fixture-${number}`, number, code: `DND-IT-${String(number).padStart(6, "0")}`,
      subject: "Yazıcı bağlantısı kopuyor", description: "Ofiste yazdırma işlemi tamamlanamıyor.",
      type: "INCIDENT", category: "HARDWARE", impact: "SINGLE", urgency: "NORMAL", priority: "NORMAL",
      status: "NEW", system: "Ofis yazıcısı", location: "Merkez ofis", resolution: "",
      requester: { id: requester.id, name: requester.name }, assignee: null,
      createdAt: time, updatedAt: time, dueAt: null, firstResponseAt: null, resolvedAt: null, closedAt: null, version: 1,
      ...input,
    };
    records.set(ticket.id, { ticket, entries: [], older: [] });
    addEntry(ticket, { kind: "CREATED", actor: requester, body: ticket.description, status: ticket.status }, uploads);
    return ticket;
  }
  const first = addTicket({}, employee, [screenshotFile("ilk-hata.png")]);
  addEntry(first, { kind: "NOTE", visibility: "INTERNAL", body: "GİZLİ IT NOTU: yalnızca yöneticinin teknik değerlendirmesi." }, [{ name: "ic-inceleme.txt", mimeType: "text/plain", buffer: Buffer.from("Yalnızca IT") }]);
  records.get(first.id).older = [{ id: "older-public-entry", kind: "REPLY", visibility: "PUBLIC", body: "Önceki görüşme kaydı.", authorId: admin.id, authorName: admin.name, createdAt: "2026-09-15T10:00:00Z", status: null, changedFields: [], attachments: [] }];
  addTicket({ subject: "CRM erişim talebi", type: "REQUEST", category: "ACCESS", status: "RESOLVED", priority: "LOW", resolution: "Hesap erişimi yeniden düzenlendi.", assignee: { id: admin.id, name: admin.name }, resolvedAt: time });
  for (let i = 0; i < 48; i++) addTicket({ subject: `Kuyruk örneği ${String(i + 1).padStart(2, "0")}`, category: i % 2 ? "SOFTWARE" : "NETWORK", status: i % 3 ? "IN_PROGRESS" : "WAITING_VENDOR", assignee: i % 2 ? { id: admin.id, name: admin.name } : null, priority: i % 4 ? "NORMAL" : "HIGH" }, actorFor("ACCOUNTING"));
  return { records, files, writes, addEntry, addTicket };
}

function requestBody(request) {
  const type = request.headers()["content-type"] || "";
  if (!type.includes("multipart/form-data")) return { payload: request.postData() ? request.postDataJSON() : {}, files: [] };
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(type);
  assert(boundary, "Multipart requests must include a boundary");
  const buffer = request.postDataBuffer();
  assert(buffer, "Multipart requests must include data");
  const parts = buffer.toString("latin1").split(`--${boundary[1] || boundary[2]}`);
  let payload;
  const files = [];
  for (const part of parts) {
    const divider = part.indexOf("\r\n\r\n");
    if (divider < 0) continue;
    const headers = part.slice(0, divider);
    const raw = part.slice(divider + 4).replace(/\r\n$/, "");
    const name = /(?:^|;)\s*name="([^"]+)"/.exec(headers.split("\r\n").find(line => /^content-disposition:/i.test(line)) || "")?.[1];
    if (name === "payload") payload = JSON.parse(Buffer.from(raw, "latin1").toString("utf8"));
    if (name === "files") files.push({ name: /filename="([^"]+)"/.exec(headers)?.[1], mimeType: /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1], buffer: Buffer.from(raw, "latin1") });
  }
  assert(payload, "Multipart request must contain its JSON payload");
  return { payload, files };
}

async function setup(browser, { role = "ADMIN", dark = false, mobile = false, locale = "tr", store = createStore() } = {}) {
  const me = actorFor(role), canManage = role === "ADMIN";
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 900 } : { width: 1600, height: 1080 }, colorScheme: dark ? "dark" : "light" });
  context.setDefaultTimeout(12000);
  await context.addInitScript(({ me, dark, locale }) => {
    localStorage.setItem("accessToken", "isolated-it-support-test");
    localStorage.setItem("user", JSON.stringify({ ...me, ...(me.role === "PREVIEW" ? { originalRole: "PREVIEW", isPreview: true } : {}) }));
    localStorage.setItem("crm-theme", dark ? "dark" : "light");
    localStorage.setItem("crm-locale", locale);
  }, { me, dark, locale });
  const requests = [], errors = [];
  let rejectNext = false;
  const visible = record => canManage || record.ticket.requester.id === me.id;
  const detail = record => {
    const ticket = record.ticket;
    const entries = record.entries.filter(entry => canManage || entry.visibility === "PUBLIC");
    const actions = ticket.requester.id !== me.id ? [] : ticket.status === "RESOLVED" ? ["CONFIRM", "REOPEN", "CANCEL"] : ticket.status === "CLOSED" ? ["REOPEN"] : openStatuses.includes(ticket.status) ? ["CANCEL"] : [];
    return clone({ ticket, canManage, canReply: !["CLOSED", "CANCELLED"].includes(ticket.status), actions,
      allowedStatuses: !canManage ? [] : openStatuses.includes(ticket.status) ? [...new Set([ticket.status, "IN_PROGRESS", "WAITING_REQUESTER", "WAITING_VENDOR", "RESOLVED", "CANCELLED"])] : ticket.status === "RESOLVED" ? ["RESOLVED", "CLOSED", "IN_PROGRESS"] : [ticket.status, "IN_PROGRESS"],
      entries, nextCursor: record.older.length ? "older-fixture-cursor" : null,
      attachments: entries.flatMap(entry => entry.attachments),
    });
  };
  await context.routeWebSocket("**/*", socket => socket.close());
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    const isData = ["fetch", "xhr"].includes(req.resourceType()) && !url.searchParams.has("_rsc") && !url.pathname.startsWith("/_next/");
    const moduleApi = isData && /^\/it-support(?:\/|$)/.test(url.pathname);
    // Only frontend pages and static assets use a real server. Every API and external request is intercepted.
    if (url.origin === new URL(origin).origin && !isData) return route.continue();
    const send = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (!moduleApi) return send(/\/auth\/me$/.test(url.pathname) ? me : []);
    requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: req.method() });
    try {
      assert(req.headers().authorization?.startsWith("Bearer "), "Every module API call must carry authentication");
      if (role === "PREVIEW") return send({ message: "Forbidden" }, 403);
      if (url.pathname === "/it-support/workspace") return send({ me, canManage, agents: canManage ? [admin] : [] });
      if (url.pathname === "/it-support/tickets" && req.method() === "GET") {
        const q = url.searchParams, scope = q.get("scope") || (canManage ? "ALL" : "MINE");
        if (!canManage) assert.equal(scope, "MINE", "Employees must request only their own queue");
        const base = [...store.records.values()].filter(visible).map(record => record.ticket).filter(ticket => scope === "MINE" ? ticket.requester.id === me.id : scope === "ASSIGNED" ? ticket.assignee?.id === me.id : scope === "UNASSIGNED" ? !ticket.assignee : true);
        const stats = { open: base.filter(ticket => openStatuses.includes(ticket.status)).length, waitingRequester: base.filter(ticket => ticket.status === "WAITING_REQUESTER").length, resolved: base.filter(ticket => ticket.status === "RESOLVED").length, unassigned: base.filter(ticket => !ticket.assignee && openStatuses.includes(ticket.status)).length, overdue: base.filter(ticket => openStatuses.includes(ticket.status) && ticket.dueAt && new Date(ticket.dueAt) < new Date()).length };
        const filtered = base.filter(ticket => ["status", "priority", "category", "type"].every(key => !q.get(key) || ticket[key] === q.get(key))).filter(ticket => !q.get("q") || `${ticket.subject} ${ticket.system} ${ticket.requester.name} ${ticket.code}`.toLocaleLowerCase("tr").includes(q.get("q").toLocaleLowerCase("tr")));
        const skip = Number(q.get("skip") || 0), take = Number(q.get("take") || 40);
        return send({ items: filtered.slice(skip, skip + take), total: filtered.length, skip, take, stats });
      }
      if (url.pathname === "/it-support/tickets" && req.method() === "POST") {
        const body = requestBody(req);
        const ticket = store.addTicket(body.payload, me, body.files);
        store.writes.push({ kind: "create", actor: me.id, ticketId: ticket.id, ...body });
        return send(detail(store.records.get(ticket.id)), 201);
      }
      const download = /^\/it-support\/attachments\/([^/]+)$/.exec(url.pathname);
      if (download) {
        const file = store.files.get(download[1]);
        if (!file || !visible(store.records.get(file.ticketId)) || (!canManage && file.visibility === "INTERNAL")) return send({ message: "Not found" }, 404);
        return route.fulfill({ contentType: file.mimeType, headers: { "Cache-Control": "private, no-store" }, body: file.buffer });
      }
      const match = /^\/it-support\/tickets\/([^/]+)(?:\/(entries|triage|actions))?$/.exec(url.pathname);
      assert(match, `Unexpected module endpoint: ${req.method()} ${url.pathname}`);
      const record = store.records.get(match[1]);
      if (!record || !visible(record)) return send({ message: "Not found" }, 404);
      if (req.method() === "GET") return send(match[2] === "entries" ? { items: record.older, nextCursor: null } : detail(record));
      const { payload, files } = requestBody(req), ticket = record.ticket;
      if (rejectNext) { rejectNext = false; return send({ code: "IT_SUPPORT_VERSION_CONFLICT", message: "This ticket changed. Reload before saving again." }, 409); }
      assert.equal(payload.version, ticket.version, "Writes must include the loaded version");
      ticket.version++;
      ticket.updatedAt = time;
      if (match[2] === "entries") {
        assert(canManage || payload.visibility === "PUBLIC", "Employees cannot send internal notes");
        store.addEntry(ticket, { kind: payload.visibility === "INTERNAL" ? "NOTE" : "REPLY", visibility: payload.visibility, body: payload.body, actor: me }, files);
        if (payload.visibility === "PUBLIC" && me.id === ticket.requester.id && ticket.status === "WAITING_REQUESTER") ticket.status = "IN_PROGRESS";
      } else if (match[2] === "triage") {
        assert(canManage, "Only ADMIN may manage tickets");
        const previous = ticket.status;
        Object.assign(ticket, { category: payload.category, priority: payload.priority, status: payload.status, dueAt: payload.dueAt, assignee: payload.assigneeId ? { id: admin.id, name: admin.name } : null });
        if (payload.status === "RESOLVED") { ticket.resolution = payload.reason; ticket.resolvedAt = time; }
        if (payload.status === "IN_PROGRESS" && ["RESOLVED", "CLOSED", "CANCELLED"].includes(previous)) { ticket.resolution = ""; ticket.resolvedAt = null; ticket.closedAt = null; }
        store.addEntry(ticket, { kind: previous !== ticket.status ? "STATUS" : "UPDATED", actor: me, body: payload.reason, status: ticket.status, changedFields: ["category", "priority", "status", "assigneeId", "dueAt"] });
      } else if (match[2] === "actions") {
        assert.equal(ticket.requester.id, me.id);
        ticket.status = payload.action === "CONFIRM" ? "CLOSED" : payload.action === "REOPEN" ? "NEW" : "CANCELLED";
        if (payload.action === "REOPEN") { ticket.resolution = ""; ticket.resolvedAt = null; ticket.closedAt = null; }
        else ticket.closedAt = time;
        store.addEntry(ticket, { kind: "STATUS", actor: me, body: payload.message, status: ticket.status, changedFields: ["status"] });
      } else assert.fail(`Unexpected mutation ${url.pathname}`);
      store.writes.push({ kind: match[2], actor: me.id, ticketId: ticket.id, payload, files });
      return send(detail(record));
    } catch (error) {
      errors.push(error.message);
      return send({ message: error.message }, 500);
    }
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  await page.goto(origin + "/it-support");
  if (role !== "PREVIEW") await page.getByRole("heading", { name: locale === "tr" ? "IT Destek" : "IT Support", exact: true }).waitFor();
  else await page.getByRole("heading", { name: locale === "tr" ? "Çalışan hesabı gerekiyor" : "Employee account required", exact: true }).waitFor();
  return { page, context, requests, errors, store, rejectOnce: () => { rejectNext = true; } };
}

async function fits(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Document horizontal overflow");
  assert(await page.locator("#crm-main-content").evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Module horizontal overflow");
  if (await page.getByRole("dialog").count()) assert(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Dialog horizontal overflow");
}

async function openTicket(test, id) {
  await test.page.goto(`${origin}/it-support/${id}`);
  await test.page.getByRole("heading", { name: test.store.records.get(id).ticket.subject, exact: true }).waitFor();
}

async function manage(test, { status, reason = "", priority, assigneeId, due } = {}) {
  const page = test.page;
  await page.getByRole("button", { name: "Talebi yönet", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Talebi yönet", exact: true });
  if (status) await dialog.getByLabel(/^Durum/).selectOption(status);
  if (priority) await dialog.getByLabel(/^IT önceliği/).selectOption(priority);
  if (assigneeId !== undefined) await dialog.getByLabel(/^IT sorumlusu/).selectOption(assigneeId);
  if (due) await dialog.getByLabel(/^Planlanan hedef tarih/).fill(due);
  if (reason) await dialog.getByLabel(/^Talep sahibine açıklama/).fill(reason);
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  try {
    const store = createStore();
    const requester = await setup(browser, { role: "SALES", store });
    let page = requester.page;
    await page.getByRole("heading", { name: "Yazıcı bağlantısı kopuyor", exact: true }).waitFor();
    assert.equal(store.writes.length, 0, "Opening support must not seed real or fixture records");
    assert.equal(await page.getByRole("button", { name: "Tüm talepler", exact: true }).count(), 0, "Employee must not see all-company queue controls");
    assert.equal(await page.getByRole("heading", { name: /^Kuyruk örneği/ }).count(), 0, "Employee list must not contain other employees' tickets");
    await fits(page);
    await page.screenshot({ path: screenshotDir + "/it-support-employee.png", fullPage: true });
    await openTicket(requester, "fixture-1");
    assert.equal(await page.getByRole("button", { name: "Talebi yönet", exact: true }).count(), 0);
    assert.equal(await page.getByRole("radio").count(), 0, "Employee cannot switch to an internal note");
    assert.equal(await page.getByText(/GİZLİ IT NOTU/).count(), 0);
    assert.equal(await page.getByText("ic-inceleme.txt", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Önceki yazışmaları yükle", exact: true }).click();
    await page.getByText("Önceki görüşme kaydı.", { exact: true }).waitFor();
    assert(requester.requests.some(req => req.path.endsWith("/entries") && req.query.cursor), "Earlier conversation must load using its cursor");

    await page.getByRole("button", { name: "Önizle: ilk-hata.png", exact: true }).first().click();
    let dialog = page.getByRole("dialog", { name: "ilk-hata.png", exact: true });
    await dialog.waitFor();
    assert((await dialog.getByRole("img", { name: "ilk-hata.png", exact: true }).getAttribute("src")).startsWith("blob:"), "Private preview must use an authenticated blob URL");
    await page.waitForFunction(() => { const img = document.querySelector('dialog img[alt="ilk-hata.png"]'); return img?.complete && img.naturalWidth > 0; });
    await dialog.getByRole("button", { name: "Kapat", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "İndir: ilk-hata.png", exact: true }).first().click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "ilk-hata.png");
    assert(requester.requests.filter(req => req.path.startsWith("/it-support/attachments/")).length >= 2);

    await page.goto(origin + "/it-support");
    await page.getByRole("button", { name: "Yeni ticket", exact: true }).first().click();
    dialog = page.getByRole("dialog", { name: "Yeni IT talebi", exact: true });
    await dialog.getByLabel("Konu", { exact: true }).fill("Tarayıcı testi: toplantı ekranı açılmıyor");
    await dialog.getByLabel("Açıklama", { exact: true }).fill("Bu kayıt yalnızca izole tarayıcı testindedir. Ekran bağlantısı kurulurken hata oluşuyor.");
    await dialog.getByLabel("Kategori", { exact: true }).selectOption("HARDWARE");
    await dialog.getByLabel("Uygulama / cihaz", { exact: true }).fill("Toplantı ekranı");
    await dialog.getByLabel("Ofis / konum", { exact: true }).fill("Toplantı odası");
    await dialog.getByLabel("Kim etkileniyor?", { exact: true }).selectOption("TEAM");
    await dialog.getByLabel("İşine etkisi", { exact: true }).selectOption("HIGH");
    await dialog.getByLabel("Ek dosyaları seç", { exact: true }).setInputFiles(screenshotFile());
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await page.waitForURL("**/it-support/fixture-51");
    const createdId = "fixture-51";
    await page.getByRole("heading", { name: store.records.get(createdId).ticket.subject, exact: true }).waitFor();
    const creation = store.writes.find(write => write.kind === "create");
    assert.equal(creation.payload.impact, "TEAM");
    assert.equal(creation.payload.urgency, "HIGH");
    assert.equal(creation.files.length, 1);
    assert.equal(creation.files[0].name, "hata-ekrani.png");
    assert.deepEqual(creation.files[0].buffer, png, "Screenshot binary data survives multipart submission");
    assert.equal(store.records.get(createdId).ticket.requester.id, employee.id);

    const retainedBody = "Başka bir kabloyla da aynı hata devam ediyor.";
    await page.getByLabel("Yanıtınız", { exact: true }).fill(retainedBody);
    await page.getByLabel("Ek dosyaları seç", { exact: true }).setInputFiles(screenshotFile("ek-test.png"));
    requester.rejectOnce();
    await page.getByRole("button", { name: "Yanıt gönder", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: /başka bir işlemle güncellendi/ }).waitFor();
    await page.screenshot({ path: screenshotDir + "/it-support-conflict.png", fullPage: true });
    assert.equal(await page.getByLabel(/^Yanıtınız/).inputValue(), retainedBody, "Version conflict preserves the reply draft");
    assert.equal(await page.getByRole("button", { name: "Kaldır: ek-test.png", exact: true }).count(), 1, "Version conflict preserves selected files");
    // This injected conflict did not mutate the fixture; retry can now safely succeed.
    await page.getByRole("button", { name: "Yanıt gönder", exact: true }).click();
    await page.locator("ol").getByText(retainedBody, { exact: true }).waitFor();
    assert.equal(await page.getByLabel("Yanıtınız", { exact: true }).inputValue(), "");
    const reply = store.writes.at(-1);
    assert.equal(reply.payload.visibility, "PUBLIC");
    assert.equal(reply.files[0].name, "ek-test.png");
    await fits(page);

    const manager = await setup(browser, { store });
    page = manager.page;
    await page.getByRole("heading", { name: "Yazıcı bağlantısı kopuyor", exact: true }).waitFor();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Sonraki", exact: true }).click();
    await page.locator('a[href="/it-support/fixture-31"]').waitFor();
    assert(manager.requests.some(req => req.path === "/it-support/tickets" && Number(req.query.skip) > 0), "Queue must request the next page");
    await page.getByRole("button", { name: "Önceki", exact: true }).click();
    await page.locator('a[href="/it-support/fixture-1"]').waitFor();
    await page.getByLabel("Durum filtresi", { exact: true }).selectOption("RESOLVED");
    await page.getByRole("heading", { name: "CRM erişim talebi", exact: true }).waitFor();
    await page.locator('a[href="/it-support/fixture-1"]').waitFor({ state: "detached" });
    assert.equal(await page.locator('a[href^="/it-support/fixture-"]').count(), 1);
    await page.getByRole("button", { name: "Filtreleri temizle", exact: true }).click();
    await page.getByLabel("Ticket ara", { exact: true }).fill("DND-IT-000051");
    await page.getByRole("heading", { name: store.records.get(createdId).ticket.subject, exact: true }).waitFor();
    assert.equal(await page.locator('a[href^="/it-support/fixture-"]').count(), 1);
    await page.getByRole("button", { name: "Filtreleri temizle", exact: true }).click();
    await page.getByRole("button", { name: "Bana atanan", exact: true }).click();
    await page.getByRole("heading", { name: "CRM erişim talebi", exact: true }).waitFor();
    assert(manager.requests.some(req => req.query.scope === "ASSIGNED"));
    await page.getByRole("button", { name: "Atanmamış", exact: true }).click();
    await page.getByRole("heading", { name: "Yazıcı bağlantısı kopuyor", exact: true }).waitFor();
    await page.getByRole("button", { name: "Tüm talepler", exact: true }).click();
    await fits(page);
    await page.screenshot({ path: screenshotDir + "/it-support-admin-queue.png", fullPage: true });

    await openTicket(manager, createdId);
    await manage(manager, { status: "IN_PROGRESS", priority: "HIGH", assigneeId: admin.id, due: "2026-09-18T16:00", reason: "IT ekibi incelemeyi başlattı." });
    assert.equal(store.records.get(createdId).ticket.assignee.id, admin.id);
    assert.equal(store.records.get(createdId).ticket.status, "IN_PROGRESS");
    assert(store.records.get(createdId).ticket.dueAt);
    await manage(manager, { status: "WAITING_REQUESTER", reason: "Bağlantı kablosunun modelini paylaşır mısınız?" });
    assert.equal(store.records.get(createdId).ticket.status, "WAITING_REQUESTER");
    await openTicket(requester, createdId);
    await requester.page.getByLabel("Yanıtınız", { exact: true }).fill("Kablo modeli HDMI 2.0.");
    await requester.page.getByRole("button", { name: "Yanıt gönder", exact: true }).click();
    await requester.page.locator("ol").getByText("Kablo modeli HDMI 2.0.", { exact: true }).waitFor();
    assert.equal(store.records.get(createdId).ticket.status, "IN_PROGRESS", "Requester reply resumes a ticket waiting on that requester");
    await openTicket(manager, createdId);
    await manage(manager, { status: "WAITING_VENDOR", reason: "Ekran sağlayıcısından sürücü güncellemesi bekleniyor." });
    const publicDraft = "Çalışanla paylaşılacak ayrı yanıt taslağı.";
    const privateDraft = "İÇ NOT TESTİ: sağlayıcıyla teknik değerlendirme.";
    await page.getByLabel("Yanıtınız", { exact: true }).fill(publicDraft);
    await page.getByLabel("Ek dosyaları seç", { exact: true }).setInputFiles(screenshotFile("public-draft.png"));
    await page.getByRole("radio", { name: "İç not · yalnızca IT", exact: true }).check();
    assert.equal(await page.getByLabel("İç not", { exact: true }).inputValue(), "", "Public draft must not become an internal draft");
    assert.equal(await page.getByRole("button", { name: "Kaldır: public-draft.png", exact: true }).count(), 0);
    await page.getByLabel("İç not", { exact: true }).fill(privateDraft);
    await page.getByLabel("Ek dosyaları seç", { exact: true }).setInputFiles({ name: "yonetici-notu.txt", mimeType: "text/plain", buffer: Buffer.from("Yalnızca IT ekibi") });
    await page.getByRole("radio", { name: "Talep sahibine yanıt", exact: true }).check();
    assert.equal(await page.getByLabel("Yanıtınız", { exact: true }).inputValue(), publicDraft, "Switching to public must restore only the public draft");
    assert.equal(await page.getByRole("button", { name: "Kaldır: public-draft.png", exact: true }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "Kaldır: yonetici-notu.txt", exact: true }).count(), 0, "An internal attachment must never carry into a public draft");
    await page.getByRole("radio", { name: "İç not · yalnızca IT", exact: true }).check();
    assert.equal(await page.getByLabel("İç not", { exact: true }).inputValue(), privateDraft);
    assert.equal(await page.getByRole("button", { name: "Kaldır: yonetici-notu.txt", exact: true }).count(), 1);
    await page.getByRole("button", { name: "İç not ekle", exact: true }).click();
    await page.locator("ol").getByText(privateDraft, { exact: true }).waitFor();
    assert.equal(store.writes.at(-1).payload.visibility, "INTERNAL");
    assert.equal(store.writes.at(-1).files[0].name, "yonetici-notu.txt");
    assert.equal(await page.getByLabel("Yanıtınız", { exact: true }).inputValue(), publicDraft, "Sending the internal note preserves the unsent public draft");
    await page.getByLabel("Yanıtınız", { exact: true }).fill("Sağlayıcıyla görüşüyoruz; gelişmeleri paylaşacağız.");
    await page.getByRole("button", { name: "Yanıt gönder", exact: true }).click();
    await page.locator("ol").getByText("Sağlayıcıyla görüşüyoruz; gelişmeleri paylaşacağız.", { exact: true }).waitFor();
    assert.equal(store.writes.at(-1).files[0].name, "public-draft.png");
    assert.equal(store.writes.at(-1).files.length, 1, "A public reply contains only its own draft attachments");
    await fits(page);
    await page.screenshot({ path: screenshotDir + "/it-support-admin-detail.png", fullPage: true });
    await openTicket(requester, createdId);
    assert.equal(await requester.page.getByText(/İÇ NOT TESTİ/).count(), 0);
    assert.equal(await requester.page.getByText("yonetici-notu.txt", { exact: true }).count(), 0);
    await requester.page.getByText("Sağlayıcıyla görüşüyoruz; gelişmeleri paylaşacağız.", { exact: true }).waitFor();

    await manage(manager, { status: "RESOLVED", reason: "Ekran sürücüsü güncellendi ve bağlantı test edildi." });
    await openTicket(requester, createdId);
    page = requester.page;
    await page.getByRole("button", { name: "Çözümü onayla", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Çözümü onayla", exact: true });
    await dialog.getByLabel("Notunuz (isteğe bağlı)", { exact: true }).fill("Teşekkürler, bağlantı çalışıyor.");
    await dialog.getByRole("button", { name: "Çözümü onayla", exact: true }).click();
    await page.getByRole("heading", { name: "Talep kapatıldı", exact: true }).waitFor();
    assert.equal(store.records.get(createdId).ticket.status, "CLOSED");
    assert.equal(await page.getByLabel("Yanıtınız", { exact: true }).count(), 0, "Closed ticket composer is unavailable");
    await page.getByRole("button", { name: "Yeniden aç", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Talebi yeniden aç", exact: true });
    await dialog.getByLabel("Açıklama", { exact: true }).fill("Bir sonraki toplantıda sorun tekrar oluştu.");
    await dialog.getByRole("button", { name: "Talebi yeniden aç", exact: true }).click();
    await page.getByLabel("Yanıtınız", { exact: true }).waitFor();
    assert.equal(store.records.get(createdId).ticket.status, "NEW");
    assert.equal(store.records.get(createdId).ticket.resolution, "");
    await page.getByRole("button", { name: "Talebi iptal et", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Talebi iptal et", exact: true });
    await dialog.getByLabel("Açıklama", { exact: true }).fill("Test kaydı tamamlandı.");
    await dialog.getByRole("button", { name: "Talebi iptal et", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(store.records.get(createdId).ticket.status, "CANCELLED");
    assert.equal(await page.getByLabel("Yanıtınız", { exact: true }).count(), 0);
    assert.deepEqual(requester.errors, []);
    assert.deepEqual(manager.errors, []);
    await requester.context.close();
    await manager.context.close();

    for (const role of ["ADMIN", "MANAGER", "SALES", "CALLCENTER", "AFTERSALES", "ACCOUNTING"]) {
      const view = await setup(browser, { role });
      await view.page.getByRole("button", { name: "Yeni ticket", exact: true }).first().waitFor();
      assert.equal(new URL(view.page.url()).pathname, "/it-support", `${role} must remain in the support module`);
      assert(view.requests.some(req => req.path === "/it-support/workspace"), `${role} may load support workspace`);
      if (role !== "ADMIN") assert.equal(await view.page.getByRole("button", { name: "Tüm talepler", exact: true }).count(), 0);
      assert.deepEqual(view.errors, []);
      await view.context.close();
    }
    const preview = await setup(browser, { role: "PREVIEW" });
    assert.equal(preview.requests.length, 0, "PREVIEW must not fetch support API");
    assert.equal(await preview.page.locator('a[href="/it-support"]').count(), 0, "PREVIEW menu must omit IT Support");
    await preview.page.goto(origin + "/it-support/fixture-1");
    await preview.page.getByRole("heading", { name: "Erişim yetkisi gerekiyor", exact: true }).waitFor();
    assert.equal(preview.requests.length, 0, "PREVIEW detail must not fetch support API");
    assert.deepEqual(preview.errors, []);
    await preview.context.close();

    for (const options of [{ role: "SALES", mobile: true }, { role: "ADMIN", dark: true, locale: "en" }]) {
      const view = await setup(browser, options);
      const en = options.locale === "en";
      await view.page.getByRole("heading", { name: "Yazıcı bağlantısı kopuyor", exact: true }).waitFor();
      await fits(view.page);
      await view.page.screenshot({ path: screenshotDir + (options.mobile ? "/it-support-mobile.png" : "/it-support-dark.png"), fullPage: true });
      if (options.mobile) {
        await view.page.getByRole("heading", { name: "CRM erişim talebi", exact: true }).scrollIntoViewIfNeeded();
        await fits(view.page);
        await view.page.screenshot({ path: screenshotDir + "/it-support-mobile-list.png", fullPage: true });
      }
      await view.page.getByRole("button", { name: en ? "New ticket" : "Yeni ticket", exact: true }).first().click();
      await view.page.getByRole("dialog", { name: en ? "New IT ticket" : "Yeni IT talebi", exact: true }).waitFor();
      await fits(view.page);
      await view.page.screenshot({ path: screenshotDir + (options.mobile ? "/it-support-mobile-form.png" : "/it-support-dark-form.png"), fullPage: true });
      if (options.mobile) {
        await view.page.getByRole("dialog").getByRole("button", { name: "Kaydet", exact: true }).scrollIntoViewIfNeeded();
        await fits(view.page);
        await view.page.screenshot({ path: screenshotDir + "/it-support-mobile-form-bottom.png", fullPage: true });
      }
      await view.page.getByRole("dialog").getByRole("button", { name: en ? "Close" : "Kapat", exact: true }).click();
      await openTicket(view, "fixture-1");
      await fits(view.page);
      await view.page.screenshot({ path: screenshotDir + (options.mobile ? "/it-support-mobile-detail.png" : "/it-support-dark-detail.png"), fullPage: true });
      if (options.mobile) {
        await view.page.getByRole("button", { name: "Yanıt gönder", exact: true }).scrollIntoViewIfNeeded();
        await fits(view.page);
        await view.page.screenshot({ path: screenshotDir + "/it-support-mobile-reply.png", fullPage: true });
      }
      assert.deepEqual(view.errors, []);
      await view.context.close();
    }
    console.log("IT Support browser checks passed: employee creation with multipart PNG, own queue, private attachments, replies and conflict retention, independent PUBLIC/INTERNAL drafts and files, ADMIN filters/paging/assignment/waiting/notes/resolution, requester confirmation/reopen/cancel, six employee roles, PREVIEW denial, mobile and English dark mode.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
