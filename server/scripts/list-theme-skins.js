require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });
  const [rows] = await conn.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
  );
  const raw = rows[0]?.setting_value;
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const skins = payload?.skins || [];
  console.log('Total skins in DB:', skins.length);
  for (const s of skins) {
    console.log(`  - ${s.id} | ${s.name}`);
  }
  console.log('defaultSkinId:', payload?.defaultSkinId);
  console.log('activeSkinId:', payload?.activeSkinId);
  await conn.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
