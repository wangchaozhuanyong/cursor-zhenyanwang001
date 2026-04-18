const { Router } = require('express');
const ctrl = require('./notification.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/unread-count', auth, ctrl.getUnreadCount);
router.get('/', auth, ctrl.getNotifications);
router.post('/read-all', auth, ctrl.markAllAsRead);
router.post('/:id/read', auth, ctrl.markAsRead);

module.exports = router;
