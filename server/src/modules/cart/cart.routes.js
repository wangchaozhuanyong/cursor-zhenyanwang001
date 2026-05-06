const { Router } = require('express');
const ctrl = require('./cart.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  addToCartBodySchema,
  updateCartItemBodySchema,
  productIdParamSchema,
} = require('./schemas/cart.schemas');

const router = Router();

router.use(auth);

router.get('/', ctrl.getCart);
router.post('/', validate({ body: addToCartBodySchema }), ctrl.addToCart);
router.put(
  '/:productId',
  validate({ params: productIdParamSchema, body: updateCartItemBodySchema }),
  ctrl.updateCartItem,
);
/** 必须先注册「清空」，再注册「按商品删除」，否则 DELETE /cart 可能被当成 :productId */
router.delete('/', ctrl.clearCart);
router.delete('/:productId', validate({ params: productIdParamSchema }), ctrl.removeCartItem);

module.exports = router;
