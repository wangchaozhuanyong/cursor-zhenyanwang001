import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import {
  blockRiskDevice,
  blockRiskIp,
  fetchRiskDevices,
  fetchRiskIps,
  fetchUserLoginAttempts,
  fetchUserSecurityEvents,
  fetchUserSecurityOverview,
  unblockRiskDevice,
  unblockRiskIp,
  type RiskDevice,
  type RiskIp,
  type UserSecurityEvent,
  type UserSecurityLoginAttempt,
  type UserSecurityOverview,
} from "@/services/admin/userSecurityService";
import { Badge, formatTime } from "@/modules/admin/pages/monitoring/monitoringUi";

type TabKey = "ips" | "devices" | "login" | "events";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "ips", label: "风险 IP" },
  { key: "devices", label: "风险设备" },
  { key: "login", label: "登录记录" },
  { key: "events", label: "安全事件" },
];

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "blocked", label: "已封禁" },
  { value: "watching", label: "观察中" },
  { value: "unblocked", label: "已解封" },
];

const severityOptions = [
  { value: "", label: "全部等级" },
  { value: "high", label: "高风险" },
  { value: "medium", label: "中风险" },
  { value: "info", label: "普通" },
];

function shortId(value?: string | null, len = 12) {
  if (!value) return "-";
  return value.length > len ? `${value.slice(0, len)}...` : value;
}

function userLabel(row: { user_id?: string | null; phone?: string | null; nickname?: string | null }) {
  const label = row.nickname || row.phone || row.user_id || "-";
  if (!row.user_id) return label;
  return (
    <Link className="font-medium text-blue-600 hover:underline" to={`/admin/users/${row.user_id}`}>
      {label}
    </Link>
  );
}

