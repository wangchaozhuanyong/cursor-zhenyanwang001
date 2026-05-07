# 马来西亚支付接入说明（一期接口层）

## 架构概要

- 用户 API：`GET /api/payments/channels`、`POST /api/payments/intents`、`GET /api/payments/intents/:id`
- 管理 API：`/api/admin/payments/*`（需 `payment.manage` 权限）
- 测试用 Webhook：`POST /api/payments/webhooks/manual`（路径在 `/api/payments/...` 下；需环境变量 `PAYMENT_MANUAL_WEBHOOK_SECRET`；请求体 `order_id`，密钥可放 `X-Webhook-Secret` 或 body `secret`）
- Stripe 正式回调仍为：`POST /api/payment/stripe/webhook`（raw body，需在 Stripe Dashboard 配置）

## 数据库

执行迁移（部署或本地）：

```bash
cd server && npm run migrate
```

迁移 `028_payment_management` 会创建：`payment_channels`、`payment_orders`、`payment_events`、`payment_reconciliations`、`payment_fees`，并写入默认 MY/MYR 渠道种子。

## Stripe（卡支付）

1. 配置 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`PUBLIC_APP_URL`
2. 用户下单后仍可通过 `POST /api/orders/:id/stripe-checkout` 跳转 Checkout；服务端会同步写入 `payment_orders`（便于对账）
3. Webhook 成功后会调用支付域 `recordStripeCapture`，写入 `payment_events` / `payment_fees`

## 手续费 JSON（对账估算）

在管理后台「支付管理 → 渠道配置」中编辑 Stripe 渠道扩展 JSON，例如：

```json
{
  "fee_rate_percent": 2.9,
  "fee_fixed": 1.0
}
```

Webhook 入账时会按 `gross * rate/100 + fixed` 写入 `payment_fees` 表（仅供参考，最终以网关账单为准）。

## 二期扩展（FPX / 电子钱包）

在 `payment_channels` 增加新 `code` 与 `provider`，在 `payments.service.js` 的 `createIntent` 分支中接入新 Provider 类即可；前端可改为只依赖 `GET /payments/channels` 动态渲染支付方式。
