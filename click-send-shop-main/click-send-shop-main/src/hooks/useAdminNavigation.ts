import { startTransition, useCallback } from "react";
import { useLocation, useNavigate, type NavigateFunction, type NavigateOptions } from "react-router-dom";
import { toast } from "sonner";
import { ADMIN_WORK_TABS_MAX, adminTabPathKey, normalizeAdminTabPath, shouldTrackAdminWorkTab } from "@/config/adminWorkTab";
import { canAccessAdminPath, getFirstAllowedAdminPath } from "@/config/adminNavAccess";
import { useAdminDirtyGuard } from "@/modules/admin/context/AdminDirtyGuardContext";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { adminNavDebug } from "@/modules/admin/utils/adminDebug";
import { clearAdminDraft } from "@/stores/useAdminDraftStore";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";
import { useAdminRouteIntentPreload } from "@/hooks/useAdminRouteIntentPreload";
import { useAdminT } from "@/hooks/useAdminT";

function resolveAdminTarget(to: string) {
  const url = new URL(to, window.location.origin);
  return {
    pathname: url.pathname,
    search: url.search,
    fullPath: normalizeAdminTabPath(url.pathname, url.search),
  };
}

function navigateWithAdminTransition(navigate: NavigateFunction, to: string, options?: NavigateOptions) {
  startTransition(() => {
    navigate(to, options);
  });
}

export function useAdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tText } = useAdminT();
  const warmAdminRoute = useAdminRouteIntentPreload();
  const guard = useAdminDirtyGuard();
  const { confirmAsync } = useAdminConfirm();
  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const permHydrated = useAdminPermissionStore((s) => s.hydrated);
  const tabs = useAdminWorkTabsStore((s) => s.tabs);
  const canOpenTab = useAdminWorkTabsStore((s) => s.canOpenTab);
  const closeTab = useAdminWorkTabsStore((s) => s.closeTab);

  return useCallback(
    async (to: string, options?: NavigateOptions) => {
      const startedAt = performance.now();
      const target = resolveAdminTarget(to);
      const currentFullPath = normalizeAdminTabPath(location.pathname, location.search);
      const targetTrackable = shouldTrackAdminWorkTab(target.pathname);
      const targetCanOpen = !targetTrackable || canOpenTab(target.pathname, target.search);
      const currentTabId = adminTabPathKey(currentFullPath);
      const targetTabId = adminTabPathKey(target.fullPath);
      const currentDirty = Boolean(guard.isTabDirty(currentTabId));
      adminNavDebug({
        stage: "start",
        from: currentFullPath,
        to: target.fullPath,
        currentTabId,
        targetTabId,
        dirty: currentDirty,
        tabCount: tabs.length,
        canOpenTab: targetCanOpen,
      });
      if (target.fullPath === currentFullPath) {
        adminNavDebug({ stage: "blocked", reason: "same_path", from: currentFullPath, to: target.fullPath });
        return true;
      }

      if (permHydrated && !canAccessAdminPath(target.pathname, can, canAny)) {
        toast.error(tText("没有权限访问该后台页面。"));
        adminNavDebug({ stage: "blocked", reason: "permission", from: currentFullPath, to: target.fullPath });
        const fallbackPath = getFirstAllowedAdminPath(can, canAny);
        warmAdminRoute(fallbackPath, { showProgress: true });
        navigateWithAdminTransition(navigate, fallbackPath, { replace: true });
        return false;
      }

      if (!targetCanOpen) {
        const hasClosableTab = tabs.some((tab) => !tab.pinned);
        const victim = tabs
          .filter((tab) => !tab.pinned && !guard.isTabDirty(tab.id))
          .sort((a, b) => (a.lastAccessAt || 0) - (b.lastAccessAt || 0))[0];
        if (!victim) {
          await confirmAsync({
            title: tText("页面已达上限"),
            description: hasClosableTab
              ? tText("页面已达上限，且可关闭的页面都有未保存修改。请先保存或手动关闭一个页面。")
              : tText("所有页面都已固定，请先取消固定或关闭一个页面。"),
            confirmText: tText("知道了"),
            cancelText: tText("取消"),
          });
          adminNavDebug({ stage: "blocked", reason: "tab_limit", from: currentFullPath, to: target.fullPath });
          return false;
        }

        const shouldClose = await confirmAsync({
          title: tText("页面已达上限"),
          description: tText(`已打开 ${ADMIN_WORK_TABS_MAX} 个后台页面，是否关闭最早未固定页面「${victim.title}」并打开当前页面？`),
          confirmText: tText("关闭并打开"),
          cancelText: tText("取消"),
        });
        if (!shouldClose) {
          adminNavDebug({ stage: "blocked", reason: "tab_limit", from: currentFullPath, to: target.fullPath });
          return false;
        }
        const victimProceed = await guard.confirmDiscardTab(victim.id, victim.title);
        if (!victimProceed) {
          adminNavDebug({ stage: "blocked", reason: "dirty", from: currentFullPath, to: target.fullPath });
          return false;
        }
        guard.setTabDirty(victim.id, false);
        clearAdminDraft(victim.id);
        closeTab(victim.id);
      }

      warmAdminRoute(target.fullPath, { showProgress: true });
      navigateWithAdminTransition(navigate, to, options);
      adminNavDebug({ stage: "success", from: currentFullPath, to: target.fullPath, duration: performance.now() - startedAt });
      return true;
    },
    [
      can,
      canAny,
      canOpenTab,
      closeTab,
      confirmAsync,
      guard,
      location.pathname,
      location.search,
      navigate,
      permHydrated,
      tabs,
      tText,
      warmAdminRoute,
    ],
  );
}
