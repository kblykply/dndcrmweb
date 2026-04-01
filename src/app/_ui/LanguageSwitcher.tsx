"use client";

import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as "tr" | "en")}
      aria-label="Language"
      style={{
        minWidth: 76,
        height: 38,
        borderRadius: 12,
        border: "1px solid var(--stroke)",
        background: "var(--surface)",
        color: "var(--text-primary)",
        padding: "0 10px",
        cursor: "pointer",
      }}
    >
      <option value="tr">TR</option>
      <option value="en">EN</option>
    </select>
  );
}