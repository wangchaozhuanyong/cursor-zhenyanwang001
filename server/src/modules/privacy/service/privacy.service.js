const crypto = require('crypto');
const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/privacy.repository');

function hashIp(ip) {
  const salt = process.env.PRIVACY_IP_HASH_SALT || process.env.JWT_SECRET || 'dev';
  return crypto.createHash('sha256').update(`${salt}:${ip || ''}`).digest('hex');
}

function formatConsent(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    anonymous_id: row.anonymous_id,
    consent_version: row.consent_version,
    analytics_allowed: Boolean(row.analytics_allowed),
    ads_allowed: Boolean(row.ads_allowed),
    created_at: row.created_at,
  };
}

async function recordConsent(userId, body, req) {
  const id = generateId();
  await repo.insertConsent({
    id,
    userId,
    anonymousId: body.anonymous_id || '',
    consentVersion: body.consent_version || 'v1',
    analyticsAllowed: Boolean(body.analytics_allowed),
    adsAllowed: Boolean(body.ads_allowed),
    ipHash: hashIp(req.ip),
    userAgent: String(req.get('user-agent') || '').slice(0, 255),
  });
  return { data: formatConsent(await repo.selectLatestConsent({ userId, anonymousId: body.anonymous_id })) };
}

async function getMyConsent(userId, query) {
  const row = await repo.selectLatestConsent({
    userId,
    anonymousId: query?.anonymous_id || '',
  });
  return { data: formatConsent(row) };
}

module.exports = {
  recordConsent,
  getMyConsent,
};
