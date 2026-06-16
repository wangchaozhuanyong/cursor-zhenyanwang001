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

## 币种规则（一期 MYR 单币种）

当前一期只面向马来西亚市场，标价、支付、退款/售后金额均按 `MYR` 处理，本窗口不启用多币种展示或汇率换算。

- 标价币种：商品价格、活动门槛、优惠券门槛、运费、返现钱包余额与订单金额均以 `MYR` 记录和展示，前端展示符号为 `RM`。
- 支付币种：`payment_channels` 默认种子仅包含 `MY/MYR`；Stripe Checkout 创建会话时使用 `myr`，`payment_orders.currency` 写入 `MYR`。
- 入账校验：Stripe Webhook 会校验 PaymentIntent 的 `currency` 必须为 `myr`，且 `amount` 必须等于订单 `total_amount * 100`。币种或金额不一致时不自动改为已付款，需人工对账。
- 退款/售后币种：售后申请和后台退款金额沿用原订单金额口径，按 `MYR` 记录与展示；退款金额不得通过展示层静默换汇。
- 换汇责任：系统不提供静默换汇、不展示估算外币价，也不承担由发卡行、Stripe 或用户银行卡侧产生的动态货币转换（DCC）/汇率费用；如需对用户披露，应在支付说明或退款政策中明确。

只有在产品确定要跨市场售卖并展示多币种时，才进入多币种方案评审。评审需与 W2 支付侧一起完成，并至少确认：

- 每个市场的标价币种、支付结算币种、退款币种是否一致。
- Stripe 账号与对应支付方式是否支持目标币种、最小支付金额、退款和争议处理。
- 展示层是否只展示本地化币种，还是允许用户切换展示币种；若展示币种不同于支付币种，必须在结账页明确最终扣款币种和可能的汇率/手续费责任。
- 数据模型是否需要为订单、支付单、退款单持久化 `display_currency`、`payment_currency`、`settlement_currency`、汇率来源与锁定时间。

## 手续费 JSON（对账估算）

在管理后台「支付管理 → 渠道配置」中编辑 Stripe 渠道扩展 JSON，例如：

```json
{
  "fee_rate_percent": 2.9,
  "fee_fixed": 1.0
}
```

Webhook 入账时会按 `gross * rate/100 + fixed` 写入 `payment_fees` 表（仅供参考，最终以网关账单为准）。

## FPX / 电子钱包（马来本地支付）

迁移 `050_malaysia_local_payment_channels` 会写入以下 MY/MYR 渠道：

- `fpx`：FPX 网上银行
- `tng_ewallet`：Touch n Go eWallet
- `grabpay`：GrabPay
- `boost`：Boost

默认 `enabled=0`、`environment=sandbox`，避免未配置网关时误上线。运营或管理员需在「支付管理 → 渠道配置」启用，并填写 `config_json.gateway_url_template` 或配置环境变量。

### 创建支付意图

前端结算页现在从 `GET /api/payments/channels?country=MY&currency=MYR` 读取在线渠道；用户选择 FPX / 电子钱包后调用：

```http
POST /api/payments/intents
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_id": "order-id",
  "channel_code": "fpx",
  "idempotency_key": "checkout:fpx:order-id",
  "return_url": "https://your-domain.com/orders/order-id"
}
```

服务端会创建 `payment_orders`，provider 为 `malaysia_local`。如果配置了网关跳转模板，会返回 `redirect_url` 给前端跳转。

### 网关跳转模板

渠道 `config_json` 可配置：

```json
{
  "method": "fpx",
  "fee_rate_percent": 1.0,
  "fee_fixed": 0.5,
  "gateway_url_template": "https://sandbox-gateway.example/pay?payment_order_id={payment_order_id}&order_no={order_no}&amount={amount}&currency={currency}&return_url={return_url}"
}
```

也可用环境变量兜底：

```bash
MALAYSIA_PAYMENT_GATEWAY_URL_TEMPLATE="https://sandbox-gateway.example/pay?payment_order_id={payment_order_id}&amount={amount}&currency={currency}&return_url={return_url}"
```

### Webhook / 回调

统一入口：

