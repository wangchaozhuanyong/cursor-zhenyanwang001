/**
 * Catalog 域：首页 / 会员端 Banner 列表（原 routes/banners.js）
 */
const { Router } = require('express');
const ctrl = require('./banner.controller');

const router = Router();

router.get('/', ctrl.getBanners);

module.exports = router;
