const { Router } = require('express');
const themeService = require('./service/theme.service');

const router = Router();
router.use('/theme', require('./routes/theme.routes'));

/** @type {any} */ (router).api = {
  normalizeThemeConfig: themeService.normalizeThemeConfig,
  normalizeThemeSkinsPayload: themeService.normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId: themeService.resolveRuntimeThemeSkinId,
  getActiveThemeConfig: themeService.getActiveThemeConfig,
  getThemeSkins: themeService.getThemeSkins,
  updateThemeConfig: themeService.updateThemeConfig,
  updateThemeSkins: themeService.updateThemeSkins,
};

module.exports = router;
