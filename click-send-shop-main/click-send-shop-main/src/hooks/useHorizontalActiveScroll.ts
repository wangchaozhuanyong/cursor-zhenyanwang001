import { useCallback, useEffect, useRef } from "react";
import { scrollElementToHorizontalCenter } from "@/utils/horizontalScroll";

type ScrollKey = string | number | null | undefined;

function normalizeScrollKey(key: ScrollKey) {
  return key === null || key === undefined ? "" : String(key);
}

export function useHorizontalActiveScroll<
  ContainerElement extends HTMLElement = HTMLDivElement,
  ItemElement extends HTMLElement = HTMLElement,
>(activeKey: ScrollKey, refreshKey?: ScrollKey) {
  const containerRef = useRef<ContainerElement | null>(null);
  const itemRefs = useRef<Map<string, ItemElement>>(new Map());

  const setItemRef = useCallback((key: ScrollKey, element: ItemElement | null) => {
    const normalizedKey = normalizeScrollKey(key);
    if (!normalizedKey) return;
    if (element) itemRefs.current.set(normalizedKey, element);
    else itemRefs.current.delete(normalizedKey);
  }, []);

  const scrollToKey = useCallback((key: ScrollKey, behavior: ScrollBehavior = "smooth") => {
    const normalizedKey = normalizeScrollKey(key);
    if (!normalizedKey) return;
    scrollElementToHorizontalCenter(containerRef.current, itemRefs.current.get(normalizedKey), behavior);
  }, []);

  useEffect(() => {
    scrollToKey(activeKey);
  }, [activeKey, refreshKey, scrollToKey]);

  return {
    containerRef,
    setItemRef,
    scrollToKey,
  };
}
