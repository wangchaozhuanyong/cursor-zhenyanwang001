const USER_AUTH_FLAG_KEY = "user_authenticated";
const ADMIN_AUTH_FLAG_KEY = "admin_authenticated";
const LEGACY_TOKEN_KEYS = [
  "user_access_token",
  "user_refresh_token",
  "admin_access_token",
  "admin_refresh_token",
];

function purgeLegacyTokens(): void {
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function getAccessToken(): string | null {
  purgeLegacyTokens();
  return null;
}

export function setAccessToken(_token: string): void {
  purgeLegacyTokens();
  localStorage.setItem(USER_AUTH_FLAG_KEY, "1");
}

export function getRefreshToken(): string | null {
  purgeLegacyTokens();
  return null;
}

export function setRefreshToken(_token: string): void {
  purgeLegacyTokens();
  localStorage.setItem(USER_AUTH_FLAG_KEY, "1");
}

export function setTokens(_access: string, _refresh: string): void {
  purgeLegacyTokens();
  localStorage.setItem(USER_AUTH_FLAG_KEY, "1");
}

export function clearTokens(): void {
  purgeLegacyTokens();
  localStorage.removeItem(USER_AUTH_FLAG_KEY);
}

export function isLoggedIn(): boolean {
  purgeLegacyTokens();
  return localStorage.getItem(USER_AUTH_FLAG_KEY) === "1";
}

export function getAdminAccessToken(): string | null {
  purgeLegacyTokens();
  return null;
}

export function setAdminAccessToken(_token: string): void {
  purgeLegacyTokens();
  localStorage.setItem(ADMIN_AUTH_FLAG_KEY, "1");
}

export function getAdminRefreshToken(): string | null {
  purgeLegacyTokens();
  return null;
}

export function setAdminRefreshToken(_token: string): void {
  purgeLegacyTokens();
  localStorage.setItem(ADMIN_AUTH_FLAG_KEY, "1");
}

export function setAdminTokens(_access: string, _refresh: string): void {
  purgeLegacyTokens();
  localStorage.setItem(ADMIN_AUTH_FLAG_KEY, "1");
}

export function clearAdminTokens(): void {
  purgeLegacyTokens();
  localStorage.removeItem(ADMIN_AUTH_FLAG_KEY);
}

export function isAdminLoggedIn(): boolean {
  purgeLegacyTokens();
  return localStorage.getItem(ADMIN_AUTH_FLAG_KEY) === "1";
}
