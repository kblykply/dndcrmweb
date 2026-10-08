"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import s from "../organization.module.css";

export default function Modal({ title, closeLabel, onClose, children }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={s.modal} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-label={title}>
    <div className={s.modalHeader}><h2>{title}</h2><button type="button" className={s.iconButton} title={closeLabel} aria-label={closeLabel} onClick={onClose}><X size={18} /></button></div>
    {children}
  </dialog>;
}
