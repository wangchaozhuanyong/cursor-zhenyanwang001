# 客户端重构发布前审计

原始审计：2026-06-22 23:41 PDT

补充复验：2026-07-29 PDT

## 当前结论

当前工作区已经按 SILENT COMMERCE 设计资料完成客户端主路由接入，并通过本地前端预览的自动验收。此结论只覆盖客户端展示层和前端路由可用性，不等同于生产环境已发布。

## 2026-07-29 安全登录态复验

- 当前候选前台运行在 `http://127.0.0.1:5188`，专用内存数据服务运行在 `http://127.0.0.1:3199`。
- 复验前确认旧预览的 `/api` 实际指向 Cloudflare 后的生产接口，因此没有运行会自动注册、创建地址、下单或申请售后的旧截图脚本。
- 新增 `npm run qa:fixture-api`：已知登录态接口返回确定性的内存数据，未知写请求直接返回 `405`，不会转发到生产；未知 `GET` / `HEAD` 仅作为只读公开数据回退。
- 通过现有登录表单和会话逻辑进入登录态，不通过手工注入浏览器存储伪造页面状态。
- `1280x800` 实图覆盖结算、订单、订单详情、物流、售后列表、售后详情、积分、积分礼品、奖励、钱包、会员权益、邀请好友、优惠券、消息通知和待评价；全部无横向溢出。
- 物流详情已使用完整桌面内容宽度，状态摘要占满首行，订单信息与物流轨迹分栏展示。消息通知页已恢复统一商城顶部导航，并增加固定客户端页头的确定性响应式规则，避免路由 CSS 加载顺序导致导航被隐藏。
- 物流与通知在 `390x844` 下复验：横向溢出为 `0`，可见按钮最小高度为 `44px`，手机页头正常，桌面和平板导航正确隐藏。
- 截图证据位于 `artifacts/fixture-auth-audit-current/`。该结果证明候选版视觉和本地交互状态，不等于目标环境真实支付、下单、物流、退款或会员数据已经联调。
- 同一本地数据服务已扩展为只读后台验收入口，并通过真实后台登录与路由验证发布准备页、首页轮播双图修复队列、快捷入口修复队列、分类主图审阅队列、首页缺图商品修复队列及合规设置定位。发布准备页正确汇总 `54` 个阻断项；轮播队列显示全部 `7` 张缺双图 Banner、按首页顺序排列且首项为“中文客服确认中心”，普通轮播管理页保持原状；快捷入口队列只显示 `5` 个失效入口和 `1` 个待确认外部地址、按首页顺序排列且首项为“正品烟草”，普通快捷入口页仍显示完整 `10` 项；分类队列显示 `7` 个公开一级分类并打开“审阅分类主图：签证服务”；首页缺图队列一次显示 `41` 个商品、按首页曝光顺序排列且首项为“7星1”，普通缺图筛选仍保持 20 条分页；`#compliance` 能准确定位到年龄提示设置，当前仍保持关闭且最低年龄为 `18`。
- 上述后台验收没有上传图片、切换设置或保存数据；未知写请求继续返回 `405`，因此只证明候选后台的操作路径与视觉状态，不代表生产内容已经修复。

## 2026-07-29 全路由多视口复验

