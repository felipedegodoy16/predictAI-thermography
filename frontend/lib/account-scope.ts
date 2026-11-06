const ACCOUNT_SCOPE_KEY = "predictai.account-scope";

export function getAccountScope(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACCOUNT_SCOPE_KEY);
}

export function setAccountScope(accountId: string | null): void {
  if (typeof window === "undefined") return;
  if (accountId) window.sessionStorage.setItem(ACCOUNT_SCOPE_KEY, accountId);
  else window.sessionStorage.removeItem(ACCOUNT_SCOPE_KEY);
}
