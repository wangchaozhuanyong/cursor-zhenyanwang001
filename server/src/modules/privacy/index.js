const { Router } = require('express');

const router = Router();
router.use('/privacy', require('./routes/privacy.routes'));

module.exports = router;
