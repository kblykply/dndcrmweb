"use client";
/* Authenticated screenshots use temporary blob URLs. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Paperclip, X } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { Modal } from "../../digital-team/_components/Shared";
import { errorText } from "../_lib/client";
import { formatBytes } from "../_lib/model";
import type { Attachment, Locale } from "../_lib/types";
import s from "../support.module.css";
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.txt";

export function FilePicker({
  files,
  onChange,
  locale,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  locale: Locale;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  function add(incoming: File[]) {
    if (files.length + incoming.length > MAX_FILES) {
      setError(
        t(
          "Tek seferde en fazla 3 dosya ekleyebilirsin.",
          "You can attach up to 3 files per submission.",
        ),
      );
      return;
    }
    if (incoming.some((f) => !f.size || f.size > MAX_FILE_BYTES)) {
      setError(
        t(
          "Dosyalar boş olmamalı ve her biri en fazla 5 MB olmalı.",
          "Files must not be empty and must be at most 5 MB each.",
        ),
      );
      return;
    }
    if (incoming.some((f) => !/\.(png|jpe?g|webp|pdf|txt)$/i.test(f.name))) {
      setError(
        t(
          "PNG, JPG, WebP, PDF veya TXT dosyası seç.",
          "Choose a PNG, JPG, WebP, PDF or TXT file.",
        ),
      );
      return;
    }
    setError("");
    onChange([...files, ...incoming]);
  }
  return (
    <div className={s.filePicker}>
      <div className={s.filePickerTop}>
        <span>
          <Paperclip size={16} />
          {t("Ekran görüntüsü / dosya", "Screenshot / file")}
        </span>
        <button
          type="button"
          className={s.secondary}
          onClick={() => input.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
        >
          {t("Dosya ekle", "Add files")}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        hidden
        aria-label={t("Ek dosyaları seç", "Select attachments")}
        disabled={disabled}
        onChange={(e) => {
          add(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <small className={s.muted}>
        {t(
          "En fazla 3 dosya · dosya başına 5 MB · PNG, JPG, WebP, PDF, TXT",
          "Up to 3 files · 5 MB each · PNG, JPG, WebP, PDF, TXT",
        )}
      </small>
      {files.map((file, index) => (
        <div className={s.fileRow} key={`${file.name}-${index}`}>
          <FileText size={16} />
          <span>
            {file.name}
            <small>{formatBytes(file.size)}</small>
          </span>
          <button
            className={s.iconButton}
            type="button"
            disabled={disabled}
            aria-label={`${t("Kaldır", "Remove")}: ${file.name}`}
            onClick={() => onChange(files.filter((_, i) => i !== index))}
          >
            <X size={15} />
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Attachments({
  files,
  locale,
}: {
  files: Attachment[];
  locale: Locale;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );
  const downloads = useRef(new Set<string>());
  const alive = useRef(true);
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  useEffect(() => {
    alive.current = true;
    const urls = downloads.current;
    return () => {
      alive.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  async function open(file: Attachment, inline: boolean) {
    setBusy(file.id);
    setError("");
    try {
      const blob = (await authedFetch(
        `/it-support/attachments/${encodeURIComponent(file.id)}`,
        {},
        "blob",
      )) as Blob;
      if (!alive.current) return;
      const url = URL.createObjectURL(blob);
      if (inline) setPreview({ url, name: file.name });
      else {
        downloads.current.add(url);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          downloads.current.delete(url);
        }, 15000);
      }
    } catch (err) {
      if (alive.current) setError(errorText(err, locale));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  if (!files.length) return null;
  return (
    <div className={s.attachments}>
      {files.map((file) => (
        <div key={file.id} className={s.fileRow}>
          <Paperclip size={15} />
          <span>
            {file.name}
            <small>{formatBytes(file.size)}</small>
          </span>
          <div className={s.actions}>
            {/^image\/(png|jpeg|webp)$/.test(file.mimeType) && (
              <button
                type="button"
                className={s.iconButton}
                title={t("Önizle", "Preview")}
                aria-label={`${t("Önizle", "Preview")}: ${file.name}`}
                disabled={!!busy}
                onClick={() => void open(file, true)}
              >
                <Eye size={15} />
              </button>
            )}
            <button
              type="button"
              className={s.iconButton}
              title={t("İndir", "Download")}
              aria-label={`${t("İndir", "Download")}: ${file.name}`}
              disabled={!!busy}
              onClick={() => void open(file, false)}
            >
              <Download size={15} />
            </button>
          </div>
        </div>
      ))}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {preview && (
        <Modal
          title={preview.name}
          locale={locale}
          onClose={() => setPreview(null)}
        >
          <div className={s.imagePreview}>
            <img src={preview.url} alt={preview.name} />
          </div>
        </Modal>
      )}
    </div>
  );
}
