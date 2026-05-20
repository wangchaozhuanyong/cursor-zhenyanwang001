const express = require('express');
const { createPwaBrandRouter } = require('./pwa.routes');

const router = express.Router();
router.use('/pwa', createPwaBrandRouter({ iconBasePath: '/api/pwa' }));

module.exports = router;
