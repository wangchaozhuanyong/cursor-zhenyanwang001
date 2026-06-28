# 客户端设计系统与后台皮肤契约

更新时间：2026-06-24

## 目标

客户端以 SILENT COMMERCE / storefront-next 作为唯一正式设计系统。后台皮肤系统负责配置客户端允许的视觉参数，不能重新引入旧首页结构、旧快捷入口、旧商品卡或另一套独立样式。

这份契约只约束前台展示层和后台皮肤配置边界，不改变登录、支付、订单、库存、优惠券核销、权限和部署逻辑。

## 正式客户端入口

- 首页入口：`src/modules/storefront-v2/home/StoreHomeV2.tsx`
- Hero：`src/modules/storefront-v2/home/HomeHeroV2.tsx`
- 快捷入口：`StoreHomeV2` 内的 `HomeQuickEntryPanel`
- 今日优惠：`src/modules/storefront-v2/home/HomePrimaryCampaignV2.tsx`
- 商品区：`src/modules/storefront-v2/home/HomeProductSectionV2.tsx`
- 商品卡：`src/modules/storefront-v2/product/ProductCardV2.tsx`
- 设计系统代码：`src/modules/storefront-v2/design/storefrontDesignContract.ts`
- token 样式：`src/styles/storefront-next.tokens.css`
- 原语样式：`src/styles/storefront-next.primitives.css`
- 路由扩展样式：`src/styles/storefront-next.extended-routes.css`
- 分类页最终样式层：`src/styles/storefront-next.category.css`

旧 `GuestHome`、`MemberHome`、`HomeOpsBlocks` 和旧 `store-home-*` 首页视觉层已经退出正式客户端源码。后续不能为了兼容旧样式重新接回正式路由。

## 后台皮肤允许控制的字段

后台皮肤配置只能影响这些客户端维度：

- 颜色：`bgColor`、`surfaceColor`、`primaryColor`、`priceColor`、`borderColor`、`textColor`、`mutedTextColor`
- 质感：`texture.material`、`texture.surface`、`texture.grainOpacity`、`texture.patternOpacity`、`texture.imageContrast`、`texture.imageSaturation`
- 密度：`density`
- 动效：`motionLevel`
- 首页节奏：`homeLayout`
- 顶部：`headerStyle`
- Banner：`bannerStyle`
- 商品卡：`productCardVariant`、`cardStyle`、`imageRatio`、`imageFit`
- 优惠券：`couponStyle`
- 会员卡：`memberCardStyle`
- 快捷入口图标：`categoryIconStyle`
- 底部导航：`navStyle`

后台不得直接输出页面专用 CSS class、固定像素布局、页面排序补丁或旧 HTML 结构。

## 客户端固定标准

这些标准由客户端设计系统固定，后台皮肤不能覆盖：

- 路由外壳：`FrontLayout` / `StoreShell`
- 移动端基准：390px
- 页面安全区：`--sf-bottom-nav-total-height`、`--sf-action-bar-total-height`
- 商品图片稳定比例和加载占位
- 按钮最小点击区域
- 卡片标题、价格、操作区不重叠规则
- 底部导航层级和显隐规则
- 加载、空、错误状态结构

商品卡固定规则：

- class 前缀：`sf-next-product-card`
- 移动端商品图比例由 `--sf-product-media-ratio` 统一控制，当前基准为 8:5
- 商品图背景 token 使用 `--sf-product-media-bg`，不得继续输出 `--store-product-media-bg`
- 商品卡图片区不得引用 `--sf-next-product-card__media-bg`；统一使用 `--sf-product-media-bg`
- 商品卡标题、信息区、辅助文字和价格分别使用 `sf-next-product-card__title`、`sf-next-product-card__info`、`sf-next-product-card__caption`、`sf-next-price__amount` / `sf-next-price__currency`
- 商品卡必须保留统一卡片容器、边框、圆角、图片区和固定加购触点；禁止回退到裸图、裸标题、裸价格的旧列表样式
- 信息区不能使用 `flex: 1` 强行撑满卡片高度
- 价格/操作区不能使用 `mt-auto` 把价格推到卡片底部制造空白
- 标题到价格区的可见空白应接近 0，不能出现整块空白区域
- 列表页滚到底时最后一行商品必须避开底部导航安全区

商品详情固定规则：

