/**
 * Cart 域：购物车
 */
const { Router } = require('express');

const router = Router();
router.use('/cart', require('./routes/cart.routes'));

module.exports = router;
