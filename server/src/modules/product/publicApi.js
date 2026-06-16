const catalogService = require('./service/catalog.service');
const contentService = require('./service/content.service');
const productApiService = require('./service/product.api.service');
const tagAssignmentRepo = require('./repository/productTagAssignment.repository');
const lifecycle = require('./productLifecycle');

module.exports = {
  clearCatalogCache: catalogService.clearCatalogCache,
  getPublicSiteInfo: contentService.getPublicSiteInfo,
  getPublicHomeOps: contentService.getPublicHomeOps,
  getBanners: catalogService.getBanners,
  getBannersLite: catalogService.getBannersLite,
  getCategories: catalogService.getCategories,
  getCategoriesLite: catalogService.getCategoriesLite,
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
