const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildRobotsTxt, buildSitemapXml } = require('../src/modules/seo/service/seo.service');

function fakeRequest() {
  return {
    protocol: 'https',
    get(name) {
      if (name === 'x-forwarded-proto') return 'https';
      if (name === 'host') return 'damatong.net';
      return '';
    },
  };
}

function readUserAgentGroup(robots, userAgent) {
  const marker = `User-agent: ${userAgent}`;
  const start = robots.indexOf(marker);
  assert.notEqual(start, -1, `${marker} group should exist`);
  const rest = robots.slice(start);
  const end = rest.indexOf('\n\n');
  return end >= 0 ? rest.slice(0, end) : rest;
}

describe('SEO robots rules', () => {
  test('limits TikTok crawler family to the standalone landing page', () => {
    const robots = buildRobotsTxt(fakeRequest());

    for (const userAgent of ['TikTokSpider', 'TikTokBot', 'Bytespider']) {
      const group = readUserAgentGroup(robots, userAgent);
      assert.match(group, /Allow: \/tiktok\n/);
      assert.match(group, /Allow: \/tiktok\/\n/);
      assert.match(group, /Allow: \/sitemap\.xml\n/);
      assert.match(group, /Allow: \/assets\/tiktok-\n/);
      assert.match(group, /Disallow: \/\n?$/);
      assert.doesNotMatch(group, /Allow: \/\n/);
    }

    const publicGroup = readUserAgentGroup(robots, '*');
    assert.match(publicGroup, /Allow: \/tiktok\n/);
    assert.match(publicGroup, /Allow: \/tiktok\/\n/);
    assert.match(publicGroup, /Allow: \/sitemap\.xml\n/);
    assert.match(publicGroup, /Allow: \/assets\/tiktok-\n/);
    assert.match(publicGroup, /Disallow: \/\n?$/);
    assert.doesNotMatch(publicGroup, /Allow: \/\n/);
    assert.match(robots, /Sitemap: https:\/\/damatong\.net\/sitemap\.xml/);
  });

  test('sitemap only exposes the TikTok landing page', async () => {
    const sitemap = await buildSitemapXml(fakeRequest());

    assert.match(sitemap, /<loc>https:\/\/damatong\.net\/tiktok<\/loc>/);
    assert.doesNotMatch(sitemap, /https:\/\/damatong\.net\/product\//);
    assert.doesNotMatch(sitemap, /https:\/\/damatong\.net\/categories/);
    assert.doesNotMatch(sitemap, /https:\/\/damatong\.net\/content\//);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/damatong\.net\/<\/loc>/);
  });
});
