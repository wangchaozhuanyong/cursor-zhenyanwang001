# 客户端重构发布前审计

更新时间：2026-06-22 23:41 PDT

## 当前结论

当前工作区已经按 SILENT COMMERCE 设计资料完成客户端主路由接入，并通过本地前端预览的自动验收。此结论只覆盖客户端展示层和前端路由可用性，不等同于生产环境已发布。

## 设计覆盖

设计资料要求的 40 个移动端页面已纳入当前客户端路由或验证脚本覆盖：

- 首页、分类、搜索、商品列表、商品详情
- 购物车、结算、支付结果、订单列表、订单详情、物流详情
- 优惠券、活动列表、活动详情
- 我的、会员权益、地址、收藏、通知、客服帮助
- 登录、注册、找回密码、绑定手机号、邀请好友
- 客服下载、安装应用、关于我们、配送说明、功能状态、意见反馈、CMS 内容页
- 账户设置、积分、积分礼品、奖励记录、钱包、售后列表、售后详情、待评价、浏览记录、大马通独立页

额外纳入验证的兼容入口：

- `/forgot` -> 找回密码
- `/member-benefits` -> `/member/benefits`
- `/deals` -> `/promotions`
- `/deals/:slug` -> `/promotions/:slug`

## 当前通过的本地验收

以下命令已在 `http://127.0.0.1:4192` 本地预览和当前工作区上通过：

```bash
npm run lint
npm run typecheck
npm run typecheck:strict-api
npm run typecheck:strict-admin
npm run test
npm run build
npm run build:admin
npm run verify:dist
npm run verify
npm run theme:check
npm run check:text
npm run check:migrations
npm run test:browser-compat
npm run check:client-redesign-scope
npm run release:client-redesign
git diff --check
BASE_URL=http://127.0.0.1:4192 npm run smoke:restructure
BASE_URL=http://127.0.0.1:4192 node scripts/verify-client-e2e.mjs
BASE_URL=http://127.0.0.1:4192 SKIP_AUTH=1 SKIP_ADMIN=1 npm run audit:overlap
BASE_URL=http://127.0.0.1:4192 npm run audit:route-transition
```

以下带真实本地 API、登录态和购物车种子的验收已在 `http://127.0.0.1:4193` 通过：

```bash
BASE_URL=http://127.0.0.1:4193 SKIP_ADMIN=1 npm run audit:overlap
```

以下完整本地发布门禁已在当前右侧预览地址 `http://127.0.0.1:5174` 通过：

```bash
BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign
```

以下移动端和桌面端截图审计已在 `http://127.0.0.1:4194` 生成：

```bash
BASE_URL=http://127.0.0.1:4194 npm run capture:client-redesign
BASE_URL=http://127.0.0.1:4194 VIEWPORT=1280x800 npm run capture:client-redesign
```

以下最新移动端和桌面端截图审计已在当前右侧预览地址 `http://127.0.0.1:5174` 生成：

```bash
BASE_URL=http://127.0.0.1:5174 npm run capture:client-redesign
BASE_URL=http://127.0.0.1:5174 VIEWPORT=1280x800 npm run capture:client-redesign
```

结果摘要：

