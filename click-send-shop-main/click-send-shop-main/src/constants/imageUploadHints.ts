/**
 * 与后端约定一致，便于各页统一展示「上传规范」：
 * - 通用：`server/src/modules/user/upload.controller.js`（15MB、sharp 转 WebP、最长边 1600）
 * - 站点 Logo/Favicon：`adminSettings.controller.js` 5MB + `adminSiteSettings.service.js` 512/64
 */

/** 商品图、Banner（除站点资源）、OG 图、用户头像、评价图等走 `/api/upload` 或管理端 `/api/admin/upload` */
export const IMAGE_UPLOAD_HINT_API =
  "格式：JPG、PNG、WebP、GIF；单张不超过 15MB。JPG/PNG/WebP 会先在浏览器端压缩到最长边 1600px 再上传，服务器最终转为 WebP。";

/** Logo / Favicon 专用接口 */
export const IMAGE_UPLOAD_HINT_SITE_ASSET =
  "格式：JPG、PNG、WebP、GIF；单张不超过 5MB。上传后转 WebP：Logo 最长边不超过 512px，Favicon 最长边不超过 64px（均等比缩小）。";

/** 首页轮播构图建议（与通用技术限制并用） */
export const IMAGE_UPLOAD_HINT_BANNER_LAYOUT = "比例约 2.34:1（如 1170×500 / 750×320）更贴合轮播展示。";

/** 商品封面 / 轮播的构图建议（接在通用说明后或单独一行） */
export const IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT =
  "封面建议 1:1 或与商品卡比例接近；多张轮播时请尽量统一宽高比，前台更整齐。";

/** 用户头像 */
export const IMAGE_UPLOAD_HINT_AVATAR =
  "建议正方形、清晰度较好的源图（前台展示为圆形裁切）。格式：JPG、PNG、WebP、GIF；单张不超过 15MB；上传后转 WebP，最长边不超过 1600px。";

/** 评价配图（条数限制在前端 enforce） */
export const IMAGE_UPLOAD_HINT_REVIEW =
  IMAGE_UPLOAD_HINT_API + " 本条评价最多附加 5 张图。";
