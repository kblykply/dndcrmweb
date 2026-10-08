"use client";
import { useState, type FormEvent } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { Modal, SaveActions } from "../../digital-team/_components/Shared";
import { FilePicker } from "./Attachments";
import { errorText } from "../_lib/client";
import {
  categoryLabel,
  emptyTicket,
  impactLabel,
  typeLabel,
  urgencyLabel,
} from "../_lib/model";
import {
  categories,
  impacts,
  ticketTypes,
  urgencies,
  type CreateTicket,
  type Locale,
  type TicketDetail,
  type TicketType,
} from "../_lib/types";
import s from "../support.module.css";
export default function CreateTicketForm({
  locale,
  initialType = "INCIDENT",
  onCreated,
  onClose,
}: {
  locale: Locale;
  initialType?: TicketType;
  onCreated: (detail: TicketDetail) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CreateTicket>(() => ({
    ...emptyTicket(),
    type: initialType,
  }));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!draft.subject.trim() || !draft.description.trim()) {
      setError(
        t("Konu ve açıklamayı doldur.", "Enter a subject and description."),
      );
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.append("payload", JSON.stringify(draft));
      files.forEach((file) => data.append("files", file));
      const detail = (await authedFetch("/it-support/tickets", {
        method: "POST",
        body: data,
      })) as TicketDetail;
      onCreated(detail);
      onClose();
    } catch (err) {
      setError(errorText(err, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={t("Yeni IT talebi", "New IT ticket")}
      locale={locale}
      onClose={onClose}
      busy={busy}
    >
      <form className={s.form} onSubmit={submit}>
        <p className={s.muted}>
          {t(
            "Talebini sen ve IT destek yöneticileri görebilir. Gelişmeleri bu kayıt üzerinden takip edebilirsin.",
            "Your ticket is visible to you and IT support administrators. Follow progress from this record.",
          )}
        </p>
        <fieldset disabled={busy} className={s.fields}>
          <div className={s.formGrid}>
            <label className={s.field}>
              {t("Talep türü", "Ticket type")}
              <select
                aria-label={t("Talep türü", "Ticket type")}
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    type: e.target.value as CreateTicket["type"],
                  }))
                }
              >
                {ticketTypes.map((v) => (
                  <option key={v} value={v}>
                    {typeLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("Kategori", "Category")}
              <select
                aria-label={t("Kategori", "Category")}
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    category: e.target.value as CreateTicket["category"],
                  }))
                }
              >
                {categories.map((v) => (
                  <option key={v} value={v}>
                    {categoryLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={s.field}>
            {t("Konu", "Subject")}
            <input
              maxLength={160}
              required
              value={draft.subject}
              onChange={(e) =>
                setDraft((d) => ({ ...d, subject: e.target.value }))
              }
              placeholder={t(
                "Kısaca yaşadığın sorun veya ihtiyacın",
                "Briefly describe the issue or request",
              )}
            />
          </label>
          <label className={s.field}>
            {t("Açıklama", "Description")}
            <textarea
              required
              maxLength={10000}
              rows={5}
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder={t(
                "Ne yapmak istiyorsun? Ne oluyor? Varsa hata mesajını, ne zaman başladığını ve denediğin adımları yaz.",
                "What are you trying to do? What happens? Include the error message, when it started and what you have tried.",
              )}
            />
          </label>
          <div className={s.formGrid}>
            <label className={s.field}>
              {t("Uygulama / cihaz", "Application / device")}
              <input
                maxLength={160}
                value={draft.system}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, system: e.target.value }))
                }
                placeholder={t(
                  "Örn. CRM, bilgisayar, yazıcı",
                  "e.g. CRM, computer, printer",
                )}
              />
            </label>
            <label className={s.field}>
              {t("Ofis / konum", "Office / location")}
              <input
                maxLength={160}
                value={draft.location}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, location: e.target.value }))
                }
              />
            </label>
            <label className={s.field}>
              {t("Kim etkileniyor?", "Who is affected?")}
              <select
                aria-label={t("Kim etkileniyor?", "Who is affected?")}
                value={draft.impact}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    impact: e.target.value as CreateTicket["impact"],
                  }))
                }
              >
                {impacts.map((v) => (
                  <option key={v} value={v}>
                    {impactLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("İşine etkisi", "Effect on your work")}
              <select
                aria-label={t("İşine etkisi", "Effect on your work")}
                value={draft.urgency}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    urgency: e.target.value as CreateTicket["urgency"],
                  }))
                }
              >
                {urgencies.map((v) => (
                  <option key={v} value={v}>
                    {urgencyLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <FilePicker
            files={files}
            onChange={setFiles}
            locale={locale}
            disabled={busy}
          />
        </fieldset>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <SaveActions busy={busy} onClose={onClose} locale={locale} />
      </form>
    </Modal>
  );
}
