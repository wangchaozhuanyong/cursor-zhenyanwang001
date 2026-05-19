const { Router } = require('express');

const router = Router();
router.use('/loyalty', require('./routes/loyalty.routes'));

module.exports = router;

