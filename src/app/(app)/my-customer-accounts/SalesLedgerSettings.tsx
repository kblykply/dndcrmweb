"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Settings2, X } from "lucide-react";
import SalesLedgerMappings from "./SalesLedgerMappings";
import s from "../finance/payment-tracking/payment-tracking.module.css";

export default function SalesLedgerSettings({
  tr,
  onSaved,
}: {
  tr: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const label = tr ? "Satışçı eşleştirmeleri" : "Salesperson mappings";
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
        <Settings2 size={24} aria-hidden="true" />
      </button>
      <dialog
        id={id}
        ref={dialog}
        className={`${s.dialog} ${s.mappingDialog}`}
        aria-label={label}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div className={s.actions} style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className={s.iconButton}
            aria-label={tr ? "Kapat" : "Close"}
            onClick={() => setOpen(false)}
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        {open && <SalesLedgerMappings onSaved={onSaved} />}
      </dialog>
    </>
  );
}
