export type TrackingConsentCategory = "analytics" | "ads";

export type TrackingConsentPreferences = Record<TrackingConsentCategory, boolean>;

export interface StoredTrackingConsent {
  version: 1;
  updatedAt: string;
  preferences: TrackingConsentPreferences;
}

const STORAGE_KEY = "cookie-tracking-consent:v1";
const ANON_KEY = "privacy-anonymous-id:v1";

export const DEFAULT_TRACKING_CONSENT: TrackingConsentPreferences = {
  analytics: false,
  ads: false,
};

const listeners = new Set<(consent: StoredTrackingConsent | null) => void>();

function parseStoredConsent(raw: string | null): StoredTrackingConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredTrackingConsent;
    if (!parsed || parsed.version !== 1 || !parsed.preferences) return null;
    return {
      version: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      preferences: {
        analytics: parsed.preferences.analytics === true,
        ads: parsed.preferences.ads === true,
      },
    };
  } catch {
    return null;
  }
}

export function getTrackingConsent(): StoredTrackingConsent | null {
  if (typeof window === "undefined") return null;
  return parseStoredConsent(window.localStorage.getItem(STORAGE_KEY));
}

export function saveTrackingConsent(preferences: Partial<TrackingConsentPreferences>) {
  if (typeof window === "undefined") return;
  const consent: StoredTrackingConsent = {
    version: 1,
    updatedAt: new Date().toISOString(),
    preferences: {
      ...DEFAULT_TRACKING_CONSENT,
      ...preferences,
    },
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  recordConsentOnServer(consent).catch(() => {});
  listeners.forEach((listener) => listener(consent));
  window.dispatchEvent(new CustomEvent("tracking-consent-change", { detail: consent }));
}

function getAnonymousId() {
  let id = window.localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

async function recordConsentOnServer(consent: StoredTrackingConsent) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
  await fetch(`${baseUrl}/privacy/consents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      anonymous_id: getAnonymousId(),
      consent_version: `v${consent.version}`,
      analytics_allowed: consent.preferences.analytics,
      ads_allowed: consent.preferences.ads,
    }),
  });
}

export function subscribeTrackingConsent(listener: (consent: StoredTrackingConsent | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasTrackingConsent(category: TrackingConsentCategory) {
  return getTrackingConsent()?.preferences[category] === true;
}
