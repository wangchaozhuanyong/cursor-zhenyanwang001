import { useEffect, useState, type RefObject } from "react";

type Options = {
  observe: boolean;
  defaultSolid: boolean;
  threshold?: number;
};

export function useProductDetailHeaderSolid(
  _sentinelRef: RefObject<HTMLElement | null>,
  { observe, defaultSolid, threshold = 12 }: Options,
) {
  const [solid, setSolid] = useState(defaultSolid);

  useEffect(() => {
    if (!observe || typeof window === "undefined") {
      setSolid(defaultSolid);
      return;
    }

    const update = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setSolid(scrollY > threshold);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [observe, defaultSolid, threshold]);

  return solid;
}
