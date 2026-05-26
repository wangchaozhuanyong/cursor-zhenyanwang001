import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { adminTabPathKey } from "@/config/adminWorkTab";
import { useAdminDirtyGuardOptional } from "@/modules/admin/context/AdminDirtyGuardContext";

/** 将当前工作标签标记为未保存（关闭标签时会提示） */
export function useAdminTabDirty(dirty: boolean) {
  const location = useLocation();
  const guard = useAdminDirtyGuardOptional();
  const tabId = adminTabPathKey(`${location.pathname}${location.search}`);

  useEffect(() => {
    if (!guard) return;
    guard.setTabDirty(tabId, dirty);
    return () => guard.setTabDirty(tabId, false);
  }, [dirty, guard, tabId]);
}
