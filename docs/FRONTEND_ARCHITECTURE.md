# Frontend Architecture

本文档是前端工程规范，适用于 `click-send-shop-main/click-send-shop-main/src` 下的用户端 SPA 和管理后台 SPA。

整站关系见 `docs/WEBSITE_ARCHITECTURE.md`。后端硬规范见 `docs/ARCHITECTURE.md`。UI/UX 和 theme/skin 规则见 `docs/DESIGN_SYSTEM.md`。

## 1. 前端技术栈

当前前端技术栈以 `click-send-shop-main/click-send-shop-main/package.json` 为准：

- React 18。
- Vite。
- TypeScript。
- React Router。
- TanStack Query。
- Zustand。
- Tailwind CSS。
- Radix UI 部分基础组件。
- lucide-react 图标。
- framer-motion 动效。
- vite-plugin-pwa。
- Vitest 和 Playwright 相关脚本。

禁止为了单个需求替换技术栈或引入新的大型状态管理、路由、UI 框架。

## 2. 用户端 SPA 入口

用户端入口固定为：

```text
click-send-shop-main/click-send-shop-main/src/main.tsx
click-send-shop-main/click-send-shop-main/src/StoreApp.tsx
click-send-shop-main/click-send-shop-main/src/routes/StoreAppRoutes.tsx
```

用户端页面主要放在：

```text
click-send-shop-main/click-send-shop-main/src/modules/public/pages
```

当前用户端页面域包括：

```text
auth
cart
content
error
home
order
product
review
user
```

用户端只负责展示、交互、表单基础校验、调用 API、处理加载和错误体验。价格、库存、订单状态、支付状态、优惠券核销、积分结算、权限结果必须以后端为准。

## 3. 管理后台 SPA 入口

管理后台入口固定为：

```text
click-send-shop-main/click-send-shop-main/src/admin-main.tsx
click-send-shop-main/click-send-shop-main/src/AdminApp.tsx
click-send-shop-main/click-send-shop-main/src/routes/AdminAppRoutes.tsx
click-send-shop-main/click-send-shop-main/src/layouts/AdminLayout.tsx
```

管理后台页面主要放在：

```text
click-send-shop-main/click-send-shop-main/src/modules/admin/pages
```

当前后台页面域包括：

```text
auth
coupon
dashboard
error
event
marketing
monitoring
notification
order
payment
product
rbac
report
review
settings
system
user
```

后台页面可以做菜单隐藏、按钮禁用和体验保护，但真正权限必须由 `/api/admin/*` 后端接口校验。

## 4. 路由结构

路由目录固定为：

```text
click-send-shop-main/click-send-shop-main/src/routes
```

关键文件：

```text
AdminAppRoutes.tsx
StoreAppRoutes.tsx
adminLazyPages.ts
publicLazyPages.ts
adminLegacyRedirects.tsx
adminReportRoutes.tsx
```

新增页面前必须先判断是用户端还是后台端，再挂到对应路由。禁止把后台页面写进 `modules/public`，也禁止把用户端页面写进 `modules/admin`。

权限路由、能力开关、legacy redirect 必须集中在路由层或既有配置中处理，不要在普通页面里散落重复判断。

## 5. 页面目录规则

页面文件放在：

```text
src/modules/public/pages/<domain>
src/modules/admin/pages/<domain>
```

页面只负责组织 UI、调用服务层、处理页面状态。不要把最终业务规则写进页面。

如果页面需要复用展示组件，优先放到对应模块的 `components` 子目录或全局 `src/components`，不要跨 public/admin 互相 import。

## 6. 组件目录规则

通用组件位置：

```text
src/components
src/components/ui
```

模块组件位置：

```text
src/modules/public/components
src/modules/admin/components
src/modules/micro-interactions
```

规则：

- public 组件不得依赖 admin 页面和后台专用上下文。
- admin 组件不得把管理后台权限判断当成后端权限结果。
- 通用组件不得承载商品、订单、支付、库存、权限等业务最终规则。
- 组件样式应优先复用现有 Tailwind、CSS 变量和组件习惯。

