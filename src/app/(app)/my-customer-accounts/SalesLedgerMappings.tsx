"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import s from "../finance/payment-tracking/payment-tracking.module.css";
type Data = {
  codes: string[];
  users: { id: string; name: string; email: string }[];
  mappings: { code: string; userId: string }[];
  portfolios?: {
    userId: string;
    accountCount: number;
    customerCount: number;
    overdueCount: number;
  }[];
  importedAt?: string | null;
};
export default function SalesLedgerMappings({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const { locale } = useLanguage(),
    tr = locale === "tr";
  const [data, setData] = useState<Data | null>(null),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    authedFetch("/sales-ledger-mappings", { signal: controller.signal })
      .then((result: Data) => {
        setData(result);
        setDraft(
          Object.fromEntries(
            result.mappings.map((row) => [row.code, row.userId]),
          ),
        );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <section className={`${s.page} ${s.mappingPage}`}>
      <header className={s.header}>
        <div>
          <h1>{tr ? "Satışçı eşleştirmeleri" : "Salesperson mappings"}</h1>
          <p>
            {tr
              ? "Satışçılar yalnızca kendi eşleşen carilerini görür. Cari ve geciken kayıt sayıları tüm ödeme türlerini kapsar."
              : "Salespeople see only their matched accounts. Account and overdue counts include all payment types."}
          </p>
        </div>
      </header>
      {error && (
        <p className={s.notice} role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">{tr ? "Yükleniyor…" : "Loading…"}</p>
      ) : (
        <div className={s.panel}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>
                    {tr ? "Logo satışçı kodu" : "Logo representative code"}
                  </th>
                  <th>{tr ? "CRM satışçısı" : "CRM salesperson"}</th>
                  <th className={s.numeric}>{tr ? "Müşteri" : "Customers"}</th>
                  <th className={s.numeric}>{tr ? "Cari" : "Accounts"}</th>
                  <th className={s.numeric}>
                    {tr ? "Geciken cari" : "Overdue accounts"}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.codes.map((code) => {
                  const savedUserId = data.mappings.find(
                    (row) => row.code === code,
                  )?.userId;
                  const portfolio = data.portfolios?.find(
                    (row) => row.userId === savedUserId,
                  );
                  return (
                    <tr key={code}>
                      <th scope="row">{code}</th>
                      <td>
                        <select
                          aria-label={`${code} ${tr ? "satışçısı" : "salesperson"}`}
                          value={draft[code] || ""}
                          disabled={!!busy}
                          onChange={(event) =>
                            setDraft({ ...draft, [code]: event.target.value })
                          }
                        >
                          <option value="">
                            {tr ? "Eşleştirilmemiş" : "Unmapped"}
                          </option>
                          {data.users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={s.numeric}>
                        {portfolio?.customerCount ?? "—"}
                      </td>
                      <td className={s.numeric}>
                        {portfolio?.accountCount ?? "—"}
                      </td>
                      <td className={s.numeric}>
                        {portfolio?.overdueCount ?? "—"}
                      </td>
                      <td>
                        <button
                          className={s.button}
                          disabled={
                            !!busy ||
                            (draft[code] || "") ===
                              (data.mappings.find((row) => row.code === code)
                                ?.userId || "")
                          }
                          onClick={async () => {
                            setBusy(code);
                            setError("");
                            try {
                              const userId = draft[code] || null;
                              await authedFetch(
                                `/sales-ledger-mappings/${encodeURIComponent(code)}`,
                                {
                                  method: "PUT",
                                  body: JSON.stringify({ userId }),
                                },
                              );
                              const refreshed: Data = await authedFetch(
                                "/sales-ledger-mappings",
                              );
                              setData(refreshed);
                              onSaved?.();
                              setDraft(
                                Object.fromEntries(
                                  refreshed.mappings.map((row) => [
                                    row.code,
                                    row.userId,
                                  ]),
                                ),
                              );
                            } catch (cause) {
                              setError(
                                cause instanceof Error
                                  ? cause.message
                                  : String(cause),
                              );
                            } finally {
                              setBusy("");
                            }
                          }}
                        >
                          {busy === code
                            ? tr
                              ? "Kaydediliyor…"
                              : "Saving…"
                            : tr
                              ? "Kaydet"
                              : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.importedAt && (
            <p className={s.notice}>
              {tr ? "Logo veri aktarımı: " : "Logo data imported: "}
              {new Date(data.importedAt).toLocaleString(
                tr ? "tr-TR" : "en-GB",
                { timeZone: "Europe/Istanbul" },
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
