const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/adminCouponCampaign.repository');
const couponRepo = require('../repository/adminCoupon.repository');

const CAMPAIGN_TYPES = new Set([
  'public_claim',
  'new_user_gift',
  'member',
  'user_tag',
  'code',
  'seasonal',
  'compensation',
]);

const AUDIENCE_TYPES = new Set(['all', 'new_user', 'member_level', 'user_tag', 'old_user']);

function parseDateTime(value) {
  return String(value || '').trim().replace('T', ' ');
}

function runtimeStatus(row) {
  if (Number(row.disabled) === 1 || row.status === 'disabled') return 'disabled';
  if (row.status === 'draft') return 'draft';
  const now = Date.now();
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  if (Number.isFinite(start) && now < start) return 'scheduled';
  if (Number.isFinite(end) && now > end) return 'ended';
  return 'active';
}

function formatCampaign(row, items = undefined, audiences = undefined) {
  if (!row) return row;
  const out = {
    ...row,
    disabled: !!row.disabled,
    display_positions: repo.parseJson(row.display_positions, []),
    audience_config: repo.parseJson(row.audience_config, null),
    coupon_count: Number(row.coupon_count || 0),
    claimed_count: Number(row.claimed_count || 0),
    used_count: Number(row.used_count || 0),
    sort_order: Number(row.sort_order || 0),
    status: runtimeStatus(row),
  };
  if (items) {
    out.coupon_ids = items.map((item) => item.coupon_id).filter(Boolean);
    out.items = items.map((item) => ({
      ...item,
      coupon_value: item.coupon_value == null ? null : Number(item.coupon_value),
      coupon_min_amount: item.coupon_min_amount == null ? null : Number(item.coupon_min_amount),
    }));
  }
  if (audiences) {
    out.audiences = audiences;
    out.audience_ids = audiences.map((item) => item.scope_id).filter(Boolean);
  }
  return out;
}

function normalizePayload(body = {}, partial = false) {
  const out = {};
  if (!partial || body.campaign_type !== undefined || body.type !== undefined) {
    const nextType = String(body.campaign_type || body.type || 'public_claim');
    out.campaign_type = CAMPAIGN_TYPES.has(nextType) ? nextType : 'public_claim';
  }
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) throw new BusinessError(400, '优惠券活动名称不能为空');
    out.title = title;
  }
  if (body.subtitle !== undefined || !partial) out.subtitle = String(body.subtitle || '').trim();
  if (body.description !== undefined || !partial) out.description = String(body.description || '').trim();
  if (body.cover_image !== undefined || !partial) out.cover_image = String(body.cover_image || '').trim();
  if (!partial || body.start_at !== undefined) out.start_at = parseDateTime(body.start_at);
  if (!partial || body.end_at !== undefined) out.end_at = parseDateTime(body.end_at);
  if (body.status !== undefined || !partial) out.status = String(body.status || 'draft');
  if (body.disabled !== undefined || !partial) out.disabled = !!body.disabled;
  if (body.display_positions !== undefined || !partial) {
    out.display_positions = ['home_coupon_zone'];
  }
  if (body.audience_type !== undefined || !partial) {
    const audienceType = String(body.audience_type || 'all');
    out.audience_type = AUDIENCE_TYPES.has(audienceType) ? audienceType : 'all';
  }
  if (body.audience_config !== undefined || !partial) out.audience_config = body.audience_config || null;
  if (body.issue_mode !== undefined || !partial) out.issue_mode = String(body.issue_mode || 'self_claim');
  if (body.sort_order !== undefined || !partial) out.sort_order = Math.trunc(Number(body.sort_order || 0));
  if (body.internal_note !== undefined || !partial) out.internal_note = String(body.internal_note || '').trim();
  return out;
}

