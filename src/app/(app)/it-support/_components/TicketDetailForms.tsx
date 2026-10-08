"use client";
import { useState, type FormEvent } from "react";
import { Modal, SaveActions } from "../../digital-team/_components/Shared";
import { errorText } from "../_lib/client";
import { categoryLabel, priorityLabel, statusLabel } from "../_lib/model";
import {
  categories,
  priorities,
  type Locale,
  type Person,
  type Ticket,
  type TicketAction,
  type TicketStatus,
  type TriageInput,
} from "../_lib/types";
import s from "../support.module.css";

function dateInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

export function TriageForm({
  ticket,
  agents,
  allowedStatuses,
  locale,
  onSubmit,
  onClose,
}: {
  ticket: Ticket;
  agents: Person[];
  allowedStatuses: TicketStatus[];
  locale: Locale;
  onSubmit: (input: TriageInput) => Promise<void>;
  onClose: () => void;
}) {
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const [draft, setDraft] = useState<TriageInput>({
    version: ticket.version,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    assigneeId: ticket.assignee?.id || null,
    dueAt: ticket.dueAt,
    reason: "",
  });
  const [due, setDue] = useState(() => dateInput(ticket.dueAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const statusOptions = [...new Set([ticket.status, ...allowedStatuses])];
  const statusChanged = draft.status !== ticket.status;
  const requiresReason =
    statusChanged &&
    (["WAITING_REQUESTER", "WAITING_VENDOR", "RESOLVED", "CANCELLED"].includes(
      draft.status,
    ) ||
      (["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status) &&
        draft.status === "IN_PROGRESS"));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (requiresReason && !draft.reason.trim()) {
      setError(
        t(
          "Bu durum değişikliğinin açıklamasını yazın. Açıklama talebi açan kişiyle paylaşılacak.",
          "Explain this status change. The explanation will be shared with the requester.",
        ),
      );
      return;
    }
    const parsed = due ? new Date(due) : null;
    if (parsed && Number.isNaN(parsed.getTime())) {
      setError(
        t(
          "Geçerli bir hedef tarih ve saat girin.",
          "Enter a valid target date and time.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...draft,
        dueAt:
          due === dateInput(draft.dueAt)
            ? draft.dueAt
            : parsed?.toISOString() || null,
        reason: draft.reason.trim(),
      });
      onClose();
    } catch (err) {
      setError(errorText(err, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={t("Talebi yönet", "Manage ticket")}
      locale={locale}
      busy={busy}
      onClose={onClose}
    >
      <form className={s.form} onSubmit={submit}>
        <fieldset className={s.fields} disabled={busy}>
          <div className={s.formGrid}>
            <label className={s.field}>
              {t("Durum", "Status")}
              <select
                aria-label={t("Durum", "Status")}
                value={draft.status}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    status: event.target.value as TicketStatus,
                  }))
                }
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("IT önceliği", "IT priority")}
              <select
                aria-label={t("IT önceliği", "IT priority")}
                value={draft.priority}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    priority: event.target.value as TriageInput["priority"],
                  }))
                }
              >
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {priorityLabel(value, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("Kategori", "Category")}
              <select
                aria-label={t("Kategori", "Category")}
                value={draft.category}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    category: event.target.value as TriageInput["category"],
                  }))
                }
              >
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabel(value, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("IT sorumlusu", "IT assignee")}
              <select
                aria-label={t("IT sorumlusu", "IT assignee")}
                value={draft.assigneeId || ""}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    assigneeId: event.target.value || null,
                  }))
                }
              >
                <option value="">{t("Henüz atanmadı", "Unassigned")}</option>
                {ticket.assignee &&
                  !agents.some((agent) => agent.id === ticket.assignee!.id) && (
                    <option value={ticket.assignee.id} disabled>
                      {ticket.assignee.name} ·{" "}
                      {t("mevcut atama", "current assignment")}
                    </option>
                  )}
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={s.field}>
            {t("Planlanan hedef tarih / saat", "Planned target date / time")}
            <input
              aria-label={t(
                "Planlanan hedef tarih / saat",
                "Planned target date / time",
              )}
              type="datetime-local"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
            <small>
              {t(
                "IT ekibinin planladığı hedef zamandır; gerektiğinde güncellenebilir.",
                "The target time planned by IT; it can be updated when needed.",
              )}
            </small>
          </label>
          <label className={s.field}>
            {t("Talep sahibine açıklama", "Explanation for the requester")}
            {requiresReason ? " *" : ""}
            <textarea
              aria-label={t(
                "Talep sahibine açıklama",
                "Explanation for the requester",
              )}
              required={requiresReason}
              maxLength={5000}
              rows={4}
              value={draft.reason}
              onChange={(event) =>
                setDraft((value) => ({ ...value, reason: event.target.value }))
              }
              placeholder={t(
                "Neden bekliyor, ne yapıldı veya hangi bilgi gerekiyor?",
                "Why is this waiting, what was done, or what information is needed?",
              )}
            />
            <small>
              {t(
                "Buraya yazdıklarınız talebi açan kişi tarafından görülebilir. İç not için yazışmadaki İç not seçeneğini kullanın.",
                "The requester can see this explanation. Use Internal note in the conversation for private notes.",
              )}
            </small>
          </label>
        </fieldset>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <SaveActions busy={busy} onClose={onClose} locale={locale} />
      </form>
    </Modal>
  );
}