## 7. API 请求层规则

底层请求入口固定为：

```text
src/api/request.ts
```

默认 API base：

```text
VITE_API_BASE_URL=/api
```

`request.ts` 已包含 token refresh、admin CSRF、admin MFA step-up、超时、离线重试、错误消息、媒体 URL 归一化等能力。前端新增 API 调用不得绕开这个请求层，除非是已经明确的特殊浏览器 API，例如 `sendBeacon`，并且必须说明原因。

业务服务层位置：

```text
src/api/modules
src/api/admin
src/services
src/services/admin
```

推荐链路：

```text
page/component -> service -> src/api/* -> src/api/request.ts -> /api
```

## 8. 用户端 API 调用规范

用户端业务 API 使用 `/api/*`，前端代码里通常通过 `request.ts` 传入不带 `/api` 前缀的 endpoint，例如 `/products`、`/cart`。

用户端不得调用 `/api/admin/*`。如用户端需要展示后台配置结果，必须由后端提供公开可访问的用户端接口。

## 9. 管理后台 API 调用规范

管理后台 API 必须走 `/api/admin/*`。前端请求层里的 endpoint 通常以 `/admin/` 开头。

敏感操作必须依赖后端认证、授权、MFA、CSRF 和审计日志。前端只能做提示、确认、禁用按钮、二次确认等体验保护。

## 10. 状态管理边界

当前项目同时使用：

- TanStack Query：服务端数据、列表、详情、后台数据刷新。
- Zustand：登录态、购物车、本地偏好、后台工作台标签、权限缓存等客户端状态。
- React Context：主题运行时、后台 i18n、滚动 chrome、下载确认等跨树上下文。

使用边界：

- 远端数据优先使用 TanStack Query 或既有服务封装。
- 本地 UI 状态可以使用组件 state。
- 跨页面客户端状态可以使用既有 Zustand store。
- 不要把后端 source of truth 复制成前端长期真相。
- 不要用本地状态替代库存、价格、订单、支付、权限等最终业务判断。

## 11. 前端缓存策略

前端缓存规则必须同时参考：

- `docs/CACHE_INVALIDATION_RULES.md`
- `click-send-shop-main/click-send-shop-main/docs/PWA_CACHE_STRATEGY.md`
- `docs/WEBSITE_ARCHITECTURE.md`

原则：

- API 数据不能当作长期静态资源缓存。
- HTML 入口必须短缓存或 no-store，避免旧 chunk 残留。
- hashed assets 可以长缓存。
- Service Worker / PWA 缓存必须谨慎，尤其是登录态、后台、订单、支付、权限页面。
- 修改后台配置后，必须确认用户端读取路径和缓存失效路径。

## 12. 页面切换体验规则

页面切换必须有明确 loading、错误兜底和路由 fallback。当前项目已有：

- `AppRouteFallback`
- `AdminRouteFallback`
- `ErrorBoundary`
- `TopProgressBar`
- `SilkPageLoader`

新增路由时必须考虑：

- 首屏 fallback。
- lazy import 失败恢复。
- 浏览器后退和刷新。
- 移动端安全区。
- 离线或弱网提示。

## 13. 状态体验规则

页面至少要考虑：

- loading。
- error。
- empty。
- success。
- no permission。
- not found。
- offline。
- timeout。
- token expired。

后台页面尤其要避免空白页。用户没有权限或功能关闭时，应使用已有的 fallback 或能力开关页面，而不是让页面报错。

## 14. 常见异常处理规则

- `401`: 登录过期。用户端走登录恢复；后台走 admin session 过期处理。
- `403`: 无权限或敏感操作未满足条件。后台不得只靠隐藏按钮解决。
- `404`: 路由不存在或资源不存在，要进入明确 not found 状态。
- `409`: 并发冲突或状态冲突，要提示刷新或重新确认。
- `422`: 表单或业务校验失败，要展示可理解的信息。
- `500`: 服务端错误，前端不要伪造成功状态。
- `timeout`: 使用请求层超时提示，不要无限 loading。
- `offline`: 后台安全读请求可以使用既有离线重试机制。

