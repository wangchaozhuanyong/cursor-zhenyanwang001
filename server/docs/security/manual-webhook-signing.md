# Manual Webhook 签名规范（服务端）

适用接口：`POST /api/payments/webhooks/manual`

## 必填字段

- `event_id`: 事件唯一 ID（幂等键）
- `order_id`: 订单 ID
- `timestamp`（或 `ts`）: Unix 秒/毫秒时间戳
- `nonce`: 随机字符串（建议 >= 16）
- `signature`: HMAC-SHA256 签名（hex）

## 签名算法

1. 对请求 body 做稳定序列化（对象 key 按字典序排序）。
2. 生成签名串：
   - `${timestamp}.${nonce}.${stableStringify(body_without_signature)}`
3. 使用 `PAYMENT_MANUAL_WEBHOOK_SECRET` 计算 HMAC-SHA256，输出 hex 小写。

> 注意：签名计算时需排除 `signature` 字段本身。

## 校验规则

- 时间窗：默认 ±300 秒（可通过 `PAYMENT_MANUAL_WEBHOOK_MAX_SKEW_SECONDS` 配置）
- 签名：必须匹配
- 幂等：`provider=manual + provider_event_id=event_id` 已存在则直接忽略重复回调

## Node 示例（发送端）

```js
const crypto = require('crypto');

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function sign(body, secret) {
  const timestamp = String(body.timestamp || body.ts);
  const nonce = String(body.nonce);
  const clone = { ...body };
  delete clone.signature;
  const payload = `${timestamp}.${nonce}.${stableStringify(clone)}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
```

