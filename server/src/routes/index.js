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
const pwa = require('../modules/pwa');
const seo = require('../modules/seo');
const theme = require('../modules/theme');
const monitoring = require('../modules/monitoring');
const dataRetention = require('../modules/dataRetention');
const media = require('../modules/media');
const { ROBOTS_NOINDEX_NOFOLLOW } = require('../utils/seoHeaders');

const router = Router();

router.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', ROBOTS_NOINDEX_NOFOLLOW);
  }
  next();
});

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
router.use(pwa);
router.use(seo);
router.use(theme);
router.use(monitoring);
router.use(dataRetention);
router.use(media.routes);
router.use(admin);

module.exports = router;
