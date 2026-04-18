/**
 * Catalog 域：分类（原 routes/categories.js）
 */
const { Router } = require('express');
const ctrl = require('./category.controller');

const router = Router();

router.get('/', ctrl.getCategories);
router.get('/:id', ctrl.getCategoryById);

module.exports = router;
