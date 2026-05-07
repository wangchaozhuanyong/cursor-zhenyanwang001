import { useState, useEffect } from "react";
import * as homeBannerService from "@/services/homeBannerService";
import type { Banner } from "@/types/banner";
import banner1 from "@/assets/banner1.jpg";
import banner2 from "@/assets/banner2.jpg";
import banner3 from "@/assets/banner3.jpg";

/** 与登录页一致的三张图，用于接口无数据、失败或后台图为占位路径时仍保证首页轮播 */
const FALLBACK: Banner[] = [
  { id: "f1", title: "新用户注册享 9 折优惠", image: banner1, link: "/", sort_order: 1, enabled: true },
  { id: "f2", title: "限时抢购 · 精选好物低至5折", image: banner2, link: "/", sort_order: 2, enabled: true },
  { id: "f3", title: "邀请好友注册 赢取积分奖励", image: banner3, link: "/", sort_order: 3, enabled: true },
];

/** 种子数据里 /lovable-uploads/ 等路径在仓库中不存在，会导致覆盖本地 fallback 后图片 404 */
function needsLocalImage(src: string | undefined): boolean {
  const s = (src ?? "").trim();
  if (!s) return true;
  if (s.includes("lovable-uploads")) return true;
  return false;
}

function mergeBannersWithFallback(apiList: Banner[]): Banner[] {
  if (!apiList?.length) return FALLBACK;
  return apiList.map((b, i) => {
    const fb = FALLBACK[i % FALLBACK.length];
    const useLocal = needsLocalImage(b.image);
    return {
      ...b,
      image: useLocal ? fb.image : b.image,
      title: (b.title && String(b.title).trim()) || fb.title,
    };
  });
}

type UseHomeBannersOpts = { fetchRemote?: boolean };

/** 首页 Banner：由页面引用 → Service → API。`fetchRemote: false` 仅用本地 fallback（如登录页省一条请求、减竞态） */
export function useHomeBanners(opts?: UseHomeBannersOpts) {
  const fetchRemote = opts?.fetchRemote !== false;
  const [banners, setBanners] = useState<Banner[]>(FALLBACK);
  const [loading, setLoading] = useState(fetchRemote);

  useEffect(() => {
    if (!fetchRemote) return;
    let cancelled = false;
    setLoading(true);
    homeBannerService
      .fetchActiveBanners()
      .then((list) => {
        if (cancelled) return;
        setBanners(mergeBannersWithFallback(Array.isArray(list) ? list : []));
      })
      .catch(() => {
        if (!cancelled) setBanners(FALLBACK);
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