function statusTone(status?: string | null) {
  if (status === "blocked") return "bg-red-100 text-red-700";
  if (status === "watching") return "bg-orange-100 text-orange-700";
  if (status === "unblocked") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function levelTone(level?: string | null) {
  if (level === "high") return "bg-red-600 text-white";
  if (level === "medium") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-600";
}

export default function AdminUserSecurity() {
  const [overview, setOverview] = useState<UserSecurityOverview | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("ips");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState("");

  const [riskIps, setRiskIps] = useState<RiskIp[]>([]);
  const [riskDevices, setRiskDevices] = useState<RiskDevice[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<UserSecurityLoginAttempt[]>([]);
  const [events, setEvents] = useState<UserSecurityEvent[]>([]);
  const [total, setTotal] = useState(0);

  const pageSize = 20;

  const metrics = useMemo(
    () => [
      ["24 小时登录记录", overview?.loginAttemptCount24h ?? 0],
      ["24 小时登录用户", overview?.uniqueLoginUsers24h ?? 0],
      ["24 小时安全事件", overview?.securityEventCount24h ?? 0],
      ["高风险事件", overview?.highRiskEventCount24h ?? 0],
      ["已封禁 IP", overview?.blockedIpCount ?? 0],
      ["已封禁设备", overview?.blockedDeviceCount ?? 0],
    ],
    [overview],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const overviewRes = await fetchUserSecurityOverview();
      setOverview(overviewRes.data);

      const baseParams = { page, pageSize, keyword: keyword.trim() || undefined };
      if (activeTab === "ips") {
        const res = await fetchRiskIps({ ...baseParams, status: status || undefined });
        setRiskIps(res.data.list);
        setTotal(res.data.total);
      } else if (activeTab === "devices") {
        const res = await fetchRiskDevices({ ...baseParams, status: status || undefined });
        setRiskDevices(res.data.list);
        setTotal(res.data.total);
      } else if (activeTab === "login") {
        const res = await fetchUserLoginAttempts(baseParams);
        setLoginAttempts(res.data.list);
        setTotal(res.data.total);
      } else {
        const res = await fetchUserSecurityEvents({ ...baseParams, severity: severity || undefined });
        setEvents(res.data.list);
        setTotal(res.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, page, severity, status]);

  useEffect(() => {
    load();
  }, [load]);

  function changeTab(next: TabKey) {
    setActiveTab(next);
    setPage(1);
    setStatus("");
    setSeverity("");
  }

  async function handleIpAction(row: RiskIp) {
    const isBlocked = row.status === "blocked";
    const reason = window.prompt(isBlocked ? "请输入解封原因" : "请输入封禁原因", isBlocked ? "管理员确认解封" : "后台安全处理");
    if (reason === null) return;
    setActioning(`ip:${row.ip}`);
    try {
      if (isBlocked) await unblockRiskIp(row.ip, reason);
      else await blockRiskIp(row.ip, reason);
      await load();
    } finally {
      setActioning("");
    }
  }

  async function handleDeviceAction(row: RiskDevice) {
    const isBlocked = row.status === "blocked";
    const reason = window.prompt(isBlocked ? "请输入解封原因" : "请输入封禁原因", isBlocked ? "管理员确认解封" : "后台安全处理");
    if (reason === null) return;
    setActioning(`device:${row.device_id}`);
    try {
      if (isBlocked) await unblockRiskDevice(row.device_id, reason);
      else await blockRiskDevice(row.device_id, reason, row.device_label);
      await load();
    } finally {
      setActioning("");
    }
  }

  const filterBar = (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex w-max min-w-full gap-2 px-1 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeTab(tab.key)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold ${
                activeTab === tab.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-3">
        <input
          className="min-w-56 rounded border px-3 py-2 text-sm"
          value={keyword}
          onChange={(e) => {
            setPage(1);
            setKeyword(e.target.value);
          }}
          placeholder="搜索 IP、用户、设备、安全事件"
        />
        {(activeTab === "ips" || activeTab === "devices") && (
          <select
            className="rounded border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        )}
        {activeTab === "events" && (
          <select
            className="rounded border px-3 py-2 text-sm"
            value={severity}
            onChange={(e) => {
              setPage(1);
              setSeverity(e.target.value);
            }}
          >
            {severityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        )}
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => load()}>
          刷新
        </button>
      </div>
    </div>
  );

  return (
    <AdminPageShell
      hint={<Tx>这里可以查看用户登录记录、安全事件、风险 IP 和风险设备。封禁操作会在后端生效，不只是前端隐藏。</Tx>}
      filters={filterBar}
    >
      <div className="space-y-5">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeTab === "ips" && (
          <AdminNativeTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>IP</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>状态</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>等级</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>登录数</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>关联用户</th>
                <th className={adminThClassName(undefined, "left")}>原因</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>最近出现</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {riskIps.map((row) => (
                <tr key={row.ip} className="border-t">
                  <td className={adminTdClassName("font-mono text-slate-900", "left")}>{row.ip}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={row.status} tone={statusTone(row.status)} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={row.risk_level} tone={levelTone(row.risk_level)} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{row.login_count || row.failed_count || 0}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{row.related_user_count || 0}</td>
                  <td className={adminTdClassName("text-slate-600", "left")}>{row.reason || "-"}</td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`, "left")}>{formatTime(row.last_seen_at || row.updated_at)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                    <button className="text-blue-600 disabled:text-slate-400" disabled={actioning === `ip:${row.ip}`} onClick={() => handleIpAction(row)}>
                      {row.status === "blocked" ? "解封" : "封禁"}
                    </button>
                  </td>
                </tr>
              ))}
              {!riskIps.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={8}>{loading ? "加载中..." : "暂无风险 IP"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        {activeTab === "devices" && (
          <AdminNativeTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className={adminThClassName(undefined, "left")}>设备</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>状态</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>等级</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>登录数</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>关联用户</th>
                <th className={adminThClassName(undefined, "left")}>原因</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>最近出现</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {riskDevices.map((row) => (
                <tr key={row.device_id} className="border-t">
                  <td className={adminTdClassName("font-mono text-slate-900", "left")} title={row.device_id}>{row.device_label || shortId(row.device_id, 18)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={row.status} tone={statusTone(row.status)} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={row.risk_level} tone={levelTone(row.risk_level)} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{row.login_count || 0}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{row.related_user_count || 0}</td>
                  <td className={adminTdClassName("text-slate-600", "left")}>{row.reason || "-"}</td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`, "left")}>{formatTime(row.last_seen_at || row.updated_at)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                    <button className="text-blue-600 disabled:text-slate-400" disabled={actioning === `device:${row.device_id}`} onClick={() => handleDeviceAction(row)}>
                      {row.status === "blocked" ? "解封" : "封禁"}
                    </button>
                  </td>
                </tr>
              ))}
              {!riskDevices.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={8}>{loading ? "加载中..." : "暂无风险设备"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        {activeTab === "login" && (
          <AdminNativeTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className={adminThClassName(undefined, "left")}>用户</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>方式</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>IP</th>
                <th className={adminThClassName(undefined, "left")}>设备指纹</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>时间</th>
              </tr>
            </thead>
            <tbody>
              {loginAttempts.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className={adminTdClassName("text-slate-900", "left")}>{userLabel(row)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{row.login_method}</td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-mono`, "left")}>{row.ip || "-"}</td>
                  <td className={adminTdClassName("font-mono text-slate-600", "left")} title={row.device_id || undefined}>{shortId(row.device_id, 18)}</td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`, "left")}>{formatTime(row.created_at)}</td>
                </tr>
              ))}
              {!loginAttempts.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={5}>{loading ? "加载中..." : "暂无登录记录"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        {activeTab === "events" && (
          <AdminNativeTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>等级</th>
                <th className={adminThClassName(undefined, "left")}>事件</th>
                <th className={adminThClassName(undefined, "left")}>用户</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>IP</th>
                <th className={adminThClassName(undefined, "left")}>设备</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>时间</th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={row.severity} tone={levelTone(row.severity)} /></td>
                  <td className={adminTdClassName("text-slate-900", "left")}>
                    <div className="font-medium">{row.title || row.event_type}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.description || row.event_type}</div>
                  </td>
                  <td className={adminTdClassName("text-slate-600", "left")}>{userLabel(row)}</td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-mono`, "left")}>{row.ip || "-"}</td>
                  <td className={adminTdClassName("font-mono text-slate-600", "left")} title={row.device_id || undefined}>{shortId(row.device_id, 18)}</td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`, "left")}>{formatTime(row.created_at)}</td>
                </tr>
              ))}
              {!events.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={6}>{loading ? "加载中..." : "暂无安全事件"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>共 {total} 条</span>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
            <span className="px-2 py-1">{page}</span>
            <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>下一页</button>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
