const { Router } = require('express');
const ctrl = require('./favorites.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/', auth, ctrl.getFavorites);
router.post('/', auth, ctrl.addFavorite);
router.get('/:productId/check', auth, ctrl.checkFavorite);
router.delete('/:productId', auth, ctrl.removeFavorite);

module.exports = router;
