module.exports = {
  async down(query) {
    const drop = async (col) => {
      try {
        await query(`ALTER TABLE orders DROP COLUMN ${col}`);
      } catch (e) {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      }
    };
    await drop('tax_exclusive_amount');
    await drop('tax_amount');
    await drop('taxable_amount');
    await drop('tax_label');
    await drop('tax_rate');
    await drop('tax_mode');
  },
};
