const { Router } = require('express');
const paymentInfo = require('./paymentInfo.controller');

const router = Router();

router.get('/config', paymentInfo.config);

module.exports = router;