- `smoke:restructure`：40 条客户端路由，2 个视口，共 80 个检查点，0 失败。
- `verify-client-e2e`：45 个入口，0 error，0 warning；已检查 `#root`、正文长度、横向溢出、Vite 错误和运行时错误文本。最小正文长度 19，最大横向溢出 0。
- `audit:overlap`：37 个公开路由，390 / 375 / 1280 三类视口，0 重叠问题。
- `audit:overlap` 登录态扫描：`auth: true`、`cartSeeded: true`、`apiAvailable: true`、`issueCount: 0`，已覆盖登录态页面、购物车种子和移动端结算选券弹层。
- `capture:client-redesign` 移动端：生成 41 张 390px 页面截图，`apiAvailable: true`、`authReady: true`、`cartSeeded: true`、`orderCreated: true`、最大横向溢出 0、最小正文长度 19。
- `capture:client-redesign` 桌面端：生成 41 张 1280px 页面截图，`apiAvailable: true`、`authReady: true`、`cartSeeded: true`、`orderCreated: true`、最大横向溢出 0、最小正文长度 39。
- `5174` 最新移动端截图：生成 41 张 390px 页面截图，`apiAvailable: true`、`authReady: true`、`cartSeeded: true`、`orderCreated: true`、最大横向溢出 0、最小正文长度 19。
- `5174` 最新桌面端截图：生成 41 张 1280px 页面截图，`apiAvailable: true`、`authReady: true`、`cartSeeded: true`、`orderCreated: true`、最大横向溢出 0、最小正文长度 39。
- `audit:route-transition`：客户端切页无 issue，仅后台登录页未单独服务的 warning。
- `npm run test`：96 个测试文件、393 个测试全部通过。
- `npm run verify`：综合验证通过，覆盖 typecheck、strict-api、strict-admin、storefront-products 单测、check:text 和 build。
- `check:text`：mojibake、admin i18n、api paths、admin labels、admin routes、China browser compatibility 全部通过。
- `check:migrations`：175 个 up 迁移无前缀冲突；11 组历史重复编号被按既有规则忽略。
- `test:browser-compat`：3 个测试文件、23 个浏览器兼容测试全部通过。
- `theme:check`：退出码 0，仅报告前台存在既有硬编码颜色警告；该脚本当前默认不阻塞构建。
- `build:admin`：后台构建通过，说明本轮客户端共享样式/脚本调整没有打坏后台构建。
- `verify:dist`：`dist`、`admin-dist` 资源引用和 PWA 校验全部通过。
- `check:client-redesign-scope`：客户端重构提交范围检查通过，自动覆盖密钥扫描、`.env` / lockfile / 构建产物拦截、路径边界和关键新增/删除文件引用完整性。
- `check:client-redesign-scope` 当前为纯 Node 实现，不依赖本机是否安装 `rg`。
- `git diff --check`：当前工作区无空白错误。
- `release:client-redesign`：本地发布门禁当前为 9 个静态步骤，覆盖 lint、verify、build:admin、verify:dist、check:migrations、test:browser-compat、theme:check、`check:client-redesign-scope` 和 `git diff --check`。
- `npm run release:client-redesign`：最新静态发布门禁 9/9 通过，用时约 16.1 秒。
- `npm run release:client-redesign -- --list`：确认未设置 `BASE_URL` 时只列出 9 个静态步骤；设置 `BASE_URL` 后追加浏览器门禁。
- `BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign`：完整本地发布门禁 13/13 通过，用时约 269.8 秒；追加覆盖客户端路由烟测、45 入口 E2E、UI 重叠扫描和路由切换扫描。
- `BASE_URL=http://127.0.0.1:5174 CAPTURE_CLIENT_REDESIGN=1 npm run release:client-redesign`：最新带截图完整本地发布门禁 15/15 通过，用时约 356.1 秒；追加生成移动端和桌面端截图包。
- `5174` 门禁详情：`smoke:restructure` 检查 80 个点 0 失败；`verify-client-e2e` 检查 45 个入口 0 error / 0 warning / 最大横向溢出 0；`audit:overlap` 覆盖 37 个公开路由、390 / 375 / 1280 三类视口、`auth: true`、`cartSeeded: true`、`apiAvailable: true`、`issueCount: 0`；`audit:route-transition` 无 issue，仅因未提供后台地址和密码跳过后台登录态检查。

视觉截图包：

- 移动端目录：`artifacts/client-redesign-visual-20260622-124143`
- 移动端总览图：`artifacts/client-redesign-visual-20260622-124143/contact-sheet.png`
- 移动端摘要：`artifacts/client-redesign-visual-20260622-124143/summary.json`
- 桌面端目录：`artifacts/client-redesign-visual-20260622-124408`
- 桌面端总览图：`artifacts/client-redesign-visual-20260622-124408/contact-sheet.png`
- 桌面端摘要：`artifacts/client-redesign-visual-20260622-124408/summary.json`
- 最新 5174 移动端目录：`artifacts/client-redesign-visual-20260622-130814`
- 最新 5174 移动端总览图：`artifacts/client-redesign-visual-20260622-130814/contact-sheet.png`
- 最新 5174 移动端摘要：`artifacts/client-redesign-visual-20260622-130814/summary.json`
- 最新 5174 桌面端目录：`artifacts/client-redesign-visual-20260622-130916`
- 最新 5174 桌面端总览图：`artifacts/client-redesign-visual-20260622-130916/contact-sheet.png`
- 最新 5174 桌面端摘要：`artifacts/client-redesign-visual-20260622-130916/summary.json`
- 最新带截图门禁移动端目录：`artifacts/client-redesign-visual-20260622-135140`
- 最新带截图门禁移动端总览图：`artifacts/client-redesign-visual-20260622-135140/contact-sheet.png`
- 最新带截图门禁移动端摘要：`artifacts/client-redesign-visual-20260622-135140/summary.json`
- 最新带截图门禁桌面端目录：`artifacts/client-redesign-visual-20260622-135225`
- 最新带截图门禁桌面端总览图：`artifacts/client-redesign-visual-20260622-135225/contact-sheet.png`
- 最新带截图门禁桌面端摘要：`artifacts/client-redesign-visual-20260622-135225/summary.json`
- 提交前最终移动端目录：`artifacts/client-redesign-visual-20260622-233618`
- 提交前最终移动端总览图：`artifacts/client-redesign-visual-20260622-233618/contact-sheet.png`
- 提交前最终移动端摘要：`artifacts/client-redesign-visual-20260622-233618/summary.json`
- 提交前最终桌面端目录：`artifacts/client-redesign-visual-20260622-233704`
- 提交前最终桌面端总览图：`artifacts/client-redesign-visual-20260622-233704/contact-sheet.png`
- 提交前最终桌面端摘要：`artifacts/client-redesign-visual-20260622-233704/summary.json`

