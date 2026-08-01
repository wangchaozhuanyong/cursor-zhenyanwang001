const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const adminExtended = require('../src/modules/admin/service/adminExtended.service');

const sanitize = adminExtended._sanitizeCmsHtmlForTest;
const hasVisibleContent = adminExtended._hasVisibleCmsContentForTest;

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
    assert.equal(cleaned.includes('href='), false);
  });

  test('does not recreate a script boundary after sanitizing malformed markup', () => {
    const raw = '<scr<script>ipt>alert(1)</scr</script>ipt><p>safe</p>';
    const cleaned = sanitize(raw);
    assert.equal(/<script\b/i.test(cleaned), false);
    assert.equal(cleaned.includes('<p>safe</p>'), true);
  });

  test('adds tabnabbing protection to links', () => {
    const raw = '<a href="https://example.com" target="_blank">open</a>';
    const cleaned = sanitize(raw);
    assert.match(cleaned, /target="_blank"/);
    assert.match(cleaned, /rel="noopener noreferrer"/);
  });

  test('treats formatting-only markup as empty content', () => {
    assert.equal(hasVisibleContent('<p><br></p><p>&nbsp;</p>'), false);
  });

  test('recognizes visible text inside allowed markup', () => {
    assert.equal(hasVisibleContent('<h2>配送说明</h2><p>工作日发货</p>'), true);
  });
});
