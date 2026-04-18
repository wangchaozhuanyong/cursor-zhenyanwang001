# 模块化架构（阶段 1：模块化单体）

本文档描述「单进程、单数据库、对外统一 `/api`」下的模块边界、迁移顺序与协作规则。  
**不**默认要求微服务拆分；若未来要拆服务，以本文档中的领域边界为拆分依据。

---

## 1. 当前与目标

| 项目 | 当前 | 阶段 1 目标 |
|------|------|-------------|
| 部署 | 单 Node 进程 + MySQL | 不变 |
| 对外接口 | `HTTP /api/*` | 不变 |
| 服务端内部 | 路由分文件，Service/Repository 部分存在，仍有粗控制器 | **按领域收敛**：跨域只通过 **Service 对外 API**，禁止跨域直连对方 Repository |
| 前端 | SPA 调 `/api` | 不变 |

---

## 2. 建议目录（`server/src`，渐进迁移）

新代码优先落在 `modules/<domain>/`；旧文件可逐步迁入，不必一次性大改。

```
server/src/
  app.js
  index.js
  config/
  middleware/
  shared/                 # 无业务语义的通用工具（errors、与业务无关的 helpers）
  modules/
    auth/
    catalog/              # 商品、分类、Banner 等
    cart/
    order/                # 订单、支付、下单事务
    marketing/              # 优惠券、可与订单协作
    fulfillment/          # 地址、运费模板（或并入 order，按团队习惯）
    admin/                  # 管理端，可再分子目录
    notification/
    returns/
    content/
```

---

## 3. 领域划分与数据归属（参考）

| 领域 | 职责 | 典型表 / 资源 |
|------|------|----------------|
| auth | 注册、登录、JWT、用户资料（基础） | users（相关字段） |
| catalog | 商品、分类、首页 Banner、列表/详情 | products, categories, banners |
| cart | 购物车 | cart_items |
| order | 下单、订单查询、支付、订单事务 | orders, order_items |
| marketing | 优惠券模板与用户券、与下单协作 | coupons, user_coupons |
| fulfillment | 收货地址、运费模板、运费计算 | addresses, shipping_templates 等 |
| admin | 后台 CRUD、统计 | 多表 |
| notification | 通知 | notifications |
| returns | 售后 | return_requests 等 |
| content | 静态页内容 | content_pages |

**下单事务**（库存 + 券 + 订单）仍应在**同一数据库事务**内完成；代码上由 **order** 领域编排，调用 **marketing** 暴露的「在事务内占用/核销券」类方法，避免在 marketing 内直接写 orders 表。

---

## 4. 迁移顺序（低风险 → 高风险）

1. **auth / user 基础能力** — 依赖少，易验证。  
2. **catalog**（商品、分类、Banner）— 读多、事务少。  
3. **cart**  
4. **marketing（优惠券）** — 先稳定「事务内券」接口，再被 order 调用。  
5. **order**（大事务、与库存/券耦合）— 分段迁移，**必须**跑通 `npm run test:flow` 与手工下单。  
6. **admin** — 按子域从 `adminController` 等大块中拆出。

每完成一块：跑现有自动化测试 + 对该域 API 做冒烟。

---

## 5. 边界规则（必须遵守）

- **允许**：`order.service` → `marketing.service.applyCouponInTransaction(conn, …)`  
- **禁止**：`order` 内 `require` marketing 的 **repository** 并直接写券表（除非团队明确约定仅 repository 层可复用，且仍通过单一入口）。  
- **禁止**：在 **controller** 内直接 `db.query` 复杂业务 SQL（逐步收到 service/repository）。  
- **共享事务**：需要与订单同事务时，由 **order** `beginTransaction` 后把 **`conn`** 传入下游函数（与现有 `orderRepository` 传 `conn` 模式一致）。

---

## 6. 前端说明

会员端与管理端已通过 **`/api` HTTP** 与后端通信，**无需**为「模块化单体」单独改通信方式；若后续拆 BFF 或多端网关，再单独立项。

---

## 7. 与微服务的关系

若未来要拆独立服务：优先拆 **通知、报表、弱耦合** 能力；**订单核心**最后拆，并需解决分布式事务或最终一致（消息队列、补偿）。  
本文档阶段 1 **不**要求实施微服务。

---

## 8. 修订记录

- 初版：阶段 1 模块化单体说明 + 迁移顺序 + 边界规则。
