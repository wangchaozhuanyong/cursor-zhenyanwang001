'use strict';

const repo = require('../src/modules/user/repository/theme.repository');
const { DEFAULT_THEME_CONFIG } = require('../src/modules/user/theme.default');
const {
  normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId,
} = require('../src/modules/user/service/theme.service');

async function up() {
  let current = {};
  const raw = await repo.selectThemeSkinsRaw();
  if (raw) {
    try {
      current = JSON.parse(raw);
    } catch {
      current = {};
    }
  }

  const next = normalizeThemeSkinsPayload(current);
  const runtimeId = next.runtimeSkinId || resolveRuntimeThemeSkinId(next);
  const active = next.skins.find((skin) => skin.id === runtimeId) || next.skins[0];

  await repo.upsertThemeSkins(JSON.stringify(next));
  await repo.upsertThemeConfig(JSON.stringify(active?.config || DEFAULT_THEME_CONFIG));
}

module.exports = { up };
