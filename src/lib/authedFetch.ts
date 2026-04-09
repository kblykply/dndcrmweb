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

  // 🔐 Auto logout on 401
  if (res.status === 401) {
    clearSession();

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }

    throw new Error("Unauthorized");
  }

  const contentType = res.headers.get("content-type");

  // ❌ Handle errors properly (JSON FIRST)
  if (!res.ok) {
    let errorData: any = null;

    try {
      if (contentType?.includes("application/json")) {
        errorData = await res.json();
      } else {
        const text = await res.text();
        errorData = text;
      }
    } catch {
      errorData = null;
    }

    // 👇 IMPORTANT: preserve JSON structure
    if (errorData && typeof errorData === "object") {
      throw new Error(JSON.stringify(errorData));
    }

    throw new Error(errorData || `Request failed (${res.status})`);
  }

  // ✅ Success response
  if (contentType?.includes("application/json")) {
    return res.json();
  }

  return null;
}