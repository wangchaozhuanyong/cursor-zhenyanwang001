const accountStatusRepository = require('../modules/user/repository/accountStatus.repository');

const ACCOUNT_STATUS = {
  NORMAL: 'normal',
  DISABLED: 'disabled',
  BLACKLISTED: 'blacklisted',
  ORDER_LIMITED: 'order_limited',
  COUPON_LIMITED: 'coupon_limited',
  COMMENT_LIMITED: 'comment_limited',
};

async function getUserStatusSnapshot(userId) {
  const row = await accountStatusRepository.findUserStatusSnapshotByUserId(userId);

  if (row) {
    return {
      account_status: row.account_status || ACCOUNT_STATUS.NORMAL,
      order_restricted: Number(row.order_restricted || 0) === 1,
      coupon_restricted: Number(row.coupon_restricted || 0) === 1,
      comment_restricted: Number(row.comment_restricted || 0) === 1,
    };
  }

  return {
    account_status: ACCOUNT_STATUS.NORMAL,
    order_restricted: false,
    coupon_restricted: false,
    comment_restricted: false,
  };
}

function guardByAction(action) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return res.fail(401, '请先登录');
    const status = await getUserStatusSnapshot(userId);

    if (status.account_status === ACCOUNT_STATUS.DISABLED || status.account_status === ACCOUNT_STATUS.BLACKLISTED) {
      return res.fail(403, '账号已被限制使用');
    }
    if (action === 'order' && status.order_restricted) {
      return res.fail(403, '当前账号已被限制下单');
    }
    if (action === 'coupon' && status.coupon_restricted) {
      return res.fail(403, '当前账号已被限制领券');
    }
    if (action === 'comment' && status.comment_restricted) {
      return res.fail(403, '当前账号已被限制评论');
    }
    return next();
  };
}

module.exports = {
  ACCOUNT_STATUS,
  guardByAction,
};

