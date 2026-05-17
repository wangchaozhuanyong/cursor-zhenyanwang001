import { useEffect, useState } from "react";
import { DEFAULT_HOME_MODULE_SETTINGS, mergeHomeModuleSettings, type HomeModuleSettings } from "@/constants/homeModules";
import { fetchHomeOps } from "@/services/contentService";
import * as homeService from "@/services/homeService";
import type { HomeNavItem } from "@/types/content";

let cachedSettings: HomeModuleSettings | null = null;
let cachedNavItems: HomeNavItem[] | null = null;
let inflight: Promise<{ settings: HomeModuleSettings; navItems: HomeNavItem[] }> | null = null;

async function loadHomeModuleSettings() {
  if (cachedSettings && cachedNavItems) {
    return { settings: cachedSettings, navItems: cachedNavItems };
  }
  if (inflight) return inflight;

  inflight = homeService
    .fetchHomeBootstrap()
    .then((bootstrap) => {
      const settings = mergeHomeModuleSettings(bootstrap?.homeOps?.moduleSettings);
      const navItems = Array.isArray(bootstrap?.homeOps?.navItems) ? bootstrap.homeOps.navItems : [];
      cachedSettings = settings;
      cachedNavItems = navItems;
      return { settings, navItems };
    })
    .catch(() =>
      fetchHomeOps().then((data) => {
        const settings = mergeHomeModuleSettings(data.moduleSettings);
        const navItems = Array.isArray(data.navItems) ? data.navItems : [];
        cachedSettings = settings;
        cachedNavItems = navItems;
        return { settings, navItems };
      }),
    )
    .catch(() => {
      const fallback = { settings: DEFAULT_HOME_MODULE_SETTINGS, navItems: [] as HomeNavItem[] };
      cachedSettings = fallback.settings;
      cachedNavItems = fallback.navItems;
      return fallback;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateHomeModuleSettingsCache() {
  cachedSettings = null;
  cachedNavItems = null;
  inflight = null;
}

export function useHomeModuleSettings() {
  const [settings, setSettings] = useState<HomeModuleSettings>(cachedSettings ?? DEFAULT_HOME_MODULE_SETTINGS);
  const [navItems, setNavItems] = useState<HomeNavItem[]>(cachedNavItems ?? []);
  const [ready, setReady] = useState(Boolean(cachedSettings));

  useEffect(() => {
    let alive = true;
    void loadHomeModuleSettings().then((next) => {
      if (!alive) return;
      setSettings(next.settings);
      setNavItems(next.navItems);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { settings, navItems, ready };
}