- 使用选定的 in-app Browser 对 47 条公开与登录态入口执行首屏和底部状态扫描。
- 覆盖 `375x667`、`390x844`、`768x1024`、`1280x800`、`1440x900`，共 470 个浏览器检查点。
- 结果：横向溢出 `0`、可见坏图 `0`、致命空白页 `0`、桌面/平板交互重叠 `0`。
- 修复了首页轮播整图点击与内部 CTA 嵌套、收藏图片入口与取消收藏重叠、订单/优惠券/售后标签触控宽度不足、通知与邀请操作不足 `44px`，以及联系我们页客服区未接入固定设计的问题。
- 联系我们页现在使用 56px 联系行、独立服务时间行和响应式客服渠道；CMS 技术字样改为用户可理解的“内容更新”。
- 大马通独立页已替换为真实吉隆坡摄影素材，并在桌面端改为完整内容栅格；个人中心邀请奖励区已移除青色渐变、装饰圆环和嵌套小卡，回到固定暖白、墨色和深茶绿体系。
- 首页、购物车、商品详情和个人中心的核心可见操作已再次检查，最小触控高度为 `44px`；浏览器控制台没有 error 或 warning。
- `375x667` 商品详情和结算页保留确认过的固定底部转化操作栏。滚动内容经过操作栏时会短暂位于其下方，但页面已有底部操作空间，所有内容都能继续滚动查看。
- 最新 `npm run release:client-redesign` 静态发布门禁 `13/13` 通过；关键交互单测已扩展为 `21` 个文件、`61` 个测试全部通过。
- 首屏共享 decoded CSS 已由约 `220.9KB` 降至约 `218.7KB`，回到原定 `200–220KB` 预算内；删除的是被后续规则完整覆盖的平板导航重复样式。
- 后台轮播页已为 7 个已审核主题增加逐项确认的“使用推荐双图”，并增加按首页展示顺序排列的 7 项专用双图修复队列；分类页为 7 个公开一级分类增加推荐主图审阅队列；快捷入口页为当前 5 个失效入口提供基于实时分类的修复建议，并增加含 1 个外部地址确认项的 6 项专用队列；三者都不执行静默批量写入。
- 首页缺图商品入口现在进入专用修复队列：一次加载全部 41 项、按首页曝光顺序排列、直接打开当前首项，保存真实图片后自动刷新并从队列移除；普通缺图筛选仍保留全库分页用途。合规入口直接定位到年龄确认分组，仍需人工切换并确认保存。
- 商城与管理后台已使用相互独立的固定外观运行时。两套生产包都不再生成 `vendor-next-themes`，也不包含旧的 `/theme/skins` 请求、皮肤缓存或皮肤预览运行时；后台保留独立的浅色/深色外观切换，不再读取客户端皮肤。
- 已删除前端旧皮肤 Provider、URL/草稿预览、主题工作室页面与组件、主题写入前端服务、预设皮肤数据和 `next-themes` 依赖；旧 PWA 所需的历史预设已迁移到服务端兼容模块，并只保留一个发布周期。

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

以下完整本地发布门禁已在历史右侧预览地址 `http://127.0.0.1:5174` 通过：

```bash
BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign
```

以下移动端和桌面端截图审计已在 `http://127.0.0.1:4194` 生成：

```bash
BASE_URL=http://127.0.0.1:4194 npm run capture:client-redesign
BASE_URL=http://127.0.0.1:4194 VIEWPORT=1280x800 npm run capture:client-redesign
```

以下历史移动端和桌面端截图审计已在右侧预览地址 `http://127.0.0.1:5174` 生成：

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
- `check:migrations`：179 个 up 迁移无前缀冲突；11 组历史重复编号被按既有规则忽略。
- `test:browser-compat`：3 个测试文件、23 个浏览器兼容测试全部通过。
- `theme:check`：严格模式退出码 0，前台固定客户端硬编码颜色发现数为 `0`；CSS 自定义属性、品牌官方色和生成式海报调色板分别按明确规则处理。
- `build:admin`：后台构建通过，说明本轮客户端共享样式/脚本调整没有打坏后台构建。
- `verify:dist`：`dist`、`admin-dist` 资源引用、PWA 和固定外观运行时隔离校验全部通过；商城 `217` 个、后台 `239` 个 JavaScript 资源中均未发现 `next-themes` 或旧皮肤接口残留。校验器在产物为空时会直接失败，避免空目录假通过。
- `check:client-redesign-scope`：客户端重构提交范围检查通过，自动覆盖密钥扫描、`.env` / 非 npm 锁文件 / 构建产物拦截、依赖新增拦截、路径边界和关键新增/删除文件引用完整性。
- `check:client-redesign-scope` 当前为纯 Node 实现，不依赖本机是否安装 `rg`。
- `git diff --check`：当前工作区无空白错误。
- `release:client-redesign`：本地发布门禁当前为 13 个静态步骤，除原有 lint、综合验证、前后台构建、资源/PWA、迁移、兼容、主题和范围检查外，还包含服务端固定客户端回归、关键交互单测、固定素材规格和生产内容修复清单验证。
- `npm run release:client-redesign`：2026-07-29 最新静态发布门禁 `13/13` 通过，用时约 `25.0` 秒。
- `npm run release:client-redesign -- --list`：未设置 `BASE_URL` 时列出 13 个静态步骤；设置 `BASE_URL` 后追加 4 个浏览器门禁，共 17 个步骤；再启用截图时共 19 个步骤。
- `BASE_URL=http://127.0.0.1:5174 npm run release:client-redesign`：旧版门禁历史记录为 13/13 通过，当时追加覆盖客户端路由烟测、45 入口 E2E、UI 重叠扫描和路由切换扫描。
- `BASE_URL=http://127.0.0.1:5174 CAPTURE_CLIENT_REDESIGN=1 npm run release:client-redesign`：旧版带截图门禁历史记录为 15/15 通过，生成了移动端和桌面端截图包。
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

