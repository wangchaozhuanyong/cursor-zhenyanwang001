const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const adminExtended = require('../src/modules/admin/service/adminExtended.service');

const sanitize = adminExtended._sanitizeCmsHtmlForTest;

describe('cms html sanitize', () => {
  test('removes script tags', () => {
    const raw = '<p>ok</p><script>alert(1)</script><p>end</p>';
    const cleaned = sanitize(raw);
    assert.equal(cleaned.includes('<script'), false);
    assert.equal(cleaned.includes('alert(1)'), false);
    assert.equal(cleaned.includes('<p>ok</p>'), true);
  });

  test('removes inline event handlers', () => {
    const raw = '<img src="/a.png" onerror="alert(1)" /><a href="#" onclick="x()">x</a>';
    const cleaned = sanitize(raw);
    assert.equal(/onerror\s*=|onclick\s*=/.test(cleaned), false);
  });

  test('neutralizes javascript protocol', () => {
    const raw = '<a href="javascript:alert(1)">go</a><img src="data:text/html;base64,AAAA" />';
    const cleaned = sanitize(raw);
    assert.equal(cleaned.includes('javascript:'), false);
    assert.equal(cleaned.includes('data:text/html'), false);
    assert.equal(cleaned.includes('href="#'), true);
  });
});


