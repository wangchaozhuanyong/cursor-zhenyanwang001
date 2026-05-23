# 编码与中文后台防护规范

## 源码编码

- 所有源码、配置、脚本、测试、文档统一使用 UTF-8 without BOM。
- 所有文本文件统一 LF 换行。
- 不允许提交 `�`、常见 UTF-8/GBK/Latin1 乱码组合，提交前必须通过 `npm run check:text`。
- 构建前建议执行 `npm run verify`，它会串联类型检查、文本检查和构建。

## 中文后台文案

- 后台默认语言为 `zh`；用户可在管理后台切换为 `en`，选择会写入 `localStorage` 键 `admin-locale`。
- 中文后台文案必须中文优先，不要裸露英文、半英文或乱码。
- 技术缩写可以保留，但必须中文解释在前，例如：
  - 规格编号（SKU）
  - 表格文件（CSV）
  - 搜索引擎优化（SEO）
  - 浏览器图标（Favicon）
  - 链接地址（URL）

## API 与数据库

- API 返回 JSON 必须使用 `charset=utf-8`，后端统一设置 `res.charset = 'utf-8'`。
- `/api/*` 响应统一附加 `X-Robots-Tag: noindex`，避免接口内容被搜索引擎收录。
- MySQL / MariaDB 连接必须使用 `charset: 'utf8mb4'`。
- 线上数据库建议检查：

```sql
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
SHOW FULL COLUMNS FROM products;
SHOW FULL COLUMNS FROM categories;
```

- 如果历史数据已经写成乱码，需要单独做数据修复，不能靠源码重新编码自动恢复。

## CSV 导入导出

- CSV 导入需要兼容 UTF-8、UTF-8 with BOM、GBK / GB18030。
- 导入进入系统前统一转换为 UTF-8 字符串。
- 给 Excel 使用的 CSV 导出可以带 UTF-8 BOM，方便 Excel 正确打开中文。
- 源码文件不能带 BOM，CSV 导出文件可以带 BOM。

## 上传和静态资源

- 图片、视频、字体、压缩包按二进制处理，不要当字符串读取。
- JSON、CSV、TXT 需要按 UTF-8 或检测后转 UTF-8。
- 文本类上传到对象存储或本地静态目录时，建议设置正确的 `Content-Type`：
  - `application/json; charset=utf-8`
  - `text/csv; charset=utf-8`
  - `text/plain; charset=utf-8`

## 开发和提交要求

在前端项目目录 `click-send-shop-main/click-send-shop-main` 执行：

```bash
npm run check:mojibake
npm run check:admin-i18n
npm run check:text
npm run verify
```

Git hook 会在提交前自动执行 `npm run check:text`。CI 会在推送和 PR 时执行乱码检查、后台文案检查、类型检查和构建。