- class 前缀：`sf-next-product-*`
- 页面根节点只能使用 `sf-next-product-detail-page`，不得再输出 `store-product-detail-page`
- 布局、图库、摘要、价格、信任卡、购买栏分别使用 `sf-next-product-detail-layout`、`sf-next-product-gallery`、`sf-next-product-summary`、`sf-next-product-price`、`sf-next-product-trust-card`、`sf-next-product-purchase-bar`
- 移动端固定购买栏使用 `sf-next-product-submit-bar`，并通过 `sf-next-product-action-space` 避让底部安全区
- 商品详情不得再依赖 `store-detail-*` 或 `store-price-detail` 旧视觉层

结算页固定规则：

- class 前缀：`sf-next-checkout-*`
- 页面根节点只能使用 `sf-next-checkout-page`，不得再输出 `store-checkout-page`
- 卡片、步骤号、商品行、商品图、商品行正文分别使用 `sf-next-checkout-card`、`sf-next-checkout-step`、`sf-next-checkout-item`、`sf-next-checkout-media`、`sf-next-checkout-item-copy`
- 结算汇总使用 `sf-next-checkout-summary`
- 移动端固定提交栏使用 `sf-next-checkout-submit-bar`，并通过 `sf-next-checkout-action-space` 避让底部安全区
- 结算页不得再依赖 `store-checkout-*` 或 `store-mobile-submit-bar` 旧视觉层

购物车固定规则：

- class 前缀：`sf-next-cart-*`
- 页面根节点只能使用 `sf-next-cart-page`，不得再输出 `store-cart-*`
- 商品列表、商品行、商品图、数量控制、优惠面板、移动端结算栏分别使用 `sf-next-cart-list`、`sf-next-cart-item`、`sf-next-cart-media`、`sf-next-cart-qty-control`、`sf-next-cart-discount-panel`、`sf-next-cart-checkout-bar`
- 桌面购物车汇总使用 `sf-next-cart-summary`，不得复用结算页旧的 `store-checkout-summary`
- 购物车商品图片必须走统一比例容器，图片区域不能被旧 `store-cart-media` 规则覆盖
- 购物车不得再依赖 `store-cart-*` 或 `store-checkout-summary` 旧视觉层

底部导航固定规则：

- 移动端内容高度基准为 60px：`--sf-bottom-nav-content-height: 3.75rem`
- 图标、文字、徽标必须在 60px 内完整显示，不能增加导航高度来解决局部对齐
- 页面内容底部避让通过 `--sf-bottom-nav-total-height` 统一计算，不允许单页写死大 padding

分类页固定规则：

- 顶部只保留一套分类入口：`全部`、`新品`、后台分类项
- 不再额外渲染第二套精选分类宫格，避免分类重复和首屏层级过重
- 商品列表筛选、排序和分类入口必须在 390px 内不横向撑开
- 分类页根、列表、商品网格、筛选和排序必须使用 `sf-next-category-page`、`sf-next-listing-page`、`sf-next-product-grid`、`sf-next-filter-*`、`sf-next-sort*`
- 分类页不得再输出 `store-category-page`、`store-category-main`、`store-listing-page`、`store-product-grid`、`store-category-filter-*`、`store-category-sort*`

优惠券固定规则：

- class 前缀：`sf-next-coupon-card*`
- 优惠券卡根节点只能使用 `sf-next-coupon-card` / `sf-next-coupon-card--template`，不得再输出 `store-coupon-card*`
- 优惠券金额尺寸使用 `sf-next-coupon-amount-home` / `sf-next-coupon-amount-list`，不得再输出 `store-coupon-amount-*`
- 优惠券标题和辅助信息使用 `sf-next-coupon-card__title` / `sf-next-coupon-card__meta`，不得依赖 `store-card-title` / `store-micro`
- 优惠券分类筛选可以换行，不能为了横滑导致首屏分类被截断
- 优惠券卡必须保留金额、门槛、有效期、优惠码、动作区的稳定布局

搜索页固定规则：

- class 前缀：`sf-next-search`
- 搜索页不得再输出 `store-client-search-*` 旧视觉选择器
- 搜索输入、清空、建议、历史、热门搜索、最近浏览和结果列表必须共用同一套搜索页间距、字号和卡片边界
- 390px 移动端搜索行必须固定三列：序号/图标、关键词、状态/箭头，关键词超长时省略，不能挤压右侧操作

空状态固定规则：

