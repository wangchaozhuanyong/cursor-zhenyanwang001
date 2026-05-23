/** 前台页面容器：移动端不变，平板/桌面加宽内边距 */
export const STORE_PAGE_CONTAINER_CLASS =
  "mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 lg:px-8";

/** 主 Tab 页在 md+ 隐藏页内顶栏（由 StoreTabletBar / StoreDesktopHeader 接管） */
export const STORE_MOBILE_PAGE_HEADER_CLASS = "md:hidden";

/** 商详右侧购买区 sticky（平板用 Tab 顶栏高度，桌面用全局顶栏高度） */
export const STORE_DETAIL_STICKY_TOP_CLASS =
  "md:top-[calc(var(--store-tab-header-height,3.5rem)+env(safe-area-inset-top,0px)+1.5rem)] lg:top-[calc(var(--store-desktop-header-height,4rem)+1rem)]";
