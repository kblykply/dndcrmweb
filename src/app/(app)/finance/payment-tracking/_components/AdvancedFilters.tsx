"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { AppliedFilterChip, FilterRangeKind } from "../_lib/filter-form";
import { FILTER_DATE_MIN, FILTER_DATE_MAX } from "../_lib/filter-form";
import s from "../filter-form.module.css";

export function AdvancedFilterPanel({
  children,
  tr,
  activeCount,
  defaultOpen = false,
}: {
  children: ReactNode;
  tr: boolean;
  activeCount: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (!defaultOpen) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [defaultOpen]);
  return (
    <details
      className={s.advanced}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={s.toggle}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>{tr ? "Gelişmiş filtreler" : "Advanced filters"}</span>
        {activeCount > 0 && (
          <span className={s.badge}>
            {activeCount} {tr ? "etkin" : "active"}
          </span>
        )}
        <ChevronDown className={s.chevron} size={16} aria-hidden="true" />
      </summary>
      <div className={s.content}>{children}</div>
    </details>
  );
}

export function FilterGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={s.group}>
      <legend>{title}</legend>
      {description && <p className={s.hint}>{description}</p>}
      <div className={s.fields}>{children}</div>
    </fieldset>
  );
}

export function FilterRangeFields({
  label,
  from,
  to,
  kind,
  tr,
  error,
  disabled = false,
  onChange,
}: {
  label: string;
  from: string;
  to: string;
  kind: FilterRangeKind;
  tr: boolean;
  error?: string | null;
  disabled?: boolean;
  onChange: (from: string, to: string) => void;
}) {
  const errorId = useId();
  const startLabel =
    kind === "date" ? (tr ? "Başlangıç" : "From") : tr ? "En düşük" : "Minimum";
  const endLabel =
    kind === "date" ? (tr ? "Bitiş" : "To") : tr ? "En yüksek" : "Maximum";
  return (
    <fieldset className={s.range} disabled={disabled}>
      <legend>{label}</legend>
      <div className={s.rangeInputs}>
        {(
          [
            [startLabel, from, (next: string) => onChange(next, to)],
            [endLabel, to, (next: string) => onChange(from, next)],
          ] as const
        ).map(([boundLabel, value, update]) => (
          <label key={boundLabel}>
            <span>{boundLabel}</span>
            <input
              type={kind === "date" ? "date" : "text"}
              min={kind === "date" ? FILTER_DATE_MIN : undefined}
              max={kind === "date" ? FILTER_DATE_MAX : undefined}
              inputMode={
                kind === "days"
                  ? "numeric"
                  : kind === "amount"
                    ? "decimal"
                    : undefined
              }
              aria-label={`${label} · ${boundLabel}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={value}
              maxLength={kind === "date" ? undefined : 24}
              onChange={(event) => update(event.target.value)}
            />
          </label>
        ))}
      </div>
      {error && (
        <p className={s.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function ActiveFilterChips({
  chips,
  tr,
  disabled,
  onRemove,
  onClear,
}: {
  chips: AppliedFilterChip[];
  tr: boolean;
  disabled?: boolean;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div
      className={s.applied}
      aria-label={tr ? "Uygulanan filtreler" : "Applied filters"}
    >
      <span className={s.appliedLabel}>
        {tr ? "Etkin filtreler" : "Active filters"}
      </span>
      <ul className={s.chips}>
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              className={s.chip}
              type="button"
              disabled={disabled}
              onClick={() => onRemove(chip.key)}
              aria-label={`${tr ? "Filtreyi kaldır" : "Remove filter"}: ${chip.label} · ${chip.value}`}
            >
              <span>
                {chip.label}: <strong>{chip.value}</strong>
              </span>
              <X size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={s.clear}
        disabled={disabled}
        onClick={onClear}
      >
        {tr ? "Filtreleri temizle" : "Clear filters"}
      </button>
    </div>
  );
}
