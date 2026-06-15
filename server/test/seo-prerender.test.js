const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { renderHtmlWithSeo } = require('../src/modules/product/seoPrerender');

const template = `<!doctype html>
<html lang="zh-CN">
  <head>
    <title>Fallback</title>
    <meta name="description" content="fallback">
    <meta property="og:title" content="fallback">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;

describe('SEO prerender HTML injection', () => {
  test('injects route-specific meta tags and readable body content for indexable pages', () => {
    const html = renderHtmlWithSeo(template, {
      title: 'Test Product | Store',
      description: 'Test product description',
      keywords: 'test product, category',
      ogImage: 'https://example.test/cover.jpg',
      canonical: 'https://example.test/product/p1',
      ogType: 'product',
      robots: 'index,follow',
      prerenderH1: 'Test Product',
      prerenderText: 'Test product description',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: 'Test Product' }],
    });

    assert.match(html, /<title>Test Product \| Store<\/title>/);
    assert.match(html, /<meta name="description" content="Test product description">/);
    assert.match(html, /<meta name="keywords" content="test product, category">/);
    assert.match(html, /<meta name="robots" content="index,follow">/);
    assert.match(html, /<meta property="og:type" content="product">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/example\.test\/product\/p1">/);
    assert.match(html, /<h1>Test Product<\/h1>/);
    assert.match(html, /application\/ld\+json/);
  });

  test('omits prerender body content and JSON-LD for noindex pages', () => {
    const html = renderHtmlWithSeo(template, {
      title: 'Hidden Product | Store',
      description: 'Hidden product description',
      canonical: 'https://example.test/product/hidden',
      robots: 'noindex,nofollow',
      prerenderH1: 'Hidden Product',
      prerenderText: 'Hidden product description',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: 'Hidden Product' }],
    });

    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.doesNotMatch(html, /seo-prerender-content/);
    assert.doesNotMatch(html, /application\/ld\+json/);
  });
});
