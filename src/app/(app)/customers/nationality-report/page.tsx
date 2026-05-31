"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type CountryRow = {
  country: string;
  nationality: string;
  iso2: string;
  lat: number;
  lon: number;
  count: number;
  existing: number;
  potential: number;
  percent: number;
  rawCodes: string[];
};

type NationalityReport = {
  totalCustomers: number;
  mappedCustomers: number;
  unmappedCustomers: number;
  countries: CountryRow[];
  topCountries: CountryRow[];
  unmapped: Array<{ value: string; count: number }>;
};

type ViewMode = "ALL" | "EXISTING" | "POTENTIAL";

const OSM_ZOOM = 2;
const OSM_TILE_COUNT = 4;

function safeTranslate(
  t: (path: string) => string,
  path: string,
  fallback: string,
) {
  const translated = t(path);
  return translated === path ? fallback : translated;
}

function mercatorPoint(lat: number, lon: number) {
  const limitedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);
  const sinLat = Math.sin((limitedLat * Math.PI) / 180);

  return {
    x: ((lon + 180) / 360) * 100,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * 100,
  };
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function csvCell(value: string | number) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function CustomerNationalityReportPage() {
  const { t, locale } = useLanguage();
  const [report, setReport] = useState<NationalityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [mode, setMode] = useState<ViewMode>("ALL");
  const [query, setQuery] = useState("");

  const numberText = useMemo(
    () => new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US"),
    [locale],
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await authedFetch("/customers/reports/nationalities");
      setReport(data);
      setSelectedCountry(data?.countries?.[0]?.country || "");
    } catch (err: any) {
      setError(err?.message || "Could not load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const modeLabel = {
    ALL: safeTranslate(t, "nationalityReport.allCustomers", locale === "tr" ? "Tümü" : "All"),
    EXISTING: safeTranslate(t, "customerTypes.EXISTING", locale === "tr" ? "Mevcut" : "Existing"),
    POTENTIAL: safeTranslate(t, "customerTypes.POTENTIAL", locale === "tr" ? "Potansiyel" : "Potential"),
  };

  const countries = report?.countries || [];
  const valueFor = (row: CountryRow) =>
    mode === "EXISTING" ? row.existing : mode === "POTENTIAL" ? row.potential : row.count;

  const rankedRows = useMemo(
    () =>
      countries
        .map((row) => ({ ...row, activeCount: valueFor(row) }))
        .filter((row) => row.activeCount > 0)
        .sort((a, b) => b.activeCount - a.activeCount || a.country.localeCompare(b.country)),
    [countries, mode],
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US");
    if (!q) return rankedRows;

    return rankedRows.filter((row) =>
      `${row.country} ${row.nationality} ${row.iso2} ${row.rawCodes.join(" ")}`
        .toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")
        .includes(q),
    );
  }, [rankedRows, query, locale]);

  const modeTotal = rankedRows.reduce((sum, row) => sum + row.activeCount, 0);
  const maxCount = Math.max(1, ...rankedRows.map((row) => row.activeCount));
  const selected =
    rankedRows.find((row) => row.country === selectedCountry) || rankedRows[0] || null;
  const topCountry = rankedRows[0] || null;
  const existingTotal = countries.reduce((sum, row) => sum + row.existing, 0);
  const potentialTotal = countries.reduce((sum, row) => sum + row.potential, 0);

  function exportCsv() {
    const rows = [
      ["Country", "Nationality", "Customers", "Existing", "Potential", "Share", "Raw Codes"],
      ...rankedRows.map((row) => [
        row.country,
        row.nationality,
        row.count,
        row.existing,
        row.potential,
        `${pct(row.activeCount, modeTotal)}%`,
        row.rawCodes.join(" | "),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-nationality-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const pageTitle = safeTranslate(
    t,
    "nationalityReport.title",
    locale === "tr" ? "Uyruk ve Ülke Haritası" : "Nationality & Country Map",
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`
        .nationality-shell {
          display: grid;
          gap: 14px;
        }

        .nationality-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .nationality-title {
          display: grid;
          gap: 4px;
          min-width: min(100%, 360px);
        }

        .nationality-title h1 {
          font-size: 28px;
          line-height: 1.12;
          letter-spacing: 0;
        }

        .nationality-actions,
        .nationality-segments {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .nationality-link-button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stroke);
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 800;
          text-decoration: none;
        }

        .nationality-segment {
          height: 34px;
          border-radius: 8px;
          font-size: 13px;
          padding: 0 12px;
          background: var(--surface-2);
        }

        .nationality-segment[aria-pressed="true"] {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: transparent;
        }

        .nationality-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .nationality-main {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(320px, .75fr);
          gap: 14px;
          align-items: start;
        }

        .nationality-panel {
          background: var(--surface);
          border: 1px solid var(--stroke);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          padding: 14px;
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .nationality-map {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          min-height: 560px;
          background: #d7e4ee;
          isolation: isolate;
        }

        .nationality-map::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255,255,255,.06), rgba(15,23,42,.04)),
            radial-gradient(circle at 50% 45%, transparent 0, transparent 42%, rgba(15,23,42,.08) 100%);
          z-index: 2;
        }

        .nationality-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          color: #fff;
          box-shadow: 0 12px 24px rgba(15, 23, 42, .28);
          cursor: pointer;
          line-height: 1;
          padding: 0;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 950;
        }

        .nationality-marker[aria-pressed="true"] {
          z-index: 6;
        }

        .nationality-selected {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          border-top: 1px solid var(--stroke);
          padding-top: 12px;
        }

        .nationality-rank-list {
          display: grid;
          gap: 8px;
          max-height: 674px;
          overflow: auto;
          padding-right: 2px;
        }

        .nationality-rank-button {
          height: auto;
          min-height: 78px;
          display: grid;
          gap: 8px;
          text-align: left;
          padding: 10px;
          border-radius: 8px;
          color: var(--text-primary);
          background: var(--surface-2);
        }

        .nationality-table-wrap {
          overflow: auto;
        }

        .nationality-review {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 1180px) {
          .nationality-main {
            grid-template-columns: 1fr;
          }

          .nationality-map {
            min-height: 480px;
          }
        }

        @media (max-width: 760px) {
          .nationality-title h1 {
            font-size: 24px;
          }

          .nationality-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nationality-actions,
          .nationality-actions > *,
          .nationality-segments,
          .nationality-segments > * {
            width: 100%;
          }

          .nationality-map {
            min-height: 360px;
          }

          .nationality-selected {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="nationality-toolbar">
        <div className="nationality-title">
          <div style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 800 }}>
            {safeTranslate(
              t,
              "nationalityReport.label",
              locale === "tr" ? "Müşteri Raporları" : "Customer Reports",
            )}
          </div>
          <h1>{pageTitle}</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            {safeTranslate(
              t,
              "nationalityReport.subtitle",
              locale === "tr"
                ? "Müşterilerin gerçek ülke ve uyruk dağılımı"
                : "Real country and nationality distribution for customers",
            )}
          </div>
        </div>

        <div className="nationality-actions">
          <Link href="/customers" className="nationality-link-button">
            {safeTranslate(
              t,
              "nationalityReport.backToCustomers",
              locale === "tr" ? "Müşterilere Dön" : "Back to Customers",
            )}
          </Link>
          <button onClick={exportCsv} disabled={!rankedRows.length}>
            {safeTranslate(t, "nationalityReport.exportCsv", locale === "tr" ? "CSV Al" : "Export CSV")}
          </button>
          <button onClick={load} disabled={loading}>
            {loading
              ? t("common.loading")
              : safeTranslate(t, "common.refresh", locale === "tr" ? "Yenile" : "Refresh")}
          </button>
        </div>
      </div>

      <div className="nationality-toolbar">
        <div className="nationality-segments" role="group" aria-label="Report mode">
          {(["ALL", "EXISTING", "POTENTIAL"] as ViewMode[]).map((option) => (
            <button
              key={option}
              type="button"
              className="nationality-segment"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
            >
              {modeLabel[option]}
            </button>
          ))}
        </div>

        <div style={{ width: "min(100%, 320px)" }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={safeTranslate(
              t,
              "nationalityReport.searchPlaceholder",
              locale === "tr" ? "Ülke veya uyruk ara" : "Search country or nationality",
            )}
            aria-label={safeTranslate(
              t,
              "nationalityReport.searchPlaceholder",
              locale === "tr" ? "Ülke veya uyruk ara" : "Search country or nationality",
            )}
          />
        </div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "rgba(220,38,38,.35)", color: "var(--danger)" }}>
          {error}
        </div>
      ) : null}

      <div className="nationality-kpis">
        <Stat
          label={safeTranslate(
            t,
            "nationalityReport.totalCustomers",
            locale === "tr" ? "Toplam müşteri" : "Total customers",
          )}
          value={numberText.format(report?.totalCustomers || 0)}
        />
        <Stat
          label={modeLabel[mode]}
          value={numberText.format(modeTotal)}
          detail={
            mode === "ALL"
              ? `${numberText.format(existingTotal)} ${modeLabel.EXISTING.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")} / ${numberText.format(potentialTotal)} ${modeLabel.POTENTIAL.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")}`
              : `${pct(modeTotal, report?.mappedCustomers || 0)}%`
          }
        />
        <Stat
          label={safeTranslate(
            t,
            "nationalityReport.countries",
            locale === "tr" ? "Ülke sayısı" : "Countries",
          )}
          value={numberText.format(rankedRows.length)}
        />
        <Stat
          label={safeTranslate(
            t,
            "nationalityReport.needsReview",
            locale === "tr" ? "Kontrol gereken" : "Needs review",
          )}
          value={numberText.format(report?.unmappedCustomers || 0)}
          tone={(report?.unmappedCustomers || 0) > 0 ? "warning" : "success"}
        />
      </div>

      <div className="nationality-main">
        <section className="nationality-panel">
          <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {safeTranslate(
                  t,
                  "nationalityReport.mapTitle",
                  locale === "tr" ? "Müşteri Haritası" : "Customer Map",
                )}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {topCountry
                  ? `${topCountry.country} · ${numberText.format(topCountry.activeCount)} · ${pct(topCountry.activeCount, modeTotal)}%`
                  : "-"}
              </div>
            </div>

            <span className={(report?.unmappedCustomers || 0) > 0 ? "badge warning" : "badge success"}>
              {report?.unmappedCustomers
                ? `${numberText.format(report.unmappedCustomers)} ${safeTranslate(
                    t,
                    "nationalityReport.reviewShort",
                    locale === "tr" ? "kontrol" : "review",
                  )}`
                : safeTranslate(t, "nationalityReport.cleanData", locale === "tr" ? "Temiz veri" : "Clean data")}
            </span>
          </div>

          <div
            className="nationality-map"
            aria-label={safeTranslate(
              t,
              "nationalityReport.mapTitle",
              locale === "tr" ? "Müşteri Haritası" : "Customer Map",
            )}
          >
            {Array.from({ length: OSM_TILE_COUNT }).map((_, y) =>
              Array.from({ length: OSM_TILE_COUNT }).map((__, x) => (
                <img
                  key={`${x}-${y}`}
                  src={`https://tile.openstreetmap.org/${OSM_ZOOM}/${x}/${y}.png`}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: `${(x / OSM_TILE_COUNT) * 100}%`,
                    top: `${(y / OSM_TILE_COUNT) * 100}%`,
                    width: `${100 / OSM_TILE_COUNT}%`,
                    height: `${100 / OSM_TILE_COUNT}%`,
                    objectFit: "cover",
                    opacity: 0.82,
                    zIndex: 1,
                  }}
                />
              )),
            )}

            {rankedRows.map((row) => {
              const point = mercatorPoint(row.lat, row.lon);
              const size = 18 + Math.sqrt(row.activeCount / maxCount) * 42;
              const active = selected?.country === row.country;

              return (
                <button
                  key={row.country}
                  type="button"
                  className="nationality-marker"
                  aria-pressed={active}
                  title={`${row.country}: ${row.activeCount}`}
                  onClick={() => setSelectedCountry(row.country)}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: size,
                    height: size,
                    border: active
                      ? "3px solid rgba(17,24,39,.95)"
                      : "2px solid rgba(255,255,255,.92)",
                    background: active
                      ? "rgba(22, 163, 74, .9)"
                      : "rgba(37, 99, 235, .78)",
                  }}
                >
                  {row.activeCount}
                </button>
              );
            })}

            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                zIndex: 7,
                color: "#0f172a",
                background: "rgba(255,255,255,.88)",
                border: "1px solid rgba(15,23,42,.16)",
                borderRadius: 6,
                padding: "3px 6px",
                fontSize: 11,
                textDecoration: "none",
              }}
            >
              © OpenStreetMap
            </a>
          </div>

          {selected ? (
            <div className="nationality-selected">
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge info">{selected.iso2}</span>
                  <span style={{ fontSize: 20, fontWeight: 950 }}>{selected.country}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {selected.nationality}
                  {selected.rawCodes.length ? ` · ${selected.rawCodes.join(", ")}` : ""}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(78px, auto))",
                  gap: 8,
                  textAlign: "right",
                }}
              >
                <MiniMetric
                  label={modeLabel[mode]}
                  value={numberText.format(selected.activeCount)}
                />
                <MiniMetric
                  label={safeTranslate(t, "customerTypes.EXISTING", "Existing")}
                  value={numberText.format(selected.existing)}
                />
                <MiniMetric
                  label={safeTranslate(t, "customerTypes.POTENTIAL", "Potential")}
                  value={numberText.format(selected.potential)}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="nationality-panel">
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {safeTranslate(
                t,
                "nationalityReport.distribution",
                locale === "tr" ? "Dağılım" : "Distribution",
              )}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {numberText.format(visibleRows.length)} / {numberText.format(rankedRows.length)}
            </div>
          </div>

          <div className="nationality-rank-list">
            {visibleRows.map((row, index) => {
              const active = selected?.country === row.country;
              const share = pct(row.activeCount, modeTotal);

              return (
                <button
                  key={row.country}
                  type="button"
                  className="nationality-rank-button"
                  onClick={() => setSelectedCountry(row.country)}
                  style={{
                    border: active ? "1px solid var(--primary)" : "1px solid var(--stroke)",
                    background: active ? "var(--surface-3)" : "var(--surface-2)",
                  }}
                >
                  <div className="flex-between" style={{ gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, minWidth: 0, alignItems: "center" }}>
                      <span
                        className="badge"
                        style={{
                          minWidth: 34,
                          justifyContent: "center",
                          paddingInline: 8,
                          borderRadius: 8,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.country}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {row.nationality}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 950 }}>{numberText.format(row.activeCount)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{share}%</div>
                    </div>
                  </div>

                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "rgba(148,163,184,.26)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(2, (row.activeCount / maxCount) * 100)}%`,
                        height: "100%",
                        background: active ? "var(--success)" : "var(--info)",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="nationality-panel">
        <div className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {safeTranslate(
                t,
                "nationalityReport.tableTitle",
                locale === "tr" ? "Ülke Kırılımı" : "Country Breakdown",
              )}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {safeTranslate(
                t,
                "nationalityReport.tableSubtitle",
                locale === "tr" ? "Müşteri tipi ve uyruk bazında özet" : "Summary by customer type and nationality",
              )}
            </div>
          </div>
        </div>

        <div className="nationality-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{safeTranslate(t, "customers.fields.country", locale === "tr" ? "Ülke" : "Country")}</th>
                <th>{safeTranslate(t, "customers.fields.nationality", locale === "tr" ? "Uyruk" : "Nationality")}</th>
                <th>{modeLabel[mode]}</th>
                <th>{safeTranslate(t, "customerTypes.EXISTING", "Existing")}</th>
                <th>{safeTranslate(t, "customerTypes.POTENTIAL", "Potential")}</th>
                <th>{safeTranslate(t, "nationalityReport.share", locale === "tr" ? "Pay" : "Share")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.country}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedCountry(row.country)}
                      style={{
                        height: "auto",
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        fontWeight: 900,
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.country}
                    </button>
                  </td>
                  <td>{row.nationality}</td>
                  <td>{numberText.format(row.activeCount)}</td>
                  <td>{numberText.format(row.existing)}</td>
                  <td>{numberText.format(row.potential)}</td>
                  <td>{pct(row.activeCount, modeTotal)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(report?.unmapped || []).length > 0 ? (
        <section className="nationality-panel">
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {safeTranslate(
                t,
                "nationalityReport.unmappedTitle",
                locale === "tr" ? "Kontrol Edilecek Kodlar" : "Codes To Review",
              )}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {safeTranslate(
                t,
                "nationalityReport.unmappedHint",
                locale === "tr"
                  ? "Bu kodlar otomatik olarak ülkeye çevrilmedi."
                  : "These values were not automatically mapped to a country.",
              )}
            </div>
          </div>
          <div className="nationality-review">
            {report?.unmapped.map((row) => (
              <span key={row.value} className="badge warning">
                {row.value}: {numberText.format(row.count)}
              </span>
            ))}
          </div>
        </section>
      ) : null}
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
  const toneColor =
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
      <div style={{ fontSize: 25, fontWeight: 950, color: toneColor, lineHeight: 1.05 }}>
        {value}
      </div>
      {detail ? <div className="muted" style={{ fontSize: 12 }}>{detail}</div> : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div className="muted" style={{ fontSize: 11, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontWeight: 950 }}>{value}</div>
    </div>
  );
}
