import { useState, useEffect } from "react";
import * as homeBannerService from "@/services/homeBannerService";
import * as homeService from "@/services/homeService";
import type { Banner } from "@/types/banner";

type UseHomeBannersOpts = { fetchRemote?: boolean };
const BANNER_CACHE_KEY = "home_banners_cache_v1";

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
      image: String(item?.image || item?.image_url || ""),
      link: String(item?.link || item?.url || ""),
      sort_order: Number(item?.sort_order || 0),
      enabled: item?.enabled !== false,
    })),
  );
}

export function useHomeBanners(opts?: UseHomeBannersOpts) {
  const fetchRemote = opts?.fetchRemote !== false;
  const [banners, setBanners] = useState<Banner[]>(() => readBannerCache());
  const [loading, setLoading] = useState(() => fetchRemote && readBannerCache().length === 0);

  useEffect(() => {
    if (!fetchRemote) return;
    let cancelled = false;

    const cachedBootstrap = homeService.getCachedHomeBootstrap();
    if (cachedBootstrap?.banners) {
      const next = normalizeBootstrapBanners(cachedBootstrap.banners);
      if (next.length > 0) {
        setBanners(next);
        writeBannerCache(next);
        setLoading(false);
      }
    }

    setLoading((prev) => prev && readBannerCache().length === 0);
    homeService
      .fetchHomeBootstrap()
      .then((bootstrap) => {
        if (cancelled) return;
        const next = normalizeBootstrapBanners(bootstrap?.banners);
        if (next.length > 0) {
          setBanners(next);
          writeBannerCache(next);
          return;
        }
        return homeBannerService.fetchActiveBanners().then((list) => {
          if (cancelled) return;
          const fallback = sanitizeBanners(Array.isArray(list) ? list : []);
          setBanners(fallback);
          writeBannerCache(fallback);
        });
      })
      .catch(() => {
        homeBannerService
          .fetchActiveBanners()
          .then((list) => {
            if (cancelled) return;
            const fallback = sanitizeBanners(Array.isArray(list) ? list : []);
            setBanners(fallback);
            writeBannerCache(fallback);
          })
          .catch(() => {
            // keep existing cached banners
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchRemote]);

  return { banners, loading };
}

export function invalidateHomeBannersCache() {
  homeService.invalidateHomeBootstrapCache();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BANNER_CACHE_KEY);
  } catch {
    // ignore storage failures
  }
}

function readBannerCache(): Banner[] {
  if (typeof window === "undefined") return [];
  try {
    return sanitizeBanners(JSON.parse(sessionStorage.getItem(BANNER_CACHE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeBannerCache(list: Banner[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BANNER_CACHE_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    // ignore storage quota/privacy failures
  }
}
