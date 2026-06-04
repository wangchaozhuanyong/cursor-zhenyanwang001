# AGENTS.md

## Codex 工作总原则

你是本项目的代码助手。你的目标是用最小必要上下文、最小必要修改，准确完成用户指定任务。

除非用户明确要求，不要扩大任务范围，不要主动重构无关代码，不要顺手优化无关功能。

`AGENTS.md` 是 Codex 每次工作的总入口。详细规则放在 `docs/` 里的专项文档中；处理任务时先判断任务类型，再只读取相关文档，不要把所有 docs 一次性读完。完整 `Task Scope` 模板和 `/plan` 阶段规则见 `docs/PROJECT_GOVERNANCE.md`。

---

## 一、节约 Token 的执行规则

1. 先判断任务类型，再定位文件。
   - 每次任务开始前，先判断属于 backend、frontend、UI/UX、API、database、data consistency、concurrency、security、deployment/cache、i18n、docs、CI/checks 中哪一类。
   - 根据任务类型只读取相关 docs。
   - 不要为了一个小任务通读全部文档。

2. 先定位，再读取文件。
   - 优先使用 grep / rg / 文件名搜索定位相关模块。
   - 不要一开始就全项目扫描。
   - 不要一次性读取大文件。
   - 不要重复读取同一个文件，除非确实需要确认上下文。

3. 只看和当前任务直接相关的文件。
   - 用户问上传图片问题，就优先查看上传组件、上传接口、存储配置、提示逻辑。
   - 用户问 UI 重叠问题，就优先查看对应页面、布局组件、样式文件。
   - 用户问皮肤功能，就优先查看主题配置、皮肤切换逻辑、CSS 变量、前端状态管理。

4. 不做无关预防性修改。
   - 不要为了“可能发生的问题”提前改一堆代码。
   - 不要把一个小 bug 扩展成全系统重构。
   - 不要修改没有被要求、没有被证明有问题的模块。

5. 不输出大段无用解释。
   - 除非用户要求详细解释，否则汇报保持简洁。
   - 不要粘贴完整文件代码。
   - 只说明关键修改点、影响范围、验证方式。

---

## 二、代码修改规则

1. 修改前必须先阅读真实代码。
   - 禁止根据猜测修改。
   - 禁止根据记忆编造文件结构。
   - 禁止假设某个文件存在后直接修改。

2. 每次只做最小必要修改。
   - 优先局部修复。
   - 避免大范围重命名。
   - 避免无关格式化。
   - 避免改动和任务无关的逻辑。

3. 保持现有项目风格。
   - 使用项目已有的命名方式。
   - 使用项目已有的组件结构。
   - 使用项目已有的状态管理方式。
   - 使用项目已有的 UI 风格和错误提示方式。

4. 不破坏现有功能。
   - 修改前判断当前逻辑依赖。
   - 修改后检查是否影响其他页面、接口、组件。
   - 如果存在风险，必须明确说明。

---

## 三、不确定时的处理方式

1. 不知道就说不知道。
   - 不要编造原因。
   - 不要编造已经完成的步骤。
   - 不要编造测试结果。

2. 如果原因不确定，先列出最可能的 2-3 个原因。
   - 说明每个原因对应需要检查的文件或逻辑。
   - 然后优先检查最可能的原因。
   - 不要无限制扩大排查范围。

3. 如果没有验证条件，必须说明。
   - 例如：没有本地数据库、没有环境变量、没有后端服务、无法启动项目。
   - 不要声称“已完全验证”。

---

## 四、汇报规则

每次完成任务后，只按照下面格式汇报：

### 已完成
- 修改了什么
- 修复了什么问题

### 修改文件
- 列出修改过的文件路径

### 验证情况
- 运行了哪些检查或测试
- 哪些没有验证
- 如果需要用户手动测试，说明具体测试步骤

### 风险提醒
- 如果没有风险，就写“暂无明显风险”
- 如果有风险，说明可能影响哪里

不要写长篇总结，不要输出无关解释，不要重复描述用户已经知道的问题。

---

## 五、禁止行为

禁止以下行为：

1. 没看文件就修改。
2. 没验证就说已验证。
3. 没完成就说已完成。
4. 为了一个小问题重构整个模块。
5. 顺手修改无关 UI、样式、文案、配置。
6. 一次性读取大量无关文件。
7. 输出完整大文件内容。
8. 编造项目结构、接口、变量名、函数名。
9. 把不确定的判断说成确定结论。
10. 没有用户要求时主动添加新功能。
11. 为了一个任务顺手修其他无关问题。

---

## 六、优先执行方式

处理任何任务时，优先按照这个流程：

1. 先输出 `Task Scope`，说明本次必须做什么、明确不做什么、哪些属于待确认。
2. 判断任务类型，并按下方规则读取相关 docs。
3. 使用搜索工具定位相关文件。
4. 阅读最少数量的相关文件。
5. 找到真实原因或真实现状。
6. 输出对应任务计划。
7. 做最小必要修改。
8. 运行最小必要验证。
9. 完成后输出对应 `Compliance Report`。

