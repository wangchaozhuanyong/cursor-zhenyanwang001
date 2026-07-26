import * as homeApi from "@/api/modules/home";

export type HomeBootstrap = homeApi.HomeBootstrap;

const HOME_BOOTSTRAP_TTL_MS = 60_000;
const HOME_BOOTSTRAP_FAILURE_COOLDOWN_MS = 2_500;
let cachedBootstrap: HomeBootstrap | null = null;
let cachedAt = 0;
let inflightBootstrap: Promise<HomeBootstrap> | null = null;
let lastBootstrapFailure: { error: unknown; failedAt: number } | null = null;
let cachedMarketing: HomeBootstrap["marketing"] | null = null;
let cachedMarketingAt = 0;
let inflightMarketing: Promise<HomeBootstrap["marketing"]> | null = null;

export function getCachedHomeBootstrap() {
  if (!cachedBootstrap) return null;
  if (Date.now() - cachedAt > HOME_BOOTSTRAP_TTL_MS) return null;
  return cachedBootstrap;
}

export function invalidateHomeBootstrapCache() {
  cachedBootstrap = null;
  cachedAt = 0;
  inflightBootstrap = null;
  lastBootstrapFailure = null;
  cachedMarketing = null;
  cachedMarketingAt = 0;
  inflightMarketing = null;
}

export async function fetchHomeBootstrap(options?: { force?: boolean }): Promise<HomeBootstrap> {
  const force = options?.force === true;
  const cached = !force ? getCachedHomeBootstrap() : null;
  if (cached) return cached;
  if (inflightBootstrap) return inflightBootstrap;
  if (
    !force
    && lastBootstrapFailure
    && Date.now() - lastBootstrapFailure.failedAt < HOME_BOOTSTRAP_FAILURE_COOLDOWN_MS
  ) {
    throw lastBootstrapFailure.error;
  }

  inflightBootstrap = homeApi
    .getHomeBootstrapLite()
    .then((res) => {
      cachedBootstrap = res.data;
      cachedAt = Date.now();
      lastBootstrapFailure = null;
      return res.data;
    })
    .catch((error: unknown) => {
      lastBootstrapFailure = { error, failedAt: Date.now() };
      throw error;
    })
    .finally(() => {
      inflightBootstrap = null;
    });

  return inflightBootstrap;
}

export function getCachedHomeMarketing() {
  if (!cachedMarketing) return null;
  if (Date.now() - cachedMarketingAt > HOME_BOOTSTRAP_TTL_MS) return null;
  return cachedMarketing;
}

export async function fetchHomeMarketing(options?: { force?: boolean }): Promise<HomeBootstrap["marketing"]> {
  const force = options?.force === true;
  const cached = !force ? getCachedHomeMarketing() : null;
  if (cached) return cached;
  if (inflightMarketing) return inflightMarketing;

  inflightMarketing = homeApi
    .getHomeMarketing()
    .then((res) => {
      cachedMarketing = res.data;
      cachedMarketingAt = Date.now();
      cachedBootstrap = cachedBootstrap
        ? { ...cachedBootstrap, marketing: res.data }
        : cachedBootstrap;
      return res.data;
    })
    .finally(() => {
      inflightMarketing = null;
    });

  return inflightMarketing;
}
