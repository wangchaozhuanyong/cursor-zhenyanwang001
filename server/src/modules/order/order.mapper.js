const { PAYMENT_STATUS } = require('../../constants/status');
const { normalizeKnownMojibakeText } = require('../../utils/textNormalize');

function formatOrderItem(row) {
  let specSnapshot = row.spec_snapshot || null;
  if (typeof specSnapshot === 'string') {
    try {
      specSnapshot = JSON.parse(specSnapshot);
    } catch {
      specSnapshot = null;
    }
  }
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
    review_id: row.review_id || null,
    review_status: row.review_status || null,
    is_reviewed: !!row.review_id,
    can_review: Boolean(row.can_review),
  };
}

function parseDiscountMeta(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
      label: row.coupon_title ? `优惠券（${row.coupon_title}）` : '优惠券抵扣',
      amount: coupon,
    });
  }
  if (!lines.length && Number(row.discount_amount || 0) > 0) {
    lines.push({
      type: 'coupon',
      label: row.coupon_title ? `优惠券（${row.coupon_title}）` : '优惠抵扣',
      amount: parseFloat(row.discount_amount),
    });
  }
  return lines;
}

function formatOrder(row, items) {
  const discountMeta = parseDiscountMeta(row.discount_meta);
  return {
    id: row.id,
    order_no: row.order_no,
    items,
    raw_amount: parseFloat(row.raw_amount),
    discount_amount: parseFloat(row.discount_amount),
    discount_meta: discountMeta,
    discount_lines: buildDiscountLines(row, discountMeta),
    flash_sale_discount: Number(discountMeta?.flash_sale_discount || 0),
    full_reduction_discount: Number(discountMeta?.full_reduction_discount || 0),
    coupon_discount: Number(discountMeta?.coupon_discount ?? 0),
    coupon_title: row.coupon_title,
    shipping_fee: parseFloat(row.shipping_fee),
    shipping_name: normalizeKnownMojibakeText(row.shipping_name),
    total_amount: parseFloat(row.total_amount),
    tax_mode: row.tax_mode || null,
    tax_rate: row.tax_rate != null && row.tax_rate !== '' ? parseFloat(row.tax_rate) : null,
    tax_label: row.tax_label || null,
    taxable_amount: row.taxable_amount != null && row.taxable_amount !== '' ? parseFloat(row.taxable_amount) : null,
    tax_amount: row.tax_amount != null && row.tax_amount !== '' ? parseFloat(row.tax_amount) : null,
    tax_exclusive_amount: row.tax_exclusive_amount != null && row.tax_exclusive_amount !== ''
      ? parseFloat(row.tax_exclusive_amount)
      : null,
    total_points: row.total_points,
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
  };
}

module.exports = { formatOrderItem, formatOrder };
