const { Router } = require('express');
const ctrl = require('./favorites.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  addFavoriteBodySchema,
  productIdParamSchema,
} = require('./schemas/user.schemas');

const router = Router();

router.get('/', auth, ctrl.getFavorites);
router.post('/', auth, validate({ body: addFavoriteBodySchema }), ctrl.addFavorite);
router.get('/:productId/check', auth, validate({ params: productIdParamSchema }), ctrl.checkFavorite);
router.delete('/:productId', auth, validate({ params: productIdParamSchema }), ctrl.removeFavorite);

module.exports = router;
