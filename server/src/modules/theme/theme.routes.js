const { Router } = require('express');
const ctrl = require('./theme.controller');

const router = Router();

router.get('/active', ctrl.getActive);
router.get('/skins', ctrl.getSkins);

module.exports = router;
