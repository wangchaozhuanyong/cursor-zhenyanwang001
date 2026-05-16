const fs = require('fs');
const path = require('path');
const catalogService = require('./catalog.service');
const contentService = require('./content.service');

const SITE_FALLBACK = {
  siteName: '大马通',
  siteDescription: '精选全球好物，品质生活购物平台',
  seoTitle: '大马通',
  seoDescription: '精选全球好物，品质生活购物平台',
  seoKeywords: '',
  ogImageUrl: '/favicon-32x32.png',
};

let cachedTemplate = null;
let cachedTemplatePath = '';
let cachedTemplateMtimeMs = 0;

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, max = 160) {
  const text = stripTags(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function uniqueKeywords(parts) {
  const out = [];
  const seen = new Set();
  parts
    .flatMap((part) => String(part || '').split(','))
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(part);
      }
    });
  return out.join(', ');
}

function getOrigin(req) {
  const configured = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
}

function absoluteUrl(value, req) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `${getOrigin(req).split('://')[0]}:${raw}`;
  const origin = getOrigin(req);
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function flattenCategories(nodes, out = []) {
  for (const node of nodes || []) {
    out.push(node);
    flattenCategories(node.children || [], out);
  }
  return out;
}

function findCategory(nodes, id) {
  if (!id || id === 'all') return null;
  return flattenCategories(nodes).find((item) => item.id === id) || null;
}

function upsertMetaByName(html, name, content) {
  if (!content) return html;
  const escaped = escapeAttr(content);
  const pattern = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  const tag = `<meta name="${name}" content="${escaped}">`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function upsertMetaByProperty(html, property, content) {
  if (!content) return html;
  const escaped = escapeAttr(content);
  const pattern = new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, 'i');
  const tag = `<meta property="${property}" content="${escaped}">`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function upsertCanonical(html, canonicalUrl) {
  if (!canonicalUrl) return html;
  const tag = `<link rel="canonical" href="${escapeAttr(canonicalUrl)}">`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, tag);
  }
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function injectJsonLd(html, data) {
  if (!data) return html;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace(
    '</head>',
    `    <script type="application/ld+json">${json}</script>\n  </head>`,
  );
}

function injectSeoBody(html, bodyHtml) {
  if (!bodyHtml) return html;
  const root = '<div id="root"></div>';
  if (!html.includes(root)) return html;
  return html.replace(root, `<div id="root">\n${bodyHtml}\n    </div>`);
}

function renderHtmlWithSeo(template, seo) {
  let html = template;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  html = upsertMetaByName(html, 'description', seo.description);
  html = upsertMetaByName(html, 'keywords', seo.keywords);
  html = upsertMetaByProperty(html, 'og:type', seo.ogType || 'website');
  html = upsertMetaByProperty(html, 'og:title', seo.title);
  html = upsertMetaByProperty(html, 'og:description', seo.description);
  html = upsertMetaByProperty(html, 'og:image', seo.imageUrl);
  html = upsertMetaByProperty(html, 'og:url', seo.canonicalUrl);
  html = upsertMetaByName(html, 'twitter:card', seo.imageUrl ? 'summary_large_image' : 'summary');
  html = upsertMetaByName(html, 'twitter:title', seo.title);
  html = upsertMetaByName(html, 'twitter:description', seo.description);
  html = upsertMetaByName(html, 'twitter:image', seo.imageUrl);
  html = upsertCanonical(html, seo.canonicalUrl);
  html = injectJsonLd(html, seo.jsonLd);
  html = injectSeoBody(html, seo.bodyHtml);
  return html;
}

function readTemplate(frontendDist) {
  const templatePath = path.join(frontendDist, 'index.html');
  const stat = fs.statSync(templatePath);
  if (
    cachedTemplate
    && cachedTemplatePath === templatePath
    && cachedTemplateMtimeMs === stat.mtimeMs
  ) {
    return cachedTemplate;
  }
  cachedTemplate = fs.readFileSync(templatePath, 'utf8');
  cachedTemplatePath = templatePath;
  cachedTemplateMtimeMs = stat.mtimeMs;
  return cachedTemplate;
}

async function getSiteInfo() {
  try {
    return { ...SITE_FALLBACK, ...(await contentService.getPublicSiteInfo()) };
  } catch (err) {
    console.warn(`[seo] site settings fallback: ${err?.message || err}`);
    return SITE_FALLBACK;
  }
}

