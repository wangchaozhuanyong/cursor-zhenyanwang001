# `server/src/modules`

按 **`docs/MODULAR_ARCHITECTURE.md`** 将业务代码逐步迁入各 `modules/<domain>/`（`*.routes.js` / `*.service.js` / `*.repository.js` 等）。

- **HTTP 路由**：已按域落在 `modules/<domain>/`；`routes/index.js` 仅聚合挂载，对外 `/api/*` 不变。
- **业务层**：各域 `*.controller.js`、`*.service.js`、`*.repository.js` 均在对应 `modules/<domain>/`（订单域另有 `order.mapper.js`；**catalog**、**cart**、**auth** 收藏/历史已分层；**marketing**（优惠券/积分/奖励/邀请）、**fulfillment**（地址/运费模板读）、**notification** 会员端 API 已分层）。原 `src/controllers`、`services`、`repositories`、`mappers` 空目录已移除。
- **横切**：`middleware/`、`config/`、`errors/`、`utils/` 仍放在 `server/src/` 根下，供各模块引用。
