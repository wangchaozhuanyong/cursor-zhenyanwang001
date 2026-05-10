const { BusinessError } = require('../../errors');

function getBaseUrl(profile) {
  const configured = (process.env.MYINVOIS_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  return profile.environment === 'live'
    ? 'https://api.myinvois.hasil.gov.my'
    : 'https://preprod-api.myinvois.hasil.gov.my';
}

function assertSubmissionConfigured(profile) {
  if (process.env.MYINVOIS_SUBMIT_ENABLED !== '1') {
    throw new BusinessError(503, 'MyInvois 提交未开启：请设置 MYINVOIS_SUBMIT_ENABLED=1 并完成法务/会计验收');
  }
  if (!profile.client_id || !profile.client_secret_ref || !profile.certificate_ref || !profile.signing_key_ref) {
    throw new BusinessError(503, 'MyInvois 凭证引用不完整，无法提交');
  }
}

/**
 * LHDN sandbox/live 的 OAuth、签名与提交细节需按法务/会计提供的测试标准完成。
 * 这里保留唯一出口，避免业务代码直接拼外部请求。
 */
async function submitDocument(profile, payload) {
  assertSubmissionConfigured(profile);

  const url = `${getBaseUrl(profile)}/api/v1.0/documentsubmissions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': profile.client_id,
      'X-Certificate-Ref': profile.certificate_ref,
      'X-Signing-Key-Ref': profile.signing_key_ref,
    },
    body: JSON.stringify({ documents: [payload] }),
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `MyInvois HTTP ${response.status}`;
    throw new BusinessError(response.status, message);
  }

  const accepted = body?.acceptedDocuments?.[0] || body?.accepted?.[0] || {};
  return {
    status: accepted.uuid ? 'accepted' : 'submitted',
    submissionUid: body?.submissionUid || body?.submission_uid || '',
    uuid: accepted.uuid || accepted.documentUuid || '',
    validationLink: accepted.longId || accepted.validationLink || '',
    raw: body,
  };
}

module.exports = {
  submitDocument,
};
