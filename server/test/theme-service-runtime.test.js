const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createThemePreviewDraft,
  normalizeThemeConfig,
  normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId,
  saveThemeSkinDraft,
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

test('saving draft for published default skin keeps storefront public config stable', async () => {
  const originals = {
    selectThemeSkinRows: themeRepo.selectThemeSkinRows,
    updateThemeSkinDraft: themeRepo.updateThemeSkinDraft,
    upsertThemeSkin: themeRepo.upsertThemeSkin,
    setOnlyDefaultThemeSkin: themeRepo.setOnlyDefaultThemeSkin,
    upsertThemeSkins: themeRepo.upsertThemeSkins,
    upsertThemeConfig: themeRepo.upsertThemeConfig,
  };
  const oldAuditFlag = process.env.AUDIT_LOG_DISABLED;
  process.env.AUDIT_LOG_DISABLED = '1';

  const polar = THEME_PRESETS.find((skin) => skin.id === 'polar');
  const moss = THEME_PRESETS.find((skin) => skin.id === 'moss');
  const draftConfig = normalizeThemeConfig({ ...moss.config, primaryColor: '#112233' });
  let rows = [
    {
      themeKey: 'moss',
      name: moss.name,
      description: moss.description,
      category: moss.category,
      type: moss.type,
      status: 'published',
      configJson: JSON.stringify(moss.config),
      draftConfigJson: null,
      isDefault: 1,
      startAt: null,
      endAt: null,
      priority: moss.priority || 0,
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    },
    {
      themeKey: 'polar',
      name: polar.name,
      description: polar.description,
      category: polar.category,
      type: polar.type,
      status: 'published',
      configJson: JSON.stringify(polar.config),
      draftConfigJson: null,
      isDefault: 0,
      startAt: null,
      endAt: null,
      priority: polar.priority || 0,
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    },
  ];
  let draftStatus = null;
  let legacyThemeConfig = null;

  themeRepo.selectThemeSkinRows = async () => rows;
  themeRepo.updateThemeSkinDraft = async (themeKey, draftConfigJson, status) => {
    draftStatus = status;
    rows = rows.map((row) => (
      row.themeKey === themeKey
        ? { ...row, draftConfigJson, status, updatedAt: new Date('2026-06-02T00:00:00Z') }
        : row
    ));
    return 1;
  };
  themeRepo.upsertThemeSkin = async () => {};
  themeRepo.setOnlyDefaultThemeSkin = async () => {};
  themeRepo.upsertThemeSkins = async () => {};
  themeRepo.upsertThemeConfig = async (configJson) => {
    legacyThemeConfig = JSON.parse(configJson);
  };

  try {
    const saved = await saveThemeSkinDraft('moss', { config: draftConfig }, 'admin-user-uuid-1');

    assert.equal(saved.status, 'published');
    assert.equal(draftStatus, 'published');
    assert.equal(saved.config.primaryColor, '#112233');
    assert.equal(legacyThemeConfig.primaryColor, moss.config.primaryColor);
  } finally {
    Object.assign(themeRepo, originals);
    if (oldAuditFlag === undefined) delete process.env.AUDIT_LOG_DISABLED;
    else process.env.AUDIT_LOG_DISABLED = oldAuditFlag;
  }
});
