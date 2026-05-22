const { Router } = require('express');
const ctrl = require('../controller/points.controller');
const giftCtrl = require('../controller/pointsGift.controller');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const { pointsListQuerySchema, pointsGiftRedeemBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.use(requireSiteCapability('pointsEnabled', '本站未启用积分功能'));
router.get('/records', auth, validate({ query: pointsListQuerySchema }), ctrl.getRecords);
router.get('/balance', auth, ctrl.getBalance);
router.get('/config', auth, ctrl.getClientConfig);
router.post('/sign-in', auth, ctrl.signIn);
router.get('/gifts', giftCtrl.listGifts);
router.get('/gifts/:id', giftCtrl.getGift);
router.post('/gifts/redeem', auth, validate({ body: pointsGiftRedeemBodySchema }), giftCtrl.redeemGift);

module.exports = router;



