import { useCallback, useState } from "react";

export type CategoryListViewMode = "grid" | "list";

const STORAGE_KEY = "category_product_list_view";

function readStoredView(): CategoryListViewMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "grid" || value === "list") return value;
  } catch {
    /* ignore */
  }
  return "grid";
}

/** 分类页商品展示：网格 / 列表（左图右文），偏好写入 localStorage */
export function useCategoryListView() {
  const [viewMode, setViewModeState] = useState<CategoryListViewMode>(readStoredView);

  const setViewMode = useCallback((mode: CategoryListViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => {
      const next = prev === "grid" ? "list" : "grid";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { viewMode, setViewMode, toggleViewMode };
}
