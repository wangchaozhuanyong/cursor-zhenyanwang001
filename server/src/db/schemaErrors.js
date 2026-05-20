/** MySQL / SQL 与当前代码结构不一致（多为未跑迁移） */
function isSchemaDriftError(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === 'ER_BAD_FIELD_ERROR'
    || code === 'ER_NO_SUCH_TABLE'
    || code === 'ER_PARSE_ERROR'
    || /unknown column/i.test(msg)
    || /doesn't exist/i.test(msg)
    || /no such table/i.test(msg);
}

module.exports = { isSchemaDriftError };
