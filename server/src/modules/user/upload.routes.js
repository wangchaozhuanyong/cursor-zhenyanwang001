const { Router } = require('express');
const ctrl = require('./upload.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.post('/', auth, ctrl.uploadMiddleware, ctrl.uploadFile);
router.post('/multiple', auth, ctrl.uploadMultiple, ctrl.uploadFiles);

module.exports = router;
