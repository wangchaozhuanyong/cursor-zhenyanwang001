# 全面重构验收清单

本文档用于验收订单、支付、库存、定价、活动、后台和马来西亚本地化重构。它不替代自动化测试；所有勾选项必须有命令输出、浏览器结果、后台操作记录或三方平台事件作为证据。

## 当前本地证据（2026-06-15）

以下仅代表本地工作树已验证，不代表已部署生产：

- 前端完整门禁已通过：`cd click-send-shop-main/click-send-shop-main && npm run verify`。
- 前端支付渠道优先级测试已通过：`npx vitest run src/utils/checkoutPaymentMethod.test.ts src/components/PaymentMethodPicker.test.tsx`。
- 后台独立构建已通过：`cd click-send-shop-main/click-send-shop-main && npm run build:admin`。
- 后端架构门禁已通过：`cd server && npm run arch:check`。
- 后端类型检查已通过：`cd server && npm run typecheck`。
- 后端完整单元测试已通过：`cd server && npm run test:unit`。
- 后端迁移编号检查已通过：`cd server && npm run check:migrations`。
- 后端报表注册检查已通过：`cd server && npm run check:report-registry`。
- Phase 6 相关后端专项已通过：`node -r tsx/cjs --test test/billplz-provider.test.js test/billplz-webhook-security.test.js test/payment-reconciliation-review.test.js test/inventory-lock-v2.test.js test/admin-inventory-occupancy.test.js test/shipping-fee-rules.test.js test/logistics-snapshot.test.js`。
- 前台桌面/移动端只读 smoke 已通过：`cd click-send-shop-main/click-send-shop-main && npm run smoke:restructure`，脚本自动识别本地大马通前端并检查 32 个重构关键入口 x 2 个视口，共 64 项，0 失败；覆盖中文、English、Bahasa Melayu 的活动中心、活动详情异常态、购物车、结算守卫、支付结果和订单守卫，无白屏、无 Vite 编译错误、无页面运行时致命错误。
- 后台库存页已补库存健康检查：可售库存、锁定库存、待支付占用、缺货/低库存、补货预警和库存流水审计入口。
- 后台运费页已补马来西亚规则覆盖检查：默认模板、West/East Malaysia、州/城市/邮编、重量规则、金额门槛。
- 后台订单详情已补物流运营检查：物流单号、承运商、当前状态、轨迹数量、最新轨迹、最后同步、异常提示和刷新物流。
- 前台在线支付渠道排序已补 Billplz / FPX 优先；Stripe 保留为备用。
- 重构迁移演练命令已执行但安全跳过：`cd server && npm run migration:restructure-drill` 输出 `server/.env.test not found`；当前机器未发现 Docker、`mysql` 或 `mysqladmin`，且当前仓库未发现可直接使用的 bundled local MySQL，必须配置非生产测试库后再跑真实演练。

仍需额外证据：

- staging 或临时库迁移演练。
- 连接后端测试库后的完整桌面/移动端浏览器 smoke，尤其是结算页、已登录后台活动/支付/库存/物流页。
- Billplz sandbox 真实创建 bill、真实回调签名、失败回调、重复回调和对账复核。
- 生产发布、Cloudflare 清缓存和线上 smoke；未获明确指令前不得执行。

## 1. 本地代码门禁

- 后端架构：`cd server && npm run arch:check`
- 后端 publicApi 边界：`cd server && npm run check:public-api-boundaries`
- 后端类型：`cd server && npm run typecheck`
- 后端单元：`cd server && npm run test:unit`
- 迁移编号：`cd server && npm run check:migrations`
- 重构迁移演练：`cd server && npm run migration:restructure-drill`
- 报表注册：`cd server && npm run check:report-registry`
- 前端完整：`cd click-send-shop-main/click-send-shop-main && npm run verify`
- 后台构建：`cd click-send-shop-main/click-send-shop-main && npm run build:admin`
- 重构页面 smoke：`cd click-send-shop-main/click-send-shop-main && npm run smoke:restructure`
- 连接测试后端 smoke：`cd click-send-shop-main/click-send-shop-main && SMOKE_REQUIRE_API=1 BASE_URL=<staging-url> npm run smoke:restructure`
- 空白检查：`git diff --check`

## 2. 前台浏览器 smoke

