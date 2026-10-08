"use client";
import { useState } from "react";
import { Modal, SaveActions } from "./Shared";
import { errorText } from "../_lib/client";
import type { Locale, MemberInput, Person } from "../_lib/types";
import s from "../digital-team.module.css";
export default function MemberForm({
  initial,
  candidates,
  locale,
  onSubmit,
  onClose,
}: {
  initial: MemberInput;
  candidates: Person[];
  locale: Locale;
  onSubmit: (value: MemberInput) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  return (
    <Modal
      title={t("Ekip üyesi", "Team member")}
      locale={locale}
      busy={busy}
      onClose={onClose}
    >
      <form
        className={s.form}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSubmit(draft);
            onClose();
          } catch (err) {
            setError(errorText(err, locale));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className={s.fields}>
          <label className={s.field}>
            {t("CRM kullanıcısı (isteğe bağlı)", "CRM user (optional)")}
            <select
              value={draft.userId || ""}
              onChange={(e) => {
                const user = candidates.find((p) => p.id === e.target.value);
                setDraft((d) => ({
                  ...d,
                  userId: e.target.value || null,
                  name: user?.name || d.name,
                }));
              }}
            >
              <option value="">
                {t("Hesap bağlamadan ekle", "Add without an account")}
              </option>
              {!candidates.some((p) => p.id === draft.userId) &&
                draft.userId && (
                  <option value={draft.userId}>{draft.name}</option>
                )}
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            {t("Ad soyad", "Full name")}
            <input
              required
              maxLength={160}
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </label>
          <label className={s.field}>
            {t("Görev / uzmanlık", "Role / specialty")}
            <input
              maxLength={160}
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </label>
          <label className={s.field}>
            {t("İletişim / not", "Contact / note")}
            <input
              maxLength={240}
              value={draft.contact}
              onChange={(e) =>
                setDraft((d) => ({ ...d, contact: e.target.value }))
              }
            />
          </label>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) =>
                setDraft((d) => ({ ...d, isActive: e.target.checked }))
              }
            />
            {t("Aktif ekip üyesi", "Active team member")}
          </label>
          <p className={s.muted}>
            {t(
              "Üye kaydı iş dağılımı içindir. Modüle erişim şu an yalnızca ADMIN rolündedir. Pasif üyelerin geçmiş sorumlulukları korunur.",
              "Membership tracks responsibilities. Module access is currently ADMIN only. Inactive members retain their historical assignments.",
            )}
          </p>
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
