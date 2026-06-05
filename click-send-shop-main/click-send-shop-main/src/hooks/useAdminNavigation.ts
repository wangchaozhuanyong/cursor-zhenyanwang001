import { useCallback } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router-dom";
import { toast } from "sonner";
import { ADMIN_WORK_TABS_MAX, adminTabPathKey, normalizeAdminTabPath, shouldTrackAdminWorkTab } from "@/config/adminWorkTab";
import { canAccessAdminPath, getFirstAllowedAdminPath } from "@/config/adminNavAccess";
import { useAdminDirtyGuardOptional } from "@/modules/admin/context/AdminDirtyGuardContext";
import { preloadAdminRoute } from "@/routes/adminLazyPages";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";
import { useAdminT } from "@/hooks/useAdminT";

function resolveAdminTarget(to: string) {
  const url = new URL(to, window.location.origin);
  return {
    pathname: url.pathname,
    search: url.search,
    fullPath: normalizeAdminTabPath(url.pathname, url.search),
  };
}

export function useAdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tText } = useAdminT();
  const guard = useAdminDirtyGuardOptional();
  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const permHydrated = useAdminPermissionStore((s) => s.hydrated);
  const tabs = useAdminWorkTabsStore((s) => s.tabs);
  const canOpenTab = useAdminWorkTabsStore((s) => s.canOpenTab);

  return useCallback(
    async (to: string, options?: NavigateOptions) => {
      const target = resolveAdminTarget(to);
      const currentFullPath = normalizeAdminTabPath(location.pathname, location.search);
      const targetTrackable = shouldTrackAdminWorkTab(target.pathname);
      const targetCanOpen = !targetTrackable || canOpenTab(target.pathname, target.search);
      const currentTabId = adminTabPathKey(currentFullPath);
      const currentDirty = Boolean(guard?.isTabDirty(currentTabId));
      if (target.fullPath === currentFullPath) {
        return true;
      }

      if (permHydrated && !canAccessAdminPath(target.pathname, can, canAny)) {
        toast.error(tText("没有权限访问该后台页面。"));
        navigate(getFirstAllowedAdminPath(can), { replace: true });
        return false;
      }

      if (!targetCanOpen) {
        toast.error(tText(`已打开 ${ADMIN_WORK_TABS_MAX} 个页面，请先关闭不需要的页面后再打开新页面。`));
        return false;
      }

      if (currentDirty) {
        const currentTab = tabs.find((tab) => tab.id === currentTabId);
        const proceed = await guard.confirmDiscardTab(currentTabId, currentTab?.title || tText("当前页面"));
        if (!proceed) return false;
        guard.setTabDirty(currentTabId, false);
      }

      void preloadAdminRoute(target.fullPath);
      navigate(to, options);
      return true;
    },
    [can, canAny, canOpenTab, guard, location.pathname, location.search, navigate, permHydrated, tabs, tText],
  );
}
