const POINTS_ACTION = Object.freeze({
  REGISTER: 'register',
  FIRST_ORDER: 'first_order',
  SIGN_IN: 'sign_in',
  ORDER_REDEEM: 'order_redeem',
  ORDER_REDEEM_REVERSE: 'order_redeem_reverse',
  ORDER_EARN: 'order_earn',
  ORDER_EARN_REVERSE: 'order_reverse',
  PENDING_REVERSE: 'pending_reverse',
  ADMIN_ADD: 'admin_add',
  ADMIN_DEDUCT: 'admin_deduct',
  POINTS_EXPIRE: 'points_expire',
  GIFT_REDEEM: 'gift_redeem',
  GIFT_REDEEM_REVERSE: 'gift_redeem_reverse',
});

module.exports = { POINTS_ACTION };
