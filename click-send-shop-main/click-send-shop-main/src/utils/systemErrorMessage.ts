import { translateApiErrorMessage } from "@/utils/apiErrorMessage";

const SYSTEM_ERROR_PATTERNS: Array<{ test: RegExp; message: string }> = [
  {
    test: /Illegal mix of collations/i,
    message: "数据库表字符集排序规则不一致，监控/对账 SQL 无法执行。请联系技术人员执行数据库迁移 109 统一校对规则。",
  },
  {
    test: /ECONNREFUSED|connect ECONNREFUSED/i,
    message: "无法连接数据库，请确认数据库服务已启动。",
  },
  {
    test: /ETIMEDOUT|timeout expired/i,
    message: "数据库或接口响应超时，请稍后重试。",
  },
  {
    test: /ER_NO_SUCH_TABLE|doesn't exist/i,
    message: "缺少所需数据表，请先执行数据库迁移。",
  },
  {
    test: /ER_BAD_FIELD_ERROR|Unknown column/i,
    message: "数据库字段与程序版本不匹配，请执行迁移后重试。",
  },
  {
    test: /Unknown monitoring rule:/i,
    message: "未知监控规则，请检查规则是否已写入数据库。",
  },
];

/** 后台运行记录、清理任务、审计等处的原始 error_message 转中文展示 */
export function formatSystemErrorMessage(msg?: string | null, fallback = "-"): string {
  const raw = String(msg ?? "").trim();
  if (!raw) return fallback;
  const fromApi = translateApiErrorMessage(raw);
  if (fromApi) return fromApi;
  for (const { test, message } of SYSTEM_ERROR_PATTERNS) {
    if (test.test(raw)) return message;
  }
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  if (raw.length > 200) return `${raw.slice(0, 200)}…`;
  return `系统错误：${raw}`;
}
