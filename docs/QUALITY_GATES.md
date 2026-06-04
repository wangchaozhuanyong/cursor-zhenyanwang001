# Quality Gates

本文档说明本项目的质量门禁和验证命令。CI 当前配置见 `.github/workflows/ci.yml`。本文档只描述规则，不等于已经把所有命令加入 CI。

## 1. 总原则

- CI 失败不能视为完成。
- 本地无法运行时必须说明原因。
- 文档任务可以不跑完整业务测试，但必须说明未改业务代码。
- 高风险业务任务必须跑对应专项测试，或明确说明为什么当前环境无法验证。
- 不允许没有运行命令却说已经通过。

## 2. 后端最小门禁

在 `server` 目录运行：

```bash
npm run arch:check
npm run typecheck
npm run test:unit
```

适用场景：

- 后端模块代码修改。
- routes/controller/service/repository 修改。
- API 修改。
- 权限、订单、支付、库存、优惠券、积分相关修改。

## 3. 后端架构门禁

```bash
cd server
npm run arch:check
```

当前 `arch:check` 会运行：

- `check-module-structure.js`
- `check-service-layer.js`
- `check-module-boundaries.js`，并开启 `STRICT_MODULE_BOUNDARIES=1`

它检查固定 24 个模块、四层目录、SQL 访问位置、controller/routes 越层、跨模块内部 import。

## 4. 后端 typecheck

```bash
cd server
npm run typecheck
```

用于检查 TypeScript 类型问题。即使后端主要是 JS，也不能跳过当前项目已有 typecheck。

## 5. 后端 unit tests

```bash
cd server
npm run test:unit
```

当前 unit test 覆盖健康检查、隐私、观测、CSV 安全、模块边界、订单状态机、支付金额、上传、MFA、积分、监控等。

## 6. 后端 report tests

涉及报表、统计、导出、数据中心时运行：

```bash
cd server
npm run test:reports
npm run test:report-contract
npm run test:report-export
```

报表口径不能随便改。相关文档见 `docs/DATA_REPORTING_CONTRACT.md`。

## 7. 后端其他检查

```bash
cd server
npm run check:migrations
npm run check:report-registry
```

涉及迁移或报表注册时必须运行。

## 8. 前端最小门禁

在 `click-send-shop-main/click-send-shop-main` 目录运行：

```bash
npm run lint
npm run typecheck
npm run build
```

涉及后台构建时还要运行：

```bash
npm run build:admin
```

## 9. 前端文本和 i18n 门禁

```bash
npm run check:mojibake
npm run check:admin-i18n
```

涉及后台文案、中文、翻译、编码、复制粘贴内容时必须运行。

## 10. 前端 API 路径门禁

```bash
npm run check:api-paths
npm run typecheck:strict-api
```

涉及 API 调用、服务层、请求封装、接口类型时必须运行。

## 11. 前端后台严格类型门禁

```bash
npm run typecheck:strict-admin
```

涉及后台页面、后台组件、后台 API、后台权限、后台表格时必须运行。

## 12. 前端路由和标签门禁

当前 package.json 已有：

```bash
npm run check:routes
npm run check:admin-labels
```

涉及后台路由、菜单、页面标题、后台标签、管理端可达性时建议运行。

## 13. 前端兼容性门禁

```bash
npm run check:browser-compat
```

涉及低版本浏览器、中国浏览器兼容、语法兼容、PWA、生产白屏时建议运行。

## 14. 前端构建门禁

```bash
npm run build:admin
npm run build
```

当前 CI 分别构建后台和用户端，并设置：

```text
VITE_API_BASE_URL=/api
```

手动生产构建不能漏掉 API base。

## 15. 前端测试门禁

```bash
npm run test
```

涉及状态管理、服务封装、请求层、复杂组件逻辑时必须运行或补充测试。

## 16. 前端视觉和重叠检查

当前已有：

```bash
npm run audit:overlap
npm run audit:overlap:full
```

