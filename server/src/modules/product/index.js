/**
 * Product 域：Banner、商品、分类、评价、站点内容与静态页
 */
const { Router } = require('express');
const catalogService = require('./catalog.service');
const tagAssignmentRepo = require('./productTagAssignment.repository');
const lifecycle = require('./productLifecycle');

const router = Router();

router.use('/banners', require('./banner.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/reviews', require('./reviews.routes'));
router.use('/content', require('./content.routes'));

/** @type {any} */ (router).api = {
  clearCatalogCache: catalogService.clearCatalogCache,
  selectTagsByProductIds: tagAssignmentRepo.selectTagsByProductIds,
  replaceTagAssignments: tagAssignmentRepo.replaceAssignments,
  LIFECYCLE: lifecycle.LIFECYCLE,
  lifecycleFromBody: lifecycle.lifecycleFromBody,
  lifecycleFromFilter: lifecycle.lifecycleFromFilter,
  statusVarcharFromLifecycle: lifecycle.statusVarcharFromLifecycle,
  normalizeLifecycleFromRow: lifecycle.normalizeLifecycleFromRow,
};

module.exports = router;
