"use client";
import Link from "next/link";
import { amount, useConstruction, useCopy } from "../_lib/client";
import { Empty, State } from "../_components/Shared";
import s from "../construction.module.css";
export default function Page() {
  const { project, projectId } = useConstruction();
  const { t } = useCopy();
  const p = project.data;
  if (!p) return <State {...project} retry={() => void project.reload()} />;
  return (
    <>
      <div className={s.sectionTitle}>
        <h2>{t("Maliyet Bütçesi", "Cost Budget")}</h2>
      </div>
      {p.budgets.length ? (
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{t("Bütçe", "Budget")}</th>
                <th className={s.right}>{t("Kalem", "Items")}</th>
                <th className={s.right}>{t("Excel toplamı", "Excel total")}</th>
                <th className={s.right}>{t("Hesaplanan", "Calculated")}</th>
                <th className={s.right}>{t("Fark", "Difference")}</th>
              </tr>
            </thead>
            <tbody>
              {p.budgets.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link
                      className={s.cellLink}
                      href={`/construction/budgets/${b.id}?project=${p.id}`}
                    >
                      {b.name} →
                    </Link>
                  </td>
                  <td className={s.right}>{b.itemCount}</td>
                  <td className={s.right}>{amount(b.sourceTotal)}</td>
                  <td className={s.right}>
                    <strong>{amount(b.calculated)}</strong>
                  </td>
                  <td className={`${s.right} ${s.danger}`}>
                    {b.sourceTotal === null
                      ? "—"
                      : amount(b.calculated - Number(b.sourceTotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          {t(
            "Bu projenin bütçesi henüz sağlanmadı. Perla II bütçesi bu projeye dahil edilmedi.",
            "This project has no budget yet. The Perla II budget is kept separate.",
          )}
          <Link href={`/construction/review?project=${projectId}`}>
            {t("Eksikleri gör", "View missing data")}
          </Link>
        </Empty>
      )}
    </>
  );
}
