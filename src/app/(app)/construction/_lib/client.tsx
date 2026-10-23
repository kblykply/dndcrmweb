"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/authedFetch";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";
import type { Project, Workspace } from "./types";
export function useCopy() {
  const { locale } = useLanguage();
  return {
    tr: locale === "tr",
    t: (tr: string, en: string) => (locale === "tr" ? tr : en),
  };
}
export function errorText(e: unknown) {
  let msg = e instanceof Error ? e.message : String(e);
  try {
    const b = JSON.parse(msg);
    msg = Array.isArray(b.message) ? b.message.join(" ") : b.message || msg;
  } catch {}
  return msg;
}
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const active = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const value = await authedFetch("/construction" + path, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setData(value);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(errorText(e));
        setData(null);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    void reload();
    return () => active.current?.abort();
  }, [reload]);
  return { data, error, loading, reload };
}
const Context = createContext<{
  workspace: ReturnType<typeof useResource<Workspace>>;
  project: ReturnType<typeof useResource<Project>>;
  projectId: string;
  select: (id: string) => void;
} | null>(null);
export function ConstructionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const projectId = params.get("project") || "perla";
  const workspace = useResource<Workspace>("/workspace"),
    project = useResource<Project>(
      workspace.data?.projects.some((p) => p.id === projectId)
        ? `/projects/${encodeURIComponent(projectId)}`
        : null,
    );
  const select = (id: string) => {
    const query = new URLSearchParams(params.toString());
    query.set("project", id);
    const base = /\/(units|claims|budgets)\/[^/]+$/.test(pathname)
      ? pathname.replace(/\/[^/]+$/, "")
      : pathname;
    router.push(
      `${base.includes("/units") ? "/construction/progress" : base}?${query}`,
    );
  };
  return (
    <Context.Provider value={{ workspace, project, projectId, select }}>
      {children}
    </Context.Provider>
  );
}
export function useConstruction() {
  const c = useContext(Context);
  if (!c) throw new Error("ConstructionProvider missing");
  return c;
}
export const num = (n: unknown, digits = 2) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(Number(n));
export const amount = (n: unknown) => (n == null ? "—" : `${num(n)} £`);
export const percent = (n: unknown) => (n == null ? "—" : `%${num(n, 1)}`);
export const date = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("tr-TR") : "—";
export const statusText = (v: string, tr = true) =>
  ({
    DONE: tr ? "Bitti" : "Done",
    NOT_DONE: tr ? "Bitmedi" : "Not done",
    PARTIAL: tr ? "Eksik var" : "Partial",
    UNCHECKED: tr ? "Kontrol edilmedi" : "Unchecked",
    SUITABLE: tr ? "Uygun" : "Suitable",
    UNSUITABLE: tr ? "Uygun değil" : "Unsuitable",
    OPEN: tr ? "Açık" : "Open",
    RESOLVED: tr ? "Tamamlandı" : "Resolved",
  })[v] || v;
export const canAccess = () => {
  const u = getUser();
  return (
    !!u &&
    ["ADMIN", "ACCOUNTING"].includes(u.role) &&
    !u.isPreview &&
    u.originalRole !== "PREVIEW"
  );
};
