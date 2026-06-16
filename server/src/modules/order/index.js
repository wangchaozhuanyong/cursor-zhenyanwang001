const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();

/** 兼容旧入口的 order public API 暴露；新代码优先直接引用 publicApi。 */
/** @type {any} */ (router).api = publicApi;

router.use('/orders', require('./routes/orders.routes'));
router.use('/returns', require('./routes/returns.routes'));

module.exports = router;
