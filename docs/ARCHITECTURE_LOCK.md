# 后端架构锁定说明

本项目后端锁定为：模块化单体架构 + 分层设计。

这份说明以后作为新增功能、修改功能、重构代码的硬规则。除非明确做架构升级，否则不要绕开这里的规则。

## 当前锁定结论

- 后端仍然是一个 Node.js 单体服务，不拆微服务。
- 所有业务 API 统一挂在 `/api` 下。
- 管理后台接口统一使用 `/api/admin/*`。
- 健康检查固定为 `/api/health/live` 和 `/api/health/ready`。
- 当前后端模块固定为 24 个。
- 每个模块必须保留 `routes / controller / service / repository` 四层目录。
- 新增功能必须先判断归属模块，再判断归属层级。
- 新增模块必须经过人工确认，不允许随手新建。

## 当前 24 个模块

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
monitoring
myinvois
notification
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

模块清单的代码入口是：

```text
server/scripts/architecture-rules.js
```

以后确实要新增模块时，必须同时完成：

1. 说明为什么现有 24 个模块放不下。
2. 在 `server/src/modules/<newModule>/` 下创建标准四层目录。
3. 创建模块入口 `index.js`。
4. 在 `server/scripts/architecture-rules.js` 更新模块清单。
5. 更新本文档的模块清单。
6. 运行 `npm run architecture:check` 并通过。

## 分层职责

### routes

只负责路由绑定和中间件挂载。

允许：

- `router.get/post/put/delete(...)`
- 绑定鉴权、上传、限流等中间件
- 调用本模块 controller

不允许：

- 写业务判断
- 直接查数据库
- 直接调用 service 或 repository
- 拼装复杂返回数据

### controller

只负责 HTTP 入参和返回结果。

允许：

- 读取 `req.params / req.query / req.body`
- 调用本模块 service
- 使用统一响应方法返回结果

不允许：

- 直接操作 SQL
- 直接调用 repository
- 写复杂业务规则
- 跨模块调用别的模块内部实现

### service

只负责业务逻辑。

允许：

- 做业务判断
- 编排本模块 repository
- 处理事务流程
- 调用明确公开的模块能力

不允许：

- 直接写 SQL
- 直接 `db.query / pool.query / conn.execute`
- 绕过模块边界调用其他模块 repository/controller/routes

### repository

只负责数据库读写。

允许：

- SQL 查询
- SQL 更新
- 事务内数据库操作

不允许：

- 写业务判断
- 做用户权限判断
- 决定订单、支付、售后等业务状态
- 调用 controller 或 routes

## 跨模块规则

禁止 A 模块直接引用 B 模块的内部层级文件，例如：

```text
src/modules/order/service/... -> src/modules/product/repository/...
src/modules/admin/controller/... -> src/modules/order/service/...
```

如果确实需要跨模块协作，优先采用下面方式：

1. 先判断是否应该由一个已有模块统一编排。
2. 如果是订单、支付、库存等强流程，优先由主流程模块的 service 编排。
3. 被调用模块只暴露清晰、稳定的公开能力，不暴露内部 repository。
4. 如果跨模块流程变复杂，再单独评估是否增加 application/orchestration 层。

## API 路径规则

业务接口必须统一从 `/api` 开始。

固定规则：

```text
/api/admin/*
/api/health/live
/api/health/ready
```

允许存在的非 API 路径：

```text
/robots.txt
/sitemap.xml
/product/:id
/category 或 /categories 相关公开页面
前端静态资源路径
SEO 预渲染页面路径
```

这些路径不是业务 API，是公开页面、SEO 或静态资源入口，不算违反 `/api` 规则。

## 允许例外

下面这些地方不按普通业务模块处理：

- `server/src/app.js`、`server/src/index.js`：应用启动和全局挂载。
- `server/src/config`：配置。
- `server/src/middleware`：通用中间件。
- `server/src/errors`：通用错误类型。
- `server/src/utils`：无业务归属的通用工具。
- `server/scripts`：迁移、备份、初始化、检查脚本。
- 数据库迁移文件：允许直接写 SQL。
- 备份和恢复脚本：允许直接访问数据库。

注意：如果工具函数开始承载商品、订单、支付、售后等业务规则，就不能继续放在 `utils`，必须迁回对应模块的 service。

## 不适合强行套本架构的情况

以下情况需要额外说明，不要硬塞进现有层级：

1. 数据库迁移：迁移文件本来就是结构变更脚本，可以直接写 SQL。
2. 一次性数据修复脚本：可以在 `server/scripts` 内处理，但必须说明影响范围。
3. 备份/恢复/部署脚本：属于运维工具，不属于业务模块。
4. SEO 预渲染公开页面：它服务搜索引擎和前台访问，不是普通 `/api` 接口。
5. 很复杂的跨模块业务流程：先评估主归属模块，必要时再新增 application/orchestration 层，但不能私自新增。

## 新增功能流程

每次新增功能必须按这个顺序：

1. 判断属于哪个模块。
2. 判断是否需要改 routes/controller/service/repository。
3. routes 只加路由。
4. controller 只收参数和返回结果。
5. service 写业务逻辑。
6. repository 写数据库操作。
7. 最后运行：

```bash
npm run architecture:check
```

## 架构验收命令

在 `server` 目录运行：

```bash
npm run architecture:check
```

这个命令会检查：

- 模块数量和模块名称是否符合锁定清单。
- 每个模块是否有标准四层目录。
- service/controller/routes 是否越层操作数据库或调用 repository。
- 模块之间是否直接引用对方内部层级。

CI 已接入这个命令。以后代码合并前，架构检查必须通过。
