"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Modal, MemberSelect, SaveActions } from "./Shared";
import { errorText } from "../_lib/client";
import {
  factorImpactLabel,
  linkKindLabel,
  workstreamStatusLabel,
} from "../_lib/copy";
import { safeUrl } from "../_lib/model";
import {
  factorImpacts,
  linkKinds,
  workstreamStatuses,
  type ExternalFactor,
  type Locale,
  type ProjectLink,
  type TeamMember,
  type Workstream,
} from "../_lib/types";
import s from "../digital-team.module.css";

type FormProps<T> = {
  initial: T;
  members: TeamMember[];
  locale: Locale;
  onSubmit: (value: T) => Promise<void>;
  onClose: () => void;
  isNew: boolean;
};

function FormShell({
  title,
  locale,
  onClose,
  submit,
  children,
}: {
  title: string;
  locale: Locale;
  onClose: () => void;
  submit: () => Promise<void>;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submit();
      onClose();
    } catch (err) {
      setError(errorText(err, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} locale={locale} onClose={onClose} busy={busy}>
      <form className={s.form} onSubmit={save}>
        <fieldset disabled={busy} className={s.fields}>
          {children}
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

export function WorkstreamForm({
  initial,
  members,
  locale,
  onSubmit,
  onClose,
  isNew,
}: FormProps<Workstream>) {
  const [draft, setDraft] = useState(() => ({ ...initial }));
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  return (
    <FormShell
      title={
        isNew
          ? t("İş parçası ekle", "Add workstream")
          : t("İş parçasını düzenle", "Edit workstream")
      }
      locale={locale}
      onClose={onClose}
      submit={async () => {
        if (!draft.title.trim())
          throw new Error(
            t("İş parçasına bir ad verin.", "Give the workstream a name."),
          );
        await onSubmit({ ...draft, title: draft.title.trim() });
      }}
    >
      <label className={s.field}>
        {t("İş parçası", "Workstream")}
        <input
          required
          maxLength={160}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
      </label>
      <label className={s.field}>
        {t("Kapsam / sorumluluk", "Scope / responsibility")}
        <textarea
          rows={4}
          maxLength={2000}
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
        />
      </label>
      <div className={s.formGrid}>
        <MemberSelect
          value={draft.ownerId}
          onChange={(ownerId) => setDraft((d) => ({ ...d, ownerId }))}
          members={members}
          locale={locale}
        />
        <label className={s.field}>
          {t("Durum", "Status")}
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                status: e.target.value as Workstream["status"],
              }))
            }
          >
            {workstreamStatuses.map((value) => (
              <option key={value} value={value}>
                {workstreamStatusLabel(value, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          {t("Hedef tarihi", "Target date")}
          <input
            type="date"
            value={draft.targetDate || ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, targetDate: e.target.value || null }))
            }
          />
        </label>
      </div>
    </FormShell>
  );
}

export function FactorForm({
  initial,
  members,
  locale,
  onSubmit,
  onClose,
  isNew,
}: FormProps<ExternalFactor>) {
  const [draft, setDraft] = useState(() => ({ ...initial }));
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  return (
    <FormShell
      title={
        isNew
          ? t("Dış faktör ekle", "Add external factor")
          : t("Dış faktörü düzenle", "Edit external factor")
      }
      locale={locale}
      onClose={onClose}
      submit={async () => {
        if (!draft.title.trim())
          throw new Error(
            t("Dış faktöre bir ad verin.", "Give the external factor a name."),
          );
        if (draft.url.trim() && !safeUrl(draft.url))
          throw new Error(
            t(
              "Geçerli bir http:// veya https:// bağlantısı girin.",
              "Enter a valid http:// or https:// link.",
            ),
          );
        await onSubmit({
          ...draft,
          title: draft.title.trim(),
          url: draft.url.trim(),
        });
      }}
    >
      <label className={s.field}>
        {t("Konu / bağımlılık", "Issue / dependency")}
        <input
          required
          maxLength={160}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
      </label>
      <label className={s.field}>
        {t(
          "Kaynak kişi / kurum / sistem",
          "Source person / organization / system",
        )}
        <input
          maxLength={160}
          value={draft.source}
          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
        />
      </label>
      <div className={s.formGrid}>
        <label className={s.field}>
          {t("Etkisi", "Impact")}
          <select
            value={draft.impact}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                impact: e.target.value as ExternalFactor["impact"],
              }))
            }
          >
            {factorImpacts.map((value) => (
              <option key={value} value={value}>
                {factorImpactLabel(value, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          {t("Durum", "Status")}
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                status: e.target.value as ExternalFactor["status"],
              }))
            }
          >
            <option value="OPEN">{t("Açık", "Open")}</option>
            <option value="RESOLVED">{t("Çözüldü", "Resolved")}</option>
          </select>
        </label>
        <MemberSelect
          value={draft.ownerId}
          onChange={(ownerId) => setDraft((d) => ({ ...d, ownerId }))}
          members={members}
          locale={locale}
        />
        <label className={s.field}>
          {t("Takip tarihi", "Follow-up date")}
          <input
            type="date"
            value={draft.targetDate || ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, targetDate: e.target.value || null }))
            }
          />
        </label>
      </div>
      <label className={s.field}>
        {t("Sonraki adım", "Next action")}
        <textarea
          rows={3}
          maxLength={2000}
          value={draft.nextAction}
          onChange={(e) =>
            setDraft((d) => ({ ...d, nextAction: e.target.value }))
          }
        />
      </label>
      <label className={s.field}>
        {t("Notlar", "Notes")}
        <textarea
          rows={3}
          maxLength={2000}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        />
      </label>
      <label className={s.field}>
        {t("İlgili bağlantı", "Related link")}
        <input
          type="url"
          maxLength={2048}
          value={draft.url}
          placeholder="https://…"
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
        />
      </label>
    </FormShell>
  );
}

