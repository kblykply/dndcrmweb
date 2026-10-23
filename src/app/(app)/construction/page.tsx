"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { amount, percent, useConstruction, useCopy } from "./_lib/client";
import { Stat } from "./_components/Shared";
import s from "./construction.module.css";
export default function Page() {
  const { workspace } = useConstruction();
  const { t } = useCopy();
  return (
    <>
      <div className={s.sectionTitle}>
        <h2>{t("Projeler", "Projects")}</h2>
        <span className={s.small}>
          {t(
            "Kaynak dosyalarına göre başlangıç kayıtları",
            "Initial records from source workbooks",
          )}
        </span>
      </div>
      <div className={s.cards}>
        {workspace.data?.projects.map((p) => (
          <article className={s.card} key={p.id}>
            <h2>{p.name}</h2>
            <p className={s.muted}>{p.notes}</p>
            <div className={s.stats}>
              <Stat
                label={t("Fiziksel ilerleme", "Physical progress")}
                value={percent(p.progress)}
                detail={
                  p.unitCount
                    ? `${p.includedCount} ${t("özete dahil birim", "included units")}`
                    : t("Veri bekleniyor", "Awaiting data")
                }
              />
              <Stat
                label={t("Hesaplanan bütçe", "Calculated budget")}
                value={p.budgets.length ? amount(p.budgets[0].calculated) : "—"}
                detail={
                  p.budgets.length
                    ? t("Gerçekleşen harcama değildir", "Not actual spending")
                    : t("Bütçe bekleniyor", "Awaiting budget")
                }
              />
              <Stat
                label={t("Son hakediş · net", "Latest claim · net")}
                value={p.latestClaim ? amount(p.latestClaim.net) : "—"}
                detail={
                  p.latestClaim
                    ? `${t("Hakediş", "Claim")} #${p.latestClaim.number}`
                    : t("Hakediş bekleniyor", "Awaiting claim")
                }
              />
              <Stat
                label={t("Açık kontrol", "Open checks")}
                value={p.openIssues}
              />
            </div>
            <footer>
              <Link href={`/construction/progress?project=${p.id}`}>
                {t("İlerleme", "Progress")} <ArrowUpRight size={15} />
              </Link>
              <Link href={`/construction/claims?project=${p.id}`}>
                {t("Hakedişler", "Claims")}
              </Link>
              <Link href={`/construction/budgets?project=${p.id}`}>
                {t("Bütçe", "Budget")}
              </Link>
              <Link href={`/construction/review?project=${p.id}`}>
                {t("Eksikler", "Missing data")}
              </Link>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}
