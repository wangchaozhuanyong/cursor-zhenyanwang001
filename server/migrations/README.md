# 数据库迁移说明

- 执行顺序按 **完整迁移名**（文件名去掉 `.up.js` / `.up.sql`）字典序排序，见 `src/db/migrateRunner.js`。
- `schema_migrations.name` 存的是完整名（如 `117_inventory_stock_limits`），**不要**重命名已上线环境的迁移文件。
- 同一数字前缀存在多套功能时（如 `103_admin_mfa` 与 `103_purge_legacy_demo_catalog`），依赖排序先后，新增迁移请使用 **未占用的序号**（建议 126+）。

本地检查重复前缀：

```bash
npm run check:migrations
```

指定执行单条迁移：
```bash
npm run migrate:one -- 153_return_logistics_tracking_scope
```

指定回滚单条迁移（只能回滚当前已应用链路的末端迁移）：
```bash
npm run migrate:down -- 162_order_logistics_snapshot
```

## 交易重构迁移范围

当前订单/活动/支付/库存/物流重构涉及以下兼容迁移：

- `157_order_idempotency_and_restructure_flags`：订单幂等和重构开关。
- `158_marketing_activity_v2_types`：活动 V2 类型、状态和规则字段。
- `159_promotion_usage_limits`：活动/优惠使用次数限制。
- `160_shipping_template_malaysia_rules`：东西马、州、城市、邮编、重量和金额门槛。
- `161_payment_reconciliation_review`：支付事件、失败原因、对账和人工复核字段。
- `162_order_logistics_snapshot`：订单物流状态快照、异常类型、轨迹严重级别。

上线前必须运行：

```bash
npm run check:migrations
npm run migrate:status
```

测试库或 staging 临时库上线演练：

```bash
npm run migration:restructure-drill
```

`migration:restructure-drill` 只读取 `server/.env.test`，没有该文件时会跳过；`DB_NAME` 必须包含 `test`、`ci`、`dev` 或 `staging`，避免误跑生产库。它会对 `157` 至 `162` 执行 `up -> down -> up`，用于验证本轮订单、活动、支付、库存、物流重构迁移的回滚路径。