export function LinkForm({
  initial,
  locale,
  onSubmit,
  onClose,
  isNew,
}: Omit<FormProps<ProjectLink>, "members">) {
  const [draft, setDraft] = useState(() => ({ ...initial }));
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  return (
    <FormShell
      title={
        isNew
          ? t("Bağlantı ekle", "Add link")
          : t("Bağlantıyı düzenle", "Edit link")
      }
      locale={locale}
      onClose={onClose}
      submit={async () => {
        if (!draft.label.trim())
          throw new Error(
            t("Bağlantıya bir ad verin.", "Give the link a name."),
          );
        if (!safeUrl(draft.url))
          throw new Error(
            t(
              "Geçerli bir http:// veya https:// bağlantısı girin.",
              "Enter a valid http:// or https:// link.",
            ),
          );
        await onSubmit({
          ...draft,
          label: draft.label.trim(),
          url: draft.url.trim(),
        });
      }}
    >
      <label className={s.field}>
        {t("Bağlantı adı", "Link name")}
        <input
          required
          maxLength={160}
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
        />
      </label>
      <label className={s.field}>
        {t("Tür", "Kind")}
        <select
          value={draft.kind}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              kind: e.target.value as ProjectLink["kind"],
            }))
          }
        >
          {linkKinds.map((value) => (
            <option key={value} value={value}>
              {linkKindLabel(value, locale)}
            </option>
          ))}
        </select>
      </label>
      <label className={s.field}>
        URL
        <input
          required
          type="url"
          maxLength={2048}
          value={draft.url}
          placeholder="https://…"
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
        />
      </label>
    </FormShell>
  );
}

export function ConfirmForm({
  title,
  message,
  action,
  locale,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  action: string;
  locale: Locale;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onConfirm();
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
        <p>{message}</p>
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
            {locale === "tr" ? "Vazgeç" : "Cancel"}
          </button>
          <button type="submit" className={s.primary} disabled={busy}>
            {busy ? (locale === "tr" ? "Kaydediliyor…" : "Saving…") : action}
          </button>
        </div>
      </form>
    </Modal>
  );
}
