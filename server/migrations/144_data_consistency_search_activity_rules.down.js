module.exports = {
  async down(query) {
    await query(
      `DELETE FROM data_consistency_rules
       WHERE code IN ('PRODUCT_SEARCH_KEYWORDS_MISMATCH', 'ANALYTICS_PAYMENT_SUCCESS_MISSING')`,
    ).catch(() => {});
  },
};
