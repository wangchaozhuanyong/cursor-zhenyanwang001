# Design System Governance

本文档是 UI/UX、设计系统、theme/skin、CSS 和视觉体验的治理规则。它只规定设计和交互边界，不允许为了美观改业务逻辑、API response、数据库或权限规则。

前端工程结构见 `docs/FRONTEND_ARCHITECTURE.md`。整站架构见 `docs/WEBSITE_ARCHITECTURE.md`。

## 1. 当前设计系统位置

主要源码位置：

```text
click-send-shop-main/click-send-shop-main/src/index.css
click-send-shop-main/click-send-shop-main/src/styles/admin.css
click-send-shop-main/click-send-shop-main/tailwind.config.ts
click-send-shop-main/click-send-shop-main/src/contexts/ThemeRuntimeProvider.tsx
click-send-shop-main/click-send-shop-main/src/constants/themePresets.ts
click-send-shop-main/click-send-shop-main/src/constants/themeDesignLocks.ts
click-send-shop-main/click-send-shop-main/src/components
click-send-shop-main/click-send-shop-main/src/components/ui
click-send-shop-main/click-send-shop-main/src/modules/micro-interactions
```

现有 theme runtime 会把主题配置转换为 CSS 变量并写入 `document.documentElement`。不要绕开这套机制直接新建另一套主题系统。

## 2. 整体视觉原则

- 用户端要保持精致、稳定、清楚、可信。
- 管理后台要保持高信息密度、可扫描、可重复操作，不要做成营销落地页风格。
- 同一类控件在全站保持一致的尺寸、圆角、阴影、状态和交互反馈。
- 移动端必须优先避免遮挡、溢出、误触和底部安全区问题。
- 不允许为了视觉好看改变真实业务结果。

## 3. 高级感标准

本项目的高级感来自秩序、留白、层次和一致性，不来自随意堆渐变、夸张阴影或大面积装饰。

判断标准：

- 信息层级清楚。
- 字号和空间符合容器大小。
- 按钮、表单、表格、卡片状态稳定。
- 图片和媒体比例稳定。
- 移动端不压字、不遮挡、不横向溢出。
- 后台操作路径清楚，危险操作有确认和反馈。

## 4. 色彩规则

颜色应优先来自 CSS 变量和主题配置：

```text
--theme-primary
--theme-price
--theme-bg
--theme-surface
--theme-border
--theme-text
--theme-text-muted
--theme-danger
--theme-success
--theme-warning
```

新增颜色前要先确认现有变量是否能表达。不要在页面里大量散落硬编码色值。确实需要新增颜色时，应说明用途、作用范围和是否影响 theme/skin。

后台色彩要优先服务可读性和状态识别，不要让后台跟随前台皮肤后变得难读。当前 `ThemeRuntimeProvider` 已对 admin scope 使用安全覆盖策略，应继续遵守。

## 5. 字体规则

字体来源：

```text
--font-display
--font-body
--theme-font
```

规则：

- 正文优先使用系统字体栈。
- 标题字号必须匹配容器，不要在卡片、表格、侧栏中使用 hero 级大字。
- 不要使用负 letter-spacing。
- 不要用 viewport width 直接缩放字体。
- 长中文、英文、金额、订单号、手机号要能换行或省略，不得撑破容器。

## 6. 间距规则

优先使用现有 Tailwind spacing、CSS 变量和页面级变量：

```text
--store-page-x
--store-card-x
--admin-mobile-page-x
--admin-table-cell-px
```

页面间距应服务扫描和操作，不要为了装饰增加过大留白。后台表格、筛选区、按钮组要保持紧凑但不拥挤。

## 7. 圆角规则

圆角来源：

```text
--theme-radius
--store-card-radius
--store-panel-radius
```

规则：

- 表单、按钮、卡片圆角要保持同一视觉语言。
- 后台工具面板和表格不应使用过分夸张圆角。
- 弹窗和底部抽屉可以比普通卡片更明显，但不能影响内容可读性。

## 8. 阴影规则

阴影来源：

```text
--theme-shadow
--theme-shadow-hover
--theme-shadow-control
```

规则：

- 阴影用于层级，不用于堆装饰。
- 后台表格和卡片阴影应克制。
- 移动端底部浮层、弹窗、Toast 可以使用阴影强调层级，但不得遮挡主要操作。

## 9. 边框规则

边框优先使用：

```text
--theme-border
--store-border
--store-border-strong
```

边框用于区分区域、表格、输入框和状态。不要用过多边框让页面变花。深色或特殊皮肤下必须保证边框对比度。

## 10. 按钮规范

按钮必须有清楚的：

- 默认状态。
- hover 或 active 状态。
- disabled 状态。
- loading 状态。
- 成功或失败反馈。

危险操作必须使用明确的危险样式和确认流程。不要把普通链接伪装成危险操作，也不要让危险按钮和主按钮颜色过于接近。

按钮文案要短、直接、可执行。图标按钮必须能通过 tooltip、aria-label 或上下文理解用途。

