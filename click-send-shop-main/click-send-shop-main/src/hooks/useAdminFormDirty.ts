import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAdminDirtyForm } from "@/modules/admin/hooks/useAdminDirtyForm";

/**
 * 表单页脏检查：在 `ready` 为 true 后建立基线，与当前值 JSON 对比并同步到工作标签守卫。
 */
export function useAdminFormDirty<T>(value: T, ready: boolean) {
  const baselineRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  const serialized = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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
  const { markSaved } = useAdminDirtyForm({ isDirty: dirty, isReady: ready });

  const markClean = useCallback((nextValue?: T) => {
    markSaved({
      nextBaseline: nextValue,
      resetBaseline: (value) => {
        baselineRef.current = JSON.stringify(value ?? valueRef.current);
      },
    });
  }, [markSaved]);

  return { dirty, markClean };
}
