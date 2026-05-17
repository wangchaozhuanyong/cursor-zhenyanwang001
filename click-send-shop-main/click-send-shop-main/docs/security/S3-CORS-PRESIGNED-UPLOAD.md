# S3 / R2 CORS：浏览器预签名上传

前端流程为 `POST /api/upload/ticket` → 浏览器 **`PUT` 预签名 URL** → `POST /api/upload/complete`。  
若 Bucket **未配置 CORS**，浏览器会在 `PUT` 阶段报跨域错误（Network 里常见为 failed / CORS error）。

## 1. 准备 Origin 列表

`AllowedOrigins` 必须与用户访问前端的地址一致（含协议，无路径），并与 `server/.env` 中 `CORS_ORIGINS` 对齐。

示例（生产）：

```text
https://flashcast.com.my
https://www.flashcast.com.my
```

本地调试可额外加入（**不要**写进生产 Bucket 长期配置，可用独立 dev bucket）：

```text
http://localhost:8080
http://127.0.0.1:8080
http://localhost:5173
```

编辑模板：`docs/security/s3-cors-presigned-upload.json`，替换 `YOUR_PRODUCTION_DOMAIN`。

## 2. AWS S3：应用 CORS

```bash
export AWS_BUCKET=your-media-bucket
export AWS_REGION=ap-southeast-1

aws s3api put-bucket-cors \
  --bucket "$AWS_BUCKET" \
  --cors-configuration file://click-send-shop-main/click-send-shop-main/docs/security/s3-cors-presigned-upload.json
```

查看当前配置：

```bash
aws s3api get-bucket-cors --bucket "$AWS_BUCKET"
```

## 3. Cloudflare R2（S3 兼容）

控制台：**R2 → 你的 Bucket → Settings → CORS Policy**，粘贴 `CORSRules` 数组内容（或整份 `s3-cors-presigned-upload.json` 中的 `CORSRules` 段）。

或使用兼容 API（需配置 `AWS_ACCESS_KEY_ID` / endpoint）：

```bash
export AWS_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
aws s3api put-bucket-cors \
  --bucket "$AWS_BUCKET" \
  --endpoint-url "$AWS_ENDPOINT_URL" \
  --cors-configuration file://click-send-shop-main/click-send-shop-main/docs/security/s3-cors-presigned-upload.json
```

`server/.env` 中需已设置 `STORAGE_S3_ENDPOINT` 指向 R2。

## 4. 验收

1. 登录站点 → **设置 → 上传验收**，上传一张 JPG/PNG。
2. 浏览器开发者工具 **Network** 应看到顺序：
   - `POST .../api/upload/ticket` → 200
   - `PUT https://...amazonaws.com/...` 或 R2 域名 → **200**
   - `POST .../api/upload/complete` → 200
3. 页面显示 **S3 校验通过**，URL 为 CloudFront / S3 公网域名。

### 常见错误

| 现象 | 原因 | 处理 |
|------|------|------|
| PUT 被浏览器拦截，无响应体 | Bucket CORS 未含站点 Origin | 补 `AllowedOrigins` |
| PUT 403 SignatureDoesNotMatch | 时钟偏差或 Content-Type 与签名不一致 | 前端已按 ticket 的 mime 设置 `Content-Type`；检查服务器时间 |
| PUT 403 AccessDenied | IAM 无 `s3:PutObject` 或 Bucket 策略拒绝 | 检查 `STORAGE_S3_*` 凭证与 `uploads/raw/*` 前缀 |
| complete 400 文件内容与类型不符 | 上传内容非真实图片 | 换合法 JPG/PNG/WebP |
| ticket 503 | 未启用 `STORAGE_DRIVER=s3` | 配置 S3 后重启 API |

## 5. 安全建议

- **不要** 使用 `"AllowedOrigins": ["*"]` 在生产媒体桶上（除非仅为临时 dev bucket）。
- `AllowedMethods` 仅需 `PUT`（可加 `HEAD` 便于调试）；不必开放 `POST`/`DELETE`。
- 公网读图走 **CloudFront + OAC**，Bucket 保持 Block Public Access（见 `cloudfront-s3-hardening-checklist.md`）。
- 预签名有效期由 `UPLOAD_PRESIGN_EXPIRES_SEC` 控制（默认 300 秒）。

## 6. 一键脚本（可选）

仓库根目录（已配置 AWS CLI 凭证时）：

```bash
bash click-send-shop-main/click-send-shop-main/scripts/security/apply-s3-cors.sh your-bucket-name
```

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File click-send-shop-main/click-send-shop-main/scripts/security/apply-s3-cors.ps1 -Bucket your-bucket-name
```
