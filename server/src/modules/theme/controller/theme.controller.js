const { asyncRoute } = require('../../../middleware/asyncRoute');
const {
  FIXED_THEME_ID,
  FIXED_THEME_CONFIG,
  FIXED_THEME_PAYLOAD,
} = require('../theme.fixed');

exports.getActive = asyncRoute(async (_req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.success(FIXED_THEME_CONFIG);
});

exports.getSkins = asyncRoute(async (_req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.success(FIXED_THEME_PAYLOAD);
});

exports.getPreviewDraft = asyncRoute(async (req, res) => {
  void req.params.draftToken;
  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.success({
    draftToken: null,
    themeKey: FIXED_THEME_ID,
    config: FIXED_THEME_CONFIG,
    retired: true,
  });
});
