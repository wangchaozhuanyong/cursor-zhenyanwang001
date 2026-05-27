import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { adminTdClassName, adminThClassName, ADMIN_TABLE_NOWRAP_CLASS } from "@/utils/adminTableClasses";
import * as api from "@/api/admin/userSecurity";

function fmt(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

export default function AdminUserSecurity() {
  const [overview, setOverview] = useState<api.ClientSecurityOverview | null>(null);
  const [attempts, setAttempts] = useState<api.LoginAttempt[]>([]);
  const [events, setEvents] = useState<api.SecurityEvent[]>([]);
  const [ips, setIps] = useState<Array<{ ip: string; reason?: string; blocked_until?: string | null }>>([]);
  const [devices, setDevices] = useState<Array<{ device_id: string; reason?: string; blocked_until?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const metrics = useMemo(() => [
    ["24 小时失败登录", overview?.failed24h ?? 0],
    ["24 小时安全事件", overview?.events24h ?? 0],
    ["保护中账号", overview?.protectedUsers ?? 0],
    ["活跃会话", overview?.activeSessions ?? 0],
  ], [overview]);

  const load = async () => {
    setLoading(true);
    try {
      const [overviewRes, attemptsRes, eventsRes, ipsRes, devicesRes] = await Promise.all([
        api.getOverview(),
        api.getLoginAttempts(),
        api.getSecurityEvents(),
        api.getRiskIps(),
        api.getRiskDevices(),
      ]);
      setOverview(overviewRes.data);
      setAttempts(attemptsRes.data.list || []);
      setEvents(eventsRes.data.list || []);
      setIps(ipsRes.data.list || []);
      setDevices(devicesRes.data.list || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载用户安全中心失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminPageShell hint="查看客户端账号登录、风控事件、风险 IP/设备和会话安全状态。">
      {loading ? <div className="text-sm text-slate-500">加载中...</div> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
              </div>
            ))}
          </div>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-base font-semibold text-slate-900">登录失败和高风险尝试</h2>
            <AdminNativeTable stickyFirstColumn={false}>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className={adminThClassName(undefined, "left")}>账号</th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>结果</th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>风险分</th>
                  <th className={adminThClassName(undefined, "left")}>IP</th>
                  <th className={adminThClassName(undefined, "left")}>设备</th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>时间</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className={adminTdClassName("font-medium", "left")}>{item.login_identifier}</td>
                    <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>{item.success ? "成功" : item.failure_reason || "失败"}</td>
                    <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>{item.risk_score}</td>
                    <td className={adminTdClassName(undefined, "left")}>{item.ip || "-"}</td>
                    <td className={adminTdClassName("max-w-[220px] truncate", "left")}>{item.device_id || "-"}</td>
                    <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{fmt(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminNativeTable>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-base font-semibold text-slate-900">用户安全事件</h2>
              <div className="space-y-2">
                {events.slice(0, 20).map((item) => (
                  <div key={item.id} className="rounded bg-slate-50 px-3 py-2 text-sm">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.event_type} · {item.severity} · {fmt(item.created_at)}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.ip || "-"} / {item.device_id || "-"}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-base font-semibold text-slate-900">风险 IP / 设备</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-1 font-medium">风险 IP</div>
                  {ips.map((item) => <div key={item.ip} className="rounded bg-slate-50 px-3 py-2">{item.ip} · {item.reason || "blocked"}</div>)}
                  {!ips.length ? <div className="text-slate-500">暂无风险 IP</div> : null}
                </div>
                <div>
                  <div className="mb-1 font-medium">风险设备</div>
                  {devices.map((item) => <div key={item.device_id} className="rounded bg-slate-50 px-3 py-2">{item.device_id} · {item.reason || "blocked"}</div>)}
                  {!devices.length ? <div className="text-slate-500">暂无风险设备</div> : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
