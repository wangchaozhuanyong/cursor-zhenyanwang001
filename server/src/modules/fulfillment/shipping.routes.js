const { Router } = require('express');
const ctrl = require('./shipping.controller');

const router = Router();

router.get('/', ctrl.getTemplates);
router.post('/quote', ctrl.quoteShipping);

module.exports = router;
