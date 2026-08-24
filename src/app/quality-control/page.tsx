"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import {
  QUALITY_MODULE_COPY,
  QUALITY_POLICY_ITEMS,
  qualityCardTitle,
  type QualityLocale,
} from "@/lib/qualityPolicy";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type QualityProcessCategory =
  | "CONTEXT"
  | "PLANNING"
  | "LEADERSHIP"
  | "SUPPORT"
  | "OPERATIONAL"
  | "PERFORMANCE"
  | "IMPROVEMENT"
  | "CONSTRUCTION"
  | "REAL_ESTATE_SALES"
  | "VALUE";

type QualityProcessStatus = "ACTIVE" | "NEEDS_REVIEW" | "ARCHIVED";

type QualityCard = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category: QualityProcessCategory;
  status: QualityProcessStatus;
  checklistTotal: number;
  checklistDone: number;
  requiredTotal: number;
  requiredDone: number;
  documentsTotal: number;
  documentsNeedReview: number;
  overdueChecklist: number;
  completion: number;
};

type QualityListResponse = {
  items: QualityCard[];
  totals: {
    cards: number;
    cardsNeedReview: number;
    checklistTotal: number;
    checklistDone: number;
    documents: number;
    documentsNeedReview: number;
    overdueChecklist: number;
    completion: number;
  };
};

type ProcessIconKind =
  | "clipboard"
  | "document"
  | "pencil"
  | "truck"
  | "crane"
  | "warning"
  | "building"
  | "people"
  | "target"
  | "gear"
  | "chart"
  | "search"
  | "award"
  | "message"
  | "folder"
  | "home"
  | "money"
  | "headset";

const CATEGORY_LABELS_TR: Record<string, string> = {
  CONTEXT: "BAĞLAMSAL ANALİZ",
  LEADERSHIP: "LİDERLİK",
  PLANNING: "PLANLAMA",
  SUPPORT: "DESTEK",
  OPERATIONAL: "OPERASYONEL SÜREÇLER",
  PERFORMANCE: "PERFORMANS DEĞERLENDİRME",
  IMPROVEMENT: "İYİLEŞTİRME",
  CONSTRUCTION: "İNŞAAT ÜRETİM SÜREÇLERİ",
  REAL_ESTATE_SALES: "GAYRİMENKUL SATIŞ SÜREÇLERİ",
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  CONTEXT: "CONTEXT ANALYSIS",
  LEADERSHIP: "LEADERSHIP",
  PLANNING: "PLANNING",
  SUPPORT: "SUPPORT",
  OPERATIONAL: "OPERATIONAL PROCESSES",
  PERFORMANCE: "PERFORMANCE EVALUATION",
  IMPROVEMENT: "IMPROVEMENT",
  CONSTRUCTION: "CONSTRUCTION PRODUCTION PROCESSES",
  REAL_ESTATE_SALES: "REAL ESTATE SALES PROCESSES",
};

function categoryLabel(value: string, locale: "tr" | "en") {
  return (locale === "tr" ? CATEGORY_LABELS_TR : CATEGORY_LABELS_EN)[value] || value;
}

function shortTitle(card: QualityCard | undefined, fallbackCode: string, fallback: string, locale: QualityLocale) {
  const fallbackTitle = qualityCardTitle(fallbackCode, "", locale) || fallback;
  const rawTitle = card
    ? qualityCardTitle(card.code, card.title, locale).trim()
    : fallbackTitle.trim();
  const title = rawTitle.replace(/^\d+(?:\.\d+)?\s*/, "").replace(/^[-.)\s]+/, "");
  return title
    .replace(/^Ürün ve Hizmetlerin /, "Ürün ve Hizmetlerin\n")
    .replace(/^Requirements for Products and Services$/, "Requirements for\nProducts and Services")
    .replace(/^Externally Provided Products and Services$/, "Externally Provided\nProducts and Services")
    .replace(/^Monitoring, Measurement, Analysis and Evaluation$/, "Monitoring, Measurement,\nAnalysis and Evaluation");
}

