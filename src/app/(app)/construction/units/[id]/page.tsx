"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Back,
  EditButton,
  EditDialog,
  Export,
  HistoryButton,
  Stat,
  State,
} from "../../_components/Shared";
import {
  date,
  num,
  percent,
  statusText,
  useConstruction,
  useCopy,
  useResource,
} from "../../_lib/client";
import type { Entry, UnitDetail } from "../../_lib/types";
import s from "../../construction.module.css";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const shared = useConstruction();
  const refresh = async () => {
    await Promise.all([
      resource.reload(),
      shared.project.reload(),
      shared.workspace.reload(),
    ]);
  };
  const resource = useResource<UnitDetail>(`/units/${encodeURIComponent(id)}`);
  const { tr, t } = useCopy();
  const [edit, setEdit] = useState<Entry | null>(null);
  const u = resource.data;
  if (!u) return <State {...resource} retry={() => void resource.reload()} />;
  const report = {
    title: `${u.project.name} · ${u.block} / ${u.label}`,
    filename: `insaat-${u.block}-${u.label}`,
    metadata: [
      u.sourceRef,
      u.included
        ? t("Genel ilerlemeye dahil", "Included in overall progress")
        : t("Genel ilerleme dışında", "Excluded from overall progress"),
      t(
        "Kontrol edilmedi: uygun veya kusurlu olarak değerlendirilmedi.",
        "Unchecked: not assessed as suitable or defective.",
      ),
    ],
    sheets: [
      {
        name: t("İşler", "Tasks"),
        columns: [
          { label: t("İş", "Trade") },
          { label: t("Ağırlık", "Weight"), kind: "percent" as const },
          { label: t("Durum", "Status") },
          { label: t("Kalite", "Quality") },
          { label: t("Kontrol tarihi", "Inspection date") },
          { label: t("Not", "Note") },
        ],
        rows: u.entries.map((e) => [
          e.trade.name,
          Number(e.trade.weight) / 100,
          statusText(e.status, tr),
          e.quality === "PARTIAL"
            ? t("Kısmen uygun", "Partly suitable")
            : statusText(e.quality, tr),
          date(e.checkedAt),
          e.note,
        ]),
      },
    ],
  };
  return (
    <>
      <Back href={`/construction/progress?project=${u.projectId}`}>
        {u.project.name} · {t("İlerleme", "Progress")}
      </Back>
      <div className={s.sectionTitle}>
        <h2>
          {u.block} {t("Blok", "Block")} · {u.label}
        </h2>
        <div className={s.actions}>
          <HistoryButton projectId={u.projectId} entityId={u.id} />
          <Export report={report} />
        </div>
      </div>
      {u.scopeNote && <p className={s.notice}>{u.scopeNote}</p>}
      <div className={s.stats}>
        <Stat label={t("İlerleme", "Progress")} value={percent(u.progress)} />
        <Stat
          label={t("Biten iş", "Completed tasks")}
          value={`${u.done}/${u.total}`}
        />
        <Stat
          label={t("Kontrol edilen", "Inspected")}
          value={`${u.checked}/${u.total}`}
        />
        <Stat
          label={t("Kalite puanı", "Quality score")}
          value={u.checked ? percent(u.quality) : "—"}
          detail={t(
            "Kontrol edilmeyen işler puan kazandırmaz",
            "Unchecked tasks receive no score",
          )}
        />
      </div>
      <div className={s.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>{t("İş kalemi", "Trade")}</th>
              <th className={s.right}>{t("Ağırlık", "Weight")}</th>
              <th>{t("Durum", "Status")}</th>
              <th>{t("Kalite", "Quality")}</th>
              <th>{t("Not / kontrol", "Note / inspection")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {u.entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.trade.name}</strong>
                </td>
                <td className={s.right}>%{num(e.trade.weight, 0)}</td>
                <td>
                  <span
                    className={`${s.badge} ${e.status === "DONE" ? s.good : e.status === "PARTIAL" ? s.warn : ""}`}
                  >
                    {statusText(e.status, tr)}
                  </span>
                </td>
                <td>
                  <span
                    className={`${s.badge} ${["PARTIAL", "UNSUITABLE"].includes(e.quality) ? s.warn : e.quality === "SUITABLE" ? s.good : ""}`}
                  >
                    {e.quality === "PARTIAL"
                      ? t("Kısmen uygun", "Partly suitable")
                      : statusText(e.quality, tr)}
                  </span>
                </td>
                <td>
                  {e.note || "—"}
                  {e.checkedAt && (
                    <small className={s.labelLine}>{date(e.checkedAt)}</small>
                  )}
                </td>
                <td>
                  {u.canEdit && (
                    <EditButton
                      label={`${e.trade.name} · ${t("Düzenle", "Edit")}`}
                      onClick={() => setEdit(e)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <EditDialog
          title={edit.trade.name}
          path={`/units/${u.id}/entries/${edit.id}`}
          initial={{
            version: edit.version,
            status: edit.status,
            quality: edit.quality,
            note: edit.note,
          }}
          fields={[
            {
              key: "status",
              label: t("İşin durumu", "Work status"),
              type: "select",
              options: ["NOT_DONE", "PARTIAL", "DONE"].map((value) => ({
                value,
                label: statusText(value, tr),
              })),
            },
            {
              key: "quality",
              label: t("Kalite kontrol", "Quality inspection"),
              type: "select",
              options: ["UNCHECKED", "SUITABLE", "PARTIAL", "UNSUITABLE"].map(
                (value) => ({
                  value,
                  label:
                    value === "PARTIAL"
                      ? t("Kısmen uygun", "Partly suitable")
                      : statusText(value, tr),
                }),
              ),
            },
            {
              key: "note",
              label: t("Eksik / açıklama", "Defect / note"),
              type: "textarea",
            },
          ]}
          onClose={() => setEdit(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
