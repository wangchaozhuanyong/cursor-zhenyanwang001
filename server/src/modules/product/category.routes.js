/**
 * Catalog 域：分类
 */
const { Router } = require('express');
const ctrl = require('./category.controller');
const { validate } = require('../../middleware/validate');
const { categoryIdParamSchema } = require('./schemas/product.schemas');

const router = Router();

router.get('/', ctrl.getCategories);
router.get('/:id', validate({ params: categoryIdParamSchema }), ctrl.getCategoryById);

module.exports = router;
