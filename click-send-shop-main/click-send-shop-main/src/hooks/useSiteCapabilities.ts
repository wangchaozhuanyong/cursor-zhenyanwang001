import { useEffect, useState } from "react";
import * as homeService from "@/services/homeService";
import { DEFAULT_SITE_CAPABILITIES, type RuntimeConfig, type SiteCapabilities } from "@/types/siteCapabilities";

let cachedCapabilities: SiteCapabilities | null = null;
let cachedRuntimeConfig: RuntimeConfig | null = null;
let inflight: Promise<SiteCapabilities> | null = null;
const subscribers = new Set<(capabilities: SiteCapabilities) => void>();

/** 避免弱网/国产浏览器下 bootstrap 长时间挂起，导致全屏遮罩挡住所有点击 */
const CAPABILITIES_READY_TIMEOUT_MS = 8_000;

function normalize(value?: Partial<SiteCapabilities> | null): SiteCapabilities {
  return { ...DEFAULT_SITE_CAPABILITIES, ...(value ?? {}) };
}

function notifyAll(capabilities: SiteCapabilities) {
  subscribers.forEach((cb) => cb(capabilities));
}

async function loadOnce(): Promise<SiteCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;
  if (inflight) return inflight;

  const fallbackCapabilities = (): SiteCapabilities => {
    if (cachedCapabilities) return cachedCapabilities;
    cachedCapabilities = DEFAULT_SITE_CAPABILITIES;
    notifyAll(DEFAULT_SITE_CAPABILITIES);
    return DEFAULT_SITE_CAPABILITIES;
  };

  inflight = new Promise<SiteCapabilities>((resolve) => {
    const timer = window.setTimeout(() => resolve(fallbackCapabilities()), CAPABILITIES_READY_TIMEOUT_MS);
    homeService.fetchHomeBootstrap()
      .then((bootstrap) => {
        const capabilities = normalize(bootstrap.siteCapabilities || bootstrap.runtimeConfig?.features);
        cachedCapabilities = capabilities;
        cachedRuntimeConfig = bootstrap.runtimeConfig || null;
        notifyAll(capabilities);
        return capabilities;
      })
      .catch(() => fallbackCapabilities())
      .then((capabilities) => {
        window.clearTimeout(timer);
        resolve(capabilities);
      });
  }).finally(() => {
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

/** 功能开关是否已从服务端/bootstrap 加载完成（避免语言门禁闪屏或误放行） */
export function useSiteCapabilitiesReady(): boolean {
  const [ready, setReady] = useState(() => cachedCapabilities !== null);

  useEffect(() => {
    if (cachedCapabilities) {
      setReady(true);
      return;
    }
    let cancelled = false;
    loadOnce().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
