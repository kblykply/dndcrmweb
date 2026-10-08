"use client";
import { useCallback, useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { authedFetch } from "@/lib/authedFetch";
import type { Locale, Workspace } from "./types";
export const supportRoles = [
  "ADMIN",
  "MANAGER",
  "SALES",
  "CALLCENTER",
  "AFTERSALES",
  "ACCOUNTING",
];
export function errorText(error: unknown, locale: Locale) {
  const raw = error instanceof Error ? error.message : String(error || "");
  let message = raw;
  try {
    const parsed = JSON.parse(raw);
    message = Array.isArray(parsed.message)
      ? parsed.message.join(" · ")
      : parsed.message || raw;
  } catch {
    /* Plain response. */
  }
  const t = (a: string, b: string) => (locale === "tr" ? a : b);
  if (/409|VERSION_CONFLICT|version|changed by another/i.test(raw))
    return t(
      "Ticket başka bir işlemle güncellendi. Yazdıkların korunuyor; son durumu yeni sekmede inceleyebilir, ardından sayfayı yenileyerek tekrar düzenleyebilirsin.",
      "The ticket changed elsewhere. Your draft is retained; review the latest record in another tab, then reload before editing again.",
    );
  if (/403|Forbidden|inactive|preview/i.test(raw))
    return t(
      "Bu işlem için erişim yetkin bulunmuyor.",
      "You do not have access to this action.",
    );
  if (/404|not found/i.test(raw))
    return t(
      "Ticket bulunamadı veya bu kayda erişimin yok.",
      "The ticket was not found or you do not have access.",
    );
  if (/413|PayloadTooLarge|too large|file size/i.test(raw))
    return t(
      "Dosya boyutu sınırı aşıldı. Her dosya en fazla 5 MB olabilir.",
      "The file size limit was exceeded. Each file can be up to 5 MB.",
    );
  if (/fetch|network/i.test(raw))
    return t(
      "Sunucuya ulaşılamadı. Bilgilerin korunuyor; bağlantını kontrol edip tekrar dene.",
      "Could not reach the server. Your input is retained; check your connection and retry.",
    );
  return (
    message || t("İşlem tamamlanamadı.", "The action could not be completed.")
  );
}
export function useSupportWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const reload = useCallback(async () => {
    const user = getUser();
    if (
      !user ||
      !supportRoles.includes(user.role) ||
      user.isPreview ||
      user.originalRole === "PREVIEW"
    ) {
      setDenied(true);
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await authedFetch("/it-support/workspace"));
    } catch (err) {
      setWorkspace(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { workspace, loading, denied, error, reload };
}
