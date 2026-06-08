import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { adminTabPathKey, normalizeAdminTabPath } from "@/config/adminWorkTab";
import { useAdminDirtyGuardOptional } from "@/modules/admin/context/AdminDirtyGuardContext";

type UseAdminDirtyFormInput = {
  isDirty: boolean;
  isReady?: boolean;
};

type MarkSavedOptions<T> = {
  nextBaseline?: T;
  resetBaseline?: (nextBaseline?: T) => void;
};

export function useAdminDirtyForm({ isDirty, isReady = true }: UseAdminDirtyFormInput) {
  const location = useLocation();
  const guard = useAdminDirtyGuardOptional();
  const tabId = useMemo(
    () => adminTabPathKey(normalizeAdminTabPath(location.pathname, location.search)),
    [location.pathname, location.search],
  );
  const latestTabIdRef = useRef(tabId);

  useEffect(() => {
    const previousTabId = latestTabIdRef.current;
    if (!guard) return undefined;
    if (previousTabId !== tabId) {
      guard.setTabDirty(previousTabId, false);
      latestTabIdRef.current = tabId;
    }
    guard.setTabDirty(tabId, Boolean(isReady && isDirty));
    return () => {
      guard.setTabDirty(tabId, false);
    };
  }, [guard, isDirty, isReady, tabId]);

  const markSaved = useCallback(
    <T,>(options?: MarkSavedOptions<T>) => {
      options?.resetBaseline?.(options.nextBaseline);
      guard?.setTabDirty(latestTabIdRef.current, false);
    },
    [guard],
  );

  return { markSaved, tabId };
}
