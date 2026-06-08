#!/usr/bin/env node

const db = require('../src/config/db');

async function main() {
  const [heavyProducts] = await db.query(`
    SELECT
      id,
      name,
      LENGTH(cover_image) AS cover_len,
      LENGTH(images) AS images_len,
      LENGTH(description) AS desc_len
    FROM products
    ORDER BY COALESCE(LENGTH(cover_image), 0)
           + COALESCE(LENGTH(images), 0)
           + COALESCE(LENGTH(description), 0) DESC
    LIMIT 20
  `);

  const [[dataUrlProducts]] = await db.query(`
    SELECT COUNT(*) AS data_url_products
    FROM products
    WHERE cover_image LIKE 'data:%'
       OR images LIKE '%data:image%'
  `);

  const [heavyBanners] = await db.query(`
    SELECT
      id,
      title,
      LENGTH(COALESCE(image, '')) AS image_len,
      LEFT(COALESCE(image, ''), 40) AS image_prefix
    FROM banners
    ORDER BY LENGTH(COALESCE(image, '')) DESC
    LIMIT 20
  `);

  const [[dataUrlBanners]] = await db.query(`
    SELECT COUNT(*) AS data_url_banners
    FROM banners
    WHERE COALESCE(image, '') LIKE 'data:%'
       OR COALESCE(image, '') LIKE '%data:image%'
  `);

  console.log(JSON.stringify({
    heavyProducts,
    dataUrlProducts,
    heavyBanners,
    dataUrlBanners,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end?.();
  });
