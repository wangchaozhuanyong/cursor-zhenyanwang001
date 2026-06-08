/** 首页模块标题与内容区间距（约 10px） */
export const HOME_SECTION_HEADER_MB = "mb-2.5";

/** 首页两列商品网格（今日热销等） */
export const HOME_PRODUCT_GRID_CLASS = "store-product-grid grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

/** 首页主内容区：模块之间统一纵向间距（移动端 16px，桌面逐级加大） */
export const HOME_PAGE_MAIN_CLASS =
  "store-home-main mx-auto flex w-full max-w-screen-xl flex-col gap-4 px-[var(--store-page-x)] pt-[var(--store-page-y)] pb-6 sm:gap-5 md:gap-6 md:px-6 md:pb-10 lg:gap-8 lg:px-8 lg:pb-12";

/** 未登录首页：主内容区底部留白略减（页脚卡片自带内边距） */
export const HOME_GUEST_MAIN_CLASS =
  "store-home-main store-home-main-guest mx-auto flex w-full max-w-screen-xl flex-col gap-3 px-[var(--store-page-x)] pt-[var(--store-page-y)] pb-4 sm:gap-5 md:gap-6 md:px-6 md:pb-5 lg:gap-8 lg:px-8 lg:pb-8";

/** 未登录首页：商品区与品牌页脚之间的间距（移动端稍微收紧） */
export const HOME_GUEST_FOOTER_WRAP_CLASS = "-mx-[var(--store-page-x)] mt-3 md:mx-0 md:mt-8 lg:mt-10";

/** 首屏区（轮播 / 保障条 / 快捷导航）内部更紧凑 */
export const HOME_HERO_STACK_CLASS = "store-home-hero-stack flex flex-col gap-2.5 sm:gap-3";

/** 金刚区单格：上图下文，无圆形裁切 */
export const HOME_NAV_ITEM_CLASS =
  "store-nav-action flex w-full min-w-0 shrink-0 snap-start flex-col items-center justify-start gap-1.5 text-center transition-transform active:scale-[0.96]";

export const HOME_NAV_ICON_FRAME_CLASS =
  "store-icon-tile flex h-14 w-14 shrink-0 items-center justify-center text-[var(--store-nav-icon-color,var(--theme-primary))] sm:h-16 sm:w-16";

export const HOME_NAV_LABEL_CLASS =
  "store-caption w-full truncate px-0.5 text-[13px] font-bold leading-tight text-[var(--theme-text)] sm:text-sm";
