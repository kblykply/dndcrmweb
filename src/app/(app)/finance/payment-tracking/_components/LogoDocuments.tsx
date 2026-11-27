"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import {
  requestReceiptReport,
  waitForLogo,
} from "../../_reports/receipt-request";
import { receiptLabels, type ReceiptReportData } from "../../_reports/receipts";
import { reportSessionGuard } from "../../_reports/session";
import { dateLabel, money } from "../_lib/utils";

type Document = {
  id: string;
  fileName: string;
  kind: string;
  number: string;
  date: string | null;
  receiptIds?: string[];
  cached: boolean;
};
type Catalogue = {
  workerOnline: boolean;
  receiptLinksReady?: boolean;
  updatedAt: string | null;
  job: { status: string; error: string | null } | null;
  documents: Document[];
};

export default function LogoDocuments({
  caseKey,
  salesMode,
  tr,
}: {
  caseKey: string;
  salesMode: boolean;
  tr: boolean;
}) {
  const account = `${salesMode ? "/sales-ledger" : "/payment-tracking"}/${encodeURIComponent(caseKey)}`;
  const base = `${account}/documents`;
  const [report, setReport] = useState<ReceiptReportData | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [catalogueError, setCatalogueError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [opening, setOpening] = useState("");
  const [openError, setOpenError] = useState("");
  const [link, setLink] = useState("");
  const active = useRef<AbortController | null>(null);
  const popup = useRef<Window | null>(null);
  const t = (a: string, b: string) => (tr ? a : b);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(180_000),
    ]);
    const allowed = reportSessionGuard(salesMode ? "sales" : "finance");
    void requestReceiptReport({
      endpoint: `${account}/receipt-report`,
      caseKey,
      tr,
      signal,
      allowed,
      useRecent: true,
    }).then(
      (value) => {
        if (!signal.aborted && allowed()) setReport(value);
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setReceiptError(
            error instanceof Error && !signal.aborted
              ? error.message
              : tr
                ? "Tahsilatlar yüklenemedi."
                : "Receipts could not be loaded.",
          );
      },
    );

    async function loadCatalogue() {
      const read = async () =>
        (await authedFetch(base, { signal })) as Catalogue;
      let next = await read();
      if (!allowed() || signal.aborted) return;
      setCatalogue(next);
      const pending = () =>
        next.job && ["QUEUED", "RUNNING"].includes(next.job.status);
      const outdated =
        !next.updatedAt ||
        next.receiptLinksReady === false ||
        Date.now() - Date.parse(next.updatedAt) > 5 * 60_000;
      if (next.workerOnline && !pending() && (outdated || retry > 0)) {
        next = (await authedFetch(`${base}/refresh`, {
          method: "POST",
          signal,
        })) as Catalogue;
        if (!allowed() || signal.aborted) return;
        setCatalogue(next);
      }
      while (pending()) {
        await waitForLogo(signal);
        next = await read();
        if (!allowed() || signal.aborted) return;
        setCatalogue(next);
      }
      if (next.job?.status === "FAILED") setCatalogueError(true);
    }
    void loadCatalogue().catch(() => {
      if (!controller.signal.aborted) setCatalogueError(true);
    });
    return () => controller.abort();
  }, [account, base, caseKey, retry, salesMode, tr]);

  useEffect(
    () => () => {
      active.current?.abort();
      popup.current?.close();
    },
    [],
  );

  async function open(document: Document) {
    if (active.current) return;
    const allowed = reportSessionGuard(salesMode ? "sales" : "finance");
    if (!allowed()) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(180_000),
    ]);
    active.current = controller;
    setOpening(document.id);
    setOpenError("");
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
        signal,
      });
      while (allowed() && ["QUEUED", "RUNNING"].includes(result.status)) {
        await waitForLogo(signal);
        result = await authedFetch(`${base}/${document.id}/status`, { signal });
      }
      if (
        signal.aborted ||
        !allowed() ||
        result.status !== "READY" ||
        typeof result.url !== "string" ||
        new URL(result.url).protocol !== "https:"
      )
        throw new Error("Document unavailable");
      if (tab && !tab.closed) tab.location.replace(result.url);
      else setLink(result.url);
      setCatalogue(
        (previous) =>
          previous && {
            ...previous,
            documents: previous.documents.map((item) =>
              item.id === document.id ? { ...item, cached: true } : item,
            ),
          },
      );
    } catch {
      tab?.close();
      if (!controller.signal.aborted)
        setOpenError(
          t(
            "Belge açılamadı. Daha sonra tekrar deneyin.",
            "The document could not be opened. Try again later.",
          ),
        );
    } finally {
      popup.current = null;
      if (active.current === controller) {
        active.current = null;
        setOpening("");
      }
    }
  }

  const receiptDocuments = new Map<string, Document[]>();
  const invoices: Document[] = [];
  for (const document of catalogue?.documents ?? []) {
    if (document.kind === "invoice") {
      invoices.push(document);
      continue;
    }
    for (const id of document.receiptIds ?? []) {
      const files = receiptDocuments.get(id) ?? [];
      files.push(document);
      receiptDocuments.set(id, files);
    }
  }
  const labels = receiptLabels(tr);
  function documentButton(document: Document, invoice = false) {
    const label = invoice
      ? t("Faturayı aç", "Open invoice")
      : t("Makbuzu aç", "Open receipt");
    return (
      <button
        key={document.id}
        type="button"
        className="document-icon"
        title={document.fileName}
        aria-label={`${label}${document.number ? ` · ${document.number}` : ""}`}
        disabled={!!opening || (!document.cached && !catalogue?.workerOnline)}
        onClick={() => void open(document)}
      >
        {opening === document.id ? (
          <LoaderCircle size={17} aria-hidden="true" />
        ) : (
          <FileText size={17} aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <section
      className="card"
      aria-label={t("Tahsilatlar ve faturalar", "Receipts and invoices")}
    >
      <h2>
        {t("Tahsilatlar", "Receipts")}
        {report && ` · ${report.account.currency}`}
      </h2>
      {report && (
        <p className="muted">
          {t(
            "Cari hesabın seçili dövizdeki hareketleri",
            "Account movements in the selected currency",
          )}
          {" · "}
          {report.rows.length} {t("kayıt", "records")}
        </p>
      )}
      {!report && !receiptError && (
        <p role="status">{t("Tahsilatlar yükleniyor…", "Loading receipts…")}</p>
      )}
      {(receiptError ||
        catalogueError ||
        (catalogue && !catalogue.workerOnline)) && (
        <div className="status-line">
          {receiptError && <p role="alert">{receiptError}</p>}
          {(catalogueError || (catalogue && !catalogue.workerOnline)) && (
            <p className="muted">
              {t(
                "Yeni belgelere şu anda ulaşılamıyor. Hazır belgeleri açabilirsiniz.",
                "New documents are currently unavailable. Ready documents can still be opened.",
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setReceiptError("");
              setCatalogueError(false);
              setRetry((value) => value + 1);
            }}
          >
            {t("Tekrar dene", "Retry")}
          </button>
        </div>
      )}
      {openError && <p role="alert">{openError}</p>}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setLink("")}
        >
          {t("Hazır PDF’yi aç", "Open the ready PDF")}
        </a>
      )}
      {report &&
        (report.rows.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label={t("Tahsilat tablosu", "Receipts table")}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">{t("Tarih", "Date")}</th>
                  <th scope="col">{t("İşlem", "Transaction")}</th>
                  <th scope="col">{t("Fiş no", "Transaction no.")}</th>
                  <th scope="col">{t("Açıklama", "Description")}</th>
                  <th scope="col" className="amount">
                    {t("Tutar", "Amount")}
                  </th>
                  <th scope="col" className="document-cell">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{dateLabel(row.date, tr)}</td>
                    <td>{labels[row.kind]}</td>
                    <td>{row.ficheNo || "—"}</td>
                    <td>{row.description || "—"}</td>
                    <td className="amount">
                      {money(row.amount, tr)} {row.currency}
                    </td>
                    <td className="document-cell">
                      {receiptDocuments
                        .get(row.id)
                        ?.map((doc) => documentButton(doc))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            {t(
              "Bu cari hesapta tahsilat kaydı yok.",
              "This account has no receipt records.",
            )}
          </p>
        ))}
      {!!invoices.length && (
        <div className="invoices">
          <h3>{t("Faturalar", "Invoices")}</h3>
          <ul>
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <span>
                  {invoice.number || invoice.fileName}
                  {invoice.date && ` · ${dateLabel(invoice.date, tr)}`}
                </span>
                {documentButton(invoice, true)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <style jsx>{`
        .card {
          min-width: 0;
        }
        h2 {
          font-size: 18px;
          margin: 0;
        }
        h3 {
          font-size: 15px;
          margin: 0 0 4px;
        }
        p {
          margin: 8px 0;
          font-size: 13px;
        }
        .table-scroll {
          margin-top: 12px;
          overflow-x: auto;
        }
        table {
          width: 100%;
          min-width: 620px;
          border-collapse: collapse;
          font-size: 13px;
        }
        th,
        td {
          text-align: left;
          padding: 9px 10px;
          border-bottom: 1px solid var(--stroke);
        }
        th {
          color: var(--muted);
          font-weight: 650;
        }
        td:nth-child(4) {
          max-width: 520px;
          overflow-wrap: anywhere;
        }
        .amount {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .document-cell {
          position: sticky;
          right: 0;
          background: var(--surface);
          text-align: right;
          white-space: nowrap;
        }
        .document-icon {
          display: inline-grid;
          place-items: center;
          min-width: 34px;
          min-height: 34px;
          padding: 5px;
        }
        .document-icon + .document-icon {
          margin-left: 4px;
        }
        .status-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .invoices {
          margin-top: 16px;
        }
        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        li {
          padding: 8px 0;
          border-bottom: 1px solid var(--stroke);
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
        }
        li span {
          overflow-wrap: anywhere;
        }
        [role="alert"] {
          color: var(--danger);
        }
      `}</style>
    </section>
  );
}
