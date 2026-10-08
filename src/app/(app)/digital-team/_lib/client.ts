"use client";
import { useCallback, useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { authedFetch } from "@/lib/authedFetch";
import type { Locale, TeamWorkspace } from "./types";

export function errorText(error: unknown, locale: Locale): string {
  let message = error instanceof Error ? error.message : String(error);
  try {
    const body = JSON.parse(message);
    message = Array.isArray(body.message)
      ? body.message.join(" · ")
      : body.message || message;
  } catch {
    /* Plain error. */
  }
  if (/409|version|conflict|changed by|güncel/i.test(message))
    return locale === "tr"
      ? "Bu kayıt başka bir işlemle değişti. Girdiğin bilgiler korunuyor. Son sürümü yeni sekmede incele; yeniden düzenlemek için formu kapatıp sayfayı yenile."
      : "This record changed elsewhere. Your draft is retained. Review the latest version in another tab, then close this form and reload before editing again.";
  if (/403|forbidden|admin|yetki/i.test(message))
    return locale === "tr"
      ? "Bu modüle yalnızca aktif ADMIN kullanıcıları erişebilir."
      : "Only active ADMIN users can access this module.";
  if (/fetch|network/i.test(message))
    return locale === "tr"
      ? "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene."
      : "Could not reach the server. Check your connection and retry.";
  return (
    message ||
    (locale === "tr"
      ? "İşlem tamamlanamadı."
      : "The action could not be completed.")
  );
}

export function useTeamWorkspace() {
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const load = useCallback(async () => {
    const user = getUser();
    if (
      !user ||
      user.role !== "ADMIN" ||
      user.originalRole === "PREVIEW" ||
      user.isPreview
    ) {
      setDenied(true);
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await authedFetch("/digital-team/workspace"));
    } catch (err) {
      setError(err);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { workspace, loading, denied, error, reload: load };
}
