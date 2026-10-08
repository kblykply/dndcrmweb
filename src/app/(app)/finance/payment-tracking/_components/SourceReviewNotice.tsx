import type { PaymentSourceCase } from "../_lib/types";
import { currencyName, money } from "../_lib/utils";
import s from "../payment-tracking.module.css";

export default function SourceReviewNotice({ cases, tr }: { cases: Array<Pick<PaymentSourceCase, "key" | "sourceReview">>; tr: boolean }) {
  const affected = cases.filter((item) => item.sourceReview?.status === "review_required" && item.sourceReview.vat.length);
  if (!affected.length) return null;
  return <details className={s.reviewNotice} data-source-review>
    <summary>{tr ? "KDV iade / devir kontrolü" : "VAT return / transfer review"}</summary>
    <p>{tr ? "Bu dairenin önceki KDV kayıtlarında iade veya devir kontrolü gerekiyor. Aşağıdaki tutarlar mevcut borç toplamına ve mesajlara eklenmez."
      : "Earlier VAT records for this unit need a return or transfer review. The amounts below are excluded from current balances and messages."}</p>
    {affected.map((item) => <div key={item.key}>
      {item.sourceReview!.vat.map((review, index) => <p key={index}>
        <strong>{money(review.excludedOutstanding, tr)} {currencyName(review.currency, tr)}</strong>{" · "}
        {review.excludedRows} {tr ? "önceki kayıt" : "earlier records"}
        {review.hasReturnLink === true && <> · {tr ? "İade bağlantısı var" : "Return linked"}</>}
        {review.hasCustomerChange === true && <> · {tr ? "Müşteri değişmiş" : "Customer changed"}</>}
      </p>)}
    </div>)}
    <p>{tr ? "Kesin kalan borç için muhasebe mutabakatı gerekir." : "An accounting reconciliation is needed to confirm the remaining debt."}</p>
  </details>;
}
