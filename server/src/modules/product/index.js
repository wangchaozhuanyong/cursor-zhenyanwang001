const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();

/** @type {any} */ (router).api = publicApi;

router.use('/banners', require('./routes/banner.routes'));
router.use('/products', require('./routes/product.routes'));
router.use('/categories', require('./routes/category.routes'));
router.use('/reviews', require('./routes/reviews.routes'));
router.use('/content', require('./routes/content.routes'));

module.exports = router;
