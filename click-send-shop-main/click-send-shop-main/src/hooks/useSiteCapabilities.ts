import { useEffect, useState } from "react";
import * as homeService from "@/services/homeService";
import { DEFAULT_SITE_CAPABILITIES, type RuntimeConfig, type SiteCapabilities } from "@/types/siteCapabilities";

let cachedCapabilities: SiteCapabilities | null = null;
let cachedRuntimeConfig: RuntimeConfig | null = null;
let inflight: Promise<SiteCapabilities> | null = null;
const subscribers = new Set<(capabilities: SiteCapabilities) => void>();

function normalize(value?: Partial<SiteCapabilities> | null): SiteCapabilities {
  return { ...DEFAULT_SITE_CAPABILITIES, ...(value ?? {}) };
}

function notifyAll(capabilities: SiteCapabilities) {
  subscribers.forEach((cb) => cb(capabilities));
}

async function loadOnce(): Promise<SiteCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;
  if (inflight) return inflight;
  inflight = homeService.fetchHomeBootstrap()
    .then((bootstrap) => {
      const capabilities = normalize(bootstrap.siteCapabilities || bootstrap.runtimeConfig?.features);
      cachedCapabilities = capabilities;
      cachedRuntimeConfig = bootstrap.runtimeConfig || null;
      notifyAll(capabilities);
      return capabilities;
    })
    .catch(() => {
      cachedCapabilities = DEFAULT_SITE_CAPABILITIES;
      notifyAll(DEFAULT_SITE_CAPABILITIES);
      return DEFAULT_SITE_CAPABILITIES;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function refreshSiteCapabilities() {
  cachedCapabilities = null;
  cachedRuntimeConfig = null;
  inflight = null;
  return loadOnce();
}

export function getCachedRuntimeConfig() {
  return cachedRuntimeConfig;
}

export function useSiteCapabilities(): SiteCapabilities {
  const [capabilities, setCapabilities] = useState<SiteCapabilities>(cachedCapabilities ?? DEFAULT_SITE_CAPABILITIES);

  useEffect(() => {
    const sub = (next: SiteCapabilities) => setCapabilities(next);
    subscribers.add(sub);
    if (cachedCapabilities) {
      setCapabilities(cachedCapabilities);
    } else {
      loadOnce();
    }
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  return capabilities;
}
