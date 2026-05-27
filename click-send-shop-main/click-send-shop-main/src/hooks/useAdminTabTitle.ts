import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";

/** 数据加载后更新当前工作标签标题（如编辑页显示实体名称） */
export function useAdminTabTitle(title: string | null | undefined, ready = true) {
  const location = useLocation();
  const updateTabTitle = useAdminWorkTabsStore((s) => s.updateTabTitle);

  useEffect(() => {
    if (!ready || !title?.trim()) return;
    updateTabTitle(location.pathname, location.search, title.trim());
  }, [location.pathname, location.search, ready, title, updateTabTitle]);
}
