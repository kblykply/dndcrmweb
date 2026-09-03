"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { projectLabel, type ProjectType } from "@/lib/projects";

type WheelSpin = {
  id: string;
  spunById?: string | null;
  spunByName: string;
  spunByRole: string;
  saleType: "DIRECT" | "AGENCY";
  agencyId?: string | null;
  agencyName?: string | null;
  customerId?: string | null;
  customerName: string;
  project: ProjectType;
  block?: string | null;
  unitNumber: string;
  prizeId: string;
  prizeNameTr: string;
  prizeNameEn: string;
  createdAt: string;
};

type ManagementOptions = {
  salesUsers: Array<{ id: string; name: string; role: string }>;
  agencies: Array<{ id: string; name: string }>;
  projects: Array<{ id: ProjectType; name: string }>;
  prizes: Array<{ id: string; nameTr: string; nameEn: string }>;
};

type SpinResponse = {
  items: WheelSpin[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    total: number;
    direct: number;
    agency: number;
    byPrize: Array<{
      prizeId: string;
      prizeNameTr: string;
      prizeNameEn: string;
      count: number;
    }>;
    byProject: Array<{ project: ProjectType; count: number }>;
  };
};

type Filters = {
  q: string;
  spunById: string;
  agencyId: string;
  saleType: string;
  project: string;
  prizeId: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  spunById: "",
  agencyId: "",
  saleType: "",
  project: "",
  prizeId: "",
  dateFrom: "",
  dateTo: "",
};

function readableError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : String(error || "");
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.message) {
      return Array.isArray(parsed.message)
        ? parsed.message.join(" ")
        : String(parsed.message);
    }
  } catch {
    // Plain API errors are already readable.
  }
  return raw || fallback;
}

