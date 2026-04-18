/**
 * Auth 域：注册登录、用户资料、收藏与浏览历史
 */
const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/user', require('./user.routes'));
router.use('/favorites', require('./favorites.routes'));
router.use('/history', require('./history.routes'));

module.exports = router;
