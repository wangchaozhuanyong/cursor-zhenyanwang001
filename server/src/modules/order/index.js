/**
 * Order 域：订单、售后、公开支付配置
 */
const { Router } = require('express');

const router = Router();

router.use('/orders', require('./orders.routes'));
router.use('/payment', require('./paymentPublic.routes'));
router.use('/returns', require('./returns.routes'));

module.exports = router;
