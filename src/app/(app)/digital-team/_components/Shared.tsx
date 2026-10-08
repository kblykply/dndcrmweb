"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Locale, TeamMember } from "../_lib/types";
import s from "../digital-team.module.css";

export function Modal({
  title,
  onClose,
  busy = false,
  children,
  locale,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  locale: Locale;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={s.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className={s.iconButton}
          aria-label={locale === "tr" ? "Kapat" : "Close"}
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function MemberSelect({
  value,
  onChange,
  members,
  locale,
  label,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  members: TeamMember[];
  locale: Locale;
  label?: string;
}) {
  return (
    <label className={s.field}>
      {label || (locale === "tr" ? "Sorumlu" : "Owner")}
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">
          {locale === "tr" ? "Henüz atanmadı" : "Unassigned"}
        </option>
        {members
          .filter((m) => m.isActive || m.id === value)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {!m.isActive
                ? locale === "tr"
                  ? " (pasif)"
                  : " (inactive)"
                : ""}
            </option>
          ))}
      </select>
    </label>
  );
}

export function SaveActions({
  busy,
  onClose,
  locale,
}: {
  busy: boolean;
  onClose: () => void;
  locale: Locale;
}) {
  return (
    <div className={s.formActions}>
      <button
        type="button"
        className={s.secondary}
        disabled={busy}
        onClick={onClose}
      >
        {locale === "tr" ? "Vazgeç" : "Cancel"}
      </button>
      <button type="submit" className={s.primary} disabled={busy}>
        {busy
          ? locale === "tr"
            ? "Kaydediliyor…"
            : "Saving…"
          : locale === "tr"
            ? "Kaydet"
            : "Save"}
      </button>
    </div>
  );
}
