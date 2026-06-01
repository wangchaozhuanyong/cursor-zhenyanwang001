# 媒体上传自动处理方案

## 最终选择

生产环境统一走“对象存储 + CDN”：

- 存储：使用 S3 兼容对象存储，优先 AWS S3，也兼容 Cloudflare R2、阿里 OSS 这类 S3 兼容服务。
- 访问：客户端只访问 CDN 域名，不直接依赖应用服务器 `/uploads`。
- 图片：上传后由后端统一校验、转码、压缩、生成多尺寸 WebP。
- 视频：先安全上传到对象存储并记录资产台账；自动转码放到独立 worker 或云转码服务中执行，避免拖慢 API 主进程。

这样做的原因很简单：图片和视频都不应该长期堆在 API 服务器上。API 服务器负责业务逻辑，媒体文件交给对象存储和 CDN，前台加载速度和服务器稳定性都会更好。

## 当前已具备

- `POST /api/admin/upload` 和 `POST /api/upload` 已经支持图片、视频上传。
- 图片上传后会用 `sharp` 转成安全格式。
- 商品图会生成三档：
  - `card`：列表和卡片图，最长边 480px。
  - `detail`：详情页主图，最长边 1280px。
  - `full`：原始展示图，最长边 2048px。
- Banner、站点图标、小图有各自尺寸规则。
- 已支持 `STORAGE_DRIVER=s3` 和预签名上传。
- 已新增 `uploaded_assets` 资产台账，用来记录上传者、用途、文件类型、存储位置、处理状态和文件大小。

## 管理后台自动化规则

后台人员只负责上传源文件，不需要手工压缩：

- 商品图片：后台上传原图，系统自动生成列表图、详情图、完整图。
- Banner 图片：后台上传原图，系统自动压到适合首页轮播的 WebP。
- Logo / Favicon：后台上传后自动转成站点需要的尺寸和格式。
- 商品视频：后台可上传，但当前只做安全校验、对象存储、CDN 分发和台账记录；转码不放在 API 请求里直接做。

## 为什么视频不直接在上传接口里压缩

视频转码比图片压缩重很多。如果用户上传 30MB 或 50MB 视频，API 主进程直接转码会带来几个风险：

- 管理后台上传接口等待时间很长；
- API 进程 CPU 被占满，影响前台下单、浏览商品；
- 多个人同时上传时，服务器可能卡住；
- 转码失败时不容易恢复。

更安全的方式是：

1. 先把原始视频上传到对象存储。
2. 在 `uploaded_assets` 中记录状态。
3. 后台 worker 或云转码服务异步处理。
4. 转码成功后生成 `mp4`、封面图、时长、分辨率。
5. 商品详情页读取处理后的 CDN 地址。

## 推荐生产环境配置

后端 `server/.env`：

```env
STORAGE_DRIVER=s3
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_BUCKET=your-media-bucket
STORAGE_S3_ACCESS_KEY_ID=your-access-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret-key
STORAGE_S3_FORCE_PATH_STYLE=false
STORAGE_PUBLIC_BASE_URL=https://cdn.example.com
STORAGE_KEY_PREFIX=damatong/prod
UPLOAD_PRESIGN_EXPIRES_SEC=300
UPLOAD_MEMORY_BUDGET_BYTES=83886080

# Optional video worker.
FFMPEG_BIN=ffmpeg
FFPROBE_BIN=ffprobe
MEDIA_TRANSCODE_POLL_MS=60000
MEDIA_TRANSCODE_BATCH_SIZE=1
VIDEO_TRANSCODE_MAX_WIDTH=1280
VIDEO_TRANSCODE_CRF=26
```

前端 `click-send-shop-main/click-send-shop-main/.env.production`：

```env
VITE_API_BASE_URL=/api
VITE_UPLOAD_STORAGE=s3
VITE_UPLOAD_PRESIGN=1
VITE_S3_PUBLIC_HOSTS=cdn.example.com
```

## CDN 缓存策略

- 图片文件名是随机 hash，不复用旧文件名，可以长期缓存。
- CDN 图片建议：
  - `Cache-Control: public, max-age=31536000, immutable`
- HTML、后台入口、`sw.js` 不长期缓存。
- 商品、Banner、站点设置接口继续使用短缓存或重新验证。

## 老 `/uploads` 文件迁移策略

不要直接删除旧文件。安全做法：

1. 先把旧 `/uploads` 文件同步到对象存储。
2. 写脚本扫描数据库里的旧 `/uploads/...` URL。
3. 转成新的 CDN URL。
4. 保留旧 `/uploads` 只读回退一段时间。
5. 确认前台没有 404 后，再清理旧文件。

这是独立迁移任务，不建议和上传自动化同一天强行上线。

## 验收清单

- 后台上传 JPG/PNG/WebP 商品图成功。
- 数据库 `uploaded_assets` 能看到 `card/detail/full` 三条记录。
- 商品列表加载的是 `-card.webp`。
- 商品详情加载的是 `-detail.webp`。
- 上传视频后 `uploaded_assets` 能看到 `media_type=video` 记录。
- 视频 worker 处理完成后，`uploaded_assets` 能看到 `web_mp4` 和 `poster` 记录。
- 生产返回的媒体 URL 必须是 CDN/S3 域名，不应该是应用服务器本地路径。
- 关闭 CDN 缓存后重新打开页面，不应出现图片 404。

## 视频 worker 运行方式

- PM2 进程名：`gc-media-worker`。
- 源视频如果带有 `metadata.transcodeRequired=true`，worker 会生成网页友好的 `web_mp4` 和封面 `poster`。
- 如果商品 `video_url` 与原始上传 URL 完全一致，worker 会自动替换为转码后的 mp4 URL。
- 前台仍建议视频默认只加载 `metadata`，用户点击播放时再加载完整视频。

## 后续扩展

下面是拓展功能，不是当前必须一次做完：

- 上传资产管理页。
- 未引用文件自动清理。
- 媒体异常监控和告警。