function ProcessIcon({ kind }: { kind: ProcessIconKind }) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  if (kind === "clipboard") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="5" width="12" height="16" rx="2" {...common} />
        <path d="M9 5.2A3 3 0 0 1 12 3a3 3 0 0 1 3 2.2M9 10h6M9 14h6M9 18h4" {...common} />
      </svg>
    );
  }

  if (kind === "document") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7z" {...common} />
        <path d="M14 3v5h4M9.5 12h5M9.5 16h5" {...common} />
      </svg>
    );
  }

  if (kind === "pencil") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 16-.8 3.8L8 19l10.6-10.6-3-3L5 16Z" {...common} />
        <path d="m14.8 6.2 3 3" {...common} />
      </svg>
    );
  }

  if (kind === "truck") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" {...common} />
        <circle cx="7" cy="18" r="1.8" {...common} />
        <circle cx="17" cy="18" r="1.8" {...common} />
      </svg>
    );
  }

  if (kind === "crane") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 20V8h11M5 8l5-4 6 4M11 8v12M15 8v12M4 20h13M16 8l4 4v4" {...common} />
      </svg>
    );
  }

  if (kind === "warning") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 4 9 16H3L12 4Z" {...common} />
        <path d="M12 9v5M12 17h.01" {...common} />
      </svg>
    );
  }

  if (kind === "building") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21V6l8-3 8 3v15M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" {...common} />
      </svg>
    );
  }

  if (kind === "people") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" {...common} />
        <path d="M3.5 19c.9-3 3-5 5.5-5s4.6 2 5.5 5" {...common} />
        <circle cx="17" cy="9" r="2.3" {...common} />
        <path d="M15.8 14c2 .4 3.7 1.8 4.7 4" {...common} />
      </svg>
    );
  }

  if (kind === "target") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" {...common} />
        <circle cx="12" cy="12" r="4" {...common} />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" {...common} />
      </svg>
    );
  }

  if (kind === "gear") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l1.5 2.2 2.7-.3.8 2.6 2.4 1.3-1.2 2.5 1.2 2.5-2.4 1.3-.8 2.6-2.7-.3L12 21l-1.5-2.2-2.7.3-.8-2.6-2.4-1.3 1.2-2.5-1.2-2.5L7 8.9l.8-2.6 2.7.3L12 3Z" {...common} />
        <circle cx="12" cy="12" r="3" {...common} />
      </svg>
    );
  }

  if (kind === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h16M7 17v-5M12 17V7M17 17v-8M6 10l5-5 3 3 4-5" {...common} />
      </svg>
    );
  }

  if (kind === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6" {...common} />
        <path d="m15 15 5 5" {...common} />
      </svg>
    );
  }

  if (kind === "award") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4.5" {...common} />
        <path d="m9 12-2 8 5-3 5 3-2-8" {...common} />
      </svg>
    );
  }

  if (kind === "message") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v11H8l-4 4V5Z" {...common} />
        <path d="M8 10h8M8 13h5" {...common} />
      </svg>
    );
  }

  if (kind === "folder") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 6.5h7l2 2H20.5v10h-17z" {...common} />
      </svg>
    );
  }

  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11 12 4l8 7v9H6v-7h12" {...common} />
        <path d="M9 20v-6h6v6" {...common} />
      </svg>
    );
  }

  if (kind === "money") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" {...common} />
        <circle cx="12" cy="12" r="3" {...common} />
        <path d="M7 9h.01M17 15h.01" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" {...common} />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6M16.5 7.5h3M18 6v3" {...common} />
    </svg>
  );
}

function iconForCard(card: QualityCard | undefined): ProcessIconKind {
  const code = card?.code || "";
  if (code === "8.1") return "clipboard";
  if (code === "8.2") return "document";
  if (code === "8.3") return "pencil";
  if (code === "8.4") return "truck";
  if (code === "8.5") return "crane";
  if (code === "8.6") return "clipboard";
  if (code === "8.7") return "warning";
  if (code.startsWith("4.1")) return "building";
  if (code.startsWith("4.2")) return "people";
  if (code.startsWith("4.3")) return "target";
  if (code.startsWith("4.4")) return "gear";
  if (code === "5") return "people";
  if (code === "6" || code.startsWith("6.")) return "chart";
  if (code === "9" || code.startsWith("9.")) return "search";
  if (code === "10" || code.startsWith("10.")) return "chart";
  if (code.startsWith("7.2")) return "award";
  if (code.startsWith("7.3")) return "people";
  if (code.startsWith("7.4")) return "message";
  if (code.startsWith("7.5")) return "folder";
  if (card?.category === "REAL_ESTATE_SALES") return "home";
  if (card?.category === "CONSTRUCTION") return "crane";
  return "clipboard";
}

function MiniCard({
  card,
  fallbackCode,
  fallbackTitle,
  className = "",
  locale,
}: {
  card?: QualityCard;
  fallbackCode: string;
  fallbackTitle: string;
  className?: string;
  locale?: QualityLocale;
}) {
  const language = useLanguage();
  const activeLocale = locale || language.locale;
  const href = card ? `/quality-control/${card.id}` : "/quality-control";
  const code = card?.code || fallbackCode;
  const title = shortTitle(card, fallbackCode, fallbackTitle, activeLocale);

  return (
    <Link className={`mini-card ${className}`} href={href} title={`${code} ${title.replace(/\n/g, " ")}`}>
      <span className="mini-icon">
        <ProcessIcon kind={iconForCard(card)} />
      </span>
      <span className="mini-copy">
        <b>{code}</b>
        <strong>{title}</strong>
      </span>
      {card ? (
        <span className="mini-meta">
          {card.checklistDone}/{card.checklistTotal || 0}
        </span>
      ) : null}
    </Link>
  );
}

