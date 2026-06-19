"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";

type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type UnitDeliveryStatus = "NOT_READY" | "READY_TO_DELIVER" | "DELIVERED";
type UnitCompanyStatus = "UNKNOWN" | "DND" | "OTHER";
type PaymentStatus = "UNPAID" | "PAID";
type ElectricityProvider = "UNKNOWN" | "TIPTEK" | "DND";
type WaterAccessStatus = "UNKNOWN" | "ON" | "OFF";
type RentalPackage = "FULL_FURNISHED" | "NOT_INTERESTED" | "CUSTOM";
type RentalStatus = "SHORT_TERM" | "LONG_TERM" | "DND_UNITS" | "NOT_INTERESTED";

type UnitAidatRow = {
  id?: string;
  title?: string | null;
  amount?: number | string | null;
  dueDate?: string | null;
  status?: PaymentStatus | string | null;
  paidAt?: string | null;
  note?: string | null;
};

type UnitAidatPayment = UnitAidatRow & {
  periodKey?: string | null;
  currency?: string | null;
};

type UnitCustomer = {
  id: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
  owner?: { id: string; name: string; email?: string | null; role?: string | null } | null;
};

type UnitRow = {
  id: string;
  customerId: string;
  project: ProjectType;
  unitNumber: string;
  deliveryStatus: UnitDeliveryStatus;
  companyStatus: UnitCompanyStatus;
  customerComplaint?: string | null;
  unitComplaint?: string | null;
  isCanceled?: boolean;
  kdvStatus?: PaymentStatus | string;
  trafoStatus?: PaymentStatus | string;
  installments?: UnitAidatRow[] | null;
  aidatPayments?: UnitAidatPayment[] | null;
  electricityProvider?: ElectricityProvider | string;
  waterAccessStatus?: WaterAccessStatus | string;
  rentalPackage?: RentalPackage | string;
  customFurniture?: string | null;
  rentalStatus?: RentalStatus | string;
  customer: UnitCustomer;
};

type ChartDatum = {
  key: string;
  name: string;
  value: number;
  color: string;
};

type CustomerComplaintRow = {
  complaint: string;
  solution: string;
  status: "DONE" | "UNDONE";
};

const PROJECTS: ProjectType[] = [
  "LA_JOYA",
  "LA_JOYA_PERLA",
  "LA_JOYA_PERLA_II",
  "LAGOON_VERDE",
];

const DELIVERY_STATUSES: UnitDeliveryStatus[] = [
  "DELIVERED",
  "READY_TO_DELIVER",
  "NOT_READY",
];

const COMPANY_STATUSES: UnitCompanyStatus[] = ["DND", "OTHER", "UNKNOWN"];
const ELECTRICITY_PROVIDERS: ElectricityProvider[] = ["TIPTEK", "DND", "UNKNOWN"];
const WATER_STATUSES: WaterAccessStatus[] = ["ON", "OFF", "UNKNOWN"];
const RENTAL_PACKAGES: RentalPackage[] = [
  "FULL_FURNISHED",
  "CUSTOM",
  "NOT_INTERESTED",
];
const RENTAL_STATUSES: RentalStatus[] = [
  "SHORT_TERM",
  "LONG_TERM",
  "DND_UNITS",
  "NOT_INTERESTED",
];

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#64748b",
];

const DELIVERY_COLORS: Record<UnitDeliveryStatus, string> = {
  DELIVERED: "#16a34a",
  READY_TO_DELIVER: "#2563eb",
  NOT_READY: "#f59e0b",
};

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback?: string | null,
) {
  const translated = t(path);
  if (translated === path) return fallback ?? path;
  return translated;
}

function projectLabel(project: ProjectType | string) {
  const labels: Record<string, string> = {
    LA_JOYA: "La Joya",
    LA_JOYA_PERLA: "La Joya Perla",
    LA_JOYA_PERLA_II: "La Joya Perla II",
    LAGOON_VERDE: "Lagoon Verde",
  };

  return labels[project] || project;
}

