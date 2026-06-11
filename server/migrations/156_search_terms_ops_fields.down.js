module.exports = {
  async down(query) {
    async function drop(sql, ignoredCodes = ['ER_CANT_DROP_FIELD_OR_KEY', 'ER_BAD_FIELD_ERROR']) {
      try {
        await query(sql);
      } catch (e) {
        if (!ignoredCodes.includes(e.code)) throw e;
      }
    }

    await drop('ALTER TABLE search_terms DROP KEY idx_search_terms_ops');
    await drop('ALTER TABLE search_terms DROP COLUMN remark');
    await drop('ALTER TABLE search_terms DROP COLUMN sort_order');
    await drop('ALTER TABLE search_terms DROP COLUMN is_hidden');
    await drop('ALTER TABLE search_terms DROP COLUMN is_pinned');
    await drop('ALTER TABLE search_terms DROP COLUMN source');
  },
};
