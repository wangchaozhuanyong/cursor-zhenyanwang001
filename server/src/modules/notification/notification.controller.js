const notificationService = require('./notification.service');

exports.getNotifications = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await notificationService.getNotifications(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { message } = await notificationService.markAsRead(req.user.id, req.params.id);
    res.success(null, message);
  } catch (err) { next(err); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const { message } = await notificationService.markAllAsRead(req.user.id);
    res.success(null, message);
  } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const data = await notificationService.getUnreadCount(req.user.id);
    res.success(data);
  } catch (err) { next(err); }
};
