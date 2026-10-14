"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import type { PaymentTrackingDetail } from "../payment-tracking/_lib/types";
import { requireSourceAudit } from "../payment-tracking/_lib/source-integrity";
import {
  currencyName,
  dateLabel,
  money,
  problem,
} from "../payment-tracking/_lib/utils";
import { paymentKindLabel } from "../payment-tracking/_lib/payment-kinds";
import { usableReportSource } from "../collection-report/_lib/report";
import CollectionRate from "./CollectionRate";
import s from "./table.module.css";

export default function CaseStatement({
  caseKey,
  importedAt,
  tr,
}: {
  caseKey: string;
  importedAt?: string | null;
  tr: boolean;
}) {
  const [data, setData] = useState<PaymentTrackingDetail | null>(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const read = () => {
      if (busy || controller.signal.aborted) return;
      busy = true;
      authedFetch(`/payment-tracking/${encodeURIComponent(caseKey)}`, {
        signal: controller.signal,
      })
        .then((result: PaymentTrackingDetail) => {
          if (controller.signal.aborted) return;
          requireSourceAudit(result.source, tr);
          if (
            result.item.key !== caseKey ||
            result.source.importedAt !== importedAt ||
            !Array.isArray(result.portfolio?.installments)
          )
            throw new Error(
              tr
                ? "Ekstre kaynağı güncellendi. Tabloyu yenileyin."
                : "The statement source has changed. Refresh the table.",
            );
          setClock(Date.now());
          setData(result);
          setError("");
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(problem(cause, tr).message);
        })
        .finally(() => {
          busy = false;
        });
    };
    read();
    const refresh = () => {
      if (document.visibilityState === "visible") read();
    };
    const interval = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      controller.abort();
    };
  }, [caseKey, importedAt, tr]);
  if (error)
    return (
      <tr>
        <td colSpan={8} className={s.error} role="alert">
          {error}
        </td>
      </tr>
    );
  if (!data)
    return (
      <tr>
        <td colSpan={8} className={s.status} role="status">
          {tr ? "Daire ekstresi yükleniyor…" : "Loading unit statement…"}
        </td>
      </tr>
    );
  if (!usableReportSource(data.source, clock))
    return (
      <tr>
        <td colSpan={8}>
          {tr
            ? "Güncel ekstre için tabloyu yenileyin."
            : "Refresh the table for a current statement."}
        </td>
      </tr>
    );
  const lines = data.portfolio.installments;
  return (
    <>
      <tr className={s.statementTitle}>
        <th colSpan={8}>
          {tr
            ? "Daire ekstresi · Tüm vadeler ve ödeme türleri"
            : "Unit statement · All due dates and payment kinds"}
        </th>
      </tr>
      {lines.map((line) => (
        <tr key={`${line.caseKey}:${line.sequence}`} className={s.statement}>
          <th scope="row">{paymentKindLabel(line.paymentKind, tr)}</th>
          <td>{currencyName(line.currency, tr)}</td>
          <td>{line.projectCode || "—"}</td>
          <td>{dateLabel(line.dueDate, tr)}</td>
          <td>{money(line.amount, tr)}</td>
          <td>{money(line.paid, tr)}</td>
          <td>{money(line.outstanding, tr)}</td>
          <td>
            <CollectionRate amount={line.amount} paid={line.paid} tr={tr} />
          </td>
        </tr>
      ))}
    </>
  );
}
