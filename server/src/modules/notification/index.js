/**
 * Notification 域：站内通知
 */
const { Router } = require('express');

const router = Router();
router.use('/notifications', require('./notifications.routes'));

module.exports = router;
