const { Router } = require('express');

const router = Router();
router.use('/search', require('./search.routes'));

module.exports = router;
