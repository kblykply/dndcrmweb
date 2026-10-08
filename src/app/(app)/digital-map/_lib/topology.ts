import { createEdge, createNode, normalizeDocument } from "./model";
import type { EdgeKind, MapDocument, MapEdge, MapLocale, MapNode, NodeKind } from "./types";

const systemNames: Record<string, string> = {
  logo: "Logo",
  "talep-restoran": "Talep Restoran",
  "talep-insaat": "Talep İnşaat",
  "muhasebe-crm": "Muhasebe CRM",
  "dnd-reserve": "DND Reserve",
  "dnd-crm": "DND CRM",
  "golden-eye-pss": "Golden Eye / PSS",
  "dnd-homes": "DND Homes",
  "ozan-dokmecioglu": "Ozan Dokmecioglu",
  "dnd-cyprus": "DND Cyprus",
  hotelrunner: "HotelRunner",
  simpra: "Simpra",
};

export { getSystems } from "./systems";

/** User-described infrastructure. Stable IDs allow later edits and attached images to survive upgrades. */
export function createDndInfrastructure(locale: MapLocale): MapDocument {
  const tr = locale === "tr";
  const t = (turkish: string, english: string) => tr ? turkish : english;
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  function node(id: string, kind: NodeKind, name: string, x: number, y: number, extra: Partial<MapNode> = {}) {
    const item: MapNode = { ...createNode(kind, { x, y }, locale), id, name, status: "ACTIVE", ...extra };
    nodes.push(item);
    return item;
  }
  function edge(id: string, source: MapNode, target: MapNode, kind: EdgeKind, label: string, extra: Partial<MapEdge> = {}) {
    const item = { ...createEdge(source.id, target.id, kind), id, label, ...extra };
    edges.push(item);
    return item;
  }
  const unspecifiedTechnology = t("Barındırıldığı yer belirtildi; teknoloji, bağlantı adresi ve sürüm henüz belirtilmedi.", "Hosting was specified; technology, endpoint and version were not provided.");

  const aws = node("cloud-dnd-aws", "CLOUD", "DND · AWS", 850, 80, {
    width: 3100, height: 3200, technology: "Amazon Web Services / EC2",
    notes: t("DND altyapısında iki EC2 sunucusu: Windows ve Ubuntu. Hesap, bölge, instance kimlikleri ve IP adresleri henüz girilmedi.", "DND has two EC2 servers: Windows and Ubuntu. Account, region, instance IDs and IP addresses have not been entered."),
  });
  const windows = node("server-aws-windows", "SERVER", "AWS EC2 · Windows", 40, 145, {
    parentId: aws.id, width: 1400, height: 2850, technology: "Windows / EC2",
    notes: t("Logo, Talep Restoran, Talep İnşaat ve Muhasebe CRM bu sunucuda. Windows sürümü ve sunucu adresi belirtilmedi.", "Hosts Logo, Talep Restaurant, Talep Construction and Accounting CRM. Windows version and server address were not provided."),
  });
  const ubuntu = node("server-aws-ubuntu", "SERVER", "AWS EC2 · Ubuntu", 1840, 145, {
    parentId: aws.id, width: 1100, height: 2850, technology: "Ubuntu / EC2",
    notes: t("DND Reserve, DND CRM, Golden Eye / PSS, DND Homes ve Ozan Dokmecioglu backend ve veritabanları burada. Veritabanı motorları ve Ubuntu sürümü belirtilmedi.", "Hosts the backends and databases of DND Reserve, DND CRM, Golden Eye / PSS, DND Homes and Ozan Dokmecioglu. Database engines and Ubuntu version were not provided."),
  });
  const vercel = node("cloud-vercel", "CLOUD", "Vercel", 4350, 80, {
    width: 1220, height: 3200, technology: "Vercel",
    notes: t("Web siteleri ve web panelleri. DND Cyprus ayrı backend/veritabanı kullanmıyor; frontend route yapısı kullanılıyor.", "Websites and web panels. DND Cyprus uses frontend routes without a separate backend or database."),
  });

  function service(id: string, key: string, parent: MapNode, x: number, y: number, width: number, height: number, name = systemNames[key]) {
    return node(id, "SERVICE", name, x, y, { parentId: parent.id, systemKey: key, width, height });
  }
  function component(parent: MapNode, suffix: string, kind: NodeKind, name: string, x: number, extra: Partial<MapNode> = {}) {
    return node(`${parent.id}-${suffix}`, kind, name, x, 145, {
      parentId: parent.id, systemKey: parent.systemKey, width: kind === "DATABASE" ? 270 : 300, height: 170,
      notes: unspecifiedTechnology, ...extra,
    });
  }

  const logo = service("service-logo-windows", "logo", windows, 45, 145, 1300, 460);
  const logoDesktop = component(logo, "desktop", "SYSTEM", t("Logo · masaüstü modülü", "Logo · desktop module"), 40, {
    technology: t("Masaüstü uygulaması", "Desktop application"),
    notes: t("Ofiste finans/muhasebe kullanıcıları RDP üzerinden erişir.", "Finance/accounting users in the office access this through RDP."),
  });
  const logoBackend = component(logo, "backend", "BACKEND", "Logo · backend", 455);
  const logoDb = component(logo, "database", "DATABASE", t("Logo · veritabanı", "Logo · database"), 890);
  edge("db-logo", logoBackend, logoDb, "DATABASE", t("Veritabanı", "Database"));

  function windowsTalep(key: string, y: number) {
    const group = service(`service-${key}-windows`, key, windows, 45, y, 1300, 460);
    const panel = component(group, "frontend", "PANEL", `${systemNames[key]} · frontend`, 40);
    const backend = component(group, "backend", "BACKEND", `${systemNames[key]} · backend`, 455);
    const database = component(group, "database", "DATABASE", `${systemNames[key]} · DB`, 890);
    edge(`api-${key}`, panel, backend, "API", t("Frontend → backend", "Frontend → backend"));
    edge(`db-${key}`, backend, database, "DATABASE", t("Veritabanı", "Database"));
    edge(`data-${key}-logo`, group, logo, "DATA", t("Logo'ya veri yazma", "Write data to Logo"), {
      notes: t(`${systemNames[key]} sistemi Logo Muhasebe Programı'na veri yazar.`, `${systemNames[key]} writes data to the Logo accounting application.`),
    });
    return panel;
  }
  const restaurant = windowsTalep("talep-restoran", 825);
  const construction = windowsTalep("talep-insaat", 1505);
  const accounting = service("service-muhasebe-crm-windows", "muhasebe-crm", windows, 45, 2185, 1300, 420);
  const accountingPanel = component(accounting, "frontend", "PANEL", "Muhasebe CRM", 40, {
    width: 420,
    notes: t("Windows sunucusundaki web uygulaması; ofisten RDP ile erişilir. Backend/veritabanı mimarisi ayrıca belirtilmedi; bu nedenle ayrı backend veya DB öğesi eklenmedi.", "Web application on the Windows server, accessed from the office via RDP. Backend/database architecture was not provided, so separate backend or database items have not been added."),
  });
  edge("data-logo-muhasebe-crm", logo, accounting, "DATA", t("Logo'dan veri çekme", "Read data from Logo"), {
    notes: t("Muhasebe CRM, Logo Muhasebe Programı'ndan veri çeker. Ok, verinin Logo'dan Muhasebe CRM'e akışını gösterir.", "Accounting CRM reads data from the Logo accounting application. The arrow shows data flowing from Logo to Accounting CRM."),
  });

  const applications = [
    { key: "dnd-reserve", website: "DND Reserve Booking", panel: "DND Reserve Booking · panel", url: "https://www.dndreserve.com/en" },
    { key: "dnd-crm", website: "", panel: "DND CRM · frontend", panelUrl: "https://dndcrmweb.vercel.app" },
    { key: "golden-eye-pss", website: "Golden Eye Resort Bafra", panel: "Golden Eye · PSS panel", url: "https://www.goldeneyeresortbafra.com/" },
    { key: "dnd-homes", website: "DND Homes", panel: "DND Homes · panel", url: "https://dnd-homes.com/" },
    { key: "ozan-dokmecioglu", website: "Ozan Dokmecioglu", panel: "Ozan Dokmecioglu · panel", url: "https://www.ozandokmecioglu.com/" },
  ];
  const businessNotes: Record<string, string> = {
    "dnd-reserve": t("Site yönetimi ve kiralama operasyonları. Booking web sitesi ve paneli Vercel üzerinde; backend ve veritabanı AWS Ubuntu sunucusunda.", "Property/site management and rental operations. The Booking website and panel run on Vercel; the backend and database run on the AWS Ubuntu server."),
    "dnd-crm": t("Şirket raporları. Logo'dan finansal raporlama verileri, Simpra Portal üzerinden Inventory verileri ve HotelRunner'dan PMS/kanal/takvim verileri alınır.", "Company reports. Receives financial reporting data from Logo, Inventory data through Simpra Portal, and PMS/channel/calendar data from HotelRunner."),
    "golden-eye-pss": t("Golden Eye satış süreçleri ve PSS paneli. DND Reserve'in site yönetimi/kiralama işlevinden ayrı bir sistemdir.", "Golden Eye sales processes and the PSS panel. This system is separate from DND Reserve's property management and rental functions."),
  };
  const hostedServices = new Map<string, MapNode>();
  for (const [index, app] of applications.entries()) {
    const y = 145 + index * 480;
    const hosted = service(`service-${app.key}-ubuntu`, app.key, ubuntu, 45, y, 1010, 410);
    hosted.notes = businessNotes[app.key] || "";
    const backend = component(hosted, "backend", "BACKEND", `${systemNames[app.key]} · backend`, 40);
    const database = component(hosted, "database", "DATABASE", `${systemNames[app.key]} · DB`, 635);
    hostedServices.set(app.key, hosted);
    edge(`db-${app.key}`, backend, database, "DATABASE", t("Veritabanı", "Database"));
    const frontends = service(`service-${app.key}-vercel`, app.key, vercel, 45, y + 145, 1130, 410);
    frontends.notes = businessNotes[app.key] || "";
    if (app.website) {
      const website = component(frontends, "website", "WEBSITE", app.website, 40, {
        url: app.url, address: app.url ? new URL(app.url).hostname : "", technology: "Vercel",
        notes: t("Resmi web adresi doğrulandı. Frontend Vercel üzerinde, backend ve veritabanı AWS Ubuntu sunucusunda.", "Official website address verified. Frontend runs on Vercel; backend and database run on the AWS Ubuntu server."),
      });
      edge(`api-${app.key}-website`, website, backend, "API", "API");
    }
    const panel = component(frontends, "panel", "PANEL", app.panel, app.website ? 695 : 40, {
      technology: "Vercel", url: app.panelUrl || "", address: app.panelUrl ? new URL(app.panelUrl).hostname : "",
      notes: app.panelUrl
        ? t("Frontend adresi mevcut proje API CORS yapılandırmasından alındı.", "Frontend address comes from the existing project API CORS configuration.")
        : t("Panel Vercel üzerinde. Panel URL'si henüz belirtilmedi; düzenlenebilir bırakıldı.", "Panel runs on Vercel. Its URL was not provided and remains editable."),
    });
    edge(`api-${app.key}-panel`, panel, backend, "API", "API");
  }
  const cyprus = service("service-dnd-cyprus-vercel", "dnd-cyprus", vercel, 45, 2690, 1130, 410);
  const cyprusNotes = t("DND Cyprus frontend route yapısını kullanır. Ayrı backend ve veritabanı yoktur.", "DND Cyprus uses frontend routes. It has no separate backend or database.");
  cyprus.notes = cyprusNotes;
  component(cyprus, "website", "WEBSITE", "DND Cyprus", 40, { url: "https://www.dndcyprus.com/", address: "www.dndcyprus.com", technology: "Vercel / frontend routes", notes: cyprusNotes });
  component(cyprus, "panel", "PANEL", "DND Cyprus · panel", 695, { technology: "Vercel / frontend routes", notes: cyprusNotes });

  const hotelRunnerCloud = node("cloud-hotelrunner-aws", "CLOUD", "HotelRunner · AWS", 850, 3490, {
    width: 1180, height: 750, technology: "AWS · HotelRunner",
    systemKey: "hotelrunner", notes: t("Dış sağlayıcının AWS ortamı. DND'nin iki EC2 sunucusundan ayrı; sağlayıcının hesap ve sunucu ayrıntıları bilinmiyor.", "External provider's AWS environment, separate from DND's two EC2 servers. Provider account and server details are unknown."),
  });
  const hotelRunner = service("service-hotelrunner", "hotelrunner", hotelRunnerCloud, 45, 145, 1090, 460);
  hotelRunner.notes = t("La Joya kiralama operasyonları için PMS, kanal yönetimi ve takvim hizmeti. Bu veriler şirket raporları için DND CRM'e aktarılır.", "PMS, channel management and calendar service for La Joya rental operations. This data is sent to DND CRM for company reports.");
  component(hotelRunner, "pms", "SYSTEM", "HotelRunner · PMS / Channel Calendar", 40, {
    width: 950, notes: t("La Joya kiralama operasyonları için PMS, kanal yönetimi ve takvim hizmeti; DND CRM'e veri aktarır. Aktarım protokolü ve sıklığı belirtilmedi.", "PMS, channel management and calendar service for La Joya rental operations; sends data to DND CRM. Transfer protocol and frequency were not provided."),
  });
  const simpraCloud = node("cloud-simpra-aws", "CLOUD", "Simpra Portal · AWS", 2490, 3490, {
    width: 1380, height: 750, technology: "AWS · Simpra", systemKey: "simpra",
    notes: t("Dış sağlayıcı AWS ortamında yalnızca Simpra Portal'ın barındırılması doğrulandı. POS ve Inventory'nin barındırıldığı yer belirtilmedi; bu kutunun dışında gösterilir.", "Only Simpra Portal's hosting in the external provider's AWS environment is confirmed. POS and Inventory hosting was not provided, so those systems appear outside this container."),
  });
  const simpraPortal = service("service-simpra-portal", "simpra", simpraCloud, 45, 145, 1290, 460, "Simpra Portal");
  component(simpraPortal, "panel", "PANEL", "Simpra Portal", 40, {
    width: 950, notes: t("POS ve Inventory verilerini alır. Logo'ya ve Inventory verileriyle DND CRM'e veri aktarır. Panel adresi belirtilmedi.", "Receives POS and Inventory data. Sends data to Logo and sends Inventory data to DND CRM. Portal URL was not provided."),
  });
  const pos = node("system-simpra-pos", "SYSTEM", "Simpra POS", 110, 3520, {
    systemKey: "simpra", width: 380, height: 200,
    notes: t("Inventory ile çift yönlü veri alışverişi yapar; Portal'a veri gönderir. Barındırıldığı yer ve bağlantı protokolü belirtilmedi.", "Exchanges data bidirectionally with Inventory and sends data to Portal. Hosting and connection protocol were not provided."),
  });
  const inventory = node("system-simpra-inventory", "SYSTEM", "Simpra Inventory", 110, 3930, {
    systemKey: "simpra", width: 380, height: 200,
    notes: t("POS ile çift yönlü veri alışverişi yapar; Portal'a veri gönderir. Barındırıldığı yer ve bağlantı protokolü belirtilmedi.", "Exchanges data bidirectionally with POS and sends data to Portal. Hosting and connection protocol were not provided."),
  });
  edge("data-simpra-pos-inventory", pos, inventory, "DATA", t("POS / Inventory veri alışverişi", "POS / Inventory data exchange"), { bidirectional: true });
  edge("data-simpra-pos-portal", pos, simpraPortal, "DATA", t("POS verileri", "POS data"));
  edge("data-simpra-inventory-portal", inventory, simpraPortal, "DATA", t("Inventory verileri", "Inventory data"));
  edge("data-simpra-portal-logo", simpraPortal, logo, "DATA", t("Simpra Portal verileri", "Simpra Portal data"));
  const crm = hostedServices.get("dnd-crm")!;
  edge("data-logo-dnd-crm", logo, crm, "DATA", t("Finansal raporlama verileri", "Financial reporting data"));
  edge("data-simpra-inventory-dnd-crm", simpraPortal, crm, "DATA", t("Inventory verileri · Portal üzerinden", "Inventory data · via Portal"), {
    notes: t("Inventory verileri Simpra Portal üzerinden DND CRM'e aktarılır.", "Inventory data reaches DND CRM through Simpra Portal."),
  });
  edge("data-hotelrunner-dnd-crm", hotelRunner, crm, "DATA", t("PMS / kanal / takvim verileri", "PMS / channel / calendar data"));
  edge("data-hotelrunner-logo", hotelRunner, logo, "DATA", t("PMS verileri · Logo aktarımı", "PMS data · Logo transfer"), {
    notes: t("HotelRunner PMS verilerinin Logo Muhasebe Programı'na aktarımı.", "Transfer of HotelRunner PMS data to the Logo accounting application."),
  });
  edge("data-dnd-reserve-hotelrunner", hostedServices.get("dnd-reserve")!, hotelRunner, "DATA", t("Rezervasyon oluştuğunda · booking verisi", "Booking created · reservation data"), {
    notes: t("DND Reserve booking engine üzerinden rezervasyon yapıldığında rezervasyon bilgileri HotelRunner PMS / Channel Manager'a gönderilir.", "When a reservation is made through the DND Reserve booking engine, reservation data is sent to HotelRunner PMS / Channel Manager."),
  });

  const finance = node("group-finance-accounting-office", "GROUP", t("Finans / Muhasebe · ofis", "Finance / Accounting · office"), 50, 280, { width: 340, height: 175 });
  const rdp = node("gateway-office-rdp", "GATEWAY", t("Ofis · RDP erişimi", "Office · RDP access"), 430, 510, {
    width: 310, height: 175, technology: "RDP",
    notes: t("Finans/muhasebe ofis erişimi: Logo masaüstü modülü ve Muhasebe CRM. Bağlantı adresi ve kullanıcı listesi henüz belirtilmedi.", "Finance/accounting office access to Logo desktop and Accounting CRM. Connection address and user list were not provided."),
  });
  const external = node("group-external-office-users", "GROUP", t("Ofis dışı kullanıcılar", "Users outside the office"), 50, 1780, {
    width: 340, height: 175,
    notes: t("Talep sistemlerine ofis dışından erişim var. Erişen ekip ve kullanıcı grupları henüz belirtilmedi.", "Talep systems are accessed from outside the office. The teams and user groups have not been specified."),
  });
  const tailscale = node("gateway-tailscale", "GATEWAY", "Tailscale", 430, 2010, {
    width: 310, height: 175, technology: "Tailscale",
    notes: t("Talep Restoran ve Talep İnşaat'a ofis dışından erişim. Paylaşılan http://100.81.139.12:8085/ adresinin hangi uygulamaya ait olduğu belirtilmedi; hiçbir uygulamaya atanmadı.", "Remote access to Talep Restaurant and Talep Construction. The shared http://100.81.139.12:8085/ address has not been assigned because its application was not specified."),
  });
  edge("access-finance-rdp", finance, rdp, "ACCESS", "RDP", { protocol: "RDP", access: t("Finans / Muhasebe", "Finance / Accounting") });
  edge("access-rdp-logo", rdp, logoDesktop, "ACCESS", "RDP", { protocol: "RDP" });
  edge("access-rdp-muhasebe-crm", rdp, accountingPanel, "ACCESS", "RDP", { protocol: "RDP" });
  edge("access-external-tailscale", external, tailscale, "ACCESS", "Tailscale", { protocol: "Tailscale", access: t("Ekipler henüz belirtilmedi", "Teams not yet specified") });
  edge("access-tailscale-talep-restoran", tailscale, restaurant, "ACCESS", "Tailscale", { protocol: "Tailscale" });
  edge("access-tailscale-talep-insaat", tailscale, construction, "ACCESS", "Tailscale", { protocol: "Tailscale" });

  return normalizeDocument({ name: t("DND Dijital Altyapı Haritası", "DND Digital Infrastructure Map"), nodes, edges });
}