当前工作区是客户端重构级别改动。2026-07-29 最新提交范围检查展开为 `368` 个路径，其中 `217` 个修改、`46` 个删除、`105` 个新增；自动扫描 `285` 个当前存在的文件，未发现警告或失败。按功能粗分：

- `src/modules/public`：覆盖客户端商品、交易、账户、内容、活动和异常页面。
- `src/components`：主要是客户端外壳、底部导航、页面头、入口图标、图片、弹层和支持组件。
- `src/styles`：固定客户端令牌、路由懒加载样式和旧覆盖层删除。
- `src/modules/storefront-v2`：首页、商品卡和商品详情的固定设计接入。
- `src/layouts`、`src/routes`、`src/constants`、`src/utils`、`src/main.tsx`：运行时接线、路由、布局和工具调整。
- `scripts`：包含 smoke、overlap、route transition、client e2e、截图、素材审计、生产内容只读审计、提交范围检查和发布门禁。
- `docs`：新增本审计文件、客户端重构提交与发布执行清单、客户端重构变更清单。
- `package.json`：新增客户端截图、发布范围、固定商城运行时校验和完整发布门禁命令。
- `.gitignore`：忽略 `design-previews/five-mall-skins-effect-preview/`，避免设计预览产物进入发布提交。

截图产物位于 `artifacts/`，已被忽略，不进入 git 状态。

## 提交风险审计

截至 2026-06-22 23:41 PDT，已对当前未提交范围做提交前风险核对：