## 发布范围分类

当前工作区是客户端重构级别改动。按 `git status --porcelain=v1 -uall` 展开未跟踪目录后为 118 个路径，其中 98 个修改、1 个删除、19 个新增。按路径粗分：

- `src/modules/public`：53 个页面相关改动，覆盖 40 页客户端设计和账户/交易/内容/活动页面。
- `src/components`：15 个共享组件改动，主要是客户端外壳、底部导航、页面头、入口图标、支持组件。
- `src/styles`：6 个样式文件改动/新增，包含 SILENT COMMERCE token、primitives、extended routes 和 support download 样式。
- `src/modules/storefront-v2`：10 个商城 v2 模块/设计组件改动，包含首页、商品卡骨架、ValueVaultCoupon、SharePassCard、BalanceFolio 等。
- `src/layouts`、`src/routes`、`src/contexts`、`src/constants`、`src/utils`、`src/main.tsx`：10 个运行时接线/路由/布局/工具改动，支撑客户端设计系统接入。
- `scripts`：8 个验收脚本改动/新增，包含 smoke、overlap、route transition、client e2e、theme studio、截图采集、提交范围检查和发布门禁。
- `docs`：新增本审计文件、客户端重构提交与发布执行清单、客户端重构变更清单。
- `package.json`：新增 `capture:client-redesign`、`check:client-redesign-scope` 和 `release:client-redesign` 命令。
- `.gitignore`：忽略 `design-previews/five-mall-skins-effect-preview/`，避免设计预览产物进入发布提交。

截图产物位于 `artifacts/`，已被忽略，不进入 git 状态。

## 提交风险审计

截至 2026-06-22 23:41 PDT，已对当前未提交范围做提交前风险核对：

- 高置信密钥扫描：扫描当前存在的 117 个变更文件，未发现 OpenAI/GitHub/AWS/Google/Slack token、private key block 或长字面量 secret。
- 环境文件检查：未发现 `.env`、`.env.*` 进入当前 git 变更范围。
- 依赖锁文件检查：未发现 `package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb` 进入当前 git 变更范围；本轮只新增 npm scripts，没有新增依赖。
- 构建产物检查：未发现 `dist`、`admin-dist` 或 `artifacts` 进入提交范围；最新截图包仍被 ignore。
- 路径边界检查：当前 118 个展开路径均落在预期发布桶内：`src/`、`scripts/`、`docs/`、`package.json`、`.gitignore`。
- 上述提交风险核对已固化为 `npm run check:client-redesign-scope`，并接入 `npm run release:client-redesign`。
- 最新自动检查结果：`changedEntries: 118`、`scannedFiles: 117`、`failures: []`、`warnings: []`；并已在 `BASE_URL=http://127.0.0.1:5174 CAPTURE_CLIENT_REDESIGN=1 npm run release:client-redesign` 的 15/15 完整门禁中通过。

## 引用完整性审计

截至 2026-06-22 13:20 PDT，已对关键新增/删除文件做引用核对：

