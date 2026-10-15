"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { ReportFormat } from "./model";
import s from "./reports.module.css";

export type ExportOption = {
  value: string;
  label: string;
  period?: "year" | "month";
};
export default function ExportMenu({
  tr,
  options,
  years = [],
  months = [],
  disabled = false,
  onExport,
}: {
  tr: boolean;
  options: ExportOption[];
  years?: string[];
  months?: string[];
  disabled?: boolean;
  onExport: (
    format: ReportFormat,
    scope: string,
    period: string,
  ) => Promise<void>;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [scope, setScope] = useState(options[0]?.value || "general"),
    [format, setFormat] = useState<ReportFormat>("xlsx"),
    [period, setPeriod] = useState("");
  const selected =
    options.find((option) => option.value === scope) ?? options[0];
  const choices = selected?.period === "year" ? years : months;
  const selectedPeriod = selected?.period
    ? choices.includes(period)
      ? period
      : choices[0] || ""
    : "";
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <div className={s.root}>
      <button
        type="button"
        className={s.icon}
        title={tr ? "Rapor indir" : "Download report"}
        aria-label={tr ? "Rapor indir" : "Download report"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <Download size={24} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        id={id}
        className={s.menu}
        aria-label={tr ? "Rapor indir" : "Download report"}
        onCancel={() => setOpen(false)}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await onExport(format, selected.value, selectedPeriod);
              setOpen(false);
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : tr
                    ? "Rapor hazırlanamadı."
                    : "Report could not be prepared.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {tr ? "Rapor" : "Report"}
            <select
              value={scope}
              disabled={busy}
              onChange={(event) => {
                setScope(event.target.value);
                setPeriod("");
              }}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selected?.period && (
            <label>
              {selected.period === "year"
                ? tr
                  ? "Yıl"
                  : "Year"
                : tr
                  ? "Ay"
                  : "Month"}
              <select
                value={selectedPeriod}
                disabled={busy}
                onChange={(event) => setPeriod(event.target.value)}
              >
                {choices.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {tr ? "Dosya türü" : "File type"}
            <select
              value={format}
              disabled={busy}
              onChange={(event) =>
                setFormat(event.target.value as ReportFormat)
              }
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <div className={s.actions}>
            <button type="button" onClick={() => setOpen(false)}>
              {tr ? "Kapat" : "Close"}
            </button>
            <button
              className={s.primary}
              disabled={busy || (!!selected?.period && !selectedPeriod)}
            >
              {busy
                ? tr
                  ? "Hazırlanıyor…"
                  : "Preparing…"
                : tr
                  ? "İndir"
                  : "Download"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
