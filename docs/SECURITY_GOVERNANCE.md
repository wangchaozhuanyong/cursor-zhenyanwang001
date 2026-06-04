# Security Governance

本文档是安全治理规范。发布前安全检查见 `docs/SECURITY_CHECKLIST.md`。隐私和合规说明见 `docs/PRIVACY_AND_COMPLIANCE.md`。后端架构规则见 `docs/ARCHITECTURE.md`。

## 1. 管理后台安全原则

管理后台是高风险入口。后台页面、菜单、按钮和前端权限缓存只能改善体验，不能作为最终安全边界。

真正安全边界必须在服务端：

- 认证。
- 授权。
- 权限点。
- MFA。
- CSRF。
- rate limit。
- 审计日志。

## 2. 隐藏后台入口不是安全措施

前端隐藏 `/admin`、菜单隐藏、按钮隐藏，都不是安全措施。攻击者可以直接请求 `/api/admin/*`。

后台 API 必须在服务端拒绝未登录用户、普通用户和无权限管理员。

## 3. 后台 API 必须服务端鉴权

所有 `/api/admin/*` 接口必须确认：

- 是否需要登录。
- 是否需要管理员身份。
- 是否需要具体权限点。
- 是否需要 MFA step-up。
- 是否需要 CSRF token。
- 是否需要审计日志。

如果接口只是前端隐藏但后端不校验，视为安全漏洞。

## 4. 后台 API 必须服务端授权

授权不是“是否登录”。授权必须判断当前管理员是否有执行该操作的权限。

尤其是：

- 账号管理。
- 角色权限。
- 订单和退款。
- 支付配置。
- 库存调整。
- 优惠券和积分。
- 数据导出。
- 备份恢复。
- 站点能力和系统配置。

## 5. 普通用户不能访问后台 API

普通用户不能访问：

```text
/api/admin/*
```

如果普通用户能请求成功，即使前端没有入口，也是安全问题。

## 6. 未登录用户不能访问后台 API

未登录用户不能访问：

```text
/api/admin/*
```

例外只能是明确的后台登录、刷新、MFA、passkey、CSRF 等认证流程入口，并且必须有 rate limit 和安全保护。

## 7. 前端 isAdmin 不能作为最终依据

前端的 `isAdmin`、权限缓存、localStorage、Zustand store 都可以被用户篡改。

前端权限判断只能用于：

- 菜单展示。
- 按钮禁用。
- 操作提示。
- 提前减少无效点击。

最终结果必须由后端判断。

## 8. RBAC / Permission Check

涉及后台权限时必须检查：

- 权限点命名。
- 角色绑定。
- 菜单和按钮展示。
- 后端接口授权。
- 无权限错误返回。
- 审计日志。

不要只改前端菜单，不改后端权限。

## 9. MFA 规则引用

MFA 相关前端能力见：

```text
src/api/request.ts
src/lib/adminMfaStepUp
src/components/admin/AdminMfaStepUpHost
```

MFA reset 运维说明见：

```text
docs/admin-mfa-reset-runbook.md
```

敏感操作是否需要 MFA，必须由后端规则决定，前端只负责触发和展示。

## 10. CSRF / CORS / Cookie 安全

后台敏感写操作必须考虑 CSRF。当前前端请求层已经处理 admin CSRF token。

CORS 配置必须服务生产域名，不允许生产环境使用宽泛 `*`。Cookie 必须根据场景设置：

- `HttpOnly`。
- `Secure`。
- `SameSite`。
- 合理 path。

相关后端代码位置包括 `server/src/utils/authCookies.js`、`server/src/app.js` 和安全中间件。

## 11. Rate Limit

以下入口必须考虑 rate limit：

- 登录。
- 注册。
- OTP。
- 密码重置。
- OAuth。
- 后台登录。
- 上传。
- 支付回调或手动确认。
- 敏感管理操作。

不要为了测试方便移除 rate limit。确实需要调整时必须说明生产影响。

## 12. 审计日志

后台敏感操作必须尽量记录审计日志。审计日志用于追踪问题、权限滥用、误操作和生产事故。

禁止为了简化代码删除审计日志。

## 13. 敏感操作保护

敏感操作至少要考虑：

- 二次确认。
- MFA。
- 权限点。
- CSRF。
- 审计日志。
- 幂等。
- 回滚或补偿。

例如删除商品、调整库存、退款、重置 MFA、导出数据、恢复备份。

## 14. IDOR 风险

IDOR 是指用户改 URL 或 id 后访问不属于自己的数据。

后端必须校验资源归属和权限。前端不要相信“用户不会改 id”。涉及订单、地址、优惠券、通知、用户资料、后台资源时必须特别检查。

## 15. 上传安全

上传规则参考：

```text
docs/MEDIA_UPLOAD_AUTOMATION.md
click-send-shop-main/click-send-shop-main/docs/security/backend-upload-security-plan.md
click-send-shop-main/click-send-shop-main/docs/security/S3-CORS-PRESIGNED-UPLOAD.md
```

上传必须考虑：

- 文件大小。
- MIME 和 magic number。
- 图片安全处理。
- 视频转码不阻塞 API 主进程。
- 对象存储权限。
- CDN 访问策略。
- 删除和替换的一致性。

## 16. 支付回调安全

支付回调必须服务端验证，不能由前端确认支付成功。

必须考虑：

- 签名验证。
- 幂等事件 ID。
- 金额和币种校验。
- 订单状态条件更新。
- 审计日志。
- 重放攻击。
- 手动对账。

支付文档见 `docs/PAYMENTS_MALAYSIA.md` 和 `server/docs/security/manual-webhook-signing.md`。

## 17. 数据导出安全

数据导出必须考虑：

- 管理员权限。
- 敏感字段脱敏。
- CSV 注入。
- 导出范围。
- 审计日志。
- 下载链接有效期。

不要让普通用户或低权限员工导出敏感数据。

## 18. 备份恢复安全

备份恢复是高风险操作，必须人工确认。相关文档：

```text
docs/BACKUP_AND_RESTORE.md
docs/ENTERPRISE_BACKUP_RESTORE_RUNBOOK.md
```

恢复操作必须有：

- 审批。
- 演练。
- 回滚方案。
- 操作日志。
- 权限隔离。
- 生产影响说明。

## 19. 安全任务计划和报告

安全任务开始前必须输出：

```text
Security Plan:
1. Security surface:
2. Threat or risk:
3. Files to inspect:
4. Files allowed to edit:
5. Files forbidden to edit:
6. Authn/authz impact:
7. CSRF/CORS/Cookie impact:
8. Audit log impact:
9. Data exposure impact:
10. Verification commands:
```

完成后必须输出：

```text
Security Report:
1. Risk addressed:
2. Server-side enforcement checked:
3. Frontend-only protection avoided:
4. Audit/logging checked:
5. Tests run:
6. Remaining security risks:
```

## 20. 禁止事项

- 禁止只靠前端隐藏保护后台。
- 禁止把前端权限缓存当最终权限。
- 禁止降低后台接口授权。
- 禁止去掉 MFA/CSRF/rate limit 后不说明。
- 禁止提交真实密钥。
- 禁止没有审计地修生产数据。
- 禁止前端确认支付成功。
