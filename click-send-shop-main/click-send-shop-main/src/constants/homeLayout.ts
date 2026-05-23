/** 首页主内容区：模块之间统一纵向间距（移动端 20px，桌面 24px） */
export const HOME_PAGE_MAIN_CLASS =
  "mx-auto flex w-full max-w-screen-xl flex-col gap-3 px-[var(--store-page-x)] pt-[var(--store-page-y)] pb-6 sm:gap-5 md:gap-6 md:px-6 md:pb-10";

/** 未登录首页：主内容区底部留白略减（页脚卡片自带内边距） */
export const HOME_GUEST_MAIN_CLASS =
  "mx-auto flex w-full max-w-screen-xl flex-col gap-3 px-[var(--store-page-x)] pt-[var(--store-page-y)] pb-4 sm:gap-5 md:gap-6 md:px-6 md:pb-5";

/** 未登录首页：商品区与品牌页脚之间的间距（避免与页脚自身 margin 叠加） */
export const HOME_GUEST_FOOTER_WRAP_CLASS = "-mx-[var(--store-page-x)] mt-6 md:mx-0 md:mt-8";

/** 首屏区（轮播 / 保障条 / 快捷导航）内部更紧凑 */
export const HOME_HERO_STACK_CLASS = "flex flex-col gap-2.5 sm:gap-3";

/** 金刚区单格：上图下文，无圆形裁切 */
export const HOME_NAV_ITEM_CLASS =
  "flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1.5 text-center transition-opacity active:opacity-80";

export const HOME_NAV_ICON_FRAME_CLASS =
  "flex h-12 w-12 shrink-0 items-center justify-center";

export const HOME_NAV_LABEL_CLASS =
  "store-caption w-full truncate px-0.5 font-medium leading-tight text-[var(--theme-text-muted-on-surface)]";
