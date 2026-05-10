module.exports = {
  async down(query) {
    await query(
      `DELETE FROM payment_channels
       WHERE code IN ('fpx', 'tng_ewallet', 'grabpay', 'boost')
       AND provider = 'malaysia_local'`,
    );
  },
};
