function getAdminApi() {
  return /** @type {any} */ (require('../admin/publicApi')) || {};
}

const DEFAULT_SENSITIVE_WORDS = ['wechat', 'qrcode', 'fake', 'scam', 'complaint'];

function containsSensitive(text, words) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  const list = Array.isArray(words) && words.length ? words : DEFAULT_SENSITIVE_WORDS;
  return list.some((w) => {
    const needle = String(w || '').trim().toLowerCase();
    return needle.length > 0 && t.includes(needle);
  });
}

async function getReviewSettings() {
  try {
    const raw = await getAdminApi().selectSiteSettingValue('review_settings');
    if (!raw) return { auto_approve: true, sensitive_words: DEFAULT_SENSITIVE_WORDS };
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      auto_approve: parsed.auto_approve !== false,
      sensitive_words: Array.isArray(parsed.sensitive_words)
        ? parsed.sensitive_words
        : DEFAULT_SENSITIVE_WORDS,
    };
  } catch {
    return { auto_approve: true, sensitive_words: DEFAULT_SENSITIVE_WORDS };
  }
}

/**
 * @returns {'normal'|'pending'}
 */
function resolveInitialReviewStatus({ rating, images, content, settings }) {
  const autoApprove = settings?.auto_approve !== false;
  if (!autoApprove) return 'pending';

  const hasImages = Array.isArray(images) && images.length > 0;
  const lowStar = Number(rating) <= 2;
  const hasSensitive = containsSensitive(content, settings?.sensitive_words);

  if (lowStar || hasImages || hasSensitive) return 'pending';
  return 'normal';
}

/** 1-2 鏄熷樊璇勫緟澶勭悊 */
function resolveComplaintStatus(rating) {
  return Number(rating) <= 2 ? 'pending' : 'none';
}

module.exports = {
  containsSensitive,
  getReviewSettings,
  resolveInitialReviewStatus,
  resolveComplaintStatus,
  DEFAULT_SENSITIVE_WORDS,
};



