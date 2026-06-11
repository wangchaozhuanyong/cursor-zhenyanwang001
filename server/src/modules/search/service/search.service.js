const repo = require('../repository/search.repository');
const { normalizeSearchKeyword, buildSearchKeywords } = require('../../../utils/searchKeywords');
const analyticsModule = require('../../analytics');

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
    id: row.id != null ? String(row.id) : undefined,
    keyword: row.keyword,
    search_count: Number(row.search_count) || 0,
    result_count: Number(row.result_count) || 0,
    last_searched_at: row.last_searched_at || null,
    source: row.source || 'auto',
    is_pinned: Boolean(Number(row.is_pinned || 0)),
    is_hidden: Boolean(Number(row.is_hidden || 0)),
    sort_order: Number(row.sort_order || 0),
    remark: row.remark || '',
  };
}

function createHttpError(message, status) {
  const err = new Error(message);
  return Object.assign(err, { status });
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

async function listAdminSearchTerms(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const result = await repo.selectAdminSearchTerms({
    ...query,
    page,
    pageSize,
  });
  return {
    ...result,
    list: result.list.map(formatTerm),
  };
}

function normalizeAdminPayload(body, partial = false) {
  const out = {};
  if (!partial || body.keyword !== undefined) {
    const keyword = normalizeSearchKeyword(body.keyword);
    if (!keyword) {
      throw createHttpError('关键词不能为空', 400);
    }
    out.keyword = keyword;
    out.normalizedKeyword = keyword;
  }
  if (!partial || body.is_pinned !== undefined || body.isPinned !== undefined) {
    out.isPinned = Boolean(body.is_pinned ?? body.isPinned);
  }
  if (!partial || body.is_hidden !== undefined || body.isHidden !== undefined) {
    out.isHidden = Boolean(body.is_hidden ?? body.isHidden);
  }
  if (!partial || body.sort_order !== undefined || body.sortOrder !== undefined) {
    const raw = body.sort_order ?? body.sortOrder;
    const sortOrder = Number.parseInt(raw, 10);
    out.sortOrder = Number.isFinite(sortOrder) ? Math.max(0, Math.min(999999, sortOrder)) : 0;
  }
  if (!partial || body.remark !== undefined) {
    out.remark = String(body.remark || '').trim().slice(0, 255);
  }
  if (!partial || body.result_count !== undefined || body.resultCount !== undefined) {
    const raw = body.result_count ?? body.resultCount;
    const resultCount = Number.parseInt(raw, 10);
    out.resultCount = Number.isFinite(resultCount) ? Math.max(0, resultCount) : 0;
  }
  return out;
}

async function saveAdminSearchTerm(body) {
  const payload = normalizeAdminPayload(body || {});
  const row = await repo.upsertManualSearchTerm(payload);
  return formatTerm(row);
}

async function updateAdminSearchTerm(id, body) {
  const payload = normalizeAdminPayload(body || {}, true);
  if (body?.source === 'manual' || body?.source === 'auto') {
    payload.source = body.source;
  }
  const row = await repo.updateSearchTerm(id, payload);
  if (!row) {
    throw createHttpError('热门搜索词不存在', 404);
  }
  return formatTerm(row);
}

async function removeAdminSearchTerm(id) {
  const ok = await repo.deleteSearchTerm(id);
  if (!ok) {
    throw createHttpError('热门搜索词不存在', 404);
  }
  return { ok: true };
}

module.exports = {
  trackSearch,
  listHotTerms,
  listSuggestions,
  listAdminSearchTerms,
  saveAdminSearchTerm,
  updateAdminSearchTerm,
  removeAdminSearchTerm,
};
