import type { TokenResponse } from "@/lib/api";

const SESSION_KEY = "thermomonitor.auth";

export interface AuthSession extends TokenResponse {
  email: string;
}

export function saveAuthSession(tokens: TokenResponse, email: string): void {
  if (typeof window === "undefined") return;
  const session: AuthSession = { ...tokens, email };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(SESSION_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}
