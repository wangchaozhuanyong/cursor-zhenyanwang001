/**
 * Catalog 域：商品列表与详情（原 routes/products.js）
 */
const { Router } = require('express');
const ctrl = require('./product.controller');

const router = Router();

router.get('/home', ctrl.getHomeProducts);
router.get('/', ctrl.getProducts);
router.get('/:id/related', ctrl.getRelatedProducts);
router.get('/:id', ctrl.getProductById);

module.exports = router;
