const { Router } = require('express');
const ctrl = require('./notification.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  notificationIdParamSchema,
  notificationListQuerySchema,
} = require('./schemas/user.schemas');

const router = Router();

router.get('/unread-count', auth, ctrl.getUnreadCount);
router.get('/', auth, validate({ query: notificationListQuerySchema }), ctrl.getNotifications);
router.post('/read-all', auth, ctrl.markAllAsRead);
router.post('/:id/read', auth, validate({ params: notificationIdParamSchema }), ctrl.markAsRead);

module.exports = router;
