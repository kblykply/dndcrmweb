"use client";
import { useState } from "react";
import { Modal, MemberSelect, SaveActions } from "./Shared";
import {
  healthLabel,
  kindLabel,
  priorityLabel,
  statusLabel,
} from "../_lib/copy";
import { errorText } from "../_lib/client";
import {
  healthValues,
  priorities,
  projectStatuses,
  recordKinds,
  type Locale,
  type ProjectInput,
  type TeamMember,
} from "../_lib/types";
import s from "../digital-team.module.css";

export default function ProjectForm({
  initial,
  members,
  locale,
  onSubmit,
  onClose,
  title,
}: {
  initial: ProjectInput;
  members: TeamMember[];
  locale: Locale;
  onSubmit: (value: ProjectInput) => Promise<void>;
  onClose: () => void;
  title?: string;
}) {
  const [draft, setDraft] = useState<ProjectInput>(() =>
    structuredClone(initial),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tr = locale === "tr";
  const t = (a: string, b: string) => (tr ? a : b);
  const change = <K extends keyof ProjectInput>(
    key: K,
    value: ProjectInput[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (
      draft.startDate &&
      draft.targetDate &&
      draft.startDate > draft.targetDate
    ) {
      setError(
        t(
          "Hedef tarihi başlangıçtan önce olamaz.",
          "Target date cannot precede the start date.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        progress: draft.kind === "PROCESS" ? null : draft.progress,
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
      title={title || t("Yeni proje / süreç", "New project / process")}
      onClose={onClose}
      busy={busy}
      locale={locale}
    >
      <form onSubmit={submit} className={s.form}>
        <fieldset disabled={busy} className={s.fields}>
          <div className={s.formGrid}>
            <label className={s.field}>
              {t("Kayıt türü", "Record type")}
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    kind: e.target.value as ProjectInput["kind"],
                    progress: e.target.value === "PROCESS" ? null : d.progress,
                  }))
                }
              >
                {recordKinds.map((v) => (
                  <option key={v} value={v}>
                    {kindLabel(v, locale)}
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
                    status: e.target.value as ProjectInput["status"],
                    progress:
                      e.target.value === "COMPLETED" && d.progress !== null
                        ? 100
                        : d.progress,
                  }))
                }
              >
                {projectStatuses.map((v) => (
                  <option key={v} value={v}>
                    {statusLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={s.field}>
            {t("Ad", "Name")}
            <input
              required
              maxLength={160}
              value={draft.name}
              onChange={(e) => change("name", e.target.value)}
              placeholder={t(
                "Proje veya sürecin adı",
                "Project or process name",
              )}
            />
          </label>
          <label className={s.field}>
            {t("Kısa özet", "Summary")}
            <textarea
              rows={3}
              maxLength={5000}
              value={draft.summary}
              onChange={(e) => change("summary", e.target.value)}
              placeholder={t(
                "Ne yapıyoruz, şu an hangi aşamadayız?",
                "What are we working on, and where are we now?",
              )}
            />
          </label>
          <label className={s.field}>
            {t("Amaç / beklenen sonuç", "Purpose / expected outcome")}
            <textarea
              rows={2}
              maxLength={5000}
              value={draft.objective}
              onChange={(e) => change("objective", e.target.value)}
            />
          </label>
          <div className={s.formGrid}>
            <MemberSelect
              value={draft.ownerId}
              onChange={(v) => change("ownerId", v)}
              members={members}
              locale={locale}
              label={t("Ana sorumlu", "Lead owner")}
            />
            <label className={s.field}>
              {t("Öncelik", "Priority")}
              <select
                value={draft.priority}
                onChange={(e) =>
                  change("priority", e.target.value as ProjectInput["priority"])
                }
              >
                {priorities.map((v) => (
                  <option key={v} value={v}>
                    {priorityLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("Başlangıç tarihi", "Start date")}
              <input
                type="date"
                value={draft.startDate || ""}
                onChange={(e) => change("startDate", e.target.value || null)}
              />
            </label>
            <label className={s.field}>
              {t("Hedef tarihi", "Target date")}
              <input
                type="date"
                min={draft.startDate || undefined}
                value={draft.targetDate || ""}
                onChange={(e) => change("targetDate", e.target.value || null)}
              />
            </label>
            <label className={s.field}>
              {t("İşin gidişatı", "Health")}
              <select
                value={draft.health}
                onChange={(e) =>
                  change("health", e.target.value as ProjectInput["health"])
                }
              >
                {healthValues.map((v) => (
                  <option key={v} value={v}>
                    {healthLabel(v, locale)}
                  </option>
                ))}
              </select>
            </label>
            {draft.kind === "PROJECT" ? (
              <label className={s.field}>
                {t("İlerleme (%)", "Progress (%)")}
                <input
                  type="number"
                  min={draft.status === "COMPLETED" ? 100 : 0}
                  max={100}
                  step={1}
                  value={draft.progress ?? ""}
                  onChange={(e) =>
                    change(
                      "progress",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  placeholder={t("Belirtilmedi", "Not specified")}
                />
                <small>
                  {t(
                    "Elle girilir. Tamamlanan projelerde 100 olmalı veya boş bırakılmalı.",
                    "Entered manually. Completed projects must be 100 or left blank.",
                  )}
                </small>
              </label>
            ) : (
              <label className={s.field}>
                {t("Çalışma sıklığı", "Cadence")}
                <input
                  maxLength={160}
                  value={draft.cadence}
                  onChange={(e) => change("cadence", e.target.value)}
                  placeholder={t(
                    "Örn. günlük kontrol, haftalık raporlama",
                    "e.g. daily review, weekly reporting",
                  )}
                />
              </label>
            )}
          </div>
          <label className={s.field}>
            {t("Sonraki adım", "Next step")}
            <textarea
              rows={2}
              maxLength={2000}
              value={draft.nextStep}
              onChange={(e) => change("nextStep", e.target.value)}
            />
          </label>
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
