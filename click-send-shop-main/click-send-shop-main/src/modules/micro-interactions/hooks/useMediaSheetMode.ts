import { usePreferBottomSheet } from "../modal/usePreferBottomSheet";

/**
 * 是否以 Bottom Sheet 呈现（移动 + 平板为 true，电脑为 false）。
 * @deprecated 新代码请用 `usePreferBottomSheet(tier)` 或 `useAppBreakpoint()`。
 */
export function useMediaSheetMode(): boolean {
  return usePreferBottomSheet("standard");
}
