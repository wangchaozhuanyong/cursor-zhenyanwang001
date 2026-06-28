# 客户端重构变更清单

更新时间：2026-06-24 16:38 PDT

## 目的

这份清单用于提交前审查当前客户端 SILENT COMMERCE 重构范围。它不替代自动门禁，主要说明每类文件为什么应该进入同一个客户端重构提交。

## 范围结论

- 变更性质：前台客户端展示层、路由接线、设计系统、验收脚本和发布文档。
- 不包含：登录认证算法、支付计算、订单价格、库存扣减、生产部署配置、数据库业务表结构。
- 构建产物：`dist/`、`admin-dist/`、`artifacts/` 当前仍为 ignored，不进入提交。
- 建议提交：单个提交 `feat(client): redesign storefront experience`。
- 本轮补充：主题硬编码颜色基线、固定 Hero 快捷导航移除、购物车底部导航恢复、客户端设计系统契约、商品卡密度修复、移动端商品图比例和底部导航防遮挡修复、分类页重复入口清理、优惠券筛选换行、底部导航 60px 基准。
- 本轮继续：账户页运行 class 已从 `client-profile-*` 迁移到 `sf-next-profile-*`，旧 Profile CSS 已从正式样式移除，并由提交范围检查阻断回流。
- 本轮继续：搜索页运行 class 已从 `store-client-search-*` 迁移到 `sf-next-search-*`，旧搜索 CSS 已从 `index.css` 移除，并由提交范围检查阻断回流。
- 本轮继续：公共空状态组件已从 `client-empty-state` / `client-card` 组合迁移到 `sf-next-empty-state` / `sf-next-card`，旧空状态选择器由提交范围检查阻断回流。
- 本轮继续：公共图片比例组件已从 `client-ratio-image-*` 迁移到 `sf-next-ratio-image-*`，商品图/购物车图/占位图进入统一图片比例契约。
- 本轮继续：页面壳、容器、按钮、分组标题已迁移到 `sf-next-page*` / `sf-next-container` / `sf-next-button*` / `sf-next-section-header*`，未被组件引用的旧 `client-header`、`client-product-*`、`client-hero*`、`client-quick-nav*` CSS 已删除。
- 本轮继续：账户页英雄卡移除 `store-profile-vip-card` / `profile-guest-card` 旧 root class，`index.css` 旧 Profile 视觉规则已清理，Profile 正式视觉收口到 `sf-next-profile-*`。
- 本轮继续：客户端设计系统页运行 class 已从 `store-client-design-*` 迁移到 `sf-next-design-*`，截图脚本等待条件同步更新。
- 本轮继续：商品详情页运行 class 已从 `store-product-detail-page` / `store-detail-*` / `store-price-detail` 迁移到 `sf-next-product-*`，移动端固定购买栏使用独立 `sf-next-product-submit-bar` 和 `sf-next-product-action-space`，旧商品详情选择器由提交范围检查阻断回流。
- 本轮继续：结算页运行 class 已从 `store-checkout-page` / `store-checkout-card` / `store-checkout-item*` / `store-mobile-submit-bar` 迁移到 `sf-next-checkout-*`，移动端固定提交栏使用 `sf-next-checkout-submit-bar` 和 `sf-next-checkout-action-space`，旧结算选择器由提交范围检查阻断回流。
- 本轮继续：购物车页运行 class 已从 `store-cart-*` / `store-checkout-summary` 迁移到 `sf-next-cart-*`，商品行、商品图、优惠面板和移动端结算栏进入同一套购物车设计契约，旧购物车选择器由提交范围检查阻断回流。
- 本轮继续：优惠券卡运行 class 已从 `store-coupon-card*` / `store-coupon-amount-*` 迁移到 `sf-next-coupon-card*` / `sf-next-coupon-amount-*`，标题和辅助信息改用优惠券专属类，旧优惠券卡选择器由提交范围检查阻断回流。
- 本轮继续：旧商品卡运行 class 已从 `store-product-card*` / `store-product-media*` / `store-price-card` 迁移到 `sf-next-product-card*` / `sf-next-price*`，商品图背景 token 改为 `--sf-product-media-bg`，旧商品卡链路由提交范围检查阻断回流。
- 本轮继续：旧底部安全区类 `store-bottom-action-space` / `store-bottom-cart-space` 已从正式样式删除，固定购买/结算栏只允许使用 `sf-next-product-action-space` / `sf-next-checkout-action-space`。
- 本轮继续：旧通用文字类 `store-card-title` / `store-caption` / `store-micro` 已退出正式运行样式，快捷入口和登录协议页脚分别迁移到 `sf-next-home-nav-label` / `sf-next-auth-caption`。
- 本轮继续：未引用的旧 `ProductCardSkeleton.tsx` 已删除，死 `theme-product-card` selector 已从正式 CSS 移除，`theme-product-card` class 由提交范围检查阻断回流。
- 本轮继续：公共客户端运行 class 已从 `store-card` / `store-body-*` / `store-account-product-card` / `theme-rounded` / `theme-shadow` 迁移到 `sf-next-surface-card` / `sf-next-body-*` / `sf-next-account-product-card` / `sf-next-theme-*`；提交范围检查新增公共客户端路径专用门禁，后台专用旧工具类暂不阻断。
- 本轮继续：商品卡图片区最终层统一为 `--sf-product-media-ratio: 8 / 5`，修正错误 `--sf-next-product-card__media-bg` 引用为 `--sf-product-media-bg`，并把商品图背景、装饰层级、加载/空图占位收敛到 `sf-next-product-card__media`。

