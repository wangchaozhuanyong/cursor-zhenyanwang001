const DEVICE_KEY = "client_device_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function readCookie(): string {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEVICE_KEY}=`));
  return found ? decodeURIComponent(found.slice(DEVICE_KEY.length + 1)) : "";
}

function writeCookie(value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEVICE_KEY}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function getClientDeviceId(): string {
  if (typeof window === "undefined") return "server-render-device";
  const fromCookie = readCookie();
  const fromStorage = localStorage.getItem(DEVICE_KEY) || "";
  const current = fromCookie || fromStorage || randomId();
  localStorage.setItem(DEVICE_KEY, current);
  writeCookie(current);
  return current;
}

export function getClientTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}
