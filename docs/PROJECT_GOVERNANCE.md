# Project Governance Baseline

本文档是本项目的工程治理总纲。它负责说明 Codex 和开发者在本仓库里应该先读什么、怎么判断任务范围、哪些文件能改、哪些文件不能改、做完后如何验证和汇报。

本文件不替代专项文档。遇到后端、前端、API、数据、安全、设计系统、质量门禁等具体问题时，必须继续读取对应文档。

## 1. 项目治理目标

- 让每次改动都先定位真实根因，再做最小必要修改。
- 让后端继续遵守 Modular Monolith + Layered Architecture。
- 让前端用户端、管理后台、API 请求层、状态管理、i18n、theme/skin 各自保持边界清楚。
- 让 API response、数据库、订单、支付、库存、会员、权限等高风险内容不会被顺手改坏。
- 让文档、检查脚本、CI、部署规则之间有清楚的主从关系，避免重复冲突。
- 让 Codex 每次任务都能输出清楚的计划、验证结果和合规报告。

## 2. Codex 工作总原则

每次任务都必须先读 `AGENTS.md`。`AGENTS.md` 是入口文件，负责给出当前仓库对 Codex 的基本要求。

每次任务还必须按任务类型读取相关 docs。不要一次性读取所有文档，也不要读取和当前任务无关的大文件。正确方式是先判断任务类型，再按最小必要范围读取。

所有判断必须基于当前源码、配置、路由、脚本、测试和文档。禁止根据记忆或猜测编造目录、接口、字段、模块名。

没有完成就说没有完成。没有验证就说没有验证。验证失败要说明失败点。不确定的地方必须明确列为待确认。

## 3. 文档主从关系

- `AGENTS.md`: Codex 工作入口和基础行为要求。
- `docs/PROJECT_GOVERNANCE.md`: 项目治理总纲。
- `docs/ARCHITECTURE.md`: 后端架构硬规范，后端任务优先遵守。
- `docs/WEBSITE_ARCHITECTURE.md`: 整站总览，说明前后端、部署、缓存、CI 的整体关系。
- `docs/FRONTEND_ARCHITECTURE.md`: 前端工程规范。
- `docs/DESIGN_SYSTEM.md`: UI/UX、设计系统、theme/skin 规则。
- `docs/API_CONTRACTS.md`: 前后端 API 契约规则。
- `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`: 数据一致性、并发、事务、幂等规则。
- `docs/SECURITY_GOVERNANCE.md`: 安全治理规则。
- `docs/QUALITY_GATES.md`: 验证命令和质量门禁。
- `docs/encoding-and-i18n-guardrail.md`: 编码、乱码、后台 i18n 和文案完整性规则。
- `docs/CODEX_TASK_PROMPTS.md`: 长期任务提示词索引，不是每次都要读取。

如果文档之间出现冲突，优先级是：用户本次明确要求 > `AGENTS.md` > 当前任务专项文档 > 总览文档 > 历史迁移说明。

## 4. 禁止无关读取

开始任务时应先用 `rg`、文件名搜索或目录清单定位相关范围。禁止为了一个小问题一次性通读所有 docs、所有 modules、所有 scripts。

只有当任务范围跨多个层面时，才扩大读取范围。例如生产白屏需要同时检查前端构建、HTML 缓存、assets 缓存、CDN、部署脚本和运行时恢复逻辑；普通 UI 文案修改不需要读取数据库迁移。

## 5. 任务分类和开始前计划

所有任务开始前都必须先输出 `Task Scope`。如果用户使用 `/plan`，或明确要求“先计划、不要直接写代码”，则当前阶段只允许读取、分析和输出计划；不允许创建文件、修改文件、删除文件或直接写代码，直到用户明确确认执行。

任务类型可以多选，但必须说明主类型。例如“后台订单接口的并发修复”同时属于 backend、API、data consistency、concurrency，主类型通常是 backend 或 data consistency。

`Task Scope` 必须使用下面格式：

```text
Task Scope

1. Task type:
2. Docs to read:
3. Target area:
4. Files likely involved:
5. Files forbidden:
6. Business logic impact:
7. API impact:
8. Database impact:
9. UI/content impact:
10. Required verification:
11. Need-confirmation issues:
```

