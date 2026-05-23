/**
 * 将 MySQL / Node 原始英文错误转为管理端可展示的中文说明。
 */
/** @type {Array<{ test: RegExp; message?: string; format?: (msg: string) => string }>} */
const PATTERNS = [
  {
    test: /Illegal mix of collations/i,
    message: '数据库表字符集排序规则不一致（utf8mb4 校对冲突），请联系技术人员执行迁移 109 统一校对规则。',
  },
  {
    test: /ECONNREFUSED|connect ECONNREFUSED/i,
    message: '无法连接数据库，请确认数据库服务已启动。',
  },
  {
    test: /ETIMEDOUT|timeout/i,
    message: '数据库响应超时，请稍后重试。',
  },
  {
    test: /ER_NO_SUCH_TABLE|doesn't exist/i,
    message: '缺少所需数据表，请先执行数据库迁移。',
  },
  {
    test: /ER_BAD_FIELD_ERROR|Unknown column/i,
    message: '数据库字段与程序版本不匹配，请执行迁移后重试。',
  },
  {
    test: /Unknown monitoring rule:/i,
    format: (msg) => `未知监控规则：${String(msg).split(':').slice(1).join(':').trim()}`,
  },
  {
    test: /Rule not seeded:/i,
    format: (msg) => `监控规则未初始化：${String(msg).split(':').slice(1).join(':').trim()}`,
  },
];

function localizeDbError(message) {
  const raw = String(message || '').trim();
  if (!raw) return '';
  for (const item of PATTERNS) {
    if (!item.test.test(raw)) continue;
    return typeof item.format === 'function' ? item.format(raw) : (item.message || raw);
  }
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
}

module.exports = { localizeDbError };
