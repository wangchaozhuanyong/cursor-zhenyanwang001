const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();
router.use('/search', require('./routes/search.routes'));

/** @type {any} */ (router).api = publicApi;

module.exports = router;
