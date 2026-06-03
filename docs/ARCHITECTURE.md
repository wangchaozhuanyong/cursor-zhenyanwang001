# Backend Application Architecture Specification

本项目后端不是自由结构项目。后端固定采用 Modular Monolith + Layered Architecture，也就是“模块化单体 + 分层设计”。

这份文件是后端架构执行规范。以后新增功能、修复 bug、重构旧代码、调整接口、接入第三方能力，都必须先按本文判断模块归属和层级归属。

## 1. 架构结论

- 后端是一个 Node.js 单体服务，不拆微服务。
- 所有业务能力按模块归属收敛在 `server/src/modules`。
- 所有业务 API 必须统一挂在 `/api` 下。
- 管理后台 API 必须统一使用 `/api/admin/*`。
- 健康检查 API 固定为 `/api/health/live` 和 `/api/health/ready`。
- 当前后端模块固定为 24 个。
- 每个模块必须保留 `routes / controller / service / repository` 四层目录。
- 新增模块必须先人工确认，不允许自己新建第 25 个模块。

## 2. 当前固定 24 个模块

真实模块清单以 `server/scripts/architecture-rules.js` 和 `server/src/modules` 为准。

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

模块大致职责：

- `admin`：管理后台、后台账号、后台权限、后台运营配置、后台报表入口。
- `analytics`：前后端埋点、访问统计、行为数据。
- `auth`：登录、注册、刷新令牌、OAuth、OTP 等认证能力。
- `cart`：购物车。
- `dataRetention`：数据保留策略、清理预览、清理执行记录。
- `health`：存活检查和就绪检查。
- `home`：首页聚合数据。
- `logistics`：物流轨迹、发货跟踪能力。
- `loyalty`：积分、会员等级、积分规则、积分过期等忠诚度能力。
- `marketing`：营销活动、优惠券中心、新人礼包等营销能力。
- `media`：媒体处理、视频转码等媒体能力。
- `monitoring`：系统监控、数据一致性检测、修复任务。
- `myinvois`：马来西亚电子发票相关能力。
- `order`：订单、售后、订单状态流转、订单超时任务。
- `payment`：支付渠道、支付意图、支付回调。
- `privacy`：隐私同意、隐私数据相关接口。
- `product`：商品、分类、Banner、评价、内容页公开读取。
- `pwa`：PWA manifest 和图标能力。
- `search`：搜索热词、搜索建议、搜索行为记录。
- `seo`：robots、sitemap 等 SEO API。
- `siteCapabilities`：站点功能开关能力。
- `telegram`：Telegram 通知发送、通知配置读取和发送记录。
- `theme`：主题皮肤读取。
- `user`：用户中心、地址、收藏、浏览记录、用户通知、用户优惠券、上传。

## 3. 标准模块结构

每个模块必须具备：

```text
server/src/modules/<module>/
  index.js
  routes/
  controller/
  service/
  repository/
```

可选目录：

```text
schemas/
jobs/
rules/
adapters/
providers/
report/
```

可选目录只能放辅助能力。新增请求处理、业务判断和数据库访问仍然必须回到标准四层。

## 4. 分层职责

### routes

只负责路由绑定和中间件挂载。

允许：

- `router.get/post/put/patch/delete(...)`
- 挂载鉴权、权限、上传、限流、校验等中间件
- 调用本模块 controller

禁止：

- 写业务判断
- 拼复杂返回数据
- 直接访问数据库
- 直接调用 repository
- 直接调用其他模块内部实现

### controller

只负责 HTTP 入参和返回结果。

允许：

- 读取 `req.params / req.query / req.body / req.user`
- 调用本模块 service
- 使用统一响应方式返回结果

禁止：

- 写 SQL
- 直接访问数据库
- 直接调用 repository
- 写复杂业务规则
- 直接调用其他模块 controller/service/repository/routes

### service

只负责业务逻辑、状态流转和流程编排。

允许：

- 做业务判断
- 调用本模块 repository
- 处理事务流程
- 调用其他模块公开暴露的稳定能力

