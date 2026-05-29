import { useEffect } from "react";

/**
 * 将 React Query 结果灌入本地表单；在 dirty 为 true 时跳过，避免 invalidate/refetch 冲掉未保存编辑。
 */
export function useHydrateFromQuery<T>(
  serverData: T | undefined,
  hydrate: (data: T) => void,
  dirty = false,
) {
  useEffect(() => {
    if (serverData === undefined || dirty) return;
    hydrate(serverData);
  }, [serverData, dirty, hydrate]);
}
