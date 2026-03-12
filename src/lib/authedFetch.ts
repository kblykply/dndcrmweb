import { API } from "./api";
import { authedHeaders, clearSession } from "./auth";

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

  // 🔐 If token expired or invalid → logout automatically
  if (res.status === 401) {
    clearSession();

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }

    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  // some endpoints return empty body
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }

  return null;
}