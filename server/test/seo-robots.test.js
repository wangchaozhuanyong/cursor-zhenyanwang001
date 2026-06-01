const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildRobotsTxt } = require('../src/modules/seo/service/seo.service');

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
      assert.match(group, /Allow: \/assets\/tiktok-\n/);
      assert.match(group, /Disallow: \/\n?$/);
      assert.doesNotMatch(group, /Allow: \/\n/);
    }

    const publicGroup = readUserAgentGroup(robots, '*');
    assert.match(publicGroup, /Allow: \/\n/);
    assert.match(publicGroup, /Disallow: \/api\n/);
    assert.match(robots, /Sitemap: https:\/\/damatong\.net\/sitemap\.xml/);
  });
});
