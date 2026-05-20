const { Router } = require('express');
const ctrl = require('../controller/analytics.controller');
const authOptional = require('../../../middleware/authOptional');

const router = Router();

router.post('/events', authOptional, ctrl.track);

module.exports = router;

