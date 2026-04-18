const authService = require('./auth.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.register = asyncRoute(async (req, res) => {
  const result = await authService.register(req.body);
  res.success(result.data, result.message);
});

exports.login = asyncRoute(async (req, res) => {
  const result = await authService.login(req.body);
  res.success(result.data, result.message);
});

exports.getProfile = asyncRoute(async (req, res) => {
  const result = await authService.getProfile(req.user.id);
  res.success(result.data);
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const result = await authService.updateProfile(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.changePassword = asyncRoute(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.refresh = asyncRoute(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.success(result.data);
});

exports.logout = asyncRoute(async (req, res) => {
  const result = await authService.logout(req.user?.id);
  res.success(result.data, result.message);
});
