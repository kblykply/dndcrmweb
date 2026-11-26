"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Agency = { id: string; name: string };
export default function AgencyEntryAssignment({
  value,
  onChange,
  initialName,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  initialName?: string;
  disabled?: boolean;
}) {
  const { locale } = useLanguage();
  const tr = locale === "tr";
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Agency[]>([]);
  const [selected, setSelected] = useState<Agency | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (disabled) return;
    let active = true;
    const timer = setTimeout(() => {
      void authedFetch(`/users/entry-agencies?q=${encodeURIComponent(q)}`)
        .then((data: Agency[]) => {
          if (active) {
            setRows(data);
            setFailed(false);
          }
        })
        .catch(() => {
          if (active) {
            setRows([]);
            setFailed(true);
          }
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, disabled]);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{tr ? "Bağlı acente" : "Assigned agency"}</span>
        <input
          aria-label={tr ? "Acente ara" : "Search agencies"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
          placeholder={tr ? "Acente adıyla ara…" : "Search by agency name…"}
        />
        <select
          aria-label={tr ? "Bağlı acente" : "Assigned agency"}
          value={value}
          onChange={(e) => {
            setSelected(rows.find((row) => row.id === e.target.value) || null);
            onChange(e.target.value);
          }}
          disabled={disabled}
          required
        >
          <option value="">{tr ? "Acente seçin" : "Select an agency"}</option>
          {value && !rows.some((row) => row.id === value) && (
            <option value={value}>
              {selected?.id === value ? selected.name : initialName || value}
            </option>
          )}
          {rows.map((row) => (
            <option value={row.id} key={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {failed && (
        <p role="alert">
          {tr
            ? "Acente listesi alınamadı. Aramayı tekrar deneyin."
            : "Could not load agencies. Try searching again."}
        </p>
      )}
      <small className="muted">
        {tr
          ? "Bu kullanıcı yalnızca seçilen acenteye müşteri ekler ve kendi eklediklerini görür. Düzenleme, silme ve diğer modüllere erişim verilmez."
          : "This user can only add customers under this agency and view their own entries. Editing, deletion and other modules are unavailable."}
      </small>
    </div>
  );
}
