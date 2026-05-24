/** 订单域管理端事件通知（经 admin 模块公开 API） */

function getAdminApi() {
  return /** @type {any} */ (require('../admin')).api || {};
}

function publishAdminEvent(event) {
  try {
    getAdminApi().publishAdminEvent(event);
  } catch {
    // Realtime refresh is best-effort.
  }
}

function emitAdminEvent(event) {
  try {
    void getAdminApi().emitEvent(event, { operatorType: 'system' });
  } catch {
    // Monitoring is best-effort.
  }
}

module.exports = {
  publishAdminEvent,
  emitAdminEvent,
};
