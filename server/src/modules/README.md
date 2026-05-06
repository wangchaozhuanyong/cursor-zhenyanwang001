# `server/src/modules` — 模块化单体（7 个业务域）

所有 HTTP 接口由 `routes/index.js` 挂载到 **`/api`** 前缀之下（`app.js`：`app.use('/api', routes)`）。
管理端统一在 **`/api/admin/*`**；健康检查统一在 **`/api/health/live`**、**`/api/health/ready`**。

## 业务模块一览

| 模块 | 路径前缀（相对 `/api`） | 说明 |
|------|-------------------------|------|
| **health** | `/health/*` | 存活 `/health/live`、就绪 `/health/ready` |
| **auth** | `/auth/*` | 注册、登录、刷新令牌、登出 |
| **user** | `/user`、`/favorites`、`/history`、`/addresses`、`/shipping`、`/notifications`、`/coupons`、`/points`、`/rewards`、`/invite`、`/upload` | 会员侧资料、扩展能力 |
| **product** | `/banners`、`/products`、`/categories`、`/reviews`、`/content` | 商品与前台内容 |
| **cart** | `/cart` | 购物车 |
| **order** | `/orders`、`/payment`、`/returns` | 订单、支付、售后 |
| **admin** | `/admin/*` | 后台管理（按子域拆 controller + service + repository + RBAC） |

## 单模块内分层（强约束）

```
modules/<domain>/
├── *.routes.js            # 仅声明路由 + 中间件 + 校验 schema；不写业务规则
├── controller/            # 仅取参 / 调用 service / 写响应；不写业务规则与 SQL
│   └── *.controller.js
├── *.service.js           # 业务规则与事务编排；不直接拼 SQL
├── *.repository.js        # 仅数据访问；不做业务判断
├── schemas/               # Zod 入参/查询/参数校验（按需）
│   └── *.schemas.ts
└── index.js               # 把本模块路由挂到对应 /api/<前缀>
```

## 横切基础设施

- **统一错误体系**：`server/src/errors/` 提供 `AppError / ValidationError / AuthError /
  ForbiddenError / NotFoundError / ConflictError / RateLimitError / ServiceUnavailableError`，
  并保留 `BusinessError` 别名（向后兼容）。
- **统一错误处理**：`server/src/middleware/errorHandler.js` 统一识别上述错误 + ZodError + Multer 错误，
  返回稳定的 `{ code, message, data, traceId }`。
- **统一参数校验**：`server/src/middleware/validate.ts`（TS）支持 `body / query / params` 三段，
  失败抛 `ValidationError`，由 errorHandler 输出 400。
- **统一鉴权**：`server/src/middleware/auth.js`（用户）与 `adminAuth.js`（管理员 + RBAC `requirePermission`）。
- **统一响应**：`server/src/middleware/response.js`（注入 `res.success / res.fail / res.paginate / req.traceId`）。

## 渐进 TypeScript

- 已加 `tsconfig.json` + `tsx` 加载器；启动脚本走 `node -r tsx/cjs ...`，新文件可直接写 `.ts`。
- `npm run typecheck` 跑 `tsc --noEmit`。

## admin 子域文件结构

```
modules/admin/
├── admin.routes.js                      # 路由聚合
├── controller/                          # 19 个按域拆分的薄 controller
│   ├── adminAuth.controller.js
│   ├── adminDashboard.controller.js
│   ├── adminProduct.controller.js
│   ├── adminOrder.controller.js
│   ├── adminUser.controller.js
│   ├── adminCategory.controller.js
│   ├── adminCoupon.controller.js
│   ├── adminReturn.controller.js
│   ├── adminReview.controller.js
│   ├── adminBanner.controller.js
│   ├── adminNotification.controller.js
│   ├── adminInvite.controller.js
│   ├── adminLog.controller.js
│   ├── adminRbac.controller.js
│   ├── adminShipping.controller.js
│   ├── adminReport.controller.js
│   ├── adminSettings.controller.js
│   ├── adminExport.controller.js
│   └── adminRecycleBin.controller.js
├── adminAuth.service.js / adminAuth.repository.js（不存在）
├── ...                                   # 与 controller 一一对应的 service + repository
└── index.js
```

## 依赖方向（防止回潮）

```
routes  ──>  controller  ──>  service  ──>  repository  ──>  config/db
                ▲                                  │
                └─ middleware (auth / validate / errorHandler)
```

- controller 不能 require `repository` 或 `config/db`。
- service 不能 require `config/db`（仅事务编排可使用 `db.getConnection()`）。
- repository 不做业务条件分支，仅 SQL + 行映射。
