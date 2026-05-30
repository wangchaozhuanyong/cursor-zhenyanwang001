import { get, post } from "@/api/request";

export type UserSecurityPaginated<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type UserSecurityLoginAttempt = {
  id: string;
  user_id: string;
  login_method: string;
  ip?: string | null;
  device_id?: string | null;
  created_at?: string;
  phone?: string | null;
  nickname?: string | null;
  account_status?: string | null;
};

export type UserSecurityEvent = {
  id: string;
  user_id?: string | null;
  event_type: string;
  severity: string;
  title: string;
  description?: string;
  ip?: string | null;
  device_id?: string | null;
  user_agent?: string | null;
  metadata?: unknown;
  resolved_at?: string | null;
  created_at?: string;
  phone?: string | null;
  nickname?: string | null;
};

export type RiskIp = {
  id?: string;
  ip: string;
  risk_level: string;
  reason?: string;
  status: "blocked" | "watching" | "unblocked" | string;
  login_count?: number;
  event_count?: number;
  high_event_count?: number;
  failed_count?: number;
  related_user_count?: number;
  last_seen_at?: string | null;
  blocked_at?: string | null;
  unblocked_at?: string | null;
  updated_at?: string | null;
  source?: string;
};

export type RiskDevice = {
  id?: string;
  device_id: string;
  device_label?: string;
  risk_level: string;
  reason?: string;
  status: "blocked" | "watching" | "unblocked" | string;
  login_count?: number;
  event_count?: number;
  high_event_count?: number;
  related_user_count?: number;
  last_seen_at?: string | null;
  blocked_at?: string | null;
  unblocked_at?: string | null;
  updated_at?: string | null;
  source?: string;
};

export type UserSecurityOverview = {
  loginAttemptCount24h: number;
  uniqueLoginUsers24h: number;
  securityEventCount24h: number;
  highRiskEventCount24h: number;
  blockedIpCount: number;
  blockedDeviceCount: number;
  recentEvents: UserSecurityEvent[];
  topRiskIps: RiskIp[];
  topRiskDevices: RiskDevice[];
};

export type UserSecurityListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  severity?: string;
  ip?: string;
  deviceId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function fetchUserSecurityOverview() {
  return get<UserSecurityOverview>("/admin/user-security/overview");
}

export function fetchUserLoginAttempts(params?: UserSecurityListParams) {
  return get<UserSecurityPaginated<UserSecurityLoginAttempt>>("/admin/user-security/login-attempts", params as Record<string, unknown>);
}

export function fetchUserSecurityEvents(params?: UserSecurityListParams) {
  return get<UserSecurityPaginated<UserSecurityEvent>>("/admin/user-security/events", params as Record<string, unknown>);
}

export function fetchRiskIps(params?: UserSecurityListParams) {
  return get<UserSecurityPaginated<RiskIp>>("/admin/user-security/risk-ips", params as Record<string, unknown>);
}

export function blockRiskIp(ip: string, reason?: string) {
  return post<RiskIp>("/admin/user-security/risk-ips/block", { ip, reason });
}

export function unblockRiskIp(ip: string, reason?: string) {
  return post<RiskIp>("/admin/user-security/risk-ips/unblock", { ip, reason });
}

export function fetchRiskDevices(params?: UserSecurityListParams) {
  return get<UserSecurityPaginated<RiskDevice>>("/admin/user-security/risk-devices", params as Record<string, unknown>);
}

export function blockRiskDevice(deviceId: string, reason?: string, deviceLabel?: string) {
  return post<RiskDevice>("/admin/user-security/risk-devices/block", { deviceId, reason, deviceLabel });
}

export function unblockRiskDevice(deviceId: string, reason?: string) {
  return post<RiskDevice>("/admin/user-security/risk-devices/unblock", { deviceId, reason });
}
