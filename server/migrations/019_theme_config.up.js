const DEFAULT_THEME_CONFIG = {
  radius: '8px',
  fontFamily: 'inter',
  shadowStyle: 'soft',
  imageRatio: '1 / 1',
  cardStyle: 'bordered',
  cardTextAlign: 'left',
  imageFit: 'cover',
  light: {
    primaryColor: '#000000',
    secondaryColor: '#4B5563',
    priceColor: '#DC2626',
    bgColor: '#F9FAFB',
    surfaceColor: '#FFFFFF',
    borderColor: 'auto',
  },
  dark: {
    primaryColor: '#FFFFFF',
    secondaryColor: '#D1D5DB',
    priceColor: '#EF4444',
    bgColor: '#0A0A0A',
    surfaceColor: '#171717',
    borderColor: 'auto',
  },
};

module.exports = {
  async up(query) {
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = setting_value`,
      [JSON.stringify(DEFAULT_THEME_CONFIG)],
    );
  },
};
