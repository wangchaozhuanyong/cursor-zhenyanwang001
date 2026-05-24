# 站点功能开关影响矩阵

本文档记录后台「系统设置 → 功能开关」的真实影响范围。原则：前端隐藏只是体验优化，核心能力必须由后端接口或业务逻辑同步拦截。

管理页面路径：`/admin/settings/features`（权限 `settings.manage`）。数据存储在 `site_settings.site_capabilities`（JSON）。

## 开关一览

| 开关 | 默认值 | 页面展示 | 前端入口影响 | 后端接口影响 | 核心业务逻辑影响 | 测试方法 |
|---|---:|---|---|---|---|---|
| `mallEnabled` | true | 全部管理员 | 隐藏分类、搜索、商品详情、购物车、结算等前台商城入口 | 拦截商品列表/详情、购物车、订单预览、订单创建 | 禁止继续浏览商品、加购和下单；历史订单查询不受影响 | 关闭后请求 `/api/products`、`/api/cart`、`/api/orders/preview` 应返回 403 |
| `onlinePaymentEnabled` | true | 全部管理员 | 隐藏在线支付相关入口 | 拦截支付渠道、支付意图、在线支付、Stripe Checkout | 禁止创建在线支付流程 | 关闭后请求在线支付相关接口应返回 403 |
| `pointsEnabled` | true | 全部管理员 | 隐藏积分入口和积分抵扣 UI | 拦截积分接口；订单预览/创建时拒绝强传积分抵扣 | 不生成积分抵扣，不扣用户积分 | 关闭后提交 `use_points=true` 应返回「积分功能已关闭」 |
| `couponEnabled` | true | 全部管理员 | 隐藏优惠券入口和下单优惠券 UI | 拦截优惠券接口；订单预览/创建时拒绝强传优惠券 | 不查询、不锁定、不使用用户优惠券 | 关闭后提交 `coupon_id` 应返回「优惠券功能已关闭」 |
| `reviewEnabled` | true | 全部管理员 | 隐藏评价入口 | 拦截评价提交、点赞和后台评价管理 | 禁止新增评价互动 | 关闭后提交评价应返回 403 |
| `inventoryEnabled` | true | 全部管理员 | 隐藏库存中心入口 | 拦截后台库存管理接口 | 禁止后台库存调整、盘点等 | 关闭后请求后台库存接口应返回 403 |
| `shippingEnabled` | true | 全部管理员 | 隐藏配送设置入口 | 拦截后台配送模板和设置接口 | 禁止后台修改配送规则 | 关闭后请求配送设置接口应返回 403 |
| `memberLevelEnabled` | true | 全部管理员 | 隐藏会员等级入口 | 拦截后台会员等级接口 | 禁止后台维护会员等级 | 关闭后请求会员等级接口应返回 403 |
| `customerServiceDownloadEnabled` | true | 全部管理员 | 隐藏客服/APP 下载页与相关导航 | 暂无专门 403（以路由 Capability 隐藏为主） | 不影响订单、商品核心链路 | 关闭后访问 `/support-download` 应被 CapabilityRoute 重定向 |
| `telegramOrderNotifyEnabled` | true | 全部管理员 | 关闭时隐藏侧栏「Telegram 通知」；与 Telegram 设置页双向同步 | **不**拦截 Telegram 设置读写；付款成功等场景禁止实际发送 | 关闭后不再发送 Telegram 订单提醒 | 关闭后 `telegram.service` 发送逻辑应跳过；设置页仍可配置 Token |
| `languageGateEnabled` | **false** | 全部管理员 | 开启后前台拦截非中文浏览器（`/admin` 除外） | 暂不拦截 API | 仅前端展示，不作为安全边界 | 非中文浏览器访问商城页应出现语言提示 |
| `trafficAnalyticsEnabled` | true | 全部管理员 | 隐藏后台流量分析、前台停止埋点 | 拦截 `/analytics/events` 与 `/admin/reports/traffic` | 禁止采集新埋点 | 关闭后上述接口应返回 403 |
| `serviceEnabled` | true | **仅超级管理员**（灰显预留） | 预留，**前后端均未完整接入** | 无 | 开启/关闭几乎无效果 | 勿作为生产验收项 |
| `restrictedProductComplianceEnabled` | true | **仅超级管理员**（灰显预留） | 受监管商品展示、下单提示、SEO 等 | 部分逻辑读取该开关 | 关闭后合规提示与限制减弱 | 仅超级管理员可改；改前需业务确认 |

## 不在本页的其它能力

以下能力**不在**功能开关页管理，避免与「站点能力」混淆：

| 能力 | 配置方式 |
|---|---|
| 短信验证码登录 | 环境变量 / OTP 服务可用性；`GET /api/auth/features` → `smsOtpLoginEnabled` |
| 微信登录 | 微信 AppId 等配置；`GET /api/auth/features` → `wechatLoginEnabled` |
| 管理员 MFA | 员工与账号安全设置，非站点能力 JSON |

## Telegram 与功能开关的关系

- 在功能开关关闭 `telegramOrderNotifyEnabled`：侧栏不显示「Telegram 通知」，且**不会发送**订单类 Telegram 提醒。
- 超级管理员仍可通过直接访问 `/admin/settings/telegram` 配置 Bot（若已知路径）；保存 Telegram 页仍会写回 `site_capabilities.telegramOrderNotifyEnabled`。
- 在功能开关开启 Telegram：与 Telegram 设置页的「启用」开关双向同步。

## 验收要求

1. 关闭任一**已接入**的核心开关后，前台入口应隐藏或不可进入。
2. 直接调用相关后端接口必须被拒绝，不能只依赖前端隐藏。
3. 订单预览和订单创建必须保持一致（不能预览允许、下单拒绝，或相反）。
4. 开关关闭时返回明确中文错误，方便客服和运营定位。
5. 预留开关（`serviceEnabled`、`restrictedProductComplianceEnabled`）仅超级管理员可见可改，普通管理员不应误以为已全站生效。
