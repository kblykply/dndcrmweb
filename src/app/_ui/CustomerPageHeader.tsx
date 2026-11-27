import type { ReactNode } from "react";

export default function CustomerPageHeader({
  label,
  title,
  subtitle,
  children,
}: {
  label: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <header className="flex-between" style={{ gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {label}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{title}</h1>
        <div className="muted" style={{ fontSize: 13 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {children}
      </div>
    </header>
  );
}
