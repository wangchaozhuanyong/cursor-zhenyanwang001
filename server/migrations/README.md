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
