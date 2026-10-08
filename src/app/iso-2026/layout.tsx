import type { Metadata } from "next";
import AppLayout from "../(app)/layout";

export const metadata: Metadata = {
  title: "ISO 2026 | DND CRM",
  description: "ISO 9001:2026 kalite yönetim sistemi ve madde çalışma alanı",
  robots: { index: false, follow: false },
};

export default function Iso2026Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
