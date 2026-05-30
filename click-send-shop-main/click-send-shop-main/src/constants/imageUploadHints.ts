/**
 * 与后端约定一致（只在服务端 sharp 处理一次，见 server/src/utils/imageOptimize.js）：
 * - 商品图 product：card 480 / detail 1280 / full 2048 WebP
 * - Banner banner：最长边 2560，quality 92
 * - 小图 thumb：最长边 256；运营图 asset：最长边 1920
 */

import { BANNER_ASPECT_RATIO, BANNER_SIZE_PRESETS } from "@/constants/bannerAspect";

export const IMAGE_UPLOAD_HINT_API =
  "格式：JPG、PNG、WebP、GIF；单张不超过 15MB。图片由服务器统一转 WebP，请不要在浏览器里重复压缩。";

export const IMAGE_UPLOAD_HINT_SITE_LOGO =
  "格式：PNG/WebP（推荐透明底）、JPG；≤5MB。上传后保留透明通道，最长边不超过 512px，只用于网站 Logo 展示。";

export const IMAGE_UPLOAD_HINT_SITE_FAVICON =
  "格式：PNG/JPG；≤5MB。上传后生成 192×192 白底方形 PNG，只用于浏览器标签，与网站 Logo 分开保存。";

/** @deprecated 请使用 IMAGE_UPLOAD_HINT_SITE_LOGO / IMAGE_UPLOAD_HINT_SITE_FAVICON */
export const IMAGE_UPLOAD_HINT_SITE_ASSET = IMAGE_UPLOAD_HINT_SITE_LOGO;

export const IMAGE_UPLOAD_HINT_HOME_NAV_ICON =
  "建议正方形清晰源图，192×192px 及以上；上传后会转成 256px WebP 小图。也可以直接填写内置图标词（如 phone、home、gift、coupon、support）、图片 URL、站内路径或 Emoji。";

export const IMAGE_UPLOAD_HINT_BANNER_LAYOUT =
  `比例 ${BANNER_ASPECT_RATIO.toFixed(2)}:1（推荐 ${BANNER_SIZE_PRESETS}）；图片里不要放文字、按钮、价格或二维码，前台会读取标题和说明字段叠加展示；服务器最长边 2560px，WebP quality 92。`;

export const IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT =
  "封面与图集建议和站点外观里的商品图比例保持一致；上传后自动生成列表 / 详情 / 原图三档，数据库保存原图地址即可。";

export const IMAGE_UPLOAD_HINT_AVATAR =
  "建议正方形清晰源图；格式 JPG/PNG/WebP/GIF，≤15MB；服务器 thumb 档 WebP（最长边 256px）。";

export const IMAGE_UPLOAD_HINT_REVIEW =
  IMAGE_UPLOAD_HINT_API + " 本条评价最多附加 5 张图。";