- `MemberBenefits.css` 已删除，当前 `src/` 内无残留 import；会员权益页改为 `MemberBenefitsView.tsx` + `member-benefits.next.css`。
- `MemberBenefitsView.tsx` 被 `MemberBenefits.tsx` 正常引用，且导出 `MemberBenefitsViewState` 类型。
- `ValueVaultCoupon` 被优惠券页和活动详情页引用。
- `SharePassCard` 被邀请好友页引用。
- `BalanceFolio` 被关于我们和功能状态页引用。
- `RouteStatePanel` 被物流详情和 CMS 内容页引用。
- `StatusTimeline` 被物流详情和售后详情页引用。
- `storefrontDesignContract` 被 `StoreAppRoutes.tsx` 引用，用于客户端设计 scope。
- `storefront-foundation.css`、`storefront-next.tokens.css`、`storefront-next.primitives.css`、`storefront-next.extended-routes.css`、`storefront-next.final-contract.css`、`storefront-next.category.css` 已在 `src/main.tsx` 入口加载。

## 建议提交方案

如果进入提交阶段，建议作为一个客户端重构提交处理，不拆成多个互相依赖的提交，避免页面样式、路由、脚本和文档分离导致中间提交不可运行。

建议提交信息：

```text
feat(client): redesign storefront experience
```

建议提交前最后执行：

```bash
BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign
git diff --check
npm run check:client-redesign-scope
git status --porcelain=v1 -uall
```

建议 staging 范围：

- 包含：`.gitignore`、`click-send-shop-main/click-send-shop-main/package.json`、`click-send-shop-main/click-send-shop-main/src/`、`click-send-shop-main/click-send-shop-main/scripts/`、`click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_RELEASE_AUDIT.md`、`click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_RELEASE_RUNBOOK.md`、`click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_CHANGE_MANIFEST.md`。
- 不包含：`artifacts/`、`dist/`、`admin-dist/`、`.env*`、任何 lockfile、任何本地预览产物。

## 剩余未完成项

截至当前，本地客户端重构与本地发布门禁已经完成；真正剩余的是发布流程和环境验收项：

- `0` 个已知客户端页面缺口：设计资料要求的 40 个移动端页面已纳入当前路由或验证脚本覆盖。
- `1` 个提交范围确认：工作区未提交记录仍然很多，发布前需要人工确认 commit 范围，不能把无关改动混进发布。
- `1` 个目标环境复验：如果发布到 staging/production，需要在对应环境再跑客户端浏览器门禁。
- `1` 个后台登录态复验：如果要把后台一并纳入发布验收，需要提供 `ADMIN_BASE_URL` 和 `ADMIN_PASSWORD`。
- `1` 个非阻塞主题治理项：`theme:check` 当前仍有硬编码颜色警告，建议另起一轮 token 收敛，不混入本次客户端发布。
- `1` 个桌面端增强项：当前资料是 390px 移动端基准，桌面端已通过无重叠/无横向溢出/无空路由验证；如果要把桌面也做成大屏专属高级布局，需要另起一批桌面体验增强。
- `1` 个人工视觉抽查项：移动端和桌面端截图包已生成，发布前建议人工逐页快速看一遍完整 PNG。

本地发布门禁用法：

  - `npm run release:client-redesign -- --list`：只列出将执行的检查。
  - `npm run release:client-redesign`：执行本地静态/构建/迁移/兼容/主题扫描门禁。
  - `BASE_URL=<storefront> npm run release:client-redesign`：在指定前台地址追加客户端路由、E2E、重叠和路由切换扫描。
  - `BASE_URL=<storefront> CAPTURE_CLIENT_REDESIGN=1 npm run release:client-redesign`：额外生成移动端和桌面端截图包。

本地 API 登录态、购物车种子和结算选券弹层已验收；如果发布到 staging/production，还需要使用对应环境再跑一次：

  - `BASE_URL=<storefront> API_BASE_URL=<api> SKIP_ADMIN=1 npm run audit:overlap`
  - `BASE_URL=<storefront> node scripts/verify-client-e2e.mjs`

390px 移动端和 1280px 桌面端均已生成截图包并做过一轮 contact sheet 快速抽查；发布前仍建议人工逐页看一次完整 PNG，特别是商品详情、活动详情、结算、售后详情、会员权益、邀请好友、TikTok 独立页。当前桌面端不少页面仍采用移动优先的窄容器居中布局，自动验收证明其可用、不重叠、不横向溢出；是否进一步做大屏专属版应作为独立设计批次决定。

## 发布边界

本文件记录客户端重构提交前候选状态；实际 commit、push、部署和生产验收状态以当次执行记录与 GitHub Actions / 线上复验结果为准。
