# `src/modules` — 前端模块化（前台 / 后台）

## 顶层划分

- **`public/`** —— 前台用户侧 SPA（与后端 `/api/**` 对应；不含 `/api/admin/**` 调用）。
- **`admin/`** —— 后台管理 SPA（与后端 `/api/admin/**` 对应；通过 `AdminLayout` 与 `useAdminAuthStore` 隔离登录态）。

> 以"后台与前台路由 / store / 静态资源完全分离"为强约束，避免前台与后台耦合。

## 业务域目录约定

每个 SPA 内部按"业务域"拆分页面：

### `public/pages/`

| 子目录 | 说明 |
|--------|------|
| `home` | 首页 |
| `auth` | 登录、注册、找回密码（前台） |
| `product` | 商品列表/详情、分类、搜索 |
| `cart` | 购物车 |
| `order` | 下单、订单列表/详情、售后 |
| `user` | 个人资料、收藏、地址、积分、奖励、邀请、消息、优惠券、设置 |
| `content` | 帮助中心、关于我们等内容页 |
| `error` | 404 / 全局错误页 |

### `admin/pages/`

| 子目录 | 说明 |
|--------|------|
| `auth` | 后台登录、个人账户、子账号 |
| `dashboard` | 数据看板 |
| `product` | 商品 / 分类 / 商品标签 / Banner |
| `order` | 订单 / 售后 / 物流模板 |
| `user` | 会员 / 邀请 |
| `coupon` | 优惠券 / 领用记录 |
| `review` | 评论审核 |
| `notification` | 站内信群发 |
| `report` | 报表 / 导出中心 |
| `settings` | 站点设置 / 静态内容 / 积分规则 / 邀请规则 |
| `rbac` | 角色与权限 |
| `system` | 操作日志 / 回收站 |

## 推荐组件/服务约定

- 页面（`*.tsx`）只放在 `pages/{domain}/`。
- 与某个域强相关、可复用的展示组件可放：`modules/{public|admin}/components/{domain}/`（按需新增）。
- API 客户端集中在 `src/api/modules/*` 与 `src/api/admin/*`，由 `src/services/**` 包装为业务函数。

## 严禁事项

- 不要在 `public/**` 内 import `admin/**`，反向亦然。
- 不要在路由文件之外自行决定登录态/权限校验，应由 `ProtectedRoute` 和 `AdminLayout` 统一处理。
