const fs = require('fs');
const path = require('path');
const catalogService = require('./service/catalog.service');
const contentService = require('./service/content.service');
const { NEUTRAL_SITE_DESCRIPTION, resolveSiteDescription, resolveSiteName } = require('../../config/instance');

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

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildWebsiteJsonLd(baseUrl, siteInfo) {
  const siteName = resolveSiteName(siteInfo);
  const description = truncate(stripHtml(siteInfo.seoDescription || resolveSiteDescription(siteInfo)), 180);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?keyword={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function buildOrganizationJsonLd(baseUrl, siteInfo) {
  const siteName = resolveSiteName(siteInfo);
  const description = truncate(stripHtml(siteInfo.seoDescription || resolveSiteDescription(siteInfo)), 180);
  const sameAs = [
    siteInfo.facebookUrl,
    siteInfo.instagramUrl,
    siteInfo.tiktokUrl,
    siteInfo.xhsUrl,
    siteInfo.youtubeUrl,
    ...parseJsonArray(siteInfo.otherSocialLinks),
  ].map((url) => String(url || '').trim()).filter(Boolean);

  const output = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: baseUrl,
    description,
  };
  const logo = toAbsolute(baseUrl, siteInfo.logoUrl || siteInfo.faviconUrl || '');
  if (logo) output.logo = logo;
  if (sameAs.length > 0) output.sameAs = sameAs;
  return output;
}

function buildProductJsonLd(baseUrl, product, description) {
  if (!product || isRestrictedProduct(product)) return null;
  const price = Number(product.price);
  const stock = Number(product.stock || 0);
  const image = toAbsolute(
    baseUrl,
    product.cover_image || (Array.isArray(product.images) ? product.images[0] : ''),
  );
  const offers = {
    '@type': 'Offer',
    url: `${baseUrl}/product/${encodeURIComponent(product.id)}`,
    priceCurrency: 'MYR',
    availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
  };
  if (Number.isFinite(price) && price >= 0) offers.price = price;

  const output = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncate(stripHtml(description || product.description || ''), 200),
    sku: product.default_variant?.sku_code || product.id,
    offers,
  };
  if (image) output.image = [image];
  return output;
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

function renderTikTokEntryHtml(baseHtml) {
  let html = baseHtml;
  html = /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, '<title>大马通</title>')
    : html.replace('</head>', '  <title>大马通</title>\n</head>');
  html = html
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']author["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  return upsertMeta(html, 'name', 'robots', 'noindex,nofollow');
}

async function getSiteInfoSafe() {
  try {
    return await contentService.getPublicSiteInfo();
  } catch {
    return {};
  }
}

