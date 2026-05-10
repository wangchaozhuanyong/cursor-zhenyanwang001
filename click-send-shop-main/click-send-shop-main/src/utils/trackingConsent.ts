export type TrackingConsentCategory = "analytics" | "ads";

export type TrackingConsentPreferences = Record<TrackingConsentCategory, boolean>;

export interface StoredTrackingConsent {
  version: 1;
  updatedAt: string;
  preferences: TrackingConsentPreferences;
}

const STORAGE_KEY = "cookie-tracking-consent:v1";

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
  listeners.forEach((listener) => listener(consent));
  window.dispatchEvent(new CustomEvent("tracking-consent-change", { detail: consent }));
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
