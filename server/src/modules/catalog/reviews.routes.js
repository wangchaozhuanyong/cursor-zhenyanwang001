const { Router } = require('express');
const ctrl = require('./review.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/product/:productId', ctrl.getProductReviews);
router.post('/', auth, ctrl.createReview);
router.post('/:id/like', auth, ctrl.toggleLike);

module.exports = router;
