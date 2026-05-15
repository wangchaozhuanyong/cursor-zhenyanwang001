import { useState, useEffect } from "react";
import * as homeBannerService from "@/services/homeBannerService";
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

export function useHomeBanners(opts?: UseHomeBannersOpts) {
  const fetchRemote = opts?.fetchRemote !== false;
  const [banners, setBanners] = useState<Banner[]>(() => readBannerCache());
  const [loading, setLoading] = useState(fetchRemote && banners.length === 0);

  useEffect(() => {
    if (!fetchRemote) return;
    let cancelled = false;
    setLoading(true);
    homeBannerService
      .fetchActiveBanners()
      .then((list) => {
        if (cancelled) return;
        const next = sanitizeBanners(Array.isArray(list) ? list : []);
        setBanners(next);
        writeBannerCache(next);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
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
