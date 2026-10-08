import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(new URL("../src/app/(app)/digital-map/_lib/" + name + ".ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  modules.set(name, exports);
  new Function("exports", "require", compiled)(exports, (path) => load(path.replace(/^\.\//, "")));
  return exports;
}
const { nodeKinds, edgeKinds } = load("types");
const { createNode, createEdge, createTemplate, canContain, descendants, removeNode, absolutePosition, reparentNode, normalizeDocument, accessRoutes, CONTAINER_HEADER, CONTAINER_PADDING } = load("model");
const { kindLabel, edgeLabel, environmentLabel, statusLabel } = load("copy");
const { createDndInfrastructure, getSystems } = load("topology");

function hierarchy() {
  const server = { ...createNode("SERVER", { x: 100, y: 100 }), id: "server" };
  const machine = { ...createNode("MACHINE", { x: 24, y: 120 }), id: "machine", parentId: server.id };
  const backend = { ...createNode("BACKEND", { x: 24, y: 120 }), id: "backend", parentId: machine.id };
  const database = { ...createNode("DATABASE", { x: 850, y: 700 }), id: "database" };
  const website = { ...createNode("WEBSITE", { x: 20, y: 500 }), id: "website" };
  const document = { name: "Test", nodes: [backend, machine, server, database, website], edges: [createEdge(website.id, backend.id, "API"), createEdge(backend.id, database.id, "DATABASE"), createEdge(website.id, database.id, "ACCESS")] };
  return { document, server, machine, backend, database, website };
}

test("containment distinguishes physical hosts, virtual machines and ordinary assets", () => {
  assert.equal(canContain("SERVER", "MACHINE"), true);
  assert.equal(canContain("MACHINE", "BACKEND"), true);
  assert.equal(canContain("SERVER", "DATABASE"), true);
  assert.equal(canContain("MACHINE", "SERVER"), false);
  assert.equal(canContain("DATABASE", "BACKEND"), false);
  assert.equal(canContain("SERVER", "GROUP"), false);
  assert.equal(canContain("CLOUD", "SERVER"), true);
  assert.equal(canContain("CLOUD", "SERVICE"), true);
  assert.equal(canContain("SERVICE", "PANEL"), true);
  assert.equal(canContain("SERVICE", "DATABASE"), true);
  assert.equal(canContain("SERVICE", "SERVICE"), false);
});

test("deleting a server removes its descendants and every touching edge, keeping unrelated assets", () => {
  const { document } = hierarchy();
  const next = removeNode(document, "server");
  assert.deepEqual(next.nodes.map((node) => node.id), ["database", "website"]);
  assert.equal(next.edges.length, 1);
  assert.equal(next.edges[0].target, "database");
  assert.equal(document.nodes.length, 5);
});

test("descendant and position traversal terminates on cyclic imported input", () => {
  const a = { ...createNode("SERVER", { x: 10, y: 20 }), id: "a", parentId: "b" };
  const b = { ...createNode("MACHINE", { x: 30, y: 40 }), id: "b", parentId: "a" };
  assert.deepEqual([...descendants([a, b], "a")].sort(), ["a", "b"]);
  assert.deepEqual(absolutePosition([a, b], "a"), { x: 40, y: 60 });
  const normalized = normalizeDocument({ name: "Cycle", nodes: [b, a], edges: [] });
  assert.deepEqual(normalized.nodes.map((node) => [node.id, node.parentId]), [["a", null], ["b", "a"]]);
});

test("attaching and detaching preserves absolute position and expands the full parent chain", () => {
  const { document } = hierarchy();
  const before = new Map(document.nodes.map((node) => [node.id, absolutePosition(document.nodes, node.id)]));
  const attached = reparentNode(document, "database", "machine");
  assert.equal(attached.nodes.find((node) => node.id === "database").parentId, "machine");
  assert.deepEqual(absolutePosition(attached.nodes, "database"), before.get("database"));
  assert.deepEqual(absolutePosition(attached.nodes, "backend"), before.get("backend"));
  for (const node of attached.nodes.filter((item) => item.parentId)) {
    const parent = attached.nodes.find((item) => item.id === node.parentId);
    assert(node.position.x + node.width + CONTAINER_PADDING <= parent.width);
    assert(node.position.y + node.height + CONTAINER_PADDING <= parent.height);
  }
  const detached = reparentNode(attached, "backend", null);
  assert.equal(detached.nodes.find((node) => node.id === "backend").parentId, null);
  assert.deepEqual(absolutePosition(detached.nodes, "backend"), before.get("backend"));
});

test("attaching an asset above/left of a host grows its origin without moving existing contents", () => {
  const { document } = hierarchy();
  document.nodes.find((node) => node.id === "database").position = { x: -50, y: -40 };
  const backendBefore = absolutePosition(document.nodes, "backend");
  const next = reparentNode(document, "database", "machine");
  assert.deepEqual(absolutePosition(next.nodes, "database"), { x: -50, y: -40 });
  assert.deepEqual(absolutePosition(next.nodes, "backend"), backendBefore);
  for (const node of next.nodes.filter((item) => item.parentId)) {
    assert(node.position.x >= CONTAINER_PADDING);
    assert(node.position.y >= CONTAINER_HEADER);
  }
});

test("invalid parents and containment cycles are rejected without mutating the document", () => {
  const { document } = hierarchy();
  const before = structuredClone(document);
  assert.equal(reparentNode(document, "server", "machine"), document);
  assert.equal(reparentNode(document, "machine", "machine"), document);
  assert.equal(reparentNode(document, "database", "missing"), document);
  assert.equal(reparentNode(document, "website", "backend"), document);
  assert.deepEqual(document, before);
});

test("normalization is immutable, puts parents first and is idempotent", () => {
  const { document } = hierarchy();
  const before = structuredClone(document);
  const next = normalizeDocument(document);
  for (const node of next.nodes.filter((item) => item.parentId)) {
    assert(next.nodes.findIndex((item) => item.id === node.parentId) < next.nodes.indexOf(node));
  }
  assert.deepEqual(document, before);
  assert.deepEqual(normalizeDocument(next), next);
});

test("access routes follow gateways, stop at assets, and do not infer rights from API/database links", () => {
  const group = { ...createNode("GROUP"), id: "group" };
  const gateway = { ...createNode("GATEWAY"), id: "gateway" };
  const secondGateway = { ...createNode("GATEWAY"), id: "gateway2" };
  const website = { ...createNode("WEBSITE"), id: "website" };
  const backend = { ...createNode("BACKEND"), id: "backend" };
  const database = { ...createNode("DATABASE"), id: "database" };
  const document = { name: "Routes", nodes: [group, gateway, secondGateway, website, backend, database], edges: [
    createEdge(group.id, gateway.id), createEdge(gateway.id, secondGateway.id), createEdge(secondGateway.id, gateway.id),
    createEdge(secondGateway.id, website.id), createEdge(website.id, backend.id, "API"), createEdge(backend.id, database.id, "DATABASE"),
    createEdge(website.id, database.id), createEdge(gateway.id, "missing"),
  ] };
  const routes = accessRoutes(document);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].group.id, group.id);
  assert.equal(routes[0].target.id, website.id);
  assert.deepEqual(routes[0].path.map((node) => node.id), ["group", "gateway", "gateway2", "website"]);
  assert.equal(routes[0].edges.length, 3);
});

test("both fictional templates have valid nested hosts, complete connections, and bounded layout", () => {
  for (const locale of ["tr", "en"]) {
    const document = createTemplate(locale);
    const byId = new Map(document.nodes.map((node) => [node.id, node]));
    assert.equal(byId.size, document.nodes.length);
    assert(document.name.includes(locale === "tr" ? "örnek" : "sample"));
    for (const node of document.nodes) {
      assert(node.name.includes(locale === "tr" ? "örnek" : "sample"));
      if (node.address) assert(node.address.endsWith("example.com"));
      if (node.parentId) {
        const parent = byId.get(node.parentId);
        assert(parent && canContain(parent.kind, node.kind));
        assert(node.position.x >= CONTAINER_PADDING);
        assert(node.position.y >= CONTAINER_HEADER);
        assert(node.position.x + node.width + CONTAINER_PADDING <= parent.width);
        assert(node.position.y + node.height + CONTAINER_PADDING <= parent.height);
      }
      const position = absolutePosition(document.nodes, node.id);
      assert(position.x + node.width <= 1600);
      assert(position.y + node.height <= 1050);
    }
    assert(document.nodes.some((node) => node.kind === "BACKEND" && byId.get(node.parentId)?.kind === "MACHINE"));
    assert(document.nodes.some((node) => node.kind === "MACHINE" && byId.get(node.parentId)?.kind === "SERVER"));
    assert(document.edges.every((edge) => byId.has(edge.source) && byId.has(edge.target) && edge.source !== edge.target));
    const routes = accessRoutes(document);
    const sales = document.nodes.find((node) => node.kind === "GROUP" && node.technology === (locale === "tr" ? "CRM kullanıcıları" : "CRM users"));
    assert(routes.some((route) => route.path.some((node) => node.kind === "GATEWAY")));
    assert(routes.filter((route) => route.group.id === sales.id).every((route) => route.target.kind === "WEBSITE"));
  }
});

test("every editable enum has a label in Turkish and English", () => {
  for (const locale of ["tr", "en"]) {
    for (const kind of nodeKinds) assert(kindLabel(kind, locale));
    for (const kind of edgeKinds) assert(edgeLabel(kind, locale));
    for (const environment of ["PRODUCTION", "STAGING", "DEVELOPMENT"]) assert(environmentLabel(environment, locale));
    for (const status of ["ACTIVE", "PLANNED", "MAINTENANCE"]) assert(statusLabel(status, locale));
  }
});

test("DND topology has only the two confirmed EC2 servers and correctly separates vendor hosting", () => {
  const document = createDndInfrastructure("tr");
  const servers = document.nodes.filter((node) => node.kind === "SERVER");
  assert.deepEqual(servers.map((node) => node.id), ["server-aws-windows", "server-aws-ubuntu"]);
  assert(servers.every((node) => node.parentId === "cloud-dnd-aws"));
  assert(!document.nodes.some((node) => node.kind === "MACHINE"));
  assert.equal(document.nodes.find((node) => node.id === "system-simpra-pos").parentId, null);
  assert.equal(document.nodes.find((node) => node.id === "system-simpra-inventory").parentId, null);
  assert.equal(document.nodes.find((node) => node.id === "service-simpra-portal").parentId, "cloud-simpra-aws");
  assert.equal(document.nodes.find((node) => node.id === "service-hotelrunner").parentId, "cloud-hotelrunner-aws");
  assert(document.nodes.filter((node) => node.kind === "DATABASE").every((node) => node.technology === ""));
});

test("DND frontend routes and unspecified accounting architecture do not invent backend/database nodes", () => {
  const document = createDndInfrastructure("tr");
  const cyprus = document.nodes.filter((node) => node.systemKey === "dnd-cyprus");
  assert.deepEqual(cyprus.map((node) => node.kind).sort(), ["PANEL", "SERVICE", "WEBSITE"]);
  assert(cyprus.every((node) => !["BACKEND", "DATABASE"].includes(node.kind)));
  assert(!document.nodes.some((node) => node.systemKey === "muhasebe-crm" && ["BACKEND", "DATABASE"].includes(node.kind)));
  const crmFrontends = document.nodes.filter((node) => node.systemKey === "dnd-crm" && ["WEBSITE", "PANEL"].includes(node.kind));
  assert.deepEqual(crmFrontends.map((node) => node.kind), ["PANEL"]);
});

test("each confirmed Ubuntu system has its database and corresponding Vercel frontend in an aligned row", () => {
  const document = createDndInfrastructure("tr");
  for (const key of ["dnd-reserve", "dnd-crm", "golden-eye-pss", "dnd-homes", "ozan-dokmecioglu"]) {
    const hosted = document.nodes.find((node) => node.systemKey === key && node.parentId === "server-aws-ubuntu");
    const frontend = document.nodes.find((node) => node.systemKey === key && node.parentId === "cloud-vercel");
    assert(hosted && frontend, key);
    assert.deepEqual(document.nodes.filter((node) => node.parentId === hosted.id).map((node) => node.kind).sort(), ["BACKEND", "DATABASE"]);
    assert.equal(absolutePosition(document.nodes, hosted.id).y, absolutePosition(document.nodes, frontend.id).y, key);
    for (const child of document.nodes.filter((node) => node.parentId === frontend.id)) {
      assert(["WEBSITE", "PANEL"].includes(child.kind));
      const connection = document.edges.find((edge) => edge.source === child.id && edge.kind === "API");
      assert(connection, child.name);
      assert.equal(document.nodes.find((node) => node.id === connection.target).parentId, hosted.id);
    }
  }
});

test("business data flows preserve direction, two-way POS/Inventory and Portal-mediated inventory data", () => {
  const document = createDndInfrastructure("tr");
  const data = document.edges.filter((edge) => edge.kind === "DATA");
  assert.equal(data.length, 12);
  const inventoryExchange = data.find((edge) => edge.source === "system-simpra-pos" && edge.target === "system-simpra-inventory");
  assert.equal(inventoryExchange.bidirectional, true);
  for (const [source, target] of [
    ["system-simpra-pos", "service-simpra-portal"],
    ["system-simpra-inventory", "service-simpra-portal"],
    ["service-simpra-portal", "service-logo-windows"],
    ["service-logo-windows", "service-dnd-crm-ubuntu"],
    ["service-simpra-portal", "service-dnd-crm-ubuntu"],
    ["service-hotelrunner", "service-dnd-crm-ubuntu"],
    ["service-hotelrunner", "service-logo-windows"],
    ["service-dnd-reserve-ubuntu", "service-hotelrunner"],
    ["service-talep-restoran-windows", "service-logo-windows"],
    ["service-talep-insaat-windows", "service-logo-windows"],
    ["service-logo-windows", "service-muhasebe-crm-windows"],
  ]) assert(data.some((edge) => edge.source === source && edge.target === target), `${source} → ${target}`);
  assert(!data.some((edge) => edge.source === "system-simpra-inventory" && edge.target === "service-dnd-crm-ubuntu"));
  assert(data.every((edge) => edge.protocol === ""));
});

test("confirmed RDP and Tailscale access does not grant teams additional API or data-flow permissions", () => {
  const document = createDndInfrastructure("tr");
  const routes = accessRoutes(document);
  assert.equal(routes.length, 4);
  assert.deepEqual(routes.filter((route) => route.group.id === "group-finance-accounting-office").map((route) => route.target.systemKey).sort(), ["logo", "muhasebe-crm"]);
  assert.deepEqual(routes.filter((route) => route.group.id === "group-external-office-users").map((route) => route.target.systemKey).sort(), ["talep-insaat", "talep-restoran"]);
  assert(routes.every((route) => route.path.length === 3 && route.path[1].kind === "GATEWAY"));
});

test("business notes distinguish rental, sales and reports while transfer labels describe the data", () => {
  for (const locale of ["tr", "en"]) {
    const document = createDndInfrastructure(locale);
    const service = (key) => document.nodes.find((node) => node.systemKey === key && node.kind === "SERVICE");
    assert(service("hotelrunner").notes.includes("La Joya"));
    assert.match(service("hotelrunner").notes, locale === "tr" ? /kiralama.*kanal.*takvim/ : /channel.*calendar.*rental/);
    assert.match(service("dnd-reserve").notes, locale === "tr" ? /Site yönetimi ve kiralama/ : /management and rental/);
    assert.match(service("golden-eye-pss").notes, locale === "tr" ? /satış.*PSS/ : /sales.*PSS/);
    assert.match(service("dnd-crm").notes, locale === "tr" ? /Şirket raporları/ : /Company reports/);
    const label = (id) => document.edges.find((edge) => edge.id === id).label;
    assert.match(label("data-logo-dnd-crm"), locale === "tr" ? /Finansal raporlama/ : /Financial reporting/);
    assert.match(label("data-simpra-inventory-dnd-crm"), /Inventory.*Portal/);
    assert.match(label("data-hotelrunner-dnd-crm"), locale === "tr" ? /PMS.*kanal.*takvim/ : /PMS.*channel.*calendar/);
    const booking = document.edges.find((edge) => edge.id === "data-dnd-reserve-hotelrunner");
    assert.match(booking.label, locale === "tr" ? /Rezervasyon oluştuğunda/ : /Booking created/);
    assert.match(booking.notes, /DND Reserve booking engine.*HotelRunner PMS \/ Channel Manager/);
    assert(!booking.bidirectional);
    assert(document.edges.filter((edge) => edge.kind === "DATA").every((edge) => !edge.label.includes("→")));
  }
});

test("real topology uses verified URLs and leaves the unassigned private address in notes only", () => {
  const document = createDndInfrastructure("tr");
  const urls = document.nodes.filter((node) => node.url).map((node) => node.url).sort();
  assert.deepEqual(urls, [
    "https://dnd-homes.com/", "https://dndcrmweb.vercel.app", "https://www.dndcyprus.com/",
    "https://www.dndreserve.com/en", "https://www.goldeneyeresortbafra.com/", "https://www.ozandokmecioglu.com/",
  ].sort());
  assert(!document.nodes.some((node) => (node.address + (node.url || "")).includes("100.81.139.12")));
  assert(document.nodes.some((node) => node.notes.includes("100.81.139.12:8085")));
  assert(!JSON.stringify(document).includes("example.com"));
});

test("real topology is deterministic, translated, bounded and has valid references for every node and edge", () => {
  const tr = createDndInfrastructure("tr");
  assert.deepEqual(createDndInfrastructure("tr"), tr);
  const en = createDndInfrastructure("en");
  assert.deepEqual(en.nodes.map((node) => node.id), tr.nodes.map((node) => node.id));
  assert.deepEqual(en.edges.map((edge) => edge.id), tr.edges.map((edge) => edge.id));
  assert.equal(getSystems(tr).length, 12);
  assert.equal(new Set(getSystems(tr).map((system) => system.key)).size, 12);
  for (const document of [tr, en]) {
    const byId = new Map(document.nodes.map((node) => [node.id, node]));
    assert.equal(byId.size, document.nodes.length);
    assert.equal(new Set(document.edges.map((edge) => edge.id)).size, document.edges.length);
    for (const node of document.nodes) {
      if (node.parentId) {
        const parent = byId.get(node.parentId);
        assert(parent && canContain(parent.kind, node.kind), node.id);
        assert(node.position.x >= CONTAINER_PADDING && node.position.y >= CONTAINER_HEADER, node.id);
        assert(node.position.x + node.width + CONTAINER_PADDING <= parent.width, node.id);
        assert(node.position.y + node.height + CONTAINER_PADDING <= parent.height, node.id);
      }
      const position = absolutePosition(document.nodes, node.id);
      assert(position.x + node.width <= 6500 && position.y + node.height <= 4500, node.id);
    }
    assert(document.edges.every((edge) => byId.has(edge.source) && byId.has(edge.target) && edge.source !== edge.target));
    assert.deepEqual(normalizeDocument(document), document);
  }
});
