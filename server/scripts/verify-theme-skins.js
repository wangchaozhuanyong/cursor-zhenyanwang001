require('dotenv').config();
const { getThemeSkins } = require('../src/modules/theme/service/theme.service');

const REQUIRED_SKIN_IDS = [
  'premium_ivory_jade',
  'default_life_green',
  'festive_ruby_gold',
  'obsidian_black_gold',
  'midnight_titanium',
  'starter_festive_ruby_gold',
  'aetherial_blanc',
  'organic_sandstone',
];

getThemeSkins()
  .then((data) => {
    const skinIds = data.skins.map((s) => s.id);
    const missing = REQUIRED_SKIN_IDS.filter((id) => !skinIds.includes(id));
    console.log('defaultSkinId:', data.defaultSkinId);
    console.log('activeSkinId:', data.activeSkinId);
    console.log('skinCount:', data.skins.length);
    console.log('skinIds:', skinIds.join(', '));
    if (missing.length) {
      console.error('missingSkinIds:', missing.join(', '));
    }
    process.exit(missing.length === 0 && data.defaultSkinId === 'premium_ivory_jade' ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
