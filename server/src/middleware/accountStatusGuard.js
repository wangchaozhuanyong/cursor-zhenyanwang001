function getAuthApi() {
  return /** @type {any} */ (require('../modules/auth')).api || {};
}

const ACCOUNT_STATUS = {
  NORMAL: 'normal',
  DISABLED: 'disabled',
  BLACKLISTED: 'blacklisted',
  ORDER_LIMITED: 'order_limited',
  COUPON_LIMITED: 'coupon_limited',
  COMMENT_LIMITED: 'comment_limited',
};

async function getAccountStatus(userId) {
  const api = getAuthApi();
  const getter = api.getUserIdAndRole;
  if (typeof getter !== 'function') return ACCOUNT_STATUS.NORMAL;
  const row = await getter(userId);
  return row?.account_status || ACCOUNT_STATUS.NORMAL;
}

function guardByAction(action) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return res.fail(401, '请先登录');
    const status = await getAccountStatus(userId);
    if (status === ACCOUNT_STATUS.DISABLED || status === ACCOUNT_STATUS.BLACKLISTED) {
      return res.fail(403, '账号已被限制使用');
    }
    if (action === 'order' && status === ACCOUNT_STATUS.ORDER_LIMITED) {
      return res.fail(403, '当前账号已被限制下单');
    }
    if (action === 'coupon' && status === ACCOUNT_STATUS.COUPON_LIMITED) {
      return res.fail(403, '当前账号已被限制领券');
    }
    if (action === 'comment' && status === ACCOUNT_STATUS.COMMENT_LIMITED) {
      return res.fail(403, '当前账号已被限制评论');
    }
    return next();
  };
}

module.exports = {
  ACCOUNT_STATUS,
  guardByAction,
};
