const fs = require('fs');
const path = require('path');
const catalogService = require('./service/catalog.service');
const contentService = require('./service/content.service');

const RESTRICTED_KEYWORDS = [
  'tobacco', 'cigarette', 'cigar', 'smoking', 'vape', 'e-cigarette', 'nicotine',
  'alcohol', 'liquor', 'wine', 'beer', 'areca', 'betel',
  '槟榔', '烟', '香烟', '真烟', '电子烟', '尼古丁', '酒', '白酒', '啤酒', '红酒',
];

function escapeHtml(input) {
  return String(input || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function stripHtml(input) {
  return String(input || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(input, max = 150) {
  const text = String(input || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function toAbsolute(baseUrl, url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? `${baseUrl}${raw}` : `${baseUrl}/${raw}`;
}

function containsRestrictedText(value) {
  const text = String(value || '').toLowerCase();
  return RESTRICTED_KEYWORDS.some((k) => text.includes(String(k).toLowerCase()));
}

function isRestrictedProduct(product) {
  if (!product) return false;
  if (Number(product.is_age_restricted || 0) === 1) return true;
  const compliance = String(product.compliance_type || '').trim().toLowerCase();
  if (compliance && compliance !== 'normal') return true;
  return containsRestrictedText(`${product.name || ''} ${product.description || ''}`);
}

function getBaseUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const protocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function upsertMeta(html, attr, key, content) {
  if (!content) return html;
  const safe = escapeHtml(content);
  const regex = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${safe}">`;
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace('</head>', `  ${tag}\n</head>`);
}

function upsertLinkCanonical(html, canonical) {
  if (!canonical) return html;
  const safe = escapeHtml(canonical);
  const regex = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${safe}">`;
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace('</head>', `  ${tag}\n</head>`);
}

function safeJsonScript(data) {
  return JSON.stringify(data).replace(/<\//g, '<\\/');
}

function renderHtmlWithSeo(baseHtml, payload = {}) {
  let html = baseHtml;
  const title = payload.title || '';
  if (title) {
    const safeTitle = escapeHtml(title);
    html = /<title>[\s\S]*?<\/title>/i.test(html)
      ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
      : html.replace('</head>', `  <title>${safeTitle}</title>\n</head>`);
  }

  html = upsertMeta(html, 'name', 'description', payload.description);
  html = upsertMeta(html, 'name', 'keywords', payload.keywords);
  html = upsertMeta(html, 'name', 'robots', payload.robots);
  html = upsertMeta(html, 'property', 'og:title', payload.ogTitle || payload.title);
  html = upsertMeta(html, 'property', 'og:description', payload.ogDescription || payload.description);
  html = upsertMeta(html, 'property', 'og:image', payload.ogImage);
  html = upsertMeta(html, 'property', 'og:url', payload.ogUrl || payload.canonical);
  html = upsertMeta(html, 'property', 'og:type', payload.ogType || 'website');
  html = upsertMeta(html, 'property', 'og:site_name', payload.ogSiteName);
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', payload.twitterTitle || payload.title);
  html = upsertMeta(html, 'name', 'twitter:description', payload.twitterDescription || payload.description);
  html = upsertMeta(html, 'name', 'twitter:image', payload.twitterImage || payload.ogImage);
  html = upsertMeta(html, 'name', 'google-site-verification', payload.googleSiteVerification);
  html = upsertLinkCanonical(html, payload.canonical);

  const jsonLdItems = Array.isArray(payload.jsonLd) ? payload.jsonLd : [];
  if (jsonLdItems.length > 0) {
    const scripts = jsonLdItems
      .map((data, idx) => `<script type="application/ld+json" data-seo-id="prerender-${idx}">${safeJsonScript(data)}</script>`)
      .join('\n');
    html = html.replace('</head>', `  ${scripts}\n</head>`);
  }

  if (payload.prerenderH1 || payload.prerenderText) {
    const textBlock = `<div id="seo-prerender-content" data-seo-prerender="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;"><h1>${escapeHtml(payload.prerenderH1 || '')}</h1><p>${escapeHtml(payload.prerenderText || '')}</p></div>`;
    html = html.replace('<div id="root"></div>', `<div id="root"></div>${textBlock}`);
  }
  return html;
}

async function getSiteInfoSafe() {
  try {
    return await contentService.getPublicSiteInfo();
  } catch {
    return {};
  }
}

function buildHomePayload(baseUrl, siteInfo) {
  const title = siteInfo.seoTitle || '大马通｜马来西亚华人一站式生活服务与精选好物';
  const description = siteInfo.seoDescription || '大马通面向马来西亚华人用户，提供签证咨询、留学申请、第二家园、商业装修、本地生活服务与合规精选好物信息，支持中文客服沟通，适用地区以马来西亚本地为主。';
  const image = toAbsolute(baseUrl, siteInfo.ogImageUrl || siteInfo.defaultOgImageUrl || siteInfo.logoUrl || '/og-default.png');
  return {
    title,
    description,
    canonical: `${baseUrl}/`,
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    ogType: 'website',
    ogSiteName: siteInfo.siteName || '大马通',
    googleSiteVerification: siteInfo.googleSiteVerification || '',
    robots: 'index,follow',
    prerenderH1: '马来西亚华人一站式生活服务平台',
    prerenderText: '大马通提供签证咨询、留学申请、第二家园、商业装修、本地生活服务与合规精选好物信息，帮助在马华人更方便地了解服务、提交需求并联系客服。',
  };
}

async function registerSeoPrerender(app, { frontendDist }) {
  const indexPath = path.join(frontendDist, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  const render = async (req, res, payloadBuilder) => {
    try {
      const baseHtml = fs.readFileSync(indexPath, 'utf8');
      const baseUrl = getBaseUrl(req);
      const siteInfo = await getSiteInfoSafe();
      const payload = await payloadBuilder(baseUrl, siteInfo);
      if (!payload) return res.sendFile(indexPath);
      return res.type('html').send(renderHtmlWithSeo(baseHtml, payload));
    } catch {
      return res.sendFile(indexPath);
    }
  };

  app.get('/', (req, res) => render(req, res, async (baseUrl, siteInfo) => buildHomePayload(baseUrl, siteInfo)));
  app.get('/new-arrivals', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: '最新服务与精选好物｜大马通',
    description: '查看大马通最新发布的服务信息、生活服务内容与合规精选好物，适用地区以马来西亚本地为主。',
    canonical: `${baseUrl}/new-arrivals`,
  })));
  app.get('/categories', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: '全部分类｜大马通',
    description: '浏览大马通平台的服务分类与精选好物信息，覆盖马来西亚华人常用生活服务、本地服务和合规商品信息。',
    canonical: `${baseUrl}/categories`,
  })));
  app.get('/help', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: '帮助中心｜大马通',
    description: '查看大马通常见问题，包括平台服务、签证留学、第二家园、商业装修、下单流程、支付配送、售后退款、账户隐私与合规说明。',
    canonical: `${baseUrl}/help`,
  })));
  app.get('/about', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: '关于大马通｜马来西亚华人生活服务平台',
    description: '了解大马通平台定位、服务范围和联系方式。大马通面向马来西亚华人用户，提供生活服务、项目咨询与合规精选好物信息。',
    canonical: `${baseUrl}/about`,
  })));
  app.get('/content/:slug', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const page = await contentService.getContentPageBySlug(req.params.slug);
    if (!page) return null;
    const seoTitle = page.seo_title || '';
    const seoDesc = page.seo_description || '';
    return {
      ...buildHomePayload(baseUrl, siteInfo),
      title: seoTitle || `${page.title}｜大马通`,
      description: seoDesc || truncate(stripHtml(page.content || '查看大马通平台内容说明，了解相关服务流程、使用规则和注意事项。'), 150),
      canonical: `${baseUrl}/content/${encodeURIComponent(req.params.slug)}`,
      robots: ['draft', 'hidden', 'private'].includes(String(page.status || '').toLowerCase()) || Number(page.noindex || 0) === 1 ? 'noindex,follow' : 'index,follow',
    };
  }));
  app.get('/product/:id', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const product = await catalogService.getProductById(req.params.id);
    if (!product) return null;
    const restricted = isRestrictedProduct(product) || Number(product.allow_index || 1) !== 1;
    const title = `${product.name}｜${siteInfo.siteName || '大马通'}`;
    const description = restricted
      ? '本页面包含受年龄、地区或当地法规限制的商品或服务信息，仅面向符合法定年龄并符合当地规定的用户展示。具体适用范围以当地法律法规、平台规则和客服确认为准。'
      : truncate(stripHtml(product.description || `查看 ${product.name} 的详情、价格、库存、规格与服务信息，支持中文客服咨询。`), 150);
    return {
      ...buildHomePayload(baseUrl, siteInfo),
      title,
      description,
      canonical: `${baseUrl}/product/${encodeURIComponent(product.id)}`,
      ogType: 'product',
      ogImage: toAbsolute(baseUrl, product.cover_image || (Array.isArray(product.images) ? product.images[0] : '') || siteInfo.defaultOgImageUrl || '/og-default.png'),
      robots: restricted ? 'noindex,follow' : 'index,follow',
      prerenderH1: product.name,
      prerenderText: description,
    };
  }));
}

module.exports = { registerSeoPrerender, renderHtmlWithSeo };
