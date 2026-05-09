/**
 * 通知触发开关的对外门面（不装载 admin.routes）。
 * 供 order/payments 等在文件顶 require，避免 admin/index → admin.routes → order/payments → 再 require admin 的循环依赖。
 */
const notificationTriggerSettings = require('./notificationTriggerSettings.service');

module.exports = {
  isNotificationTriggerEnabled: notificationTriggerSettings.isNotificationTriggerEnabled,
};
