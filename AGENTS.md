# AGENTS.md

## 项目基本信息

- 项目名称：大马通 / Click Send Shop
- 项目用途：马来西亚华人一站式生活服务与优选商城，包含前台商城、用户中心、后台管理、订单、优惠券、积分、内容、上传、备份等能力。
- 主要技术栈：React + TypeScript + Vite + Express + MySQL
- 前端框架：React 18、React Router、Vite
- 后端框架：Node.js、Express 5
- 包管理器：npm（使用 package-lock.json）
- 样式方案：Tailwind CSS、shadcn/ui 风格组件、Radix UI、lucide-react
- 数据库：MySQL 8.0
- 登录方式：JWT / HttpOnly Cookie，支持短信 OTP、OAuth、WebAuthn/MFA 等扩展
- 部署平台：AWS EC2 + PM2 + Nginx + GitHub Actions CI/CD
- 生产域名：https://damatong.net
- 生产项目目录：`/var/www/click-send-shop`
- GitHub 仓库：`wangchaozhuanyong/cursor-zhenyanwang001`

## 常用命令

- 安装前端依赖：`cd click-send-shop-main/click-send-shop-main && npm ci`
- 安装后端依赖：`cd server && npm ci`
- 本地前端开发：`cd click-send-shop-main/click-send-shop-main && npm run dev`
- 本地后端开发：`cd server && npm run dev`
- 启动 AWS 数据库隧道：`scripts/start-aws-db-tunnel.sh`
- 停止 AWS 数据库隧道：`scripts/stop-aws-db-tunnel.sh`
- 启动本地 MySQL：`scripts/start-local-mysql.sh`
- 停止本地 MySQL：`scripts/stop-local-mysql.sh`
- 前端打包构建：`cd click-send-shop-main/click-send-shop-main && npm run build`
- 前端完整验证：`cd click-send-shop-main/click-send-shop-main && npm run verify`
- 前端代码检查：`cd click-send-shop-main/click-send-shop-main && npm run lint`
- 前端类型检查：`cd click-send-shop-main/click-send-shop-main && npm run typecheck`
- 后端类型检查：`cd server && npm run typecheck`
- 后端单元测试：`cd server && npm run test:unit`
- 后端架构检查：`cd server && npm run arch:check`
- 数据库迁移：`cd server && npm run migrate`
- 查看迁移状态：`cd server && npm run migrate:status`

## 项目结构

- 当前 5174 候选测试目录：`/Users/wangchao/Desktop/真烟网/cursor-zhenyanwang001-main-merge`
- 功能分支 worktree 示例：`/Users/wangchao/Desktop/真烟网/cursor-zhenyanwang001-work`、`/Users/wangchao/Desktop/真烟网/cursor-zhenyanwang001-ui-ux`
- 前端目录：`click-send-shop-main/click-send-shop-main`
- 前端页面/路由目录：`click-send-shop-main/click-send-shop-main/src`
- 前端组件目录：`click-send-shop-main/click-send-shop-main/src/components`
- 前端接口/service 目录：`click-send-shop-main/click-send-shop-main/src/services`
- 前端状态管理目录：`click-send-shop-main/click-send-shop-main/src/stores`
- 前端静态资源目录：`click-send-shop-main/click-send-shop-main/public`
- 后端目录：`server`
- 后端入口：`server/src/index.js`、`server/src/app.js`
- 后端模块目录：`server/src/modules`
- 后端接口/路由目录：`server/src/modules/*/routes`、`server/src/routes`
- 后端服务层目录：`server/src/modules/*/service`
- 后端数据访问目录：`server/src/modules/*/repository`
- 数据库迁移目录：`server/migrations`
- 部署脚本目录：`deploy`、`scripts`
- GitHub Actions：`.github/workflows`

## 工作总原则

