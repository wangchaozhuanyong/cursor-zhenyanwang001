const themeService = require('./service/theme.service');

module.exports = {
  normalizeThemeConfig: themeService.normalizeThemeConfig,
  normalizeThemeSkinsPayload: themeService.normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId: themeService.resolveRuntimeThemeSkinId,
  getActiveThemeConfig: themeService.getActiveThemeConfig,
  getThemeSkins: themeService.getThemeSkins,
  updateThemeConfig: themeService.updateThemeConfig,
  updateThemeSkins: themeService.updateThemeSkins,
};
