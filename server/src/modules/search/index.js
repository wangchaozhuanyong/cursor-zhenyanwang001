const { Router } = require('express');

const router = Router();
router.use('/search', require('./routes/search.routes'));

module.exports = router;
