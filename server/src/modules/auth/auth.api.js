const authService = require('./service/auth.service');
const wechatService = require('./service/wechat.service');
const authRepo = require('./repository/auth.repository');

module.exports = {
  getProfile: authService.getProfile,
  updateProfile: authService.updateProfile,
  startWechatBind: wechatService.startWechatBind,
  unbindWechatForUser: wechatService.unbindWechatForUser,
  getWechatBindingForProfile: wechatService.getWechatBindingForProfile,
  isWechatLoginEnabled: wechatService.isWechatLoginEnabled,
  findUserByPhone: authService.findUserByPhone,
  findUserByPhones: authService.findUserByPhones,
  findUsersByPhones: authService.findUsersByPhones,
  bumpRefreshTokenVersion: authService.bumpRefreshTokenVersion,
  changePassword: authService.changePassword,
  updateLastLogin: authService.updateLastLogin,
  refresh: authService.refresh,
  logoutAll: authService.logoutAll,
  getUserIdAndRole: authService.getUserIdAndRole,
  findPhoneDuplicateForUser: authService.findPhoneDuplicateForUser,
  findPhoneDuplicateByPhonesForUser: authService.findPhoneDuplicateByPhonesForUser,
  selectUserBirthdayFields: authRepo.selectUserBirthdayFields,
};
