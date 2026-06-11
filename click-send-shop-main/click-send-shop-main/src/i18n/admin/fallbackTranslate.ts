/**
 * Runtime fallback when adminZhToEn has no entry (or entry still contains CJK).
 * Mirrors scripts/admin_translate_engine.py word composition (subset).
 */
const WORDS: Record<string, string> = {
  审计: "Audit",
  日志: "logs",
  创建: "Create",
  更新: "Update",
  删除: "Delete",
  分类: "category",
  商品: "product",
  优惠券: "coupon",
  活动: "campaign",
  文件: "file",
  上传: "upload",
  订单: "order",
  用户: "user",
  管理员: "administrator",
  登录: "sign-in",
  退出: "sign-out",
  状态: "status",
  库存: "inventory",
  支付: "payment",
  退款: "refund",
  发货: "ship",
  评价: "review",
  通知: "notification",
  设置: "settings",
  权限: "permissions",
  角色: "role",
  反馈: "feedback",
  经营: "operating",
  支出: "expense",
  智能: "smart",
  补货: "replenishment",
  配置: "configuration",
  预览: "preview",
  建议: "suggestion",
  采购: "purchase",
  每日: "daily",
  快照: "snapshot",
  积分: "points",
  过期: "expire",
  扣减: "deduct",
  组装: "assemble",
  拆包: "unpack",
  规则: "rule",
  尾号: "tail ID",
  成功: "success",
  失败: "failure",
  对象: "object",
  动作: "action",
  摘要: "summary",
  结果: "result",
  开始: "Start",
  结束: "End",
  关键词: "Keyword",
  操作: "operation",
  查询: "Query",
  提交: "Submit",
  列表: "List",
  项: "items",
  个字段: "fields",
  是: "Yes",
  否: "No",
  无: "none",
  已: "",
  未: "Not",
};

const PHRASES: Record<string, string> = {
  "：": ": ",
};

function hasCjk(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}

function composeFromWords(zh: string): string | null {
  const parts: string[] = [];
  let i = 0;
  while (i < zh.length) {
    let matched = false;
    for (let len = Math.min(8, zh.length - i); len > 0; len -= 1) {
      const chunk = zh.slice(i, i + len);
      if (chunk in WORDS) {
        const w = WORDS[chunk];
        if (w) parts.push(w);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  if (!parts.length) return null;
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function fallbackTranslateAdminZh(zh: string): string {
  const raw = zh.trim();
  if (!raw || !hasCjk(raw)) return raw;
  if (raw in PHRASES) return PHRASES[raw];
  const composed = composeFromWords(raw);
  if (composed && !hasCjk(composed)) return composed;
  return raw;
}