没有运行测试或检查时，必须明确说明原因，不能声称已经验证。

如果用户使用 `/plan` 或明确要求先规划，本阶段只允许读取、分析和输出计划；不允许创建文件、修改文件或直接写代码，除非用户随后明确确认执行。

---

## 七、任务类型和 docs 读取规则

所有任务都先读本文件。更详细的治理总纲见 `docs/PROJECT_GOVERNANCE.md`，但也只在任务需要时读取相关章节。

| 任务类型 | 必读或优先读取 | 开始前必须输出 |
| --- | --- | --- |
| 后端任务 | `docs/ARCHITECTURE.md` | `Architecture Decision` |
| 前端任务 | `docs/FRONTEND_ARCHITECTURE.md` | `Frontend Change Plan` |
| UI/UX 任务 | `docs/DESIGN_SYSTEM.md` | `UI/UX Change Plan` |
| API 任务 | `docs/API_CONTRACTS.md` | `API Contract Plan` |
| 数据库任务 | `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`，必要时 `docs/ARCHITECTURE.md` | `Data Change Plan` |
| 数据一致性/并发任务 | `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md` | `Data Consistency / Concurrency Plan` |
| 安全任务 | `docs/SECURITY_GOVERNANCE.md` | `Security Plan` |
| 质量检查或 CI 任务 | `docs/QUALITY_GATES.md` | `Quality Gate Plan` |
| 部署、缓存、PWA、生产白屏 | `docs/WEBSITE_ARCHITECTURE.md`，必要时读取缓存和部署文档 | `Deployment / Cache Plan` |
| i18n / 编码任务 | `docs/encoding-and-i18n-guardrail.md`，必要时 `docs/QUALITY_GATES.md` | `I18n / Encoding Plan` |
| 专项审计任务 | `docs/CODEX_TASK_PROMPTS.md` 的对应章节 | 对应专项计划 |
| 文档任务 | 当前任务相关 docs | `Documentation Scope` |

读取 `docs/CODEX_TASK_PROMPTS.md` 时，只读取本次任务对应章节，不要整份读取。

任务完成后必须输出对应报告：

- 后端任务输出 `Architecture Compliance Report`。
- 前端任务输出 `Frontend Compliance Report`。
- UI/UX 任务输出 `UI/UX Compliance Report`。
- API 任务输出 `API Contract Report`。
- 数据任务输出 `Data Consistency Report`。
- 安全任务输出 `Security Report`。
- 质量检查或 CI 任务输出 `Quality Gate Report`。
- 文档任务输出本次文档变更报告。

---

## 八、用户项目偏好

本项目重视：
- 稳定性
- 少改动
- 少 token 消耗
- 不破坏现有功能
- 不重构无关代码
- 真实汇报
- 先看源码再判断
- 客户端 UI 不重叠
- 上传、提示、皮肤、商品、订单等核心功能要稳定

---

## 九、后端应用架构强制规范

本项目后端不是自由结构项目，必须严格遵守 Modular Monolith + Layered Architecture。

后端详细硬规范以 `docs/ARCHITECTURE.md` 为准；本节只保留 Codex 必须随时记住的核心约束。

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

每个模块必须保留标准四层目录：

```text
routes/
controller/
service/
repository/
```

可按需增加 `schemas/`、`jobs/`、`rules/`、`adapters/`、`providers/` 等辅助目录，但新增请求处理、业务逻辑、数据库访问代码必须回到标准四层。

分层职责必须严格遵守：

- `routes`：只负责路由绑定和中间件挂载，不写业务逻辑，不查数据库。
- `controller`：只负责接收参数、调用本模块 service、返回结果，不写业务逻辑，不调用 repository。
- `service`：只负责业务逻辑、状态流转和流程编排，不直接写 SQL，不直接访问 `db.query / pool.query / conn.execute`。
- `repository`：只负责数据库读写，不做业务判断，不决定业务状态，不调用 controller/routes。

API 路径必须遵守：

- 所有业务接口必须统一以 `/api` 开头。
- 管理后台接口必须使用 `/api/admin/*`。
- 健康检查接口固定为 `/api/health/live` 和 `/api/health/ready`。

跨模块规则：

- 写代码前必须先判断模块归属，再判断层级归属。
- 如果无法判断模块归属，必须停止，不允许自己创建新模块。
- 如果需要跨模块调用，必须停止说明风险；不允许直接 import 其他模块的 controller/service/repository/routes 内部实现。
- 跨模块协作只能通过目标模块入口暴露的公开能力，或先由用户确认新的编排方案。
- 如果任务会导致 controller/service/repository/routes 职责混写，必须停止。

允许例外：

