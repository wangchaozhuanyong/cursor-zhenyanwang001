# 订单中心验收执行记录（逐条）

日期：2026-05-17
版本：订单中心重构（tab + summary + 买家状态文案）
执行人：
环境：

## 执行说明

- 记录结果：`PASS / FAIL / BLOCKED`
- 每条建议补充：截图编号、复现步骤、备注

---

## A. 我的页面入口

1. 我的页面固定显示：待付款 / 待发货 / 待收货 / 待评价 / 退款售后  
结果：  
截图：  
备注：

2. 数量为 0 时入口不消失，仅不显示角标  
结果：  
截图：  
备注：

---

## B. 我的订单 Tab 固定显示

3. 顶部固定显示：全部 / 待付款 / 待发货 / 待收货 / 待评价 / 已完成 / 退款售后 / 已取消  
结果：  
截图：  
备注：

4. 任一 Tab 无订单时显示空状态，不隐藏 Tab  
结果：  
截图：  
备注：

---

## C. URL 与筛选映射

5. `/orders?tab=pending_payment` 进入待付款  
结果：  
截图：  
备注：

6. `/orders?tab=paid` 进入待发货  
结果：  
截图：  
备注：

7. `/orders?tab=shipped` 进入待收货  
结果：  
截图：  
备注：

8. `/orders?tab=pending_review` 进入待评价  
结果：  
截图：  
备注：

9. `/orders?tab=after_sale` 进入退款售后  
结果：  
截图：  
备注：

兼容性补测（旧参数）：
- `/orders?status=pending` -> `pending_payment`
- `/orders?status=paid` -> `paid`
- `/orders?status=shipped` -> `shipped`
- `/orders?status=completed` -> `completed`
- `/orders?status=cancelled` -> `cancelled`
结果：
截图：
备注：

---

## D. 订单卡片状态文案

10. 卡片显示中文业务文案：
- 已付款，等待商家发货
- 已发货，等待收货
- 待评价
- 已完成
结果：  
截图：  
备注：

---

## E. 后端接口可用性

11. `/orders/summary` 可访问且不被 `/:id` 吞掉  
结果：  
请求样例：  
响应片段：  
备注：

---

## F. 兼容性与回归

12. 不影响现有能力：订单详情、取消订单、确认收货、评价弹窗、售后接口  
结果：  
截图：  
备注：

13. 待评价入口链路完整：Profile -> Orders Tab -> OrderDetail/评价弹窗 -> /reviews/pending  
结果：  
截图：  
备注：

---

## 建议最小联调顺序

1. 先验入口与 Tab 固定显示（A/B）
2. 再验 URL 与筛选（C）
3. 再验文案与动作（D/F）
4. 最后验 summary 接口与路由顺序（E）

