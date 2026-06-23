# 客户端重构提交与发布执行清单

更新时间：2026-06-22 23:41 PDT

## 当前发布候选

- Git 根目录：`/Users/wangchao/Desktop/真烟网/cursor-zhenyanwang001-work`
- 前端目录：`click-send-shop-main/click-send-shop-main`
- 当前分支：`main`
- 提交前基线 HEAD：`dad919c6`
- 候选提交：客户端 SILENT COMMERCE 全站重构
- 建议提交信息：`feat(client): redesign storefront experience`

## 提交前必须确认

提交前保持以下边界：

- 不包含 `.env`、`.env.*`、密钥、私有账号、token 或生产配置。
- 不包含 `dist/`、`admin-dist/`、`artifacts/`。
- 不包含 lockfile；本轮没有新增依赖。
- 不混入登录、支付、订单、库存、部署配置等无关业务改动。
- 不回滚当前工作区内已有客户端重构改动。

当前自动范围检查命令：

```bash
npm run check:client-redesign-scope
```

当前应返回：

```json
{
  "changedEntries": 118,
  "statusCounts": {
    "M": 98,
    "D": 1,
    "??": 19
  },
  "scannedFiles": 117,
  "warnings": [],
  "failures": []
}
```

## 建议 staging 范围

从 Git 根目录执行时，建议只 stage 以下范围：

```bash
git add \
  .gitignore \
  click-send-shop-main/click-send-shop-main/package.json \
  click-send-shop-main/click-send-shop-main/src \
  click-send-shop-main/click-send-shop-main/scripts \
  click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_RELEASE_AUDIT.md \
  click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_RELEASE_RUNBOOK.md \
  click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_CHANGE_MANIFEST.md
```

不要 stage：

```text
click-send-shop-main/click-send-shop-main/dist/
click-send-shop-main/click-send-shop-main/admin-dist/
click-send-shop-main/click-send-shop-main/artifacts/
.env
.env.*
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lockb
```

## 提交前最后门禁

前端目录执行：

```bash
npm run check:client-redesign-scope
git diff --check
BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign
```

如果要同时生成最新截图包：

```bash
BASE_URL=http://127.0.0.1:5174 CAPTURE_CLIENT_REDESIGN=1 npm run release:client-redesign
```

## 提交命令

只有获得明确授权后再执行：

```bash
git commit -m "feat(client): redesign storefront experience"
```

提交后建议核对：

```bash
git status --short
git show --stat --oneline --summary HEAD
```

## 发布后复验

发布到 staging 或 production 后，用真实地址重新跑：

```bash
BASE_URL=<storefront-url> npm run release:client-redesign
```

如果 API 不是同源：

```bash
BASE_URL=<storefront-url> API_BASE_URL=<api-url> npm run release:client-redesign
```

如果要把后台登录态也纳入路由切换验收：

```bash
BASE_URL=<storefront-url> \
API_BASE_URL=<api-url> \
ADMIN_BASE_URL=<admin-url> \
ADMIN_PASSWORD=<admin-password> \
npm run release:client-redesign
```

## 人工视觉抽查

发布前或发布后重点抽查：

- `/`
- `/categories`
- `/search`
- `/product/v10-smoke-product-flash`
- `/cart`
- `/checkout`
- `/coupons`
- `/promotions`
- `/promotions/smoke-slug`
- `/profile`
- `/member/benefits`
- `/invite`
- `/returns/SMOKE`
- `/tiktok`

检查重点：

- 390px、375px、414px 移动端无横向滚动。
- 按钮不压文字，底部导航不遮挡内容。
- 商品卡、优惠券、优惠码、会员权益、好友邀请区没有重叠。
- 图片加载失败时有可接受的回退，不出现空白大块。
- 登录态页面跳转符合预期，不误放开账号页、订单页、钱包页。

## 已知非阻塞项

- `theme:check` 当前仍会报告疑似硬编码颜色，退出码为 0，不阻塞本次客户端发布。
- 当前设计资料以 390px 移动端为基准；桌面端已通过可用性和无重叠门禁，但如果要做大屏专属高级布局，需要另起桌面增强批次。
- 后台登录态路由切换验收需要单独提供 `ADMIN_BASE_URL` 和 `ADMIN_PASSWORD`。
