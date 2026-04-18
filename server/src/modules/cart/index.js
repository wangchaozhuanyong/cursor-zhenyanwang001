/**
 * Cart 域：购物车
 */
const { Router } = require('express');

const router = Router();
router.use('/cart', require('./cart.routes'));

module.exports = router;
