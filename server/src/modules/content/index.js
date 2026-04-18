/**
 * Content 域：站点信息与静态页
 */
const { Router } = require('express');

const router = Router();
router.use('/content', require('./content.routes'));

module.exports = router;
