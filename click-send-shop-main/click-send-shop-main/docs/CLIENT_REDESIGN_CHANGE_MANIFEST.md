# 客户端重构变更清单

更新时间：2026-06-22 23:41 PDT

## 目的

这份清单用于提交前审查当前客户端 SILENT COMMERCE 重构范围。它不替代自动门禁，主要说明每类文件为什么应该进入同一个客户端重构提交。

## 范围结论

- 变更性质：前台客户端展示层、路由接线、设计系统、验收脚本和发布文档。
- 不包含：登录认证算法、支付计算、订单价格、库存扣减、生产部署配置、数据库业务表结构。
- 构建产物：`dist/`、`admin-dist/`、`artifacts/` 当前仍为 ignored，不进入提交。
- 建议提交：单个提交 `feat(client): redesign storefront experience`。

## 必须一起提交的范围

以下范围互相依赖，拆开提交会导致中间状态不可运行或无法验收。

### 1. 客户端设计系统

- `src/styles/storefront-foundation.css`
- `src/styles/storefront-next.tokens.css`
- `src/styles/storefront-next.primitives.css`
- `src/styles/storefront-next.extended-routes.css`
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

- `src/modules/storefront-v2/home/HomeHeroV2.tsx`
- `src/modules/storefront-v2/home/HomeProductSectionV2.tsx`
- `src/modules/storefront-v2/home/StoreHomeV2.tsx`
- `src/modules/storefront-v2/product/ProductCardV2Skeleton.tsx`
- `src/components/motion/SilkProductGrid.tsx`
- `src/modules/public/pages/home/GuestHome.tsx`
- `src/modules/public/pages/home/MemberHome.tsx`
- `src/modules/public/pages/home/HomeSkinShowcase.tsx`

作用：

- 让首页和商品区进入真实设计系统，而不是只换颜色。
- 保留真实商品、优惠、分类、会员状态和活动数据流。
- 处理加载骨架、移动端比例和商品卡防挤压。

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

### 7. 验收脚本和发布文档

- `scripts/capture-client-redesign-screens.mjs`
- `scripts/check-client-redesign-release-scope.mjs`
- `scripts/run-client-redesign-release-gate.mjs`
- `scripts/audit-route-transition.mjs`
- `scripts/audit-ui-overlap.mjs`
- `scripts/smoke-restructure.mjs`
- `scripts/verify-client-e2e.mjs`
- `scripts/verify-theme-studio.mjs`
- `package.json`
- `docs/CLIENT_REDESIGN_RELEASE_AUDIT.md`
- `docs/CLIENT_REDESIGN_RELEASE_RUNBOOK.md`
- `docs/CLIENT_REDESIGN_CHANGE_MANIFEST.md`
- `.gitignore`

作用：

- 把本次客户端重构的 smoke、E2E、重叠扫描、路由切换、截图采集、提交范围检查收口成可重复命令。
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
git diff --check
BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign
```

发布后以真实环境重跑：

```bash
BASE_URL=<storefront-url> npm run release:client-redesign
```
