# 发版后检查清单（damatong.net）

每次**前端有变更**的发布（`deploy/release/deploy.sh` 成功）后执行。未配置 Cloudflare API 时，**必须手动 Purge**。

## 1. Cloudflare 清缓存（必做）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择站点 **damatong.net**
3. **Caching** → **Configuration**
4. 点击 **Purge Everything** → 确认

> 大版本或仍有个别用户白屏时，可再 Purge 一次；平时每次发版 Purge 一次即可。

### 可选：配置 API 后自动 Purge

在服务器 `/var/www/damatong/shared/server.env`（或 `server/.env`）写入：

```env
CF_API_TOKEN=...
CF_ZONE_ID=...
```

Token 权限：`Zone.Cache Purge`（仅 **damatong.net**）。配置后 `deploy.sh` 结束时会自动调用 `deploy/purge-cloudflare-cache.sh`。

## 2. 快速验证（建议）

在本地或服务器执行：

```bash
# 首页应 200，且 HTML 入口不长期缓存
curl -sSI https://damatong.net/ | grep -iE 'HTTP/|cache-control|cf-cache'

# 线上 index 引用的 CSS 应 200（hash 以当前发布为准）
curl -sS https://damatong.net/ | grep -oE '/assets/[^"]+\.css' | head -1
# 将上一条输出的路径代入：
curl -sSI "https://damatong.net/assets/你的文件.css" | grep -i HTTP
```

期望：

- `/` → `200`，`cache-control` 含 `no-cache`，`cf-cache-status` 多为 `DYNAMIC`
- 当前 `index.html` 引用的 `/assets/*.css`、`*.js` → `200`

## 3. 源站资源校验（可选）

```bash
node deploy/release/verify-frontend-assets.mjs /var/www/damatong/dist index.html
```

## 4. Cookie 登录态（涉及认证发版时必做）

生产服务器 `server.env` / `server/.env` 需包含：

```env
AUTH_COOKIE_SECURE=1
TRUST_PROXY=1
PUBLIC_APP_URL=https://damatong.net
```

Nginx 需已部署 `www.damatong.net` → `https://damatong.net` 的 301（见 `deploy/nginx/damatong.prod.conf`），且 `/api/` 代理带 `X-Forwarded-Proto https`。

浏览器验证（仅使用 **https://damatong.net**，勿混用 www）：

1. 登录后 Network → 登录响应含 `Set-Cookie: access_token`、`refresh_token`
2. Application → Cookies 可见上述 Cookie
3. `GET /api/user/profile` → 200；刷新页面、关闭浏览器再打开仍保持登录

本地 HTTP 联调：`AUTH_COOKIE_SECURE=0`。

## 5. 交易重构发布核对（涉及订单/活动/支付/库存/物流时必做）

发布前确认：

- 已执行数据库迁移，且 `server/migrations/157` 至 `162` 均已在目标环境生效。
- 站点能力开关符合发布策略：`promotionEngineV2`、`pricingEngineV2`、`inventoryLockV2`、`billplzEnabled` 不要误开。
- Billplz / FPX 环境变量只配置在服务端环境文件，不进入前端构建变量。
- 未提交、未部署的本地改动不能混进生产发布包。

发布后 smoke test：

先执行可重复的前端入口检查：

```bash
cd click-send-shop-main/click-send-shop-main
SMOKE_REQUIRE_API=1 BASE_URL=https://damatong.net npm run smoke:restructure
```

再做需要真实数据或三方平台状态的人工核对：

1. 活动中心 `/promotions` 和一个活动详情页能打开。
2. 商品页、购物车、结算页展示的活动价、优惠明细和订单创建金额一致。
3. 重复提交 `POST /api/orders` 使用同一 `idempotency_key` 不会生成两个订单。
4. 未支付订单超时取消后，库存锁和优惠占用能释放。
5. Billplz / FPX 支付返回 `/payment/result` 后，只根据后端状态显示结果。
6. 重复支付回调不会重复加销量、发积分或通知。
7. 结算页和待支付订单继续支付默认优先使用 Billplz / FPX；Stripe 仍可作为备用渠道。
8. 后台订单发货后，订单详情能看到物流单号、平台发货轨迹；异常轨迹能显示物流异常说明。
9. 后台运费页能看到 West/East Malaysia、州、城市、邮编、重量、金额门槛覆盖提示。
10. 后台库存页能看到可售库存、锁定库存、待支付占用、低库存/缺货和库存流水审计入口。
11. 后台报表能打开活动转化、优惠成本、支付失败、库存占用、取消原因报表。

## 6. 用户仍白屏时

告知用户无痕打开，或在控制台执行：

```js
navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
location.reload();
```

---

相关文档：`deploy/release/README.md` · 脚本 `deploy/purge-cloudflare-cache.sh`
