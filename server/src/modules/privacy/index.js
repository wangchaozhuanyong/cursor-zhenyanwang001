const { Router } = require('express');

const router = Router();
router.use('/privacy', require('./privacy.routes'));

module.exports = router;
