import { useEffect, useRef } from "react";
import { isAbortError } from "@/utils/asyncErrors";

/**
 * 列表/并行请求：仅最后一次 load 的 catch 会执行回调（配合 AbortController 更佳）。
 * 用于 Promise.all 等暂不便传 signal 的场景。
 */
export function useLatestAsync() {
  const seqRef = useRef(0);

  const begin = () => {
    seqRef.current += 1;
    return seqRef.current;
  };

  const isLatest = (seq: number) => seq === seqRef.current;

  return { begin, isLatest };
}

export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | (() => void),
  deps: readonly unknown[],
) {
  useEffect(() => {
    const controller = new AbortController();
    const cleanup = effect(controller.signal);
    return () => {
      controller.abort();
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { isAbortError };
