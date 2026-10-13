export type NavigationItem = {
  id: string;
  href: string;
  label: string;
  icon: string;
  keywords?: readonly string[];
  roles?: readonly string[];
  newTab?: boolean;
  aliases?: readonly string[];
};
export type NavigationGroup = {
  id: string;
  label: string;
  icon: string;
  items: readonly NavigationItem[];
};

const crm = ["ADMIN", "MANAGER", "SALES", "CALLCENTER", "PREVIEW"];
const managers = ["ADMIN", "MANAGER", "PREVIEW"];
const admins = ["ADMIN", "PREVIEW"];
const salesCrm = crm.filter((role) => role !== "CALLCENTER");
const customerRoles = [...salesCrm, "AFTERSALES"];
const profileRoles = ["ADMIN", "MANAGER", "SALES", "AFTERSALES", "PREVIEW"];

// Navigation visibility mirrors the existing layout. API permissions remain authoritative.
export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: "workspace",
    label: "nav.groups.workspace",
    icon: "briefcase",
    items: [
      {
        id: "profile",
        href: "/profile",
        label: "nav.profile",
        icon: "profile",
        roles: profileRoles,
        keywords: [
          "my customers",
          "my agencies",
          "my presentations",
          "müşterilerim",
          "acentalarım",
          "sunumlarım",
        ],
        aliases: ["/my-customers"],
      },
      {
        id: "tasks",
        href: "/tasks",
        label: "nav.tasks",
        icon: "tasks",
        keywords: [
          "görev",
          "iş takibi",
          "task",
          "work",
          "kanban",
          "pano",
          "checklist",
        ],
      },
      {
        id: "it-support",
        href: "/it-support",
        label: "nav.itSupport",
        icon: "support",
        roles: ["ADMIN", "MANAGER", "SALES", "CALLCENTER", "AFTERSALES", "ACCOUNTING"],
        keywords: ["ticket", "IT destek", "teknik destek", "helpdesk", "service desk", "arıza", "sorun", "istek", "talep", "şikayet"],
      },
      {
        id: "calendar",
        href: "/calendar",
        label: "nav.calendar",
        icon: "calendar",
        roles: crm,
        keywords: ["agenda", "ajanda", "randevu"],
      },
      {
        id: "meetings",
        href: "/meetings",
        label: "nav.meetings",
        icon: "meetings",
        roles: salesCrm,
        keywords: ["meeting", "toplantı"],
      },
    ],
  },
  {
    id: "sales",
    label: "nav.groups.sales",
    icon: "handshake",
    items: [
      {
        id: "leads",
        href: "/leads",
        label: "nav.leads",
        icon: "leads",
        roles: crm,
        keywords: ["lead", "potansiyel müşteri", "satış fırsatı"],
      },
      {
        id: "call-followups",
        href: "/leads/followups",
        label: "nav.callFollowups",
        icon: "leads",
        roles: crm,
        keywords: ["arama takipleri", "call follow-ups", "followup", "geri arama"],
      },
      {
        id: "customers",
        href: "/customers",
        label: "nav.customers",
        icon: "customers",
        roles: customerRoles,
        keywords: ["customer", "müşteri"],
      },
      {
        id: "agencies",
        href: "/agencies",
        label: "nav.agencies",
        icon: "agencies",
        roles: salesCrm,
        keywords: ["agent", "agency", "acenta", "acente", "ajans"],
      },
      {
        id: "bulk-email",
        href: "/bulk-email",
        label: "nav.bulkEmail",
        icon: "mail",
        roles: [...managers, "AFTERSALES"],
        keywords: [
          "email",
          "e-posta",
          "eposta",
          "kampanya",
          "campaign",
          "mail",
        ],
      },
      {
        id: "agent-wheel",
        href: "/agent-wheel",
        label: "nav.agentWheel",
        icon: "gift",
        roles: [...managers, "SALES"],
        newTab: true,
        keywords: ["wheel", "çark", "hediye", "ödül", "gift"],
      },
      {
        id: "wheel-management",
        href: "/agent-wheel-management",
        label: "nav.agentWheelManagement",
        icon: "trophy",
        roles: managers,
        keywords: ["wheel history", "ödül geçmişi", "çark"],
      },
      {
        id: "nationality",
        href: "/customers/nationality-report",
        label: "nav.nationalityReport",
        icon: "globe",
        roles: salesCrm,
        keywords: ["nationality", "uyruk", "milliyet", "harita", "map"],
      },
      {
        id: "demographics",
        href: "/customers/demographics-report",
        label: "nav.demographicsReport",
        icon: "chart",
        roles: salesCrm,
        keywords: ["demographic", "müşteri raporu", "customer report"],
      },
    ],
  },
  {
    id: "property",
    label: "nav.groups.property",
    icon: "building",
    items: [
      {
        id: "units",
        href: "/units",
        label: "nav.units",
        icon: "building",
        roles: customerRoles,
        keywords: [
          "all units",
          "daire",
          "konut",
          "arsa",
          "teslimat",
          "delivery",
          "owner",
          "ev sahibi",
        ],
      },
      {
        id: "unit-dashboard",
        href: "/units/dashboard",
        label: "nav.unitsDashboard",
        icon: "dashboard",
        roles: admins,
        keywords: ["unit report", "daire raporu", "teslimat raporu"],
      },
      {
        id: "rent-projection",
        href: "/rent-projection",
        label: "nav.rentProjection",
        icon: "rent",
        roles: crm,
        keywords: ["rental", "kira", "projection"],
      },
    ],
  },
  {
    id: "company",
    label: "nav.groups.company",
    icon: "network",
    items: [
      {
        id: "organization",
        href: "/org-chart",
        label: "nav.orgChart",
        icon: "network",
        keywords: [
          "organizasyon",
          "şema",
          "pozisyon",
          "görev tanımı",
          "organization",
          "position",
          "department",
          "departman",
        ],
      },
      {
        id: "digital-team",
        href: "/digital-team",
        label: "nav.digitalTeam",
        icon: "briefcase",
        roles: ["ADMIN"],
        keywords: ["dijital ekip", "digital team", "IT", "proje", "süreç", "sorumlu", "project", "process", "portfolio"],
      },
      {
        id: "digital-map",
        href: "/digital-map",
        label: "nav.digitalMap",
        icon: "network",
        roles: ["ADMIN"],
        keywords: ["dijital harita", "digital map", "IT", "sunucu", "server", "backend", "database", "veritabanı", "erişim", "altyapı"],
      },
      {
        id: "quality",
        href: "/quality-control",
        label: "nav.qualityControl",
        icon: "quality",
        roles: profileRoles,
        keywords: ["kalite", "ISO", "9001", "doküman", "quality", "standart"],
      },
      {
        id: "iso-2026",
        href: "/iso-2026",
        label: "nav.iso2026",
        icon: "quality",
        roles: profileRoles,
        keywords: ["ISO 2026", "9001:2026", "kalite", "standart", "quality", "PDCA", "PUKÖ"],
      },
      {
        id: "pdca",
        href: "/pdca",
        label: "nav.pdca",
        icon: "cycle",
        roles: crm,
        keywords: ["PUKÖ", "planla", "uygula", "iyileştirme", "improvement"],
      },
    ],
  },
  {
    id: "finance",
    label: "nav.finance",
    icon: "landmark",
    items: [
      {
        id: "payment-tracking",
        href: "/finance/payment-tracking",
        label: "nav.paymentTracking",
        icon: "calendar",
        roles: ["ADMIN", "ACCOUNTING"],
        keywords: ["ödeme takip", "tahsilat", "vade", "erteleme", "payment tracking", "collection", "overdue"],
      },
      {
        id: "collection-report",
        href: "/finance/collection-report",
        label: "nav.collectionReport",
        icon: "chart",
        roles: ["ADMIN", "ACCOUNTING"],
        keywords: ["tahsilat raporu", "aylık vade", "gelecek ay", "potansiyel tahsilat", "collection report", "monthly receivables"],
      },
      {
        id: "collection-table",
        href: "/finance/collection-table",
        label: "nav.collectionTable",
        icon: "chart",
        roles: ["ADMIN", "ACCOUNTING"],
        keywords: ["tahsilat tablosu", "aylık tablo", "collection table"],
      },
    ],
  },
  {
    id: "management",
    label: "nav.groups.management",
    icon: "shield",
    items: [
      {
        id: "manager-queue",
        href: "/manager/queue",
        label: "nav.managerQueue",
        icon: "queue",
        roles: managers,
        keywords: ["onay", "approval", "queue", "kuyruk"],
      },
      {
        id: "admin",
        href: "/admin",
        label: "nav.admin",
        icon: "settings",
        roles: managers,
        keywords: ["admin", "yönetici"],
      },
      {
        id: "users",
        href: "/admin/users",
        label: "nav.users",
        icon: "users",
        roles: admins,
        keywords: ["user", "kullanıcı", "rol", "yetki", "permission"],
      },
      {
        id: "user-activity",
        href: "/users-activity",
        label: "nav.userActivity",
        icon: "activity",
        roles: managers,
        keywords: ["audit", "log", "aktivite", "kullanıcı hareketleri"],
      },
      {
        id: "lead-cleanup",
        href: "/admin/leads",
        label: "nav.leadCleanup",
        icon: "cleanup",
        roles: admins,
        keywords: ["lead", "temizlik", "cleanup"],
      },
    ],
  },
];

