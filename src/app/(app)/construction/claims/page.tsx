"use client";
import Link from "next/link";
import { amount, date, useConstruction, useCopy } from "../_lib/client";
import { Empty, Export, State } from "../_components/Shared";
import s from "../construction.module.css";
export default function Page() {
  const { project, projectId } = useConstruction();
  const { t } = useCopy();
  const p = project.data;
  if (!p) return <State {...project} retry={() => void project.reload()} />;
  const report = {
    title: `${p.name} · ${t("Hakedişler", "Claims")}`,
    filename: `${p.id}-hakedisler`,
    metadata: [
      t(
        "Hakedişler ödeme kaydı değildir. Kaynak ve sözleşme mutabakatı bekliyor.",
        "Claims are not payment records. Source and contract reconciliation is pending.",
      ),
    ],
    sheets: [
      {
        name: t("Hakedişler", "Claims"),
        columns: [
          { label: "No" },
          { label: t("Tarih", "Date") },
          { label: t("Taşeron", "Contractor") },
          {
            label: t("KDV öncesi GBP", "Before VAT GBP"),
            kind: "money" as const,
          },
          { label: t("KDV GBP", "VAT GBP"), kind: "money" as const },
          { label: t("Net GBP", "Net GBP"), kind: "money" as const },
        ],
        rows: p.claims.map((c) => [
          c.number,
          date(c.period),
          c.contractor,
          c.base,
          c.tax,
          c.net,
        ]),
      },
    ],
  };
  return (
    <>
      <div className={s.sectionTitle}>
        <h2>{t("Hakedişler", "Claims")}</h2>
        <Export report={report} />
      </div>
      {p.claims.length ? (
        <>
          <p className={s.notice}>
            {t(
              "Kaynak ve sözleşme kontrolü bekliyor. Hakediş neti, yapılan ödeme değildir.",
              "Source and contract review pending. Claim net is not a payment made.",
            )}
          </p>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>{t("Hakediş", "Claim")}</th>
                  <th>{t("Tarih", "Date")}</th>
                  <th>{t("Taşeron", "Contractor")}</th>
                  <th className={s.right}>{t("KDV öncesi", "Before VAT")}</th>
                  <th className={s.right}>{t("Net hakediş", "Net claim")}</th>
                  <th>{t("Durum", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {p.claims.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className={s.cellLink}
                        href={`/construction/claims/${c.id}?project=${p.id}`}
                      >
                        #{c.number} →
                      </Link>
                    </td>
                    <td>{date(c.period)}</td>
                    <td>{c.contractor}</td>
                    <td className={s.right}>{amount(c.base)}</td>
                    <td className={s.right}>
                      <strong>{amount(c.net)}</strong>
                    </td>
                    <td>
                      <span className={`${s.badge} ${s.warn}`}>
                        {t("Kontrol bekliyor", "Pending review")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty>
          {t(
            "Bu proje için hakediş dosyası henüz sağlanmadı.",
            "No claim has been provided for this project.",
          )}
          <Link href={`/construction/review?project=${projectId}`}>
            {t("Eksikleri gör", "View missing data")}
          </Link>
        </Empty>
      )}
    </>
  );
}
