module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE products
      ADD COLUMN video_url VARCHAR(2000) NOT NULL DEFAULT ''
        COMMENT '商品详情页视频URL'
        AFTER cover_image
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });
  },
};
