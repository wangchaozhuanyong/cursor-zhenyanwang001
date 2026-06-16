# API Contracts Governance

本文档是前后端 API 契约规范。后端模块分层仍以 `docs/ARCHITECTURE.md` 为准。前端请求层仍以 `docs/FRONTEND_ARCHITECTURE.md` 和 `src/api/request.ts` 为准。

## 1. API 路径总规则

所有业务 API 必须统一挂在：

```text
/api
```

管理后台 API 必须统一使用：

```text
/api/admin/*
```

健康检查固定为：

```text
/api/health/live
/api/health/ready
```

非业务 API 或静态入口例外见 `docs/ARCHITECTURE.md` 和 `docs/WEBSITE_ARCHITECTURE.md`，例如 `robots.txt`、`sitemap.xml`、SPA fallback、静态资源和 SEO 预渲染页面。

## 2. 后端挂载位置

后端总 API 挂载由 `server/src/app.js` 使用：

```text
app.use('/api', routes)
```

模块路由聚合位置：

```text
server/src/routes/index.js
```

各业务模块必须通过 `server/src/modules/<module>/index.js` 和模块内 `routes/` 暴露。不得绕开模块架构直接散落业务 API。
跨模块业务协作必须通过 `server/src/modules/<module>/publicApi.js` 暴露稳定 service facade；`index.js` 可继续把同一对象挂到 `router.api` 以兼容旧调用，但新代码不得新增 `require(...).api`。

## 3. 前端请求入口

前端底层请求入口固定为：

```text
click-send-shop-main/click-send-shop-main/src/api/request.ts
```

前端默认 API base：

```text
VITE_API_BASE_URL=/api
```

前端不允许为了方便绕开 request client。特殊场景如 `navigator.sendBeacon` 必须说明为什么不能使用普通 request client，并保证路径仍然符合 `/api` 规则。

## 4. API response 结构

前端当前统一类型位置：

```text
click-send-shop-main/click-send-shop-main/src/types/common.ts
```

当前通用结构：

```ts
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}
```

分页结构：

