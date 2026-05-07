module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS home_engagement_events');
    await query(`
      DELETE FROM site_settings
      WHERE setting_key IN (
        'newArrivalHeroImage',
        'newArrivalHeroTitle',
        'newArrivalHeroSubtitle',
        'newArrivalHeroCtaText'
      )
    `);
  },
};
