const CACHE_KEY = "auth_features_v1";
const TTL_MS = 10 * 60 * 1000;

export type AuthFeaturesSnapshot = {
  smsOtpLoginEnabled: boolean;
};

type CachePayload = AuthFeaturesSnapshot & { expiresAt: number };

export function readCachedAuthFeatures(): AuthFeaturesSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (typeof parsed.smsOtpLoginEnabled !== "boolean") return null;
    if (typeof parsed.expiresAt === "number" && Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return { smsOtpLoginEnabled: parsed.smsOtpLoginEnabled };
  } catch {
    return null;
  }
}

export function writeCachedAuthFeatures(features: AuthFeaturesSnapshot) {
  try {
    const payload: CachePayload = {
      ...features,
      expiresAt: Date.now() + TTL_MS,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}