- 高置信密钥扫描：扫描当前存在的 117 个变更文件，未发现 OpenAI/GitHub/AWS/Google/Slack token、private key block 或长字面量 secret。
- 环境文件检查：未发现 `.env`、`.env.*` 进入当前 git 变更范围。
- 依赖锁文件检查：`package-lock.json` 仅同步删除 `next-themes` 及其锁记录，没有新增依赖；`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb` 仍禁止进入发布范围。
- 构建产物检查：未发现 `dist`、`admin-dist` 或 `artifacts` 进入提交范围；最新截图包仍被 ignore。
- 路径边界检查：当前 118 个展开路径均落在预期发布桶内：`src/`、`scripts/`、`docs/`、`package.json`、`.gitignore`。
- 上述提交风险核对已固化为 `npm run check:client-redesign-scope`，并接入 `npm run release:client-redesign`。
- 最新自动检查结果：`changedEntries: 368`、`scannedFiles: 285`、`failures: []`、`warnings: []`；并已纳入 2026-07-29 的 `13/13` 静态发布门禁。

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
BASE_URL=http://127.0.0.1:5188 npm run release:client-redesign
git diff --check
npm run check:client-redesign-scope
git status --porcelain=v1 -uall
```

建议 staging 范围：

- 包含：`.gitignore`、`click-send-shop-main/click-send-shop-main/package.json`、`click-send-shop-main/click-send-shop-main/package-lock.json`、`click-send-shop-main/click-send-shop-main/src/`、`click-send-shop-main/click-send-shop-main/scripts/`、`click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_RELEASE_AUDIT.md`、`click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_RELEASE_RUNBOOK.md`、`click-send-shop-main/click-send-shop-main/docs/CLIENT_REDESIGN_CHANGE_MANIFEST.md`。
- 不包含：`artifacts/`、`dist/`、`admin-dist/`、`.env*`、非 npm 锁文件、任何本地预览产物。

## 剩余未完成项

截至当前，本地客户端重构与本地发布门禁已经完成；真正剩余的是发布流程和环境验收项：

- `0` 个已知客户端页面缺口：设计资料要求的 40 个移动端页面已纳入当前路由或验证脚本覆盖。
- `41` 个生产商品素材缺口：逐项详情审计确认均没有封面、图库、规格图或详情图可恢复，必须补充真实商品图片；证据见 `docs/production-product-media-depth.json`。
- `1` 组生产接口安全修复：当前线上公开商品响应会暴露成本价、条码和库存控制字段，客户订单还会返回经营成本与利润；候选服务端已统一公开商品格式，并将客户订单与后台经营数据格式分离，购物车、收藏、足迹和订单回归测试均已补齐，但尚未部署。
- `1` 个生产合规配置阻断：线上同时公开 `正品烟草`、`正品酒水`，但站点年龄确认仍为关闭；候选后台发布准备页已纳入检查，发布前需要确认并启用 `18+` 年龄门槛。
- `1` 个提交范围确认：工作区未提交记录仍然很多，发布前需要人工确认 commit 范围，不能把无关改动混进发布。
- `1` 个目标环境复验：如果发布到 staging/production，需要在对应环境再跑客户端浏览器门禁。
- `1` 个后台登录态复验：如果要把后台一并纳入发布验收，需要提供 `ADMIN_BASE_URL` 和 `ADMIN_PASSWORD`。
- `1` 个目标环境交易联调项：结算、订单、物流、售后和会员资产已经完成安全内存数据下的桌面与移动端视觉复验，但仍需使用目标环境的非生产测试账号验证真实接口、权限和状态流转。
- `1` 个人工视觉抽查项：移动端和桌面端截图包已生成，发布前建议人工逐页快速看一遍完整 PNG。

本地发布门禁用法：

  - `npm run release:client-redesign -- --list`：只列出将执行的检查。
  - `npm run release:client-redesign`：执行本地静态/构建/迁移/兼容/主题扫描门禁。
  - `BASE_URL=<storefront> npm run release:client-redesign`：在指定前台地址追加客户端路由、E2E、重叠和路由切换扫描。
  - `BASE_URL=<storefront> CAPTURE_CLIENT_REDESIGN=1 npm run release:client-redesign`：额外生成移动端和桌面端截图包。

本地 API 登录态、购物车种子和结算选券弹层已验收；如果发布到 staging/production，还需要使用对应环境再跑一次：

  - `BASE_URL=<storefront> API_BASE_URL=<api> SKIP_ADMIN=1 npm run audit:overlap`
  - `BASE_URL=<storefront> node scripts/verify-client-e2e.mjs`

390px 移动端和 1280px 桌面端均已生成截图包并做过一轮 contact sheet 快速抽查。六个核心页面、登录注册、公共内容页以及登录态交易和会员资产页面都已完成专属桌面布局或安全 fixture 实图复验。发布前仍需使用目标环境的非生产测试账号验证真实结算、订单、物流、退款和会员状态流转；本地 fixture 只证明界面和交互状态，不替代接口集成与资金链路验收。

## 第一阶段视觉终验记录（2026-07-30）

- in-app Browser 在 `375x667`、`390x844`、`768x1024`、`1280x800`、`1440x900` 五档视口完成 65 组页面顶部与底部检查，横向溢出、破图、致命空页和网络错误均为 `0`。
- 移动端另完成 26 组触控检查，当前可见操作目标小于 `44px` 的结果为 `0`。
- 已实测分类切换与筛选、购物车全选、商品详情透明顶栏滚动转换、订单更多操作；修复个人中心桌面通知角标脱离容器，以及无附加操作订单仍显示空“更多”面板的问题。
- 本地视觉 fixture 补齐分类、商品、活动与首页活动的正常状态；其中 7 张商品图只用于 QA，不会替换生产商品数据。
- 视觉证据位于 `artifacts/phase1-visual-audit-20260730/`。
- `npm run release:client-redesign` 在 `29.4s` 内通过 `13/13` 项静态门禁。由于未传 `BASE_URL`，门禁中的可选浏览器脚本未启动；本阶段以用户选定的 in-app Browser 五档矩阵作为本地视觉证据。
- 第一阶段结论仅适用于本地候选版。尚未 commit、push、部署或修改生产数据，也未完成目标环境真实支付、订单、物流、退款和会员资产联调。

## 发布边界

本文件记录客户端重构提交前候选状态；实际 commit、push、部署和生产验收状态以当次执行记录与 GitHub Actions / 线上复验结果为准。
