const { Router } = require('express');

const router = Router();

router.use('/orders', require('./orders.routes'));
router.use('/returns', require('./returns.routes'));

module.exports = router;
