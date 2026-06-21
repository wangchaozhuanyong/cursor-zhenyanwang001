require('dotenv').config();
const { getThemeSkins } = require('../src/modules/theme/service/theme.service');

const REQUIRED_SKIN_IDS = [
  'polar',
  'moss',
  'iris',
  'newyear',
  'midautumn',
];
const FORBIDDEN_SKIN_IDS = ['obsidian_black_gold', 'midnight_titanium'];

getThemeSkins()
  .then((data) => {
    const skinIds = data.skins.map((s) => s.id);
    const missing = REQUIRED_SKIN_IDS.filter((id) => !skinIds.includes(id));
    const forbidden = FORBIDDEN_SKIN_IDS.filter((id) => skinIds.includes(id));
    console.log('defaultSkinId:', data.defaultSkinId);
    console.log('activeSkinId:', data.activeSkinId);
    console.log('holidaySkinId:', data.holidaySkinId);
    console.log('skinCount:', data.skins.length);
    console.log('skinIds:', skinIds.join(', '));
    if (missing.length) {
      console.error('missingSkinIds:', missing.join(', '));
    }
    if (forbidden.length) {
      console.error('forbiddenSkinIds:', forbidden.join(', '));
    }
    process.exit(
      missing.length === 0
        && forbidden.length === 0
        && data.defaultSkinId === 'polar'
        && data.holidaySkinId === 'newyear'
        ? 0
        : 1,
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
