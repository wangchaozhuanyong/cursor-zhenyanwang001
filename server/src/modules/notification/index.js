const { Router } = require('express');

const router = Router();
router.use('/notification', require('./routes/notification.routes'));

/** @type {any} */ (router).api = {};

module.exports = router;
