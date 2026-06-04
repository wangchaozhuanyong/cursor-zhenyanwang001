# Codex Task Prompts

本文档是长期任务提示词索引，不是每次任务都必须读取。只有当任务明确属于某一类专项审计、治理、修复或优化时，才读取对应小节。

每个小节当前只保留标题、用途、何时读取和执行原则。不要在本文件堆超长 prompt，避免 Codex 每次读取成本过高。

## 0. Automated Content Publishing via Admin API

用途：通过后台 API 自动发布内容、配置、CMS 页面或运营素材。

何时读取：用户要求批量发布内容、通过后台接口写入内容、自动化运营配置时。

执行原则：先确认 API 契约、权限、审计日志和回滚方式；不得绕开后台权限；不得直接改数据库替代 API，除非人工确认。

## 1. AI Image Generation Workflow using gpt-image-2

用途：生成商品图、活动图、视觉素材或页面配图。

何时读取：用户明确要求 AI 生成图片，或设计任务需要生成位图素材时。

执行原则：先确认用途、尺寸、风格、版权和上线位置；不得因为图片生成修改业务逻辑、API、数据库或皮肤配置。

## 2. Browser-based UI/UX QA

用途：用浏览器实际检查页面视觉、交互、移动端、报错和可用性。

何时读取：UI/UX 修改、响应式问题、生产白屏、页面跳转异常、用户要求打开测试时。

执行原则：至少检查相关桌面和移动视口；记录未验证视口；不能只靠代码判断视觉完成。

## 3. Frontend Production Deployment Cache Consistency Fix

用途：处理生产前端缓存、HTML、assets、chunk、CDN、PWA 不一致。

何时读取：用户反馈线上白屏、chunk 加载失败、更新后页面旧版、接口路径错域。

执行原则：同时检查前端构建、HTML 缓存、assets 缓存、CDN、Service Worker、部署脚本和运行时恢复；不要只改文案。

## 4. System-wide Data Consistency Audit and Reconciliation Hardening

用途：系统性审计订单、支付、库存、优惠券、积分、报表一致性。

何时读取：用户要求对账、重算、修复数据、排查金额或状态不一致。

执行原则：先确认 source of truth；先审计后修复；生产数据自动修复必须人工批准。

## 5. Legacy Feature Decommissioning and Dead Code Cleanup

用途：下线旧功能、删除死代码、清理旧接口或旧配置。

何时读取：用户明确要求删除、下线、清理、去除旧功能。

执行原则：先查引用、路由、动态 import、菜单、权限、定时任务、webhook、第三方调用和测试；不确定先 deprecated。

## 6. Responsive Layout and Visual Collision QA

用途：检查响应式布局、文字溢出、按钮遮挡、弹窗和 Toast 冲突。

何时读取：移动端异常、后台表格适配、UI 重叠、用户要求视觉 QA。

执行原则：至少检查小屏和桌面；优先修布局根因；不为视觉修复改业务规则。

## 7. Functional Flow and Frontend State Consistency QA

用途：检查前端流程和状态是否一致，例如登录、购物车、下单、后台列表刷新。

何时读取：用户反馈页面状态不同步、刷新后变了、操作成功但列表没更新。

执行原则：确认后端真实结果、前端缓存、Zustand、React Query、路由状态；不能只改显示文案。

## 8. Technical Debt, Hotfix, and Maintainability Audit

用途：技术债、紧急修复、可维护性审计。

何时读取：用户要求 hotfix、快速修、技术债审计、可维护性优化。

执行原则：Hotfix 保持最小范围；技术债不能自动扩大成重构；必须说明后续债务和风险。

## 9. Frontend Loading Experience and Performance Resilience Audit

用途：检查加载体验、骨架屏、路由 fallback、懒加载和弱网表现。

何时读取：页面加载慢、白屏、切页卡顿、弱网体验差。

执行原则：确认首屏、懒加载、chunk 恢复、loading/error/empty 状态；不要牺牲正确性换假速度。

## 10. Admin Dashboard Mobile-first Responsive Refactor Guidelines

用途：管理后台移动优先响应式改造。

何时读取：后台移动端不可用、表格或操作栏遮挡、用户要求后台手机端优化。

执行原则：先保证能用，再追求美观；表格、筛选、操作、弹窗、底部安全区必须验证。

## 11. i18n Locale Integrity Quality Gate

用途：后台 i18n、中文文案、英文翻译、乱码防护。

何时读取：修改后台文案、翻译、编码、中文字符串、i18n 生成脚本。

执行原则：遵守 `docs/encoding-and-i18n-guardrail.md`；运行 mojibake 和 admin i18n 检查；不要手动破坏生成链路。

## 12. Full-site UI/UX Experience Audit and Safe Optimization

用途：整站 UI/UX 审计和安全优化。

何时读取：用户要求全站体验审计、视觉统一、整体质感提升。

执行原则：先列范围和优先级；分阶段做；不顺手改业务逻辑、API、数据库和皮肤底层配置。

## 13. Admin Data Table Adaptive Layout

用途：后台数据表格自适应、列宽、横向滚动、移动端卡片化。

何时读取：后台表格溢出、操作按钮遮挡、移动端表格不可用。

执行原则：保留数据准确性；操作列和状态列可读；移动端必须能查看和操作。

## 14. Customer Experience Friction Audit

用途：排查用户购物、注册、登录、下单、支付、售后流程阻力。

何时读取：用户要求提升转化、减少卡点、排查体验问题。

执行原则：先走真实流程；区分体验问题和后端规则；不能为了减少阻力绕过安全或业务校验。

## 15. SPA Navigation and Loading Experience Optimization

用途：SPA 路由切换、懒加载、预加载、fallback 优化。

何时读取：切页慢、返回异常、刷新 404、路由 fallback 不稳定。

执行原则：检查 React Router、lazy pages、fallback、ErrorBoundary、部署 fallback 和缓存。

## 16. Realtime Data Refresh and Cache Invalidation

用途：实时刷新、缓存失效、后台保存后前台同步。

何时读取：后台改了前台不更新、列表保存后不刷新、缓存陈旧。

执行原则：确认 source of truth、API、React Query、Zustand、Redis/CDN/PWA；不要只改前端强刷。

## 17. Multi-user Concurrency and Customer Service Collision Prevention

用途：多人后台操作、客服并发、同一订单或售后被多人处理。

何时读取：用户要求多人协作、防覆盖、防重复处理。

执行原则：考虑版本、条件更新、认领、冲突提示、审计日志和回滚。

## 18. Data Consistency Observability Dashboard

用途：数据一致性监控面板、异常列表、修复任务可视化。

何时读取：用户要求监控面板、异常数据中心、自动修复展示。

执行原则：展示不能代替修复；修复生产数据必须人工批准；报表口径要稳定。

## 19. Admin Surface Security Hardening

用途：后台安全面加固。

何时读取：后台权限、MFA、CSRF、CORS、Cookie、rate limit、审计、IDOR。

执行原则：服务端强制校验；前端只做体验保护；敏感操作必须有审计和测试。

## 20. Frontend Production Deployment Cache Consistency and Chunk Load Failure Recovery

用途：生产缓存一致性和 chunk 加载失败恢复。

何时读取：上线后旧页面、chunk 404、白屏、Service Worker 卡旧版本。

执行原则：检查 HTML no-store、hashed assets、PWA、CDN purge、部署脚本、运行时恢复；不能只改页面代码。