```ts
export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

禁止随意修改 response envelope、分页字段名、错误字段名。确实要改时，必须列出兼容方案、影响页面、影响服务、测试范围和回滚方式。

## 5. 错误格式规范

API 错误必须能被 `src/api/request.ts` 统一处理。错误响应应提供可理解的 `message` 或等价字段，并尽量带上可追踪信息。

前端不得把后端错误伪装成成功。后端不得为了前端方便返回含糊状态。

## 6. 常见 HTTP 状态处理

- `401`: 未登录、登录过期或 token 无效。用户端走用户登录恢复，后台走 admin session 过期处理。
- `403`: 已登录但无权限，或 CSRF/MFA/敏感操作校验失败。
- `404`: 资源不存在或接口不存在。
- `409`: 状态冲突、重复提交、并发冲突。
- `422`: 请求参数或业务校验不通过。
- `500`: 服务端异常。

前端可以优化提示，但不能改变状态语义。

## 7. 权限必须服务端校验

后台 API 必须在服务端做认证和授权。前端隐藏菜单、隐藏按钮、判断 `isAdmin`、判断权限缓存，都只能作为体验保护，不能作为最终安全依据。

普通用户和未登录用户不能访问 `/api/admin/*`。如果前端能隐藏入口但后端仍允许访问，这是安全问题。

## 8. 管理后台敏感接口

敏感接口包括但不限于：

- 账号和角色权限。
- MFA 和安全设置。
- 商品、库存、订单、支付、退款。
- 优惠券、积分、会员。
- 数据导出、备份、恢复。
- 系统配置、站点能力开关、上传。

这些接口必须考虑：

- 后端鉴权。
- 权限点。
- MFA 或 step-up。
- CSRF。
- rate limit。
- 审计日志。
- 幂等和重复提交。

## 9. 前端只能做体验保护

前端允许：

- 禁用按钮。
- 隐藏入口。
- 显示二次确认。
- 做基础表单校验。
- 展示权限不足提示。
- 展示后端返回的真实状态。

前端禁止：

- 最终判断权限。
- 最终判断价格。
- 最终判断库存。
- 最终确认支付成功。
- 最终确认订单状态。
- 绕开后端校验直接写本地成功。

## 10. API 修改影响范围

任何 API 修改前必须列出：

- API path。
- HTTP method。
- request body。
- query params。
- response data。
- error codes。
- 权限要求。
- 前端调用点。
- 后端模块和分层位置。
- 数据库影响。
- 缓存影响。
- 兼容性风险。

## 11. API 兼容性规则

优先做向后兼容变更：

- 新增可选字段。
- 新增接口。
- 新增错误码但保持旧语义。

高风险变更必须人工确认：

- 删除字段。
- 改字段类型。
- 改分页结构。
- 改 success/error envelope。
- 改权限要求。
- 改路径。
- 改支付、订单、库存、优惠券、积分语义。

## 12. API 测试要求

API 修改必须补测试或说明无法测试原因。

常见验证：

```bash
cd server
npm run arch:check
npm run typecheck
npm run test:unit
```

涉及报表：

```bash
npm run test:reports
npm run test:report-contract
npm run test:report-export
```

涉及前端调用：

```bash
cd click-send-shop-main/click-send-shop-main
npm run check:api-paths
npm run typecheck:strict-api
```

## 13. 交易重构新增契约

以下接口属于订单、定价、活动、支付和物流主链，前端只能展示后端结果，不能自行计算最终金额、优惠资格、库存扣减或支付成功状态。

### 订单幂等

`POST /api/orders` 支持 `idempotency_key`。同一用户、同一 key、同一请求指纹重复提交时必须返回同一订单；同一 key 但请求参数不一致必须返回冲突语义，不允许重复创建订单。

### 结算预览和定价

购物车、结算页、创建订单必须以后端 pricing service 的输出为准。前端展示字段包括但不限于：

- 商品原价、活动价、会员价。
- 优惠明细 `discount_lines`。
- 满减差额和不可用原因。
- 后端订单快照金额。

### 活动中心

活动公共入口：

```text
GET /api/marketing/promotions
GET /api/marketing/promotions/:slug
```

后台活动 V2 需要保留旧活动类型 adapter，不得直接删除旧类型数据。结算和下单必须重新校验活动时间、商品范围、SKU、会员等级、限购、库存和叠加规则。

后台运营入口已按兼容式收敛：

- 主入口：`/admin/marketing`
- 统一活动列表：`/admin/marketing/activities`
- 优惠券模板：`/admin/marketing/coupons`
- 领券活动：`/admin/marketing/coupon-campaigns`
- 积分/返现/邀请继续保留在营销中心下。

旧链接如 `/admin/coupons`、`/admin/settings/points`、`/admin/rewards` 继续做 redirect，不允许直接删除，避免运营收藏链接失效。

### 支付结果页

`/payment/result` 页面外壳允许公开访问，便于 Billplz / FPX / Stripe redirect 回站点；订单详情、支付状态和金额仍必须来自后端受保护接口。URL 参数只能作为跳转上下文，不能作为支付成功依据。未登录或无权访问订单时，前端只能提示登录/刷新失败，不得展示成功态。

### 物流状态

订单详情可能返回：

- `logistics_provider`
- `logistics_timeline`
- `logistics_snapshot`
- `logistics_status`
- `logistics_exception_type`
- `logistics_exception_message`

后台发货会先写入平台发货轨迹，承运商轨迹刷新后再同步订单物流快照。前端应展示异常状态和异常说明，但不能自行改订单履约状态。

## 13. 禁止为了前端方便改变业务规则

禁止因为前端写起来方便而改变：

- 商品价格规则。
- 库存扣减规则。
- 订单状态机。
- 支付状态确认。
- 优惠券核销。
- 积分结算。
- 后台权限。
- 数据导出口径。

如果前端需要更好展示，应优先新增后端明确字段或服务端聚合接口，并说明兼容性，而不是在前端猜规则。

## 14. API Contract Plan

API 任务开始前必须输出：

```text
API Contract Plan:
1. API path:
2. HTTP method:
3. Owning backend module:
4. Request shape impact:
5. Response shape impact:
6. Error shape impact:
7. Permission impact:
8. Frontend callers:
9. Database/cache impact:
10. Compatibility plan:
11. Tests to run:
```

完成后必须输出：

```text
API Contract Report:
1. API path rule followed:
2. Response contract preserved or explained:
3. Frontend request layer respected:
4. Permission rule followed:
5. Compatibility risk:
6. Tests run:
7. Remaining risks:
```
