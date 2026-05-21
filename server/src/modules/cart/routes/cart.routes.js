const { Router } = require('express');
const ctrl = require('../controller/cart.controller');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const {
  addToCartBodySchema,
  updateCartItemBodySchema,
  productIdParamSchema,
} = require('../schemas/cart.schemas');

const router = Router();
const mallFeature = requireSiteCapability('mallEnabled', '商城功能已关闭');

router.use(auth);
router.use(mallFeature);

router.get('/', ctrl.getCart);
router.post('/', validate({ body: addToCartBodySchema }), ctrl.addToCart);
router.put(
  '/:productId',
  validate({ params: productIdParamSchema, body: updateCartItemBodySchema }),
  ctrl.updateCartItem,
);
/** 蹇呴』鍏堟敞鍐屻€屾竻绌恒€嶏紝鍐嶆敞鍐屻€屾寜鍟嗗搧鍒犻櫎銆嶏紝鍚﹀垯 DELETE /cart 鍙兘琚綋鎴?:productId */
router.delete('/', ctrl.clearCart);
router.delete('/:productId', validate({ params: productIdParamSchema }), ctrl.removeCartItem);

module.exports = router;
