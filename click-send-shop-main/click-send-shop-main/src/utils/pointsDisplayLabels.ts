import { labelPointsAction } from "@/utils/adminDisplayLabels";

/** 历史库中英文 description 精确映射 */
const POINTS_LEGACY_DESCRIPTION_LABELS: Record<string, string> = {
  "Daily sign-in points": "每日签到",
  "Order points earned": "订单积分发放",
  "Order points reversed": "订单积分回滚",
  "Admin points adjustment": "后台积分调整",
  "Points are awarded after paid orders based on current rules.": "订单支付完成后，将按后台当前积分规则发放积分。",
};

/** 历史英文 description 模式 → 中文 */
const POINTS_LEGACY_DESCRIPTION_PATTERNS: Array<{ test: RegExp; format: (match: RegExpMatchArray) => string }> = [
  {
    test: /^Rollback points for unpaid timeout order\s+(.+)$/i,
    format: (m) => `未支付超时订单积分回滚（${m[1]}）`,
  },
  {
    test: /^Order status changed to (.+), rewards reversed$/i,
    format: (m) => `订单状态变更为 ${m[1]}，奖励已回滚`,
  },
];

function translateLegacyDescription(text: string): string | null {
  const exact = POINTS_LEGACY_DESCRIPTION_LABELS[text];
  if (exact) return exact;
  for (const { test, format } of POINTS_LEGACY_DESCRIPTION_PATTERNS) {
    const match = text.match(test);
    if (match) return format(match);
  }
  return null;
}

function looksChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function looksEnglishSentence(text: string): boolean {
  return /^[A-Za-z][A-Za-z0-9\s,.'\-:;()]+$/.test(text);
}

/** 积分流水/说明展示文案（客户端与后台共用） */
export function formatPointsRecordLabel(input: {
  action?: string | null;
  description?: string | null;
}): string {
  const action = String(input.action || "").trim();
  const desc = String(input.description || "").trim();

  if (desc) {
    const legacy = translateLegacyDescription(desc);
    if (legacy) return legacy;
    if (looksChinese(desc)) return desc;
    if (looksEnglishSentence(desc)) {
      const byAction = action ? labelPointsAction(action) : "";
      if (byAction && byAction !== "其他变动") return byAction;
    }
    return desc;
  }

  if (action) return labelPointsAction(action);
  return "";
}

/** 积分配置提示等短文案 */
export function normalizePointsHintText(value?: string | null, fallback = ""): string {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return translateLegacyDescription(text) || (looksChinese(text) ? text : fallback || text);
}
