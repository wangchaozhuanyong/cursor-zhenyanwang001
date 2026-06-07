const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readServerFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function extractBlock(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  assert.notEqual(start, -1, `missing start pattern ${startPattern}`);
  const rest = source.slice(start);
  const end = rest.search(endPattern);
  assert.notEqual(end, -1, `missing end pattern ${endPattern}`);
  return rest.slice(0, end);
}

test('coupon claim order-count queries do not depend on orders.deleted_at', () => {
  const campaignRepo = readServerFile('src/modules/admin/repository/adminCouponCampaign.repository.js');
  const couponRepo = readServerFile('src/modules/user/repository/coupon.repository.js');

  const audienceContextBlock = extractBlock(
    campaignRepo,
    /async function selectUserAudienceContext/,
    /function audienceScopeIds/,
  );
  const userOrderCountBlock = extractBlock(
    couponRepo,
    /async function selectUserOrderCount/,
    /module\.exports/,
  );

  assert.doesNotMatch(audienceContextBlock, /\bo\.deleted_at\b/);
  assert.doesNotMatch(userOrderCountBlock, /\bdeleted_at\b/);
});
