// @ts-nocheck
const { Router } = require('express');
const health = require('../modules/health');
const auth = require('../modules/auth');
const user = require('../modules/user');
const product = require('../modules/product');
const cart = require('../modules/cart');
const order = require('../modules/order');
const payment = require('../modules/payment');
const admin = require('../modules/admin');
const search = require('../modules/search');
const myinvois = require('../modules/myinvois');
const privacy = require('../modules/privacy');
const analytics = require('../modules/analytics');
const marketing = require('../modules/marketing');
const loyalty = require('../modules/loyalty');
const home = require('../modules/home');
const seoRoutes = require('../modules/seo/seo.routes');

const router = Router();

router.use(health);
router.use(auth);
router.use(user);
router.use(product);
router.use(search);
router.use(privacy);
router.use(cart);
router.use(order);
router.use(payment);
router.use(myinvois);
router.use(analytics);
router.use(marketing);
router.use(loyalty);
router.use(home);
router.use(admin);
/** 涓庢牴璺緞 SEO 鍚屾簮閫昏緫锛屼究浜庣粺涓€璧?/api 鍓嶇紑锛堢埇铏粛鍙娇鐢?/robots.txt锛?*/
router.use('/seo', seoRoutes);

module.exports = router;


