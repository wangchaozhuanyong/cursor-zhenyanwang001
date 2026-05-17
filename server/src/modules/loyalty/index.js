const { Router } = require('express');

const router = Router();
router.use('/loyalty', require('./loyalty.routes'));

module.exports = router;