- `/promotions` 在桌面和手机视口可打开，无白屏、无横向溢出、无 console error。
- `/promotions/:slug` 的正常态和异常态都能显示当前语言文案。
- 首页活动卡片跳转到活动详情，而不是只跳分类参数。
- 商品卡、分类页、商品详情展示后端返回的活动价、标签、限购、库存进度。
- 购物车展示可用优惠、不可用原因、满减差额和叠加结果。
- 结算页展示每条优惠来源，并以后端预览金额为准。
- `/payment/result` 外壳可从 Billplz / FPX / Stripe 公开回跳打开；页面只请求后端订单/支付状态，未登录或无权访问订单时显示登录/刷新失败状态，URL 参数不能决定支付成功。
- 中文、English、Bahasa Melayu 的活动中心、购物车、支付结果、订单页路径均通过 smoke。

## 3. 后台浏览器 smoke

- `/admin/login` 能打开。
- 未登录访问活动管理、支付事件、对账、库存、报表路由时必须回到登录页，不得前台 404 或白屏。
- 已登录后能打开统一活动管理，支持创建、编辑、复制、暂停、结束、归档。
- 活动规则冲突检测、规则版本、效果统计可见。
- 高风险操作有二次确认，并在后端写审计日志。
- 长表单具备保存中、防重复提交、失败提示、离开提醒和多人编辑冲突提示。
- 新报表能打开并可导出：活动转化、优惠成本、支付失败、库存占用、订单取消原因。

## 4. 数据库迁移验收

- 迁移 `157` 至 `162` 在目标环境执行成功。
- 回滚脚本在 staging 或临时库通过 `npm run migration:restructure-drill` 完成 `157 -> 162` 应用、`162 -> 157` 回滚、再应用。
- 旧字段和旧活动类型未被删除，历史数据可读取。
- 新增表和字段含必要索引：订单幂等、活动 V2 字段、活动用量、马来西亚运费、支付对账、物流快照。
- 迁移后运行关键 schema 验证和订单/活动/支付单元测试。

## 5. 交易安全验收

- `POST /api/orders` 带同一 `idempotency_key` 重试返回同一订单。
- 同一 `idempotency_key` 但请求参数不一致返回冲突，不生成新订单。
- 支付成功回调重复发送不能重复改订单、加销量、发积分或通知。
- 管理员手动确认付款只在付款状态首次变为 paid 时累加销量。
- 未支付订单超时取消后释放库存锁、优惠券、积分和活动库存占用。
- 商品页、购物车、结算预览、订单快照、支付金额一致。

## 6. 活动引擎验收

- 支持活动类型：`campaign`、`coupon`、`full_reduction`、`full_discount`、`limited_time_discount`、`flash_sale`、`member_price`、`checkin_reward`、`points_reward`。
- 支持活动状态：`draft`、`scheduled`、`active`、`paused`、`ended`、`archived`。
- 旧类型 `coupon_activity`、`new_user_gift`、`points_bonus`、`member_activity` 可通过 adapter 映射。
- `coupon` 活动发布必须关联至少一张已发布且可领取的优惠券模板；前台优惠券中心同时兼容读取新 `coupon` 活动和旧 `coupon_activity`。
- 规则引擎输出可用状态、不可用原因、优惠明细、奖励明细、命中商品、叠加结果和订单快照。
- 结算和创建订单重新校验时间、商品范围、SKU、会员等级、限购、库存和叠加规则。
- 秒杀库存并发测试通过，不超卖。

## 7. 马来西亚支付和物流验收

- `billplzEnabled=false` 时前台隐藏 Billplz / FPX。
- `billplzEnabled=true` 且后台渠道启用时，前台优先展示 Billplz / FPX；待支付订单继续支付也必须复用同一优先级。
- Billplz sandbox 创建 bill 成功，金额以 MYR cents 正确换算。
- Billplz webhook 校验签名、金额、币种、订单号和 provider event id。
- Stripe 仍可作为保留支付渠道，不影响 Billplz 优先级。
- 运费规则覆盖 West Malaysia / East Malaysia、州、城市、邮编、重量、金额门槛。
- 后台发货记录写入物流单号和轨迹；订单详情展示物流异常状态。

## 8. 发布和回滚边界

- 未经明确指令，不 commit、push、部署或修改生产配置。
- 发布前确认能力开关默认策略，不误开 `promotionEngineV2`、`pricingEngineV2`、`inventoryLockV2`、`billplzEnabled`。
- 生产发布后执行 `deploy/release/POST-RELEASE-CHECKLIST.md`。
- 如果支付、库存或订单金额出现异常，优先关闭对应能力开关并回滚最新发布包。
