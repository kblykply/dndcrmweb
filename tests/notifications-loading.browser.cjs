// Standalone regression against the development React/StrictMode application.
// All HTTP business requests and Socket.IO traffic are intercepted locally.
// No real API writes, user credentials, or server messages are used.
// PLAYWRIGHT_MODULE=/private/tmp/iso2026-browser-tools/node_modules/playwright node tests/notifications-loading.browser.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/private/tmp/iso2026-browser-tools/node_modules/playwright");
const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin;

async function until(check, message) {
  const deadline = Date.now() + 15000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function scenario(browser, socketsAvailable) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const calls = { list: 0, count: 0 };
  const connections = [], errors = [], unexpected = [];
  let allowInitialConnect = false;
  try {
    await context.addInitScript(() => {
      localStorage.setItem("accessToken", "isolated-notifications-loading-test");
      localStorage.setItem("user", JSON.stringify({ id: "notification-test", name: "Synthetic Tester", role: "ADMIN" }));
      localStorage.setItem("crm-locale", "tr");
      // Exercise the actual registered polling callback without waiting one minute.
      // Cleanup must leave only one active poll after StrictMode effect replay.
      const set = window.setInterval.bind(window), clear = window.clearInterval.bind(window);
      window.__notificationPolls = new Map();
      window.setInterval = (handler, delay, ...args) => {
        const id = set(handler, delay, ...args);
        if (delay === 60000 && typeof handler === "function") window.__notificationPolls.set(id, () => handler(...args));
        return id;
      };
      window.clearInterval = (id) => { window.__notificationPolls.delete(id); clear(id); };
    });
    await context.routeWebSocket("**/*", (socket) => {
      if (!new URL(socket.url()).pathname.startsWith("/socket.io") || !socketsAvailable) return socket.close();
      const connection = { socket, authenticated: false, joins: 0 };
      connections.push(connection);
      socket.onMessage((raw) => {
        const message = String(raw);
        if (message.startsWith("40")) {
          connection.authenticated = true;
          if (allowInitialConnect) socket.send(`40${JSON.stringify({ sid: `synthetic-${connections.length}` })}`);
        } else if (message.startsWith("42")) {
          const [event] = JSON.parse(message.slice(2));
          if (event === "notifications:join") connection.joins++;
          else unexpected.push(`Socket emit: ${event}`);
        }
      });
      socket.send(`0${JSON.stringify({ sid: `engine-${connections.length}`, upgrades: [], pingInterval: 3600000, pingTimeout: 3600000, maxPayload: 1000000 })}`);
    });
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
      if (request.method() === "GET" && path === "/notifications") {
        calls.list++;
        body = [{ id: "http-fixture", title: `HTTP load ${calls.list}`, type: "TEST", isRead: true, createdAt: "2026-09-29T09:00:00Z" }];
      } else if (request.method() === "GET" && path === "/notifications/unread-count") {
        calls.count++;
        body = { unread: 0 };
      } else if (request.method() === "GET" && path === "/leads") {
        body = { items: [], total: 0, totalPages: 1, page: 1, pageSize: 25 };
      } else {
        unexpected.push(`${request.method()} ${path}`);
        body = {};
      }
      return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/leads`, { timeout: 60000 });
    const bell = page.getByRole("button", { name: "Bildirimler", exact: true });
    await bell.click();
    const panel = page.locator("#notif-panel");
    await panel.getByText("HTTP load 1", { exact: true }).waitFor();
    assert.deepEqual(calls, { list: 1, count: 1 }, "Initial HTTP load remains independent of WebSocket availability");
    assert.equal(await page.evaluate(() => window.__notificationPolls.size), 1, "Effect cleanup retains exactly one polling interval");

    if (socketsAvailable) {
      await until(() => connections.at(-1)?.authenticated, "Socket.IO client handshake missing");
      allowInitialConnect = true;
      const first = connections.at(-1);
      first.socket.send('40{"sid":"first-connected"}');
      await until(() => first.joins === 1, "Initial connection did not join notifications");
      // Flush work queued by the connect handler, including any redundant fetch.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.deepEqual(calls, { list: 1, count: 1 }, "The first successful connect must not duplicate the completed mount load");

      const socketNotification = { id: "socket-fixture", title: "Socket fixture", type: "TEST", isRead: false, createdAt: "2026-09-29T09:01:00Z" };
      first.socket.send(`42${JSON.stringify(["notification:new", socketNotification])}`);
      await panel.getByText("Socket fixture", { exact: true }).waitFor();
      first.socket.send('42["notification:unread-count",{"unread":7}]');
      await panel.getByText("7 yeni", { exact: true }).waitFor();
      first.socket.send('42["notification:read",{"id":"socket-fixture"}]');
      await panel.getByRole("button", { name: "Okundu", exact: true }).waitFor({ state: "detached" });
      first.socket.send('42["notification:deleted",{"id":"socket-fixture"}]');
      await panel.getByText("Socket fixture", { exact: true }).waitFor({ state: "detached" });
      assert.deepEqual(calls, { list: 1, count: 1 }, "Socket event handlers preserve their existing local updates");

      first.socket.close({ code: 1011, reason: "Isolated reconnect test" });
      await until(() => connections.at(-1) !== first && connections.at(-1)?.joins === 1, "Socket did not reconnect and rejoin");
      await panel.getByText("HTTP load 2", { exact: true }).waitFor();
      assert.deepEqual(calls, { list: 2, count: 2 }, "A real reconnect refreshes both HTTP resources once");
    }

    const beforePoll = { ...calls };
    await page.evaluate(() => [...window.__notificationPolls.values()].forEach((run) => run()));
    await panel.getByText(`HTTP load ${beforePoll.list + 1}`, { exact: true }).waitFor();
    assert.deepEqual(calls, { list: beforePoll.list + 1, count: beforePoll.count + 1 }, "The registered one-minute poll still refreshes notifications");

    const beforeRemount = { ...calls };
    await page.reload();
    await bell.click();
    await panel.getByText(`HTTP load ${beforeRemount.list + 1}`, { exact: true }).waitFor();
    if (socketsAvailable) await until(() => connections.at(-1)?.joins === 1, "Remounted socket did not join");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(calls, { list: beforeRemount.list + 1, count: beforeRemount.count + 1 }, "A new mounted instance loads once; it has no shared connection cache");
    assert.deepEqual(unexpected, [], "No unexpected HTTP calls or socket emissions");
    assert.deepEqual(errors, [], "No browser errors");
    return { socket: socketsAvailable ? "connected" : "unavailable", initialLoad: "pass", initialConnectDedup: socketsAvailable ? "pass" : "n/a", reconnect: socketsAvailable ? "pass" : "n/a", interval: "pass", remount: "pass", notificationEvents: socketsAvailable ? "pass" : "n/a" };
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  try {
    console.log(JSON.stringify(await scenario(browser, true)));
    console.log(JSON.stringify(await scenario(browser, false)));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
