const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { renderHtmlWithSeo } = require('../src/modules/product/seoPrerender');

describe('SEO prerender HTML injection', () => {
  test('injects route-specific meta tags and readable body content', () => {
    const template = `<!doctype html>
<html lang="zh-CN">
  <head>
    <title>澶ч┈閫?/title>
    <meta name="description" content="fallback">
    <meta property="og:title" content="fallback">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;

    const html = renderHtmlWithSeo(template, {
      title: '娴嬭瘯鍟嗗搧 路 澶ч┈閫?,
      description: '娴嬭瘯鍟嗗搧鎻忚堪',
      keywords: '娴嬭瘯鍟嗗搧, 鍒嗙被',
      imageUrl: 'https://example.test/cover.jpg',
      canonicalUrl: 'https://example.test/product/p1',
      ogType: 'product',
      bodyHtml: '    <article data-seo-prerender="product"><h1>娴嬭瘯鍟嗗搧</h1><p>娴嬭瘯鍟嗗搧鎻忚堪</p></article>',
      jsonLd: { '@context': 'https://schema.org', '@type': 'Product', name: '娴嬭瘯鍟嗗搧' },
    });

    assert.match(html, /<title>娴嬭瘯鍟嗗搧 路 澶ч┈閫?\/title>/);
    assert.match(html, /<meta name="description" content="娴嬭瘯鍟嗗搧鎻忚堪">/);
    assert.match(html, /<meta name="keywords" content="娴嬭瘯鍟嗗搧, 鍒嗙被">/);
    assert.match(html, /<meta property="og:type" content="product">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/example\.test\/product\/p1">/);
    assert.match(html, /<h1>娴嬭瘯鍟嗗搧<\/h1>/);
    assert.match(html, /application\/ld\+json/);
  });
});

