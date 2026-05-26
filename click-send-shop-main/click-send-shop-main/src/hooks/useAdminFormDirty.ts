import { useEffect, useMemo, useRef } from "react";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";

/**
 * 表单页脏检查：在 `ready` 为 true 后建立基线，与当前值 JSON 对比并同步到工作标签守卫。
 */
export function useAdminFormDirty<T>(value: T, ready: boolean) {
  const baselineRef = useRef<string | null>(null);
  const serialized = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    if (!ready) {
      baselineRef.current = null;
      return;
    }
    if (baselineRef.current === null) {
      baselineRef.current = serialized;
    }
  }, [ready, serialized]);

  const dirty = ready && baselineRef.current !== null && baselineRef.current !== serialized;
  useAdminTabDirty(dirty);

  const markClean = (nextValue?: T) => {
    baselineRef.current = JSON.stringify(nextValue ?? value);
  };

  return { dirty, markClean };
}
