export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (init.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }

    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return null;
}