/**
 * 閫氱煡瑙﹀彂寮€鍏崇殑瀵瑰闂ㄩ潰锛堜笉瑁呰浇 admin.routes锛夈€? * 渚?order/payments 绛夊湪鏂囦欢椤?require锛岄伩鍏?admin/index 鈫?admin.routes 鈫?order/payments 鈫?鍐?require admin 鐨勫惊鐜緷璧栥€? */
const notificationTriggerSettings = require('./service/notificationTriggerSettings.service');

module.exports = {
  isNotificationTriggerEnabled: notificationTriggerSettings.isNotificationTriggerEnabled,
  getResolvedTriggerCopy: notificationTriggerSettings.getResolvedTriggerCopy,
};

