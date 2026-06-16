const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();
router.use(require('./routes/myinvois.routes'));

/** @type {any} */ (router).api = publicApi;

module.exports = router;
