let activeBottomSheetCount = 0;

export function retainBottomSheetVisualState() {
  if (typeof document === "undefined") return () => {};

  activeBottomSheetCount += 1;
  document.documentElement.dataset.bottomSheetOpen = "true";

  return () => {
    activeBottomSheetCount = Math.max(0, activeBottomSheetCount - 1);
    if (activeBottomSheetCount === 0) {
      delete document.documentElement.dataset.bottomSheetOpen;
    }
  };
}
