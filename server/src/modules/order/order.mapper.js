const { PAYMENT_STATUS } = require('../../constants/status');
const { normalizeKnownMojibakeText } = require('../../utils/textNormalize');

function parseJsonObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatOrderItem(row) {
  const specSnapshot = parseJsonObject(row.spec_snapshot);
  const productName = row.product_name_snapshot || row.product_name;
  const productImage = row.variant_image_snapshot || row.product_image_snapshot || row.product_image;
  return {
    id: row.id,
    order_item_id: row.id,
    product: {
      id: row.product_id,
      name: productName,
      cover_image: productImage,
      images: [],
      price: parseFloat(row.price),
      points: row.points,
      category_id: '',
      stock: 0,
      lifecycle_status: 1,
      status: 'active',
      sort_order: 0,
      description: '',
      is_recommended: false,
      is_new: false,
      is_hot: false,
    },
    variant_id: row.variant_id || '',
    sku_code: row.sku_code || '',
    variant_name: row.variant_name || '',
    spec_snapshot: specSnapshot,
    unit_price: parseFloat(row.price),
    subtotal: row.subtotal != null ? parseFloat(row.subtotal) : parseFloat(row.price) * Number(row.qty || 0),
    qty: row.qty,
    earned_points: Number(row.earned_points || 0),
    points_rule_snapshot: parseJsonObject(row.points_rule_snapshot),
    redeemable_amount: Number(row.redeemable_amount || 0),
    is_restricted_excluded: !!row.is_restricted_excluded,
    line_points_base_amount: Number(row.line_points_base_amount || 0),
    review_id: row.review_id || null,
    review_status: row.review_status || null,
    is_reviewed: !!row.review_id,
    can_review: Boolean(row.can_review),
  };
}

function parseDiscountMeta(raw) {
  return parseJsonObject(raw);
}

function buildDiscountLines(row, meta) {
  if (meta?.lines?.length) return meta.lines;
  const lines = [];
  const flash = Number(meta?.flash_sale_discount || 0);
  const fullRed = Number(meta?.full_reduction_discount || 0);
  const coupon = Number(meta?.coupon_discount || 0);
  if (flash > 0) lines.push({ type: 'flash_sale', label: '秒杀优惠', amount: flash });
  if (fullRed > 0) lines.push({ type: 'full_reduction', label: '满减优惠', amount: fullRed });
  if (coupon > 0) {
    lines.push({
      type: 'coupon',
      label: row.coupon_title ? `优惠券抵扣：${row.coupon_title}` : '优惠券抵扣',
      amount: coupon,
    });
  }
  if (!lines.length && Number(row.discount_amount || 0) > 0) {
    lines.push({
      type: 'coupon',
      label: row.coupon_title ? `优惠券抵扣：${row.coupon_title}` : '优惠券抵扣',
      amount: parseFloat(row.discount_amount),
    });
  }
  return lines;
}

function buildPointsSummary(row, discountLines, loyaltyMeta) {
  if (!loyaltyMeta) return null;
  return {
    earned_points: Number(loyaltyMeta.earned_points || row.total_points || 0),
    points_used: Number(row.points_used || loyaltyMeta.points_used || 0),
    max_usable_points: Number(loyaltyMeta.max_usable_points || 0),
    points_discount_amount: Number(row.points_discount_amount || loyaltyMeta.points_discount_amount || 0),
    point_value_myr: Number(loyaltyMeta.point_value_myr || 0),
    final_amount: parseFloat(row.total_amount),
    discount_lines: discountLines,
    disabled_reason: loyaltyMeta.disabled_reason || '',
    adjusted: !!loyaltyMeta.adjusted,
    calculation_version: loyaltyMeta.calculation_version || '',
  };
}

function formatOrder(row, items, returnMeta = null) {
  const discountMeta = parseDiscountMeta(row.discount_meta);
  const discountLines = buildDiscountLines(row, discountMeta);
  const loyaltyMeta = parseJsonObject(row.loyalty_meta);
  return {
    id: row.id,
    order_no: row.order_no,
    order_type: row.order_type || 'normal',
    items,
    raw_amount: parseFloat(row.raw_amount),
    discount_amount: parseFloat(row.discount_amount),
    discount_meta: discountMeta,
    discount_lines: discountLines,
    flash_sale_discount: Number(discountMeta?.flash_sale_discount || 0),
    full_reduction_discount: Number(discountMeta?.full_reduction_discount || 0),
    coupon_discount: Number(discountMeta?.coupon_discount ?? 0),
    coupon_title: row.coupon_title,
    shipping_fee: parseFloat(row.shipping_fee),
    shipping_cost_amount: parseFloat(row.shipping_cost_amount || 0),
    payment_fee_amount: parseFloat(row.payment_fee_amount || 0),
    goods_cost_amount: parseFloat(row.goods_cost_amount || 0),
    gross_profit_amount: parseFloat(row.gross_profit_amount || 0),
    net_profit_amount: parseFloat(row.net_profit_amount || 0),
    refund_amount: parseFloat(row.refund_amount || row.refunded_amount || 0),
    shipping_name: normalizeKnownMojibakeText(row.shipping_name),
    total_amount: parseFloat(row.total_amount),
    paid_at: row.paid_at || row.payment_time || null,
    tax_mode: row.tax_mode || null,
    tax_rate: row.tax_rate != null && row.tax_rate !== '' ? parseFloat(row.tax_rate) : null,
    tax_label: row.tax_label || null,
    taxable_amount: row.taxable_amount != null && row.taxable_amount !== '' ? parseFloat(row.taxable_amount) : null,
    tax_amount: row.tax_amount != null && row.tax_amount !== '' ? parseFloat(row.tax_amount) : null,
    tax_exclusive_amount: row.tax_exclusive_amount != null && row.tax_exclusive_amount !== ''
      ? parseFloat(row.tax_exclusive_amount)
      : null,
    total_points: row.total_points,
    earned_points: Number(row.total_points || 0),
    points_used: Number(row.points_used || 0),
    max_usable_points: Number(loyaltyMeta?.max_usable_points || 0),
    points_discount_amount: Number(row.points_discount_amount || 0),
    point_value_myr: Number(loyaltyMeta?.point_value_myr || 0),
    disabled_reason: loyaltyMeta?.disabled_reason || '',
    adjusted: !!loyaltyMeta?.adjusted,
    loyalty_meta: loyaltyMeta,
    points_summary: buildPointsSummary(row, discountLines, loyaltyMeta),
    status: row.status,
    payment_status: row.payment_status || PAYMENT_STATUS.PENDING,
    payment_time: row.payment_time || null,
    payment_channel: row.payment_channel || '',
    payment_transaction_no: row.payment_transaction_no || '',
    tracking_no: row.tracking_no || '',
    carrier: row.carrier || '',
    note: row.note || '',
    created_at: row.created_at,
    shipped_at: row.shipped_at || null,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    shipping_phone: row.shipping_phone || row.contact_phone,
    address: row.address,
    payment_method: row.payment_method || 'whatsapp',
    return_request_count: returnMeta ? Number(returnMeta.return_request_count || 0) : 0,
    active_return_count: returnMeta ? Number(returnMeta.active_return_count || 0) : 0,
  };
}

module.exports = { formatOrderItem, formatOrder };
