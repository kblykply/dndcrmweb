"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import type { PaymentTrackingRow } from "../_lib/types";
import { closureWarning } from "../_lib/closure-check";
import s from "../payment-tracking.module.css";

export default function ClosureWarningDialog({ item, href, tr, onClose }: {
  item: PaymentTrackingRow;
  href: string;
  tr: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className={`${s.dialog} ${s.closureDialog}`} role="alertdialog"
    aria-labelledby="closure-warning-title" aria-describedby="closure-warning-message"
    onCancel={onClose}>
    <h2 id="closure-warning-title"><AlertTriangle size={24} aria-hidden="true" />
      {tr ? "Cari işlemleri kapalı" : "Account actions blocked"}
    </h2>
    <p className={s.closureCustomer}>{item.customerName || item.identity.customerCode} · {item.unitName || item.identity.unitCode}</p>
    <p id="closure-warning-message">{closureWarning(item, tr)}</p>
    <div className={s.dialogFooter}>
      <Link className={s.button} href={href}>{tr ? "Cariyi incele" : "View account"}</Link>
      <button type="button" className={s.primary} autoFocus onClick={onClose}>{tr ? "Anladım" : "Understood"}</button>
    </div>
  </dialog>;
}
