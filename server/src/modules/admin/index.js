/**
 * Admin 域：管理端 API
 */
const { Router } = require('express');

const router = Router();
router.use('/admin', require('./admin.routes'));

module.exports = router;
