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

/** 登录注册页：桌面居中卡片 */
export const STORE_AUTH_SHELL_CLASS =
  "auth-page-shell fixed inset-0 z-[80] flex flex-col justify-end overflow-hidden bg-black/45 pt-[calc(2rem+env(safe-area-inset-top,0px))] lg:static lg:min-h-[100dvh] lg:justify-center lg:bg-[color-mix(in_srgb,var(--theme-bg)_94%,var(--theme-surface))] lg:pt-0";

export const STORE_AUTH_MAIN_CLASS =
  "auth-page-main relative mx-auto min-h-0 w-full max-w-lg flex-none overflow-y-auto overscroll-contain rounded-t-[2rem] border border-[var(--theme-border)] bg-background px-[var(--store-page-x)] pb-4 pt-5 shadow-[0_-24px_70px_rgba(15,23,42,0.28)] lg:max-w-md lg:flex-none lg:overflow-visible lg:rounded-2xl lg:bg-[var(--theme-surface)] lg:p-8 lg:shadow-[var(--theme-shadow)]";
