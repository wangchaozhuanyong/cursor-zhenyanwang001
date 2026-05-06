const { Router } = require('express');
const ctrl = require('./review.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  productReviewsQuerySchema,
  productReviewProductParamSchema,
  reviewIdParamSchema,
  createReviewBodySchema,
} = require('./schemas/product.schemas');

const router = Router();

router.get('/featured', ctrl.getFeaturedReviews);
router.get(
  '/product/:productId',
  validate({ params: productReviewProductParamSchema, query: productReviewsQuerySchema }),
  ctrl.getProductReviews,
);
router.post('/', auth, validate({ body: createReviewBodySchema }), ctrl.createReview);
router.post('/:id/like', auth, validate({ params: reviewIdParamSchema }), ctrl.toggleLike);

module.exports = router;
