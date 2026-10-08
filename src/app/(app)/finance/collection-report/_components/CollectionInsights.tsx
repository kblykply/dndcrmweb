import type { CollectionReportData } from "../_lib/types";
import { currencyName, money } from "../../payment-tracking/_lib/utils";
import { currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { paymentProjectGroupLabel } from "../../payment-tracking/_lib/project-groups";
import s from "../collection-report.module.css";

export default function CollectionInsights({ report, tr }: { report: CollectionReportData; tr: boolean }) {
  const t = (a: string, b: string) => tr ? a : b;
  const parts = report.byCurrency.filter((part) => part.overdueConcentration || part.projectInsights);
  if (!parts.length) return null;
  const percent = (value: number) => new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", { maximumFractionDigits: 1 }).format(value);
  return <section aria-label={t("Tahsilat öncelikleri", "Collection priorities")}>
    <details className={s.disclosure} data-collection-insights>
      <summary>{t("Tahsilat öncelikleri", "Collection priorities")}<span>{t("Müşteri ve proje yoğunlaşması", "Customer and project concentration")}</span></summary>
      <div className={s.disclosureBody}>
        <p className={s.muted}>{t("Seçili filtrelerdeki kalan alacaklar üzerinden hesaplanır.", "Calculated from outstanding amounts within the selected filters.")}</p>
        {parts.map((part) => {
          const top = part.overdueConcentration;
          const projects = (part.projectInsights || []).filter((row) => (row.overdueOutstanding || 0) > 0 || (row.nextMonthOutstanding || 0) > 0 || row.overdueOutstanding === null || row.nextMonthOutstanding === null)
            .sort((a, b) => (b.overdueOutstanding || 0) - (a.overdueOutstanding || 0));
          return <div key={currencyToken(part.currency)}>
            <h3>{currencyName(part.currency, tr)}</h3>
            {top?.complete && top.top20SharePercent !== null && <p className={s.insightText}>
              {tr ? <>Gecikmiş alacağın <strong>%{percent(top.top20SharePercent)}</strong>’i, en yüksek bakiyeli <strong>{top.top20GroupCount} müşteri hesabında</strong>: {money(top.top20Outstanding, tr)}.</>
                : <><strong>{percent(top.top20SharePercent)}%</strong> of overdue receivables is held in the <strong>{top.top20GroupCount} largest customer accounts</strong>: {money(top.top20Outstanding, tr)}.</>}
            </p>}
            {top && !top.complete && <p className={s.muted}>{t("Eksik kaynak bilgisi nedeniyle müşteri yoğunlaşması hesaplanamadı.", "Customer concentration could not be calculated because source information is incomplete.")}</p>}
            {projects.length > 0 ? <div className={s.tableWrap}><table>
              <thead><tr><th>{t("Proje", "Project")}</th><th>{t("Gecikmiş alacak", "Overdue receivables")}</th><th>{t("Gelecek ay beklenen", "Expected next month")}</th></tr></thead>
              <tbody>{projects.map((row) => <tr key={row.projectGroup}>
                <td>{paymentProjectGroupLabel(row.projectGroup, tr)}</td>
                <td>{money(row.overdueOutstanding, tr)}{row.overdueSharePercent !== null && <small>{tr ? `Gecikmiş toplamın %${percent(row.overdueSharePercent)}` : `${percent(row.overdueSharePercent)}% of overdue total`}</small>}</td>
                <td>{money(row.nextMonthOutstanding, tr)}{row.nextMonthSharePercent !== null && <small>{tr ? `Gelecek ayın %${percent(row.nextMonthSharePercent)}` : `${percent(row.nextMonthSharePercent)}% of next month`}</small>}</td>
              </tr>)}</tbody>
            </table></div> : <p className={s.muted}>{t("Gecikmiş veya gelecek aya ait kalan alacak yok.", "There are no overdue or next-month outstanding receivables.")}</p>}
          </div>;
        })}
      </div>
    </details>
  </section>;
}
