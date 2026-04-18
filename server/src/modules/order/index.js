/**
 * Order 域：订单与公开支付配置
 */
const { Router } = require('express');

const router = Router();

router.use('/orders', require('./orders.routes'));
router.use('/payment', require('./paymentPublic.routes'));

module.exports = router;