- 目标是用最小必要上下文、最小必要修改，准确完成用户指定任务。
- 除非用户明确要求，不要扩大任务范围，不要主动重构无关代码，不要顺手优化无关功能。
- 修改前必须先阅读真实代码，禁止根据猜测、记忆或想象的文件结构修改。
- 优先使用 `rg` / 文件名搜索定位相关模块，再读取最少数量的相关文件。
- 只看和当前任务直接相关的文件，不要为了小任务通读全部 docs。
- 不确定就说不确定；没有验证条件必须说明，不能声称已经完全验证。
- 如果用户只要求计划、审查或解释，不要直接修改代码。

## 任务类型与必读文档

处理任务时先判断类型，再读取对应文档：

| 任务类型 | 必读或优先读取 |
| --- | --- |
| 后端任务 | `docs/ARCHITECTURE.md` |
| 前端任务 | `docs/FRONTEND_ARCHITECTURE.md` |
| UI/UX 任务 | `docs/DESIGN_SYSTEM.md` |
| API 任务 | `docs/API_CONTRACTS.md` |
| 数据库 / 数据一致性 / 并发 | `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`，必要时 `docs/ARCHITECTURE.md` |
| 安全任务 | `docs/SECURITY_GOVERNANCE.md` |
| 质量检查 / CI | `docs/QUALITY_GATES.md` |
| 部署 / 缓存 / PWA / 生产白屏 | `docs/WEBSITE_ARCHITECTURE.md`，必要时读取部署和缓存文档 |
| i18n / 编码 | `docs/encoding-and-i18n-guardrail.md`，必要时 `docs/QUALITY_GATES.md` |
| 文档任务 | 当前任务相关 docs |

更完整治理规则见 `docs/PROJECT_GOVERNANCE.md`，但只在任务需要时读取相关章节。

## 后端架构硬规范

本项目后端必须遵守 Modular Monolith + Layered Architecture。详细规范以 `docs/ARCHITECTURE.md` 为准。

后端固定为 24 个模块：

```text
admin
analytics
auth
cart
dataRetention
health
home
logistics
loyalty
marketing
media
monitoring
myinvois
order
payment
privacy
product
pwa
search
seo
siteCapabilities
telegram
theme
user
```

每个模块标准四层目录：

```text
routes/
controller/
service/
repository/
```

分层职责：

- `routes`：只负责路由绑定和中间件挂载，不写业务逻辑，不查数据库。
- `controller`：只负责接收参数、调用本模块 service、返回结果，不写业务逻辑，不调用 repository。
- `service`：只负责业务逻辑、状态流转和流程编排，不直接写 SQL，不直接访问 `db.query / pool.query / conn.execute`。
- `repository`：只负责数据库读写，不做业务判断，不决定业务状态，不调用 controller/routes。

API 路径规则：

- 所有业务接口必须统一以 `/api` 开头。
- 管理后台接口必须使用 `/api/admin/*`。
- 健康检查接口固定为 `/api/health/live` 和 `/api/health/ready`。

跨模块规则：

- 写代码前必须先判断模块归属，再判断层级归属。
- 如果无法判断模块归属，必须停止并说明，不允许自己创建新模块。
- 不允许直接 import 其他模块的 controller/service/repository/routes 内部实现。
- 跨模块协作只能通过目标模块入口暴露的公开能力，或先由用户确认新的编排方案。

后端代码任务开始前输出：

```text
Architecture Decision:
1. Target module:
2. Why this module:
3. Target layer:
4. Why this layer:
5. Files allowed to edit:
6. Files forbidden to edit:
7. API paths affected:
8. Database access location:
9. Cross-module dependency risk:
10. Business behavior impact:
```

后端代码任务完成后输出：

```text
Architecture Compliance Report:
1. Target module followed:
2. Layer boundary followed:
3. Files changed within allowed scope:
4. API path rule followed:
5. Database access rule followed:
6. Cross-module rule followed:
7. Business behavior unchanged:
8. arch:check result:
9. Remaining architecture risks:
```

后端相关改动完成后，优先运行：

```bash
cd server && npm run arch:check
```

如果没有运行，必须明确说明原因。

## 前端与页面规则

