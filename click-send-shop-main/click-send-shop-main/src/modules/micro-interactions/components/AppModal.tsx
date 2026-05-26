import type { AppModalTier, ModalPresentation } from "../modal/modalBreakpoints";
import { usePreferBottomSheet } from "../modal/usePreferBottomSheet";
import {
  ResponsiveSheet,
  type ResponsiveSheetProps,
} from "./ResponsiveSheet";

export type AppModalProps = ResponsiveSheetProps & {
  /** 弹层档位，决定三端呈现策略 */
  tier?: AppModalTier;
  /** 强制 sheet / dialog；auto 时按 tier + 断点 */
  presentation?: ModalPresentation;
};

const TIER_DEFAULT_HEIGHT: Partial<Record<AppModalTier, ResponsiveSheetProps["height"]>> = {
  form: "70vh",
  immersive: "auto",
  standard: "auto",
  light: "auto",
};

/**
 * 全局统一弹层入口。
 * - light：全端居中 Dialog
 * - standard / form：移动+平板 Bottom Sheet，电脑居中 Dialog
 * - immersive：同上（SKU、加购等沉浸式短流程）
 */
export function AppModal({
  tier = "standard",
  presentation = "auto",
  height,
  ...props
}: AppModalProps) {
  const preferSheet = usePreferBottomSheet(tier);
  const resolvedPresentation =
    presentation === "auto" ? (preferSheet ? "sheet" : "dialog") : presentation;

  return (
    <ResponsiveSheet
      tier={tier}
      presentation={resolvedPresentation}
      height={height ?? TIER_DEFAULT_HEIGHT[tier] ?? "auto"}
      {...props}
    />
  );
}