## 11. 表单规范

表单必须考虑：

- label。
- placeholder。
- helper text。
- validation error。
- disabled/read-only。
- loading submit。
- 成功反馈。

移动端输入框字号不能小到触发 iOS 自动缩放。敏感表单不能只做前端校验，最终校验必须在后端。

## 12. 表格规范

后台表格必须考虑：

- 小屏横向滚动或卡片化摘要。
- 长字段省略和 tooltip。
- 金额、数量、时间、状态列对齐。
- 批量操作和行操作不会互相遮挡。
- loading、empty、error 状态齐全。
- 分页和筛选状态可恢复。

表格里不能把权限、订单、支付、库存最终状态写死在前端。

## 13. 卡片规范

卡片用于承载一组相关信息，不要把整个页面大区块都做成浮动卡片。卡片内部标题、状态、操作按钮必须有清楚层级。

商品卡、订单卡、统计卡、设置卡要区分用途，不能为了统一视觉强行牺牲信息可读性。

## 14. 弹窗规范

弹窗用于确认、编辑、详情或重要提示。规则：

- 移动端不得超出视口。
- 底部按钮不能被安全区遮挡。
- Escape、点击遮罩、关闭按钮行为要符合现有组件习惯。
- 危险操作弹窗必须说明后果。
- 表单弹窗提交失败不能直接关闭。

## 15. 导航规范

用户端导航要保证购物、搜索、个人中心等核心路径清楚。后台导航要保证运营管理任务可扫描、可回到上一级、当前页面状态明确。

新增后台页面要同步考虑：

- 路由。
- 菜单入口。
- 权限。
- 页面标题。
- 工作台标签。
- 移动端入口。

## 16. 标签和状态样式

状态标签必须表达真实后端状态，不得前端自行推断最终状态。

常见状态：

- success。
- warning。
- danger。
- neutral。
- pending。
- disabled。

金额、订单、支付、库存、权限等状态展示必须和 API 返回保持一致。

## 17. Loading / Empty / Error / Success

每个页面或关键区域都应该有：

- loading skeleton 或 fallback。
- empty state。
- error state。
- success toast 或 inline feedback。

不要让用户看到空白区域却不知道发生了什么。后台保存成功、失败、权限不足、网络断开都必须有反馈。

## 18. 响应式断点

项目使用 Tailwind 断点。常见检查宽度至少包括：

```text
375px
390px
768px
1024px
1440px
```

涉及后台移动端时，必须重点检查 375px 和 390px。涉及桌面后台表格时，必须检查 1024px 以上。

## 19. 可访问性要求

- 交互控件必须可聚焦。
- 图标按钮需要可理解名称。
- 颜色不能是唯一状态表达。
- 表单错误要靠近对应字段。
- 文字和背景要有足够对比度。
- 键盘、读屏和触摸操作不能互相冲突。

## 20. 管理后台表格自适应规则

后台表格优先保证可用性：

- 列多时允许横向滚动。
- 移动端可用卡片摘要替代表格。
- 固定操作列不能遮挡内容。
- 批量操作、筛选、分页必须在移动端可触达。
- 表格容器宽度变化不能导致按钮文字挤爆。

## 21. 移动端管理后台规则

移动端后台不是可选项。后台移动端至少要保证：

- 能登录。
- 能进入主要菜单。
- 能查看列表。
- 能执行核心操作。
- 能看到错误和权限提示。
- 不出现顶部栏、底部栏、Toast、弹窗互相遮挡。

## 22. UX Writing 可改范围

可以改：

- 按钮文案。
- 提示文案。
- 空状态文案。
- 错误解释。
- 成功反馈。
- 表单辅助说明。

前提是不能改变业务含义、权限含义、价格含义、订单状态含义和 API 契约。

## 23. UX Writing 禁止改范围

禁止通过文案掩盖真实问题。例如：

- 接口失败却写成保存成功。
- 库存不足却提示网络错误。
- 权限不足却提示页面不存在。
- 支付未确认却提示已支付。
- 后端校验失败却前端改文案绕过。

## 24. UI/UX 任务禁止事项

- 不允许为了美观改业务逻辑。
- 不允许为了美观改接口。
- 不允许为了美观改数据库。
- 不允许为了美观改订单、支付、库存、权限、会员规则。
- 不允许普通 UI 任务顺手改 theme/skin 配置。
- 不允许只看截图不检查真实代码和状态来源。

## 25. UI/UX 计划和报告

UI/UX 任务开始前必须输出：

```text
UI/UX Change Plan:
1. Target app:
2. Target page/component:
3. Visual issue:
4. Files allowed to edit:
5. Files forbidden to edit:
6. API/business impact:
7. Responsive checks:
8. Verification commands:
```

完成后必须输出：

```text
UI/UX Compliance Report:
1. Visual issue fixed:
2. Business logic unchanged:
3. API unchanged:
4. Database unchanged:
5. Theme/skin unchanged or explained:
6. Responsive checks completed:
7. Verification commands and results:
8. Remaining risks:
```
