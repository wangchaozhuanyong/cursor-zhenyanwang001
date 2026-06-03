# Website Architecture

本文档说明整个网站的总体架构。它覆盖前端、管理后台、后端 API、构建产物、部署、缓存、CI 和禁止事项。

后端硬规则以 `docs/ARCHITECTURE.md` 为准；本文档不替代后端模块分层规范。

## 1. 总体架构

本项目是前后端分离开发、生产环境可由同一个 Node 服务托管前端静态文件的网站系统。

整体组成：

- 前端用户端：React + Vite 单页应用，负责商城和用户页面。
- 前端管理后台：React + Vite 管理后台应用，负责后台运营管理。
- 后端服务：Node.js + Express 单体服务，负责 API、权限、业务规则、数据库和静态资源托管。
- 数据库：MySQL。
- 部署层：Nginx / CDN / Node / PM2 或 systemd / 部署脚本协作。

整体调用方向：

```text
用户浏览器 / 管理员浏览器
  -> 前端 SPA 页面
  -> /api 或 /api/admin/*
  -> Node 后端
  -> 后端模块 service / repository
  -> MySQL / Redis / 对象存储 / 第三方服务
```

前端不能直接访问数据库，也不能绕过后端处理订单、支付、库存、优惠券、积分、权限等核心业务规则。

## 2. 前端用户端

用户端源码目录：

```text
click-send-shop-main/click-send-shop-main/src
```

用户端入口：

```text
src/main.tsx
src/StoreApp.tsx
src/routes/StoreAppRoutes.tsx
```

用户端主要职责：

- 首页、商品列表、商品详情、搜索、内容页。
- 登录注册、用户中心、地址、收藏、浏览记录。
- 购物车、下单页、订单列表、订单详情、售后。
- 优惠券、积分、奖励、邀请等展示和交互。
- PWA、离线提示、版本恢复、前端路由兜底。

用户端只负责展示、交互、表单基础校验和调用 API。涉及价格、库存、订单状态、支付状态、优惠券核销、积分结算等规则，必须以后端返回为准。

## 3. 前端管理后台

管理后台入口：

```text
src/admin-main.tsx
src/AdminApp.tsx
src/routes/AdminAppRoutes.tsx
src/layouts/AdminLayout.tsx
```

管理后台主要职责：

- 商品、分类、Banner、库存、媒体。
- 订单、售后、发货、物流。
- 用户、权限、角色、安全。
- 优惠券、营销活动、积分、奖励。
- 报表、导出、监控、数据清理、备份恢复。
- 系统设置、站点能力开关、主题、Telegram 通知。

管理后台页面不能自己决定权限结果。后台菜单、按钮显示可以做前端保护，但真正权限必须由 `/api/admin/*` 后端接口校验。

## 4. 前端目录职责

常见目录职责：

```text
src/api                 底层请求封装和部分 API 模块
src/services            用户端业务请求封装
src/services/admin      管理后台业务请求封装
src/routes              前端路由
src/modules/public      用户端页面模块
src/modules/admin       后台页面模块
src/layouts             前台和后台布局
src/components          通用组件
src/stores              Zustand 状态
src/hooks               通用 hooks
src/contexts            React 上下文
src/utils               前端通用工具
src/styles              全局样式和后台样式
src/i18n                后台多语言
src/types               TypeScript 类型
```

前端新增页面时，必须先判断是用户端还是后台端，再放入对应页面模块，不要把后台页面写进用户端模块，也不要把用户端页面写进后台模块。

## 5. API 调用规范

前端请求基础路径默认是：

```text
VITE_API_BASE_URL=/api
```

代码入口：

```text
src/api/request.ts
```

API 规则：

- 用户端业务接口统一走 `/api/*`。
- 管理后台接口统一走 `/api/admin/*`。
- 健康检查固定为 `/api/health/live` 和 `/api/health/ready`。
- 前端服务层只封装请求，不写后端业务规则。
- 管理后台敏感操作必须依赖后端鉴权、权限、MFA、CSRF 等保护。

如果出现接口路径不清楚，先查后端 `server/src/routes/index.js` 和对应模块 `index.js / routes`，不要靠猜。

## 6. 后端架构边界

后端固定采用 Modular Monolith + Layered Architecture。

后端详细规范见：

```text
docs/ARCHITECTURE.md
```

后端固定 24 个模块：

```text
admin
analytics
auth
cart
dataRetention
health
home
logistics
loyalty
marketing
media
monitoring
myinvois
order
payment
privacy
product
pwa
search
seo
siteCapabilities
telegram
theme
user
```

每个模块必须保留：

```text
routes/
controller/
service/
repository/
```

后端新增或修改业务功能前，必须先输出 Architecture Decision。完成后必须输出 Architecture Compliance Report。

## 7. 前后端职责边界

前端负责：

- 页面展示。
- 交互状态。
- 表单基础校验。
- 请求后端 API。
- 加载、错误、空状态、移动端适配。
- 用户体验和视觉表现。

后端负责：

- 登录认证和权限。
- 业务规则。
- 数据库读写。
- 订单、支付、库存、优惠券、积分、售后状态。
- 后台敏感操作保护。
- 数据一致性和审计日志。
- 第三方服务调用。

禁止把核心业务规则放到前端。前端可以显示后端结果，但不能替代后端做最终判断。

## 8. 构建产物

前端构建命令：

```bash
npm run build
npm run build:admin
```

用户端产物：

```text
click-send-shop-main/click-send-shop-main/dist
```

管理后台产物：

```text
click-send-shop-main/click-send-shop-main/admin-dist
```

后端生产环境通过以下配置读取前端产物：