- 页面风格必须和当前项目保持一致。
- 必须适配手机端和桌面端。
- 需要考虑加载状态、错误状态、空状态。
- 表单要有基础校验。
- 注意基础无障碍体验，例如语义化标签、按钮可点击、输入框有 label。
- 前端 UI 不得出现明显重叠、溢出、按钮文字被截断等问题。
- 弹窗、确认框、底部抽屉等操作区里，带明确动作含义的按钮必须采用“图标在左、文字在右”的水平排列；取消、关闭、确认、保存、删除、开启、下载等按钮不能只放纯文字，除非是空间极小的纯图标按钮且已有 `aria-label`。
- 管理后台少内容弹窗必须使用紧凑中间弹窗：例如确认操作、填写原因、重置密码、禁用登录、库存入库/出库/盘点、单字段备注等，宽度控制在 `sm/md`，高度自适应，不要让 1-3 个字段的表单占满横向大弹窗或默认 `70vh`。
- 管理后台中大型内容必须使用右侧抽屉或明确的大表单弹层：例如商品编辑、分类编辑、订单详情、用户详情、主题配置、Banner 编辑、CSV 导入、复杂权限配置、多 Tab、多图片、多列表等。不要把复杂编辑塞进小确认弹窗。
- 后台弹窗底部操作统一左取消、右确认；危险操作使用危险色；确认、保存、删除、开启、重置等按钮要保留清晰动词。
- 前台「新品上市」不再单独设计专题页；首页新品更多、商品卡新品标签、旧 `/new-arrivals` 入口都必须统一进入 `/categories?is_new=1&home_new_arrivals_rule=1`，并在分类页固定显示「全部」「新品」两个系统入口。
- 后台管理页优先保持信息密度、清晰表格、稳定操作流。
- 前台商城页优先保证移动端体验、商品浏览、下单路径清晰。
- 如果是 API 调用问题，先确认前端是否通过 `VITE_API_BASE_URL=/api` 和统一 request/service 层调用后端。
- 如果是生产白屏、chunk 加载失败、路由异常，必须同时检查前端代码、构建产物、HTML 缓存头、assets 缓存、CDN、部署脚本和运行时恢复逻辑。
- 如果问题涉及订单、支付、库存、优惠券、积分、权限、安全、用户数据，最终规则必须以后端为准，不能只在前端修。

## 代码规范

- 遵守当前项目已有的文件结构和命名方式。
- 优先复用已有组件，不要重复造轮子。
- 优先复用已有工具函数、hooks、services。
- 保持代码简单、清晰、可维护。
- 只修改和当前任务有关的文件。
- 不做无关重构。
- 不随意格式化无关文件。
- 修改后按影响范围运行最小必要验证。

## 高风险验证要求

涉及以下业务时，必须运行对应测试或明确说明为什么无法验证：

- 订单：订单创建、取消、支付状态、发货、收货、售后、超时任务。
- 支付：支付渠道、支付意图、支付回调、退款、对账。
- 库存：商品库存、SKU 库存、库存扣减、库存恢复、库存同步。
- 优惠券：领券、用券、退券、活动券、人群券。
- 积分和会员：积分发放、积分抵扣、积分过期、会员等级、奖励结算。
- 用户和权限：登录、注册、后台权限、MFA、CSRF、敏感操作。
- 报表和导出：金额、数量、时间范围、CSV 导出、统计口径。
- 上传和媒体：图片上传、视频转码、对象存储、公开访问 URL。
- 交易重构链路：订单幂等、pricing service、promotion rule engine、inventory lock service、Billplz / FPX、物流快照必须以后端为准；前端不得计算最终金额、优惠资格、库存扣减或支付成功状态。

文档或纯检查脚本改动可以不跑完整业务测试，但必须至少做静态检查或说明未改业务代码。

## 分支、发布、存档规则