## 15. 前端错误边界规则

跨页面错误边界使用既有 `ErrorBoundary`。新增复杂页面或重型模块时，要确认错误不会导致整个 SPA 白屏。

生产白屏、chunk 加载失败、路由异常不能只改页面代码，必须同时检查构建产物、HTML 缓存、assets 缓存、CDN、Service Worker、部署脚本和运行时恢复逻辑。

## 16. i18n 规则引用

后台 i18n 位置：

```text
src/i18n/admin
src/contexts/AdminI18nProvider.tsx
```

编码和中文防护规则见：

```text
docs/encoding-and-i18n-guardrail.md
```

后台文案修改后，优先运行：

```bash
npm run check:mojibake
npm run check:admin-i18n
```

不要手动破坏 `_extracted_zh.json`、`zhToEn.ts`、messages 文件之间的关系。

## 17. Theme / Skin 规则引用

主题运行时和皮肤配置位置：

```text
src/contexts/ThemeRuntimeProvider.tsx
src/constants/themePresets.ts
src/constants/themeDesignLocks.ts
src/index.css
src/styles/admin.css
docs/theme/7-premium-light-skins.json
```

theme/skin 详细规则见 `docs/DESIGN_SYSTEM.md`。普通前端任务不得顺手改皮肤配置。

## 18. 用户端首页响应式内容同步规则

用户端首页和公共端响应式布局必须遵守：

- 手机端/公共端内容是内容基准，平板端和电脑端只做布局适配。
- 平板端和电脑端可以调整间距、列数、顶部导航壳层、容器宽度和信息密度。
- 平板端和电脑端不得单独新增、删除、改名、隐藏首页模块或金刚区导航入口，除非用户明确要求做设备专属内容。
- 后台通过首页运营、模块开关、金刚区导航等入口新增或调整内容时，前台手机、平板、电脑必须读取同一套 `moduleSettings` / `navItems` 或同等公共数据源。
- 涉及首页模块或导航变化时，不能只看移动端；必须同时验证手机、平板、电脑三种宽度下模块集合、导航入口、顺序和可见性是否一致。
- 完成验证前，不能报告“电脑端/平板端已同步”。

## 19. 管理后台移动端响应式规则

后台移动端必须保证：

- 顶部栏、底部导航、弹窗、Toast 不互相遮挡。
- 表格在小屏有横向滚动、卡片化或摘要布局。
- 操作按钮不被安全区遮挡。
- 长字段、金额、状态、标签不溢出容器。
- 管理后台页面不能只在桌面可用。

涉及后台 UI 的改动，至少要检查一个桌面宽度和一个移动宽度。

## 20. 前端不能决定最终业务规则

禁止前端决定以下最终结果：

- 商品最终价格。
- 库存是否足够。
- 订单状态如何流转。
- 支付是否成功。
- 优惠券是否可用。
- 积分是否可抵扣。
- 用户是否有后台权限。
- 敏感操作是否允许。

前端只能展示后端结果，或做体验层预校验。

## 21. Frontend Change Plan

前端任务开始前必须输出：

```text
Frontend Change Plan:
1. Target app: storefront/admin/shared
2. Target route or page:
3. Target files:
4. Existing API/service/store used:
5. UI behavior affected:
6. Business rule impact:
7. API contract impact:
8. Responsive risk:
9. Theme/skin impact:
10. Verification commands:
```

## 22. Frontend Compliance Report

前端任务完成后必须输出：

```text
Frontend Compliance Report:
1. Target app followed:
2. Files changed within allowed scope:
3. API request layer respected:
4. Business rule unchanged:
5. Theme/skin unchanged or explained:
6. Responsive behavior checked:
7. Loading/error/empty states checked:
8. Verification commands and results:
9. Remaining frontend risks:
```
