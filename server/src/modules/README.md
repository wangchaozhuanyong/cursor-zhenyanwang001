# server/src/modules 架构说明（模块化单体 + 分层）

本项目后端采用模块化单体（Modular Monolith），所有接口统一挂载在 `/api` 前缀下。

## API 约定

- 公共接口：`/api/*`
- 管理后台接口：`/api/admin/*`
- 健康检查：`/api/health/live`、`/api/health/ready`

## 当前模块（以代码现状为准）

- `health`：健康检查
- `auth`：认证与会话
- `user`：用户资料、地址、收藏、积分、优惠券、邀请、主题配置
- `product`：商品、分类、内容、前台展示数据
- `cart`：购物车
- `order`：订单与售后
- `payment`：支付聚合入口、支付事件、支付渠道能力
- `admin`：后台管理聚合（按子域拆分 controller/service/repository）
- `search`：搜索与关键词
- `analytics`：行为与统计事件
- `privacy`：隐私与合规模块
- `seo`：SEO 相关接口
- `logistics`：物流能力
- `myinvois`：电子发票能力
- `notification`：通知能力
- `theme`：主题相关（逐步与 user/theme 能力收敛）

## 模块内分层约束

标准分层：`routes -> controller -> service -> repository`

- `routes`
  - 仅路由绑定、中间件绑定、参数校验绑定
  - 禁止业务逻辑
  - 禁止 SQL

- `controller`
  - 仅处理请求参数、调用 service、返回响应
  - 禁止业务逻辑
  - 禁止 SQL
  - 禁止直接调用 repository

- `service`
  - 仅业务规则、状态流转、事务编排
  - 禁止直接写 SQL（禁止 `pool.query` / `conn.query`）
  - 禁止直接依赖 `config/db`

- `repository`
  - 仅数据库访问（SQL、读写）
  - 禁止业务规则判断
  - 禁止 HTTP 响应结构

## 跨模块依赖原则

- 优先通过模块公开 API（例如 `module/index.js` 导出的 api）交互
- 避免跨模块直接引用内部 repository
- 禁止形成循环依赖
- 若出现跨模块写操作，必须在 service 层显式编排

## 重构原则

- 只做结构重构，不改变业务功能
- 不修改 API 路径
- 不修改数据库字段
- 不改变订单、库存、支付核心逻辑
- 每次改动后执行：
  - `cd server && npm run check:service-layer`
  - `cd server && npm run typecheck`
