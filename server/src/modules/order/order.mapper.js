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
      status: 'active',
      sort_order: 0,
      description: '',
      is_recommended: false,
      is_new: false,
      is_hot: false,
    },
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
    total_points: row.total_points,
    status: row.status,
    payment_status: row.payment_status || PAYMENT_STATUS.PENDING,
    payment_time: row.payment_time || null,
    payment_channel: row.payment_channel || '',
    payment_transaction_no: row.payment_transaction_no || '',
    note: row.note || '',
    created_at: row.created_at,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    address: row.address,
    payment_method: row.payment_method || 'whatsapp',
  };
}

module.exports = { formatOrderItem, formatOrder };
