# 订单中心接口联调清单（curl / Postman）

日期：2026-05-17

## 0. 变量

```bash
BASE_URL="http://localhost:3000"
TOKEN="替换为用户 access token"
ORDER_ID="替换为订单ID"
```

通用请求头：
```bash
-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
```

---

## 1. 订单汇总 summary

```bash
curl -X GET "$BASE_URL/orders/summary" \
  -H "Authorization: Bearer $TOKEN"
```

预期：返回字段包含
- `total`
- `pending_payment`
- `paid`
- `pending_ship`
- `shipped`
- `pending_receive`
- `pending_review`
- `completed`
- `after_sale`
- `cancelled`

---

## 2. 订单列表 tab 筛选（新）

### 2.1 全部
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=all" \
  --data-urlencode "page=1" \
  --data-urlencode "pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.2 待付款
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=pending_payment" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.3 待发货
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=paid" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.4 待收货
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=shipped" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.5 待评价
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=pending_review" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.6 已完成
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=completed" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.7 退款/售后
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=after_sale" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.8 已取消
```bash
curl -G "$BASE_URL/orders" \
  --data-urlencode "tab=cancelled" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. 订单列表 status 兼容（旧）

```bash
curl -G "$BASE_URL/orders" --data-urlencode "status=pending" -H "Authorization: Bearer $TOKEN"
curl -G "$BASE_URL/orders" --data-urlencode "status=paid" -H "Authorization: Bearer $TOKEN"
curl -G "$BASE_URL/orders" --data-urlencode "status=shipped" -H "Authorization: Bearer $TOKEN"
curl -G "$BASE_URL/orders" --data-urlencode "status=completed" -H "Authorization: Bearer $TOKEN"
curl -G "$BASE_URL/orders" --data-urlencode "status=cancelled" -H "Authorization: Bearer $TOKEN"
```

---

## 4. 订单详情

```bash
curl -X GET "$BASE_URL/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

预期：`items[]` 包含
- `order_item_id`
- `review_id`
- `review_status`
- `can_review`

---

## 5. 取消订单（pending）

```bash
curl -X POST "$BASE_URL/orders/$ORDER_ID/cancel" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. 确认收货（shipped）

```bash
curl -X POST "$BASE_URL/orders/$ORDER_ID/confirm" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. 待评价商品列表

```bash
curl -X GET "$BASE_URL/reviews/pending-items" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8. 商品评价资格

```bash
PRODUCT_ID="替换为商品ID"

curl -X GET "$BASE_URL/reviews/product/$PRODUCT_ID/eligibility"

curl -X GET "$BASE_URL/reviews/product/$PRODUCT_ID/eligibility" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. 提交评价（主路径 order_item_id）

```bash
ORDER_ITEM_ID="替换为order_item_id"

curl -X POST "$BASE_URL/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_item_id": "'"$ORDER_ITEM_ID"'",
    "rating": 5,
    "content": "联调评价：非常好",
    "images": []
  }'
```

---

## 10. Postman 建议分组

- `Orders`:
  - `GET /orders/summary`
  - `GET /orders?tab=*`
  - `GET /orders?status=*`
  - `GET /orders/:id`
  - `POST /orders/:id/cancel`
  - `POST /orders/:id/confirm`
- `Reviews`:
  - `GET /reviews/pending-items`
  - `GET /reviews/product/:productId/eligibility`
  - `POST /reviews`

环境变量建议：
- `base_url`
- `token`
- `order_id`
- `order_item_id`
- `product_id`

