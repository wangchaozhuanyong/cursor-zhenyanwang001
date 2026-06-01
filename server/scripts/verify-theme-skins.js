require('dotenv').config();
const { getThemeSkins } = require('../src/modules/theme/service/theme.service');

getThemeSkins()
  .then((data) => {
    console.log('defaultSkinId:', data.defaultSkinId);
    console.log('activeSkinId:', data.activeSkinId);
    console.log('skinCount:', data.skins.length);
    console.log('skinIds:', data.skins.map((s) => s.id).join(', '));
    process.exit(data.skins.length >= 3 && data.defaultSkinId === 'premium_ivory_jade' ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
