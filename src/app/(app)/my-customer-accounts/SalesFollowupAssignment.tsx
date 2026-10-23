"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Pencil, UserRoundPlus, X } from "lucide-react";
import type { PaymentTrackingDetail } from "../finance/payment-tracking/_lib/types";
import s from "../finance/payment-tracking/payment-tracking.module.css";

export default function SalesFollowupAssignment({
  data,
  tr,
  disabled,
  error,
  onSave,
  label,
}: {
  data: Pick<PaymentTrackingDetail, "item" | "canAssignFollowup" | "followupAssignees">;
  label?: string;
  tr: boolean;
  disabled: boolean;
  error: string;
  onSave: (
    userId: string | null,
    version: number,
  ) => Promise<boolean | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [version, setVersion] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const t = (a: string, b: string) => (tr ? a : b);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  if (!data.canAssignFollowup) return null;
  return (
    <>
      <button
        type="button"
        className={label ? s.assignmentButton : s.iconButton}
        disabled={disabled}
        title={t("Takip sorumlusu ata", "Assign follow-up owner")}
        aria-label={label ? `${t("Sorumluyu değiştir", "Change owner")}: ${data.item.customerName} — ${label}` : t("Takip sorumlusu ata", "Assign follow-up owner")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setUserId(data.item.followupAssignment?.userId || "");
          setVersion(data.item.followupAssignment?.version ?? 0);
          setOpen(true);
        }}
      >
        {label ? <><span>{label}</span><Pencil size={16} aria-hidden="true" /></> : <UserRoundPlus size={24} aria-hidden="true" />}
      </button>
      <dialog
        ref={dialog}
        id={id}
        className={`${s.dialog} ${s.assignmentDialog}`}
        aria-label={t("Cari takip sorumlusu", "Account follow-up owner")}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div className={s.panelHead}>
          <h2>{t("Cari takip sorumlusu", "Account follow-up owner")}</h2>
          <button
            type="button"
            className={s.iconButton}
            aria-label={t("Kapat", "Close")}
            onClick={() => setOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <p>
          {data.item.customerName} ·{" "}
          {data.item.unitName || data.item.identity.unitCode}
        </p>
        <p>
          {t("Logo satışçısı", "Logo salesperson")}:{" "}
          <strong>{data.item.representatives.join(", ") || "—"}</strong>
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onSave(userId || null, version)) setOpen(false);
          }}
        >
          <label className={s.field}>
            <span>{t("Takip sorumlusu", "Follow-up owner")}</span>
            <select
              aria-label={t("Takip sorumlusu", "Follow-up owner")}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              disabled={disabled}
            >
              <option value="">{t("Atanmamış", "Unassigned")}</option>
              {data.followupAssignees?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {t(
              "Bu müşteri ve dairenin tüm dövizlerdeki cari takibi atanır. Logo satışçısı değişmez.",
              "Assigns follow-up for this customer and unit in all currencies. The Logo salesperson stays unchanged.",
            )}
          </p>
          {data.item.followupAssignment?.changedByName && (
            <p>
              {t("Son atayan", "Last assigned by")}:{" "}
              {data.item.followupAssignment.changedByName}
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <button type="submit" className={s.button} disabled={disabled}>
            {t("Kaydet", "Save")}
          </button>
        </form>
      </dialog>
    </>
  );
}
