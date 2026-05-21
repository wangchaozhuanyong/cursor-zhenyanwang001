# 数据一致性监控系统

## 能力概览

- **规则扫描**：10 条预置规则（库存、支付、退款、积分、缓存、文件、用户统计等）
- **调度**：按 `data_consistency_rules.schedule_cron` 每分钟检查并触发（需 Redis + `MONITORING_SCHEDULER_DISABLED` 未设置）
- **自动修复**：`auto_fix_enabled = 1` 且异常 `evidence.autoFixable` 时，自动创建并排队执行修复任务（仅低风险类型）
- **管理端**：`/admin/monitoring`（总览、异常、修复任务、规则、运行记录）

## 自动修复范围

| repair_type | 说明 |
|-------------|------|
| `sync_product_stock_from_variants` | 以 SKU 汇总同步 `products.stock` |
| `clear_cache_key` | 删除 `cache_meta` 对应键 |
| `recalculate_user_statistics` | 按订单重算 `user_statistics` |

支付、退款、积分等资金类规则 **禁止** 自动修复。

## 运维

1. 执行迁移：`npm run migrate`（含 `102_data_consistency_monitoring`）
2. 确保 Redis 可用，否则调度器不会启动
3. 禁用调度：`MONITORING_SCHEDULER_DISABLED=1`
4. 手动执行单条规则：管理端「监控规则」页或 `POST /api/admin/monitoring/rules/:code/run`

## Cron 格式

5 段标准 cron：`分 时 日 月 周`（例如 `*/30 * * * *`、`0 3 * * *`）。
