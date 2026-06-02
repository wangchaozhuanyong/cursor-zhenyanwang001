import { useEffect, useState } from "react";
import { DEFAULT_HOME_MODULE_SETTINGS, mergeHomeModuleSettings, type HomeModuleSettings } from "@/constants/homeModules";
import { fetchHomeOps } from "@/services/contentService";
import * as homeService from "@/services/homeService";
import type { HomeNavItem } from "@/types/content";

const HOME_MODULE_CACHE_KEY = "home_module_settings_cache_v1";
const HOME_MODULE_CACHE_TTL_MS = 300_000;

function isFresh(cachedAt: number) {
  return cachedAt > 0 && Date.now() - cachedAt < HOME_MODULE_CACHE_TTL_MS;
}

function sanitizeNavItems(value: unknown): HomeNavItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HomeNavItem => (
    Boolean(item)
    && typeof item === "object"
    && typeof (item as HomeNavItem).id === "string"
    && typeof (item as HomeNavItem).title === "string"
  ));
}

function readHomeModuleCache(): { settings: HomeModuleSettings; navItems: HomeNavItem[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(HOME_MODULE_CACHE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const cachedAt = Number((parsed as { cachedAt?: unknown }).cachedAt || 0);
    if (!isFresh(cachedAt)) return null;
    return {
      settings: mergeHomeModuleSettings((parsed as { settings?: Partial<HomeModuleSettings> }).settings),
      navItems: sanitizeNavItems((parsed as { navItems?: unknown }).navItems),
    };
  } catch {
    return null;
  }
}

function writeHomeModuleCache(settings: HomeModuleSettings, navItems: HomeNavItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HOME_MODULE_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      settings,
      navItems,
    }));
  } catch {
    // ignore storage quota/privacy failures
  }
}

const initialHomeModuleCache = readHomeModuleCache();

let cachedSettings: HomeModuleSettings | null = initialHomeModuleCache?.settings ?? null;
let cachedNavItems: HomeNavItem[] | null = initialHomeModuleCache?.navItems ?? null;
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
      writeHomeModuleCache(settings, navItems);
      return { settings, navItems };
    })
    .catch(() =>
      fetchHomeOps().then((data) => {
        const settings = mergeHomeModuleSettings(data.moduleSettings);
        const navItems = Array.isArray(data.navItems) ? data.navItems : [];
        cachedSettings = settings;
        cachedNavItems = navItems;
        writeHomeModuleCache(settings, navItems);
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
  homeService.invalidateHomeBootstrapCache();
  try {
    window.sessionStorage.removeItem(HOME_MODULE_CACHE_KEY);
  } catch {
    // ignore storage failures
  }
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
