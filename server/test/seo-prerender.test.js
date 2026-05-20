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
      title: '测试商品｜官方商城',
      description: '测试商品描述',
      keywords: '测试商品, 分类',
      ogImage: 'https://example.test/cover.jpg',
      canonical: 'https://example.test/product/p1',
      ogType: 'product',
      prerenderH1: '测试商品',
      prerenderText: '测试商品描述',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: '测试商品' }],
    });

    assert.match(html, /<title>测试商品｜官方商城<\/title>/);
    assert.match(html, /<meta name="description" content="测试商品描述">/);
    assert.match(html, /<meta name="keywords" content="测试商品, 分类">/);
    assert.match(html, /<meta property="og:type" content="product">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/example\.test\/product\/p1">/);
    assert.match(html, /<h1>测试商品<\/h1>/);
    assert.match(html, /application\/ld\+json/);
  });
});

