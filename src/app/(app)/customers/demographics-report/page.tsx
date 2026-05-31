"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type BucketRow = {
  label: string;
  count: number;
  percent: number;
};

type CoverageRow = {
  field: string;
  label: string;
  filled: number;
  missing: number;
  percent: number;
};

type DemographicsReport = {
  totalCustomers: number;
  overview: {
    existing: number;
    potential: number;
    averageAge: number | null;
    withAge: number;
    completion: number;
  };
  coverage: CoverageRow[];
  gender: BucketRow[];
  ageGroups: BucketRow[];
  jobs: BucketRow[];
  languages: BucketRow[];
  types: BucketRow[];
  projects: BucketRow[];
  sources: BucketRow[];
  countries: BucketRow[];
  nationalities: BucketRow[];
};

type SectionKey =
  | "ageGroups"
  | "gender"
  | "jobs"
  | "languages"
  | "projects"
  | "types"
  | "sources";

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback: string,
) {
  const translated = t(path);
  return translated === path ? fallback : translated;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function CustomerDemographicsReportPage() {
  const { t, locale } = useLanguage();
  const [report, setReport] = useState<DemographicsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("ageGroups");

  const numberText = useMemo(
    () => new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US"),
    [locale],
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await authedFetch("/customers/reports/demographics");
      setReport(data);
    } catch (err: any) {
      setError(err?.message || "Could not load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sectionLabels: Record<SectionKey, string> = {
    ageGroups: safeTranslate(t, "demographicsReport.sections.age", locale === "tr" ? "Yaş" : "Age"),
    gender: safeTranslate(t, "demographicsReport.sections.gender", locale === "tr" ? "Cinsiyet" : "Gender"),
    jobs: safeTranslate(t, "demographicsReport.sections.jobs", locale === "tr" ? "Meslek" : "Job"),
    languages: safeTranslate(t, "demographicsReport.sections.languages", locale === "tr" ? "Dil" : "Language"),
    projects: safeTranslate(t, "demographicsReport.sections.projects", locale === "tr" ? "Proje" : "Project"),
    types: safeTranslate(t, "demographicsReport.sections.types", locale === "tr" ? "Müşteri Tipi" : "Customer Type"),
    sources: safeTranslate(t, "demographicsReport.sections.sources", locale === "tr" ? "Kaynak" : "Source"),
  };

  const total = report?.totalCustomers || 0;
  const activeRows = report?.[activeSection] || [];
  const maxCount = Math.max(1, ...activeRows.map((row) => row.count));
  const weakestFields = (report?.coverage || []).slice(0, 4);
  const strongestFields = [...(report?.coverage || [])]
    .sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label))
    .slice(0, 4);

  function exportCsv() {
    if (!report) return;

    const rows = [
      ["Section", "Label", "Count", "Percent"],
      ...Object.entries({
        ageGroups: report.ageGroups,
        gender: report.gender,
        jobs: report.jobs,
        languages: report.languages,
        projects: report.projects,
        types: report.types,
        sources: report.sources,
        countries: report.countries,
        nationalities: report.nationalities,
      }).flatMap(([section, items]) =>
        items.map((row) => [section, row.label, row.count, `${row.percent}%`]),
      ),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-demographics-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`
        .demographics-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .demographics-title {
          display: grid;
          gap: 4px;
          min-width: min(100%, 380px);
        }

        .demographics-title h1 {
          font-size: 28px;
          line-height: 1.12;
          letter-spacing: 0;
        }

        .demographics-actions,
        .demographics-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .demographics-link-button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stroke);
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 800;
          text-decoration: none;
        }

        .demographics-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .demographics-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr);
          gap: 14px;
          align-items: start;
        }

        .demographics-panel {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          padding: 14px;
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .demographics-tab {
          height: 34px;
          border-radius: 8px;
          font-size: 13px;
          padding: 0 12px;
          background: var(--surface-2);
        }

        .demographics-tab[aria-pressed="true"] {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
        }

        .demographics-bar-list {
          display: grid;
          gap: 10px;
        }

        .demographics-bar-row {
          display: grid;
          gap: 7px;
          padding: 10px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          background: var(--surface-2);
        }

        .demographics-quality-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .demographics-table-wrap {
          overflow: auto;
        }

        @media (max-width: 1120px) {
          .demographics-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .demographics-title h1 {
            font-size: 24px;
          }

          .demographics-kpis,
          .demographics-quality-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .demographics-actions,
          .demographics-actions > *,
          .demographics-tabs,
          .demographics-tabs > * {
            width: 100%;
          }
        }
      `}</style>

      <div className="demographics-toolbar">
        <div className="demographics-title">
          <div style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 800 }}>
            {safeTranslate(
              t,
              "demographicsReport.label",
              locale === "tr" ? "Müşteri Raporları" : "Customer Reports",
            )}
          </div>
          <h1>
            {safeTranslate(
              t,
              "demographicsReport.title",
              locale === "tr" ? "Demografik Analiz" : "Demographic Analytics",
            )}
          </h1>
          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "demographicsReport.subtitle",
              locale === "tr"
                ? "Yaş, cinsiyet, meslek, dil ve profil doluluk raporu"
                : "Age, gender, job, language and profile-completion reporting",
            )}
          </div>
        </div>

        <div className="demographics-actions">
          <Link href="/customers" className="demographics-link-button">
            {safeTranslate(
              t,
              "nationalityReport.backToCustomers",
              locale === "tr" ? "Müşterilere Dön" : "Back to Customers",
            )}
          </Link>
          <button onClick={exportCsv} disabled={!report}>
            {safeTranslate(t, "nationalityReport.exportCsv", locale === "tr" ? "CSV Al" : "Export CSV")}
          </button>
          <button onClick={load} disabled={loading}>
            {loading
              ? t("common.loading")
              : safeTranslate(t, "common.refresh", locale === "tr" ? "Yenile" : "Refresh")}
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "rgba(220,38,38,.35)", color: "var(--danger)" }}>
          {error}
        </div>
      ) : null}

      <div className="demographics-kpis">
        <Stat
          label={safeTranslate(t, "nationalityReport.totalCustomers", locale === "tr" ? "Toplam müşteri" : "Total customers")}
          value={numberText.format(total)}
        />
        <Stat
          label={safeTranslate(t, "demographicsReport.averageAge", locale === "tr" ? "Ortalama yaş" : "Average age")}
          value={report?.overview.averageAge === null || report?.overview.averageAge === undefined ? "-" : String(report.overview.averageAge)}
          detail={`${numberText.format(report?.overview.withAge || 0)} ${locale === "tr" ? "müşteride yaş var" : "customers with age"}`}
        />
        <Stat
          label={safeTranslate(t, "demographicsReport.profileCompletion", locale === "tr" ? "Profil doluluğu" : "Profile completion")}
          value={`${report?.overview.completion || 0}%`}
          tone={(report?.overview.completion || 0) < 50 ? "warning" : "success"}
        />
        <Stat
          label={safeTranslate(t, "demographicsReport.manualFields", locale === "tr" ? "Manuel alanlar" : "Manual fields")}
          value={numberText.format(report?.coverage.length || 0)}
          detail={locale === "tr" ? "takip ediliyor" : "tracked fields"}
        />
      </div>

      <div className="demographics-grid">
        <section className="demographics-panel">
          <div className="demographics-toolbar">
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {safeTranslate(t, "demographicsReport.distribution", locale === "tr" ? "Dağılım" : "Distribution")}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {sectionLabels[activeSection]}
              </div>
            </div>

            <div className="demographics-tabs" role="group" aria-label="Demographic section">
              {(Object.keys(sectionLabels) as SectionKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="demographics-tab"
                  aria-pressed={activeSection === key}
                  onClick={() => setActiveSection(key)}
                >
                  {sectionLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="demographics-bar-list">
            {activeRows.length ? (
              activeRows.map((row) => (
                <BarRow
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  percent={row.percent}
                  width={(row.count / maxCount) * 100}
                  numberText={numberText}
                />
              ))
            ) : (
              <EmptyState
                title={safeTranslate(t, "demographicsReport.noData", locale === "tr" ? "Henüz veri yok" : "No data yet")}
                text={safeTranslate(
                  t,
                  "demographicsReport.noDataText",
                  locale === "tr"
                    ? "Müşteri detaylarından bu alanları doldurdukça rapor oluşacak."
                    : "This report will populate as these fields are filled from customer details.",
                )}
              />
            )}
          </div>
        </section>

        <section className="demographics-panel">
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {safeTranslate(t, "demographicsReport.dataQuality", locale === "tr" ? "Veri Kalitesi" : "Data Quality")}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {safeTranslate(
                t,
                "demographicsReport.dataQualityHint",
                locale === "tr" ? "Eksik alanları önceliklendirir" : "Prioritizes missing fields",
              )}
            </div>
          </div>

          <div className="demographics-quality-grid">
            {weakestFields.map((row) => (
              <QualityCard key={row.field} row={row} numberText={numberText} />
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--stroke)", paddingTop: 12, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>
              {safeTranslate(t, "demographicsReport.bestFields", locale === "tr" ? "En dolu alanlar" : "Best-filled fields")}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {strongestFields.map((row) => (
                <CompactCoverage key={row.field} row={row} numberText={numberText} />
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="demographics-panel">
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            {safeTranslate(t, "demographicsReport.allBreakdowns", locale === "tr" ? "Tüm Kırılımlar" : "All Breakdowns")}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {safeTranslate(
              t,
              "demographicsReport.allBreakdownsHint",
              locale === "tr" ? "Manuel veri girişi ilerledikçe bu tablo zenginleşir" : "This table grows as manual customer data improves",
            )}
          </div>
        </div>

        <div className="demographics-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{safeTranslate(t, "demographicsReport.section", locale === "tr" ? "Bölüm" : "Section")}</th>
                <th>{safeTranslate(t, "common.details", locale === "tr" ? "Detay" : "Details")}</th>
                <th>{safeTranslate(t, "nationalityReport.totalCustomers", locale === "tr" ? "Müşteri" : "Customers")}</th>
                <th>{safeTranslate(t, "nationalityReport.share", locale === "tr" ? "Pay" : "Share")}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(sectionLabels) as SectionKey[]).flatMap((section) =>
                (report?.[section] || []).slice(0, 12).map((row) => (
                  <tr key={`${section}-${row.label}`}>
                    <td>{sectionLabels[section]}</td>
                    <td style={{ fontWeight: 850 }}>{row.label}</td>
                    <td>{numberText.format(row.count)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning)"
        : "var(--text-primary)";

  return (
    <div className="card" style={{ display: "grid", gap: 7, minHeight: 94 }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 850 }}>
        {label}
      </div>
      <div style={{ fontSize: 25, fontWeight: 950, color, lineHeight: 1.05 }}>
        {value}
      </div>
      {detail ? <div className="muted" style={{ fontSize: 12 }}>{detail}</div> : null}
    </div>
  );
}

function BarRow({
  label,
  count,
  percent,
  width,
  numberText,
}: {
  label: string;
  count: number;
  percent: number;
  width: number;
  numberText: Intl.NumberFormat;
}) {
  return (
    <div className="demographics-bar-row">
      <div className="flex-between" style={{ gap: 10 }}>
        <div style={{ fontWeight: 900, minWidth: 0 }}>{label}</div>
        <div style={{ fontWeight: 950 }}>{numberText.format(count)}</div>
      </div>
      <div style={{ height: 9, borderRadius: 999, background: "rgba(148,163,184,.26)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(3, width)}%`, height: "100%", background: "var(--info)" }} />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>{percent}%</div>
    </div>
  );
}

function QualityCard({
  row,
  numberText,
}: {
  row: CoverageRow;
  numberText: Intl.NumberFormat;
}) {
  return (
    <div className="card" style={{ display: "grid", gap: 8, boxShadow: "none", minHeight: 118 }}>
      <div className="flex-between" style={{ gap: 8 }}>
        <div style={{ fontWeight: 900 }}>{row.label}</div>
        <span className={row.percent < 50 ? "badge warning" : "badge success"}>{row.percent}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,.26)", overflow: "hidden" }}>
        <div
          style={{
            width: `${row.percent}%`,
            height: "100%",
            background: row.percent < 50 ? "var(--warning)" : "var(--success)",
          }}
        />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        {numberText.format(row.filled)} filled · {numberText.format(row.missing)} missing
      </div>
    </div>
  );
}

function CompactCoverage({
  row,
  numberText,
}: {
  row: CoverageRow;
  numberText: Intl.NumberFormat;
}) {
  return (
    <div className="flex-between" style={{ gap: 10 }}>
      <div>
        <div style={{ fontWeight: 850 }}>{row.label}</div>
        <div className="muted" style={{ fontSize: 12 }}>{numberText.format(row.filled)} filled</div>
      </div>
      <div style={{ fontWeight: 950 }}>{row.percent}%</div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        minHeight: 180,
        border: "1px dashed var(--stroke)",
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 18,
        background: "var(--surface-2)",
      }}
    >
      <div style={{ display: "grid", gap: 6, maxWidth: 360 }}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13 }}>{text}</div>
      </div>
    </div>
  );
}
