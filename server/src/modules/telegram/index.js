const { Router } = require('express');
const telegramService = require('./service/telegram.service');

const router = Router();

router.use('/telegram', require('./routes/telegram.routes'));

/** @type {any} */ (router).api = telegramService;

module.exports = router;
