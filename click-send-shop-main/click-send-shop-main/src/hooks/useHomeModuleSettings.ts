import { useEffect, useState } from "react";
import { DEFAULT_HOME_MODULE_SETTINGS, mergeHomeModuleSettings, type HomeModuleSettings } from "@/constants/homeModules";
import { fetchHomeOps } from "@/services/contentService";

let cached: HomeModuleSettings | null = null;
let inflight: Promise<HomeModuleSettings> | null = null;

async function loadHomeModuleSettings(): Promise<HomeModuleSettings> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetchHomeOps()
    .then((data) => {
      const merged = mergeHomeModuleSettings(data.moduleSettings);
      cached = merged;
      return merged;
    })
    .catch(() => DEFAULT_HOME_MODULE_SETTINGS)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 供后台保存后刷新前台缓存 */
export function invalidateHomeModuleSettingsCache() {
  cached = null;
  inflight = null;
}

export function useHomeModuleSettings() {
  const [settings, setSettings] = useState<HomeModuleSettings>(cached ?? DEFAULT_HOME_MODULE_SETTINGS);
  const [ready, setReady] = useState(Boolean(cached));

  useEffect(() => {
    let alive = true;
    void loadHomeModuleSettings().then((next) => {
      if (!alive) return;
      setSettings(next);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { settings, ready };
}
