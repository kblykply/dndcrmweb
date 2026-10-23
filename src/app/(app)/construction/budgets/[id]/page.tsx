"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Back,
  EditButton,
  EditDialog,
  Empty,
  Export,
  HistoryButton,
  InfoButton,
  SearchBox,
  Stat,
  State,
} from "../../_components/Shared";
import {
  amount,
  num,
  useConstruction,
  useCopy,
  useResource,
} from "../../_lib/client";
import type { BudgetDetail, BudgetItem } from "../../_lib/types";
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
  const resource = useResource<BudgetDetail>(
    `/budgets/${encodeURIComponent(id)}`,
  );
  const { t } = useCopy();
  const [category, setCategory] = useState(""),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState<BudgetItem | null>(null);
  const b = resource.data;
  if (!b) return <State {...resource} retry={() => void resource.reload()} />;
  const categories = [...new Set(b.items.map((i) => i.category))];
  const rows = b.items.filter(
    (i) =>
      (!category || i.category === category) &&
      `${i.name} ${i.category}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const report = {
    title: `${b.project.name} · ${t("Maliyet bütçesi", "Cost budget")}`,
    filename: `${b.projectId}-butce`,
    metadata: [
      category || t("Tüm kategoriler", "All categories"),
      query
        ? `${t("Arama", "Search")}: ${query}`
        : t(
            "Miktar × birim fiyat. Boş ödeme alanları bilinmiyor olarak korunur.",
            "Quantity × unit price. Blank payment fields remain unknown.",
          ),
      `${t("Excel genel toplam", "Excel grand total")}: ${amount(b.sourceTotal)} · ${t("Hesaplanan genel toplam", "Calculated grand total")}: ${amount(b.totals.calculated)}`,
    ],
    sheets: [
      {
        name: t("Kalemler", "Items"),
        columns: [
          { label: t("Grup", "Category") },
          { label: t("İş", "Work") },
          { label: t("Birim", "Unit") },
          { label: t("Miktar", "Quantity"), kind: "money" as const },
          {
            label: t("Birim fiyat GBP", "Unit price GBP"),
            kind: "money" as const,
          },
          { label: t("Kaynak GBP", "Source GBP"), kind: "money" as const },
          {
            label: t("Hesaplanan GBP", "Calculated GBP"),
            kind: "money" as const,
          },
          { label: t("Ödenen GBP", "Paid GBP"), kind: "money" as const },
        ],
        rows: rows.map((i) => [
          i.category,
          i.name,
          i.unit,
          Number(i.quantity),
          Number(i.unitPrice),
          Number(i.sourceAmount),
          i.calculated,
          i.paid === null ? null : Number(i.paid),
        ]),
      },
    ],
  };
  return (
    <>
      <Back href={`/construction/budgets?project=${b.projectId}`}>
        {b.project.name} · {t("Bütçeler", "Budgets")}
      </Back>
      <div className={s.sectionTitle}>
        <h2>{t("Maliyet Bütçesi", "Cost Budget")}</h2>
        <div className={s.actions}>
          <SearchBox value={query} onChange={setQuery} />
          <InfoButton
            title={t(
              "Kaynak ve hesap farkları",
              "Source and calculation differences",
            )}
          >
            <p>
              {t(
                "Excel kaynak toplamı saklanır. Hesaplanan tutar her satırın kendi miktarı × birim fiyatıdır. Kaynak hatası ve sonraki düzenlemeler fark oluşturabilir.",
                "The Excel total is retained. Calculated amounts use each row’s quantity × unit price. Source errors and later edits can create differences.",
              )}
            </p>
            <p>
              {t(
                "Havuz tutamak satırı kaynakta 3.900 £, kendi miktarıyla 840 £. Başlangıç farkı −3.060 £. Klima toplu bedeli miktar 1 ile hesaplanır.",
                "Pool grip is £3,900 in the source and £840 using its own quantity. Initial difference is −£3,060. The AC lump sum uses quantity 1.",
              )}
            </p>
            <p>
              {t(
                "Ödenen tutarlar belge mutabakatı gerektiren manuel izleme alanıdır; banka hareketi değildir. Gerçekleşen miktar bütçeyi aşabilir.",
                "Paid amounts are manual tracking fields requiring document reconciliation, not bank transactions. Completed quantities may exceed budget.",
              )}
            </p>
          </InfoButton>
          <HistoryButton projectId={b.projectId} entityId={b.id} />
          <Export report={report} />
        </div>
      </div>
      <div className={s.stats}>
        <Stat
          label={t("Hesaplanan bütçe", "Calculated budget")}
          value={amount(b.totals.calculated)}
        />
        <Stat
          label={t("Excel toplamı", "Excel total")}
          value={amount(b.sourceTotal)}
        />
        <Stat
          label={t("Kaynağa göre fark", "Difference from source")}
          value={
            b.sourceTotal === null
              ? "—"
              : amount(b.totals.calculated - Number(b.sourceTotal))
          }
        />
        <Stat
          label={t("Ödenen toplam", "Total paid")}
          value={amount(b.totals.paid)}
          detail={`${b.totals.paidCoverage}/${b.totals.itemCount} ${t("kalemde ödeme bilgisi", "items with payment data")}`}
        />
      </div>
      <div className={s.toolbar}>
        {category ? (
          <div className={s.actions}>
            <button onClick={() => setCategory("")}>
              {t("Tüm gruplar", "All categories")}
            </button>
            <ChevronRight size={17} />
            <strong>{category}</strong>
          </div>
        ) : (
          <strong>
            {t("Detay için iş grubunu açın", "Open a category for details")}
          </strong>
        )}
      </div>
      {!category && !query ? (
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{t("İş grubu", "Category")}</th>
                <th className={s.right}>{t("Kalem", "Items")}</th>
                <th className={s.right}>
                  {t("Kaynak kalemler toplamı", "Source line sum")}
                </th>
                <th className={s.right}>{t("Hesaplanan", "Calculated")}</th>
                <th className={s.right}>{t("Fark", "Difference")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((name) => {
                const items = b.items.filter((i) => i.category === name);
                const sum = items.reduce(
                    (n, i) => n + Number(i.quantity) * Number(i.unitPrice),
                    0,
                  ),
                  source = items.reduce(
                    (n, i) => n + Number(i.sourceAmount),
                    0,
                  );
                return (
                  <tr key={name}>
                    <td>
                      <button
                        className={s.rowButton}
                        onClick={() => setCategory(name)}
                      >
                        {name}
                        <ChevronRight size={17} />
                      </button>
                    </td>
                    <td className={s.right}>{items.length}</td>
                    <td className={s.right}>{amount(source)}</td>
                    <td className={s.right}>
                      <strong>{amount(sum)}</strong>
                    </td>
                    <td
                      className={`${s.right} ${Math.abs(sum - source) > 0.01 ? s.danger : ""}`}
                    >
                      {amount(sum - source)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : rows.length ? (
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{t("İş kalemi", "Item")}</th>
                <th className={s.right}>{t("Miktar", "Quantity")}</th>
                <th className={s.right}>{t("Birim fiyat", "Unit price")}</th>
                <th className={s.right}>{t("Bütçe", "Budget")}</th>
                <th className={s.right}>{t("Gerçekleşen", "Completed")}</th>
                <th className={s.right}>{t("Ödenen", "Paid")}</th>
                <th className={s.right}>
                  {t("Kalan bütçe", "Budget less paid")}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className={s.name}>
                    <strong>{i.name}</strong>
                    <span className={s.labelLine}>
                      {i.unit} · {i.sourceRef}
                    </span>
                    {(i.note ||
                      Math.abs(i.calculated - Number(i.sourceAmount)) >
                        0.01) && (
                      <details>
                        <summary>{t("Kaynak / not", "Source / note")}</summary>
                        <p>{i.note}</p>
                        <p>
                          {t("Kaynak tutar", "Source amount")}:{" "}
                          {amount(i.sourceAmount)}
                        </p>
                        <small>{i.sourceFormula}</small>
                      </details>
                    )}
                  </td>
                  <td className={s.right}>{num(i.quantity)}</td>
                  <td className={s.right}>{amount(i.unitPrice)}</td>
                  <td className={s.right}>
                    <strong>{amount(i.calculated)}</strong>
                  </td>
                  <td className={s.right}>{num(i.completedQty)}</td>
                  <td className={s.right}>{amount(i.paid)}</td>
                  <td
                    className={`${s.right} ${i.remainingBalance !== null && i.remainingBalance < 0 ? s.danger : ""}`}
                  >
                    {amount(i.remainingBalance)}
                  </td>
                  <td>
                    {b.canEdit && (
                      <EditButton
                        label={`${i.name} · ${t("Düzenle", "Edit")}`}
                        onClick={() => setEdit(i)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{t("Aramaya uygun kalem yok.", "No matching items.")}</Empty>
      )}
      {edit && (
        <EditDialog
          title={edit.name}
          path={`/budgets/${b.id}/items/${edit.id}`}
          initial={{
            version: edit.version,
            quantity: edit.quantity,
            unitPrice: edit.unitPrice,
            completedQty: edit.completedQty,
            paid: edit.paid,
            note: edit.note,
          }}
          fields={[
            {
              key: "quantity",
              label: `${t("Planlanan miktar", "Planned quantity")} · ${edit.unit}`,
              type: "number",
            },
            {
              key: "unitPrice",
              label: t("Birim fiyat GBP", "Unit price GBP"),
              type: "number",
            },
            {
              key: "completedQty",
              label: t(
                "Gerçekleşen miktar · bilinmiyorsa boş",
                "Completed quantity · blank if unknown",
              ),
              type: "number",
              nullable: true,
            },
            {
              key: "paid",
              label: t(
                "Belgeli ödenen GBP · bilinmiyorsa boş",
                "Documented paid GBP · blank if unknown",
              ),
              type: "number",
              nullable: true,
            },
            {
              key: "note",
              label: t("Not / belge referansı", "Note / document reference"),
              type: "textarea",
            },
          ]}
          onSaved={refresh}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
