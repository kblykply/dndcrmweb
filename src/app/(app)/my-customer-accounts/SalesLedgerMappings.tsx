"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import s from "../finance/payment-tracking/payment-tracking.module.css";
type Data = {
  codes: string[];
  users: { id: string; name: string; email: string }[];
  mappings: { code: string; userId: string }[];
};
export default function SalesLedgerMappings() {
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
    <section className={s.page}>
      <header className={s.header}>
        <div>
          <h1>{tr ? "Müşteri Carilerim" : "My Customer Accounts"}</h1>
          <p>
            {tr
              ? "Logo satışçı kodlarını CRM satışçılarına bağlayın. Satışçılar yalnız kendi eşleşen carilerini görür. Eşleşmeyen veya birden fazla kişiye bağlı cariler satışçılara açılmaz."
              : "Map Logo representative codes to CRM salespeople. Unmapped or ambiguous accounts are not shared."}
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
          <table className={s.table}>
            <thead>
              <tr>
                <th>{tr ? "Logo satışçı kodu" : "Logo representative code"}</th>
                <th>{tr ? "CRM satışçısı" : "CRM salesperson"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.codes.map((code) => (
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
                            { method: "PUT", body: JSON.stringify({ userId }) },
                          );
                          setData((current) =>
                            current
                              ? {
                                  ...current,
                                  mappings: [
                                    ...current.mappings.filter(
                                      (row) => row.code !== code,
                                    ),
                                    ...(userId ? [{ code, userId }] : []),
                                  ],
                                }
                              : null,
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
