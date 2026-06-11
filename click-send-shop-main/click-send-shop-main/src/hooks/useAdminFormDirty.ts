import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAdminDirtyForm } from "@/modules/admin/hooks/useAdminDirtyForm";
import { adminTabPathKey, normalizeAdminTabPath } from "@/config/adminWorkTab";
import { useAdminDraftStore, type AdminDraftRecord } from "@/stores/useAdminDraftStore";

type UseAdminFormDirtyOptions<T> = {
  restoreDraft?: (value: T) => void;
  draftEnabled?: boolean;
};

function serializeAdminFormValue(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/**
 * 表单页脏检查：在 `ready` 为 true 后建立基线，与当前值 JSON 对比并同步到工作标签守卫。
 */
export function useAdminFormDirty<T>(
  value: T,
  ready: boolean,
  options: UseAdminFormDirtyOptions<T> = {},
) {
  const location = useLocation();
  const draftEnabled = options.draftEnabled !== false;
  const restoreDraft = options.restoreDraft;
  const tabId = useMemo(
    () => adminTabPathKey(normalizeAdminTabPath(location.pathname, location.search)),
    [location.pathname, location.search],
  );
  const baselineRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  const latestTabIdRef = useRef(tabId);
  const restoredDraftRef = useRef(false);
  const skipPersistOnceRef = useRef(false);
  const serialized = useMemo(() => serializeAdminFormValue(value), [value]);
  const draftRecord = useAdminDraftStore((state) => state.drafts[tabId] as AdminDraftRecord<T> | undefined);
  const saveDraft = useAdminDraftStore((state) => state.saveDraft);
  const clearDraft = useAdminDraftStore((state) => state.clearDraft);
  const hasDraft = Boolean(draftRecord?.dirty);

  if (latestTabIdRef.current !== tabId) {
    latestTabIdRef.current = tabId;
    baselineRef.current = null;
    restoredDraftRef.current = false;
    skipPersistOnceRef.current = false;
  }

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useLayoutEffect(() => {
    if (!draftEnabled || !ready || restoredDraftRef.current || !restoreDraft || !draftRecord?.dirty) return;
    baselineRef.current = draftRecord.baseline || serializeAdminFormValue(draftRecord.value);
    restoredDraftRef.current = true;
    skipPersistOnceRef.current = true;
    restoreDraft(draftRecord.value as T);
  }, [draftEnabled, draftRecord, ready, restoreDraft]);

  useLayoutEffect(() => {
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

  useEffect(() => {
    if (!draftEnabled || !ready || baselineRef.current === null) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    if (dirty) {
      saveDraft(tabId, value, baselineRef.current);
      return;
    }
    clearDraft(tabId);
  }, [clearDraft, dirty, draftEnabled, ready, saveDraft, serialized, tabId, value]);

  const markClean = useCallback((nextValue?: T) => {
    const nextBaseline = serializeAdminFormValue(nextValue ?? valueRef.current);
    clearDraft(latestTabIdRef.current);
    markSaved({
      nextBaseline: nextValue,
      resetBaseline: () => {
        baselineRef.current = nextBaseline;
      },
    });
  }, [clearDraft, markSaved]);

  const discardDraft = useCallback(() => {
    clearDraft(latestTabIdRef.current);
    baselineRef.current = serializeAdminFormValue(valueRef.current);
    markSaved();
  }, [clearDraft, markSaved]);

  return { dirty, hasDraft, markClean, discardDraft };
}
