# ADR-001：分层职责与 HTTP 表面（架构例外）

## 状态

已采纳

## 背景

业务 API 需可预测的分层（routes / controller / service / repository），同时存在 Stripe Webhook（raw body）、SEO（根路径 sitemap/robots）等与「纯 JSON + `/api`」不完全一致的需求。

## 决策

1. **Service 层禁止手写 SQL**：查询与表细节集中在 repository；定时任务读 `site_settings` 使用 `order/siteSettings.repository.js`。
2. **事务**：允许在 service 通过 `xxxRepo.getConnection()` 编排事务；禁止在 controller / routes 中开事务。
3. **Stripe Webhook**：保留在 `app.js` 中 `express.raw` 前置挂载；验签与 `constructEvent` 放在 `stripeWebhook.service.js`，controller 仅映射 HTTP 状态。
4. **SEO**：保留站点根路径 `/robots.txt`、`/sitemap.xml`（搜索引擎与 CDN 习惯）；同时提供 **`/api/seo/robots.txt`** 与 **`/api/seo/sitemap.xml`** 镜像，与根路径行为一致。

## 后果

- CI 增加 `npm run check:service-layer`：扫描 `src/modules`、`src/utils`、`src/middleware`、`src/routes` 下除 `*.repository.js`、`*controller*`、`*.routes.js`、`*mapper*` 外的所有 `.js`，禁止 `db.query(`、`pool.query(` 与 `require(.../config/db)`；并对 `*service*.js` 额外禁止在 `pool`/`conn`/`db` 上直接 `.query(`。
- 新增站点设置只读查询时，优先扩展现有 repository，避免在 service 写 SQL。
