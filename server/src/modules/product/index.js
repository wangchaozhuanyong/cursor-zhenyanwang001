/**
 * Product 域：Banner、商品、分类、评价、站点内容与静态页
 */
const { Router } = require('express');
const catalogService = require('./catalog.service');

const router = Router();

router.use('/banners', require('./banner.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/reviews', require('./reviews.routes'));
router.use('/content', require('./content.routes'));

/** @type {any} */ (router).api = {
  clearCatalogCache: catalogService.clearCatalogCache,
};

module.exports = router;
