const { ServiceUnavailableError } = require('../errors');
const { getPendingCriticalMigrations } = require('../db/schemaContract');

/**
 * 管理端 API：若关键迁移未执行，返回 503 与明确指引（避免笼统的 500）
 */
async function ensureAdminSchemaReady(_req, _res, next) {
  try {
    const pending = await getPendingCriticalMigrations();
    if (pending.length > 0) {
      const sample = pending.slice(0, 5).join(', ');
      const more = pending.length > 5 ? ` 等共 ${pending.length} 项` : '';
      throw new ServiceUnavailableError(
        `数据库结构未与当前代码同步。请在服务器执行：cd server && npm run migrate。`
        + ` 未完成关键迁移：${sample}${more}`,
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { ensureAdminSchemaReady };
