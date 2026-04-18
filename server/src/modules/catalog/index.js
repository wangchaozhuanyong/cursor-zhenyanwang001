/**
 * Catalog 域聚合路由：Banner、商品、分类、评价
 */
const { Router } = require('express');

const router = Router();

router.use('/banners', require('./banner.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/reviews', require('./reviews.routes'));

module.exports = router;