export default function AgentWheelManagementPage() {
  const { locale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [options, setOptions] = useState<ManagementOptions | null>(null);
  const [data, setData] = useState<SpinResponse | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = me?.role as string | undefined;
  const isPreview = role === "PREVIEW";
  const canManage = role === "ADMIN" || role === "MANAGER" || isPreview;
  const topPrize = useMemo(
    () => data?.stats.byPrize.slice().sort((a, b) => b.count - a.count)[0] || null,
    [data],
  );

  useEffect(() => {
    const currentUser = getUser();
    setMe(currentUser);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !role || !canManage) return;
    if (isPreview) {
      setOptions({ salesUsers: [], agencies: [], projects: [], prizes: [] });
      setData({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
        stats: { total: 0, direct: 0, agency: 0, byPrize: [], byProject: [] },
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    void authedFetch("/agent-wheel/management-options")
      .then((response) => {
        if (!cancelled) setOptions(response as ManagementOptions);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            readableError(
              loadError,
              locale === "tr" ? "Filtreler yüklenemedi." : "Filters could not be loaded.",
            ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canManage, isPreview, locale, mounted, role]);

  useEffect(() => {
    if (!mounted || !role || !canManage || isPreview) return;

    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });

    let cancelled = false;
    setLoading(true);
    setError("");
    void authedFetch(`/agent-wheel/spins?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setData(response as SpinResponse);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            readableError(
              loadError,
              locale === "tr" ? "Çekiliş kayıtları yüklenemedi." : "Spin records could not be loaded.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, canManage, isPreview, locale, mounted, page, role]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (mounted && me && !canManage) {
    return (
      <main className="wheel-admin-page">
        <section className="wheel-admin-empty">
          <h1>{locale === "tr" ? "Yetki yok" : "No access"}</h1>
          <p>
            {locale === "tr"
              ? "Çekiliş yönetimini yalnızca admin ve manager rolleri görebilir."
              : "Only admin and manager roles can view wheel management."}
          </p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="wheel-admin-page">
      <header className="wheel-admin-header">
        <div>
          <span className="eyebrow">{locale === "tr" ? "SATIŞ ÖDÜLLERİ" : "SALES REWARDS"}</span>
          <h1>{locale === "tr" ? "Çark Yönetimi" : "Wheel Management"}</h1>
          <p>
            {locale === "tr"
              ? "Satışa bağlı tüm çekiliş sonuçları"
              : "Every wheel result linked to its sale"}
          </p>
        </div>
        <Link href="/agent-wheel" target="_blank" rel="noopener noreferrer">
          {locale === "tr" ? "Çarkı aç" : "Open wheel"}
        </Link>
      </header>

      {isPreview ? (
        <div className="preview-note">
          {locale === "tr"
            ? "Önizleme hesabında gerçek çekiliş verileri gizlidir."
            : "Live wheel records are hidden for preview accounts."}
        </div>
      ) : null}

      <section className="wheel-admin-stats" aria-label={locale === "tr" ? "Özet" : "Summary"}>
        <article>
          <span>{locale === "tr" ? "Toplam çekiliş" : "Total spins"}</span>
          <strong>{data?.stats.total || 0}</strong>
          <small>{locale === "tr" ? "Tekil satış kaydı" : "Unique sale records"}</small>
        </article>
        <article className="direct">
          <span>{locale === "tr" ? "Direkt satış" : "Direct sales"}</span>
          <strong>{data?.stats.direct || 0}</strong>
          <small>{locale === "tr" ? "Acente olmadan" : "Without an agency"}</small>
        </article>
        <article className="agency">
          <span>{locale === "tr" ? "Acente satışı" : "Agency sales"}</span>
          <strong>{data?.stats.agency || 0}</strong>
          <small>{locale === "tr" ? "Acente üzerinden" : "Through an agency"}</small>
        </article>
        <article className="prize">
          <span>{locale === "tr" ? "En sık çıkan" : "Most frequent"}</span>
          <strong className="text-value">
            {topPrize
              ? locale === "tr"
                ? topPrize.prizeNameTr
                : topPrize.prizeNameEn
              : "-"}
          </strong>
          <small>
            {topPrize
              ? `${topPrize.count} ${locale === "tr" ? "sonuç" : "results"}`
              : locale === "tr"
                ? "Henüz sonuç yok"
                : "No results yet"}
          </small>
        </article>
      </section>

      <form className="wheel-admin-filters" onSubmit={applyFilters}>
        <label className="search-field">
          <span>{locale === "tr" ? "Arama" : "Search"}</span>
          <input
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder={locale === "tr" ? "Müşteri, acente, unit veya ödül" : "Customer, agency, unit or prize"}
          />
        </label>
        <label>
          <span>{locale === "tr" ? "Satış temsilcisi" : "Sales representative"}</span>
          <select value={filters.spunById} onChange={(event) => updateFilter("spunById", event.target.value)}>
            <option value="">{locale === "tr" ? "Tümü" : "All"}</option>
            {(options?.salesUsers || []).map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{locale === "tr" ? "Satış tipi" : "Sale type"}</span>
          <select value={filters.saleType} onChange={(event) => updateFilter("saleType", event.target.value)}>
            <option value="">{locale === "tr" ? "Tümü" : "All"}</option>
            <option value="DIRECT">{locale === "tr" ? "Direkt satış" : "Direct sale"}</option>
            <option value="AGENCY">{locale === "tr" ? "Acente satışı" : "Agency sale"}</option>
          </select>
        </label>
        <label>
          <span>{locale === "tr" ? "Acente" : "Agency"}</span>
          <select value={filters.agencyId} onChange={(event) => updateFilter("agencyId", event.target.value)}>
            <option value="">{locale === "tr" ? "Tümü" : "All"}</option>
            {(options?.agencies || []).map((agency) => (
              <option key={agency.id} value={agency.id}>{agency.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{locale === "tr" ? "Proje" : "Project"}</span>
          <select value={filters.project} onChange={(event) => updateFilter("project", event.target.value)}>
            <option value="">{locale === "tr" ? "Tümü" : "All"}</option>
            {(options?.projects || []).map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{locale === "tr" ? "Ödül" : "Prize"}</span>
          <select value={filters.prizeId} onChange={(event) => updateFilter("prizeId", event.target.value)}>
            <option value="">{locale === "tr" ? "Tümü" : "All"}</option>
            {(options?.prizes || []).map((prize) => (
              <option key={prize.id} value={prize.id}>
                {locale === "tr" ? prize.nameTr : prize.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{locale === "tr" ? "Başlangıç" : "From"}</span>
          <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          <span>{locale === "tr" ? "Bitiş" : "To"}</span>
          <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </label>
        <div className="filter-actions">
          <button type="submit">{locale === "tr" ? "Uygula" : "Apply"}</button>
          <button type="button" className="secondary" onClick={resetFilters}>
            {locale === "tr" ? "Sıfırla" : "Reset"}
          </button>
        </div>
      </form>

      {error ? <div className="wheel-admin-error">{error}</div> : null}

      <section className="wheel-admin-records">
        <div className="records-heading">
          <div>
            <h2>{locale === "tr" ? "Çekiliş geçmişi" : "Spin history"}</h2>
            <p>{data?.total || 0} {locale === "tr" ? "kayıt" : "records"}</p>
          </div>
          {loading ? <span className="loading-state">{locale === "tr" ? "Yükleniyor..." : "Loading..."}</span> : null}
        </div>

        <div className="records-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{locale === "tr" ? "Tarih" : "Date"}</th>
                <th>{locale === "tr" ? "Satış temsilcisi" : "Sales representative"}</th>
                <th>{locale === "tr" ? "Acente / Kanal" : "Agency / Channel"}</th>
                <th>{locale === "tr" ? "Müşteri" : "Customer"}</th>
                <th>{locale === "tr" ? "Satış" : "Sale"}</th>
                <th>{locale === "tr" ? "Ödül" : "Prize"}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && (data?.items || []).length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">{locale === "tr" ? "Bu filtrelerde çekiliş kaydı yok." : "No spin records match these filters."}</td></tr>
              ) : (
                (data?.items || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium" }).format(new Date(row.createdAt))}</strong>
                      <span>{new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", { timeStyle: "short" }).format(new Date(row.createdAt))}</span>
                    </td>
                    <td><strong>{row.spunByName}</strong><span>{row.spunByRole}</span></td>
                    <td>
                      <span className={`channel-badge ${row.saleType.toLowerCase()}`}>
                        {row.saleType === "DIRECT" ? (locale === "tr" ? "Direkt satış" : "Direct sale") : (locale === "tr" ? "Acente" : "Agency")}
                      </span>
                      <strong>{row.agencyName || "DND Cyprus"}</strong>
                    </td>
                    <td><strong>{row.customerName}</strong></td>
                    <td>
                      <strong>{projectLabel(row.project)}</strong>
                      <span>{row.block ? `${locale === "tr" ? "Blok" : "Block"} ${row.block} · ` : ""}{row.unitNumber}</span>
                    </td>
                    <td><span className="prize-badge">{locale === "tr" ? row.prizeNameTr : row.prizeNameEn}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            {locale === "tr" ? "Önceki" : "Previous"}
          </button>
          <span>{page} / {data?.totalPages || 1}</span>
          <button type="button" disabled={page >= (data?.totalPages || 1) || loading} onClick={() => setPage((current) => current + 1)}>
            {locale === "tr" ? "Sonraki" : "Next"}
          </button>
        </div>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .wheel-admin-page {
    width: 100%;
    min-width: 0;
    display: grid;
    gap: 16px;
  }

  .wheel-admin-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .eyebrow {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 900;
  }

  .wheel-admin-header h1 {
    margin: 5px 0 4px;
    font-size: 30px;
    line-height: 1.1;
  }

  .wheel-admin-header p,
  .records-heading p {
    margin: 0;
    color: var(--text-secondary);
  }

  .wheel-admin-header a {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--primary);
    color: var(--primary-foreground);
    padding: 0 16px;
    font-weight: 900;
    text-decoration: none;
  }

  .preview-note,
  .wheel-admin-error {
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text-secondary);
    padding: 13px 15px;
  }

  .wheel-admin-error {
    border-color: color-mix(in srgb, var(--danger) 38%, var(--stroke));
    color: var(--danger);
  }

  .wheel-admin-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .wheel-admin-stats article {
    min-height: 112px;
    display: grid;
    align-content: space-between;
    gap: 4px;
    border: 1px solid var(--stroke);
    border-left: 4px solid #64748b;
    border-radius: 8px;
    background: var(--surface);
    padding: 14px;
    box-shadow: var(--shadow-sm);
  }

  .wheel-admin-stats article.direct { border-left-color: #2563eb; }
  .wheel-admin-stats article.agency { border-left-color: #16a34a; }
  .wheel-admin-stats article.prize { border-left-color: #d89b16; }

  .wheel-admin-stats span,
  .wheel-admin-filters label > span {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .wheel-admin-stats strong {
    color: var(--text-primary);
    font-size: 30px;
    line-height: 1;
  }

  .wheel-admin-stats .text-value {
    overflow: hidden;
    font-size: 18px;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wheel-admin-stats small { color: var(--text-muted); font-weight: 750; }

  .wheel-admin-filters {
    display: grid;
    grid-template-columns: minmax(230px, 1.5fr) repeat(5, minmax(130px, 0.75fr));
    gap: 10px;
    align-items: end;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface);
    padding: 12px;
    box-shadow: var(--shadow-sm);
  }

  .wheel-admin-filters label { min-width: 0; display: grid; gap: 5px; }

  .wheel-admin-filters input,
  .wheel-admin-filters select {
    width: 100%;
    min-width: 0;
    height: 40px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text-primary);
    padding: 0 11px;
    font: inherit;
  }

  .filter-actions { display: flex; gap: 8px; align-items: center; }
  .filter-actions button,
  .pagination button {
    min-height: 40px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--primary);
    color: var(--primary-foreground);
    padding: 0 14px;
    font-weight: 900;
    cursor: pointer;
  }
  .filter-actions .secondary,
  .pagination button { background: var(--surface-2); color: var(--text-primary); }
  .pagination button:disabled { cursor: not-allowed; opacity: 0.45; }

  .wheel-admin-records {
    min-width: 0;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .records-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 15px;
    border-bottom: 1px solid var(--stroke);
  }

  .records-heading h2 { margin: 0 0 3px; font-size: 18px; }
  .loading-state { color: var(--text-secondary); font-weight: 800; }
  .records-table-wrap { width: 100%; overflow-x: auto; }
  table { width: 100%; min-width: 980px; border-collapse: collapse; }
  th, td { padding: 12px 14px; border-bottom: 1px solid var(--stroke); text-align: left; vertical-align: middle; }
  th { background: var(--surface-2); color: var(--text-secondary); font-size: 10px; font-weight: 900; text-transform: uppercase; }
  td { color: var(--text-primary); font-size: 13px; }
  td strong, td span { display: block; }
  td span { margin-top: 3px; color: var(--text-secondary); }
  .channel-badge, .prize-badge {
    width: fit-content;
    margin: 0 0 5px;
    border: 1px solid var(--stroke);
    border-radius: 999px;
    background: var(--surface-2);
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 900;
  }
  .channel-badge.direct { color: #3b82f6; }
  .channel-badge.agency { color: #22c55e; }
  .prize-badge { color: #d89b16; }
  .empty-cell { height: 160px; text-align: center; color: var(--text-secondary); }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 15px;
  }
  .pagination span { color: var(--text-secondary); font-weight: 850; }

  .wheel-admin-empty {
    min-height: 55vh;
    display: grid;
    place-content: center;
    text-align: center;
  }

  @media (max-width: 1350px) {
    .wheel-admin-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .search-field { grid-column: span 2; }
  }

  @media (max-width: 850px) {
    .wheel-admin-header { display: grid; }
    .wheel-admin-header a { width: 100%; }
    .wheel-admin-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wheel-admin-filters { grid-template-columns: 1fr; }
    .search-field { grid-column: auto; }
    .filter-actions, .filter-actions button { width: 100%; }
    .filter-actions button { flex: 1; }
  }
`;
