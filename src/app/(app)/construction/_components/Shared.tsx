"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  History as HistoryIcon,
  Info,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { getAuthSessionVersion } from "@/lib/auth";
import {
  amount,
  canAccess,
  date,
  errorText,
  num,
  useCopy,
  useResource,
} from "../_lib/client";
import type { History } from "../_lib/types";
import type { FinanceReport } from "../../finance/_reports/model";
import s from "../construction.module.css";
export function State({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  const { t } = useCopy();
  return (
    <section className={s.empty} role={error ? "alert" : "status"}>
      {loading
        ? t("Yükleniyor…", "Loading…")
        : error || t("Henüz veri yok.", "No data yet.")}
      {!loading && (
        <button onClick={retry}>
          <RefreshCw size={18} />
          {t("Tekrar dene", "Retry")}
        </button>
      )}
    </section>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <section className={s.empty}>{children}</section>;
}
export function Meter({ value }: { value: number | null }) {
  return (
    <div className={s.meter}>
      <strong>{value === null ? "—" : `%${num(value, 1)}`}</strong>
      <span aria-hidden>
        <i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      </span>
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className={s.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <div className={s.search}>
      {open && (
        <input
          autoFocus
          aria-label={t("Tabloda ara", "Search table")}
          placeholder={t("Ara…", "Search…")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <button
        className={s.icon}
        title={t("Ara", "Search")}
        aria-label={t("Ara", "Search")}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (open) onChange("");
        }}
      >
        {open ? <X size={21} /> : <Search size={21} />}
      </button>
    </div>
  );
}
export function EditButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const { t } = useCopy();
  return (
    <button
      className={s.icon}
      title={label || t("Düzenle", "Edit")}
      aria-label={label || t("Düzenle", "Edit")}
      onClick={onClick}
    >
      <Pencil size={18} />
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useCopy();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className={s.icon}
          disabled={busy}
          aria-label={t("Kapat", "Close")}
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export type Field = {
  key: string;
  label: string;
  type?: "number" | "textarea" | "date" | "select";
  options?: { value: string; label: string }[];
  nullable?: boolean;
  readOnly?: boolean;
};
export function EditDialog({
  title,
  path,
  initial,
  fields,
  onClose,
  onSaved,
  method = "PATCH",
}: {
  title: string;
  path: string;
  initial: Record<string, unknown>;
  fields: Field[];
  onClose: () => void;
  onSaved: (response: { id?: string }) => void | Promise<void>;
  method?: "PATCH" | "POST";
}) {
  const { t } = useCopy();
  const [draft, setDraft] = useState<Record<string, unknown>>({
      ...initial,
      reason: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...draft };
      for (const f of fields)
        if (f.nullable && payload[f.key] === "") payload[f.key] = null;
      const result = await authedFetch("/construction" + path, {
        method,
        body: JSON.stringify(payload),
      });
      await onSaved(result);
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <div className={s.form}>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === "textarea" ? (
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
              ) : f.type === "select" ? (
                <select
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  readOnly={f.readOnly}
                  step="any"
                  required={!f.nullable}
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
          <label className={s.full}>
            {t("Değişiklik gerekçesi", "Reason for change")}
            <textarea
              required
              minLength={3}
              maxLength={1000}
              value={String(draft.reason)}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <footer>
          <button type="button" disabled={busy} onClick={onClose}>
            {t("Vazgeç", "Cancel")}
          </button>
          <button className={s.primary} disabled={busy}>
            {busy ? t("Kaydediliyor…", "Saving…") : t("Kaydet", "Save")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function Export({ report }: { report: FinanceReport }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { tr, t } = useCopy();
  async function download(format: "pdf" | "xlsx") {
    const session = getAuthSessionVersion();
    setBusy(true);
    setError("");
    try {
      const { downloadFinanceReport } =
        await import("../../finance/_reports/download");
      await downloadFinanceReport(
        report,
        format,
        tr,
        () => canAccess() && session === getAuthSessionVersion(),
      );
      setOpen(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={s.icon}
        title={t("Rapor indir", "Download report")}
        aria-label={t("Rapor indir", "Download report")}
        onClick={() => setOpen(true)}
      >
        <Download size={21} />
      </button>
      {open && (
        <Modal
          title={t("Rapor indir", "Download report")}
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <p>{report.title}</p>
          <p className={s.muted}>{report.metadata.join(" · ")}</p>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          <footer>
            <button disabled={busy} onClick={() => void download("pdf")}>
              PDF
            </button>
            <button disabled={busy} onClick={() => void download("xlsx")}>
              Excel
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
export function HistoryButton({
  projectId,
  entityId,
}: {
  projectId: string;
  entityId?: string;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useCopy();
  return (
    <>
      <button
        className={s.icon}
        aria-label={t("İşlem geçmişi", "Activity history")}
        title={t("İşlem geçmişi", "Activity history")}
        onClick={() => setOpen(true)}
      >
        <HistoryIcon size={21} />
      </button>
      {open && (
        <HistoryDialog
          projectId={projectId}
          entityId={entityId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
function HistoryDialog({
  projectId,
  entityId,
  onClose,
}: {
  projectId: string;
  entityId?: string;
  onClose: () => void;
}) {
  const { t } = useCopy();
  const [cursor, setCursor] = useState<string | null>(null);
  const resource = useResource<History>(
    `/projects/${projectId}/history?${new URLSearchParams({ ...(entityId ? { entityId } : {}), ...(cursor ? { cursor } : {}) })}`,
  );
  return (
    <Modal title={t("İşlem geçmişi", "Activity history")} onClose={onClose}>
      {!resource.data ? (
        <State {...resource} retry={() => void resource.reload()} />
      ) : (
        <>
          <div className={s.history}>
            {resource.data.items.length === 0 ? (
              <p>
                {t(
                  "Henüz değişiklik yok. Excel aktarımı başlangıç kaydıdır.",
                  "No changes yet. The Excel import is the baseline.",
                )}
              </p>
            ) : (
              resource.data.items.map((a) => (
                <article key={a.id}>
                  <strong>{a.actorName}</strong>
                  <small>
                    {new Date(a.createdAt).toLocaleString("tr-TR")} ·{" "}
                    {a.entityType}
                  </small>
                  <p>{a.reason}</p>
                  <details>
                    <summary>{t("Değişen değerler", "Changed values")}</summary>
                    <div className={s.tableWrap}>
                      <table>
                        <thead>
                          <tr>
                            <th>{t("Alan", "Field")}</th>
                            <th>{t("Önce", "Before")}</th>
                            <th>{t("Sonra", "After")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(a.after)
                            .filter(
                              ([k, v]) =>
                                JSON.stringify(v) !==
                                JSON.stringify(a.before[k]),
                            )
                            .map(([k, v]) => (
                              <tr key={k}>
                                <td>{k}</td>
                                <td>{String(a.before[k] ?? "—")}</td>
                                <td>{String(v ?? "—")}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </article>
              ))
            )}
          </div>
          {resource.data.nextCursor && (
            <button onClick={() => setCursor(resource.data!.nextCursor)}>
              {t("Daha eski kayıtlar", "Older records")}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
export function Back({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className={s.back} href={href}>
      {children}
      <ChevronRight size={17} />
    </Link>
  );
}
export function InfoButton({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={s.icon}
        title={title}
        aria-label={title}
        onClick={() => setOpen(true)}
      >
        <Info size={21} />
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          {children}
        </Modal>
      )}
    </>
  );
}
export { amount, date };