function CoreCard({
  card,
  fallbackCode,
  fallbackTitle,
  className = "",
  locale,
}: {
  card?: QualityCard;
  fallbackCode: string;
  fallbackTitle: string;
  className?: string;
  locale?: QualityLocale;
}) {
  const language = useLanguage();
  const activeLocale = locale || language.locale;
  const href = card ? `/quality-control/${card.id}` : "/quality-control";
  const code = card?.code || fallbackCode;
  const title = shortTitle(card, fallbackCode, fallbackTitle, activeLocale);

  return (
    <Link className={`core-card ${className}`} href={href} title={`${code} ${title.replace(/\n/g, " ")}`}>
      <span className="core-icon">
        <ProcessIcon kind={iconForCard(card)} />
      </span>
      <span>
        <b>{code}</b>
        <strong>{title}</strong>
      </span>
    </Link>
  );
}

function LaneStep({
  label,
  kind,
  href,
}: {
  label: string;
  kind: ProcessIconKind;
  href: string;
}) {
  return (
    <Link className="lane-step" href={href}>
      <span>
        <ProcessIcon kind={kind} />
      </span>
      <strong>{label}</strong>
    </Link>
  );
}

function cardHref(card: QualityCard | undefined) {
  return card ? `/quality-control/${card.id}` : "/quality-control";
}

