export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (init.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    // A status of zero means no HTTP response was received.
    throw new ApiError(0, "Network request failed");
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(res.status, "Unauthorized");
    }

    const text = await res.text();
    throw new ApiError(res.status, text || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return null;
}
