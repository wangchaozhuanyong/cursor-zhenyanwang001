import { useEffect, useState, type RefObject } from "react";

type Options = {
  /** 是否监听 sentinel（有主图的正常详情页） */
  observe: boolean;
  /** 不监听时的顶栏形态（加载中=false，错误页=true） */
  defaultSolid: boolean;
};

function parseCssLengthToPx(raw: string, context: HTMLElement): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.endsWith("px")) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  if (value.endsWith("rem")) {
    const rootSize = parseFloat(getComputedStyle(context).fontSize) || 16;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n * rootSize : null;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** IntersectionObserver 仅接受 px/%，不可用 calc(var(...)) */
function measureSafeAreaInsetTop(): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return px;
}

export function getProductDetailHeaderRootMargin(): string {
  if (typeof document === "undefined") return "-56px 0px 0px 0px";
  const root = document.documentElement;
  const tabRaw = getComputedStyle(root).getPropertyValue("--store-tab-header-height").trim() || "3.5rem";
  const tabPx = parseCssLengthToPx(tabRaw, root) ?? 56;
  const safePx = measureSafeAreaInsetTop();
  const top = Math.ceil(tabPx + safePx);
  return `-${top}px 0px 0px 0px`;
}

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

    let observer: IntersectionObserver | null = null;

    const attach = () => {
      observer?.disconnect();
      const rootMargin = getProductDetailHeaderRootMargin();
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setSolid(false);
            return;
          }
          setSolid(entry.boundingClientRect.top < 0);
        },
        { root: null, rootMargin, threshold: 0 },
      );
      observer.observe(el);
    };

    attach();
    window.addEventListener("resize", attach);
    return () => {
      window.removeEventListener("resize", attach);
      observer?.disconnect();
    };
  }, [observe, defaultSolid, sentinelRef]);

  return solid;
}
