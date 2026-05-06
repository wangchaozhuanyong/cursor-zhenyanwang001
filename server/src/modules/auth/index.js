/**
 * Auth 域：注册登录、刷新令牌、登出
 */
const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));

module.exports = router;
