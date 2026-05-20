/**
 * Auth 鍩熷澶栵紙鍏朵粬涓氬姟鍩燂級鏆撮湶鐨勭▼搴忓唴 API銆? * 涓?HTTP 璺敱 `/api/auth/*` 浣跨敤鍚屼竴濂?service 瀹炵幇锛岄伩鍏嶅叾浠栨ā鍧楃洿鎺ヤ緷璧?repository銆? */
const authService = require('./service/auth.service');

module.exports = {
  findUserByPhone: authService.findUserByPhone,
  findUserByPhones: authService.findUserByPhones,
  findUsersByPhones: authService.findUsersByPhones,
  bumpRefreshTokenVersion: authService.bumpRefreshTokenVersion,
  changePassword: authService.changePassword,
  updateLastLogin: authService.updateLastLogin,
  refresh: authService.refresh,
  getUserIdAndRole: authService.getUserIdAndRole,
  findPhoneDuplicateForUser: authService.findPhoneDuplicateForUser,
  findPhoneDuplicateByPhonesForUser: authService.findPhoneDuplicateByPhonesForUser,
};