export function navigationForRole(role?: string): NavigationGroup[] {
  if (!role) return [];
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(role),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function normalizeModuleSearch(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchNavigation(
  groups: readonly NavigationGroup[],
  query: string,
  labels: (key: string) => string,
): NavigationGroup[] {
  const words = normalizeModuleSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...groups];
  return groups
    .map((group) => {
      const groupLabel = normalizeModuleSearch(labels(group.label));
      const ranked = group.items
        .map((item) => {
          const title = normalizeModuleSearch(labels(item.label));
          const keywords = normalizeModuleSearch(
            (item.keywords || []).join(" "),
          );
          const text = `${groupLabel} ${title} ${keywords}`;
          // Direct module-name matches precede related keywords and parent headings.
          return {
            item,
            matches: words.every((word) => text.includes(word)),
            score:
              words.filter((word) => title.includes(word)).length * 100 +
              words.filter((word) => keywords.includes(word)).length * 10,
          };
        })
        .filter((row) => row.matches)
        .sort((a, b) => b.score - a.score);
      return { group, ranked, score: ranked[0]?.score ?? -1 };
    })
    .filter((result) => result.ranked.length > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ group, ranked }) => ({
      ...group,
      items: ranked.map(({ item }) => item),
    }));
}

export function activeNavigationItem(
  groups: readonly NavigationGroup[],
  pathname: string,
) {
  let active: NavigationItem | undefined;
  let longest = -1;
  for (const group of groups)
    for (const item of group.items) {
      for (const path of [item.href, ...(item.aliases || [])]) {
        if (
          (pathname === path || pathname.startsWith(path + "/")) &&
          path.length > longest
        ) {
          active = item;
          longest = path.length;
        }
      }
    }
  return active;
}

export function readGroupPreference(
  value: string | null,
): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      navigationGroups
        .filter(
          (group) =>
            Object.hasOwn(parsed, group.id) &&
            typeof (parsed as Record<string, unknown>)[group.id] === "boolean",
        )
        .map((group) => [
          group.id,
          (parsed as Record<string, boolean>)[group.id],
        ]),
    );
  } catch {
    return {};
  }
}
