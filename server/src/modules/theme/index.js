const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();
router.use('/theme', require('./routes/theme.routes'));

/** @type {any} */ (router).api = publicApi;

module.exports = router;
