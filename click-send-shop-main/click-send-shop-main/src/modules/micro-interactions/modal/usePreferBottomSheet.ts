import type { AppModalTier } from "./modalBreakpoints";
import { useAppBreakpoint } from "./useAppBreakpoint";

/**
 * 是否应以 Bottom Sheet 呈现（而非居中 Dialog）。
 * - light：全端居中 Dialog（轻确认）
 * - standard / form：手机 + 平板 Sheet，电脑 Dialog
 * - immersive：手机 + 平板 Sheet，电脑 Dialog（SKU/加购等）
 */
export function usePreferBottomSheet(tier: AppModalTier = "standard"): boolean {
  const bp = useAppBreakpoint();
  if (tier === "light") return false;
  return bp === "mobile";
}
