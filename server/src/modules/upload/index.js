/**
 * Upload：会员端上传
 */
const { Router } = require('express');

const router = Router();
router.use('/upload', require('./upload.routes'));

module.exports = router;
