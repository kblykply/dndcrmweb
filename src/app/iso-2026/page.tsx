"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  CircleAlert,
  Download,
  FileText,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Waypoints,
  X,
} from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { PdcaDiagram, ProcessDiagram } from "./_components/IsoDiagrams";
import {
  isoClauseHref,
  type IsoClauseMeta,
  type IsoDocument,
  type IsoProcessStatus,
} from "./_lib/types";
import s from "./iso.module.css";

type ListItem = {
  code: string;
  status: IsoProcessStatus;
  ownerDepartment: string | null;
  checklistTotal: number;
  checklistDone: number;
  documentsTotal: number;
};
type ListResponse = {
  document: IsoDocument;
  clauses: IsoClauseMeta[];
  items: ListItem[];
  totals: {
    checklistTotal: number;
    checklistDone: number;
    documents: number;
    cardsNeedReview: number;
    overdueChecklist: number;
  };
};
const chapters = ["4", "5", "6", "7", "8", "9", "10"];
const roles = ["ADMIN", "MANAGER", "AFTERSALES", "SALES", "PREVIEW"];
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};
const roleSnapshot = () => String(getUser()?.role || "");
const serverRole = () => null;
const fold = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");

export default function Iso2026Page() {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const role = useSyncExternalStore(subscribe, roleSnapshot, serverRole);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState("ALL");
  const [diagram, setDiagram] = useState<"pdca" | "process">("pdca");
  const [downloading, setDownloading] = useState(false);
  const allowed = role !== null && roles.includes(role);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const result = (await authedFetch("/iso-2026", {
        signal,
      })) as ListResponse;
      if (!signal.aborted) setData(result);
    } catch (err) {
      if (!signal.aborted)
        setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [allowed, load, revision]);

  const byCode = useMemo(
    () => new Map(data?.clauses.map((c) => [c.code, c]) || []),
    [data],
  );
  const records = useMemo(
    () => new Map(data?.items.map((item) => [item.code, item]) || []),
    [data],
  );
  const filtered = useMemo(() => {
    const needle = fold(query.trim());
    return (data?.clauses || []).filter((c) => {
      const inChapter =
        chapter === "ALL" ||
        c.code === chapter ||
        c.code.startsWith(`${chapter}.`);
      return (
        inChapter &&
        (!needle ||
          fold(`${c.code} ${c.title} ${c.titleTr || ""}`).includes(needle))
      );
    });
  }, [data, chapter, query]);
  const title = (clause: IsoClauseMeta) =>
    tr && clause.titleTr ? clause.titleTr : clause.title;
  const searching = query.trim().length > 0 || chapter !== "ALL";

  async function downloadSource() {
    setDownloading(true);
    setError("");
    try {
      const blob = (await authedFetch(
        "/iso-2026/source/pdf",
        {},
        "blob",
      )) as Blob;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ISO_9001_2026.pdf";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }

  if (role === null)
    return (
      <div className={s.state} role="status">
        <LoaderCircle className={s.spin} />
        {t("ISO 2026 açılıyor…", "Opening ISO 2026…")}
      </div>
    );
  if (!allowed)
    return (
      <div className={s.state}>
        <ShieldCheck size={32} />
        <h1>ISO 2026</h1>
        <p>
          {t(
            "Bu modülü kullanmak için yetkili şirket hesabınla giriş yapmalısın.",
            "Sign in with an authorized company account to access this module.",
          )}
        </p>
        <Link href="/">{t("Giriş ekranı", "Sign in")}</Link>
      </div>
    );

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>
            <ShieldCheck size={15} />
            {t("KALİTE YÖNETİM SİSTEMİ", "QUALITY MANAGEMENT SYSTEM")}
          </div>
          <h1>
            ISO <span>2026</span>
          </h1>
          <p>
            {t(
              "Standardı keşfet. Süreçleri ilişkilendir. Uygulamayı takip et.",
              "Explore the standard. Connect processes. Track implementation.",
            )}
          </p>
        </div>
        <div className={s.headerActions}>
          <Link href="/quality-control" className={s.secondary}>
            {t("Mevcut kalite modülü", "Existing quality module")}
            <ArrowUpRight size={15} />
          </Link>
          <button
            className={s.primary}
            onClick={downloadSource}
            disabled={!data || downloading}
          >
            {downloading ? (
              <LoaderCircle size={16} className={s.spin} />
            ) : (
              <Download size={16} />
            )}
            {t("Kaynak PDF", "Source PDF")}
          </button>
        </div>
      </header>

      {error && (
        <div className={s.error} role="alert">
          <CircleAlert size={18} />
          <span>{error}</span>
          <button onClick={() => setRevision((n) => n + 1)}>
            {t("Yeniden dene", "Retry")}
          </button>
        </div>
      )}
      {loading && !data ? (
        <div className={s.state} role="status">
          <LoaderCircle className={s.spin} />
          {t(
            "Maddeler ve çalışma kayıtları yükleniyor…",
            "Loading clauses and working records…",
          )}
        </div>
      ) : (
        data && (
          <>
            <div className={s.sourceBar}>
              <span>
                <BookOpen size={16} />
                <b>{data.document.reference}</b>
                <i />
                {t("6. baskı · Eylül 2026", "6th edition · September 2026")}
              </span>
              <span>
                {data.document.totalPages} {t("PDF sayfası", "PDF pages")} ·{" "}
                {t("İngilizce kaynak", "English source")}
                <button
                  title={t(
                    "Çalışma kayıtlarını yenile",
                    "Refresh working records",
                  )}
                  aria-label={t(
                    "Çalışma kayıtlarını yenile",
                    "Refresh working records",
                  )}
                  onClick={() => setRevision((n) => n + 1)}
                  disabled={loading}
                >
                  <RefreshCw
                    size={15}
                    className={loading ? s.spin : undefined}
                  />
                </button>
              </span>
            </div>
            <div className={s.stats}>
              <div>
                <span>
                  <Layers3 size={17} />
                  {t("Ana gereklilik bölümü", "Requirement chapters")}
                </span>
                <strong>
                  7<small>{t("Madde 4–10", "Clauses 4–10")}</small>
                </strong>
              </div>
              <a href="#clause-index">
                <span>
                  <BookOpen size={17} />
                  {t("Madde ve başlık", "Clauses and headings")}
                </span>
                <strong>
                  {data.clauses.length}
                  <small>
                    {t("Ek A ve terimler dahil", "Including Annex A and terms")}
                  </small>
                </strong>
              </a>
              <div>
                <span>
                  <CheckCheck size={17} />
                  {t("Tamamlanan kontroller", "Completed checks")}
                </span>
                <strong>
                  {data.totals.checklistDone}
                  <small>
                    / {data.totals.checklistTotal} {t("kontrol", "checks")}
                  </small>
                </strong>
              </div>
              <div>
                <span>
                  <FileText size={17} />
                  {t("Çalışma dokümanları", "Working documents")}
                </span>
                <strong>
                  {data.totals.documents}
                  <small>
                    {t("Maddelere bağlı kayıtlar", "Records linked to clauses")}
                  </small>
                </strong>
              </div>
            </div>

            <section className={s.maps} aria-labelledby="maps-title">
              <div className={s.sectionHeading}>
                <div>
                  <div className={s.kicker}>
                    01 / {t("İNTERAKTİF HARİTALAR", "INTERACTIVE MAPS")}
                  </div>
                  <h2 id="maps-title">
                    {t(
                      "Kalite sistemine bir bütün olarak bak",
                      "See the quality system as a whole",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Bir alanı seçerek ilgili maddeyi ve çalışma kayıtlarını aç.",
                      "Select an area to open its clause and working records.",
                    )}
                  </p>
                </div>
                <a href="#clause-index" className={s.textLink}>
                  {t("Madde dizinine geç", "Browse clauses")}
                  <ArrowDown size={15} />
                </a>
              </div>
              <div
                className={s.tabs}
                role="tablist"
                aria-label={t("Süreç haritası", "Process map")}
              >
                <button
                  id="pdca-tab"
                  role="tab"
                  aria-selected={diagram === "pdca"}
                  aria-controls="map-panel"
                  onClick={() => setDiagram("pdca")}
                >
                  <RefreshCw size={16} />
                  {t("PUKÖ döngüsü", "PDCA cycle")}
                  <span>{t("Şekil 2", "Figure 2")}</span>
                </button>
                <button
                  id="process-tab"
                  role="tab"
                  aria-selected={diagram === "process"}
                  aria-controls="map-panel"
                  onClick={() => setDiagram("process")}
                >
                  <Waypoints size={17} />
                  {t("Tek bir sürecin öğeleri", "Elements of a single process")}
                  <span>{t("Şekil 1", "Figure 1")}</span>
                </button>
              </div>
              <div
                id="map-panel"
                role="tabpanel"
                aria-labelledby={
                  diagram === "pdca" ? "pdca-tab" : "process-tab"
                }
              >
                {diagram === "pdca" ? (
                  <PdcaDiagram locale={tr ? "tr" : "en"} />
                ) : (
                  <ProcessDiagram locale={tr ? "tr" : "en"} />
                )}
              </div>
              <div className={s.figureReference}>
                <span>
                  {t("Kaynak şekil", "Source figure")}:{" "}
                  {diagram === "pdca" ? "0.3.2 · PDF 8" : "0.3.1 · PDF 7"}
                </span>
                <Link
                  href={isoClauseHref(diagram === "pdca" ? "0.3.2" : "0.3.1")}
                >
                  {t("Kaynak açıklamasını oku", "Read the source explanation")}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </section>

            <section
              id="clause-index"
              className={s.directory}
              aria-labelledby="index-title"
            >
              <div className={s.sectionHeading}>
                <div>
                  <div className={s.kicker}>
                    02 / {t("MADDE DİZİNİ", "CLAUSE INDEX")}
                  </div>
                  <h2 id="index-title">
                    {t(
                      "Standarttan uygulamaya",
                      "From the standard to implementation",
                    )}
                  </h2>
                  <p>
                    {t(
                      "Özgün metin, alt maddeler, kontrol listeleri ve dokümanlar aynı detayda.",
                      "Original text, subclauses, checklists and documents in one place.",
                    )}
                  </p>
                </div>
              </div>
              <div className={s.filters}>
                <label className={s.search}>
                  <Search size={18} />
                  <input
                    type="search"
                    aria-label={t("Madde ara", "Search clauses")}
                    placeholder={t(
                      "Madde numarası veya başlık ara…",
                      "Search by clause number or title…",
                    )}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label={t("Aramayı temizle", "Clear search")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                <label className={s.selectLabel}>
                  <span>{t("Bölüm", "Chapter")}</span>
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    aria-label={t("Bölüm filtresi", "Chapter filter")}
                  >
                    <option value="ALL">
                      {t("Tüm bölümler", "All chapters")}
                    </option>
                    {["0", "1", "2", "3", ...chapters, "A"].map((code) => {
                      const c = byCode.get(code);
                      return (
                        c && (
                          <option key={code} value={code}>
                            {code} · {title(c)}
                          </option>
                        )
                      );
                    })}
                  </select>
                </label>
              </div>
              {searching ? (
                <>
                  <div className={s.resultsMeta}>
                    <span role="status">
                      {filtered.length} {t("madde bulundu", "clauses found")}
                    </span>
                    <button
                      onClick={() => {
                        setQuery("");
                        setChapter("ALL");
                      }}
                    >
                      {t("Filtreleri temizle", "Clear filters")}
                    </button>
                  </div>
                  <div className={s.results}>
                    {filtered.map((c) => (
                      <Link
                        key={c.code}
                        href={isoClauseHref(c.code)}
                        className={s.result}
                      >
                        <span className={s.code}>{c.code}</span>
                        <div>
                          <strong>{title(c)}</strong>
                          {tr && c.titleTr !== c.title && (
                            <span lang="en">{c.title}</span>
                          )}
                        </div>
                        <span className={s.pageNumber}>
                          PDF {c.sourcePages[0]}
                        </span>
                        <ArrowRight size={17} />
                      </Link>
                    ))}
                  </div>
                  {!filtered.length && (
                    <div className={s.empty}>
                      <Search size={26} />
                      <h3>
                        {t("Eşleşen madde bulunamadı", "No matching clauses")}
                      </h3>
                      <p>
                        {t(
                          "Başka bir başlık dene veya bölüm filtresini kaldır.",
                          "Try another title or remove the chapter filter.",
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={s.chapters}>
                    {chapters.map((code) => {
                      const clause = byCode.get(code);
                      if (!clause) return null;
                      const children = data.clauses.filter(
                        (c) => c.parentCode === code,
                      );
                      const count = data.clauses.filter((c) =>
                        c.code.startsWith(`${code}.`),
                      ).length;
                      const item = records.get(code);
                      return (
                        <article
                          key={code}
                          className={s.chapter}
                          data-chapter={code}
                        >
                          <Link
                            className={s.chapterHeading}
                            href={isoClauseHref(code)}
                          >
                            <span className={s.chapterNumber}>{code}</span>
                            <div>
                              <h3>{title(clause)}</h3>
                              <span lang="en">{clause.title}</span>
                            </div>
                            <ArrowUpRight size={18} />
                          </Link>
                          <div className={s.chapterLinks}>
                            {children.map((c) => (
                              <Link key={c.code} href={isoClauseHref(c.code)}>
                                <span>{c.code}</span>
                                {title(c)}
                                <ArrowRight size={13} />
                              </Link>
                            ))}
                          </div>
                          <footer>
                            <span>
                              {count} {t("alt madde", "subclauses")}
                            </span>
                            {item?.status === "NEEDS_REVIEW" ? (
                              <span className={s.review}>
                                {t("Gözden geçirilecek", "Needs review")}
                              </span>
                            ) : (
                              <Link href={isoClauseHref(code)}>
                                {t("Bölümü aç", "Open chapter")}
                                <ArrowRight size={13} />
                              </Link>
                            )}
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                  <div className={s.referenceHeading}>
                    <h3>
                      {t(
                        "Giriş ve tamamlayıcı bölümler",
                        "Introduction and supporting sections",
                      )}
                    </h3>
                    <span>
                      {t(
                        "Terimler, açıklamalar ve kaynaklar",
                        "Terms, clarifications and references",
                      )}
                    </span>
                  </div>
                  <div className={s.referenceGrid}>
                    {["foreword", "0", "1", "2", "3", "A", "bibliography"].map(
                      (code) => {
                        const c = byCode.get(code);
                        return (
                          c && (
                            <Link key={code} href={isoClauseHref(code)}>
                              <BookOpen size={17} />
                              <div>
                                <strong>{title(c)}</strong>
                                <span>
                                  {/^[0-9A]$/.test(code)
                                    ? `${t("Bölüm", "Section")} ${code} · `
                                    : ""}
                                  PDF {c.sourcePages[0]}
                                </span>
                              </div>
                              <ArrowUpRight size={16} />
                            </Link>
                          )
                        );
                      },
                    )}
                  </div>
                </>
              )}
            </section>
            <footer className={s.footer}>
              <span>
                {data.document.reference} ·{" "}
                {t("Şirket içi çalışma alanı", "Internal workspace")}
              </span>
              <span>
                {t(
                  "İngilizce kaynak metin · Türkçe gezinme başlıkları",
                  "English source text · Turkish navigation titles",
                )}
              </span>
            </footer>
          </>
        )
      )}
    </div>
  );
}
