const { Router } = require('express');
const ctrl = require('./cart.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.use(auth);
router.get('/', ctrl.getCart);
router.post('/', ctrl.addToCart);
router.put('/:productId', ctrl.updateCartItem);
/** 必须先注册「清空」，再注册「按商品删除」，否则 DELETE /cart 可能被当成 :productId */
router.delete('/', ctrl.clearCart);
router.delete('/:productId', ctrl.removeCartItem);

module.exports = router;
