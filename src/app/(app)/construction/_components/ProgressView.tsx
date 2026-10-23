"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { num, percent, useConstruction, useCopy } from "../_lib/client";
import {
  Empty,
  Export,
  HistoryButton,
  InfoButton,
  Meter,
  SearchBox,
  Stat,
  State,
} from "./Shared";
import s from "../construction.module.css";
export default function ProgressView({
  quality = false,
}: {
  quality?: boolean;
}) {
  const { project, projectId } = useConstruction();
  const { t } = useCopy();
  const [block, setBlock] = useState(""),
    [query, setQuery] = useState(""),
    [onlyDefects, setOnlyDefects] = useState(false);
  const p = project.data;
  if (!p) return <State {...project} retry={() => void project.reload()} />;
  if (!p.units.length)
    return (
      <Empty>
        {t(
          "Bu proje için ilerleme ve kalite verisi henüz sağlanmadı.",
          "Progress and quality data has not been provided for this project.",
        )}
        <Link href={`/construction/review?project=${projectId}`}>
          {t("Gerekli bilgileri gör", "View required information")}
        </Link>
      </Empty>
    );
  const scoped = p.units.filter((u) => u.included),
    progress =
      scoped.reduce((n, u) => n + (u.progress ?? 0), 0) / scoped.length;
  const rows = p.units.filter(
    (u) =>
      (!block || u.block === block) &&
      (!onlyDefects || u.defects > 0) &&
      `${u.block} ${u.label}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const report = {
    title: `${p.name} · ${quality ? t("Kalite kontrol", "Quality control") : t("İlerleme takibi", "Progress tracking")}`,
    filename: `insaat-${p.id}-${quality ? "kalite" : "ilerleme"}`,
    metadata: [
      `${t("Kapsam", "Scope")}: ${block || t("Tüm bloklar", "All blocks")}${query ? ` · ${query}` : ""}${onlyDefects ? ` · ${t("Yalnız kusurlu", "Defects only")}` : ""}`,
      t(
        "Kaynak durumlarının saha kontrol tarihi teyit bekliyor. REST. alanları genel ilerleme dışında.",
        "Source status inspection date awaits confirmation. REST. areas are excluded from overall progress.",
      ),
    ],
    sheets: [
      {
        name: t("Birimler", "Units"),
        columns: [
          { label: t("Blok", "Block") },
          { label: t("Birim", "Unit") },
          { label: t("Özete dahil", "Included") },
          { label: t("İlerleme", "Progress"), kind: "percent" as const },
          { label: t("Kontrol edilen", "Checked"), kind: "count" as const },
          { label: t("Kusurlu iş", "Defective tasks"), kind: "count" as const },
          {
            label: t("Kalite puanı", "Quality score"),
            kind: "percent" as const,
          },
        ],
        rows: rows.map((u) => [
          u.block,
          u.label,
          u.included ? t("Evet", "Yes") : t("Hayır", "No"),
          u.progress === null ? null : u.progress / 100,
          u.checked,
          u.defects,
          u.checked && u.quality !== null ? u.quality / 100 : null,
        ]),
      },
    ],
  };
  return (
    <>
      <div className={s.sectionTitle}>
        <div>
          <h2>
            {quality
              ? t("Kalite Kontrol", "Quality Control")
              : t("İlerleme Takibi", "Progress Tracking")}
          </h2>
          <span className={s.small}>{p.name}</span>
        </div>
        <div className={s.actions}>
          <SearchBox value={query} onChange={setQuery} />
          <InfoButton title={t("Hesaplama", "Calculation")}>
            <p>
              {t(
                "İlerleme: Bitti işaretli işlerin ağırlıkları toplanır. Eksik var tamamlanma puanı kazandırmaz. Her dahil edilen birim eşit ağırlıktadır.",
                "Progress sums weights of completed tasks. Partial tasks receive no completion credit. Included units have equal weight.",
              )}
            </p>
            <p>
              {t(
                "Kalite ayrı tutulur: Uygun tam, kısmen uygun yarım puan alır. Kontrol edilmemiş iş uygun veya kusurlu sayılmaz.",
                "Quality is separate: suitable earns full credit, partial earns half. Unchecked work is neither suitable nor defective.",
              )}
            </p>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>{t("İş", "Trade")}</th>
                    <th>{t("Ağırlık", "Weight")}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.trades.map((x) => (
                    <tr key={x.id}>
                      <td>{x.name}</td>
                      <td>%{num(x.weight, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoButton>
          <HistoryButton projectId={p.id} />
          <Export report={report} />
        </div>
      </div>
      <div className={s.stats}>
        <Stat
          label={t("Genel ilerleme", "Overall progress")}
          value={percent(progress)}
        />
        <Stat
          label={t("Özete dahil / toplam birim", "Included / total units")}
          value={`${scoped.length} / ${p.units.length}`}
        />
        <Stat
          label={t("Kontrol edilen işler", "Inspected tasks")}
          value={`${p.units.reduce((n, u) => n + u.checked, 0)} / ${p.units.reduce((n, u) => n + u.total, 0)}`}
        />
        <Stat
          label={t("Kusurlu işler", "Defective tasks")}
          value={p.units.reduce((n, u) => n + u.defects, 0)}
        />
      </div>
      <div className={s.toolbar}>
        <div className={s.actions}>
          {block ? (
            <>
              <button onClick={() => setBlock("")}>
                {t("Tüm bloklar", "All blocks")}
              </button>
              <ChevronRight size={17} />
              <strong>
                {block} {t("Blok", "Block")}
              </strong>
            </>
          ) : (
            <strong>
              {t("Bloktan daireye ilerleyin", "Open a block to view units")}
            </strong>
          )}
        </div>
        {quality && (
          <label className={s.checkLine}>
            <input
              type="checkbox"
              checked={onlyDefects}
              onChange={(e) => setOnlyDefects(e.target.checked)}
            />
            {t("Yalnız kusurlu", "Defects only")}
          </label>
        )}
      </div>
      {!block && !query && !onlyDefects ? (
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{t("Blok", "Block")}</th>
                <th>{t("İlerleme", "Progress")}</th>
                <th className={s.right}>{t("Birim", "Units")}</th>
                <th className={s.right}>{t("Tamamlanan", "Completed")}</th>
                <th className={s.right}>
                  {t("Kontrol edilen iş", "Inspected tasks")}
                </th>
                <th className={s.right}>
                  {t("Kusurlu iş", "Defective tasks")}
                </th>
              </tr>
            </thead>
            <tbody>
              {p.blocks.map((b) => (
                <tr key={b.block}>
                  <td>
                    <button
                      className={s.rowButton}
                      onClick={() => setBlock(b.block)}
                    >
                      {b.block} {t("Blok", "Block")}
                      <ChevronRight size={17} />
                    </button>
                    {b.total !== b.included && (
                      <small className={s.labelLine}>
                        {b.total - b.included} REST.{" "}
                        {t("özet dışında", "excluded")}
                      </small>
                    )}
                  </td>
                  <td>
                    <Meter value={b.progress} />
                  </td>
                  <td className={s.right}>{b.included}</td>
                  <td className={s.right}>{b.completed}</td>
                  <td className={s.right}>{b.checked}</td>
                  <td className={`${s.right} ${b.defects ? s.danger : ""}`}>
                    {b.defects}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length ? (
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{t("Birim", "Unit")}</th>
                <th>{t("İlerleme", "Progress")}</th>
                <th className={s.right}>{t("Biten iş", "Completed tasks")}</th>
                <th className={s.right}>{t("Kontrol", "Inspected")}</th>
                <th className={s.right}>{t("Kusur", "Defects")}</th>
                <th>{t("Kapsam", "Scope")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      className={s.cellLink}
                      href={`/construction/units/${u.id}?project=${p.id}`}
                    >
                      {u.block} · {u.label}
                      <ChevronRight size={17} />
                    </Link>
                  </td>
                  <td>
                    <Meter value={u.progress} />
                  </td>
                  <td className={s.right}>
                    {u.done}/{u.total}
                  </td>
                  <td className={s.right}>
                    {u.checked}/{u.total}
                  </td>
                  <td className={`${s.right} ${u.defects ? s.danger : ""}`}>
                    {u.defects}
                  </td>
                  <td>
                    <span className={`${s.badge} ${u.included ? "" : s.warn}`}>
                      {u.included
                        ? t("Dahil", "Included")
                        : t("Özet dışında", "Excluded")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{t("Bu seçimde kayıt yok.", "No matching records.")}</Empty>
      )}
    </>
  );
}
