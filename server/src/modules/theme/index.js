const { Router } = require('express');

const router = Router();

router.use('/theme', require('./theme.routes'));

module.exports = router;
