module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE banners
      ADD COLUMN cta_text VARCHAR(80) NOT NULL DEFAULT '' AFTER description
    `).catch((e) => {
      if (e.code === 'ER_DUP_FIELDNAME') return;
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        return query(`
          ALTER TABLE banners
          ADD COLUMN cta_text VARCHAR(80) NOT NULL DEFAULT '' AFTER title
        `).catch((fallbackErr) => {
          if (fallbackErr.code !== 'ER_DUP_FIELDNAME') throw fallbackErr;
        });
      }
      throw e;
    });
  },
};
