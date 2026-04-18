/**
 * Returns 域：售后申请
 */
const { Router } = require('express');

const router = Router();
router.use('/returns', require('./returns.routes'));

module.exports = router;
