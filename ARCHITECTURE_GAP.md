# 架构缺口与修复进度（Modular Monolith + 分层）

> 与仓库代码同步的跟踪文档；每次架构批次完成后应更新「已完成 / 未完成」。

## 一、后端

| 项 | 状态 | 说明 |
|----|------|------|
| 统一响应 `code/message/data/traceId` | 部分 | `middleware/response.js` 已统一；个别路径需逐个核对 |
| 分页 `res.paginate` / `data.list+total+page...` | 部分 | 管理端多数列表已分页；前端已逐步用 `unwrapPaginated` 消费 |
| Controller 薄、Service/Repository | 部分 | `adminExtended`、部分订单事务仍偏厚；订单状态机已在 `orderStateMachine` |
| Service 不写 SQL | 未完全 | `adminOrder.service` 等事务内仍有 `conn.query`；应下沉到 `order.repository` |
| RBAC | 已完成核心 | 表结构、`requirePermission`、前端菜单与 `PermissionGate` |
| Audit Log | 部分 | `writeAuditLog` 已覆盖多写操作；非全量，需按接口清单补录 |
| 状态机（订单/支付等） | 部分 | 订单履约/支付迁移有校验；售后、优惠券、积分等需专项统一 |

## 二、前端

| 项 | 状态 | 说明 |
|----|------|------|
| Page 不直连 fetch（业务 API） | 已满足 | 业务请求经 `api/request.ts`；页面未见裸 `axios` |
| Page 少写数据形态兼容 | 进行中 | 统一模块：`src/services/responseNormalize.ts`（用户端 + 管理端 Service 共用） |
| Store 覆盖管理列表页 | 进行中 | 已示范：`useAdminOrdersStore`、`useAdminProductsStore`、`useAdminUsersStore`（含离开页 `reset`）；其余列表页可仿照 |
| Service 承载业务编排 | 部分 | 报表 bundle、导出工具已下沉；更多规则仍在 Page |
| 权限体验层 | 部分 | 菜单/路由 + 多页按钮 `PermissionGate`；非全页面 |

## 三、报表 / 导出

| 项 | 状态 | 说明 |
|----|------|------|
| 报表数据 | 后端 | `adminReport.service` + repository |
| CSV 导出 | 前端组装为主 | `reportExportService`；可选后续改为服务端导出 + 审计 |

## 四、测试与验收

| 项 | 状态 |
|----|------|
| `npm run typecheck` | 每次改动应执行 |
| `npm run test` / `server` 测试 | 发版前执行 |
| RBAC / 审计矩阵自动化测试 | 待补 |

## 五、本批次完成项（见提交说明）

- **响应解包统一**：`click-send-shop-main/src/services/responseNormalize.ts`（由原 `services/admin/normalize.ts` 提升而来，避免用户端依赖 `admin` 目录）。
- **管理端 Service** 全部改为从 `@/services/responseNormalize` 引入；列表/分页行为与上一批一致。
- **用户端 Service** 已接入 `unwrapPaginated`：`orderService.fetchOrders`、`returnService.fetchReturnRequests`、`notificationService.fetchNotifications`、`inviteService.fetchInviteRecords`（与 `useOrderStore` / `useNotificationStore` / `Returns` / `Invite` 等现有 `.list` 用法兼容）。
- **风险**：同上，非标准 `data` 会退化为空分页。
- **验收**：发版前执行 `npm run typecheck`。

### 批次：通知未读数 + 管理订单 Store

- `responseNormalize.unwrapCount`：`notificationService.fetchUnreadCount` 不再使用断言强转。
- `stores/useAdminOrdersStore.ts`：订单列表的筛选、加载、`applyOrderStatus`；toast 仍在 `AdminOrders` 页。
- `AdminOrders.tsx`：接入 Store；`useLayoutEffect` 在进入页时置 `loading`，减轻 Zustand 持久态导致的旧列表闪现。

### 批次：订单/商品 Store 复位 + 商品列表 Store

- `useAdminOrdersStore.reset`：离开 `AdminOrders` 时 `useEffect` cleanup 调用，避免全局缓存干扰。
- `stores/useAdminProductsStore.ts`：商品列表、搜索、多选、`loadProducts`、`applyProductStatus` / `applyStatusToIds`、`replaceProducts`、`reset`。
- `AdminProducts.tsx`：接入 Store；离开页面时 `reset`；行为与原先「全选当前页」一致（`togglePageSelection`）。

### 批次：管理用户列表 Store

- `stores/useAdminUsersStore.ts`：`users` / `loading` / `search`、`loadUsers`、`reset`；导出 `AdminUserListItem` 与列表行字段对齐。
- `AdminUsers.tsx`：接入 Store；`useLayoutEffect` + 离开页 `reset`。

## 六、建议后续顺序

1. 订单相关 SQL 全部迁入 `order.repository`，`adminOrder.service` 只保留编排与审计调用。
2. 择一管理列表页（如订单）引入 `zustand` 领域 Store，作为模板推广。
3. 报表导出服务端化（可选）与 `writeAuditLog` 绑定。
4. 补 API 契约文档（OpenAPI 或手写 `contracts/`）与前端类型对齐。
