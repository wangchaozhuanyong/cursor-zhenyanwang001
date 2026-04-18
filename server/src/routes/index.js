const { Router } = require('express');
const health = require('../modules/health');
const auth = require('../modules/auth');
const catalog = require('../modules/catalog');
const cart = require('../modules/cart');
const order = require('../modules/order');
const marketing = require('../modules/marketing');
const fulfillment = require('../modules/fulfillment');
const notification = require('../modules/notification');
const returns = require('../modules/returns');
const admin = require('../modules/admin');
const content = require('../modules/content');
const upload = require('../modules/upload');

const router = Router();

router.use(health);
router.use(order);
router.use(auth);
router.use(cart);
router.use(fulfillment);
router.use(marketing);
router.use(notification);
router.use(returns);
router.use(catalog);
router.use(admin);
router.use(upload);
router.use(content);

module.exports = router;