- 长期分支只保留 `main`。
- 日常开发使用短分支：`feature/<short-name>`、`fix/<short-name>`、`chore/<short-name>`、`hotfix/<short-name>`。
- 固定一个本地测试入口：`http://127.0.0.1:5174`。5174 只代表“当前候选测试区”，不是所有功能分支的自动预览。
- 多窗口开发时，每个窗口可以在自己的 worktree/分支里改代码，但不要各自启动新的“正式测试入口”。某个分支需要用户验收时，必须先把该分支已提交内容合入 5174 候选测试区，再启动/刷新 `5174`。
- 一个测试网址无法同时显示多个分支的未提交修改。Git 只能稳定合并已经 commit 的内容；未 commit 的改动必须先在对应分支提交，才能进入 5174 候选测试区。
- 5174 候选测试脚本：`bash scripts/use-5174-test.sh <branch>`。例如 `bash scripts/use-5174-test.sh work-ui-ux work-huo-dong` 会把这些已提交分支合入当前候选区并重启 5174；脚本不会 push、不会部署、不会同步数据库。
- 功能分支流程：开发修改 → 检查改动 → `commit` → `push` 功能分支。功能分支只保存开发记录，不直接发布线上。
- 5174 验收流程：功能分支完成 commit → 合入 5174 候选测试区 → 用户只访问 `http://127.0.0.1:5174` 测试 → 确认后再合并到 `main`。
- 发布流程：合并到 `main` → `push origin main` → CI 通过 → GitHub Actions/服务器从 `origin/main` 发布 → 健康检查。
- 合并到 `main` 后由 GitHub Actions 自动部署。除非明确修复发布问题，不要在 `main` 上临时改代码再提交。
- 线上发布只认 `origin/main`，不要从 `work-ui-ux`、`work-huo-dong` 或其他功能分支直接部署。
- 本地测试数据库和线上数据库分离。发布代码不等于同步数据库；不要把本地测试数据同步到线上，除非用户明确要求。
- 发布成功后可打 release tag：`release/YYYYMMDD-<short-name>`。
- 大整理或高风险操作前打 archive tag：`archive/pre-cleanup-YYYYMMDD`、`archive/pre-hotfix-YYYYMMDD-HHMM`。
- 详细规则见：`docs/BRANCH_RELEASE_GUIDE.md`。

## 本地数据库说明

- 本地可使用 MySQL 8.0。
- 也可通过 SSH 隧道连接 AWS MySQL。
- AWS 数据库隧道本地地址：`127.0.0.1:3307`。
- 启动命令：`scripts/start-aws-db-tunnel.sh`。
- 注意：如果本地后端连接 AWS 数据库，本地后台操作会影响线上真实数据。

## 部署说明

- 自动部署：推送 `main` 后，GitHub Actions CI 成功会触发 Deploy gc-api。
- 手动部署：

```bash
cd /var/www/click-send-shop
git fetch --prune origin
git checkout main
git reset --hard origin/main
AUTO_ROLLBACK=1 bash deploy/ci-deploy.sh
```

- 生产健康检查：

```bash
curl -fsS https://damatong.net/api/health/ready
```

## 禁止事项

- 不要未经允许新增依赖。
- 不要未经允许修改数据库结构。
- 不要未经允许修改登录、支付、部署、环境变量配置。
- 不要硬编码任何密钥。
- 不要把 `.env`、私钥、数据库密码提交到仓库。
- 不要修改无关功能。
- 不要删除重要文件，除非用户明确同意。
- 不要直接操作生产数据库，除非用户明确要求并说明风险。
- 不要强推 `main`。
- 不要保留长期 release 分支，除非用户明确需要。
- 不要与其他助手同时在服务器跑 `ci-deploy`。

## 汇报与完成标准

完成后按以下结构简洁汇报：

```text
已完成
- 修改了什么

修改文件
- 文件路径

验证情况
- 运行了哪些检查或测试
- 哪些没有验证及原因

风险提醒
- 暂无明显风险 / 具体风险
```

完成标准：

- 功能已经实现。
- 代码风格和项目一致。
- 已运行相关检查命令，或说明未运行原因。
- 已说明修改了哪些文件。
- 已说明验证情况。
- 已说明是否还有风险或后续事项。