禁止：

- 直接写 SQL
- 直接 `db.query / pool.query / conn.query / conn.execute`
- 直接 import 其他模块的 repository/controller/routes
- 把 HTTP 响应细节写进 service

### repository

只负责数据库读写。

允许：

- SQL 查询
- SQL 更新
- 事务内数据库操作

禁止：

- 写业务判断
- 判断用户权限
- 决定订单、支付、售后、积分等业务状态
- 调用 controller/routes
- 拼 HTTP 返回结构

## 5. API 路径规范

业务 API 必须统一挂在 `/api` 下。

固定路径：

```text
/api/admin/*
/api/health/live
/api/health/ready
```

允许存在的非业务 API 路径：

```text
/robots.txt
/sitemap.xml
/manifest.webmanifest
/pwa-*.png
/apple-touch-icon.png
/uploads/*
/assets/*
/product/:id
/content/:slug
其他前端 SPA、静态资源、SEO 预渲染页面路径
```

这些不是业务 API，不算违反 `/api` 规则。

## 6. 跨模块规则

默认禁止跨模块直接 import 对方内部实现。

禁止示例：

```text
order/service -> product/repository
admin/controller -> order/service
payment/repository -> user/repository
```

允许方式：

```text
order/service -> require('../user').api
payment/service -> require('../admin').api
```

前提是目标模块在 `index.js` 明确暴露公开能力，并且调用方仍在自己的 service 层做编排。

如果无法判断归属模块，必须停止。
如果需要新的跨模块流程，必须先说明风险、影响范围和回滚方案。
如果现有 24 个模块放不下，必须先人工确认，不允许直接新增模块。

## 7. 架构执行流程

每个后端任务开始前必须先输出：

```text
Architecture Decision:
1. Target module:
2. Why this module:
3. Target layer:
4. Why this layer:
5. Files allowed to edit:
6. Files forbidden to edit:
7. API paths affected:
8. Database access location:
9. Cross-module dependency risk:
10. Business behavior impact:
```

每个任务完成后必须输出：

```text
Architecture Compliance Report:
1. Target module followed:
2. Layer boundary followed:
3. Files changed within allowed scope:
4. API path rule followed:
5. Database access rule followed:
6. Cross-module rule followed:
7. Business behavior unchanged:
8. arch:check result:
9. Remaining architecture risks:
```

## 8. 架构检查命令

在 `server` 目录运行：

```bash
npm run arch:check
```

该命令必须检查：

- 固定模块清单是否仍为 24 个。
- 每个模块是否保留四层目录。
- routes/controller/service 是否越层访问数据库或 repository。
- 模块之间是否直接 import 对方内部层级。

`arch:check` 是架构门禁，不允许修改业务行为。

## 9. 允许例外

以下位置不按业务模块四层处理：

- `server/src/app.js`：应用中间件、全局路由挂载、静态资源挂载。
- `server/src/index.js`：服务启动、启动任务、调度器启动。
- `server/src/config`：配置。
- `server/src/middleware`：通用中间件。
- `server/src/errors`：通用错误类型。
- `server/src/utils`：无业务归属的通用工具。
- `server/scripts`：检查、迁移、备份、恢复、初始化脚本。
- `server/migrations`：数据库迁移。
- `deploy` 和根目录部署脚本：部署、回滚、运维脚本。

如果工具函数开始承载商品、订单、支付、库存、优惠券、用户、权限等业务规则，必须迁回对应模块的 service。

## 10. 相关文件

- `AGENTS.md`：Codex 执行规则和模板。
- `docs/ARCHITECTURE_LOCK.md`：后端架构锁定说明。
- `docs/MODULAR_ARCHITECTURE.md`：模块化单体迁移说明。
- `server/src/modules/README.md`：模块目录说明。
- `server/scripts/architecture-rules.js`：真实模块清单和架构检查入口配置。
- `server/scripts/check-architecture.js`：架构检查聚合脚本。