## 必须一起提交的范围

以下范围互相依赖，拆开提交会导致中间状态不可运行或无法验收。

### 1. 客户端设计系统

- `src/styles/storefront-foundation.css`
- `src/styles/storefront-next.tokens.css`
- `src/styles/storefront-next.primitives.css`
- `src/styles/storefront-next.extended-routes.css`
- `src/styles/storefront-next.category.css`
- `src/styles/client-redesign.css`
- `src/styles/support-download.css`
- `src/main.tsx`

作用：

- 引入 SILENT COMMERCE 的全局 token、基础原语、扩展路由样式。
- 只作用于前台 store scope，避免把客户端视觉直接污染后台。
- 为 40 个移动端页面提供一致的间距、圆角、阴影、安全区和状态样式。

### 2. 外壳、导航和公共组件

- `src/layouts/FrontLayout.tsx`
- `src/layouts/StoreShell.tsx`
- `src/components/BottomNav.tsx`
- `src/components/PageHeader.tsx`
- `src/components/store/StorePageHeader.tsx`
- `src/components/store/StoreStandardPageShell.tsx`
- `src/components/BannerCarousel.tsx`
- `src/components/CategoryKingkongRow.tsx`
- `src/components/CategoryTabs.tsx`
- `src/components/TrustInfo.tsx`
- `src/components/store/CategoryNavTile.tsx`
- `src/components/store/HomeNavIcon.tsx`
- `src/components/support/InstallPlatformCard.tsx`
- `src/components/support/SupportContactSection.tsx`

作用：

- 重做客户端页面壳、底部导航、页面头和入口模块。
- 保留购物车徽标、路由挂载、移动端底栏、安全区和已有组件职责。
- 支撑首页、分类、搜索、优惠、账户和内容页一致呈现。

### 3. 首页和商城核心模块

- `src/modules/storefront-v2/home/HomeProductSectionV2.tsx`
- `src/modules/storefront-v2/home/StoreHomeV2.tsx`
- `src/modules/storefront-v2/product/ProductCardV2Skeleton.tsx`
- `src/components/motion/SilkProductGrid.tsx`
- `src/modules/storefront-v2/home/HomeHeroV2.tsx`
- `src/modules/storefront-v2/home/HomePrimaryCampaignV2.tsx`

作用：

- 正式首页只保留 `StoreHomeV2` 这一条新版客户端入口，旧 `GuestHome` / `MemberHome` / `HomeOpsBlocks` 已退出发布源码。
- 首页 Hero 不再保留固定快捷导航链接；前台“快捷入口”统一读取后台首页运营 nav items。
- 让首页和商品区进入真实设计系统，而不是只换颜色。
- 保留真实商品、优惠、分类、会员状态和活动数据流。
- 处理加载骨架、移动端比例和商品卡防挤压。
- 商品卡不得再使用强制等高、`flex: 1` 信息区或 `mt-auto` 价格区制造大空白；移动端图片区按客户端 token 统一控制。
- 商品卡不得再回退到裸图裸文字列表；列表页、首页商品区统一使用 `sf-next-product-card` 卡片、固定图片区和固定加购触点。

### 4. 40 页客户端路由

覆盖设计资料里的主要页面：

