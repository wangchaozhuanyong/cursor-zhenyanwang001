import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { adminTabPathKey } from "@/config/adminWorkTab";
import { useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";

/**
 * 按工作标签路径缓存 Outlet，切换标签时保留列表筛选、滚动与表单输入状态。
 */
export default function AdminKeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const activeKey = adminTabPathKey(`${location.pathname}${location.search}`);
  const tabIds = useAdminWorkTabsStore((s) => s.tabs.map((t) => t.id));

  const [cache, setCache] = useState<Record<string, ReactNode>>({});

  useEffect(() => {
    if (!outlet) return;
    setCache((prev) => (prev[activeKey] === outlet ? prev : { ...prev, [activeKey]: outlet }));
  }, [activeKey, outlet]);

  useEffect(() => {
    setCache((prev) => {
      const allowed = new Set(tabIds);
      let changed = false;
      const next: Record<string, ReactNode> = {};
      for (const key of Object.keys(prev)) {
        if (allowed.has(key)) {
          next[key] = prev[key];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tabIds]);

  const keys = Object.keys(cache);
  if (keys.length === 0) {
    return outlet ?? null;
  }

  return (
    <>
      {keys.map((key) => (
        <div key={key} className={key === activeKey ? "min-w-0" : "hidden"} aria-hidden={key !== activeKey}>
          {cache[key]}
        </div>
      ))}
    </>
  );
}
