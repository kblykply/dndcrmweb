"use client";

import Link from "next/link";
import { useId, type ComponentType } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleCheck,
  CircleDot,
  ClipboardCheck,
  Cog,
  Compass,
  Gauge,
  Layers3,
  PackageCheck,
  RefreshCcw,
  Scan,
  Settings2,
  Shapes,
  Smile,
  Target,
  UsersRound,
  Waypoints,
} from "lucide-react";
import styles from "./iso-diagrams.module.css";

type Locale = "tr" | "en";
type DiagramProps = { locale?: Locale };
type DiagramIcon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

const copy = {
  tr: {
    clause: "Madde",
    open: "Maddeyi aç",
    pdcaLabel:
      "Kalite yönetim sistemi: Planla, Uygula, Kontrol et, İyileştir döngüsü",
    system: "Kalite yönetim sistemi",
    scope: "Sistemin kapsamı",
    inputs: "Sistemin girdileri",
    results: "Sistemin sonuçları",
    context: "Kuruluşun bağlamı",
    requirements: "Müşteri gerekleri",
    parties: "İlgili tarafların ihtiyaç ve beklentileri",
    satisfaction: "Müşteri memnuniyeti",
    qmsResults: "Kalite yönetim sistemi sonuçları",
    products: "Ürünler ve hizmetler",
    plan: "Planla",
    do: "Uygula",
    check: "Kontrol et",
    act: "İyileştir",
    planning: "Planlama",
    support: "Destek",
    operation: "Operasyon",
    evaluation: "Performans değerlen\u00addirme",
    improvement: "İyileştirme",
    leadership: "Liderlik",
    center: "Döngünün merkezinde",
    continuous: "Sürekli iyileştirme döngüsü",
    pdcaHint: "Döngüdeki bir alana tıklayarak ilgili maddeyi keşfedin.",
    processLabel: "Tek bir sürecin öğeleri ve aralarındaki ilişkiler",
    process: "Bir sürecin akışı",
    processHint: "Bağlantılar, süreç öğeleriyle ilişkili maddeleri açar.",
    source: "Girdilerin kaynakları",
    sourceDescription: "Önceki süreçler, iç ve dış tedarikçiler",
    input: "Girdiler",
    inputDescription: "Gerekler, malzeme, enerji ve bilgi",
    activity: "Faaliyetler",
    activityDescription: "Girdileri çıktılara dönüştüren işler",
    output: "Çıktılar",
    outputDescription: "Ürünler, hizmetler, enerji ve bilgi",
    recipients: "Çıktıların alıcıları",
    recipientsDescription: "Sonraki süreçler, iç ve dış müşteriler",
    start: "Başlangıç noktası",
    end: "Bitiş noktası",
    monitor: "İzleme ve ölçme",
    control: "Kontrol noktaları",
    controlDescription: "Sürecin performansını izlemek ve kontrol etmek için",
  },
  en: {
    clause: "Clause",
    open: "Open clause",
    pdcaLabel: "Quality management system: Plan, Do, Check, Act cycle",
    system: "Quality management system",
    scope: "Scope of the system",
    inputs: "System inputs",
    results: "System results",
    context: "Context of the organization",
    requirements: "Customer requirements",
    parties: "Needs and expectations of interested parties",
    satisfaction: "Customer satisfaction",
    qmsResults: "Quality management system results",
    products: "Products and services",
    plan: "Plan",
    do: "Do",
    check: "Check",
    act: "Act",
    planning: "Planning",
    support: "Support",
    operation: "Operation",
    evaluation: "Perfor\u00admance evaluation",
    improvement: "Improvement",
    leadership: "Leadership",
    center: "At the heart of the cycle",
    continuous: "A cycle of continual improvement",
    pdcaHint: "Select an area of the cycle to explore its clause.",
    processLabel:
      "Elements of a single process and the relationships between them",
    process: "The flow of a process",
    processHint: "Links open clauses related to each process element.",
    source: "Sources of inputs",
    sourceDescription: "Preceding processes, internal and external providers",
    input: "Inputs",
    inputDescription: "Requirements, matter, energy and information",
    activity: "Activities",
    activityDescription: "Work that transforms inputs into outputs",
    output: "Outputs",
    outputDescription: "Products, services, energy and information",
    recipients: "Receivers of outputs",
    recipientsDescription:
      "Subsequent processes, internal and external customers",
    start: "Starting point",
    end: "End point",
    monitor: "Monitoring and measurement",
    control: "Control points",
    controlDescription: "To monitor and control the performance of the process",
  },
};

