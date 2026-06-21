const { Router } = require('express');
const ctrl = require('../controller/theme.controller');

const router = Router();

router.get('/active', ctrl.getActive);
router.get('/skins', ctrl.getSkins);
router.get('/preview/:draftToken', ctrl.getPreviewDraft);

module.exports = router;
