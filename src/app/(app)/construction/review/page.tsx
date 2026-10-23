"use client";
import { useState } from "react";
import {
  EditButton,
  EditDialog,
  Empty,
  Export,
  HistoryButton,
  SearchBox,
  State,
} from "../_components/Shared";
import { statusText, useConstruction, useCopy } from "../_lib/client";
import type { Issue } from "../_lib/types";
import s from "../construction.module.css";
export default function Page() {
  const { project } = useConstruction();
  const { tr, t } = useCopy();
  const [query, setQuery] = useState(""),
    [closed, setClosed] = useState(false),
    [edit, setEdit] = useState<Issue | null>(null);
  const p = project.data;
  if (!p) return <State {...project} retry={() => void project.reload()} />;
  const rows = p.issues.filter(
    (i) =>
      (closed || i.status === "OPEN") &&
      `${i.title} ${i.detail} ${i.requiredInfo} ${i.owner}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const report = {
    title: `${p.name} · ${t("Tamamlanması gereken bilgiler", "Required information")}`,
    filename: `${p.id}-eksik-bilgi-raporu`,
    metadata: [
      t(
        "Perla ve Perla II ayrı tutulur. Kaynaklar değiştirilmez; hesap farkları ayrıca gösterilir.",
        "Perla and Perla II are separate. Sources are retained; calculation differences are shown separately.",
      ),
      `${t("Kapsam", "Scope")}: ${closed ? t("Tüm kontroller", "All checks") : t("Açık kontroller", "Open checks")}${query ? ` · ${query}` : ""}`,
    ],
    sheets: [
      {
        name: t("Gerekli bilgiler", "Required information"),
        columns: [
          { label: t("Konu", "Subject"), width: 35 },
          { label: t("Mevcut durum", "Current state"), width: 60 },
          { label: t("İstenen bilgi", "Required information"), width: 60 },
          { label: t("Sorumlu ekip", "Responsible team"), width: 25 },
          { label: t("Kaynak", "Source"), width: 35 },
          { label: t("Durum / yanıt", "Status / response"), width: 40 },
        ],
        rows: rows.map((i) => [
          i.title,
          i.detail,
          i.requiredInfo,
          i.owner,
          i.sourceRef,
          `${statusText(i.status, tr)}${i.resolution ? ` · ${i.resolution}` : ""}`,
        ]),
      },
    ],
  };
  return (
    <>
      <div className={s.sectionTitle}>
        <div>
          <h2>{t("Kontrol ve Eksikler", "Review & Missing Data")}</h2>
          <p className={s.muted}>
            {p.issues.filter((i) => i.status === "OPEN").length}{" "}
            {t("açık konu", "open items")}
          </p>
        </div>
        <div className={s.actions}>
          <SearchBox value={query} onChange={setQuery} />
          <HistoryButton projectId={p.id} />
          <Export report={report} />
        </div>
      </div>
      <div className={s.toolbar}>
        <span className={s.small}>
          {t(
            "Belgeler geldikçe yanıtı ve referansı kaydedin. Bir konuyu kapatmak kaynak veriyi değiştirmez.",
            "Record responses and references as documents arrive. Closing a check does not change source data.",
          )}
        </span>
        <label className={s.checkLine}>
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
          />
          {t("Tamamlananları da göster", "Include resolved")}
        </label>
      </div>
      {rows.length ? (
        rows.map((i) => (
          <article key={i.id} className={s.issueCard}>
            <header>
              <div>
                <h3>{i.title}</h3>
                <small className={s.muted}>
                  {i.owner} · {statusText(i.status, tr)}
                </small>
              </div>
              {p.canEdit && (
                <EditButton
                  label={`${i.title} · ${t("Yanıtla", "Respond")}`}
                  onClick={() => setEdit(i)}
                />
              )}
            </header>
            <dl>
              <dt>{t("Mevcut durum", "Current state")}</dt>
              <dd>{i.detail}</dd>
              <dt>{t("Gerekli bilgi", "Required information")}</dt>
              <dd>
                <strong>{i.requiredInfo}</strong>
              </dd>
              <dt>{t("Kaynak", "Source")}</dt>
              <dd className={s.small}>{i.sourceRef}</dd>
              {i.resolution && (
                <>
                  <dt>{t("Yanıt", "Response")}</dt>
                  <dd>{i.resolution}</dd>
                </>
              )}
            </dl>
          </article>
        ))
      ) : (
        <Empty>
          {t("Bu seçimde açık konu yok.", "No items in this view.")}
        </Empty>
      )}
      {edit && (
        <EditDialog
          title={edit.title}
          path={`/issues/${edit.id}`}
          initial={{
            version: edit.version,
            status: edit.status,
            resolution: edit.resolution,
          }}
          fields={[
            {
              key: "status",
              label: t("Durum", "Status"),
              type: "select",
              options: [
                { value: "OPEN", label: t("Açık", "Open") },
                { value: "RESOLVED", label: t("Tamamlandı", "Resolved") },
              ],
            },
            {
              key: "resolution",
              label: t(
                "Yanıt ve belge referansı",
                "Response and document reference",
              ),
              type: "textarea",
            },
          ]}
          onSaved={() => project.reload()}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
