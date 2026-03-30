"use client";

import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

function formatShortDate(v: string) {
  if (!v) return "";
  return v.slice(5);
}

function DashboardCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: 10,
        minHeight: 118,
        padding: 18,
        border: "1px solid var(--stroke)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: ".02em",
          color: "var(--text-secondary)",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>

      {sub ? (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  minHeight = 320,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  minHeight?: number;
}) {
  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: 14,
        minHeight,
        padding: 18,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        {subtitle ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ width: "100%", height: minHeight - 70 }}>{children}</div>
    </div>
  );
}

function StatList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="card" style={{ display: "grid", gap: 14, padding: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>

      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: r.color || "var(--text-primary)",
                    flex: "0 0 auto",
                  }}
                />
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.label}
                </span>
              </div>

              <span style={{ fontWeight: 900, fontSize: 13 }}>{r.value}</span>
            </div>

            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "var(--surface-2)",
                border: "1px solid var(--stroke)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(r.value / max) * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: r.color || "var(--text-primary)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const role = me?.role as string | undefined;
  const canSeeDashboard = role === "ADMIN" || role === "MANAGER";
  const isManagerView = role === "MANAGER";

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await authedFetch("/admin/overview");
      setData(res);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted]);

  const statusChartData = useMemo(() => {
    const palette = [
      "#64748b",
      "#94a3b8",
      "#475569",
      "#22c55e",
      "#f59e0b",
      "#3b82f6",
      "#8b5cf6",
      "#ef4444",
    ];

    return (data?.leadsByStatus || []).map((r: any, i: number) => ({
      name: r.status,
      value: r.count,
      color: palette[i % palette.length],
    }));
  }, [data]);

  const usersByRoleRows = useMemo(() => {
    const colorMap: Record<string, string> = {
      ADMIN: "#8b5cf6",
      CALLCENTER: "#3b82f6",
      MANAGER: "#f59e0b",
      SALES: "#22c55e",
    };

    return (data?.users?.byRole || []).map((r: any) => ({
      label: r.role,
      value: r.count,
      color: colorMap[r.role] || "#64748b",
    }));
  }, [data]);

  const flowRows = useMemo(() => {
    return [
      {
        label: "Manager’a Gönderilen",
        value: data?.pipeline?.sentToManagerActivities ?? 0,
        color: "#8b5cf6",
      },
      {
        label: "Sales’e Atanan",
        value: data?.pipeline?.assignedToSalesActivities ?? 0,
        color: "#22c55e",
      },
    ];
  }, [data]);

  const callOutcomeRows = useMemo(() => {
    return [
      {
        label: "Yanıtlanan",
        value: data?.callOutcomes?.answeredCalls ?? 0,
        color: "#22c55e",
      },
      {
        label: "Cevapsız / Ulaşılamadı",
        value: data?.callOutcomes?.noAnswerCalls ?? 0,
        color: "#ef4444",
      },
    ];
  }, [data]);

  const leadsTrend = useMemo(() => {
    return (data?.charts?.leads14Days || []).map((d: any) => ({
      ...d,
      shortDate: formatShortDate(d.date),
    }));
  }, [data]);

  const callsTrend = useMemo(() => {
    return (data?.charts?.calls14Days || []).map((d: any) => ({
      ...d,
      shortDate: formatShortDate(d.date),
    }));
  }, [data]);

  const pipelineBarData = useMemo(() => {
    return [
      { name: "Working", value: data?.pipeline?.workingLeads ?? 0 },
      { name: "Review", value: data?.pipeline?.managerReviewLeads ?? 0 },
      { name: "Assigned", value: data?.pipeline?.assignedLeads ?? 0 },
      { name: "Won", value: data?.pipeline?.wonLeads ?? 0 },
      { name: "Lost", value: data?.pipeline?.lostLeads ?? 0 },
    ];
  }, [data]);

  if (!mounted) return <div>Yükleniyor…</div>;

  if (!canSeeDashboard) {
    return (
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Yetkisiz Erişim</div>
        <div className="muted">
          Bu sayfayı yalnızca ADMIN ve MANAGER kullanıcıları görebilir.
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="card">Dashboard yükleniyor…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {isManagerView ? "Manager" : "Admin"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }}>
            CRM Dashboard
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Lead akışı, çağrı performansı, ekip yapısı ve takip görünümü
          </div>
        </div>

        <button onClick={load} disabled={loading} className="primary">
          {loading ? "Yenileniyor..." : "Dashboard Yenile"}
        </button>
      </div>

      {err ? (
        <div
          className="card"
          style={{
            border: "1px solid rgba(239,68,68,.35)",
            background: "rgba(239,68,68,.08)",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <DashboardCard
          title="Toplam Lead"
          value={data?.kpis?.totalLeads ?? 0}
          sub={`Bugün: ${data?.kpis?.leadsToday ?? 0}`}
        />
        <DashboardCard
          title="Son 7 Gün Lead"
          value={data?.kpis?.leadsLast7 ?? 0}
          sub={`Son 30 gün: ${data?.kpis?.leadsLast30 ?? 0}`}
        />
        <DashboardCard
          title="Toplam Arama"
          value={data?.kpis?.totalCalls ?? 0}
          sub={`Bugün: ${data?.kpis?.callsToday ?? 0}`}
        />
        <DashboardCard
          title="Son 7 Gün Arama"
          value={data?.kpis?.callsLast7 ?? 0}
          sub={`Son 30 gün: ${data?.kpis?.callsLast30 ?? 0}`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <DashboardCard
          title="Working Lead"
          value={data?.pipeline?.workingLeads ?? 0}
        />
        <DashboardCard
          title="Manager Review"
          value={data?.pipeline?.managerReviewLeads ?? 0}
        />
        <DashboardCard
          title="Assigned"
          value={data?.pipeline?.assignedLeads ?? 0}
        />
        <DashboardCard
          title="Won / Lost"
          value={`${data?.pipeline?.wonLeads ?? 0} / ${data?.pipeline?.lostLeads ?? 0}`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <DashboardCard
          title="Takibi Geciken"
          value={data?.followups?.overdue ?? 0}
        />
        <DashboardCard
          title="Bugünkü Takip"
          value={data?.followups?.today ?? 0}
        />
        <DashboardCard
          title="Önümüzdeki 7 Gün"
          value={data?.followups?.upcoming7Days ?? 0}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <ChartCard
          title="Son 14 Günde Yeni Lead"
          subtitle="Gün bazlı yeni lead trendi"
          minHeight={340}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={leadsTrend}>
              <defs>
                <linearGradient id="leadAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
              <XAxis
                dataKey="shortDate"
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
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#64748b"
                fill="url(#leadAreaFill)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Lead Statü Dağılımı"
          subtitle="Pipeline durumlarının dağılımı"
          minHeight={340}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
              >
                {statusChartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <ChartCard
          title="Son 14 Günde Arama"
          subtitle="Çağrı aktivitesinin günlük trendi"
          minHeight={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={callsTrend}>
              <CartesianGrid stroke="var(--stroke)" strokeDasharray="3 3" />
              <XAxis
                dataKey="shortDate"
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
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#475569"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <StatList title="Aktif Kullanıcı Rolleri" rows={usersByRoleRows} />
        <StatList title="Flow Özeti" rows={flowRows} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <ChartCard
          title="Pipeline Özeti"
          subtitle="Ana satış akışındaki lead sayıları"
          minHeight={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineBarData}>
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
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {pipelineBarData.map((_: any, index: number) => {
                  const colors = ["#64748b", "#94a3b8", "#475569", "#8b5cf6", "#ef4444"];
                  return <Cell key={index} fill={colors[index % colors.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <StatList title="Arama Sonuç Özeti" rows={callOutcomeRows} />
      </div>
    </div>
  );
}