function buildHomePayload(baseUrl, siteInfo) {
  const siteName = resolveSiteName(siteInfo);
  const description = siteInfo.seoDescription || resolveSiteDescription(siteInfo);
  const title = siteInfo.seoTitle || siteName;
  const image = toAbsolute(baseUrl, siteInfo.ogImageUrl || siteInfo.defaultOgImageUrl || siteInfo.logoUrl || '/og-default.png');
  return {
    title,
    description,
    canonical: `${baseUrl}/`,
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    ogType: 'website',
    ogSiteName: siteName,
    googleSiteVerification: siteInfo.googleSiteVerification || '',
    robots: 'index,follow',
    prerenderH1: siteName,
    prerenderText: description,
    jsonLd: [
      buildWebsiteJsonLd(baseUrl, siteInfo),
      buildOrganizationJsonLd(baseUrl, siteInfo),
    ],
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

  app.get('/tiktok', (req, res) => {
    try {
      const baseHtml = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.type('html').send(renderTikTokEntryHtml(baseHtml));
    } catch {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.sendFile(indexPath);
    }
  });

  app.get('/', (req, res) => render(req, res, async (baseUrl, siteInfo) => buildHomePayload(baseUrl, siteInfo)));
  app.get('/new-arrivals', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `新品上市｜${resolveSiteName(siteInfo)}`,
    description: `查看${resolveSiteName(siteInfo)}最新发布的商品、服务与活动信息。`,
    canonical: `${baseUrl}/new-arrivals`,
  })));
  app.get('/categories', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const siteName = resolveSiteName(siteInfo);
    const categoryId = String(req.query?.cat || '').trim();
    let category = null;
    if (categoryId && categoryId !== 'all') {
      try {
        category = await catalogService.getCategoryById(categoryId);
      } catch {
        category = null;
      }
    }
    const categoryName = String(category?.name || '').trim();
    const categoryTitle = String(category?.seo_title || '').trim();
    const categoryDescription = String(category?.seo_description || category?.description || '').trim();
    return {
      ...buildHomePayload(baseUrl, siteInfo),
      canonical: categoryName
        ? `${baseUrl}/categories?cat=${encodeURIComponent(category.id)}`
        : `${baseUrl}/categories`,
      title: categoryTitle || (categoryName ? `${categoryName}｜${siteName}` : `全部分类｜${siteName}`),
      description: categoryName
        ? truncate(stripHtml(categoryDescription || `浏览${siteName} ${categoryName} 相关商品与服务信息。`), 150)
        : `浏览${siteName}的商品与服务分类信息。`,
      prerenderH1: categoryName || '全部分类',
      prerenderText: categoryDescription || '',
    };
  }));
  app.get('/help', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `帮助中心｜${resolveSiteName(siteInfo)}`,
    description: `查看${resolveSiteName(siteInfo)}常见问题、下单流程、支付配送、售后退款与账户说明。`,
    canonical: `${baseUrl}/help`,
  })));
  app.get('/support-download', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `客服/下载 - ${resolveSiteName(siteInfo)}`,
    description: `联系${resolveSiteName(siteInfo)}客服，或查看如何把商城添加到手机桌面。`,
    canonical: `${baseUrl}/support-download`,
  })));
  app.get('/about', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `关于我们｜${resolveSiteName(siteInfo)}`,
    description: `了解${resolveSiteName(siteInfo)}的平台信息、服务范围和联系方式。`,
    canonical: `${baseUrl}/about`,
  })));
  app.get('/content/:slug', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const page = await contentService.getContentPageBySlug(req.params.slug);
    if (!page) return null;
    const seoTitle = page.seo_title || '';
    const seoDesc = page.seo_description || '';
    return {
      ...buildHomePayload(baseUrl, siteInfo),
      title: seoTitle || `${page.title}｜${resolveSiteName(siteInfo)}`,
      description: seoDesc || truncate(stripHtml(page.content || NEUTRAL_SITE_DESCRIPTION), 150),
      canonical: `${baseUrl}/content/${encodeURIComponent(req.params.slug)}`,
      robots: ['draft', 'hidden', 'private'].includes(String(page.status || '').toLowerCase()) || Number(page.noindex || 0) === 1 ? 'noindex,follow' : 'index,follow',
    };
  }));
  app.get('/product/:id', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const product = await catalogService.getProductById(req.params.id);
    if (!product) return null;
    const restricted = isRestrictedProduct(product) || Number(product.allow_index || 1) !== 1;
    const title = `${product.name}｜${resolveSiteName(siteInfo)}`;
    const description = restricted
      ? '本页面包含受年龄、地区或当地法规限制的商品或服务信息，仅面向符合法定年龄并符合当地规定的用户展示。具体适用范围以当地法律法规、平台规则和客服确认为准。'
      : truncate(stripHtml(product.description || `查看 ${product.name} 的详情、价格、库存、规格与服务信息，支持中文客服咨询。`), 150);
    const basePayload = buildHomePayload(baseUrl, siteInfo);
    const productJsonLd = buildProductJsonLd(baseUrl, product, description);
    return {
      ...basePayload,
      title,
      description,
      canonical: `${baseUrl}/product/${encodeURIComponent(product.id)}`,
      ogType: 'product',
      ogImage: toAbsolute(baseUrl, product.cover_image || (Array.isArray(product.images) ? product.images[0] : '') || siteInfo.defaultOgImageUrl || '/og-default.png'),
      robots: restricted ? 'noindex,follow' : 'index,follow',
      prerenderH1: product.name,
      prerenderText: description,
      jsonLd: productJsonLd ? [...basePayload.jsonLd, productJsonLd] : basePayload.jsonLd,
    };
  }));
}

module.exports = { registerSeoPrerender, renderHtmlWithSeo };
