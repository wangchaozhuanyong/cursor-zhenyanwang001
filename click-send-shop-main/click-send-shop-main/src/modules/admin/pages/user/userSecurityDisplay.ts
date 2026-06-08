import {
  formatAdminEventSubtitle,
  formatAdminEventTitle,
  labelAdminEventSeverity,
} from "@/utils/adminEventLabels";

const RISK_STATUS_LABELS: Record<string, string> = {
  blocked: "已封禁",
  watching: "观察中",
  unblocked: "已解封",
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  critical: "紧急风险",
  P0: "紧急风险",
  high: "高风险",
  P1: "高风险",
  medium: "中风险",
  P2: "中风险",
  low: "低风险",
  P3: "低风险",
  info: "普通记录",
  INFO: "普通记录",
};

const LOGIN_METHOD_LABELS: Record<string, string> = {
  phone_password: "手机号密码登录",
  phone_sms: "短信验证码登录",
  wechat_open: "微信登录",
  passkey: "Passkey 登录",
  admin_password: "后台密码登录",
  admin_passkey: "后台 Passkey 登录",
};

const USER_SECURITY_EVENT_LABELS: Record<string, string> = {
  login_blocked_by_ip: "登录被风险 IP 拦截",
  login_blocked_by_device: "登录被风险设备拦截",
  risk_ip_blocked: "封禁风险 IP",
  risk_ip_unblocked: "解封风险 IP",
  risk_device_blocked: "封禁风险设备",
  risk_device_unblocked: "解封风险设备",
  user_sessions_revoked: "撤销用户登录状态",
  user_unprotected: "解除用户保护",
};

type RiskSignalRow = {
  source?: string | null;
  login_count?: number | null;
  event_count?: number | null;
  failed_count?: number | null;
};

type IpLocation = {
  label?: string | null;
  country?: string | null;
  country_code?: string | null;
  region?: string | null;
  city?: string | null;
};

export function humanizeCode(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  return raw
    .replace(/^UA-/i, "设备指纹 ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function shortSecurityId(value?: string | null, len = 12): string {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  return raw.length > len ? `${raw.slice(0, len)}...` : raw;
}

export function formatRiskStatusLabel(status?: string | null): string {
  const raw = String(status || "").trim();
  return RISK_STATUS_LABELS[raw] || humanizeCode(raw);
}

export function formatRiskLevelLabel(level?: string | null): string {
  const raw = String(level || "").trim();
  const eventSeverity = labelAdminEventSeverity(raw);
  return RISK_LEVEL_LABELS[raw] || (eventSeverity !== raw ? eventSeverity : humanizeCode(raw));
}

export function formatLoginMethodLabel(method?: string | null): string {
  const raw = String(method || "").trim();
  return LOGIN_METHOD_LABELS[raw] || humanizeCode(raw);
}

export function formatDeviceLabel(deviceId?: string | null, deviceLabel?: string | null): string {
  const label = String(deviceLabel || "").trim();
  const id = String(deviceId || "").trim();
  if (label && !/^UA-/i.test(label) && label !== id) return label;
  if (!id && !label) return "-";
  const raw = id || label.replace(/^UA-/i, "");
  return `设备指纹 ${shortSecurityId(raw, 18)}`;
}

export function formatIpLocationLabel(location?: IpLocation | null): string {
  if (!location) return "归属地未知";
  const label = String(location.label || "").trim();
  if (label) return label;
  const parts = [location.country, location.region, location.city]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
  return parts.length ? parts.join(" / ") : "归属地未知";
}

export function formatIpAddressLabel(ip?: string | null): string {
  let raw = String(ip || "").trim();
  if (!raw) return "-";
  if (raw.startsWith("[") && raw.endsWith("]")) raw = raw.slice(1, -1);
  const zoneIndex = raw.indexOf("%");
  if (zoneIndex > -1) raw = raw.slice(0, zoneIndex);
  if (raw.toLowerCase().startsWith("::ffff:")) raw = raw.slice(7);

  if (raw === "0:0:0:0:0:0:0:1") return "::1";
  if (!raw.includes(":") || raw.length <= 28) return raw;

  const parts = raw.split(":").filter(Boolean);
  if (parts.length < 5) return raw;
  return `${parts.slice(0, 2).join(":")}:...:${parts.slice(-2).join(":")}`;
}

export function formatRiskSourceLabel(source?: string | null): string {
  const raw = String(source || "").trim();
  if (raw === "manual") return "管理员添加";
  if (raw === "event") return "安全事件触发";
  if (raw === "signal") return "登录行为触发";
  return raw ? humanizeCode(raw) : "系统观察";
}

export function formatRiskSignalSummary(row: RiskSignalRow): string {
  const parts: string[] = [];
  const loginCount = Number(row.login_count || 0);
  const eventCount = Number(row.event_count || 0);
  const failedCount = Number(row.failed_count || 0);

  if (loginCount > 0) parts.push(`登录 ${loginCount} 次`);
  if (eventCount > 0) parts.push(`安全事件 ${eventCount} 次`);
  if (!loginCount && !eventCount && failedCount > 0) parts.push(`失败登录 ${failedCount} 次`);
  return parts.length ? parts.join(" / ") : "手动记录";
}

export function formatUserSecurityEventTitle(title?: string | null, eventType?: string | null): string {
  const type = String(eventType || "").trim();
  if (type && USER_SECURITY_EVENT_LABELS[type]) return USER_SECURITY_EVENT_LABELS[type];
  return formatAdminEventTitle(title, eventType, "security");
}

export function formatUserSecurityEventDescription(
  description?: string | null,
  eventType?: string | null,
  title?: string | null,
): string {
  const raw = String(description || "").trim();
  if (raw) return humanizeCode(formatAdminEventSubtitle(raw, eventType, "security", title));
  return formatUserSecurityEventTitle(title, eventType);
}
