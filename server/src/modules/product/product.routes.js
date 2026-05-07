/**
 * Catalog 域：商品列表与详情
 */
const { Router } = require('express');
const ctrl = require('./product.controller');
const { validate } = require('../../middleware/validate');
const {
  productIdParamSchema,
  productListQuerySchema,
} = require('./schemas/product.schemas');

const router = Router();

router.get('/home', ctrl.getHomeProducts);
router.post('/home/events', ctrl.trackHomeEvent);
router.get('/', validate({ query: productListQuerySchema }), ctrl.getProducts);
router.get('/:id/related', validate({ params: productIdParamSchema }), ctrl.getRelatedProducts);
router.get('/:id', validate({ params: productIdParamSchema }), ctrl.getProductById);

module.exports = router;
