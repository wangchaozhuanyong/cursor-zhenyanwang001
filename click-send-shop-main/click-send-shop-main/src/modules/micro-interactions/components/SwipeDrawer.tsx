import type { BottomSheetProps } from "./BottomSheet";
import { BottomSheet } from "./BottomSheet";

export type SwipeDrawerProps = Pick<
  BottomSheetProps,
  "open" | "onClose" | "children" | "title" | "className"
>;

/** @deprecated 请使用 BottomSheet */
export function SwipeDrawer(props: SwipeDrawerProps) {
  return <BottomSheet {...props} showCloseButton={false} />;
}
