# Storefront Admin Capability Matrix

本文档用于把用户端可见页面、后台运营能力、公开 API 和能力开关联到同一张表。它不是数据库设计，也不新增后端接口；当前目标是让设计、前端、后台和运营知道每个前台模块由哪里配置、哪里验收。

## Frontend Entry Points

| 前台页面 / 模块 | 用户目的 | 后台 / 服务来源 | 公开 API / Service | 能力开关 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| 首页 `/` | 看推荐、分类、主活动、热销和新品 | 首页运营、商品、分类、营销活动、主题 | `homeService.fetchHomeBootstrap`, `fetchStorefrontCampaigns` | `mallEnabled`, `couponEnabled`, `pointsEnabled` | 已支持；活动入口统一指向 Deals |
| 分类 `/categories` | 浏览货架和筛选商品 | 商品分类、商品管理、库存 | product/category services | `mallEnabled` | 已支持 |
| 搜索 `/search` | 搜索商品和热词 | 搜索配置、商品索引、搜索分析 | search services | `mallEnabled` | 已支持 |
| 商品详情 `/product/:id` | 查看商品、规格、库存、活动价 | 商品、库存、活动、优惠券、评价 | product services, marketing services | `mallEnabled`, `couponEnabled`, `reviewEnabled` | 已支持；价格库存以后端为准 |
| Deals `/deals` | 聚合秒杀、满减、优惠券、新人礼、会员/积分福利 | 营销活动、优惠券活动、积分活动、商品活动 | `GET /api/marketing/campaigns/home`, `GET /api/marketing/promotions` | `mallEnabled`, `couponEnabled`, `pointsEnabled` | 新增主入口；旧 `/promotions` 跳转 |
| Deals 详情 `/deals/:slug` | 查看单个活动规则、商品、优惠券 | 营销活动详情、优惠券领取 | `GET /api/marketing/promotions/:slug` | `mallEnabled`, `couponEnabled`, `pointsEnabled` | 已支持；旧 `/promotions/:slug` 跳转 |
| 优惠券 `/coupons` | 领券、看我的券 | 优惠券模板、领券活动、发放记录 | coupon services | `couponEnabled` | 保留为 Deals 内部入口 |
| 购物车 `/cart` | 加购、改数量、结算前查看优惠提示 | 购物车、商品、库存、活动预览 | cart services | `mallEnabled`, `couponEnabled` | 已支持 |
| 结账 `/checkout` | 地址、配送、优惠券、积分、支付前预览 | 订单、配送、支付、优惠券、积分 | order checkout services | `mallEnabled`, `couponEnabled`, `pointsEnabled`, `shippingEnabled` | 已支持；最终金额以后端预览为准 |
| 支付结果 `/payment/result` | 查看支付处理状态 | 支付订单、回调、对账 | payment services | `mallEnabled`, `onlinePaymentEnabled` | 已支持 |
| 订单 `/orders`, `/orders/:id` | 查看订单、物流、售后入口 | 订单、物流、支付、售后 | order services | `mallEnabled`, `shippingEnabled` | 已支持 |
| 售后 `/returns`, `/returns/:id` | 发起和跟踪售后 | 售后状态机、订单明细、退款记录 | return services | `mallEnabled` | 已支持；后续可强化证据上传和退款进度 |
| 积分 `/points`, `/points/gifts` | 签到、积分流水、兑换 | 积分规则、礼品、流水 | points services | `pointsEnabled` | 已支持 |
| 我的 `/profile` | 账户资产、订单、收藏、优惠券、积分 | 用户、订单、优惠券、积分、通知 | user services | always on, feature gated sections | 已支持 |
| 客服 `/support-download?tab=support` | 咨询、下载、客服二维码 | 客服渠道、内容管理、PWA | content/support services | `customerServiceDownloadEnabled` | 保留桌面入口；移动端可从我的/首页进入 |

## Admin Capability Map

| 后台能力 | 管理入口 | 支撑前台 | 关键约束 |
| --- | --- | --- | --- |
| 商品管理 | `/admin/products`, `/admin/categories` | 首页、分类、搜索、详情、Deals 活动商品 | 前台不计算最终价格和库存 |
| 库存管理 | `/admin/inventory` | 详情、购物车、结账、秒杀活动 | 库存锁定和释放以后端为准 |
| 营销活动 | `/admin/marketing/activities` | Deals、首页主活动、商品活动角标、购物车提示、结账说明 | 活动类型、叠加、限购和库存以后端规则引擎为准 |
| 优惠券 | `/admin/marketing/coupons`, `/admin/marketing/coupon-campaigns` | Deals、优惠券页、商品购买弹层、结账券选择 | 领取、可用性、核销以后端校验为准 |
| 积分 / 会员 | `/admin/marketing/points`, `/admin/marketing/rewards` | Deals、积分页、结账抵扣、订单赠分 | 积分发放、抵扣、冲正以后端流水为准 |
| 订单 | `/admin/orders` | 结账、支付结果、订单详情、售后 | 状态机和幂等创建以后端为准 |
| 支付 | `/admin/payments/*` | 支付结果、订单支付状态 | 回调、对账、金额一致性以后端为准 |
| 物流 | `/admin/shipping`, `/admin/logistics` | 结账配送、订单物流、售后退回 | 配送费、物流快照以后端为准 |
| 内容 / 客服 | `/admin/content`, `/admin/settings/site` | 客服页、帮助页、页脚、品牌信息 | 前台只展示已发布内容 |
| 主题 / 首页运营 | `/admin/theme`, 首页运营配置 | 首页视觉、模块排序、活动展示位 | 不让前台写死运营素材 |
| 报表 / 监控 | `/admin/reports/*`, `/admin/monitoring/*` | 运营复盘、活动 ROI、异常排查 | 报表口径不能在前台推断 |

## Customer Journey Checklist

| 旅程步骤 | 验收标准 |
| --- | --- |
| 首页进入 | 首屏能看到商品、分类或活动入口；Deals 入口清楚可点 |
| 进入 Deals | `/deals` 有 loading、error、empty、有数据状态；活动卡能跳转到详情或对应功能 |
| 旧链接兼容 | `/promotions` 跳 `/deals`；`/promotions/:slug` 跳 `/deals/:slug`，查询参数保留 |
| 领券 | 从 Deals 可进入 `/coupons`；未登录时按现有领券登录流程处理 |
| 看商品 | 活动商品能进入商品详情；详情页不自行决定最终优惠 |
| 加购 | 商品详情和活动商品加购后购物车 badge/购物车页正常 |
| 结账 | 结账页展示优惠券/积分/活动说明，最终金额以后端 preview 为准 |
| 支付结果 | 支付结果页能展示 pending/success/failure 等状态，不依赖 return URL 作为最终真相 |
| 订单追踪 | 订单详情能看到商品、金额、支付、物流和售后入口 |
| 售后 | 售后入口、状态、退款/退货进度可追踪；后续重点补证据上传和退款明细 |

## Known Gaps

- 多仓/区域履约还没有独立前后台矩阵，后续要单独规划，不在本次 Deals 改造里做。
- Deals v1 聚合现有活动和优惠能力；后续可增加后台可配置排序、展示位预览和运营埋点仪表盘。
- 售后证据上传、退款审核原因、积分/优惠券回滚提示可以继续细化，但不阻塞当前入口改造。
