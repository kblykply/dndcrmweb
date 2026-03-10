import { API } from "./api";
import { authedHeaders } from "./auth";

export async function authedFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authedHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}