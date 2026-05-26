/** 与 Tailwind md / lg 对齐的全局弹层断点 */
export const MODAL_BREAKPOINTS = {
  md: 768,
  lg: 1024,
} as const;

/** 手机：< 768px */
export const MQ_MOBILE = `(max-width: ${MODAL_BREAKPOINTS.md - 1}px)`;

/** 平板：768px – 1023px */
export const MQ_TABLET = `(min-width: ${MODAL_BREAKPOINTS.md}px) and (max-width: ${MODAL_BREAKPOINTS.lg - 1}px)`;

/** 电脑：≥ 1024px */
export const MQ_DESKTOP = `(min-width: ${MODAL_BREAKPOINTS.lg}px)`;

/** 移动 + 平板：使用 Bottom Sheet */
export const MQ_SHEET_PREFERRED = `(max-width: ${MODAL_BREAKPOINTS.lg - 1}px)`;

export type AppBreakpoint = "mobile" | "tablet" | "desktop";

export type AppModalTier = "light" | "standard" | "form" | "immersive";

export type ModalPresentation = "auto" | "sheet" | "dialog";

/** 弹层 z-index 基准（高于 Admin 侧栏 z-50、AnchoredPopover z-70） */
export const MODAL_BASE_Z = 100;

export const MODAL_Z_STEP = 20;
