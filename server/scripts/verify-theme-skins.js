require('dotenv').config();
const { getThemeSkins } = require('../src/modules/theme/service/theme.service');

const REQUIRED_SKIN_IDS = [
  'premium_champagne_ivory',
  'premium_pearl_blush',
  'premium_porcelain_jade',
  'premium_sky_silk',
  'premium_apricot_sand',
  'festival_spring_ruby_gold',
  'festival_moon_orange_gold',
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
        && data.defaultSkinId === 'premium_champagne_ivory'
        && data.holidaySkinId === 'festival_spring_ruby_gold'
        ? 0
        : 1,
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