function ClauseLink({
  code,
  label,
  locale,
  icon: Icon,
  phase,
  description,
  className = "",
}: {
  code: string;
  label: string;
  locale: Locale;
  icon: DiagramIcon;
  phase?: string;
  description?: string;
  className?: string;
}) {
  const text = copy[locale];
  return (
    <Link
      href={`/iso-2026/${code}`}
      className={`${styles.clauseLink} ${className}`}
      aria-label={`${label} — ${text.clause} ${code}`}
      title={`${text.open} ${code}: ${label}`}
    >
      <span className={styles.nodeTop}>
        <Icon size={18} aria-hidden />
        <span className={styles.clauseNumber}>{code}</span>
      </span>
      {phase ? <span className={styles.phase}>{phase}</span> : null}
      <strong>{label}</strong>
      {description ? (
        <span className={styles.description}>{description}</span>
      ) : null}
      <ArrowUpRight className={styles.openIcon} size={13} aria-hidden />
    </Link>
  );
}

export function PdcaDiagram({ locale = "tr" }: DiagramProps) {
  const text = copy[locale];
  const id = useId().replace(/:/g, "");
  const arrowId = `${id}-pdca-arrow`;
  const captionId = `${id}-pdca-caption`;

  return (
    <figure
      className={`${styles.diagram} ${styles.pdca}`}
      lang={locale}
      aria-label={text.pdcaLabel}
      aria-describedby={captionId}
    >
      <div className={styles.systemHeader}>
        <span>
          <Scan size={17} aria-hidden />
          {text.system}
        </span>
        <Link
          href="/iso-2026/4.3"
          className={styles.scopeLink}
          aria-label={`${text.scope} — ${text.clause} 4.3`}
        >
          {text.scope}
          <b>4.3</b>
          <ArrowUpRight size={13} aria-hidden />
        </Link>
      </div>

      <div className={styles.pdcaLayout}>
        <div
          className={`${styles.rail} ${styles.inputs}`}
          role="group"
          aria-label={text.inputs}
        >
          <span className={styles.railLabel}>{text.inputs}</span>
          <ClauseLink
            locale={locale}
            code="4"
            label={text.context}
            icon={Compass}
          />
          <ClauseLink
            locale={locale}
            code="8.2"
            label={text.requirements}
            icon={ClipboardCheck}
          />
          <ClauseLink
            locale={locale}
            code="4.2"
            label={text.parties}
            icon={UsersRound}
          />
          <ArrowRight className={styles.incomingArrow} size={21} aria-hidden />
        </div>

        <div className={styles.cycle} role="group" aria-label={text.continuous}>
          <svg
            viewBox="0 0 600 470"
            className={styles.cycleDrawing}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker
                id={arrowId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 1 1 L 9 5 L 1 9 Z" className={styles.arrowHead} />
              </marker>
            </defs>
            <ellipse
              cx="300"
              cy="235"
              rx="185"
              ry="176"
              className={styles.cycleTrack}
            />
            <ellipse
              cx="300"
              cy="235"
              rx="92"
              ry="88"
              className={styles.centerHalo}
            />
            <path
              d="M 300 148 V 117 M 392 235 H 426 M 300 323 V 354 M 208 235 H 174"
              className={styles.spokes}
            />
            <path
              d="M 120 202 C 128 177 138 160 155 145 C 181 106 209 75 246 63"
              className={styles.planArc}
              markerMid={`url(#${arrowId})`}
            />
            <path
              d="M 354 63 C 385 72 417 92 435 115 C 461 145 473 173 480 202"
              className={styles.doArc}
              markerMid={`url(#${arrowId})`}
            />
            <path
              d="M 480 268 C 470 311 450 339 435 355 C 413 377 382 398 354 407"
              className={styles.checkArc}
              markerMid={`url(#${arrowId})`}
            />
            <path
              d="M 246 407 C 212 398 184 381 165 355 C 142 327 126 299 120 268"
              className={styles.actArc}
              markerMid={`url(#${arrowId})`}
            />
          </svg>

          <ClauseLink
            locale={locale}
            code="6"
            label={text.planning}
            phase={text.plan}
            icon={Compass}
            className={styles.planNode}
          />

          <div className={styles.doGroup}>
            <span className={styles.doLabel}>{text.do}</span>
            <div>
              <ClauseLink
                locale={locale}
                code="7"
                label={text.support}
                icon={Layers3}
                className={styles.doNode}
              />
              <ClauseLink
                locale={locale}
                code="8"
                label={text.operation}
                icon={Cog}
                className={styles.doNode}
              />
            </div>
          </div>

          <ClauseLink
            locale={locale}
            code="5"
            label={text.leadership}
            phase={text.center}
            icon={UsersRound}
            className={styles.leadershipNode}
          />
          <ClauseLink
            locale={locale}
            code="9"
            label={text.evaluation}
            phase={text.check}
            icon={ChartNoAxesCombined}
            className={styles.checkNode}
          />
          <ClauseLink
            locale={locale}
            code="10"
            label={text.improvement}
            phase={text.act}
            icon={RefreshCcw}
            className={styles.actNode}
          />
        </div>

        <div
          className={`${styles.rail} ${styles.outputs}`}
          role="group"
          aria-label={text.results}
        >
          <span className={styles.railLabel}>{text.results}</span>
          <ArrowRight className={styles.outgoingArrow} size={21} aria-hidden />
          <ClauseLink
            locale={locale}
            code="9.1.2"
            label={text.satisfaction}
            icon={Smile}
          />
          <ClauseLink
            locale={locale}
            code="9"
            label={text.qmsResults}
            icon={Target}
          />
          <ClauseLink
            locale={locale}
            code="8.6"
            label={text.products}
            icon={PackageCheck}
          />
        </div>
      </div>

      <figcaption id={captionId} className={styles.caption}>
        <RefreshCcw size={14} aria-hidden />
        <span>{text.pdcaHint}</span>
      </figcaption>
    </figure>
  );
}

export function ProcessDiagram({ locale = "tr" }: DiagramProps) {
  const text = copy[locale];
  const id = useId().replace(/:/g, "");
  const steps = [
    {
      code: "8.4",
      label: text.source,
      description: text.sourceDescription,
      icon: Waypoints,
      tone: styles.sourceStep,
    },
    {
      code: "4.4",
      label: text.input,
      description: text.inputDescription,
      icon: Layers3,
      tone: styles.inputStep,
    },
    {
      code: "8.1",
      label: text.activity,
      description: text.activityDescription,
      icon: Cog,
      tone: styles.activityStep,
    },
    {
      code: "8.6",
      label: text.output,
      description: text.outputDescription,
      icon: PackageCheck,
      tone: styles.outputStep,
    },
    {
      code: "8.2.1",
      label: text.recipients,
      description: text.recipientsDescription,
      icon: UsersRound,
      tone: styles.recipientStep,
    },
  ];

  return (
    <figure
      className={`${styles.diagram} ${styles.process}`}
      lang={locale}
      aria-label={text.processLabel}
      aria-describedby={`${id}-process-caption`}
    >
      <div className={styles.processHeader}>
        <span>
          <Shapes size={18} aria-hidden />
          {text.process}
        </span>
        <span className={styles.processDirection}>
          <ArrowRight size={15} aria-hidden />
        </span>
      </div>

      <div
        className={styles.processFlow}
        role="group"
        aria-label={text.processLabel}
      >
        {steps.map((step, index) => (
          <div className={styles.processStep} key={step.code}>
            {index === 1 || index === 3 ? (
              <Link
                href={index === 1 ? "/iso-2026/8.1" : "/iso-2026/8.6"}
                className={`${styles.processPoint} ${index === 3 ? styles.endPoint : ""}`}
                aria-label={`${index === 1 ? text.start : text.end} — ${text.clause} ${index === 1 ? "8.1" : "8.6"}`}
              >
                {index === 1 ? (
                  <CircleDot size={13} aria-hidden />
                ) : (
                  <CircleCheck size={13} aria-hidden />
                )}
                {index === 1 ? text.start : text.end}
              </Link>
            ) : null}
            <ClauseLink
              locale={locale}
              code={step.code}
              label={step.label}
              description={step.description}
              icon={step.icon}
              className={`${styles.processCard} ${step.tone}`}
            />
            {index < steps.length - 1 ? (
              <span className={styles.flowConnector} aria-hidden="true">
                <ArrowRight size={19} className={styles.horizontalArrow} />
                <ArrowDown size={19} className={styles.verticalArrow} />
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className={styles.controlsBand}>
        <div className={styles.controlBracket} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>{text.controlDescription}</p>
        <div className={styles.controlLinks}>
          <Link
            href="/iso-2026/9.1.1"
            aria-label={`${text.monitor} — ${text.clause} 9.1.1`}
          >
            <Gauge size={17} aria-hidden />
            <span>{text.monitor}</span>
            <b>9.1.1</b>
            <ArrowUpRight size={13} aria-hidden />
          </Link>
          <Link
            href="/iso-2026/8.1"
            aria-label={`${text.control} — ${text.clause} 8.1`}
          >
            <Settings2 size={17} aria-hidden />
            <span>{text.control}</span>
            <b>8.1</b>
            <ArrowUpRight size={13} aria-hidden />
          </Link>
        </div>
      </div>

      <figcaption id={`${id}-process-caption`} className={styles.caption}>
        <ArrowUpRight size={14} aria-hidden />
        <span>{text.processHint}</span>
      </figcaption>
    </figure>
  );
}
