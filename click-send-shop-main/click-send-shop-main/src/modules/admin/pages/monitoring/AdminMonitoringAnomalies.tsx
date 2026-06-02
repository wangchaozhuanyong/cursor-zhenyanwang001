import { useCallback, useEffect, useState } from "react";
import { getMonitoringAnomalies, type MonitoringAnomaly } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import MonitoringAnomalyRowActions from "./MonitoringAnomalyRowActions";
import {
  Badge,
  formatTime,
  monitoringInputClass,
  monitoringMutedClass,
  monitoringPanelClass,
  monitoringPrimaryButtonClass,
  monitoringSecondaryButtonClass,
  monitoringTableHeadClass,
  severityClass,
} from "./monitoringUi";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import { MONITORING_ANOMALY_STATUS_LABELS } from "./monitoringLabels";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const statuses = ["", "open", "investigating", "repair_pending", "repaired", "resolved", "ignored"];
const severities = ["", "P0", "P1", "P2", "P3", "INFO"];

export default function AdminMonitoringAnomalies() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
  const [list, setList] = useState<MonitoringAnomaly[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getMonitoringAnomalies({ page, pageSize: 20, status, severity, keyword })
      .then((res) => {
        setList(res.data.list);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [keyword, page, severity, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(fn: () => Promise<unknown>) {
    await fn();
    load();
  }

  return (
    <AdminPageShell
      hint={<Tx>按状态、等级与关键词筛选数据一致性异常，可进入详情处理。</Tx>}
      filters={(
        <>
          <MonitoringSubnav />
          <div className={`flex flex-wrap gap-2 ${monitoringPanelClass}`}>
            <select className={monitoringInputClass} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              {statuses.map((s) => (
                <option key={s} value={s}>{s ? tText(MONITORING_ANOMALY_STATUS_LABELS[s] || s) : tText("全部状态")}</option>
              ))}
            </select>
            <select className={monitoringInputClass} value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value); }}>
              {severities.map((s) => (
                <option key={s} value={s}>
                  {s ? ml.severity(s) || s : tText("全部等级")}
                </option>
              ))}
            </select>
            <input className={`${monitoringInputClass} min-w-56`} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={tText("关键词 / 对象 / 原因")} />
            <UnifiedButton className={monitoringPrimaryButtonClass} onClick={() => { setPage(1); load(); }}><Tx>筛选</Tx></UnifiedButton>
          </div>
        </>
      )}
    >
      <AdminNativeTable>
          <thead className={monitoringTableHeadClass}>
            <tr>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>等级</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>模块</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>异常标题</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>关联对象</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>可能原因</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>首次发现</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>最近发现</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>状态</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>操作</Tx></th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id} className="border-t align-middle">
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={item.severity} tone={severityClass[item.severity]} /></td>
                <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-foreground`, "left")}>{ml.module(item.module)}</td>
                <td className={adminTdClassName("font-medium text-foreground", "left")}>{item.title}</td>
                <td className={adminTdClassName("text-muted-foreground", "left")} title={`${item.entity_type}:${item.entity_id}`}>
                  {ml.entityRef(item.entity_type, item.entity_id)}
                </td>
                <td className={adminTdClassName("text-muted-foreground", "left")}>
                  {ml.rootCause(item.root_cause_message, item.root_cause_code)}
                </td>
                <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`, "left")}>{formatTime(item.first_seen_at)}</td>
                <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`, "left")}>{formatTime(item.last_seen_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={item.status} /></td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                  <MonitoringAnomalyRowActions item={item} onAction={action} />
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className={adminTdClassName(`py-6 text-center ${monitoringMutedClass}`, "center")} colSpan={9}>
                  {loading ? "加载中..." : "暂无异常"}
                </td>
              </tr>
            )}
          </tbody>
      </AdminNativeTable>
      <div className={`mt-4 flex items-center justify-between text-sm ${monitoringMutedClass}`}>
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <UnifiedButton className={monitoringSecondaryButtonClass} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Tx>上一页</Tx></UnifiedButton>
          <span className="px-2 py-1">{page}</span>
          <UnifiedButton className={monitoringSecondaryButtonClass} disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}><Tx>下一页</Tx></UnifiedButton>
        </div>
      </div>
    </AdminPageShell>
  );
}
