const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();
router.use('/loyalty', require('./routes/loyalty.routes'));

/** @type {any} */ (router).api = publicApi;

module.exports = router;
