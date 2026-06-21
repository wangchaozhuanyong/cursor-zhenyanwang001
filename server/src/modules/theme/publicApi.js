const themeService = require('./service/theme.service');

module.exports = {
  normalizeThemeConfig: themeService.normalizeThemeConfig,
  normalizeThemeSkinsPayload: themeService.normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId: themeService.resolveRuntimeThemeSkinId,
  getActiveThemeConfig: themeService.getActiveThemeConfig,
  getThemeSkins: themeService.getThemeSkins,
  getAdminThemeSkins: themeService.getAdminThemeSkins,
  updateThemeConfig: themeService.updateThemeConfig,
  updateThemeSkins: themeService.updateThemeSkins,
  saveThemeSkinDraft: themeService.saveThemeSkinDraft,
  createThemePreviewDraft: themeService.createThemePreviewDraft,
  getThemePreviewDraft: themeService.getThemePreviewDraft,
  publishThemeSkin: themeService.publishThemeSkin,
  disableThemeSkin: themeService.disableThemeSkin,
};
