module.exports = {
  async up(query) {
    const [rows] = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'home_module_settings' LIMIT 1",
    ).catch((error) => {
      if (error?.code === 'ER_NO_SUCH_TABLE') return [[]];
      throw error;
    });
    const raw = rows?.[0]?.setting_value;
    if (!raw) return;

    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;

    parsed.modules = { ...(parsed.modules || {}), member_coupons: false };
    await query(
      "UPDATE site_settings SET setting_value = ? WHERE setting_key = 'home_module_settings'",
      [JSON.stringify(parsed)],
    );
  },
};
