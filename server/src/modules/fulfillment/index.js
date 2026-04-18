/**
 * Fulfillment 域：收货地址、运费模板（读）
 */
const { Router } = require('express');

const router = Router();

router.use('/addresses', require('./addresses.routes'));
router.use('/shipping', require('./shipping.routes'));

module.exports = router;
