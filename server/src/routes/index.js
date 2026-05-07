const { Router } = require('express');
const health = require('../modules/health');
const auth = require('../modules/auth');
const user = require('../modules/user');
const product = require('../modules/product');
const cart = require('../modules/cart');
const order = require('../modules/order');
const admin = require('../modules/admin');
const theme = require('../modules/theme');
const payments = require('../modules/payments');

const router = Router();

router.use(health);
router.use(auth);
router.use(user);
router.use(product);
router.use(cart);
router.use(order);
router.use('/payments', payments);
router.use(admin);
router.use(theme);

module.exports = router;
