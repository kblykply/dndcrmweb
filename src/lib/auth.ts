export const AUTH_SESSION_CHANGED_EVENT = "crm:session-changed";
let sessionVersion = 0;

export function getAuthSessionVersion() {
  return sessionVersion;
}

function sessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function getUser() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

// 🔥 UPDATED (now includes refreshToken)
export function setSession(user: any, accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  sessionVersion += 1;
  sessionChanged();
}

// 🔥 NEW
export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
  sessionChanged();
}

// 🔥 UPDATED (clear refresh too)
export function clearSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionVersion += 1;
  sessionChanged();
}

// 🔥 NEW (better logout)
export function logout() {
  clearSession();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function authedHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function updateSessionUser(user: { id: string; role: string; [key: string]: unknown }) {
  if (typeof window === "undefined") return;
  const previous = getUser();
  localStorage.setItem("user", JSON.stringify({ ...previous, ...user }));
  if (previous?.id !== user.id || previous?.role !== user.role) sessionVersion += 1;
  sessionChanged();
}
