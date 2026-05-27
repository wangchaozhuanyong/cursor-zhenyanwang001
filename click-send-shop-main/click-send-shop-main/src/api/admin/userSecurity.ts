import { get, post } from "@/api/request";

export interface ClientSecurityOverview {
  failed24h: number;
  events24h: number;
  protectedUsers: number;
  activeSessions: number;
}

export interface LoginAttempt {
  id: string;
  login_identifier: string;
  success: number;
  failure_reason?: string | null;
  risk_score: number;
  ip?: string | null;
  device_id?: string | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id?: string | null;
  event_type: string;
  severity: string;
  title: string;
  description?: string | null;
  ip?: string | null;
  device_id?: string | null;
  created_at: string;
}

export function getOverview() {
  return get<ClientSecurityOverview>("/admin/user-security/overview");
}

export function getLoginAttempts() {
  return get<{ list: LoginAttempt[] }>("/admin/user-security/login-attempts");
}

export function getSecurityEvents() {
  return get<{ list: SecurityEvent[] }>("/admin/user-security/events");
}

export function getRiskIps() {
  return get<{ list: Array<{ ip: string; reason?: string; blocked_until?: string | null }> }>("/admin/user-security/risk-ips");
}

export function blockRiskIp(ip: string, reason?: string) {
  return post<void>("/admin/user-security/risk-ips/block", { ip, reason });
}

export function unblockRiskIp(ip: string) {
  return post<void>("/admin/user-security/risk-ips/unblock", { ip });
}

export function getRiskDevices() {
  return get<{ list: Array<{ device_id: string; reason?: string; blocked_until?: string | null }> }>("/admin/user-security/risk-devices");
}

export function blockRiskDevice(deviceId: string, reason?: string) {
  return post<void>("/admin/user-security/risk-devices/block", { deviceId, reason });
}

export function unblockRiskDevice(deviceId: string) {
  return post<void>("/admin/user-security/risk-devices/unblock", { deviceId });
}

export function revokeUserSessions(userId: string) {
  return post<void>(`/admin/user-security/users/${userId}/revoke-sessions`);
}

export function unprotectUser(userId: string) {
  return post<void>(`/admin/user-security/users/${userId}/unprotect`);
}
