/** 支付管理后台：渠道、状态、事件等英文枚举 → 中文展示 */

export const PAYMENT_CHANNEL_CODE_LABELS: Record<string, string> = {
  stripe_checkout: "Stripe 在线结账",
  manual_bank: "银行转账 / 线下确认",
  reward_wallet: "返现钱包",
  fpx: "FPX 网上银行",
  tng_ewallet: "Touch 'n Go 电子钱包",
  grabpay: "GrabPay",
  boost: "Boost 钱包",
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe 网关",
  manual: "线下人工",
  internal: "内部记账",
  malaysia_local: "马来西亚本地支付",
};

export const COUNTRY_LABELS: Record<string, string> = {
  MY: "马来西亚",
  CN: "中国",
  SG: "新加坡",
};

export const CURRENCY_LABELS: Record<string, string> = {
  MYR: "林吉特",
  CNY: "人民币",
  USD: "美元",
};

export const PAYMENT_ENVIRONMENT_LABELS: Record<string, string> = {
  live: "生产环境",
  sandbox: "沙箱环境",
};

export const PAYMENT_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  paid: "已支付",
  failed: "支付失败",
  cancelled: "已取消",
  refunded: "已退款",
};

export const PAYMENT_EVENT_TYPE_LABELS: Record<string, string> = {
  payment_success: "支付成功",
  "payment_intent.succeeded": "Stripe 支付意图成功",
  admin_mark_paid: "后台补记已支付",
  reward_wallet_paid: "返现钱包扣款",
  manual_webhook_received: "手动 Webhook 记录",
  "refund.provider_recorded": "渠道退款记录",
  "refund.manual_recorded": "人工退款记录",
};

export const PAYMENT_VERIFY_STATUS_LABELS: Record<string, string> = {
  pending: "待验签",
  success: "验签通过",
  failed: "验签失败",
  manual: "人工确认",
};

export const PAYMENT_PROCESSING_RESULT_LABELS: Record<string, string> = {
  pending: "待处理",
  success: "处理成功",
  failed: "处理失败",
  rejected: "已拒绝",
  logged: "已记录",
  refunded: "已全额退款",
  partially_refunded: "部分退款",
};

export const PAYMENT_RECONCILIATION_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  confirmed: "已确认",
  closed: "已关闭",
};

export const CHECKOUT_MODE_LABELS: Record<string, string> = {
  session: "Stripe 托管结账页",
  payment_intent: "支付意图模式",
};

export const PAYMENT_CONFIG_KEY_LABELS: Record<string, string> = {
  checkoutMode: "结账模式",
  fee_rate_percent: "手续费率",
  fee_fixed: "固定手续费",
  method: "支付方式",
  wallet: "电子钱包",
  gateway_url_template: "网关地址模板",
};

const MALAYSIA_LOCAL_EVENT_PREFIX = "malaysia_local.";

export function labelChannelCode(code: string, fallbackName?: string): string {
  if (!code) return "—";
  return PAYMENT_CHANNEL_CODE_LABELS[code] || fallbackName || "其他渠道";
}

export function labelProvider(provider: string): string {
  if (!provider) return "—";
  return PAYMENT_PROVIDER_LABELS[provider] || "其他网关";
}

export function labelCountry(code: string): string {
  if (!code) return "—";
  return COUNTRY_LABELS[code] || code;
}

export function labelCurrency(currency: string, opts?: { short?: boolean }): string {
  if (!currency) return "—";
  const name = CURRENCY_LABELS[currency];
  if (!name) return currency;
  return opts?.short ? `${name}（${currency}）` : `${name}（${currency}）`;
}

export function labelPaymentEnvironment(env: string): string {
  return PAYMENT_ENVIRONMENT_LABELS[env] || env;
}

export function labelPaymentOrderStatus(status: string): string {
  return PAYMENT_ORDER_STATUS_LABELS[status] || "未知状态";
}

export function labelPaymentEventType(eventType: string): string {
  if (!eventType) return "—";
  if (PAYMENT_EVENT_TYPE_LABELS[eventType]) return PAYMENT_EVENT_TYPE_LABELS[eventType];
  if (eventType.startsWith(MALAYSIA_LOCAL_EVENT_PREFIX)) {
    const status = eventType.slice(MALAYSIA_LOCAL_EVENT_PREFIX.length);
    return `本地支付 · ${labelPaymentOrderStatus(status)}`;
  }
  return "未映射事件";
}

export function labelVerifyStatus(status: string): string {
  return PAYMENT_VERIFY_STATUS_LABELS[status] || status;
}

export function labelProcessingResult(result: string): string {
  return PAYMENT_PROCESSING_RESULT_LABELS[result] || result;
}

export function labelReconciliationStatus(status: string): string {
  return PAYMENT_RECONCILIATION_STATUS_LABELS[status] || status;
}

export function formatChannelSubtitle(row: {
  code: string;
  provider: string;
  country_code: string;
  currency: string;
  name?: string;
}): string {
  return [
    labelChannelCode(row.code, row.name),
    labelProvider(row.provider),
    `${labelCountry(row.country_code)} · ${labelCurrency(row.currency, { short: true })}`,
  ].join(" · ");
}

export function formatPaymentConfigValue(key: string, value: unknown): string {
  if (key === "checkoutMode" && typeof value === "string") {
    return CHECKOUT_MODE_LABELS[value] || value;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value == null) return "—";
  return JSON.stringify(value);
}

export function formatPaymentConfigSummary(config: Record<string, unknown>): string {
  const entries = Object.entries(config).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "暂无扩展配置";
  return entries
    .map(([k, v]) => {
      const keyLabel = PAYMENT_CONFIG_KEY_LABELS[k] || k;
      return `${keyLabel}：${formatPaymentConfigValue(k, v)}`;
    })
    .join("；");
}

export const PAYMENT_PROVIDER_FILTER_OPTIONS = [
  { value: "", label: "全部网关" },
  { value: "stripe", label: "Stripe 网关" },
  { value: "manual", label: "线下人工" },
  { value: "internal", label: "内部记账" },
  { value: "malaysia_local", label: "马来西亚本地支付" },
] as const;

export const PAYMENT_CHANNEL_FILTER_OPTIONS = [
  { value: "", label: "不限渠道" },
  ...Object.entries(PAYMENT_CHANNEL_CODE_LABELS).map(([value, label]) => ({ value, label })),
] as const;
