const profileService = require('../service/profile.service');
const memberLevelService = require('../service/memberLevel.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');

exports.getProfile = asyncRoute(async (req, res) => {
  const result = await profileService.getProfile(req.user.id);
  res.success(result.data);
});

exports.getMemberBenefits = asyncRoute(async (req, res) => {
  const result = await memberLevelService.getMemberBenefitsOverview(req.user.id);
  res.success(result.data);
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const result = await profileService.updateProfile(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.changePassword = asyncRoute(async (req, res) => {
  const result = await profileService.changePassword(req.user.id, req.body);
  res.success(result.data, result.message);
});
