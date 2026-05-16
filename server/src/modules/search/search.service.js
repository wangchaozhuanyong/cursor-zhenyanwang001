const repo = require('./search.repository');
const { normalizeSearchKeyword, buildSearchKeywords } = require('../../utils/searchKeywords');
const analyticsModule = require('../analytics');

const analyticsApi = /** @type {any} */ (analyticsModule).api || {};

function requireAnalyticsApi(name) {
  const fn = analyticsApi[name];
  if (typeof fn !== 'function') {
    throw new Error(`Analytics 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function formatTerm(row) {
  return {
    keyword: row.keyword,
    search_count: Number(row.search_count) || 0,
    result_count: Number(row.result_count) || 0,
    last_searched_at: row.last_searched_at || null,
  };
}

async function trackSearch(body, req) {
  const keyword = normalizeSearchKeyword(body?.keyword);
  if (!keyword) return { data: null, message: 'ok' };

  const like = `%${keyword}%`;
  const resultCount = Number.isFinite(Number(body?.result_count))
    ? Math.max(0, Number(body.result_count))
    : await repo.countSearchResults(like);

  await repo.upsertSearchTerm({
    keyword,
    normalizedKeyword: keyword,
    resultCount,
  });
  await requireAnalyticsApi('trackEvent')({
    event_type: 'search',
    module: 'search',
    page: '/search',
    keyword,
    quantity: 1,
    amount: resultCount,
    session_id: body?.session_id,
    anonymous_id: body?.anonymous_id,
  }, req);
  return { data: null, message: 'ok' };
}

async function listHotTerms(query) {
  const limit = Math.min(20, Math.max(1, parseInt(query.limit, 10) || 10));
  const rows = await repo.selectHotTerms(limit);
  return rows.map(formatTerm);
}

async function listSuggestions(query) {
  const keyword = normalizeSearchKeyword(query.keyword);
  if (!keyword) return [];
  const limit = Math.min(20, Math.max(1, parseInt(query.limit, 10) || 8));
  const keywordInitials = buildSearchKeywords(keyword);
  const like = `%${keyword}%`;
  const likeInitials = `%${keywordInitials}%`;
  const rows = await repo.selectSuggestions(keyword, like, keywordInitials && keywordInitials !== keyword ? likeInitials : like, limit);

  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const text = normalizeSearchKeyword(row.keyword);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push({
      keyword: row.keyword,
      source: row.source,
      search_count: Number(row.search_count) || 0,
    });
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = {
  trackSearch,
  listHotTerms,
  listSuggestions,
};
