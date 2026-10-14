import s from "./table.module.css";

export default function CollectionRate({
  amount,
  paid,
  tr,
}: {
  amount: number | null;
  paid: number | null;
  tr: boolean;
}) {
  const value =
    amount !== null && paid !== null && amount > 0 && paid >= 0
      ? (paid / amount) * 100
      : null;
  if (value === null || !Number.isFinite(value)) return <span>—</span>;
  return (
    <span
      className={s.rate}
      title={
        tr
          ? "Vadeye dağıtılmış ödenen / planlanan tutar"
          : "Payments allocated to due dates / scheduled amount"
      }
    >
      <span>
        {new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", {
          maximumFractionDigits: 1,
        }).format(value)}
        %
      </span>
      <span className={s.rateTrack} aria-hidden="true">
        <span style={{ width: `${Math.min(100, value)}%` }} />
      </span>
    </span>
  );
}