export function TicketActionForm({
  action,
  ticket,
  locale,
  onSubmit,
  onClose,
}: {
  action: TicketAction;
  ticket: Ticket;
  locale: Locale;
  onSubmit: (input: {
    version: number;
    action: TicketAction;
    message: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const [version] = useState(ticket.version);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title =
    action === "CONFIRM"
      ? t("Çözümü onayla", "Confirm resolution")
      : action === "REOPEN"
        ? t("Talebi yeniden aç", "Reopen ticket")
        : t("Talebi iptal et", "Cancel ticket");
  const explanation =
    action === "CONFIRM"
      ? t(
          "Sorunun çözüldüğünü onayladığınızda talep kapatılacak.",
          "Confirming the resolution will close this ticket.",
        )
      : action === "REOPEN"
        ? t(
            "Sorunun neden devam ettiğini açıklayın. Talep yeniden IT ekibinin takibine alınacak.",
            "Explain why the issue persists. The ticket will return to the IT team's queue.",
          )
        : t(
            "Talebe artık ihtiyaç kalmadıysa iptal nedenini yazın. Yazışmalar ve ekler korunur.",
            "If this request is no longer needed, explain why you are cancelling it. Its conversation and attachments will be retained.",
          );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (action !== "CONFIRM" && !message.trim()) {
      setError(
        t("Lütfen bir açıklama yazın.", "Please provide an explanation."),
      );
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ version, action, message: message.trim() });
      onClose();
    } catch (err) {
      setError(errorText(err, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} locale={locale} onClose={onClose} busy={busy}>
      <form className={s.form} onSubmit={submit}>
        <p>{explanation}</p>
        <fieldset className={s.fields} disabled={busy}>
          <label className={s.field}>
            {action === "CONFIRM"
              ? t("Notunuz (isteğe bağlı)", "Your note (optional)")
              : t("Açıklama", "Explanation")}
            <textarea
              rows={4}
              maxLength={5000}
              required={action !== "CONFIRM"}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
        </fieldset>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <div className={s.formActions}>
          <button
            type="button"
            className={s.secondary}
            disabled={busy}
            onClick={onClose}
          >
            {t("Vazgeç", "Back")}
          </button>
          <button type="submit" className={s.primary} disabled={busy}>
            {busy ? t("Kaydediliyor…", "Saving…") : title}
          </button>
        </div>
      </form>
    </Modal>
  );
}
