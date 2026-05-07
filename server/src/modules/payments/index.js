/**
 * 支付域路由：/api/payments/*
 * Webhook 无登录；用户接口需 auth
 */
const { Router } = require('express');

const router = Router();

router.use(require('./payments.webhook.routes'));
router.use(require('./payments.routes'));

module.exports = router;
