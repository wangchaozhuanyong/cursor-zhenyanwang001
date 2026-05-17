const { Router } = require('express');
const auth = require('../../middleware/auth');
const ctrl = require('./me.controller');
const { validate } = require('../../middleware/validate');
const { z } = require('zod');

const bindWechatBodySchema = z.object({
  redirect: z.string().trim().max(512).optional(),
});

const router = Router();

router.get('/summary', auth, ctrl.getSummary);

router.get('/wechat-binding', auth, ctrl.getWechatBinding);
router.post('/bind-wechat', auth, validate({ body: bindWechatBodySchema }), ctrl.bindWechat);
router.get('/bind-wechat', auth, ctrl.bindWechatStart);
router.post('/unbind-wechat', auth, ctrl.unbindWechat);

module.exports = router;

