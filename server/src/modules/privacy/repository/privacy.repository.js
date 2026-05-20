const db = require('../../../config/db');

async function insertConsent(params) {
  const {
    id, userId, anonymousId, consentVersion, analyticsAllowed, adsAllowed,
    ipHash, userAgent,
  } = params;
  await db.query(
    `INSERT INTO privacy_consents
       (id, user_id, anonymous_id, consent_version, analytics_allowed, ads_allowed, ip_hash, user_agent)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id,
      userId || null,
      anonymousId || '',
      consentVersion || 'v1',
      analyticsAllowed ? 1 : 0,
      adsAllowed ? 1 : 0,
      ipHash || '',
      userAgent || '',
    ],
  );
}

async function selectLatestConsent({ userId, anonymousId }) {
  const params = [];
  const clauses = [];
  if (userId) {
    clauses.push('user_id = ?');
    params.push(userId);
  }
  if (anonymousId) {
    clauses.push('anonymous_id = ?');
    params.push(anonymousId);
  }
  if (!clauses.length) return null;
  const [[row]] = await db.query(
    `SELECT * FROM privacy_consents
     WHERE ${clauses.join(' OR ')}
     ORDER BY created_at DESC
     LIMIT 1`,
    params,
  );
  return row || null;
}

module.exports = {
  insertConsent,
  selectLatestConsent,
};