- 商品链路：`Categories.tsx`、`Search.tsx`、`ProductDetail.tsx`
- 交易链路：`Cart.tsx`、`Checkout.tsx`、`PaymentResult.tsx`、`Orders.tsx`、`OrderDetail.tsx`、`OrderLogistics.tsx`
- 售后链路：`Returns.tsx`、`ReturnDetail.tsx`、`PendingReviews.tsx`
- 营销链路：`Coupons.tsx`、`Promotions.tsx`、`PromotionDetail.tsx`
- 账户链路：`Profile.tsx`、`MemberBenefits.tsx`、`MemberBenefitsView.tsx`、`AddressManage.tsx`、`Favorites.tsx`、`History.tsx`、`Notifications.tsx`、`Points.tsx`、`PointsGiftShop.tsx`、`Rewards.tsx`、`Wallet.tsx`、`Settings.tsx`、`Feedback.tsx`、`Invite.tsx`
- 内容/服务链路：`About.tsx`、`ContactUsContent.tsx`、`ContentCmsPage.tsx`、`Delivery.tsx`、`FeatureStatus.tsx`、`Help.tsx`、`SupportDownload.tsx`、`TikTokLanding.tsx`
- 认证/错误链路：`Login.tsx`、`ForgotPassword.tsx`、`BindWechatPhone.tsx`、`FeatureUnavailable.tsx`、`NotFound.tsx`

作用：

- 按设计资料完成客户端主要路由视觉重构。
- 不创建静态演示项目，不写假页面替代真实路由。
- 登录态保护页仍按原业务跳转到登录，不误开放订单、钱包、地址等页面。
- 分类页只保留一套顶部分类入口；不再额外渲染第二套“精选分类”宫格造成重复层级。
- 优惠券页分类筛选必须可换行展示，不允许横向截断主要分类。

### 5. 复用设计组件

- `src/modules/storefront-v2/design/storefrontDesignContract.ts`
- `src/modules/storefront-v2/design/components/BalanceFolio.tsx`
- `src/modules/storefront-v2/design/components/RouteStatePanel.tsx`
- `src/modules/storefront-v2/design/components/SharePassCard.tsx`
- `src/modules/storefront-v2/design/components/StatusTimeline.tsx`
- `src/modules/storefront-v2/design/components/ValueVaultCoupon.tsx`

作用：

- 把优惠券、邀请好友、余额/状态、物流/售后时间线等重点模块变成可复用组件。
- 避免每个页面复制一套视觉结构。
- 支撑后续继续做桌面增强或更多皮肤时复用同一套客户端契约。

### 6. 路由、常量、工具和测试适配

- `src/routes/StoreAppRoutes.tsx`
- `src/constants/storeLayout.ts`
- `src/constants/pointsClientFeatures.ts`
- `src/contexts/ThemeRuntimeProvider.tsx`
- `src/utils/categoryNavIcon.ts`
- `src/utils/clientDesignStyle.ts`
- `src/utils/themeVisuals.ts`
- `src/components/bottomNavVisibility.ts`
- `src/components/bottomNavVisibility.test.ts`
- `src/modules/public/pages/user/ProfileSections.tsx`
- `src/modules/public/pages/user/ProfileSections.test.ts`
- `src/modules/public/pages/user/Rewards.test.tsx`
- `src/modules/public/pages/user/profileQuickLinks.ts`
- `src/modules/public/pages/order/hooks/useCheckoutPage.ts`
- `src/modules/public/pages/order/components/CheckoutOrderSuccess.tsx`

作用：

