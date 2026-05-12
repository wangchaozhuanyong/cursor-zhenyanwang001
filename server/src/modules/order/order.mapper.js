const { PAYMENT_STATUS } = require('../../constants/status');

function formatOrderItem(row) {
  return {
    product: {
      id: row.product_id,
      name: row.product_name,
      cover_image: row.product_image,
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
    unit_price: parseFloat(row.price),
    subtotal: row.subtotal != null ? parseFloat(row.subtotal) : parseFloat(row.price) * Number(row.qty || 0),
    qty: row.qty,
  };
}

function formatOrder(row, items) {
  return {
    id: row.id,
    order_no: row.order_no,
    items,
    raw_amount: parseFloat(row.raw_amount),
    discount_amount: parseFloat(row.discount_amount),
    coupon_title: row.coupon_title,
    shipping_fee: parseFloat(row.shipping_fee),
    shipping_name: row.shipping_name,
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
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    shipping_phone: row.shipping_phone || row.contact_phone,
    address: row.address,
    payment_method: row.payment_method || 'whatsapp',
  };
}

module.exports = { formatOrderItem, formatOrder };
