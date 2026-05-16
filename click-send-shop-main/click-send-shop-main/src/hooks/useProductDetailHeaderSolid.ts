import { useEffect, useState, type RefObject } from "react";

const HEADER_ROOT_MARGIN =
  "calc(-1 * (var(--store-tab-header-height, 3.5rem) + env(safe-area-inset-top, 0px))) 0px 0px 0px";

type Options = {
  /** 是否监听 sentinel（有主图的正常详情页） */
  observe: boolean;
  /** 不监听时的顶栏形态（加载中=false，错误页=true） */
  defaultSolid: boolean;
};

/**
 * 信息区顶部的 sentinel 滚出顶栏区域后返回 solid=true。
 * 未滚动时 sentinel 可能在视口下方，此时保持沉浸态，避免一进页就显示实底顶栏。
 */
export function useProductDetailHeaderSolid(
  sentinelRef: RefObject<HTMLElement | null>,
  { observe, defaultSolid }: Options,
) {
  const [solid, setSolid] = useState(defaultSolid);

  useEffect(() => {
    if (!observe) {
      setSolid(defaultSolid);
      return;
    }
    setSolid(false);
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSolid(false);
          return;
        }
        // 已滚过顶栏线（在视口上方）才吸顶；仍在视口下方说明尚未滚动，保持透明
        setSolid(entry.boundingClientRect.top < 0);
      },
      { root: null, rootMargin: HEADER_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [observe, defaultSolid, sentinelRef]);

  return solid;
}