- 补足新版客户端需要的路由、底栏显隐、快捷入口、主题属性和账户导航。
- 保留现有测试覆盖，并让改造后的组件仍可被测试识别。
- Banner 运行层旧 `store-skin-banner` / `store-skin-banner-frame` / `store-hero-*` / `store-hero-frame` 命名已迁移到 `sf-next-banner-*`；`sf-next-banner-frame` 是新版 Banner 框架类，由提交范围检查允许保留。
- TrustBar 运行层旧 `store-trust-*` 命名已迁移到 `sf-next-trust-*`，首页压缩态使用 `sf-next-home-trust-compact`。
- 页面壳运行层旧 `store-page-shell`、`store-bottom-safe`、`store-mobile-page-header`、`store-page-title`、`store-glass-surface`、`store-tab-route-transition`、`store-front-layout`、`store-shell`、`store-standard-page-shell`、`store-fixed-header` 已迁移到 `sf-next-*` 命名。
- Header / Search 运行层旧 `store-desktop-header`、`store-tablet-*`、`store-header-*`、`store-page-header`、`store-search-field`、`store-brand-logo`、`store-notification-*` 已迁移到 `sf-next-header-*`、`sf-next-store-page-header`、`sf-next-search-field`、`sf-next-brand-logo`、`sf-next-notification-*`。
- Route state / transaction 运行层旧 `store-conversion-page`、`store-listing-empty`、`store-search-empty`、`store-loyalty-route-loading`、`store-capability-route-loading`、`store-order-header-search-field`、`store-checkout-coupon-loading-pill`、`store-payment-option`、`store-payment-channel` 已迁移到 `sf-next-*` 命名。
- Client design reference 页旧 `store-design-system*`、`store-share-detail*`、`store-design-state*` 已迁移到 `sf-next-design-system*`、`sf-next-share-detail*`、`sf-next-design-state*`。
- Profile 运行层旧 `client-profile-*` 命名已迁移到 `sf-next-profile-*`，旧 Profile CSS 不再作为正式客户端样式来源。
- Search 运行层旧 `store-client-search-*` 命名已迁移到 `sf-next-search-*`，正式搜索页不再依赖旧移动端搜索覆盖层。
- EmptyState 公共组件旧 `client-empty-state` 命名已迁移到 `sf-next-empty-state`，后续页面空状态必须复用新命名。
- RatioImage 公共组件旧 `client-ratio-image-*` 命名已迁移到 `sf-next-ratio-image-*`，后续图片比例、加载和失败占位必须复用新命名。
- 基础组件旧 `client-page*`、`client-container`、`client-button*`、`client-section-header*` 不再作为正式运行 class，后续通用页面结构必须使用 `sf-next-*`。
- Profile 旧 `store-profile-vip-card`、`profile-guest-card`、`store-profile-page`、`store-profile-card` 不再作为正式运行/兼容选择器，后续账户页只能在 `sf-next-profile-*` 下扩展。
- Design System 页旧 `store-client-design-*` 不再作为正式运行 class，后续只允许 `sf-next-design-*`。
- Product Detail 旧 `store-product-detail-page`、`store-detail-*`、`store-price-detail` 不再作为正式运行/兼容选择器，后续商品详情只能在 `sf-next-product-*` 下扩展。
- Checkout 旧 `store-checkout-page`、`store-checkout-card`、`store-checkout-step`、`store-checkout-item*`、`store-checkout-media`、`store-mobile-submit-bar` 不再作为正式运行/兼容选择器，后续结算页只能在 `sf-next-checkout-*` 下扩展。
- Category/List 旧 `store-category-page`、`store-category-main`、`store-listing-page`、`store-product-grid`、`store-category-filter-*`、`store-category-sort*`、`store-category-rail*`、`store-category-tile*`、`store-category-subtab*`、`store-category-side*`、`store-category-tool-icon`、`store-filter-reset-button`、`store-filter-confirm-button` 不再作为正式运行 class，后续分类、搜索和商品网格只能在 `sf-next-category-*`、`sf-next-listing-*`、`sf-next-product-grid`、`sf-next-filter-*`、`sf-next-sort*` 下扩展。
- Home Quick Entry 旧 `store-nav-action`、`store-icon-tile` 不再作为快捷入口/金刚区正式运行 class；后台主题预览和客户端首页统一使用 `sf-next-quick-entry__item`、`sf-next-quick-entry__icon`、`sf-next-quick-entry__copy`。

### 7. 验收脚本和发布文档

- `scripts/capture-client-redesign-screens.mjs`
- `scripts/check-client-redesign-release-scope.mjs`
- `scripts/run-client-redesign-release-gate.mjs`
- `scripts/audit-route-transition.mjs`
- `scripts/audit-ui-overlap.mjs`
- `scripts/smoke-restructure.mjs`
- `scripts/verify-client-e2e.mjs`
- `scripts/verify-theme-studio.mjs`
- `scripts/check-public-theme-hardcoded-colors.mjs`
- `scripts/baselines/theme-hardcoded-colors.json`
- `package.json`
- `docs/CLIENT_DESIGN_SYSTEM_CONTRACT.md`
- `docs/CLIENT_REDESIGN_RELEASE_AUDIT.md`
- `docs/CLIENT_REDESIGN_RELEASE_RUNBOOK.md`
- `docs/CLIENT_REDESIGN_CHANGE_MANIFEST.md`
- `.gitignore`

作用：

- 把本次客户端重构的 smoke、E2E、重叠扫描、路由切换、截图采集、提交范围检查收口成可重复命令。
- `theme:check` 使用基线锁住历史硬编码颜色债务，新增硬编码颜色会阻断发布门禁。
- 固化客户端设计系统与后台皮肤契约，阻止旧首页结构和旧快捷入口视觉回流。
- 记录通过证据、提交范围、发布步骤和人工抽查重点。
- `.gitignore` 只补设计预览产物忽略规则，避免本地预览产物进入发布提交。

## 明确不提交

- `dist/`
- `admin-dist/`
- `artifacts/`
- `.env`
- `.env.*`
- 任何 lockfile
- 任何本地预览或下载参考素材

## 最终审查口径

提交前以这些命令为准：

```bash
npm run check:client-redesign-scope
npm run theme:check
git diff --check
BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign
```

发布后以真实环境重跑：

```bash
BASE_URL=<storefront-url> npm run release:client-redesign
```
