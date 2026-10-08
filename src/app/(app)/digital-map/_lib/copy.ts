import type { AssetStatus, EdgeKind, Environment, MapLocale, NodeKind } from "./types";

const kinds: Record<MapLocale, Record<NodeKind, string>> = {
  tr: { SERVER: "Sunucu", MACHINE: "Sanal makine", CLOUD: "Bulut / sağlayıcı", SERVICE: "Uygulama grubu", BACKEND: "Backend", DATABASE: "Veritabanı", WEBSITE: "Web sitesi", PANEL: "Web paneli", SYSTEM: "Sistem / uygulama", GROUP: "Erişim grubu", GATEWAY: "Erişim noktası" },
  en: { SERVER: "Server", MACHINE: "Virtual machine", CLOUD: "Cloud / provider", SERVICE: "Application group", BACKEND: "Backend", DATABASE: "Database", WEBSITE: "Website", PANEL: "Web panel", SYSTEM: "System / application", GROUP: "Access group", GATEWAY: "Access gateway" },
};
const edges: Record<MapLocale, Record<EdgeKind, string>> = {
  tr: { ACCESS: "Erişim", API: "API bağlantısı", DATABASE: "Veri bağlantısı", NETWORK: "Ağ bağlantısı", DATA: "Veri akışı" },
  en: { ACCESS: "Access", API: "API connection", DATABASE: "Data connection", NETWORK: "Network connection", DATA: "Data flow" },
};
const environments: Record<MapLocale, Record<Environment, string>> = {
  tr: { PRODUCTION: "Canlı", STAGING: "Test", DEVELOPMENT: "Geliştirme" },
  en: { PRODUCTION: "Production", STAGING: "Staging", DEVELOPMENT: "Development" },
};
const statuses: Record<MapLocale, Record<AssetStatus, string>> = {
  tr: { ACTIVE: "Aktif", PLANNED: "Planlanan", MAINTENANCE: "Bakımda" },
  en: { ACTIVE: "Active", PLANNED: "Planned", MAINTENANCE: "Maintenance" },
};

export const kindLabel = (kind: NodeKind, locale: MapLocale) => kinds[locale][kind];
export const edgeLabel = (kind: EdgeKind, locale: MapLocale) => edges[locale][kind];
export const environmentLabel = (environment: Environment, locale: MapLocale) => environments[locale][environment];
export const statusLabel = (status: AssetStatus, locale: MapLocale) => statuses[locale][status];