export default function QualityControlPage() {
  const { locale, setLocale } = useLanguage();
  const copy = QUALITY_MODULE_COPY[locale];
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<QualityCard[]>([]);
  const [totals, setTotals] = useState<QualityListResponse["totals"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const role = me?.role as string | undefined;
  const canUse =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "AFTERSALES" ||
    role === "SALES" ||
    role === "PREVIEW";

  const byCode = useMemo(() => {
    const map = new Map<string, QualityCard>();
    items.forEach((item) => map.set(item.code, item));
    return map;
  }, [items]);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const data = (await authedFetch("/quality-control")) as QualityListResponse;
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals || null);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
  }, []);

  useEffect(() => {
    if (!mounted || !canUse) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, canUse]);

  if (mounted && !canUse) {
    return (
      <main className="quality-map-page">
        <section className="access-card">
          <h1>{locale === "tr" ? "Yetki yok" : "No access"}</h1>
          <p>
            {locale === "tr"
              ? "Kalite kontrol modülü admin, manager, aftersales ve sales rolleri içindir."
              : "The quality control module is available for admin, manager, aftersales and sales roles."}
          </p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const outputs = copy.outputs;
  const values = copy.values;
  const outputLinks = ["9.1", "9", "8.2", "4.4"];
  const valueLinks = ["5", "7.4", "7.4", "8.6", "7.2"];
  const policyLocale = locale === "tr" ? "tr" : "en";
  const policyHref = (codes: string[]) => {
    const code = codes.find((item) => byCode.get(item)) || codes[0];
    return cardHref(byCode.get(code));
  };

  return (
    <main className="quality-map-page">
      <section className="poster">
        <header className="poster-header">
          <div className="brand-block">
            <img src="/dndblack.png" alt="DND" />
            <strong>{copy.brandName}</strong>
            <span>{copy.brandValues}</span>
          </div>
          <div className="poster-title">
            <h1>{copy.title}</h1>
            <h2>{copy.subtitle}</h2>
            <p>{copy.motto}</p>
          </div>
          <div className="poster-actions">
            <div className="language-switch" aria-label={copy.language}>
              <button type="button" className={locale === "tr" ? "active" : ""} onClick={() => setLocale("tr")}>
                TR
              </button>
              <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>
                EN
              </button>
            </div>
            <button className="refresh-button" type="button" onClick={load} disabled={loading}>
              {loading ? copy.loading : copy.refresh}
            </button>
          </div>
        </header>

        {err ? <div className="error-strip">{err}</div> : null}

        <section className="poster-body">
          <aside className="context-panel">
            <Link className="panel-title section-link" href={cardHref(byCode.get("4.1"))}>
              {categoryLabel("CONTEXT", locale)}
            </Link>
            <MiniCard card={byCode.get("4.1")} fallbackCode="4.1" fallbackTitle="Kuruluşun ve Bağlamının Anlaşılması" />
            <MiniCard card={byCode.get("4.2")} fallbackCode="4.2" fallbackTitle="İlgili Tarafların İhtiyaç ve Beklentileri" />
            <MiniCard card={byCode.get("4.3")} fallbackCode="4.3" fallbackTitle="Kalite Yönetim Sisteminin Kapsamının Belirlenmesi" />
            <MiniCard card={byCode.get("4.4")} fallbackCode="4.4" fallbackTitle="Kalite Yönetim Sistemi ve Süreçlerinin Belirlenmesi" />
          </aside>

          <section className="main-map">
            <div className="main-map-frame">
              <Link className="section-bar section-link operational-bar" href={cardHref(byCode.get("8"))}>
                8. {categoryLabel("OPERATIONAL", locale)}
              </Link>
              <div className="operational-row">
                <MiniCard card={byCode.get("8.1")} fallbackCode="8.1" fallbackTitle="Operasyonel Planlama ve Kontrol" />
                <MiniCard card={byCode.get("8.2")} fallbackCode="8.2" fallbackTitle="Ürün ve Hizmetler İçin Şartlar" />
                <MiniCard card={byCode.get("8.3")} fallbackCode="8.3" fallbackTitle="Tasarım ve Geliştirme" />
                <MiniCard card={byCode.get("8.4")} fallbackCode="8.4" fallbackTitle="Dışarıdan Tedarik Edilen Ürün ve Hizmetlerin Kontrolü" />
                <MiniCard card={byCode.get("8.5")} fallbackCode="8.5" fallbackTitle="Üretim ve Hizmetin Sunumu" />
                <MiniCard card={byCode.get("8.6")} fallbackCode="8.6" fallbackTitle="Ürün ve Hizmetlerin Serbest Bırakılması" />
                <MiniCard card={byCode.get("8.7")} fallbackCode="8.7" fallbackTitle="Uygun Olmayan Çıktının Kontrolü" />
              </div>

              <div className="connector-line top-line" />
              <div className="process-core">
                <div className="core-top">
                  <CoreCard
                    card={byCode.get("8")}
                    fallbackCode="8"
                    fallbackTitle="Operasyon - Kurumsal Hizmetler ve İşletim"
                    className="operation-core"
                  />
                </div>
                <div className="core-middle">
                  <div className="planning-stack">
                    <CoreCard card={byCode.get("6")} fallbackCode="6" fallbackTitle="Planlama" className="planning-core" />
                    <MiniCard card={byCode.get("6.1")} fallbackCode="6.1" fallbackTitle="Risk ve Fırsatların Belirlenmesi" />
                    <MiniCard card={byCode.get("6.2")} fallbackCode="6.2" fallbackTitle="Hedefler ve Planlama" />
                    <MiniCard card={byCode.get("6.3")} fallbackCode="6.3" fallbackTitle="Değişikliklerin Planlanması" />
                  </div>

                  <CoreCard card={byCode.get("5")} fallbackCode="5" fallbackTitle="Liderlik" className="leadership-core" />

                  <div className="performance-stack">
                    <CoreCard card={byCode.get("9")} fallbackCode="9" fallbackTitle="Performans Değerlendirme" className="performance-core" />
                    <MiniCard card={byCode.get("9.1")} fallbackCode="9.1" fallbackTitle="İzleme, Ölçme, Analiz ve Değerlendirme" />
                    <MiniCard card={byCode.get("9.2")} fallbackCode="9.2" fallbackTitle="İç Tetkik" />
                    <MiniCard card={byCode.get("9.3")} fallbackCode="9.3" fallbackTitle="Yönetimin Gözden Geçirmesi" />
                  </div>
                </div>

                <div className="core-bottom">
                  <CoreCard card={byCode.get("10")} fallbackCode="10" fallbackTitle="İyileştirme" className="improvement-core" />
                  <div className="improvement-row">
                    <MiniCard card={byCode.get("10.1")} fallbackCode="10.1" fallbackTitle="İyileştirme - Genel" />
                    <MiniCard card={byCode.get("10.2")} fallbackCode="10.2" fallbackTitle="Uygunsuzluk ve Düzeltici Faaliyet" />
                    <MiniCard card={byCode.get("10.3")} fallbackCode="10.3" fallbackTitle="Sürekli İyileştirme" />
                  </div>
                </div>
              </div>

              <div className="support-area">
                <Link className="section-bar section-link" href={cardHref(byCode.get("7"))}>
                  7. {categoryLabel("SUPPORT", locale)}
                </Link>
                <div className="support-row">
                  <MiniCard card={byCode.get("7.1")} fallbackCode="7.1" fallbackTitle="Kaynaklar" />
                  <MiniCard card={byCode.get("7.2")} fallbackCode="7.2" fallbackTitle="Yeterlilik ve Yetkinlik" />
                  <MiniCard card={byCode.get("7.3")} fallbackCode="7.3" fallbackTitle="Farkındalık" />
                  <MiniCard card={byCode.get("7.4")} fallbackCode="7.4" fallbackTitle="İletişim" />
                  <MiniCard card={byCode.get("7.5")} fallbackCode="7.5" fallbackTitle="Dokümante Edilmiş Bilgi" />
                </div>
              </div>
            </div>
          </section>

          <aside className="right-panel">
            <div className="output-stack">
              {outputs.map((output, index) => (
                <Link key={output} className="output-arrow" href={cardHref(byCode.get(outputLinks[index]))}>
                  <span>
                    <ProcessIcon kind={index === 0 ? "people" : index === 1 ? "chart" : index === 2 ? "crane" : "clipboard"} />
                  </span>
                  <strong>{output}</strong>
                </Link>
              ))}
            </div>

            <div className="values-box">
              <Link className="values-heading" href={cardHref(byCode.get("5"))}>
                {copy.valuesHeading}
              </Link>
              {values.map(([title, detail], index) => (
                <Link key={title} className="value-row" href={cardHref(byCode.get(valueLinks[index]))}>
                  <span>
                    <ProcessIcon kind={index === 0 ? "target" : index === 1 ? "people" : index === 2 ? "message" : index === 3 ? "award" : "headset"} />
                  </span>
                  <p>
                    <b>{title}</b>
                    {detail}
                  </p>
                </Link>
              ))}
            </div>

            <div className="policy-box">
              <Link className="policy-heading" href={cardHref(byCode.get("5"))}>
                {copy.policyHeading}
              </Link>
              {QUALITY_POLICY_ITEMS.map((item) => (
                <Link key={item.key} className="policy-row" href={policyHref(item.codes)}>
                  <b>{item.title[policyLocale]}</b>
                  <span>{item.summary[policyLocale]}</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="bottom-lanes">
          <section className="lane-card">
            <Link className="section-bar section-link" href={cardHref(byCode.get("İNŞAAT"))}>
              {categoryLabel("CONSTRUCTION", locale)}
            </Link>
            <div className="lane-steps">
              <LaneStep href={cardHref(byCode.get("6"))} kind="crane" label={copy.lanes.construction[0]} />
              <LaneStep href={cardHref(byCode.get("8.3"))} kind="pencil" label={copy.lanes.construction[1]} />
              <LaneStep href={cardHref(byCode.get("8.4"))} kind="truck" label={copy.lanes.construction[2]} />
              <LaneStep href={cardHref(byCode.get("8.5"))} kind="building" label={copy.lanes.construction[3]} />
              <LaneStep href={cardHref(byCode.get("8.6"))} kind="clipboard" label={copy.lanes.construction[4]} />
              <LaneStep href={cardHref(byCode.get("8.6"))} kind="home" label={copy.lanes.construction[5]} />
            </div>
          </section>

          <section className="lane-card">
            <Link className="section-bar section-link" href={cardHref(byCode.get("SATIŞ"))}>
              {categoryLabel("REAL_ESTATE_SALES", locale)}
            </Link>
            <div className="lane-steps">
              <LaneStep href={cardHref(byCode.get("7.4"))} kind="message" label={copy.lanes.sales[0]} />
              <LaneStep href={cardHref(byCode.get("4.2"))} kind="people" label={copy.lanes.sales[1]} />
              <LaneStep href={cardHref(byCode.get("8.2"))} kind="document" label={copy.lanes.sales[2]} />
              <LaneStep href={cardHref(byCode.get("8.2"))} kind="money" label={copy.lanes.sales[3]} />
              <LaneStep href={cardHref(byCode.get("8.6"))} kind="home" label={copy.lanes.sales[4]} />
              <LaneStep href={cardHref(byCode.get("9.1"))} kind="headset" label={copy.lanes.sales[5]} />
            </div>
          </section>
        </section>

        <div className="poster-status">
          <span>{totals?.cards || 0} {copy.stats.processes}</span>
          <span>{totals?.documents || 0} {copy.stats.documents}</span>
          <span>{totals?.completion || 0}% {copy.stats.checklist}</span>
        </div>

        <footer className="values-band">
          {values.map(([title, detail], index) => (
            <Link key={title} href={cardHref(byCode.get(valueLinks[index]))}>
              <b>{title}</b>
              <span>{detail}</span>
            </Link>
          ))}
        </footer>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .quality-map-page {
    min-height: 100vh;
    background: #edf4fb;
    color: #082956;
    padding: 10px;
    overflow-x: hidden;
  }

  .poster {
    width: min(1680px, 100%);
    min-height: calc(100vh - 20px);
    margin: 0 auto;
    border: 2px solid #0b3a75;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 22px 60px rgba(8, 41, 86, 0.16);
    padding: clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) 0;
    position: relative;
    overflow: hidden;
  }

  .poster-header {
    display: grid;
    grid-template-columns: clamp(155px, 12vw, 230px) minmax(0, 1fr) clamp(88px, 7vw, 120px);
    gap: clamp(8px, 1vw, 16px);
    align-items: start;
  }

  .brand-block {
    display: grid;
    gap: 3px;
    align-content: start;
    color: #082956;
  }

  .brand-block img {
    width: clamp(86px, 7vw, 116px);
    height: auto;
    object-fit: contain;
  }

  .brand-block strong {
    font-size: clamp(15px, 1.25vw, 20px);
    letter-spacing: clamp(3px, 0.35vw, 6px);
    line-height: 1;
  }

  .brand-block span {
    color: #0b3a75;
    font-size: clamp(10px, 0.8vw, 13px);
    font-weight: 1000;
    letter-spacing: 1px;
  }

  .poster-title {
    text-align: center;
    color: #0b3a75;
  }

  .poster-title h1,
  .poster-title h2,
  .poster-title p {
    margin: 0;
  }

  .poster-title h1 {
    font-size: clamp(24px, 2.15vw, 36px);
    line-height: 1.05;
    font-weight: 1000;
  }

  .poster-title h2 {
    margin-top: 3px;
    font-size: clamp(27px, 2.35vw, 40px);
    line-height: 1;
    font-weight: 1000;
  }

  .poster-title p {
    margin-top: 6px;
    color: #315f94;
    font-size: clamp(13px, 1vw, 17px);
    font-style: italic;
    font-weight: 900;
  }

  .poster-actions {
    display: grid;
    gap: 8px;
    align-content: start;
  }

  .language-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    border: 1px solid #86b3d8;
    border-radius: 8px;
    background: #f4f8fc;
    padding: 4px;
  }

  .language-switch button {
    min-height: 28px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #0b3a75;
    font-size: 11px;
    font-weight: 1000;
    cursor: pointer;
  }

  .language-switch button.active {
    background: #0b3a75;
    color: #fff;
  }

  .refresh-button {
    min-height: 38px;
    border: 1px solid #0b3a75;
    border-radius: 8px;
    background: #0b3a75;
    color: #fff;
    font-size: clamp(11px, 0.78vw, 13px);
    font-weight: 1000;
    cursor: pointer;
  }

  .refresh-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .error-strip {
    margin: 10px 0 0;
    border: 1px solid #ef4444;
    border-radius: 8px;
    background: #fef2f2;
    color: #991b1b;
    padding: 9px 12px;
    font-weight: 900;
  }

  .poster-body {
    display: grid;
    grid-template-columns: clamp(188px, 14.4vw, 242px) minmax(0, 1fr) clamp(212px, 16.8vw, 284px);
    gap: clamp(8px, 0.8vw, 14px);
    margin-top: 12px;
    align-items: stretch;
  }

  .panel-title,
  .section-bar {
    min-height: clamp(28px, 1.9vw, 32px);
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: #053574;
    color: #fff;
    font-weight: 1000;
    font-size: clamp(12px, 0.9vw, 15px);
    text-align: center;
  }

  .section-link {
    color: #fff;
    text-decoration: none;
    transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
  }

  .section-link:hover {
    background: #0b4a94;
    box-shadow: 0 10px 22px rgba(8, 41, 86, 0.16);
    transform: translateY(-1px);
  }

  .context-panel,
  .right-panel,
  .main-map-frame,
  .lane-card,
  .values-box,
  .policy-box {
    border: 1.5px solid #86b3d8;
    border-radius: 10px;
    background: #fbfdff;
  }

  .context-panel {
    display: grid;
    align-content: start;
    gap: clamp(8px, 0.72vw, 12px);
    padding: clamp(8px, 0.72vw, 12px);
  }

  .main-map-frame {
    min-width: 0;
    min-height: clamp(610px, 42vw, 720px);
    padding: 12px clamp(10px, 1.15vw, 20px) 14px;
    position: relative;
  }

  .operational-bar {
    width: min(420px, 55%);
    margin: 0 auto 8px;
  }

  .operational-row,
  .support-row {
    display: grid;
    gap: clamp(5px, 0.5vw, 8px);
  }

  .operational-row {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .support-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .mini-card,
  .core-card {
    color: #082956;
    text-decoration: none;
    border: 1.3px solid #c9a95d;
    border-radius: 8px;
    background: #fff9ee;
    box-shadow: 0 4px 10px rgba(8, 41, 86, 0.07);
    transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
  }

  .mini-card:hover,
  .core-card:hover {
    transform: translateY(-2px);
    border-color: #0b3a75;
    box-shadow: 0 14px 28px rgba(8, 41, 86, 0.14);
  }

  .lane-card:focus-within {
    border-color: #0b3a75;
    box-shadow: 0 14px 28px rgba(8, 41, 86, 0.12);
  }

  .mini-card {
    min-height: 68px;
    display: grid;
    grid-template-columns: clamp(26px, 2vw, 35px) minmax(0, 1fr);
    gap: clamp(5px, 0.5vw, 8px);
    align-items: center;
    padding: clamp(6px, 0.55vw, 8px);
    position: relative;
    overflow: hidden;
  }

  .mini-icon,
  .core-icon {
    display: grid;
    place-items: center;
    color: #0b3a75;
  }

  .mini-icon svg,
  .core-icon svg,
  .output-arrow svg,
  .values-box svg,
  .lane-step svg {
    width: clamp(20px, 1.6vw, 28px);
    height: clamp(20px, 1.6vw, 28px);
  }

  .mini-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .mini-copy b,
  .core-card b {
    display: block;
    color: #0b3a75;
    font-size: clamp(10px, 0.75vw, 12px);
    line-height: 1;
  }

  .mini-copy strong,
  .core-card strong {
    display: block;
    white-space: pre-line;
    font-size: clamp(10px, 0.75vw, 12px);
    line-height: 1.12;
    font-weight: 1000;
    overflow-wrap: anywhere;
    word-break: normal;
    hyphens: auto;
  }

  .operational-row .mini-card {
    min-height: clamp(94px, 7vw, 112px);
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 25px minmax(0, 1fr);
    justify-items: center;
    align-items: start;
    gap: 5px;
    padding: clamp(6px, 0.55vw, 9px) 5px 7px;
    text-align: center;
  }

  .operational-row .mini-icon svg {
    width: clamp(18px, 1.35vw, 23px);
    height: clamp(18px, 1.35vw, 23px);
  }

  .operational-row .mini-copy {
    justify-items: center;
    gap: 4px;
  }

  .operational-row .mini-copy b {
    font-size: clamp(10px, 0.72vw, 12px);
  }

  .operational-row .mini-copy strong {
    max-width: 100%;
    font-size: clamp(8.7px, 0.66vw, 10.5px);
    line-height: 1.08;
  }

  .context-panel .mini-card {
    min-height: clamp(68px, 5vw, 80px);
  }

  .context-panel .mini-copy strong {
    font-size: clamp(9.5px, 0.72vw, 11.5px);
    line-height: 1.1;
  }

  .mini-meta {
    position: absolute;
    right: 6px;
    bottom: 5px;
    color: #547090;
    font-size: 10px;
    font-weight: 1000;
  }

  .connector-line {
    height: 36px;
    border-left: 2px solid #1f2937;
    margin: 0 auto;
    width: 1px;
  }

  .process-core {
    position: relative;
    display: grid;
    gap: clamp(9px, 0.72vw, 12px);
    padding: 0 clamp(14px, 2.5vw, 42px);
  }

  .process-core::before {
    content: "";
    position: absolute;
    left: 21%;
    right: 21%;
    top: 128px;
    height: 238px;
    border: 2px solid #111827;
    border-left-color: transparent;
    border-right-color: transparent;
    border-radius: 50%;
    pointer-events: none;
    opacity: 0.75;
  }

  .core-top,
  .core-bottom {
    display: grid;
    justify-items: center;
  }

  .core-middle {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) minmax(170px, 250px) minmax(160px, 1fr);
    gap: clamp(12px, 1.55vw, 28px);
    align-items: center;
  }

  .planning-stack,
  .performance-stack {
    display: grid;
    gap: 8px;
  }

  .core-card {
    min-height: 74px;
    display: grid;
    grid-template-columns: clamp(30px, 2.5vw, 44px) minmax(0, 1fr);
    align-items: center;
    gap: clamp(6px, 0.6vw, 10px);
    padding: clamp(8px, 0.72vw, 10px) clamp(9px, 0.85vw, 14px);
    text-align: left;
    overflow: hidden;
  }

  .core-card > span:last-child {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .operation-core {
    width: min(390px, 100%);
    background: #eaf7ff;
    border-color: #78b7db;
  }

  .planning-core,
  .performance-core,
  .improvement-core {
    background: #eaf7ff;
    border-color: #78b7db;
  }

  .leadership-core {
    min-height: 92px;
    background: #ecfdf3;
    border-color: #8ccf8f;
  }

  .improvement-core {
    width: min(340px, 100%);
  }

  .improvement-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(7px, 0.72vw, 12px);
    width: min(760px, 100%);
    margin-top: 12px;
  }

  .support-area {
    margin-top: 14px;
  }

  .support-area .section-bar {
    width: min(260px, 50%);
    margin: 0 auto 8px;
  }

  .right-panel {
    border: 0;
    background: transparent;
    display: grid;
    gap: 14px;
    align-content: start;
  }

  .output-stack {
    display: grid;
    gap: clamp(8px, 0.72vw, 12px);
  }

  .output-arrow {
    min-height: clamp(58px, 4.3vw, 72px);
    display: grid;
    grid-template-columns: clamp(28px, 2.45vw, 42px) minmax(0, 1fr);
    align-items: center;
    gap: clamp(6px, 0.6vw, 10px);
    background: #053574;
    color: #fff;
    text-decoration: none;
    padding: 10px 18px 10px 10px;
    clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%);
    font-weight: 1000;
    font-size: clamp(10px, 0.75vw, 13px);
    line-height: 1.2;
    transition: transform 0.14s ease, filter 0.14s ease, box-shadow 0.14s ease;
  }

  .output-arrow:hover {
    filter: brightness(1.08);
    transform: translateX(3px);
    box-shadow: 0 14px 26px rgba(8, 41, 86, 0.18);
  }

  .output-arrow span {
    display: grid;
    place-items: center;
  }

  .values-box {
    padding: clamp(8px, 0.72vw, 12px);
    display: grid;
    gap: clamp(7px, 0.6vw, 10px);
  }

  .policy-box {
    padding: clamp(8px, 0.7vw, 11px);
    display: grid;
    gap: clamp(6px, 0.5vw, 8px);
  }

  .values-heading,
  .policy-heading {
    margin: 0;
    min-height: 32px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: #053574;
    color: #fff;
    font-size: clamp(11px, 0.8vw, 14px);
    font-weight: 1000;
    text-align: center;
    text-decoration: none;
  }

  .policy-heading {
    background: #0b4a94;
    font-size: clamp(10px, 0.72vw, 12px);
  }

  .value-row {
    display: grid;
    grid-template-columns: clamp(25px, 2vw, 34px) minmax(0, 1fr);
    gap: clamp(5px, 0.45vw, 8px);
    align-items: center;
    color: #082956;
    text-decoration: none;
    border-radius: 7px;
    padding: 2px;
    transition: background 0.14s ease, transform 0.14s ease;
  }

  .value-row:hover {
    background: #eaf7ff;
    transform: translateX(2px);
  }

  .values-box p {
    margin: 0;
    color: #082956;
    font-size: clamp(9px, 0.67vw, 11px);
    line-height: 1.25;
  }

  .values-box b {
    display: block;
    color: #0b3a75;
    font-size: clamp(9.5px, 0.72vw, 12px);
  }

  .policy-row {
    display: grid;
    gap: 2px;
    padding: 7px 8px;
    border: 1px solid #d4b76a;
    border-radius: 8px;
    background: #fff9ee;
    color: #082956;
    text-decoration: none;
    transition: background 0.14s ease, transform 0.14s ease, border-color 0.14s ease;
  }

  .policy-row:hover {
    background: #eaf7ff;
    border-color: #0b3a75;
    transform: translateX(2px);
  }

  .policy-row b {
    color: #0b3a75;
    font-size: clamp(9.5px, 0.7vw, 11px);
    line-height: 1.1;
  }

  .policy-row span {
    color: #314866;
    font-size: clamp(8.4px, 0.62vw, 10px);
    line-height: 1.18;
  }

  .bottom-lanes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 14px;
  }

  .lane-card {
    display: grid;
    gap: 12px;
    padding: 12px;
    color: #082956;
    text-decoration: none;
    transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
  }

  .lane-steps {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
  }

  .lane-step {
    display: grid;
    justify-items: center;
    gap: 5px;
    text-align: center;
    position: relative;
    color: #082956;
    text-decoration: none;
    border-radius: 8px;
    padding: 4px 3px;
    transition: background 0.14s ease, transform 0.14s ease;
  }

  .lane-step:hover {
    background: #eaf7ff;
    transform: translateY(-2px);
  }

  .lane-step:not(:last-child)::after {
    content: "";
    position: absolute;
    right: -8px;
    top: 20px;
    width: 14px;
    border-top: 2px solid #111827;
  }

  .lane-step span {
    width: 48px;
    height: 42px;
    display: grid;
    place-items: center;
    color: #0b3a75;
  }

  .lane-step strong {
    font-size: 12px;
    line-height: 1.15;
  }

  .values-band {
    margin: 14px -18px 0;
    min-height: 72px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    background: #053574;
    color: #fff;
  }

  .values-band a {
    display: grid;
    align-content: center;
    gap: 4px;
    padding: 10px 18px;
    border-left: 1px solid rgba(255, 255, 255, 0.28);
    color: #fff;
    text-decoration: none;
    transition: background 0.14s ease;
  }

  .values-band a:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .values-band a:first-child {
    border-left: 0;
  }

  .values-band b {
    font-size: 15px;
  }

  .values-band span {
    color: rgba(255, 255, 255, 0.82);
    font-size: 12px;
    line-height: 1.25;
  }

  .poster-status {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin: 10px 0 12px;
  }

  .poster-status span {
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    border: 1px solid #a7c7e7;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: #0b3a75;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 1000;
  }

  .access-card {
    width: min(720px, 100%);
    margin: 12vh auto 0;
    border: 1px solid #86b3d8;
    border-radius: 16px;
    background: #fff;
    padding: 24px;
    box-shadow: 0 18px 48px rgba(8, 41, 86, 0.14);
  }

  .access-card h1 {
    margin: 0 0 8px;
  }

  .access-card p {
    margin: 0;
    color: #547090;
  }

  @media (max-width: 1180px) {
    .poster-body {
      grid-template-columns: 190px minmax(0, 1fr);
    }

    .right-panel {
      grid-column: 1 / -1;
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }

    .values-box {
      min-height: 100%;
    }
  }
`;
