// @ts-nocheck
const { Router } = require('express');
const health = require('../modules/health');
const auth = require('../modules/auth');
const user = require('../modules/user');
const product = require('../modules/product');
const cart = require('../modules/cart');
const order = require('../modules/order');
const admin = require('../modules/admin');
const search = require('../modules/search');
const myinvois = require('../modules/myinvois');

const router = Router();

router.use(health);
router.use(auth);
router.use(user);
router.use(product);
router.use(search);
router.use(cart);
router.use(order);
router.use(myinvois);
router.use(admin);

module.exports = router;
