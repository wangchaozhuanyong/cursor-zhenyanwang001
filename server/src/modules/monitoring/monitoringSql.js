/** 与迁移/bootstrap 一致的校对规则，避免 utf8mb4_0900_ai_ci 与 utf8mb4_unicode_ci 混用导致 JOIN 失败 */
const COLLATE = 'utf8mb4_unicode_ci';

function collate(column) {
  return `${column} COLLATE ${COLLATE}`;
}

/** 用于 JOIN / WHERE 字符串等值比较 */
function eq(left, right) {
  return `${collate(left)} = ${collate(right)}`;
}

module.exports = { COLLATE, collate, eq };
