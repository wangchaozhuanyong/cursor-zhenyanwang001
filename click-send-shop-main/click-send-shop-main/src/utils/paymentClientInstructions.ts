/** 服务端默认英文指引，不在前台展示 */
const HIDDEN_INSTRUCTION_PATTERNS = [
  /^Please transfer according/i,
  /^Please complete payment/i,
];

/** 仅展示含中文的支付指引，避免英文块占用界面 */
export function sanitizeClientInstructions(raw?: string | null): string | null {
  const text = (raw || "").trim();
  if (!text) return null;
  if (HIDDEN_INSTRUCTION_PATTERNS.some((re) => re.test(text))) return null;
  if (!/[\u4e00-\u9fff]/.test(text)) return null;
  return text;
}

export function paymentInstructionToastMessage(raw?: string | null): string {
  return (
    sanitizeClientInstructions(raw) ||
    "支付单已创建，请按页面指引完成付款"
  );
}