开始前计划规则：

- 后端任务必须输出 `Architecture Decision`。
- 前端任务必须输出 `Frontend Change Plan`。
- 安全任务必须输出 `Security Plan`。
- 数据一致性或并发任务必须输出 `Data Consistency / Concurrency Plan`。
- 只读取本次任务相关文件，只修改本次任务允许修改的文件。
- 不允许顺手修改无关问题；发现额外问题时，只能列为后续建议或待确认。
- 不允许改业务逻辑、API response、数据库结构、UI/文案、皮肤或生产部署脚本，除非用户本次明确批准。

| 任务类型 | 必读文档 | 开始前必须输出 | 允许修改 | 禁止修改 |
| --- | --- | --- | --- | --- |
| backend / 后端任务 | `docs/ARCHITECTURE.md`, 必要时 `docs/API_CONTRACTS.md`, `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md` | `Architecture Decision` | 对应 `server/src/modules/<module>` 的正确分层文件、必要测试 | 无关模块、数据库迁移、API response、部署脚本、前端 UI |
| frontend / 前端任务 | `docs/FRONTEND_ARCHITECTURE.md`, 必要时 `docs/DESIGN_SYSTEM.md` | `Frontend Change Plan` | 对应前端入口、路由、页面、组件、服务、状态文件 | 后端业务规则、API response、数据库、无关 UI、皮肤配置 |
| ui/ux 任务 | `docs/DESIGN_SYSTEM.md`, 必要时 `docs/FRONTEND_ARCHITECTURE.md` | `UI/UX Change Plan` | 相关页面、组件、样式文件 | 业务逻辑、接口、数据库、权限、支付、订单状态 |
| api 任务 | `docs/API_CONTRACTS.md`, 必要时 `docs/ARCHITECTURE.md` | `API Contract Plan` | 对应后端模块分层、前端 API 封装和测试 | 随意改变 response 结构、绕开 `/api`、绕开 `/api/admin` |
| database / 数据库任务 | `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`, `docs/ARCHITECTURE.md` | `Data Change Plan` | 经确认后的迁移、repository、专项测试 | 未确认的数据结构变更、生产数据自动修复、无审计的数据修复 |
| data consistency / 数据一致性任务 | `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`, 必要时 `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md` | `Data Consistency Plan` | 事务、幂等、补偿、对账、重算、缓存失效相关的经确认改动 | 只改前端显示、无审计修复生产数据、绕开 source of truth |
| concurrency / 并发任务 | `docs/DATA_CONSISTENCY_AND_CONCURRENCY.md`, 必要时 `docs/ARCHITECTURE.md` | `Concurrency Plan` | 条件更新、版本控制、锁、重复提交保护、冲突提示和专项测试 | 无确认地改变订单/支付/库存状态机，或只靠前端防重复 |
| security / 安全任务 | `docs/SECURITY_GOVERNANCE.md`, `docs/API_CONTRACTS.md` | `Security Plan` | 认证、授权、MFA、CSRF、CORS、rate limit、审计相关代码和测试 | 只靠前端隐藏、降低权限校验、泄露密钥 |
| deployment/cache / 部署缓存任务 | `docs/WEBSITE_ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, 必要时 `docs/CACHE_INVALIDATION_RULES.md` | `Deployment / Cache Plan` | 经确认后的部署配置、缓存策略或脚本 | 未确认修改生产部署脚本、无回滚方案上线、只改页面代码掩盖缓存问题 |
| i18n / 编码任务 | `docs/encoding-and-i18n-guardrail.md`, 必要时 `docs/QUALITY_GATES.md` | `I18n / Encoding Plan` | 后台 i18n、翻译文件、编码检查脚本、必要文案文件 | 手工破坏生成链路、绕过乱码检查、无关 UI 文案改写 |
| ci/checks / CI 和检查脚本任务 | `docs/QUALITY_GATES.md` | `Quality Gate Plan` | 检查脚本、CI 配置、文档 | 未说明耗时和影响就加重 CI、修改业务逻辑 |
| docs / 文档任务 | 本文档和相关专项文档 | `Documentation Scope` | docs、README、模板文件 | 业务代码、UI、API、数据库、部署脚本、CI，除非本次明确要求 |

## 6. 高风险任务确认规则

以下内容必须人工确认后才能改：

- 订单创建、取消、支付状态、发货、收货、售后。
- 支付渠道、支付意图、支付回调、退款、对账。
- 商品库存、SKU 库存、库存扣减、库存恢复。
- 优惠券领取、核销、退券、活动券、人群券。
- 积分发放、抵扣、过期、会员等级、奖励结算。
- 用户、权限、角色、后台 MFA、CSRF、敏感操作。
- 数据库迁移、生产数据修复、报表口径、缓存失效策略。
- 生产部署脚本、CDN 缓存、HTML 缓存、回滚策略。

如果需求描述不清楚，必须列为待确认，不允许自行扩大范围。

## 7. 禁止顺手重构

禁止为了看起来更整洁而顺手重构无关代码。旧代码只有在影响本次任务根因、或用户明确要求治理/清理时，才允许处理。

清理旧代码前必须检查引用关系、路由入口、动态 import、后台菜单、权限、定时任务、webhook、第三方调用和测试。不确定是否还在用时，只能标记为待确认或 deprecated，不能盲删。

## 8. 完成后 Compliance Report

每次完成后必须输出对应合规报告，至少包括：

- 本次任务范围。
- 实际修改文件。
- 未修改但特意避开的文件。
- 是否改了业务代码。
- 是否改了 API。
- 是否改了数据库。
- 是否改了 UI。
- 是否改了皮肤。
- 是否改了部署或 CI。
- 运行了哪些验证命令。
- 哪些命令通过、失败或未运行。
- 剩余风险和需要用户确认的内容。

后端任务还要输出 `Architecture Compliance Report`。前端任务还要输出 `Frontend Compliance Report`。UI/UX 任务还要输出 `UI/UX Compliance Report`。API 任务还要输出 `API Contract Report`。数据一致性或并发任务还要输出 `Data Consistency / Concurrency Report`。安全任务还要输出 `Security Report`。CI/检查任务还要输出 `Quality Gate Report`。

## 9. 验证规则

验证命令按 `docs/QUALITY_GATES.md` 执行。只改文档时，可以不跑完整业务测试，但必须说明“本次只改文档，没有改业务代码”。

如果无法运行测试，必须说明原因，例如依赖未安装、缺少数据库、缺少环境变量、命令耗时过长、当前阶段不允许改 CI 或脚本。

禁止没有运行命令却声称已经通过。

## 10. 文档冲突处理

发现文档冲突时，不要直接覆盖旧文档。必须先判断：

- 哪份文档是当前权威来源。
- 哪份文档是历史迁移说明。
- 哪份文档是专项说明。
- 是否存在代码事实与文档不一致。

修复方式优先级：

1. 引用权威文档。
2. 补充缺失章节。
3. 明确主从关系。
4. 标注历史内容或 deprecated。
5. 只有确认无生产用途时才删除。

## 11. 旧代码和历史迁移处理

`docs/MODULAR_ARCHITECTURE.md` 属于阶段性迁移说明。当前后端固定模块清单以 `server/scripts/architecture-rules.js` 和 `server/src/modules` 为准。

历史建议目录、旧模块名、旧接口写法不能直接当作当前规则使用。需要迁移旧代码时，先输出影响范围和回滚方案。

## 12. 生产问题处理

生产问题不能只看表面现象。白屏、chunk 加载失败、路由异常、接口错域、缓存不一致等问题，必须同时考虑：

- 前端代码。
- 构建产物。
- HTML 缓存头。
- assets 缓存策略。
- Service Worker / PWA。
- CDN。
- Nginx / Node 静态资源托管。
- 部署脚本。
- 运行时错误恢复逻辑。

生产部署脚本和 CI 不属于普通修复范围，必须先说明风险、影响范围和回滚方案。

## 13. 紧急 Hotfix

Hotfix 可以缩短计划，但不能跳过根因判断、影响范围和验证说明。

Hotfix 必须明确：

- 当前故障是什么。
- 影响哪些用户或业务。
- 本次只修什么。
- 不修什么。
- 回滚方式是什么。
- 最小验证命令是什么。

Hotfix 后如果留下技术债，必须在报告里列为后续任务，不允许把临时方案说成长期方案。
