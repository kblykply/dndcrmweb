"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import {
  workHelp,
  type WorkHelpArticle,
  type WorkHelpTopic,
} from "../_lib/work-help";
import s from "./work-info.module.css";
import work from "../work.module.css";

export default function WorkInfo({
  topic,
  corner = false,
}: {
  topic: WorkHelpTopic;
  corner?: boolean;
}) {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const article = workHelp[locale][topic];
  const label = `${article.title}: ${locale === "tr" ? "açıklama ve örnek" : "explanation and example"}`;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`${s.trigger} ${corner ? s.corner : ""}`}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-work-info={topic}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <HelpDialog
            article={article}
            locale={locale}
            topic={topic}
            onClose={() => {
              setOpen(false);
              trigger.current?.focus({ preventScroll: true });
            }}
          />,
          document.body,
        )}
    </>
  );
}

function HelpDialog({
  article,
  locale,
  topic,
  onClose,
}: {
  article: WorkHelpArticle;
  locale: "tr" | "en";
  topic: WorkHelpTopic;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const summaryId = useId();
  const closeLabel =
    locale === "tr" ? "Bilgi penceresini kapat" : "Close information";
  const dismiss = () => {
    ref.current?.close();
    onClose();
  };
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      aria-describedby={summaryId}
      data-work-help={topic}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const stops = event.currentTarget.querySelectorAll<HTMLElement>(
          "button, [tabindex='0']",
        );
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        // Portals still bubble through React parents, including forms and cards.
        event.stopPropagation();
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className={s.surface}>
        <header className={s.header}>
          <div>
            <span>
              {locale === "tr"
                ? "İŞ YÖNETİMİ REHBERİ"
                : "WORK MANAGEMENT GUIDE"}
            </span>
            <h2 id={titleId}>{article.title}</h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={dismiss}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div
          className={s.body}
          tabIndex={0}
          role="region"
          aria-label={locale === "tr" ? "Bilgi içeriği" : "Information content"}
        >
          <section>
            <h3>{locale === "tr" ? "Kısaca" : "In brief"}</h3>
            <p id={summaryId}>{article.meaning}</p>
          </section>
          <section className={s.example}>
            <h3>{locale === "tr" ? "Örnek uygulama" : "Worked example"}</h3>
            <ol>
              {article.example.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section>
            <h3>
              {locale === "tr"
                ? "Kurallar ve dikkat edilecekler"
                : "Rules and things to note"}
            </h3>
            <ul>
              {article.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  );
}

// Keep the help button outside the label so opening it never changes a form field.
export function WorkField({
  label,
  topic,
  children,
}: {
  label: ReactNode;
  topic: WorkHelpTopic;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      <label className={work.field}>
        <span className={s.fieldName}>{label}</span>
        {children}
      </label>
      <WorkInfo topic={topic} corner />
    </div>
  );
}
