"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Plus, Settings2 } from "lucide-react";
import {
  Back,
  EditButton,
  EditDialog,
  Export,
  HistoryButton,
  InfoButton,
  Modal,
  Stat,
  State,
} from "../../_components/Shared";
import {
  amount,
  date,
  num,
  useConstruction,
  useCopy,
  useResource,
} from "../../_lib/client";
import type { ClaimDetail, ClaimLine } from "../../_lib/types";
import s from "../../construction.module.css";
export default function Page() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter();
  const shared = useConstruction();
  const refresh = async () => {
    await Promise.all([
      resource.reload(),
      shared.project.reload(),
      shared.workspace.reload(),
    ]);
  };
  const resource = useResource<ClaimDetail>(
    `/claims/${encodeURIComponent(id)}`,
  );
  const { t } = useCopy();
  const [line, setLine] = useState<ClaimLine | null>(null),
    [measure, setMeasure] = useState<ClaimLine | null>(null),
    [edit, setEdit] = useState(false),
    [next, setNext] = useState(false);
  const c = resource.data;
  if (!c) return <State {...resource} retry={() => void resource.reload()} />;
  const rows = measure?.measurements.cells.reduce<
    Record<number, { address: string; value: string | number }[]>
  >((map, cell) => {
    const row = Number(cell.address.match(/\d+$/)?.[0]);
    (map[row] ??= []).push(cell);
    return map;
  }, {});
  const report = {
    title: `${c.project.name} · ${t("Hakediş", "Claim")} #${c.number}`,
    filename: `${c.projectId}-hakedis-${c.number}`,
    metadata: [
      `${c.contractor} · ${date(c.period)} · GBP`,
      t(
        "Kontrol bekliyor. Ödeme belgesi değildir.",
        "Pending review. Not a payment document.",
      ),
      `${t("İşler toplamı", "Gross")}: ${amount(c.totals.gross)} · ${t("Düzeltme / minha", "Adjustment")}: ${amount(c.adjustment)} · ${t("KDV", "VAT")}: ${amount(c.totals.tax)} · ${t("Kesinti", "Deduction")}: ${amount(c.deduction)} · ${t("Net", "Net")}: ${amount(c.totals.net)}`,
    ],
    sheets: [
      {
        name: t("İş kalemleri", "Work items"),
        columns: [
          { label: t("İş", "Work") },
          { label: t("Birim", "Unit") },
          { label: t("Önceki miktar", "Previous qty"), kind: "money" as const },
          { label: t("Ölçülen", "Measured"), kind: "money" as const },
          { label: t("Kabul edilen", "Accepted"), kind: "money" as const },
          {
            label: t("Birim fiyat GBP", "Unit price GBP"),
            kind: "money" as const,
          },
          {
            label: t("Dönem tutarı GBP", "Period amount GBP"),
            kind: "money" as const,
          },
        ],
        rows: c.lines.map((l) => [
          l.name,
          l.unit,
          Number(l.previousQty),
          l.measuredQty === null ? null : Number(l.measuredQty),
          Number(l.acceptedQty),
          Number(l.unitPrice),
          Number(l.acceptedQty) * Number(l.unitPrice),
        ]),
      },
    ],
  };
  return (
    <>
      <Back href={`/construction/claims?project=${c.projectId}`}>
        {c.project.name} · {t("Hakedişler", "Claims")}
      </Back>
      <div className={s.sectionTitle}>
        <div>
          <h2>
            {t("Hakediş", "Claim")} #{c.number}
          </h2>
          <p className={s.muted}>
            {c.contractor} · {date(c.period)}
          </p>
        </div>
        <div className={s.actions}>
          {c.canEdit && (
            <>
              <button
                title={t("Yeni dönem aç", "Create next period")}
                aria-label={t("Yeni dönem aç", "Create next period")}
                className={s.icon}
                onClick={() => setNext(true)}
              >
                <Plus size={21} />
              </button>
              <button
                className={s.icon}
                title={t("Kesinti ve KDV", "Deductions and VAT")}
                aria-label={t("Kesinti ve KDV", "Deductions and VAT")}
                onClick={() => setEdit(true)}
              >
                <Settings2 size={21} />
              </button>
            </>
          )}
          <InfoButton title={t("Kaynak ve hesap", "Source and calculation")}>
            <p>{c.note}</p>
            <p>
              {t(
                "İşler toplamı + imzalı düzeltme = KDV matrahı. KDV eklenir, diğer kesintiler düşülür. Sözleşme onayı ve banka ödemesi bu kayıtla yapılmaz.",
                "Gross work plus signed adjustment is the VAT base. VAT is added and deductions subtracted. This record does not approve a contract or make a bank payment.",
              )}
            </p>
            <p>
              {t("Kaynak net tutar", "Source net")}: {amount(c.sourceNet)}
            </p>
            <p>
              {t("Düşüm açıklaması", "Adjustment note")}:{" "}
              {c.adjustmentNote || "—"}
            </p>
          </InfoButton>
          <HistoryButton projectId={c.projectId} entityId={c.id} />
          <Export report={report} />
        </div>
      </div>
      {c.lockedByNextPeriod && <p className={s.notice}>{t("Sonraki dönem açıldığı için bu hakediş düzenlemeye kapalı.", "This claim is locked because its next period has been created.")}</p>}
      <p className={s.notice}>
        {t(
          "Kontrol bekliyor · Bu tutarlar hakediştir; yapılmış ödeme olarak gösterilmez.",
          "Pending review · These are claim amounts, not recorded payments.",
        )}
      </p>
      <div className={s.stats}>
        <Stat
          label={t("İşler toplamı", "Gross work")}
          value={amount(c.totals.gross)}
        />
        <Stat
          label={t("Düzeltme / minha", "Adjustment")}
          value={amount(c.adjustment)}
        />
        <Stat
          label={t("KDV", "VAT")}
          value={amount(c.totals.tax)}
          detail={`%${num(c.taxRate, 0)}`}
        />
        <Stat
          label={t("Diğer kesintiler", "Other deductions")}
          value={amount(c.deduction)}
        />
        <Stat
          label={t("Net hakediş", "Net claim")}
          value={amount(c.totals.net)}
        />
      </div>
      <div className={s.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>{t("İş kalemi", "Work item")}</th>
              <th className={s.right}>{t("Önceki", "Previous")}</th>
              <th className={s.right}>{t("Ölçülen", "Measured")}</th>
              <th className={s.right}>{t("Kabul edilen", "Accepted")}</th>
              <th className={s.right}>{t("Birim fiyat", "Unit price")}</th>
              <th className={s.right}>{t("Dönem tutarı", "Period amount")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {c.lines.map((l) => (
              <tr key={l.id}>
                <td className={s.name}>
                  <strong>{l.name}</strong>
                  <small className={s.labelLine}>
                    {l.unit} · {l.note}
                  </small>
                </td>
                <td className={s.right}>{num(l.previousQty)}</td>
                <td className={s.right}>{num(l.measuredQty)}</td>
                <td className={s.right}>
                  <strong>{num(l.acceptedQty)}</strong>
                </td>
                <td className={s.right}>{amount(l.unitPrice)}</td>
                <td className={s.right}>
                  <strong>
                    {amount(Number(l.acceptedQty) * Number(l.unitPrice))}
                  </strong>
                </td>
                <td>
                  <div className={s.actions}>
                    <button
                      className={s.icon}
                      title={`${l.name} · ${t("Kaynak metraj", "Source measurement")}`}
                      aria-label={`${l.name} · ${t("Kaynak metraj", "Source measurement")}`}
                      onClick={() => setMeasure(l)}
                    >
                      <FileText size={19} />
                    </button>
                    {c.canEdit && (
                      <EditButton
                        label={`${l.name} · ${t("Düzenle", "Edit")}`}
                        onClick={() => setLine(l)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {line && (
        <EditDialog
          title={line.name}
          path={`/claims/${c.id}/lines/${line.id}`}
          initial={{
            version: c.version,
            previousQty: line.previousQty,
            measuredQty: line.measuredQty,
            acceptedQty: line.acceptedQty,
            unitPrice: line.unitPrice,
            note: line.note,
          }}
          fields={[
            {
              key: "previousQty",
              label: t("Önceki miktar", "Previous quantity"),
              type: "number",
            },
            {
              key: "measuredQty",
              label: t(
                "Ölçülen miktar · bilinmiyorsa boş",
                "Measured quantity · blank if unknown",
              ),
              type: "number",
              nullable: true,
            },
            {
              key: "acceptedQty",
              label: t(
                "Bu dönem kabul edilen miktar",
                "Accepted quantity this period",
              ),
              type: "number",
            },
            {
              key: "unitPrice",
              label: t("Birim fiyat · GBP", "Unit price · GBP"),
              type: "number",
            },
            { key: "note", label: t("Açıklama", "Note"), type: "textarea" },
          ]}
          onSaved={refresh}
          onClose={() => setLine(null)}
        />
      )}
      {edit && (
        <EditDialog
          title={t("Kesinti ve KDV", "Deductions and VAT")}
          path={`/claims/${c.id}`}
          initial={{
            version: c.version,
            taxRate: c.taxRate,
            adjustment: c.adjustment,
            deduction: c.deduction,
            adjustmentNote: c.adjustmentNote,
            note: c.note,
          }}
          fields={[
            {
              key: "taxRate",
              label: t("KDV oranı %", "VAT rate %"),
              type: "number",
            },
            {
              key: "adjustment",
              label: t(
                "Düzeltme · düşüm için eksi GBP",
                "Adjustment · negative GBP for reductions",
              ),
              type: "number",
            },
            {
              key: "deduction",
              label: t("Diğer kesintiler GBP", "Other deductions GBP"),
              type: "number",
            },
            {
              key: "adjustmentNote",
              label: t("Düzeltme açıklaması", "Adjustment explanation"),
              type: "textarea",
            },
            {
              key: "note",
              label: t("Hakediş notu", "Claim note"),
              type: "textarea",
            },
          ]}
          onSaved={refresh}
          onClose={() => setEdit(false)}
        />
      )}
      {next && (
        <EditDialog
          title={t("Yeni dönem hakedişi", "Next period claim")}
          path={`/claims/${c.id}/next-period`}
          method="POST"
          initial={{ version: c.version, number: "", period: "" }}
          fields={[
            { key: "number", label: t("Hakediş numarası", "Claim number") },
            {
              key: "period",
              label: t("Hakediş tarihi", "Claim date"),
              type: "date",
            },
          ]}
          onSaved={async (r) => {
            await Promise.all([
              shared.project.reload(),
              shared.workspace.reload(),
            ]);
            router.push(`/construction/claims/${r.id}?project=${c.projectId}`);
          }}
          onClose={() => setNext(false)}
        />
      )}
      {measure && (
        <Modal
          title={`${measure.name} · ${t("Kaynak metraj", "Source measurement")}`}
          onClose={() => setMeasure(null)}
        >
          <p className={s.muted}>
            {measure.measurements.name} ·{" "}
            {t(
              "Excel başlangıç kaydı; düzenlemeler bu belgenin üzerine yazılmaz.",
              "Excel baseline; edits do not overwrite this source.",
            )}
          </p>
          <div className={s.stats}>
            <Stat
              label={t("Ölçülen", "Measured")}
              value={`${num(measure.measuredQty)} ${measure.unit}`}
            />
            <Stat
              label={t("Kabul edilen", "Accepted")}
              value={`${num(measure.acceptedQty)} ${measure.unit}`}
            />
          </div>
          {measure.note && <p className={s.notice}>{measure.note}</p>}
          {rows && Object.keys(rows).length ? (
            <div className={`${s.tableWrap} ${s.measurement}`}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Excel satırı", "Excel row")}</th>
                    <th>{t("Kaynak değerler", "Source values")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rows).map(([row, cells]) => (
                    <tr key={row}>
                      <td>{row}</td>
                      <td>
                        {cells.map((cell) => (
                          <span
                            key={cell.address}
                            style={{
                              display: "inline-block",
                              margin: "3px 12px 3px 0",
                            }}
                          >
                            <small className={s.muted}>{cell.address}: </small>
                            {String(cell.value)}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              {t(
                "Yeni dönem için kaynak metraj henüz eklenmedi. Miktar ve açıklamalar iş kaleminden düzenlenebilir.",
                "No source measurement has been attached to this new period. Edit quantities and notes on the work item.",
              )}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