function normalizeCouponIds(body = {}) {
  return [...new Set((body.coupon_ids || body.couponIds || [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
}

function normalizeAudienceIds(body = {}) {
  return [...new Set((body.audience_ids || body.audienceIds || body.scope_ids || [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
}

async function assertCampaignPublishable(payload, couponIds) {
  if (!payload.start_at || !payload.end_at) throw new BusinessError(400, '开始时间和结束时间不能为空');
  if (new Date(payload.end_at).getTime() <= new Date(payload.start_at).getTime()) {
    throw new BusinessError(400, '结束时间必须晚于开始时间');
  }
  if (!couponIds.length) throw new BusinessError(400, '优惠券活动至少要选择一张优惠券');
  for (const couponId of couponIds) {
    const coupon = await couponRepo.selectCouponBaseById(couponId);
    if (!coupon || coupon.deleted_at || coupon.archived_at) {
      throw new BusinessError(400, `优惠券不存在或已归档：${couponId}`);
    }
  }
  if (['member_level', 'user_tag'].includes(payload.audience_type) && !payload.audience_ids?.length) {
    throw new BusinessError(400, '当前活动人群需要选择至少一个目标');
  }
}

async function listCampaigns(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countCampaigns(query);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectCampaignsPage(pageSize, offset, query);
  return { kind: 'paginate', list: rows.map((row) => formatCampaign(row)), total, page, pageSize };
}

async function getCampaign(id) {
  const row = await repo.selectCampaignById(id);
  if (!row) throw new BusinessError(404, '优惠券活动不存在');
  const [items, audiences] = await Promise.all([
    repo.selectCampaignItems(id),
    repo.selectCampaignAudiences(id),
  ]);
  return { data: formatCampaign(row, items, audiences) };
}

async function createCampaign(body, adminUserId, req) {
  const payload = normalizePayload(body);
  const couponIds = normalizeCouponIds(body);
  const audienceIds = normalizeAudienceIds(body);
  payload.audience_ids = audienceIds;
  if (payload.status !== 'draft') await assertCampaignPublishable(payload, couponIds);
  const id = generateId();
  await repo.insertCampaign({ ...payload, id, adminUserId });
  await repo.replaceCampaignItems(id, couponIds);
  await repo.replaceCampaignAudiences(id, payload.audience_type, audienceIds);
  const created = await getCampaign(id);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'coupon_campaign.create',
    objectType: 'coupon_campaign',
    objectId: id,
    summary: `创建优惠券活动 ${payload.title}`,
    after: { ...payload, coupon_ids: couponIds, audience_ids: audienceIds },
    result: 'success',
  });
  return { data: created.data, message: '创建成功' };
}

async function updateCampaign(id, body, adminUserId, req) {
  const existing = await repo.selectCampaignById(id);
  if (!existing) throw new BusinessError(404, '优惠券活动不存在');
  const payload = normalizePayload(body, true);
  const shouldReplaceCoupons = body.coupon_ids !== undefined || body.couponIds !== undefined;
  const shouldReplaceAudiences = body.audience_ids !== undefined || body.audienceIds !== undefined || body.scope_ids !== undefined;
  const nextCouponIds = shouldReplaceCoupons
    ? normalizeCouponIds(body)
    : (await repo.selectCampaignItems(id)).map((item) => item.coupon_id);
  const nextAudienceIds = shouldReplaceAudiences
    ? normalizeAudienceIds(body)
    : (await repo.selectCampaignAudiences(id)).map((item) => item.scope_id).filter(Boolean);
  const mergedPayload = {
    ...formatCampaign(existing),
    ...payload,
    audience_ids: nextAudienceIds,
  };
  if ((payload.status && payload.status !== 'draft') || existing.status !== 'draft') {
    await assertCampaignPublishable(mergedPayload, nextCouponIds);
  }
  const fragments = [];
  const values = [];
  const jsonFields = new Set(['display_positions', 'audience_config']);
  for (const field of [
    'campaign_type', 'title', 'subtitle', 'description', 'cover_image', 'start_at', 'end_at',
    'status', 'disabled', 'display_positions', 'audience_type', 'audience_config', 'issue_mode',
    'sort_order', 'internal_note',
  ]) {
    if (payload[field] === undefined) continue;
    fragments.push(`${field} = ?`);
    values.push(jsonFields.has(field) ? JSON.stringify(payload[field]) : payload[field]);
  }
  if (fragments.length) await repo.updateCampaignDynamic(id, fragments, values, adminUserId);
  if (shouldReplaceCoupons) await repo.replaceCampaignItems(id, nextCouponIds);
  if (shouldReplaceAudiences || payload.audience_type !== undefined) {
    await repo.replaceCampaignAudiences(id, payload.audience_type || existing.audience_type, nextAudienceIds);
  }
  const updated = await getCampaign(id);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'coupon_campaign.update',
    objectType: 'coupon_campaign',
    objectId: id,
    summary: `更新优惠券活动 ${updated.data.title}`,
    after: { ...payload, coupon_ids: nextCouponIds, audience_ids: nextAudienceIds },
    result: 'success',
  });
  return { data: updated.data, message: '更新成功' };
}

async function updateCampaignStatus(id, body, adminUserId, req) {
  return updateCampaign(id, {
    status: body.status,
    disabled: body.disabled,
  }, adminUserId, req);
}

async function deleteCampaign(id, adminUserId, req) {
  const existing = await repo.selectCampaignById(id);
  if (!existing) throw new BusinessError(404, '优惠券活动不存在');
  await repo.softDeleteCampaign(id, adminUserId);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'coupon_campaign.delete',
    objectType: 'coupon_campaign',
    objectId: id,
    summary: `删除优惠券活动 ${existing.title || id}`,
    result: 'success',
  });
  return { data: null, message: '已删除' };
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  formatCampaign,
};
