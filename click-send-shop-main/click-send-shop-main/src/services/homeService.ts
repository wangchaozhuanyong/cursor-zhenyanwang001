import * as homeApi from "@/api/modules/home";

export type HomeBootstrap = homeApi.HomeBootstrap;

const HOME_BOOTSTRAP_TTL_MS = 300_000;
let cachedBootstrap: HomeBootstrap | null = null;
let cachedAt = 0;
let inflightBootstrap: Promise<HomeBootstrap> | null = null;

export function getCachedHomeBootstrap() {
  if (!cachedBootstrap) return null;
  if (Date.now() - cachedAt > HOME_BOOTSTRAP_TTL_MS) return null;
  return cachedBootstrap;
}

export async function fetchHomeBootstrap(options?: { force?: boolean }): Promise<HomeBootstrap> {
  const force = options?.force === true;
  const cached = !force ? getCachedHomeBootstrap() : null;
  if (cached) return cached;
  if (inflightBootstrap) return inflightBootstrap;

  inflightBootstrap = homeApi
    .getHomeBootstrap()
    .then((res) => {
      cachedBootstrap = res.data;
      cachedAt = Date.now();
      return res.data;
    })
    .finally(() => {
      inflightBootstrap = null;
    });

  return inflightBootstrap;
}