- class 前缀：`sf-next-empty-state`
- 公共空状态组件不得再输出 `client-empty-state` 或依赖旧 `client-card` 组合 class
- 图标、标题、说明和操作区必须居中对齐，说明文字在移动端限制行宽，按钮不得压住说明

基础组件固定规则：

- 页面壳、容器、按钮、分组标题只允许输出 `sf-next-page*`、`sf-next-container`、`sf-next-button*`、`sf-next-section-header*`
- 不得再输出 `client-page*`、`client-container`、`client-button*`、`client-section-header*`
- 已无组件引用的旧 `client-header`、`client-product-*`、`client-hero*`、`client-quick-nav*` CSS 不得回流
- 通用按钮必须保留 hover、active、focus、disabled、loading 状态，不能为了视觉统一删除可访问状态

图片比例固定规则：

- class 前缀：`sf-next-ratio-image`
- 商品图、购物车图、活动图和内容图不得再输出 `client-ratio-image` 旧视觉选择器
- 图片容器必须有稳定 `aspect-ratio`、失败占位、加载占位和 `object-fit` 控制，不能用图片自然高度撑开卡片
- 商品卡图片区域必须由外层媒体框统一控制高度和背景，图片本身只负责裁切/适配，避免列表卡片高低错乱

账户页固定规则：

- class 前缀：`sf-next-profile`
- 账户页不得再使用 `client-profile-*` 旧视觉选择器
- 账户页英雄卡不得再输出 `store-profile-vip-card`、`profile-guest-card` 等旧 Profile root class
- 旧 Profile 视觉层不得继续放在 `index.css`，正式样式必须收口到 `storefront-next.extended-routes.css`；分类页独立滚动和二级分类最终规则收口到 `storefront-next.category.css`
- 登录/未登录态、会员卡、资产、订单、服务、邀请好友和退出登录必须共享同一套账户页网格、卡片、间距和安全区
- 移动端未登录卡片的按钮、权益入口和说明文字必须在 390px 内稳定换行，不能横向撑开

如果某套皮肤需要差异，只能通过 token、材质、组件变体和局部模块节奏表达，不能新建一套独立页面结构。

## 快捷入口标准

前台“快捷入口”只读取后台首页运营里的 nav items。后台名称统一叫“快捷入口”，不再保留另一套固定快捷入口功能。

前台呈现规则：

- class 前缀：`sf-next-quick-entry`
- 数据来源：`useHomeModuleSettings().navItems`
- 显隐规则：`nav_grid` 模块开关和 `filterVisibleHomeNavItems`
- 跳转规则：`openHomeNavItemTarget`
- 最大首屏数量：10
- 空数据：不渲染模块
- 加载态：只使用 `sf-next-quick-entry__item--loading`

## 禁止回流清单

正式客户端源码、脚本和样式中禁止重新出现：

