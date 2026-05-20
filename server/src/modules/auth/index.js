/**
 * Auth 鍩燂細娉ㄥ唽鐧诲綍銆佸埛鏂颁护鐗屻€佺櫥鍑? */
const { Router } = require('express');
const authApi = require('./auth.api');

const router = Router();

router.use('/auth', require('./routes/auth.routes'));

/** @type {any} */ (router).api = authApi;

module.exports = router;
