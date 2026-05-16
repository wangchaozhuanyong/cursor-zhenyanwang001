require('dotenv').config();
const { getThemeSkins } = require('../src/modules/user/theme.service');

getThemeSkins()
  .then((data) => {
    console.log('defaultSkinId:', data.defaultSkinId);
    console.log('activeSkinId:', data.activeSkinId);
    console.log('skinCount:', data.skins.length);
    console.log('skinIds:', data.skins.map((s) => s.id).join(', '));
    process.exit(data.skins.length === 6 && data.defaultSkinId === 'default_life_green' ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
