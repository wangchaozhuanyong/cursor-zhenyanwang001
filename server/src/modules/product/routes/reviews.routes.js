const { Router } = require('express');
const ctrl = require('../controller/review.controller');
const auth = require('../../../middleware/auth');
const authOptional = require('../../../middleware/authOptional');
const { guardByAction } = require('../../../middleware/accountStatusGuard');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const {
  productReviewsQuerySchema,
  productReviewProductParamSchema,
  reviewIdParamSchema,
  createReviewBodySchema,
} = require('../schemas/product.schemas');

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
router.post('/', requireSiteCapability('reviewEnabled', '本站未启用评价功能'), auth, guardByAction('comment'), validate({ body: createReviewBodySchema }), ctrl.createReview);
router.post('/:id/like', requireSiteCapability('reviewEnabled', '本站未启用评价功能'), auth, guardByAction('comment'), validate({ params: reviewIdParamSchema }), ctrl.toggleLike);

module.exports = router;



