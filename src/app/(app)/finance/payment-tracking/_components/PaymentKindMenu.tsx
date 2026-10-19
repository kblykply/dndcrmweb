"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Layers3, X } from "lucide-react";
import PaymentKindSummary from "./PaymentKindSummary";
import type { PaymentKind, PaymentTrackingDetail } from "../_lib/types";
import s from "../payment-tracking.module.css";

export default function PaymentKindMenu({
  data,
  tr,
  onSelect,
}: {
  data: PaymentTrackingDetail;
  tr: boolean;
  onSelect: (kind: PaymentKind | "all", currency: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const label = tr ? "Ödeme türleri" : "Payment types";
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={s.iconButton}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
      >
        <Layers3 size={24} aria-hidden="true" />
      </button>
      <dialog
        id={id}
        ref={dialog}
        className={`${s.dialog} ${s.mappingDialog}`}
        aria-label={label}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div
          className={s.actions}
          style={{ justifyContent: "flex-end", marginBottom: 12 }}
        >
          <button
            type="button"
            className={s.iconButton}
            aria-label={tr ? "Kapat" : "Close"}
            onClick={() => setOpen(false)}
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        {open && (
          <PaymentKindSummary
            data={data}
            tr={tr}
            onSelect={(kind, currency) => {
              dialog.current?.close();
              setOpen(false);
              onSelect(kind, currency);
            }}
          />
        )}
      </dialog>
    </>
  );
}