- `GuestHome`
- `MemberHome`
- `HomeOpsBlocks`
- `HomeSkinShowcase`
- `HomeGridProductCard`
- `HomeNewArrivalCard`
- `store-home-v4`
- `store-home-command`
- `store-home-nav-grid`
- `store-nav-action`
- `store-icon-tile`
- `store-nav-band`
- `data-store-home-version`
- `store-skin-showcase`
- `store-skin-home`
- `store-skin-banner`
- `store-skin-banner-frame`
- `store-hero-frame`
- `store-hero-*`
- `store-trust-*`
- `store-page-shell`
- `store-bottom-safe`
- `store-mobile-page-header`
- `store-page-title`
- `store-glass-surface`
- `store-tab-route-transition`
- `store-front-layout`
- `store-shell`
- `store-standard-page-shell`
- `store-fixed-header`
- `store-home-main*`
- `store-home-hero-v2`
- `store-home-hero-stack`
- `store-home-advisor-*`
- `store-home-focus-*`
- `store-home-trust-compact`
- `store-desktop-header`
- `store-tablet-*`
- `store-header-*`
- `store-page-header`
- `store-search-field`
- `store-search-submit-button`
- `store-brand-logo`
- `store-notification-button`
- `store-notification-badge`
- `store-conversion-page`
- `store-listing-empty`
- `store-search-empty`
- `store-loyalty-route-loading`
- `store-capability-route-loading`
- `store-order-header-search-field`
- `store-checkout-coupon-loading-pill`
- `store-payment-option`
- `store-payment-channel`
- `store-design-system*`
- `store-share-detail*`
- `store-design-state*`
- `store-product-card*`
- `store-product-media*`
- `--store-product-media-bg`
- `store-price-card`
- `store-price-currency`
- `theme-product-card`
- `store-bottom-action-space`
- `store-bottom-cart-space`
- `store-card-title`
- `store-caption`
- `store-micro`
- 前台运行路径里的 `store-card`
- 前台运行路径里的 `store-body-text`
- 前台运行路径里的 `store-body-small`
- 前台运行路径里的 `store-account-product-card`
- 前台运行路径里的 `theme-rounded`
- 前台运行路径里的 `theme-shadow`
- 前台运行路径里的 `store-category-page`
- 前台运行路径里的 `store-category-main`
- 前台运行路径里的 `store-listing-page`
- 前台运行路径里的 `store-product-grid`
- 前台运行路径里的 `store-category-filter-*`
- 前台运行路径里的 `store-category-sort*`
- 前台运行路径里的 `store-category-rail*`
- 前台运行路径里的 `store-category-tile*`
- 前台运行路径里的 `store-category-subtab*`
- 前台运行路径里的 `store-category-side*`
- 前台运行路径里的 `store-category-tool-icon`
- 前台运行路径里的 `store-filter-reset-button`
- 前台运行路径里的 `store-filter-confirm-button`
- `client-profile`
- `store-client-search`
- `store-client-design`
- `client-empty-state`
- `client-ratio-image`
- `client-page`
- `client-container`
- `client-button`
- `client-section-header`
- `client-header`
- `client-product`
- `client-hero`
- `client-quick-nav`
- `store-profile-vip-card`
- `profile-guest-card`
- `store-profile-page`
- `store-profile-card`
- `store-product-detail-page`
- `store-detail-layout`
- `store-detail-gallery`
- `store-detail-info-card`
- `store-detail-purchase-bar`
- `store-detail-mini-action-icon`
- `store-detail-add-cart`
- `store-detail-buy-now`
- `store-price-detail`
- `store-checkout-page`
- `store-checkout-card`
- `store-checkout-step`
- `store-checkout-item`
- `store-checkout-item-copy`
- `store-checkout-media`
- `store-cart-*`
- `store-checkout-summary`
- `store-coupon-card*`
- `store-coupon-amount-*`
- `store-mobile-submit-bar`

这些由 `npm run check:client-redesign-scope` 阻断。

## 主题色治理基线

`npm run theme:check` 已接入 `scripts/baselines/theme-hardcoded-colors.json`。当前历史硬编码颜色作为已知债务锁定，不再允许新增。

处理规则：

- 新增客户端样式优先使用 `--theme-*`、`--mall-*`、`--sf-*` token。
- 不能为了单页效果新增 `#fff`、`rgba()`、`bg-[#...]`、`text-[#...]` 等硬编码色。
- 只有确认某个硬编码颜色属于品牌图标、第三方图标或无法 token 化的资产色时，才允许更新 baseline。
- 更新 baseline 必须是显式动作：`THEME_CHECK_UPDATE_BASELINE=1 npm run theme:check`。
- 常规开发和发布检查只运行 `npm run theme:check`，新增硬编码颜色会失败。

## 后台适配路线

后台皮肤页不追求自己变好看，目标是配置准确、预览真实、发布同步：

1. 皮肤编辑器只展示客户端支持的字段。
2. 编辑器字段名要按客户端模块组织：颜色、质感、首页、商品卡、优惠券、会员卡、快捷入口、导航。
3. 预览必须使用真实客户端路由和草稿 token。
4. 发布后必须更新 `activeSkinId` / `runtimeSkinId`，并通知前台刷新主题缓存。
5. 后台自身继续使用安全主题，不跟随商城皮肤变色。

## 验收门禁

每批客户端设计修改至少运行：

```bash
npm run typecheck
npm run build
npm run theme:check
npm run check:client-redesign-scope
BASE_URL=<local-storefront> npm run audit:overlap
BASE_URL=<local-storefront> npm run audit:route-transition
```

需要视觉确认时再运行：

```bash
BASE_URL=<local-storefront> npm run capture:client-redesign
BASE_URL=<local-storefront> VIEWPORT=1280x800 npm run capture:client-redesign
```

验收时必须人工看截图总览，自动门禁只能证明没有明显运行错误、横向溢出和自动可识别重叠。
