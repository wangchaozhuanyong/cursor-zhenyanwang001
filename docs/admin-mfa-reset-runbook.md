# 管理员 Authenticator / MFA 重置操作手册

当管理员误删 Google Authenticator、Microsoft Authenticator 或其他 TOTP 应用后，不要直接改数据库。应由具备账号管理权限的管理员在后台重置 MFA。

## 适用范围

- 仅适用于后台管理员账号。
- 普通前台用户没有这套 `admin_mfa_settings` 绑定流程。
- 超级管理员必须保持 MFA 要求开启；重置只清除旧绑定，不关闭 MFA。

## 后台操作步骤

1. 使用具备 `role.manage` 权限的管理员账号登录后台。
2. 进入“账号 / 员工管理”。
3. 找到目标管理员账号，点击“安全”。
4. 在“员工安全设置”中点击“重置身份验证器（MFA）”。
5. 在确认框中核对目标手机号和昵称后确认。
6. 通知目标管理员重新登录后台，并按页面提示扫描新的二维码绑定 Authenticator。

## 重置后的系统行为

- 清空目标账号旧的 TOTP secret。
- 设置 `enabled=0`，保留 `required=1`。
- 撤销该账号所有可信设备。
- 提升 `refresh_token_version`，使旧登录态失效。
- 写入审计日志 `admin.security.reset_mfa`。

## 验收方式

- 目标管理员再次登录时，不再要求旧验证码。
- 系统进入重新绑定身份验证器流程。
- 绑定新 Authenticator 后，可以使用新的 6 位验证码登录。
- 员工安全设置里 MFA 状态会回到“已启用”。

## 紧急兜底

如果后台没有可登录的高权限管理员，才使用服务器脚本：

```bash
cd /var/www/damatong/current/server
node scripts/reset-admin-mfa.js <手机号>
```

脚本只用于应急；常规场景应优先使用后台操作，确保审计链路完整。
