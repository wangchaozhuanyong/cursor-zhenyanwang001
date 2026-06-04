/** 前台页面容器：移动端不变，平板/桌面加宽内边距 */
export const STORE_PAGE_CONTAINER_CLASS =
  "mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 lg:px-8";

/** 主 Tab 页在 md+ 隐藏页内顶栏（由 StoreTabletBar / StoreDesktopHeader 接管） */
export const STORE_MOBILE_PAGE_HEADER_CLASS = "md:hidden";

/** 商详右侧购买区 sticky（平板用 Tab 顶栏高度，桌面用全局顶栏高度） */
export const STORE_DETAIL_STICKY_TOP_CLASS =
  "md:top-[calc(var(--store-tab-header-height,3.5rem)+env(safe-area-inset-top,0px)+1.5rem)] lg:top-[calc(var(--store-desktop-header-height,4rem)+1rem)]";

/** 帮助 / 关于等阅读型页面主内容区 */
export const STORE_READING_MAIN_CLASS =
  "mx-auto w-full max-w-lg px-[var(--store-page-x)] pt-4 sm:px-4 lg:max-w-3xl lg:px-8 lg:pt-6";

/** 登录注册页：移动端全屏覆盖，桌面端居中卡片 */
export const STORE_AUTH_SHELL_CLASS =
  "auth-page-shell fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[var(--theme-bg)] lg:static lg:min-h-[100dvh] lg:justify-center lg:bg-[color-mix(in_srgb,var(--theme-bg)_94%,var(--theme-surface))]";

export const STORE_AUTH_MAIN_CLASS =
  "auth-page-main relative mx-auto h-full min-h-0 w-full max-w-none flex-1 overflow-y-auto overscroll-contain border-0 bg-[var(--theme-surface)] px-[var(--store-page-x)] pb-4 pt-[calc(0.95rem+env(safe-area-inset-top,0px))] shadow-none lg:h-auto lg:max-w-md lg:flex-none lg:overflow-visible lg:rounded-2xl lg:border lg:border-[var(--theme-border)] lg:bg-[var(--theme-surface)] lg:p-8 lg:shadow-[var(--theme-shadow)]";
