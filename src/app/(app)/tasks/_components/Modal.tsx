"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import s from "../work.module.css";
export default function Modal({
  title,
  closeLabel,
  onClose,
  children,
  help,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  help?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.modal}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={s.modalHeader}>
        <div className={s.helpHeading}>
          <h2>{title}</h2>
          {help}
        </div>
        <button
          type="button"
          className={s.iconButton}
          title={closeLabel}
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
