module.exports = {
  async up(query) {
    const channels = [
      [
        'ch_my_fpx',
        'fpx',
        'FPX 网上银行',
        'malaysia_local',
        'MY',
        'MYR',
        11,
        0,
        'sandbox',
        JSON.stringify({
          method: 'fpx',
          fee_rate_percent: 1.0,
          fee_fixed: 0.5,
          gateway_url_template: '',
        }),
      ],
      [
        'ch_my_tng_ewallet',
        'tng_ewallet',
        'Touch n Go eWallet',
        'malaysia_local',
        'MY',
        'MYR',
        12,
        0,
        'sandbox',
        JSON.stringify({
          method: 'ewallet',
          wallet: 'touch_n_go',
          fee_rate_percent: 1.5,
          fee_fixed: 0,
          gateway_url_template: '',
        }),
      ],
      [
        'ch_my_grabpay',
        'grabpay',
        'GrabPay',
        'malaysia_local',
        'MY',
        'MYR',
        13,
        0,
        'sandbox',
        JSON.stringify({
          method: 'ewallet',
          wallet: 'grabpay',
          fee_rate_percent: 1.5,
          fee_fixed: 0,
          gateway_url_template: '',
        }),
      ],
      [
        'ch_my_boost',
        'boost',
        'Boost',
        'malaysia_local',
        'MY',
        'MYR',
        14,
        0,
        'sandbox',
        JSON.stringify({
          method: 'ewallet',
          wallet: 'boost',
          fee_rate_percent: 1.5,
          fee_fixed: 0,
          gateway_url_template: '',
        }),
      ],
    ];

    for (const row of channels) {
      await query(
        `INSERT INTO payment_channels
         (id, code, name, provider, country_code, currency, sort_order, enabled, environment, config_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           provider = VALUES(provider),
           country_code = VALUES(country_code),
           currency = VALUES(currency),
           sort_order = VALUES(sort_order),
           config_json = COALESCE(payment_channels.config_json, VALUES(config_json))`,
        row,
      );
    }
  },
};
