"use client";
import { useEffect, useRef, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

type Document = {
  id: string;
  fileName: string;
  fileSize: number;
  kind: string;
  number: string;
  date: string | null;
  cached: boolean;
};
type Catalogue = {
  workerOnline: boolean;
  updatedAt: string | null;
  job: { status: string; error: string | null } | null;
  documents: Document[];
};
function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 2000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export default function LogoDocuments({
  caseKey,
  salesMode,
  tr,
}: {
  caseKey: string;
  salesMode: boolean;
  tr: boolean;
}) {
  const base = `${salesMode ? "/sales-ledger" : "/payment-tracking"}/${encodeURIComponent(caseKey)}/documents`;
  const [expanded, setExpanded] = useState(false),
    [data, setData] = useState<Catalogue | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [link, setLink] = useState("");
  const active = useRef<AbortController | null>(null),
    popup = useRef<Window | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      popup.current?.close();
    },
    [],
  );
  const t = (a: string, b: string) => (tr ? a : b);
  async function load(refresh = false) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy("catalogue");
    setError("");
    try {
      let next = (await authedFetch(refresh ? `${base}/refresh` : base, {
        method: refresh ? "POST" : "GET",
        signal: controller.signal,
      })) as Catalogue;
      if (controller.signal.aborted) return;
      setData(next);
      const until = Date.now() + 180000;
      while (next.job && ["QUEUED", "RUNNING"].includes(next.job.status)) {
        if (Date.now() > until) throw Error("timeout");
        await pause(controller.signal);
        next = (await authedFetch(base, {
          signal: controller.signal,
        })) as Catalogue;
        if (controller.signal.aborted) return;
        setData(next);
      }
      if (next.job?.status === "FAILED") throw Error("catalogue failed");
      if (next.job?.status === "FAILED")
        setError(
          t(
            "Belge listesi alınamadı. Tekrar deneyin.",
            "Could not load the document list. Please retry.",
          ),
        );
    } catch {
      if (!controller.signal.aborted)
        setError(
          t(
            "Belgeler yüklenemedi. Daha sonra tekrar deneyin.",
            "Documents could not be loaded. Try again later.",
          ),
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy("");
      }
    }
  }
  async function open(document: Document) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(document.id);
    setError("");
    setLink("");
    const tab = window.open("about:blank", "_blank");
    popup.current = tab;
    if (tab) {
      tab.opener = null;
      tab.document.title = t("Belge hazırlanıyor", "Preparing document");
      tab.document.body.textContent = t(
        "Belge hazırlanıyor…",
        "Preparing document…",
      );
    }
    try {
      let result = await authedFetch(`${base}/${document.id}/open`, {
        method: "POST",
        signal: controller.signal,
      });
      const until = Date.now() + 180000;
      while (result.status !== "READY") {
        if (
          result.status === "FAILED" ||
          result.status === "NOT_REQUESTED" ||
          result.status === "SUCCEEDED" ||
          Date.now() > until
        )
          throw Error("Document unavailable");
        await pause(controller.signal);
        result = await authedFetch(`${base}/${document.id}/status`, {
          signal: controller.signal,
        });
      }
      if (controller.signal.aborted) return;
      if (
        typeof result.url !== "string" ||
        new URL(result.url).protocol !== "https:"
      )
        throw Error("Invalid URL");
      if (tab && !tab.closed) tab.location.replace(result.url);
      else setLink(result.url);
      popup.current = null;
      setData((previous) =>
        previous
          ? {
              ...previous,
              documents: previous.documents.map((item) =>
                item.id === document.id ? { ...item, cached: true } : item,
              ),
            }
          : previous,
      );
    } catch {
      tab?.close();
      if (!controller.signal.aborted)
        setError(
          t(
            "Belge açılamadı. Daha sonra tekrar deneyin.",
            "The document could not be opened. Try again later.",
          ),
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy("");
      }
    }
  }
  return (
    <section
      className="card"
      aria-label={t("Fatura ve tahsilat belgeleri", "Invoices and receipts")}
    >
      <div className="document-heading">
        <div>
          <h2>{t("Fatura ve tahsilat belgeleri", "Invoices and receipts")}</h2>
          <p className="muted">
            {t(
              "İlgili faturaları ve tahsilat belgelerini PDF olarak görüntüleyin.",
              "View the related invoices and receipts as PDFs.",
            )}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            if (next && !data) void load();
          }}
        >
          {expanded
            ? t("Kapat", "Close")
            : t("Belgeleri göster", "Show documents")}
        </button>
      </div>
      {expanded && (
        <div className="document-content">
          {error && <p role="alert">{error}</p>}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer">
              {t("Hazır PDF’yi aç", "Open the ready PDF")}
            </a>
          )}
          {busy === "catalogue" && (
            <p role="status">
              {t("Belge listesi yükleniyor…", "Loading document list…")}
            </p>
          )}
          {data && (
            <>
              <button
                type="button"
                disabled={!!busy || !data.workerOnline}
                onClick={() => void load(true)}
              >
                {data.updatedAt
                  ? t("Belge listesini yenile", "Refresh document list")
                  : t("Belge listesini getir", "Load document list")}
              </button>
              {!data.workerOnline && (
                <p className="muted">
                  {t(
                    "Yeni belgelere şu anda ulaşılamıyor. Hazır belgeleri açabilirsiniz.",
                    "New documents are currently unavailable. Ready documents can still be opened.",
                  )}
                </p>
              )}
              {data.updatedAt && data.documents.length === 0 && (
                <p>
                  {t(
                    "Bu cari için eşleşen PDF belgesi bulunamadı.",
                    "No matching PDF documents were found for this account.",
                  )}
                </p>
              )}
              <ul>
                {data.documents.map((document) => (
                  <li key={document.id}>
                    <div>
                      <strong>
                        {document.kind === "invoice"
                          ? t("Fatura", "Invoice")
                          : document.kind === "bank_receipt"
                            ? t("Banka tahsilatı", "Bank receipt")
                            : t("Nakit tahsilat", "Cash receipt")}
                        {document.number ? ` · ${document.number}` : ""}
                      </strong>
                      <span className="muted">
                        {document.fileName}
                        {document.date ? ` · ${document.date}` : ""} ·{" "}
                        {(document.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={
                        !!busy || (!document.cached && !data.workerOnline)
                      }
                      onClick={() => void open(document)}
                    >
                      {busy === document.id
                        ? t("Hazırlanıyor…", "Preparing…")
                        : t("PDF’yi aç", "Open PDF")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {error && !data && (
            <button type="button" disabled={!!busy} onClick={() => void load()}>
              {t("Tekrar dene", "Retry")}
            </button>
          )}
        </div>
      )}
      <style jsx>{`
        .document-heading,
        .document-content li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        h2 {
          font-size: 18px;
          margin: 0;
        }
        p {
          margin: 8px 0;
          font-size: 13px;
        }
        .document-content {
          margin-top: 16px;
        }
        ul {
          list-style: none;
          padding: 0;
          margin: 12px 0 0;
        }
        li {
          padding: 14px 0;
          border-top: 1px solid var(--stroke);
        }
        li > div {
          display: grid;
          gap: 5px;
          min-width: 0;
          flex: 1 1 240px;
        }
        li span,
        li strong {
          overflow-wrap: anywhere;
        }
        li span {
          font-size: 12px;
        }
        [role="alert"] {
          color: var(--danger);
        }
      `}</style>
    </section>
  );
}