```http
POST /api/payments/webhooks/malaysia-local
X-Webhook-Secret: <PAYMENT_MALAYSIA_WEBHOOK_SECRET>
Content-Type: application/json

{
  "event_id": "evt_123",
  "payment_order_id": "payment-order-id",
  "transaction_id": "txn_123",
  "status": "paid",
  "amount": 88.00,
  "currency": "MYR",
  "channel_code": "fpx"
}
```

生产建议使用 `X-Payment-Signature` HMAC-SHA256 签名，签名 payload 为请求 JSON 字符串，密钥为 `PAYMENT_MALAYSIA_WEBHOOK_SECRET`。测试环境也支持 `X-Webhook-Secret`，便于手动联调。

成功回调会：

- 校验密钥/签名、金额、币种、provider。
- 更新 `payment_orders.status = paid`。
- 更新订单为已支付，写入 `payment_channel = channel_code`、`payment_transaction_no`。
- 写入 `payment_events`、`payment_fees`，供后台事件追踪与对账。

失败回调会：

- 更新对应 `payment_orders.status = failed`。
- 订单保持 pending，用户可重新选择渠道支付。

### 验收建议

1. 后台启用 `fpx` 或某个电子钱包渠道，配置 sandbox 网关模板与 `PAYMENT_MALAYSIA_WEBHOOK_SECRET`。
2. 前端结算页选择该渠道并提交订单，确认 `POST /api/payments/intents` 返回支付单与跳转地址。
3. 模拟成功 webhook，确认订单状态变为 paid，`payment_orders`、`payment_events`、`payment_fees` 均有记录。
4. 模拟失败 webhook，确认支付单 failed，订单仍可再次发起支付。
5. 再跑一次 Stripe Checkout，确认现有卡支付不受影响。

## Billplz / FPX（真实 provider）

当前重构已新增 Billplz provider，保留 Stripe。马来西亚站前台是否展示 Billplz / FPX 由站点能力开关和渠道配置共同决定：

- `billplzEnabled=false` 时，前台隐藏 Billplz / FPX 渠道。
- `billplzEnabled=true` 且渠道启用时，`POST /api/payments/intents` 可创建 Billplz bill。
- 前台在线支付渠道会优先选择 Billplz / FPX；Stripe 保留为备用，待支付订单继续支付也复用同一排序规则。
- Stripe 不删除，作为兼容或备用渠道。

### 环境变量

生产或 sandbox 需配置：

```env
BILLPLZ_API_KEY=...
BILLPLZ_COLLECTION_ID=...
BILLPLZ_X_SIGNATURE_KEY=...
BILLPLZ_API_BASE_URL=https://www.billplz.com/api/v3
BILLPLZ_CALLBACK_URL=https://damatong.net/api/payments/webhooks/billplz
BILLPLZ_REDIRECT_URL=https://damatong.net/payment/result
```

不要把 API key 写进代码或前端构建变量。`.env.example` 只能放占位值。

### 回调校验

Billplz webhook 必须校验：

- `X Signature`。
- provider event id / bill id 幂等。
- 订单号或 payment order 归属。
- 金额，Billplz cents 需换算为 MYR。
- 币种必须为 `MYR`。
- 已处理事件重复到达时不能重复改订单、加销量、发积分或通知。

### 支付结果页

Billplz redirect 只能把用户带回 `/payment/result`。页面外壳可公开访问，避免三方支付回跳先被登录页拦截；页面必须重新请求后端订单/支付状态，未登录或无权访问订单时显示登录/刷新失败，不信任 redirect URL 上的 paid/status 参数。

### 后台对账

后台支付页应核对：

- `payment_events` 事件日志。
- provider 原始事件 id。
- 金额差异和失败原因。
- `payment_reconciliations` 的 provider report amount、渠道手续费、差异说明和人工复核状态。

### 本地专项验证

本地修改支付或库存联动时，至少运行：

```bash
cd server
node -r tsx/cjs --test test/billplz-provider.test.js test/billplz-webhook-security.test.js test/payment-reconciliation-review.test.js test/inventory-lock-v2.test.js

cd ../click-send-shop-main/click-send-shop-main
npx vitest run src/utils/checkoutPaymentMethod.test.ts src/components/PaymentMethodPicker.test.tsx
npm run verify
```

这些命令只证明本地逻辑和构建通过；真实 Billplz sandbox、生产回调和银行对账仍需独立验证。
