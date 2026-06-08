import { useState, useEffect } from "react";
import * as homeBannerService from "@/services/homeBannerService";
import * as homeService from "@/services/homeService";
import type { Banner } from "@/types/banner";
import { scheduleIdleTask } from "@/utils/idleScheduler";

type UseHomeBannersOpts = { fetchRemote?: boolean };
const BANNER_CACHE_KEY = "home_banners_cache_v1";
const BANNER_CACHE_TTL_MS = 60_000;
const BANNER_BACKGROUND_REFRESH_DELAY_MS = 9_000;

function sanitizeBanners(list: Banner[]): Banner[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => {
    const image = String(item?.image || "").trim();
    return Boolean(item?.id) && Boolean(image);
  });
}

function normalizeBootstrapBanners(raw: unknown): Banner[] {
  if (!Array.isArray(raw)) return [];
  return sanitizeBanners(
    raw.map((item: any) => ({
      id: String(item?.id || ""),
      title: String(item?.title || ""),
      description: String(item?.description || item?.subtitle || ""),
      cta_text: String(item?.cta_text || item?.ctaText || ""),
      image: String(item?.image || item?.image_url || ""),
      link: String(item?.link || item?.url || ""),
      sort_order: Number(item?.sort_order || 0),
      enabled: item?.enabled !== false,
    })),
  );
}

function scheduleBannerIdleRefresh(callback: () => void) {
  return scheduleIdleTask("home-banner-refresh", callback, {
    delayMs: BANNER_BACKGROUND_REFRESH_DELAY_MS,
    timeoutMs: 3000,
    jitterMs: 2500,
  });
}

export function useHomeBanners(opts?: UseHomeBannersOpts) {
  const fetchRemote = opts?.fetchRemote !== false;
  const [banners, setBanners] = useState<Banner[]>(() => readBannerCache());
  const [loading, setLoading] = useState(() => fetchRemote && readBannerCache().length === 0);

  useEffect(() => {
    if (!fetchRemote) return;
    let cancelled = false;
    let cancelLatestRefresh: (() => void) | undefined;

    const applyBanners = (next: Banner[]) => {
      if (cancelled || next.length === 0) return false;
      setBanners(next);
      writeBannerCache(next);
      setLoading(false);
      return true;
    };

    const cachedBootstrap = homeService.getCachedHomeBootstrap();
    if (cachedBootstrap?.banners) {
      const next = normalizeBootstrapBanners(cachedBootstrap.banners);
      applyBanners(next);
    }

    setLoading((prev) => prev && readBannerCache().length === 0);

    const loadBanners = async () => {
      let usedBootstrapBanners = false;
      try {
        const bootstrap = await homeService.fetchHomeBootstrap();
        usedBootstrapBanners = applyBanners(normalizeBootstrapBanners(bootstrap?.banners));
      } catch {
        // Keep going; /api/banners is the authoritative fallback.
      }

      const loadLatestBanners = async () => {
        try {
          const latest = await homeBannerService.fetchActiveBanners({ fresh: true });
          applyBanners(sanitizeBanners(Array.isArray(latest) ? latest : []));
        } catch {
          // keep existing cached banners
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      if (usedBootstrapBanners || readBannerCache().length > 0) {
        if (!cancelled) setLoading(false);
        cancelLatestRefresh = scheduleBannerIdleRefresh(() => {
          if (!cancelled) void loadLatestBanners();
        });
        return;
      }

      await loadLatestBanners();
    };

    void loadBanners();

    return () => {
      cancelled = true;
      cancelLatestRefresh?.();
    };
  }, [fetchRemote]);

  return { banners, loading };
}

export function invalidateHomeBannersCache() {
  homeService.invalidateHomeBootstrapCache();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BANNER_CACHE_KEY);
    localStorage.removeItem(BANNER_CACHE_KEY);
  } catch {
    // ignore storage failures
  }
}

function readBannerCache(): Banner[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(BANNER_CACHE_KEY) || "[]");
    if (Array.isArray(parsed)) return sanitizeBanners(parsed);
    if (!parsed || typeof parsed !== "object") return [];
    const cachedAt = Number((parsed as { cachedAt?: unknown }).cachedAt || 0);
    if (!cachedAt || Date.now() - cachedAt > BANNER_CACHE_TTL_MS) return [];
    return sanitizeBanners((parsed as { items?: Banner[] }).items || []);
  } catch {
    return [];
  }
}

function writeBannerCache(list: Banner[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BANNER_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      items: list.slice(0, 5),
    }));
  } catch {
    // ignore storage quota/privacy failures
  }
}
