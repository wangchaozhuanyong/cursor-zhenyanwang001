const couponService = require('./coupon.service');
const favoritesService = require('./favorites.service');
const notificationService = require('./notification.service');
const inviteService = require('./invite.service');
const rewardService = require('./reward.service');
const authPublicApi = /** @type {any} */ (require('../../auth/publicApi'));
const orderPublicApi = /** @type {any} */ (require('../../order/publicApi'));
const loyaltyPublicApi = /** @type {any} */ (require('../../loyalty/publicApi'));

function requireApi(api, moduleName, methodName) {
  const fn = api[methodName];
  if (typeof fn !== 'function') {
    throw new Error(`${moduleName} module API missing method: ${methodName}`);
  }
  return fn;
}

function authApi(methodName) {
  return requireApi(authPublicApi, 'Auth', methodName);
}

function orderApi(methodName) {
  return requireApi(orderPublicApi, 'Order', methodName);
}

function loyaltyApi(methodName) {
  return requireApi(loyaltyPublicApi, 'Loyalty', methodName);
}

async function startWechatBind(userId, redirect) {
  return authApi('startWechatBind')(userId, redirect);
}

async function unbindWechatForUser(userId) {
  return authApi('unbindWechatForUser')(userId);
}

async function getWechatBindingForProfile(userId) {
  const data = await authApi('getWechatBindingForProfile')(userId);
  return {
    ...data,
    wechatLoginEnabled: authApi('isWechatLoginEnabled')(),
  };
}

async function getSummary(userId) {
  const [profileRes, orderSummary, couponPage, favoritePage, unread, inviteStats, rewardBalance, loyaltyConfig] = await Promise.all([
    authApi('getProfile')(userId),
    orderApi('getOrderSummary')(userId),
    couponService.getUserCoupons(userId, { page: 1, pageSize: 1, status: 'available' }),
    favoritesService.getFavorites(userId, { page: 1, pageSize: 1 }),
    notificationService.getUnreadCount(userId),
    inviteService.getStats(userId),
    rewardService.getBalance(userId),
    loyaltyApi('getLoyaltyConfig')().then((r) => r.data),
  ]);

  return {
    profile: profileRes?.data || null,
    orderSummary: orderSummary || null,
    couponCount: Number(couponPage?.total || 0),
    favoriteCount: Number(favoritePage?.total || 0),
    unreadCount: Number(unread?.count || 0),
    inviteStats: inviteStats || null,
    rewardBalance: rewardBalance || { balance: 0, pendingAmount: 0 },
    loyaltyConfig: loyaltyConfig || null,
  };
}

module.exports = {
  startWechatBind,
  unbindWechatForUser,
  getWechatBindingForProfile,
  getSummary,
};
