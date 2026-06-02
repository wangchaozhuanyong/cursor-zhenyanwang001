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

function setNoStoreHtmlHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeCategoryFaq(value) {
  const raw = Array.isArray(value) ? value : parseJsonArray(value);
  return raw
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer);
}

function buildCategoryFaqJsonLd(faq) {
  const items = Array.isArray(faq) ? faq : [];
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
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
  const image = toAbsolute(baseUrl, siteInfo.ogImageUrl || siteInfo.logoUrl || '/og-default.png');
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

function resolveTikTokOgImage(baseUrl, siteInfo) {
  const fallback = toAbsolute(baseUrl, '/assets/tiktok-logo.jpeg');
  const candidate = String(siteInfo.logoUrl || siteInfo.faviconUrl || '').trim();
  if (!candidate) return fallback;

  try {
    const baseHost = new URL(baseUrl).hostname;
    const imageUrl = new URL(candidate, baseUrl);
    if (imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:') {
      return imageUrl.hostname === baseHost ? fallback : imageUrl.href;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function buildTikTokPayload(baseUrl, siteInfo) {
  const basePayload = buildHomePayload(baseUrl, siteInfo);
  const landingUrl = `${baseUrl}/tiktok`;
  const siteName = resolveSiteName(siteInfo);
  const image = resolveTikTokOgImage(baseUrl, siteInfo);
  const description = `${siteName}为 TikTok 用户提供马来西亚找房安家、留学陪读、签证咨询、本地办事、维修搬家和商务资源入口。`;
  return {
    ...basePayload,
    title: `${siteName} TikTok 用户入口 | 马来西亚生活服务导航`,
    description,
    keywords: `${siteName},TikTok,马来西亚生活服务,马来西亚找房,马来西亚留学,马来西亚签证`,
    ogTitle: `${siteName} TikTok 用户入口`,
    ogDescription: description,
    ogImage: image,
    twitterImage: image,
    canonical: landingUrl,
    ogUrl: landingUrl,
    robots: 'index,nofollow',
    googleSiteVerification: '',
    prerenderH1: `${siteName} TikTok 用户入口`,
    prerenderText: description,
    jsonLd: [],
  };
}

async function registerSeoPrerender(app, { frontendDist }) {
  const indexPath = path.join(frontendDist, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  const render = async (req, res, payloadBuilder) => {
    setNoStoreHtmlHeaders(res);
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

  app.get('/tiktok', (req, res) => render(req, res, async (baseUrl, siteInfo) => buildTikTokPayload(baseUrl, siteInfo)));

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
    const categoryGuide = String(category?.buying_guide || '').trim();
    const categoryFaq = normalizeCategoryFaq(category?.faq_json);
    const categoryFaqJsonLd = buildCategoryFaqJsonLd(categoryFaq);
    const basePayload = buildHomePayload(baseUrl, siteInfo);
    return {
      ...basePayload,
      canonical: categoryName
        ? `${baseUrl}/categories?cat=${encodeURIComponent(category.id)}`
        : `${baseUrl}/categories`,
      title: categoryTitle || (categoryName ? `${categoryName}｜${siteName}` : `全部分类｜${siteName}`),
      description: categoryName
        ? truncate(stripHtml(categoryDescription || `浏览${siteName} ${categoryName} 相关商品与服务信息。`), 150)
        : `浏览${siteName}的商品与服务分类信息。`,
      prerenderH1: categoryName || '全部分类',
      prerenderText: categoryDescription || categoryGuide || '',
      jsonLd: categoryFaqJsonLd ? [...basePayload.jsonLd, categoryFaqJsonLd] : basePayload.jsonLd,
    };
  }));
  app.get('/help', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `帮助中心｜${resolveSiteName(siteInfo)}`,
    description: `查看${resolveSiteName(siteInfo)}常见问题、下单流程、支付配送、售后退款与账户说明。`,
    canonical: `${baseUrl}/help`,
    prerenderH1: '帮助中心',
    prerenderText: '查看大马通常见问题，包括下单、配送、售后、退款、签证、留学、第二家园和联系客服说明。',
  })));
  app.get('/support-download', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `客服/下载 - ${resolveSiteName(siteInfo)}`,
    description: `联系${resolveSiteName(siteInfo)}客服，或查看如何把商城添加到手机桌面。`,
    canonical: `${baseUrl}/support-download`,
    prerenderH1: '客服与下载',
    prerenderText: '查看大马通客服联系方式、服务时间和手机桌面添加说明。',
  })));
  app.get('/about', (req, res) => render(req, res, async (baseUrl, siteInfo) => ({
    ...buildHomePayload(baseUrl, siteInfo),
    title: `关于我们｜${resolveSiteName(siteInfo)}`,
    description: `了解${resolveSiteName(siteInfo)}的平台信息、服务范围和联系方式。`,
    canonical: `${baseUrl}/about`,
    prerenderH1: '关于我们',
    prerenderText: '了解大马通的平台信息、服务范围、联系方式和面向马来西亚中文用户的业务说明。',
  })));
  app.get('/content/:slug', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const page = await contentService.getContentPageBySlug(req.params.slug);
    if (!page) return null;
    const seoTitle = page.seo_title || '';
    const seoDesc = page.seo_description || '';
    const contentText = stripHtml(page.content || NEUTRAL_SITE_DESCRIPTION);
    return {
      ...buildHomePayload(baseUrl, siteInfo),
      title: seoTitle || `${page.title}｜${resolveSiteName(siteInfo)}`,
      description: seoDesc || truncate(contentText, 150),
      canonical: `${baseUrl}/content/${encodeURIComponent(req.params.slug)}`,
      robots: ['draft', 'hidden', 'private'].includes(String(page.status || '').toLowerCase()) || Number(page.noindex || 0) === 1 ? 'noindex,follow' : 'index,follow',
      prerenderH1: page.title,
      prerenderText: truncate(contentText, 260),
    };
  }));
  app.get('/product/:id', (req, res) => render(req, res, async (baseUrl, siteInfo) => {
    const product = await catalogService.getProductById(req.params.id);
    if (!product) return null;
    const restricted = isRestrictedProduct(product) || Number(product.allow_index || 1) !== 1;
    const title = `${product.name}｜${resolveSiteName(siteInfo)}`;
    const description = restricted
      ? '本页面包含受年龄、地区或当地法规限制的商品或服务信息，仅面向符合法定年龄并符合当地规定的用户展示。具体适用范围以当地法律法规、平台规则和客服确认为准。'
      : truncate(stripHtml(product.description || `查看 ${product.name} 的详情、价格、库存状态与客服咨询说明。具体购买或办理信息以下单页面和客服确认为准。`), 150);
    const basePayload = buildHomePayload(baseUrl, siteInfo);
    const productJsonLd = buildProductJsonLd(baseUrl, product, description);
    return {
      ...basePayload,
      title,
      description,
      canonical: `${baseUrl}/product/${encodeURIComponent(product.id)}`,
      ogType: 'product',
      ogImage: toAbsolute(baseUrl, product.cover_image || (Array.isArray(product.images) ? product.images[0] : '') || siteInfo.ogImageUrl || '/og-default.png'),
      robots: restricted ? 'noindex,follow' : 'index,follow',
      prerenderH1: product.name,
      prerenderText: description,
      jsonLd: productJsonLd ? [...basePayload.jsonLd, productJsonLd] : basePayload.jsonLd,
    };
  }));
}

module.exports = { registerSeoPrerender, renderHtmlWithSeo };
