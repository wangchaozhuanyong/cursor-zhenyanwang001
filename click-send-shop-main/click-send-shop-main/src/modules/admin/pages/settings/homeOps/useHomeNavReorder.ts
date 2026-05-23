import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { invalidateHomeModuleSettingsCache } from "@/hooks/useHomeModuleSettings";
import * as homeOpsService from "@/services/admin/homeOpsService";
import type { HomeNavItem } from "@/types/content";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  applySortIndices,
  moveNavItemToPosition,
  reorderNavItems,
  toSortPayload,
} from "./homeNavUtils";

type HomeOpsNavCache = { nav: HomeNavItem[]; categories: unknown[] };

export function useHomeNavReorder(navItems: HomeNavItem[]) {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const setNavCache = useCallback(
    (nextNav: HomeNavItem[]) => {
      queryClient.setQueryData<HomeOpsNavCache>(adminQueryKeys.homeOpsNav(), (prev) => ({
        nav: nextNav,
        categories: prev?.categories ?? [],
      }));
    },
    [queryClient],
  );

  const persistOrder = useCallback(
    async (ordered: HomeNavItem[], successMessage = "排序已更新") => {
      const normalized = applySortIndices(ordered);
      setSavingOrder(true);
      setNavCache(normalized);
      try {
        await homeOpsService.sortHomeNavItems(toSortPayload(normalized));
        invalidateHomeModuleSettingsCache();
        toast.success(successMessage);
      } catch (e) {
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.homeOpsNav() });
        toast.error(toastErrorMessage(e, "排序保存失败，请重试"));
        throw e;
      } finally {
        setSavingOrder(false);
      }
    },
    [queryClient, setNavCache],
  );

  const handleDrop = useCallback(
    async (targetId: string) => {
      if (!draggingId || draggingId === targetId) {
        setDraggingId(null);
        return;
      }
      const next = reorderNavItems(navItems, draggingId, targetId);
      setDraggingId(null);
      await persistOrder(next, "导航排序已更新");
    },
    [draggingId, navItems, persistOrder],
  );

  const handlePositionChange = useCallback(
    async (itemId: string, position: number) => {
      const next = moveNavItemToPosition(navItems, itemId, position);
      if (next.every((item, idx) => item.id === navItems[idx]?.id && item.sort_order === navItems[idx]?.sort_order)) {
        return;
      }
      await persistOrder(next, "排序已更新");
    },
    [navItems, persistOrder],
  );

  return {
    draggingId,
    setDraggingId,
    savingOrder,
    handleDrop,
    handlePositionChange,
  };
}
