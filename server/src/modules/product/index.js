const { Router } = require('express');
const catalogService = require('./service/catalog.service');
const contentService = require('./service/content.service');
const productApiService = require('./service/product.api.service');
const tagAssignmentRepo = require('./repository/productTagAssignment.repository');
const lifecycle = require('./productLifecycle');

const router = Router();

/** @type {any} */ (router).api = {
  clearCatalogCache: catalogService.clearCatalogCache,
  getPublicSiteInfo: contentService.getPublicSiteInfo,
  getPublicHomeOps: contentService.getPublicHomeOps,
  getBanners: catalogService.getBanners,
  getCategories: catalogService.getCategories,
  getHomeProducts: catalogService.getHomeProducts,
  getProductById: productApiService.getProductById,
  selectTagsByProductIds: tagAssignmentRepo.selectTagsByProductIds,
  replaceTagAssignments: tagAssignmentRepo.replaceAssignments,
  LIFECYCLE: lifecycle.LIFECYCLE,
  lifecycleFromBody: lifecycle.lifecycleFromBody,
  lifecycleFromFilter: lifecycle.lifecycleFromFilter,
  statusVarcharFromLifecycle: lifecycle.statusVarcharFromLifecycle,
  normalizeLifecycleFromRow: lifecycle.normalizeLifecycleFromRow,
  ACTIVE_PRODUCT_WHERE: lifecycle.ACTIVE_PRODUCT_WHERE,
  activeProductWhere: lifecycle.activeProductWhere,
};

router.use('/banners', require('./routes/banner.routes'));
router.use('/products', require('./routes/product.routes'));
router.use('/categories', require('./routes/category.routes'));
router.use('/reviews', require('./routes/reviews.routes'));
router.use('/content', require('./routes/content.routes'));

module.exports = router;