function deliveryLabel(status: UnitDeliveryStatus | string | undefined, locale: string) {
  if (status === "DELIVERED") return locale === "tr" ? "Teslim edildi" : "Delivered";
  if (status === "READY_TO_DELIVER") {
    return locale === "tr" ? "Teslime hazır" : "Ready to deliver";
  }
  return locale === "tr" ? "Henüz hazır değil" : "Not ready yet";
}

function companyLabel(status: UnitCompanyStatus | string | undefined, locale: string) {
  if (status === "DND") return "DND";
  if (status === "OTHER") return locale === "tr" ? "Diğer" : "Other";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function electricityLabel(status: string | undefined, locale: string) {
  if (status === "TIPTEK") return "Kiptek";
  if (status === "DND") return "DND";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function waterLabel(status: string | undefined, locale: string) {
  if (status === "ON") return locale === "tr" ? "Açık" : "On";
  if (status === "OFF") return locale === "tr" ? "Kapalı" : "Off";
  return locale === "tr" ? "Seçilmedi" : "Not selected";
}

function rentalPackageLabel(status: string | undefined, locale: string) {
  if (status === "FULL_FURNISHED") return "Full furnished";
  if (status === "CUSTOM") return locale === "tr" ? "Özel mobilya" : "Custom furniture";
  return locale === "tr" ? "İlgilenmiyor" : "Not interested";
}

function rentalStatusLabel(status: string | undefined, locale: string) {
  if (status === "SHORT_TERM") return locale === "tr" ? "Kısa dönem" : "Short term";
  if (status === "LONG_TERM") return locale === "tr" ? "Uzun dönem" : "Long term";
  if (status === "DND_UNITS") return "DND Units";
  return locale === "tr" ? "İlgilenmiyor" : "Not interested";
}

function paymentLabel(status: string | undefined, locale: string) {
  return status === "PAID"
    ? locale === "tr" ? "Ödendi" : "Paid"
    : locale === "tr" ? "Ödenmedi" : "Unpaid";
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dueDateKey(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const localMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (localMatch) {
    return `${localMatch[3]}-${localMatch[2].padStart(2, "0")}-${localMatch[1].padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return dateKey(parsed);
}

function parseCustomerComplaints(value: string | null | undefined): CustomerComplaintRow[] {
  const raw = (value || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((row) => ({
        complaint: String(row?.complaint || "").trim(),
        solution: String(row?.solution || "").trim(),
        status: row?.status === "DONE" ? ("DONE" as const) : ("UNDONE" as const),
      }))
      .filter((row) => row.complaint || row.solution);
  } catch {
    return [{ complaint: raw, solution: "", status: "UNDONE" }];
  }
}

function getAidatRows(item: UnitRow) {
  if (Array.isArray(item.aidatPayments) && item.aidatPayments.length > 0) {
    return item.aidatPayments;
  }

  return Array.isArray(item.installments) ? item.installments : [];
}

function hasOverdueAidat(item: UnitRow) {
  const today = dateKey(new Date());

  return getAidatRows(item).some((row) => {
    const status = String(row?.status || "UNPAID").toUpperCase();
    const due = dueDateKey(row?.dueDate);

    return status !== "PAID" && Boolean(due) && due! < today;
  });
}

function overdueAidatRows(item: UnitRow) {
  const today = dateKey(new Date());

  return getAidatRows(item).filter((row) => {
    const status = String(row?.status || "UNPAID").toUpperCase();
    const due = dueDateKey(row?.dueDate);

    return status !== "PAID" && Boolean(due) && due! < today;
  });
}

function hasUndoneComplaint(item: UnitRow) {
  return parseCustomerComplaints(item.customerComplaint).some(
    (row) => row.status !== "DONE",
  );
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAmount(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function countItems(items: UnitRow[], predicate: (item: UnitRow) => boolean) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function hasChartValues(data: ChartDatum[]) {
  return data.some((item) => item.value > 0);
}

function DashboardCard({
  title,
  value,
  sub,
  tone = "default",
}: {
  title: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "good" | "warning" | "danger" | "info";
}) {
  return (
    <div className={`units-dashboard-card tone-${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="units-dashboard-panel">
      <div className="units-dashboard-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="units-dashboard-chart">{children}</div>
    </section>
  );
}

export default function UnitsDashboardPage() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const data = (await authedFetch("/units")) as { items?: UnitRow[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = getUser();
    setMe(user);
    setAccessChecked(true);

    if (user?.role === "ADMIN") {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const total = items.length;
    const canceled = countItems(items, (item) => Boolean(item.isCanceled));
    const active = total - canceled;
    const delivered = countItems(items, (item) => item.deliveryStatus === "DELIVERED");
    const ready = countItems(items, (item) => item.deliveryStatus === "READY_TO_DELIVER");
    const notReady = countItems(items, (item) => item.deliveryStatus === "NOT_READY");
    const dndCompany = countItems(items, (item) => item.companyStatus === "DND");
    const otherCompany = countItems(items, (item) => item.companyStatus === "OTHER");
    const fullFurnished = countItems(
      items,
      (item) => item.rentalPackage === "FULL_FURNISHED",
    );
    const customFurniture = countItems(items, (item) => item.rentalPackage === "CUSTOM");
    const customFurnitureNotes = countItems(
      items,
      (item) => item.rentalPackage === "CUSTOM" && Boolean(item.customFurniture?.trim()),
    );
    const overdueAidatUnits = countItems(items, hasOverdueAidat);
    const undoneComplaintUnits = countItems(items, hasUndoneComplaint);

    const aidatRows = items.flatMap((item) =>
      getAidatRows(item).map((row) => ({
        item,
        row,
      })),
    );
    const paidAidatRows = aidatRows.filter(
      ({ row }) => String(row.status || "UNPAID").toUpperCase() === "PAID",
    );
    const unpaidAidatRows = aidatRows.length - paidAidatRows.length;
    const overdueAidatAmount = items.reduce(
      (sum, item) =>
        sum +
        overdueAidatRows(item).reduce(
          (rowSum, row) => rowSum + (Number(row.amount) || 0),
          0,
        ),
      0,
    );

    const complaintRows = items.flatMap((item) =>
      parseCustomerComplaints(item.customerComplaint).map((row) => ({ item, row })),
    );
    const undoneComplaintRows = complaintRows.filter(({ row }) => row.status !== "DONE");

    const deliveryData: ChartDatum[] = DELIVERY_STATUSES.map((status) => ({
      key: status,
      name: deliveryLabel(status, locale),
      value: countItems(items, (item) => item.deliveryStatus === status),
      color: DELIVERY_COLORS[status],
    }));

    const companyData: ChartDatum[] = COMPANY_STATUSES.map((status, index) => ({
      key: status,
      name: companyLabel(status, locale),
      value: countItems(items, (item) => item.companyStatus === status),
      color: CHART_COLORS[index],
    }));

    const furnitureData: ChartDatum[] = RENTAL_PACKAGES.map((status, index) => ({
      key: status,
      name: rentalPackageLabel(status, locale),
      value: countItems(items, (item) => (item.rentalPackage || "NOT_INTERESTED") === status),
      color: CHART_COLORS[index],
    }));

    const rentalStatusData: ChartDatum[] = RENTAL_STATUSES.map((status, index) => ({
      key: status,
      name: rentalStatusLabel(status, locale),
      value: countItems(items, (item) => (item.rentalStatus || "NOT_INTERESTED") === status),
      color: CHART_COLORS[index + 2] || CHART_COLORS[index],
    }));

    const electricityData: ChartDatum[] = ELECTRICITY_PROVIDERS.map((status, index) => ({
      key: `electricity-${status}`,
      name: electricityLabel(status, locale),
      value: countItems(items, (item) => (item.electricityProvider || "UNKNOWN") === status),
      color: CHART_COLORS[index],
    }));

    const waterData: ChartDatum[] = WATER_STATUSES.map((status, index) => ({
      key: `water-${status}`,
      name: waterLabel(status, locale),
      value: countItems(items, (item) => (item.waterAccessStatus || "UNKNOWN") === status),
      color: CHART_COLORS[index + 3] || CHART_COLORS[index],
    }));

    const utilityData = [
      ...electricityData.map((item) => ({
        ...item,
        name: `${locale === "tr" ? "Elektrik" : "Electric"}: ${item.name}`,
      })),
      ...waterData.map((item) => ({
        ...item,
        name: `${locale === "tr" ? "Su" : "Water"}: ${item.name}`,
      })),
    ];

    const accountingData: ChartDatum[] = [
      {
        key: "kdv-paid",
        name: `KDV ${paymentLabel("PAID", locale)}`,
        value: countItems(items, (item) => item.kdvStatus === "PAID"),
        color: "#16a34a",
      },
      {
        key: "kdv-unpaid",
        name: `KDV ${paymentLabel("UNPAID", locale)}`,
        value: countItems(items, (item) => item.kdvStatus !== "PAID"),
        color: "#f59e0b",
      },
      {
        key: "trafo-paid",
        name: `Trafo ${paymentLabel("PAID", locale)}`,
        value: countItems(items, (item) => item.trafoStatus === "PAID"),
        color: "#0891b2",
      },
      {
        key: "trafo-unpaid",
        name: `Trafo ${paymentLabel("UNPAID", locale)}`,
        value: countItems(items, (item) => item.trafoStatus !== "PAID"),
        color: "#dc2626",
      },
    ];

    const projectRows = PROJECTS.map((project) => {
      const projectItems = items.filter((item) => item.project === project);
      return {
        key: project,
        name: projectLabel(project),
        total: projectItems.length,
        delivered: countItems(
          projectItems,
          (item) => item.deliveryStatus === "DELIVERED",
        ),
        ready: countItems(
          projectItems,
          (item) => item.deliveryStatus === "READY_TO_DELIVER",
        ),
        notReady: countItems(projectItems, (item) => item.deliveryStatus === "NOT_READY"),
        fullFurnished: countItems(
          projectItems,
          (item) => item.rentalPackage === "FULL_FURNISHED",
        ),
        customFurniture: countItems(projectItems, (item) => item.rentalPackage === "CUSTOM"),
        overdueAidat: countItems(projectItems, hasOverdueAidat),
        undoneComplaints: countItems(projectItems, hasUndoneComplaint),
      };
    }).filter((row) => row.total > 0);

    const projectData: ChartDatum[] = projectRows.map((row, index) => ({
      key: row.key,
      name: row.name,
      value: row.total,
      color: CHART_COLORS[index],
    }));

    const attentionData: ChartDatum[] = [
      {
        key: "overdue-aidat",
        name: locale === "tr" ? "Geciken aidat" : "Overdue aidat",
        value: overdueAidatUnits,
        color: "#dc2626",
      },
      {
        key: "undone-complaints",
        name: locale === "tr" ? "Açık şikayet" : "Undone complaints",
        value: undoneComplaintUnits,
        color: "#f59e0b",
      },
      {
        key: "canceled",
        name: locale === "tr" ? "İptal" : "Canceled",
        value: canceled,
        color: "#64748b",
      },
    ];

    const attentionRows = items
      .map((item) => {
        const issues = [
          hasOverdueAidat(item)
            ? locale === "tr"
              ? "Aidat ödenmedi"
              : "Aidat unpaid"
            : null,
          hasUndoneComplaint(item)
            ? locale === "tr"
              ? "Açık şikayet"
              : "Undone complaint"
            : null,
          item.isCanceled ? (locale === "tr" ? "İptal" : "Canceled") : null,
        ].filter((issue): issue is string => Boolean(issue));

        return { item, issues };
      })
      .filter((row) => row.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length || a.item.unitNumber.localeCompare(b.item.unitNumber))
      .slice(0, 12);

    return {
      total,
      active,
      canceled,
      delivered,
      ready,
      notReady,
      dndCompany,
      otherCompany,
      fullFurnished,
      customFurniture,
      customFurnitureNotes,
      overdueAidatUnits,
      overdueAidatAmount,
      undoneComplaintUnits,
      totalAidatRows: aidatRows.length,
      paidAidatRows: paidAidatRows.length,
      unpaidAidatRows,
      totalComplaintRows: complaintRows.length,
      undoneComplaintRows: undoneComplaintRows.length,
      deliveryData,
      companyData,
      furnitureData,
      rentalStatusData,
      utilityData,
      accountingData,
      projectData,
      projectRows,
      attentionData,
      attentionRows,
    };
  }, [items, locale]);

  const tooltipStyle = {
    background: "var(--surface)",
    border: "1px solid var(--stroke)",
    borderRadius: 12,
    color: "var(--text-primary)",
  };

  if (accessChecked && me?.role !== "ADMIN") {
    return (
      <div style={{ display: "grid", gap: 18, paddingBottom: 28 }}>
        <section
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 620,
            padding: 28,
            border: "1px solid var(--stroke)",
            borderRadius: 8,
            background: "var(--surface)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span
            style={{
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Admin
          </span>
          <h1
            style={{
              margin: 0,
              color: "var(--text-primary)",
              fontSize: 30,
              letterSpacing: 0,
            }}
          >
            {locale === "tr" ? "Bu panel sadece admin için." : "This dashboard is admin only."}
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {locale === "tr"
              ? "Operasyonel unit listesine dönerek kayıtları yönetebilirsiniz."
              : "You can return to the operational unit list to manage records."}
          </p>
          <Link
            href="/units"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              width: "fit-content",
              padding: "0 16px",
              border: "1px solid var(--stroke)",
              borderRadius: 8,
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            {locale === "tr" ? "Tüm Unitler" : "All Units"}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="units-dashboard-page">
      <style jsx global>{`
        .units-dashboard-page {
          display: grid;
          gap: 18px;
          padding-bottom: 28px;
        }

        .units-dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 22px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .units-dashboard-title {
          display: grid;
          gap: 6px;
          max-width: 760px;
        }

        .units-dashboard-title span,
        .units-dashboard-card span,
        .units-dashboard-table th {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .units-dashboard-title h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1;
          letter-spacing: 0;
        }

        .units-dashboard-title p,
        .units-dashboard-panel-head p,
        .units-dashboard-access p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .units-dashboard-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .units-dashboard-button,
        .units-dashboard-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
          color: var(--text-primary);
          font: inherit;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
        }

        .units-dashboard-actions button:disabled {
          cursor: wait;
          opacity: 0.68;
        }

        .units-dashboard-cards {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }

        .units-dashboard-card {
          display: grid;
          gap: 10px;
          min-height: 128px;
          padding: 16px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }

        .units-dashboard-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: #64748b;
        }

        .units-dashboard-card.tone-good::before {
          background: #16a34a;
        }

        .units-dashboard-card.tone-warning::before {
          background: #f59e0b;
        }

        .units-dashboard-card.tone-danger::before {
          background: #dc2626;
        }

        .units-dashboard-card.tone-info::before {
          background: #2563eb;
        }

        .units-dashboard-card strong {
          color: var(--text-primary);
          font-size: 34px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: 0;
        }

        .units-dashboard-card small {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.35;
        }

        .units-dashboard-grid {
          display: grid;
          gap: 14px;
          align-items: stretch;
        }

        .units-dashboard-grid.two {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }

        .units-dashboard-grid.three {
          grid-template-columns: 1.1fr 1.2fr 1fr;
        }

        .units-dashboard-panel {
          display: grid;
          gap: 14px;
          padding: 18px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
          min-width: 0;
        }

        .units-dashboard-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .units-dashboard-panel h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .units-dashboard-chart {
          width: 100%;
          min-width: 0;
          height: 310px;
        }

        .units-dashboard-empty-chart {
          display: grid;
          place-items: center;
          height: 100%;
          border: 1px dashed var(--stroke);
          border-radius: 8px;
          color: var(--text-secondary);
          font-weight: 800;
        }

        .units-dashboard-table-wrap {
          overflow: auto;
          border: 1px solid var(--stroke);
          border-radius: 8px;
        }

        .units-dashboard-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .units-dashboard-table th,
        .units-dashboard-table td {
          padding: 13px 14px;
          border-bottom: 1px solid var(--stroke);
          text-align: left;
          vertical-align: top;
        }

        .units-dashboard-table tr:last-child td {
          border-bottom: 0;
        }

        .units-dashboard-table td {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 700;
        }

        .units-dashboard-table .muted {
          display: block;
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
        }

        .units-dashboard-unit-link {
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 900;
        }

        .units-dashboard-unit-link:hover {
          text-decoration: underline;
        }

        .units-dashboard-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .units-dashboard-badge {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 9px;
          border: 1px solid var(--stroke);
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .units-dashboard-badge.danger {
          border-color: rgba(220, 38, 38, 0.24);
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
        }

        .units-dashboard-badge.warning {
          border-color: rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.1);
          color: #b45309;
        }

        .units-dashboard-access {
          display: grid;
          gap: 12px;
          max-width: 620px;
          padding: 28px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .units-dashboard-access h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 30px;
          letter-spacing: 0;
        }

        .units-dashboard-error {
          padding: 12px 14px;
          border: 1px solid rgba(220, 38, 38, 0.26);
          border-radius: 8px;
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
          font-weight: 800;
        }

        @media (max-width: 1200px) {
          .units-dashboard-cards {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .units-dashboard-grid.three {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 900px) {
          .units-dashboard-header {
            flex-direction: column;
          }

          .units-dashboard-actions,
          .units-dashboard-actions > * {
            width: 100%;
          }

          .units-dashboard-cards,
          .units-dashboard-grid.two,
          .units-dashboard-grid.three {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .units-dashboard-header,
          .units-dashboard-panel,
          .units-dashboard-card {
            padding: 14px;
          }

          .units-dashboard-cards {
            gap: 10px;
          }
        }
      `}</style>

      <header className="units-dashboard-header">
        <div className="units-dashboard-title">
          <span>
            {safeTranslate(
              t,
              "unitsDashboard.label",
              locale === "tr" ? "Admin dashboard" : "Admin dashboard",
            )}
          </span>
          <h1>
            {safeTranslate(
              t,
              "unitsDashboard.title",
              locale === "tr" ? "All Units Dashboard" : "All Units Dashboard",
            )}
          </h1>
          <p>
            {locale === "tr"
              ? "Teslim, kiralama, mobilya, muhasebe, bağlantılar ve açık konuları tek ekranda takip edin."
              : "Track delivery, rental, furniture, accounting, utilities and open issues in one admin view."}
          </p>
        </div>

        <div className="units-dashboard-actions">
          <Link href="/units" className="units-dashboard-button">
            {locale === "tr" ? "Tüm Unitler" : "All Units"}
          </Link>
          <button type="button" onClick={load} disabled={loading}>
            {loading
              ? locale === "tr" ? "Yenileniyor..." : "Refreshing..."
              : locale === "tr" ? "Yenile" : "Refresh"}
          </button>
        </div>
      </header>

      {err ? <div className="units-dashboard-error">{err}</div> : null}

      <section className="units-dashboard-cards">
        <DashboardCard
          title={locale === "tr" ? "Toplam unit" : "Total units"}
          value={formatNumber(metrics.total, locale)}
          sub={`${formatNumber(metrics.active, locale)} ${locale === "tr" ? "aktif" : "active"} · ${formatNumber(metrics.canceled, locale)} ${locale === "tr" ? "iptal" : "canceled"}`}
          tone="info"
        />
        <DashboardCard
          title={locale === "tr" ? "Teslim edildi" : "Delivered"}
          value={formatNumber(metrics.delivered, locale)}
          sub={`${formatNumber(metrics.ready, locale)} ${locale === "tr" ? "teslime hazır" : "ready to deliver"}`}
          tone="good"
        />
        <DashboardCard
          title={locale === "tr" ? "Henüz hazır değil" : "Not ready yet"}
          value={formatNumber(metrics.notReady, locale)}
          sub={`${formatNumber(metrics.dndCompany, locale)} DND · ${formatNumber(metrics.otherCompany, locale)} ${locale === "tr" ? "diğer" : "other"}`}
          tone="warning"
        />
        <DashboardCard
          title={locale === "tr" ? "Full furnished" : "Full furnished"}
          value={formatNumber(metrics.fullFurnished, locale)}
          sub={`${formatNumber(metrics.customFurniture, locale)} ${locale === "tr" ? "özel mobilya" : "custom furniture"} · ${formatNumber(metrics.customFurnitureNotes, locale)} ${locale === "tr" ? "detaylı" : "with notes"}`}
          tone="good"
        />
        <DashboardCard
          title={locale === "tr" ? "Geciken aidat" : "Overdue aidat"}
          value={formatNumber(metrics.overdueAidatUnits, locale)}
          sub={`${formatAmount(metrics.overdueAidatAmount, locale)} ${locale === "tr" ? "toplam açık tutar" : "open amount"}`}
          tone={metrics.overdueAidatUnits > 0 ? "danger" : "good"}
        />
        <DashboardCard
          title={locale === "tr" ? "Açık şikayet" : "Undone complaints"}
          value={formatNumber(metrics.undoneComplaintUnits, locale)}
          sub={`${formatNumber(metrics.undoneComplaintRows, locale)} / ${formatNumber(metrics.totalComplaintRows, locale)} ${locale === "tr" ? "şikayet satırı" : "complaint rows"}`}
          tone={metrics.undoneComplaintUnits > 0 ? "danger" : "good"}
        />
      </section>

      <div className="units-dashboard-grid two">
        <ChartCard
          title={locale === "tr" ? "Teslim durumu" : "Delivery status"}
          subtitle={
            locale === "tr"
              ? "Teslim edildi, teslime hazır ve henüz hazır değil dağılımı"
              : "Delivered, ready to deliver and not ready distribution"
          }
        >
          {hasChartValues(metrics.deliveryData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.deliveryData}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {metrics.deliveryData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Veri yok" : "No data"}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={locale === "tr" ? "Proje dağılımı" : "Project distribution"}
          subtitle={
            locale === "tr"
              ? "Mevcut müşteri unitleri proje bazında"
              : "Existing customer units by project"
          }
        >
          {hasChartValues(metrics.projectData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.projectData}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {metrics.projectData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Veri yok" : "No data"}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="units-dashboard-grid three">
        <ChartCard
          title={locale === "tr" ? "Mobilya paketi" : "Furniture package"}
          subtitle={
            locale === "tr"
              ? "Full furnished, özel mobilya ve ilgilenmiyor"
              : "Full furnished, custom furniture and not interested"
          }
        >
          {hasChartValues(metrics.furnitureData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.furnitureData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={102}
                  paddingAngle={3}
                >
                  {metrics.furnitureData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Veri yok" : "No data"}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={locale === "tr" ? "Bağlantılar" : "Utilities"}
          subtitle={
            locale === "tr"
              ? "Elektrik sağlayıcısı ve su erişimi"
              : "Electricity provider and water access"
          }
        >
          {hasChartValues(metrics.utilityData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.utilityData} layout="vertical" margin={{ left: 18 }}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {metrics.utilityData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Veri yok" : "No data"}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={locale === "tr" ? "Muhasebe" : "Accounting"}
          subtitle={
            locale === "tr"
              ? `${metrics.paidAidatRows} ödenen aidat · ${metrics.unpaidAidatRows} açık aidat`
              : `${metrics.paidAidatRows} paid aidat · ${metrics.unpaidAidatRows} unpaid aidat`
          }
        >
          {hasChartValues(metrics.accountingData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.accountingData}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {metrics.accountingData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Veri yok" : "No data"}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="units-dashboard-grid two">
        <ChartCard
          title={locale === "tr" ? "Kiralama durumu" : "Rental status"}
          subtitle={
            locale === "tr"
              ? "Kısa dönem, uzun dönem, DND ve ilgilenmiyor"
              : "Short term, long term, DND units and not interested"
          }
        >
          {hasChartValues(metrics.rentalStatusData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.rentalStatusData}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {metrics.rentalStatusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Veri yok" : "No data"}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={locale === "tr" ? "Dikkat gerekenler" : "Needs attention"}
          subtitle={
            locale === "tr"
              ? "Geciken aidat, açık şikayet ve iptal kayıtları"
              : "Overdue aidat, undone complaints and canceled records"
          }
        >
          {hasChartValues(metrics.attentionData) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.attentionData}>
                <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {metrics.attentionData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="units-dashboard-empty-chart">
              {locale === "tr" ? "Açık konu yok" : "No open issues"}
            </div>
          )}
        </ChartCard>
      </div>

      <section className="units-dashboard-panel">
        <div className="units-dashboard-panel-head">
          <div>
            <h2>{locale === "tr" ? "Proje tablosu" : "Project table"}</h2>
            <p>
              {locale === "tr"
                ? "Teslim, mobilya ve açık konu sayıları proje bazında"
                : "Delivery, furniture and open issue counts by project"}
            </p>
          </div>
        </div>
        <div className="units-dashboard-table-wrap">
          <table className="units-dashboard-table">
            <thead>
              <tr>
                <th>{locale === "tr" ? "Proje" : "Project"}</th>
                <th>{locale === "tr" ? "Toplam" : "Total"}</th>
                <th>{locale === "tr" ? "Teslim" : "Delivered"}</th>
                <th>{locale === "tr" ? "Hazır" : "Ready"}</th>
                <th>{locale === "tr" ? "Hazır değil" : "Not ready"}</th>
                <th>{locale === "tr" ? "Mobilya" : "Furniture"}</th>
                <th>{locale === "tr" ? "Açık konular" : "Open issues"}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.projectRows.length > 0 ? (
                metrics.projectRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.name}</td>
                    <td>{formatNumber(row.total, locale)}</td>
                    <td>{formatNumber(row.delivered, locale)}</td>
                    <td>{formatNumber(row.ready, locale)}</td>
                    <td>{formatNumber(row.notReady, locale)}</td>
                    <td>
                      {formatNumber(row.fullFurnished, locale)} full
                      <span className="muted">
                        {formatNumber(row.customFurniture, locale)}{" "}
                        {locale === "tr" ? "özel" : "custom"}
                      </span>
                    </td>
                    <td>
                      <div className="units-dashboard-badges">
                        <span className="units-dashboard-badge danger">
                          {formatNumber(row.overdueAidat, locale)}{" "}
                          {locale === "tr" ? "aidat" : "aidat"}
                        </span>
                        <span className="units-dashboard-badge warning">
                          {formatNumber(row.undoneComplaints, locale)}{" "}
                          {locale === "tr" ? "şikayet" : "complaints"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>{locale === "tr" ? "Veri yok" : "No data"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="units-dashboard-panel">
        <div className="units-dashboard-panel-head">
          <div>
            <h2>{locale === "tr" ? "Açık konu listesi" : "Open issue table"}</h2>
            <p>
              {locale === "tr"
                ? "Admin için hızlı aksiyon alınacak unitler"
                : "Units that need quick admin attention"}
            </p>
          </div>
        </div>
        <div className="units-dashboard-table-wrap">
          <table className="units-dashboard-table">
            <thead>
              <tr>
                <th>{locale === "tr" ? "Unit" : "Unit"}</th>
                <th>{locale === "tr" ? "Müşteri" : "Customer"}</th>
                <th>{locale === "tr" ? "Teslim" : "Delivery"}</th>
                <th>{locale === "tr" ? "Kiralama / Mobilya" : "Rental / Furniture"}</th>
                <th>{locale === "tr" ? "Konu" : "Issue"}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.attentionRows.length > 0 ? (
                metrics.attentionRows.map(({ item, issues }) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/units/${item.id}`} className="units-dashboard-unit-link">
                        {projectLabel(item.project)} {item.unitNumber}
                      </Link>
                      <span className="muted">
                        {companyLabel(item.companyStatus, locale)}
                      </span>
                    </td>
                    <td>
                      {item.customer?.fullName || "-"}
                      <span className="muted">{item.customer?.email || item.customer?.phone || "-"}</span>
                    </td>
                    <td>{deliveryLabel(item.deliveryStatus, locale)}</td>
                    <td>
                      {rentalStatusLabel(item.rentalStatus, locale)}
                      <span className="muted">
                        {rentalPackageLabel(item.rentalPackage, locale)}
                      </span>
                    </td>
                    <td>
                      <div className="units-dashboard-badges">
                        {issues.map((issue) => (
                          <span
                            key={`${item.id}-${issue}`}
                            className={`units-dashboard-badge ${
                              issue.toLowerCase().includes("aidat") ||
                              issue.toLowerCase().includes("complaint") ||
                              issue.toLowerCase().includes("şikayet")
                                ? "danger"
                                : "warning"
                            }`}
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>{locale === "tr" ? "Açık konu yok" : "No open issues"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
