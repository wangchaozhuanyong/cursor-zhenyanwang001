/**
 * Catalog domain: product list and detail routes.
 */
const { Router } = require('express');
const ctrl = require('../controller/product.controller');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const {
  productIdParamSchema,
  productListQuerySchema,
} = require('../schemas/product.schemas');

const router = Router();
const mallFeature = requireSiteCapability('mallEnabled', '商城功能已关闭');

router.get('/home', mallFeature, ctrl.getHomeProducts);
router.post('/home/events', ctrl.trackHomeEvent);
router.get('/tags', mallFeature, ctrl.getProductTags);
router.get('/', mallFeature, validate({ query: productListQuerySchema }), ctrl.getProducts);
router.get('/:id/related', mallFeature, validate({ params: productIdParamSchema }), ctrl.getRelatedProducts);
router.get('/:id', mallFeature, validate({ params: productIdParamSchema }), ctrl.getProductById);

module.exports = router;
