import { API } from "./api";
import {
  authedHeaders,
  clearSession,
  getRefreshToken,
  setAccessToken,
} from "./auth";

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearSession();
    throw new Error("No refresh token");
  }

  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    clearSession();

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }

    throw new Error("Session expired");
  }

  const data = await res.json();

  if (!data?.accessToken) {
    clearSession();
    throw new Error("Refresh failed");
  }

  setAccessToken(data.accessToken);

  return data.accessToken;
}

async function parseError(res: Response) {
  const contentType = res.headers.get("content-type");

  try {
    if (contentType?.includes("application/json")) {
      const errorData = await res.json();
      return typeof errorData === "object"
        ? JSON.stringify(errorData)
        : String(errorData);
    }

    return await res.text();
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function authedFetch(path: string, init: RequestInit = {}) {
  const makeRequest = (headersOverride?: Record<string, string>) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authedHeaders(),
      ...(headersOverride || {}),
      ...(init.headers as Record<string, string> | undefined),
    };

    return fetch(`${API}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  };

  let res = await makeRequest();

  if (res.status === 401) {
    const newAccessToken = await refreshAccessToken();

    res = await makeRequest({
      Authorization: `Bearer ${newAccessToken}`,
    });
  }

  if (res.status === 401) {
    clearSession();

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }

    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error((await parseError(res)) || `Request failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return res.json();
  }

  return null;
}