# 评价系统联调与回归脚本

更新时间：2026-05-17
适用范围：订单商品评价（order_item_id 主路径）

## 0. 测试准备

- 环境：前端 + 后端同一套联调环境
- 准备 4 类测试账号：
  1. A：未登录（访客）
  2. B：已登录未购买目标商品
  3. C：已登录已下单但订单非 completed（pending/paid/shipped）
  4. D：已登录有 completed 且未评价订单商品
- 准备至少 1 个目标商品 `P1`，并确保 D 至少有 1 条 `order_items.id=OI1` 可评价

---

## 1. 访客商品详情页（验收标准 1）

步骤：
1. 退出登录。
2. 打开商品 `P1` 详情页。
3. 查看评价区按钮文案。
4. 点击按钮。

预期：
- 可浏览评价列表。
- 按钮显示“登录后评价”。
- 点击后跳转登录页。

---

## 2. 已登录但未购买（验收标准 2）

步骤：
1. 用账号 B 登录。
2. 打开商品 `P1` 详情页。
3. 点击评价入口。

预期：
- 不出现可直接提交的评价表单。
- 提示“购买并确认收货后可评价”。
- 不创建新评价记录。

---

## 3. 已购买但未完成（验收标准 3）

步骤：
1. 用账号 C 登录。
2. 进入“我的订单”与订单详情。
3. 查看对应商品行评价入口。

预期：
- 不显示可提交评价按钮。
- 显示弱提示“确认收货后可评价”。

---

## 4. completed 且未评价（验收标准 4）

步骤：
1. 用账号 D 登录。
2. 打开“我的订单”。
3. 查看 completed 订单卡片。
4. 点“去评价”进入订单详情。
5. 在商品行点击“评价”。
6. 或进入“待评价”页 `/reviews/pending` 后点击“写评价”。

预期：
- 订单列表显示“有 X 件商品待评价”。
- 订单详情商品旁显示“评价”。
- 待评价页展示对应商品。
- 评价弹窗可正常提交。

---

## 5. 提交后数据与去重（验收标准 5）

步骤：
1. 使用 `OI1` 提交评价（评分/文字/图片任选）。
2. 重复对 `OI1` 再次提交。
3. 查询 DB：`product_reviews`。

建议 SQL：
```sql
SELECT id, product_id, order_id, order_item_id, variant_id, sku_text, is_verified_purchase, status
FROM product_reviews
WHERE order_item_id = 'OI1';
```

预期：
- 首次提交成功。
- `product_reviews` 记录包含 `order_id/order_item_id/variant_id/sku_text`。
- `is_verified_purchase = 1`。
- 同一 `order_item_id` 二次提交失败（不可重复）。
- 订单详情状态变为“评价待审核/已评价/评价未通过”之一。

---

## 6. 商品详情评价展示与互动（验收标准 6）

步骤：
1. 回到商品 `P1` 详情页评价区。
2. 检查刚提交评价是否展示（受审核状态影响）。
3. 检查“已购评价”标识。
4. 检查商家回复展示。
5. 测试点赞/取消点赞。

预期：
- 评价列表可正常加载。
- 已购评价显示“已购评价”。
- 商家回复正常显示。
- 点赞计数与状态切换正常。

---

## 7. 后台评论管理兼容（验收标准 7）

步骤：
1. 后台进入 `/admin/reviews`。
2. 搜索/定位刚提交评价。
3. 依次测试：通过、拒绝、隐藏/显示、精选、官方回复、差评处理、删除/恢复/彻底删除。

预期：
- 全部能力正常可用。
- 权限控制不回归。
- 审计日志正常。

---

## 8. 新接口联调检查

### 8.1 待评价接口
- `GET /reviews/pending-items`（需登录）
- 预期：仅返回当前用户 completed 且未评价 `order_items`

### 8.2 商品资格接口
- `GET /reviews/product/:productId/eligibility`
- 预期：
  - 未登录：`can_review=false, reason=login_required`
  - 已登录有待评价：`can_review=true, pending_items>0`
  - 已评价过且无待评价：`reason=already_reviewed`
  - 未购买/未完成：`reason=purchase_required`

---

## 9. 重点回归风险清单

- 订单接口字段兼容（旧前端是否仍可读 `product/qty/subtotal`）
- createReview 兼容 `product_id` 分支是否仍可用
- 后台评论管理 SQL 是否受 `order_item_id` 影响
- 点赞逻辑是否仅允许 normal 状态

---

## 10. 建议补充自动化（后续）

- 后端 API 集成测试：
  - `pending-items`、`eligibility`、`createReview(order_item_id)` 去重
- 前端 E2E（Playwright）：
  - 订单详情评价入口 -> 弹窗 -> 提交 -> 状态更新
  - 商品详情资格文案与跳转

