const { Router } = require('express');

const router = Router();
router.use('/theme', require('./routes/theme.routes'));

/** @type {any} */ (router).api = {};

module.exports = router;