涉及移动端、后台表格、弹窗、底部栏、Toast、按钮遮挡、页面布局时建议运行。视觉任务还应使用浏览器实际查看。

## 17. PWA 和 dist 验证

当前已有：

```bash
npm run verify:pwa
npm run verify:dist
```

涉及 Service Worker、离线、安装、构建产物、chunk、生产缓存时建议运行。

## 18. 当前 CI 已执行的命令

前端 CI：

```bash
npm run lint
npm run check:mojibake
npm run check:admin-i18n
npm run check:api-paths
npm run typecheck
npm run typecheck:strict-api
npm run typecheck:strict-admin
npm run build:admin
npm run build
npm run test
```

后端 CI：

```bash
npm run arch:check
npm run check:migrations
npm run check:report-registry
npm run typecheck
npm run test:unit
npm run test:reports
npm run test:report-contract
npm run test:report-export
```

仓库卫生：

```bash
node server/scripts/check-tracked-artifacts.js
```

## 19. 按任务类型的最小验证

| 任务类型 | 最小验证 |
| --- | --- |
| 文档任务 | `git diff --check`，说明未改业务代码 |
| 后端架构任务 | `cd server && npm run arch:check` |
| 后端 API 任务 | `arch:check`, `typecheck`, 对应测试 |
| 报表任务 | `test:reports`, `test:report-contract`, `test:report-export` |
| 前端页面任务 | `lint`, `typecheck`, 相关 build，必要时浏览器验证 |
| 后台页面任务 | `check:admin-i18n`, `typecheck:strict-admin`, `build:admin` |
| 前端 API 任务 | `check:api-paths`, `typecheck:strict-api` |
| UI/UX 任务 | `lint`, `typecheck`, 浏览器桌面和移动端查看，必要时 `audit:overlap` |
| PWA/缓存任务 | `verify:pwa`, `verify:dist`, build，浏览器验证 |
| 安全任务 | 后端测试、相关安全专项测试、必要时手工攻击路径验证 |
| 数据一致性任务 | 对应 unit/integration/report 测试，必要时审计脚本 |

## 20. 无法运行验证时

必须说明：

- 哪条命令没运行。
- 为什么没运行。
- 它本来验证什么。
- 当前剩余风险。
- 是否需要用户本地或 CI 再跑。

示例：

```text
未运行 npm run test:integration，因为当前环境缺少测试数据库。剩余风险是数据库集成路径未验证。
```

## 21. 文档任务规则

只改 docs 时，可以不跑完整业务测试，但必须运行至少一种轻量验证，例如：

```bash
git diff --check
git status --short
```

报告必须明确：

- Business code changed: no
- API changed: no
- Database changed: no
- UI changed: no

## 22. CI 失败处理

CI 失败不能说完成。必须说明：

- 哪个 job 失败。
- 失败命令。
- 中文解释失败含义。
- 是否和本次改动有关。
- 下一步修复计划。

## 23. 不把重型检查一次性塞进 CI

新增 CI 门禁前必须说明：

- 命令耗时。
- 是否稳定。
- 是否依赖外部服务。
- 失败会不会阻塞所有开发。
- 回滚方式。

普通治理文档阶段不修改 CI。

## 24. Pull Request 门禁

PR 模板位置：

```text
.github/pull_request_template.md
```

每个 PR 都必须填写任务类型、实际读取过的 docs、架构检查、前端检查、安全检查、数据检查、UI/UX 检查、验证命令和用户确认项。

PR checklist 不是测试结果本身。勾选某项前，必须已经完成对应检查；没有运行的命令必须在 PR 里写明原因，不能用空勾选代替验证。

最小要求：

- 后端改动必须说明模块和层级。
- 前端改动必须说明 public/admin 作用域。
- API 改动必须说明 response 是否变化。
- 数据库改动必须说明迁移和回滚。
- 安全改动必须说明服务端权限校验。
- UI/UX 改动必须说明响应式和无关 UI/content 是否未改。
- 文档改动必须说明未改业务代码。

如果某项不适用，勾选 `Not applicable`，并在必要时补一句原因。
