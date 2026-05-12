import { useState, useEffect } from "react";
import * as homeBannerService from "@/services/homeBannerService";
import type { Banner } from "@/types/banner";

type UseHomeBannersOpts = { fetchRemote?: boolean };

function sanitizeBanners(list: Banner[]): Banner[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => {
    const image = String(item?.image || "").trim();
    return Boolean(item?.id) && Boolean(image);
  });
}

export function useHomeBanners(opts?: UseHomeBannersOpts) {
  const fetchRemote = opts?.fetchRemote !== false;
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(fetchRemote);

  useEffect(() => {
    if (!fetchRemote) return;
    let cancelled = false;
    setLoading(true);
    homeBannerService
      .fetchActiveBanners()
      .then((list) => {
        if (cancelled) return;
        setBanners(sanitizeBanners(Array.isArray(list) ? list : []));
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
