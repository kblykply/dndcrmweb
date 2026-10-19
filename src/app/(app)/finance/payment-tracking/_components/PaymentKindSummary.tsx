"use client";
import { ChevronRight } from "lucide-react";
import type { PaymentKind, PaymentTrackingDetail } from "../_lib/types";
import { paymentKindBalances } from "../_lib/payment-kind-summary";
import { paymentKindLabel } from "../_lib/payment-kinds";
import { currencyName, money } from "../_lib/utils";
import s from "../payment-tracking.module.css";

export default function PaymentKindSummary({
  data,
  tr,
  onSelect,
}: {
  data: PaymentTrackingDetail;
  tr: boolean;
  onSelect: (kind: PaymentKind | "all", currency: string) => void;
}) {
  const balances = paymentKindBalances(data.portfolio.installments);
  if (!balances.length) return null;
  return (
    <section
      className={s.panel}
      aria-label={
        tr ? "Ödeme türlerine göre borçlar" : "Balances by payment type"
      }
    >
      <div className={s.panelHead}>
        <h2>{tr ? "Ödeme türleri" : "Payment types"}</h2>
        <button
          type="button"
          className={s.button}
          onClick={() => onSelect("all", "all")}
        >
          {tr ? "Tüm vadeler" : "All installments"}
        </button>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table} style={{ minWidth: 650 }}>
          <thead>
            <tr>
              <th>{tr ? "Ödeme türü" : "Payment type"}</th>
              <th>{tr ? "Döviz" : "Currency"}</th>
              <th className={s.numeric}>{tr ? "Toplam" : "Scheduled"}</th>
              <th className={s.numeric}>{tr ? "Ödenen" : "Paid"}</th>
              <th className={s.numeric}>{tr ? "Kalan" : "Remaining"}</th>
              <th className={s.numeric}>{tr ? "Gecikmiş" : "Overdue"}</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((row) => (
              <tr key={JSON.stringify([row.kind, row.currency])}>
                <th scope="row">
                  <button
                    type="button"
                    className={s.kindDetailButton}
                    aria-label={`${paymentKindLabel(row.kind, tr)} · ${currencyName(row.currency, tr)} · ${tr ? "vadeleri göster" : "show installments"}`}
                    aria-controls="account-payment-schedule"
                    onClick={() =>
                      onSelect(row.kind, row.currency ?? "__NULL__")
                    }
                  >
                    {paymentKindLabel(row.kind, tr)}
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </th>
                <td>{currencyName(row.currency, tr)}</td>
                <td className={s.numeric}>{money(row.amount, tr)}</td>
                <td className={s.numeric}>{money(row.paid, tr)}</td>
                <td className={s.numeric}>{money(row.outstanding, tr)}</td>
                <td
                  className={`${s.numeric} ${(row.overdue || 0) > 0 ? s.red : ""}`}
                >
                  <strong>{money(row.overdue, tr)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
