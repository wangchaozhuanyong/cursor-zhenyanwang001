const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createThemePreviewDraft,
  normalizeThemeConfig,
  normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId,
} = require('../src/modules/theme/service/theme.service');
const themeRepo = require('../src/modules/theme/repository/theme.repository');
const { THEME_PRESETS } = require('../src/modules/theme/theme.presets');

test('theme config forces admin mode fixed and keeps new skin fields', () => {
  const config = normalizeThemeConfig({
    adminThemeMode: 'follow_store',
    homeLayout: 'modularShowcase',
    texture: { material: 'titaniumMist', grainOpacity: 0.018 },
  });

  assert.equal(config.adminThemeMode, 'fixed');
  assert.equal(config.homeLayout, 'modularShowcase');
  assert.equal(config.texture.material, 'titaniumMist');
  assert.equal(config.texture.grainOpacity, 0.018);
});

test('runtime theme prefers active lunar festival skin only inside schedule window', () => {
  const payload = normalizeThemeSkinsPayload({
    defaultSkinId: 'polar',
    activeSkinId: 'polar',
    skins: THEME_PRESETS,
  });

  assert.equal(resolveRuntimeThemeSkinId(payload, new Date('2026-01-20T00:00:00Z')), 'newyear');
  assert.equal(resolveRuntimeThemeSkinId(payload, new Date('2026-07-15T00:00:00Z')), 'polar');
  assert.equal(resolveRuntimeThemeSkinId(payload, new Date('2026-09-25T00:00:00Z')), 'midautumn');
});

test('preview draft creation preserves string admin user ids', async () => {
  const originals = {
    selectThemeSkinRows: themeRepo.selectThemeSkinRows,
    selectThemeSkinsRaw: themeRepo.selectThemeSkinsRaw,
    selectThemeConfigRaw: themeRepo.selectThemeConfigRaw,
    deleteExpiredPreviewDrafts: themeRepo.deleteExpiredPreviewDrafts,
    insertPreviewDraft: themeRepo.insertPreviewDraft,
  };
  let inserted = null;

  themeRepo.selectThemeSkinRows = async () => null;
  themeRepo.selectThemeSkinsRaw = async () => null;
  themeRepo.selectThemeConfigRaw = async () => null;
  themeRepo.deleteExpiredPreviewDrafts = async () => {};
  themeRepo.insertPreviewDraft = async (row) => {
    inserted = row;
  };

  try {
    const result = await createThemePreviewDraft('polar', {
      config: THEME_PRESETS.find((skin) => skin.id === 'polar').config,
    }, 'admin-user-uuid-1');

    assert.equal(result.themeKey, 'polar');
    assert.match(result.draftToken, /^[a-f0-9]{48}$/);
    assert.equal(inserted.createdBy, 'admin-user-uuid-1');
  } finally {
    Object.assign(themeRepo, originals);
  }
});