- `server/src/app.js` 和 `server/src/index.js` 只用于应用启动、全局中间件和总路由挂载。
- `server/src/config`、`server/src/middleware`、`server/src/errors`、`server/src/utils` 只放通用能力。
- `server/scripts`、数据库迁移、备份、恢复、部署脚本不属于业务模块，但不能承载常规业务逻辑。

## 十、Architecture Decision 模板

以后任何后端代码任务，在写代码之前必须先输出：

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

如果本次任务不属于后端业务模块，也必须明确写清楚原因，例如“项目级文档 / 架构检查脚本 / CI 配置，不进入业务模块”。

## 十一、Architecture Compliance Report 模板

每次完成后必须补充架构合规报告：

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

后端相关改动完成后，优先在 `server` 目录运行：

```bash
npm run arch:check
```

如果没有运行，必须明确说明原因。

---

## 十二、整站架构参考规范

处理前端、管理后台、API 调用、部署、缓存、CI、静态资源、PWA、CDN、生产白屏、chunk 加载失败、路由异常等问题时，必须先参考：

```text
docs/WEBSITE_ARCHITECTURE.md
```

专项任务继续读取对应文档：

```text
docs/FRONTEND_ARCHITECTURE.md
docs/DESIGN_SYSTEM.md
docs/API_CONTRACTS.md
docs/DATA_CONSISTENCY_AND_CONCURRENCY.md
docs/SECURITY_GOVERNANCE.md
docs/QUALITY_GATES.md
```

使用规则：

- 如果是用户端页面问题，先判断是否属于 `src/modules/public`、用户端 routes、用户端 services、用户端 stores 或通用组件。
- 如果是管理后台问题，先判断是否属于 `src/modules/admin`、后台 routes、后台 services、后台 layout、权限或后台 i18n。
- 如果是 API 调用问题，先确认前端是否通过 `VITE_API_BASE_URL=/api` 和 `src/api/request.ts` 调用后端。
- 如果是生产白屏、chunk 加载失败、路由异常，必须同时检查前端代码、构建产物、HTML 缓存头、assets 缓存、CDN、部署脚本和运行时恢复逻辑。
- 如果是部署或缓存问题，不要只改页面代码；必须先判断影响范围和回滚方式。
- 如果问题涉及订单、支付、库存、优惠券、积分、权限、安全、用户数据，最终规则必须以后端为准，不能只在前端修。

本文档和 `docs/ARCHITECTURE.md` 的关系：

- `docs/ARCHITECTURE.md` 是后端硬规范。
- `docs/WEBSITE_ARCHITECTURE.md` 是整站总览和前后端边界规范。
- 后端业务改动必须优先遵守 `docs/ARCHITECTURE.md`。
- 前端、部署、缓存、CI 类问题必须同时参考 `docs/WEBSITE_ARCHITECTURE.md`。

## 十三、新增和修复的验证要求

新增功能或修复功能时，必须按影响范围选择验证方式。

涉及以下高风险业务时，必须运行对应测试或明确说明为什么无法验证：

- 订单：订单创建、取消、支付状态、发货、收货、售后、超时任务。
- 支付：支付渠道、支付意图、支付回调、退款、对账。
- 库存：商品库存、SKU 库存、库存扣减、库存恢复、库存同步。
- 优惠券：领券、用券、退券、活动券、人群券。
- 积分和会员：积分发放、积分抵扣、积分过期、会员等级、奖励结算。
- 用户和权限：登录、注册、后台权限、MFA、CSRF、敏感操作。
- 报表和导出：金额、数量、时间范围、CSV 导出、统计口径。
- 上传和媒体：图片上传、视频转码、对象存储、公开访问 URL。

如果修改只涉及文档或纯检查脚本，可以不跑完整业务测试，但必须至少运行对应的静态检查，并说明没有改业务代码。

常用验证命令：

```bash
cd server && npm run arch:check
cd click-send-shop-main/click-send-shop-main && npm run check:api-paths
```

## 十四、固定审查清单

每次大功能、新模块倾向改动、跨层问题、生产问题、部署缓存问题开始前，必须先对照入口文件和相关 docs：

```text
AGENTS.md
docs/PROJECT_GOVERNANCE.md
本次任务对应的专项文档
```

审查重点：

- 是否属于现有 24 个后端模块。
- 是否会破坏 routes/controller/service/repository 分层。
- 是否会新增或改变 API 路径。
- 是否涉及前端用户端、管理后台、部署、缓存或 CI。
- 是否涉及订单、支付、库存、优惠券、积分、权限等高风险业务。
- 是否需要运行专项测试，或说明无法验证的原因。

---

## 十五、与 Cursor 助手的发布分工

- **Codex**：日常开发，push 开发分支即可；不要与 Cursor 同时在服务器跑 `ci-deploy`。
- **Cursor**：只提交/发布本会话改动的文件；线上统一 **`main`**，细则见 `.cursor/rules/cursor-release-workflow.mdc`。