function productSeo({ product, site, req }) {
  const siteName = (site.siteName || SITE_FALLBACK.siteName).trim();
  const title = `${product.name} · ${siteName}`;
  const description = truncate(
    product.description
      || `${product.name}，价格 RM ${product.price}。${site.seoDescription || site.siteDescription}`,
  );
  const image = product.cover_image || product.images?.[0] || site.ogImageUrl || '/favicon-32x32.png';
  const imageUrl = absoluteUrl(image, req);
  const canonicalUrl = `${getOrigin(req)}${req.path}`;
  const tagKeywords = (product.tags || []).map((tag) => tag.name).join(', ');
  const keywords = uniqueKeywords([product.name, tagKeywords, site.seoKeywords]);

  const tagText = (product.tags || []).map((tag) => tag.name).filter(Boolean).join('、');
  const bodyHtml = `    <article data-seo-prerender="product">
      <h1>${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(description)}</p>
      <p>价格：RM ${escapeHtml(product.price)}</p>
      ${tagText ? `<p>标签：${escapeHtml(tagText)}</p>` : ''}
      <p>库存：${escapeHtml(product.stock)} 件</p>
    </article>`;

  return {
    title,
    description,
    keywords,
    imageUrl,
    canonicalUrl,
    ogType: 'product',
    bodyHtml,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image: imageUrl ? [imageUrl] : undefined,
      sku: product.id,
      offers: {
        '@type': 'Offer',
        priceCurrency: site.currency || 'MYR',
        price: product.price,
        availability: Number(product.stock) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: canonicalUrl,
      },
    },
  };
}

async function categoriesSeo({ site, req }) {
  const siteName = (site.siteName || SITE_FALLBACK.siteName).trim();
  const categoryId = String(req.query.cat || '').trim();
  const categories = await catalogService.getCategories();
  const selected = findCategory(categories, categoryId);
  const productQuery = {
    category_id: selected ? selected.id : undefined,
    page: 1,
    pageSize: 12,
  };
  const { list } = await catalogService.getProducts(productQuery);
  const pageName = selected ? `${selected.name}商品分类` : '商品分类';
  const title = `${pageName} · ${siteName}`;
  const description = truncate(
    selected
      ? `浏览${selected.name}分类下的精选商品。${site.seoDescription || site.siteDescription}`
      : `${siteName}商品分类，浏览精选全球好物。${site.seoDescription || site.siteDescription}`,
  );
  const canonicalUrl = `${getOrigin(req)}${req.path}${selected ? `?cat=${encodeURIComponent(selected.id)}` : ''}`;
  const categoryNames = flattenCategories(categories).map((item) => item.name).filter(Boolean);
  const keywords = uniqueKeywords([pageName, categoryNames.join(', '), site.seoKeywords]);
  const imageUrl = absoluteUrl(site.ogImageUrl || '/favicon-32x32.png', req);
  const productItems = list
    .map((product) => `<li><a href="/product/${escapeAttr(product.id)}">${escapeHtml(product.name)}</a> - RM ${escapeHtml(product.price)}</li>`)
    .join('\n        ');
  const categoryItems = categoryNames
    .slice(0, 30)
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join('\n        ');

  return {
    title,
    description,
    keywords,
    imageUrl,
    canonicalUrl,
    ogType: 'website',
    bodyHtml: `    <article data-seo-prerender="categories">
      <h1>${escapeHtml(pageName)}</h1>
      <p>${escapeHtml(description)}</p>
      ${categoryItems ? `<h2>分类导航</h2>\n      <ul>\n        ${categoryItems}\n      </ul>` : ''}
      ${productItems ? `<h2>商品列表</h2>\n      <ul>\n        ${productItems}\n      </ul>` : ''}
    </article>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageName,
      description,
      url: canonicalUrl,
    },
  };
}

async function buildSeoForRequest(req) {
  const site = await getSiteInfo();
  if (/^\/product\/[^/]+\/?$/.test(req.path)) {
    const productId = decodeURIComponent(req.path.split('/')[2] || '');
    const product = await catalogService.getProductById(productId);
    if (product) return productSeo({ product, site, req });
  }

  if (req.path === '/categories' || req.path === '/categories/') {
    return categoriesSeo({ site, req });
  }

  return {
    title: site.seoTitle || site.siteName || SITE_FALLBACK.seoTitle,
    description: truncate(site.seoDescription || site.siteDescription || SITE_FALLBACK.seoDescription),
    keywords: site.seoKeywords || '',
    imageUrl: absoluteUrl(site.ogImageUrl || '/favicon-32x32.png', req),
    canonicalUrl: `${getOrigin(req)}${req.path}`,
  };
}

function registerSeoPrerender(app, { frontendDist }) {
  const handler = async (req, res, next) => {
    try {
      const template = readTemplate(frontendDist);
      const seo = await buildSeoForRequest(req);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.type('html').send(renderHtmlWithSeo(template, seo));
    } catch (err) {
      console.warn(`[seo] prerender failed for ${req.path}: ${err?.message || err}`);
      next();
    }
  };

  app.get('/product/:id', handler);
  app.get('/categories', handler);
}

module.exports = {
  registerSeoPrerender,
  renderHtmlWithSeo,
  productSeo,
  categoriesSeo,
  _private: {
    absoluteUrl,
    escapeHtml,
    flattenCategories,
    truncate,
    uniqueKeywords,
  },
};
