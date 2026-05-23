/** 前台页面容器：移动端不变，平板/桌面加宽内边距 */
export const STORE_PAGE_CONTAINER_CLASS =
  "mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 lg:px-8";

/** 主 Tab 页在 md+ 隐藏页内顶栏（由 StoreTabletBar / StoreDesktopHeader 接管） */
export const STORE_MOBILE_PAGE_HEADER_CLASS = "md:hidden";
