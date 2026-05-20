const wechatService = require('../../auth/services/wechat.service');
const authService = require('../../auth/service/auth.service');
const orderService = require('../../order/service/order.service');
const couponService = require('../service/coupon.service');
const favoritesService = require('../service/favorites.service');
const notificationService = require('../service/notification.service');
const inviteService = require('../service/invite.service');
const rewardService = require('../service/reward.service');
const loyaltyService = require('../../loyalty/service/loyalty.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { ValidationError } = require('../../../errors');

exports.bindWechat = asyncRoute(async (req, res) => {
  const url = await wechatService.startWechatBind(req.user.id, req.body?.redirect);
  res.success({ authorizeUrl: url }, '请在新窗口完成微信授权');
});

exports.unbindWechat = asyncRoute(async (req, res) => {
  const result = await wechatService.unbindWechatForUser(req.user.id);
  res.success(result.data, result.message);
});

exports.getWechatBinding = asyncRoute(async (req, res) => {
  const data = await wechatService.getWechatBindingForProfile(req.user.id);
  res.success({
    ...data,
    wechatLoginEnabled: wechatService.isWechatLoginEnabled(),
  });
});

exports.getSummary = asyncRoute(async (req, res) => {
  const userId = req.user.id;

  const [profileRes, orderSummary, couponPage, favoritePage, unread, inviteStats, rewardBalance, loyaltyConfig] = await Promise.all([
    authService.getProfile(userId),
    orderService.getOrderSummary(userId),
    couponService.getUserCoupons(userId, { page: 1, pageSize: 1, status: 'available' }),
    favoritesService.getFavorites(userId, { page: 1, pageSize: 1 }),
    notificationService.getUnreadCount(userId),
    inviteService.getStats(userId),
    rewardService.getBalance(userId),
    loyaltyService.getLoyaltyConfig().then((r) => r.data),
  ]);

  res.success({
    profile: profileRes?.data || null,
    orderSummary: orderSummary || null,
    couponCount: Number(couponPage?.total || 0),
    favoriteCount: Number(favoritePage?.total || 0),
    unreadCount: Number(unread?.count || 0),
    inviteStats: inviteStats || null,
    rewardBalance: rewardBalance || { balance: 0, pendingAmount: 0 },
    loyaltyConfig: loyaltyConfig || null,
  });
});

exports.bindWechatStart = asyncRoute(async (req, res, next) => {
  try {
    const url = await wechatService.startWechatBind(req.user.id, req.query.redirect);
    res.redirect(302, url);
  } catch (e) {
    if (e instanceof ValidationError) {
      const base = String(process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
      const u = new URL('/settings', `${base}/`);
      u.searchParams.set('wechatError', e.message);
      return res.redirect(302, u.toString());
    }
    next(e);
  }
});




