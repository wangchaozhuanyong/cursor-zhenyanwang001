module.exports = {
  async down(query) {
    await query('DROP INDEX idx_categories_visible ON categories').catch(() => {});
    await query('DROP INDEX idx_categories_parent_deleted ON categories').catch(() => {});
    await query('DROP INDEX idx_categories_parent_sort ON categories').catch(() => {});

    await query('ALTER TABLE categories DROP COLUMN updated_at').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query('ALTER TABLE categories DROP COLUMN is_visible').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query('ALTER TABLE categories DROP COLUMN icon_url').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query('ALTER TABLE categories DROP COLUMN parent_id').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
  },
};