```text
FRONTEND_DIST
ADMIN_DIST
SERVE_SPA
SERVE_ADMIN_SPA
```

如果没有显式配置，后端会使用项目内默认 `dist` 和 `admin-dist` 路径。

## 9. 部署架构

部署相关目录：

```text
deploy/
scripts/
ecosystem.config.cjs
server/ecosystem.config.cjs
docker-compose.yml
```

典型生产链路：

```text
浏览器
  -> CDN / Nginx
  -> 前端静态资源 或 Node SPA fallback
  -> /api 转发到 Node 后端
  -> MySQL / Redis / 对象存储 / 第三方服务
```

CI 成功后才允许自动部署。部署脚本、Nginx 配置、Cloudflare 缓存规则、PM2/systemd 配置属于运维层，不属于业务模块。

## 10. 缓存策略

生产缓存原则：

- HTML 入口必须短缓存或不缓存，避免发版后加载旧 chunk。
- 带 hash 的 `assets` 可以长缓存。
- API 响应不能当静态资源长缓存。
- `sw.js` 和 PWA 入口必须谨慎缓存，避免离线版本卡住旧页面。
- 上传资源可以设置较长缓存，但删除和替换时要考虑 URL、CDN、对象存储一致性。

后端当前有专门逻辑处理：

- HTML no-store。
- hashed assets 长缓存。
- `/uploads` 较长缓存。
- SPA fallback。
- 管理后台独立 `admin-dist` 或集成前端产物。

如果出现前端白屏、chunk 加载失败、路由异常，不能只改前端代码；必须同时检查构建产物、HTML 缓存头、assets 缓存、CDN、部署脚本和运行时恢复逻辑。

## 11. 安全与权限

安全原则：

- 后台 API 必须走认证和权限校验。
- 敏感后台操作必须考虑 MFA、CSRF、审计和限流。
- 登录、上传、支付回调、订单状态变更、数据导出、备份恢复都属于高风险入口。
- 前端不能信任用户输入。
- 后端不能信任前端传来的权限状态、价格、库存、支付状态。
- 支付回调必须使用后端校验，不能由前端确认付款成功。

## 12. CI 与质量门禁

CI 文件：

```text
.github/workflows/ci.yml
```

前端 CI 包含：

```bash
npm run lint
npm run check:mojibake
npm run check:admin-i18n
npm run check:api-paths
npm run typecheck
npm run typecheck:strict-api
npm run typecheck:strict-admin
npm run build:admin
npm run build
npm run test
```

后端 CI 包含：

```bash
npm run arch:check
npm run check:migrations
npm run check:report-registry
npm run typecheck
npm run test:unit
npm run test:reports
npm run test:report-contract
npm run test:report-export
```

架构检查失败、类型检查失败、构建失败、关键测试失败，都不能视为完成。

## 13. 新增和修复的测试要求

新增功能或修复功能时，必须按影响范围选择验证方式。

高风险业务必须跑对应测试，或者明确说明为什么当前环境无法验证：

- 订单：订单创建、取消、支付状态、发货、收货、售后、超时任务。
- 支付：支付渠道、支付意图、支付回调、退款、对账。
- 库存：商品库存、SKU 库存、库存扣减、库存恢复、库存同步。
- 优惠券：领券、用券、退券、活动券、人群券。
- 积分和会员：积分发放、积分抵扣、积分过期、会员等级、奖励结算。
- 用户和权限：登录、注册、后台权限、MFA、CSRF、敏感操作。
- 报表和导出：金额、数量、时间范围、CSV 导出、统计口径。
- 上传和媒体：图片上传、视频转码、对象存储、公开访问 URL。

推荐验证入口：

```bash
cd server && npm run arch:check
cd click-send-shop-main/click-send-shop-main && npm run check:api-paths
```

如果改动只是文档、检查脚本或 CI 配置，可以不跑完整业务测试，但必须说明没有改业务行为。

## 14. 固定审查清单

每次大功能、新模块倾向改动、跨层问题、生产问题、部署缓存问题开始前，必须先对照：

```text
AGENTS.md
docs/ARCHITECTURE.md
docs/WEBSITE_ARCHITECTURE.md
```

审查重点：

- 是否属于现有 24 个后端模块。
- 是否会破坏 routes/controller/service/repository 分层。
- 是否会新增或改变 API 路径。
- 是否涉及用户端、管理后台、部署、缓存或 CI。
- 是否涉及订单、支付、库存、优惠券、积分、权限等高风险业务。
- 是否需要运行专项测试，或说明无法验证的原因。

## 15. 禁止事项

禁止：

- 前端直接连数据库。
- 前端写最终价格、库存、支付、订单状态规则。
- 后端随便新增第 25 个模块。
- 后端跨模块 import 对方内部 controller/service/repository/routes。
- controller/service/repository/routes 混写职责。
- 管理后台接口绕开 `/api/admin/*`。
- 业务 API 绕开 `/api`。
- 生产 HTML 长缓存导致旧 chunk 残留。
- 只看页面现象，不查真实代码、配置、路由、构建和部署。
- 为了文档或小问题顺手重构业务代码。

## 16. 修改建议流程

做网站相关任务时，建议顺序：

1. 判断是前端、后端、部署、缓存、CI，还是跨层问题。
2. 如果是后端，先按 `docs/ARCHITECTURE.md` 输出 Architecture Decision。
3. 如果是前端，先判断用户端还是管理后台。
4. 如果是生产问题，同时检查代码、构建产物、缓存、CDN、部署脚本和运行日志。
5. 只改本次任务必须改的文件。
6. 完成后说明验证命令和未验证项。
