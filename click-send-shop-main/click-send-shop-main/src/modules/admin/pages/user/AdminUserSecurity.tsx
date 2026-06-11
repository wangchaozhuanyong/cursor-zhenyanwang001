import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminTableMoreCell } from "@/components/admin/AdminTableCell";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
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
import { AdminInputSheet } from "@/modules/admin/components/AdminInputSheet";
import { toastErrorMessage } from "@/utils/errorMessage";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import {
  formatDeviceLabel,
  formatIpAddressLabel,
  formatIpLocationLabel,
  formatLoginMethodLabel,
  formatRiskLevelLabel,
  formatRiskSignalSummary,
  formatRiskSourceLabel,
  formatRiskStatusLabel,
  formatUserSecurityEventDescription,
  formatUserSecurityEventTitle,
} from "./userSecurityDisplay";

type TabKey = "ips" | "devices" | "login" | "events";
type SecurityActionTarget =
  | { type: "ip"; row: RiskIp }
  | { type: "device"; row: RiskDevice };

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

function userLabel(row: { user_id?: string | null; phone?: string | null; nickname?: string | null }) {
  const label = row.nickname || row.phone || row.user_id || "-";
  if (!row.user_id) return label;
  return (
    <Link className="font-medium text-[var(--theme-primary)] hover:underline" to={`/admin/users/${row.user_id}`}>
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
  if (level === "critical" || level === "P0" || level === "high" || level === "P1") return "bg-red-600 text-white";
  if (level === "medium" || level === "P2") return "bg-orange-100 text-orange-700";
  if (level === "low" || level === "P3") return "bg-blue-100 text-blue-700";
  if (level === "info" || level === "INFO") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}

function IpCell({ ip, location }: { ip?: string | null; location?: RiskIp["ip_location"] }) {
  if (!ip) return <span className="text-muted-foreground">-</span>;
  const locationLabel = formatIpLocationLabel(location);
  const ipLabel = formatIpAddressLabel(ip);
  const display = `${ipLabel} · ${locationLabel}`;
  const detail = [
    `IP：${ipLabel}`,
    `国家：${location?.country || location?.country_code || "未知"}`,
    `地区：${location?.region || "未知"}`,
    `城市：${location?.city || "未知"}`,
    location?.timezone ? `时区：${location.timezone}` : "",
    location?.source ? `来源：${location.source}` : "",
  ].filter(Boolean).join("\n");
  return (
    <AdminTableMoreCell
      value={display}
      fullText={detail}
      modalTitle="IP 完整信息"
      maxWidth="16rem"
      maxChars={24}
      mono
    />
  );
}

function shortUserId(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  return raw.length > 10 ? `${raw.slice(0, 10)}...` : raw;
}

function relatedUserTitle(user: NonNullable<RiskIp["related_users"]>[number]) {
  const name = user.nickname || user.phone || shortUserId(user.user_id);
  const meta = [user.phone && user.nickname ? user.phone : "", user.account_status].filter(Boolean).join(" · ");
  return { name, meta };
}

function RelatedUsersCell({
  count,
  users,
}: {
  count?: number | null;
  users?: RiskIp["related_users"] | RiskDevice["related_users"];
}) {
  const total = Number(count || 0);
  const list = Array.isArray(users) ? users.filter((user) => user?.user_id).slice(0, 3) : [];
  if (!total && !list.length) return <span className="text-muted-foreground">-</span>;
  const fullList = Array.isArray(users) ? users.filter((user) => user?.user_id) : [];
  const summary = list
    .map((user) => relatedUserTitle(user).name)
    .filter(Boolean)
    .join("、") || `${total} 人`;
  const display = total > list.length ? `${summary} 等 ${total} 人` : summary;
  const fullText = fullList.length
    ? fullList.map((user, index) => {
        const item = relatedUserTitle(user);
        return `${index + 1}. ${item.name}${item.meta ? ` · ${item.meta}` : ""}`;
      }).join("\n")
    : `${total} 人，暂无用户明细`;

  return (
    <AdminTableMoreCell
      value={display}
      fullText={fullText}
      modalTitle="涉及用户"
      maxWidth="13rem"
      maxChars={12}
    />
  );
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
  const [actionTarget, setActionTarget] = useState<SecurityActionTarget | null>(null);

  const [riskIps, setRiskIps] = useState<RiskIp[]>([]);
  const [riskDevices, setRiskDevices] = useState<RiskDevice[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<UserSecurityLoginAttempt[]>([]);
  const [events, setEvents] = useState<UserSecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const loadedListKeysRef = useRef(new Set<string>());

  const pageSize = 20;
  const listKey = useMemo(
    () => [activeTab, page, keyword.trim(), status, severity].join("|"),
    [activeTab, keyword, page, severity, status],
  );

  const loadOverview = useCallback(async () => {
    try {
      const overviewRes = await fetchUserSecurityOverview();
      setOverview(overviewRes.data);
    } catch (err) {
      setError("安全概览加载失败，请检查网络或稍后重试。");
      toast.error(toastErrorMessage(err, "安全概览加载失败"));
    }
  }, []);

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

  const load = useCallback(async (options?: { forceLoading?: boolean }) => {
    const shouldShowLoading = options?.forceLoading || !loadedListKeysRef.current.has(listKey);
    setLoading(shouldShowLoading);
    setError("");
    try {
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
      loadedListKeysRef.current.add(listKey);
    } catch (err) {
      setError("安全数据加载失败，请检查网络或稍后重试。");
      toast.error(toastErrorMessage(err, "安全数据加载失败"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, listKey, page, severity, status]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeTab(next: TabKey) {
    setActiveTab(next);
    setPage(1);
    setStatus("");
    setSeverity("");
  }

  async function submitSecurityAction(reason: string) {
    if (!actionTarget) return;
    const isBlocked = actionTarget.row.status === "blocked";
    const actionKey = actionTarget.type === "ip" ? `ip:${actionTarget.row.ip}` : `device:${actionTarget.row.device_id}`;
    setActioning(actionKey);
    try {
      if (actionTarget.type === "ip") {
        if (isBlocked) await unblockRiskIp(actionTarget.row.ip, reason);
        else await blockRiskIp(actionTarget.row.ip, reason);
      } else {
        if (isBlocked) await unblockRiskDevice(actionTarget.row.device_id, reason);
        else await blockRiskDevice(actionTarget.row.device_id, reason, actionTarget.row.device_label);
      }
      setActionTarget(null);
      await Promise.all([load({ forceLoading: true }), loadOverview()]);
      toast.success(actionTarget.type === "ip"
        ? (isBlocked ? "IP 已解封" : "IP 已封禁")
        : (isBlocked ? "设备已解封" : "设备已封禁"));
    } catch (err) {
      toast.error(toastErrorMessage(err, isBlocked ? "解封失败" : "封禁失败"));
      throw err;
    } finally {
      setActioning("");
    }
  }

  const actionIsUnblock = actionTarget?.row.status === "blocked";
  const actionObjectLabel = actionTarget?.type === "ip" ? "IP" : "设备";

  const filterBar = (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex w-max min-w-full gap-2 px-1 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => (
            <UnifiedButton
              key={tab.key}
              type="button"
              onClick={() => changeTab(tab.key)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold ${
                activeTab === tab.key
                  ? "border-[var(--theme-price)] btn-theme-price"
                  : "border-[var(--theme-border)] bg-[var(--theme-card)] text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </UnifiedButton>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] p-3">
        <input
          className="min-h-10 min-w-56 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--theme-price)]"
          value={keyword}
          onChange={(e) => {
            setPage(1);
            setKeyword(e.target.value);
          }}
          placeholder="搜索 IP、用户、设备、安全事件"
        />
        {(activeTab === "ips" || activeTab === "devices") && (
          <select
            className="min-h-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--theme-price)]"
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
            className="min-h-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--theme-price)]"
            value={severity}
            onChange={(e) => {
              setPage(1);
              setSeverity(e.target.value);
            }}
          >
            {severityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        )}
        <UnifiedButton className="min-h-10 rounded-lg px-4 py-2 text-sm font-semibold btn-theme-price" onClick={() => load({ forceLoading: true })}>
          刷新
        </UnifiedButton>
      </div>
    </div>
  );

  return (
    <PermissionGate anyOf={["user.view", "event.view", "event.manage"]} mode="page">
      <AdminPageShell
        hint={<Tx>这里可以查看用户登录记录、安全事件、风险 IP 和风险设备。封禁操作会在后端生效，不只是前端隐藏。</Tx>}
        filters={filterBar}
      >
      <div className="space-y-5">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <UnifiedButton
              type="button"
              onClick={() => { void load({ forceLoading: true }); }}
              className="rounded-lg border border-destructive/30 bg-[var(--theme-card)] px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              重试
            </UnifiedButton>
          </div>
        )}

        {activeTab === "ips" && (
          <AdminNativeTable>
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>IP</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>处理状态</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>风险等级</th>
                <th className={adminThClassName(undefined, "left")}>触发来源</th>
                <th className={adminThClassName(undefined, "left")}>涉及用户</th>
                <th className={adminThClassName(undefined, "left")}>风险原因</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>最近记录</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {riskIps.map((row) => (
                <tr key={row.ip} className="border-t border-[var(--theme-border)]">
                  <td className={adminTdClassName("text-foreground", "left")}><IpCell ip={row.ip} location={row.ip_location} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={formatRiskStatusLabel(row.status)} tone={statusTone(row.status)} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={formatRiskLevelLabel(row.risk_level)} tone={levelTone(row.risk_level)} /></td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>
                    <AdminTableMoreCell
                      value={`${formatRiskSourceLabel(row.source)} · ${formatRiskSignalSummary(row)}`}
                      fullText={`触发来源：${formatRiskSourceLabel(row.source)}\n风险信号：${formatRiskSignalSummary(row)}`}
                      modalTitle="触发来源"
                      maxWidth="13rem"
                      maxChars={16}
                      muted
                    />
                  </td>
                  <td className={adminTdClassName(undefined, "left")}><RelatedUsersCell count={row.related_user_count} users={row.related_users} /></td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>
                    <AdminTableMoreCell value={row.reason || "-"} fullText={row.reason || ""} modalTitle="风险原因" maxWidth="12rem" maxChars={12} muted />
                  </td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`, "left")}>{formatTime(row.last_seen_at || row.updated_at)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                    <UnifiedButton className="text-[var(--theme-primary)] disabled:text-muted-foreground" disabled={actioning === `ip:${row.ip}`} onClick={() => setActionTarget({ type: "ip", row })}>
                      {row.status === "blocked" ? "解封" : "封禁"}
                    </UnifiedButton>
                  </td>
                </tr>
              ))}
              {!riskIps.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-muted-foreground")} colSpan={8}>{loading ? "加载中..." : "暂无风险 IP"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        {activeTab === "devices" && (
          <AdminNativeTable>
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className={adminThClassName(undefined, "left")}>设备</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>处理状态</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>风险等级</th>
                <th className={adminThClassName(undefined, "left")}>触发来源</th>
                <th className={adminThClassName(undefined, "left")}>涉及用户</th>
                <th className={adminThClassName(undefined, "left")}>风险原因</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>最近记录</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {riskDevices.map((row) => (
                <tr key={row.device_id} className="border-t border-[var(--theme-border)]">
                  <td className={adminTdClassName("text-foreground", "left")}>
                    <AdminTableMoreCell
                      value={formatDeviceLabel(row.device_id, row.device_label)}
                      fullText={[row.device_label, row.device_id].filter(Boolean).join("\n")}
                      modalTitle="设备完整信息"
                      maxWidth="13rem"
                      maxChars={16}
                      mono
                    />
                  </td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={formatRiskStatusLabel(row.status)} tone={statusTone(row.status)} /></td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={formatRiskLevelLabel(row.risk_level)} tone={levelTone(row.risk_level)} /></td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>
                    <AdminTableMoreCell
                      value={`${formatRiskSourceLabel(row.source)} · ${formatRiskSignalSummary(row)}`}
                      fullText={`触发来源：${formatRiskSourceLabel(row.source)}\n风险信号：${formatRiskSignalSummary(row)}`}
                      modalTitle="触发来源"
                      maxWidth="13rem"
                      maxChars={16}
                      muted
                    />
                  </td>
                  <td className={adminTdClassName(undefined, "left")}><RelatedUsersCell count={row.related_user_count} users={row.related_users} /></td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>
                    <AdminTableMoreCell value={row.reason || "-"} fullText={row.reason || ""} modalTitle="风险原因" maxWidth="12rem" maxChars={12} muted />
                  </td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`, "left")}>{formatTime(row.last_seen_at || row.updated_at)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                    <UnifiedButton className="text-[var(--theme-primary)] disabled:text-muted-foreground" disabled={actioning === `device:${row.device_id}`} onClick={() => setActionTarget({ type: "device", row })}>
                      {row.status === "blocked" ? "解封" : "封禁"}
                    </UnifiedButton>
                  </td>
                </tr>
              ))}
              {!riskDevices.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-muted-foreground")} colSpan={8}>{loading ? "加载中..." : "暂无风险设备"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        {activeTab === "login" && (
          <AdminNativeTable>
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className={adminThClassName(undefined, "left")}>用户</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>登录方式</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>IP</th>
                <th className={adminThClassName(undefined, "left")}>设备标识</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>时间</th>
              </tr>
            </thead>
            <tbody>
              {loginAttempts.map((row) => (
                <tr key={row.id} className="border-t border-[var(--theme-border)]">
                  <td className={adminTdClassName("text-foreground", "left")}>{userLabel(row)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{formatLoginMethodLabel(row.login_method)}</td>
                  <td className={adminTdClassName(undefined, "left")}><IpCell ip={row.ip} location={row.ip_location} /></td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>
                    <AdminTableMoreCell value={formatDeviceLabel(row.device_id)} fullText={row.device_id || ""} modalTitle="设备标识" maxWidth="13rem" maxChars={16} mono muted />
                  </td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`, "left")}>{formatTime(row.created_at)}</td>
                </tr>
              ))}
              {!loginAttempts.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-muted-foreground")} colSpan={5}>{loading ? "加载中..." : "暂无登录记录"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        {activeTab === "events" && (
          <AdminNativeTable>
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>风险等级</th>
                <th className={adminThClassName(undefined, "left")}>事件</th>
                <th className={adminThClassName(undefined, "left")}>用户</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>IP</th>
                <th className={adminThClassName(undefined, "left")}>设备</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>时间</th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.id} className="border-t border-[var(--theme-border)]">
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={formatRiskLevelLabel(row.severity)} tone={levelTone(row.severity)} /></td>
                  <td className={adminTdClassName("text-foreground", "left")}>
                    <AdminTableMoreCell
                      value={formatUserSecurityEventTitle(row.title, row.event_type)}
                      fullText={`${formatUserSecurityEventTitle(row.title, row.event_type)}\n${formatUserSecurityEventDescription(row.description, row.event_type, row.title)}`}
                      modalTitle="安全事件"
                      maxWidth="14rem"
                      maxChars={14}
                    />
                  </td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>{userLabel(row)}</td>
                  <td className={adminTdClassName(undefined, "left")}><IpCell ip={row.ip} location={row.ip_location} /></td>
                  <td className={adminTdClassName("text-muted-foreground", "left")}>
                    <AdminTableMoreCell value={formatDeviceLabel(row.device_id)} fullText={row.device_id || ""} modalTitle="设备标识" maxWidth="13rem" maxChars={16} mono muted />
                  </td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`, "left")}>{formatTime(row.created_at)}</td>
                </tr>
              ))}
              {!events.length && (
                <tr><td className={adminTdClassName("py-6 text-center text-muted-foreground")} colSpan={6}>{loading ? "加载中..." : "暂无安全事件"}</td></tr>
              )}
            </tbody>
          </AdminNativeTable>
        )}

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={() => undefined}
          showPageSizeSelect={false}
        />
      </div>
      <AdminInputSheet
        open={Boolean(actionTarget)}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
        title={`${actionIsUnblock ? "确认解封" : "确认封禁"}${actionObjectLabel}`}
        description={actionIsUnblock
          ? `请填写解封原因，提交后该${actionObjectLabel}会恢复访问。`
          : `请填写封禁原因，提交后该${actionObjectLabel}会被安全策略拦截。`}
        placeholder={actionIsUnblock ? "请输入解封原因" : "请输入封禁原因"}
        defaultValue={actionIsUnblock ? "管理员确认解封" : "后台安全处理"}
        submitText={actionIsUnblock ? "确认解封" : "确认封禁"}
        onSubmit={submitSecurityAction}
      />
      </AdminPageShell>
    </PermissionGate>
  );
}
