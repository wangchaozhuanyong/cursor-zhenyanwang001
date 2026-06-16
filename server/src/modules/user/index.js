/**
 * User 鍩燂細浼氬憳璧勬枡銆佹敹钘忎笌娴忚鍘嗗彶銆佸湴鍧€涓庤繍璐癸紙璇伙級銆佽惀閿€鐗规潈銆佺珯鍐呴€氱煡銆佷笂浼? */
const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();

router.use('/user', require('./routes/user.routes'));
router.use('/me', require('./routes/me.routes'));
router.use('/favorites', require('./routes/favorites.routes'));
router.use('/history', require('./routes/history.routes'));
router.use('/addresses', require('./routes/addresses.routes'));
router.use('/shipping', require('./routes/shipping.routes'));
router.use('/notifications', require('./routes/notifications.routes'));
router.use('/feedback', require('./routes/feedback.routes'));
router.use('/coupons', require('./routes/coupons.routes'));
router.use('/points', require('./routes/points.routes'));
router.use('/rewards', require('./routes/rewards.routes'));
router.use('/invite', require('./routes/invite.routes'));
router.use('/upload', require('./routes/upload.routes'));

// Cross-module public API (do not import internal files directly from other modules)
/** @type {any} */ (router).api = publicApi;

module.exports = router;
