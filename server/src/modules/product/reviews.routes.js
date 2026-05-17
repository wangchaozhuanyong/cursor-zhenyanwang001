const { Router } = require('express');
const ctrl = require('./review.controller');
const auth = require('../../middleware/auth');
const authOptional = require('../../middleware/authOptional');
const { guardByAction } = require('../../middleware/accountStatusGuard');
const { validate } = require('../../middleware/validate');
const {
  productReviewsQuerySchema,
  productReviewProductParamSchema,
  reviewIdParamSchema,
  createReviewBodySchema,
} = require('./schemas/product.schemas');

const router = Router();

router.get('/featured', ctrl.getFeaturedReviews);
router.get('/pending-items', auth, ctrl.getPendingReviewItems);
router.get(
  '/product/:productId/eligibility',
  authOptional,
  validate({ params: productReviewProductParamSchema }),
  ctrl.getProductReviewEligibility,
);
router.get(
  '/product/:productId/stats',
  validate({ params: productReviewProductParamSchema }),
  ctrl.getProductReviewStats,
);
router.get(
  '/product/:productId',
  validate({ params: productReviewProductParamSchema, query: productReviewsQuerySchema }),
  ctrl.getProductReviews,
);
router.post('/', auth, guardByAction('comment'), validate({ body: createReviewBodySchema }), ctrl.createReview);
router.post('/:id/like', auth, guardByAction('comment'), validate({ params: reviewIdParamSchema }), ctrl.toggleLike);

module.exports = router;
