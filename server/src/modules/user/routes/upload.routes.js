const { Router } = require('express');
const ctrl = require('../controller/upload.controller');
const presignCtrl = require('../controller/uploadPresign.controller');
const auth = require('../../../middleware/auth');

const router = Router();

router.post('/ticket', auth, presignCtrl.createTicket);
router.post('/complete', auth, presignCtrl.completeUpload);
router.post('/', auth, ctrl.uploadMiddleware, ctrl.uploadFile);
router.post('/multiple', auth, ctrl.uploadMultiple, ctrl.uploadFiles);

module.exports = router;

