import { useEffect, useState } from "react";
import { executeRepairTask, getRepairTasks, type MonitoringRepairTask } from "@/api/admin/monitoring";
import MonitoringSubnav, { Badge, formatTime, JsonBlock } from "./MonitoringSubnav";

export default function AdminMonitoringRepairTasks() {
  const [list, setList] = useState<MonitoringRepairTask[]>([]);

  const load = () => getRepairTasks({ pageSize: 50 }).then((res) => setList(res.data.list));
  useEffect(load, []);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">修复任务</h1>
      <MonitoringSubnav />
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">状态</th><th className="p-3">异常标题</th><th className="p-3">修复类型</th><th className="p-3">修复建议</th><th className="p-3">操作人</th><th className="p-3">创建时间</th><th className="p-3">执行时间</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {list.map((task) => (
              <tr key={task.id} className="border-t align-top">
                <td className="p-3"><Badge value={task.repair_status} /></td>
                <td className="p-3 font-medium text-slate-900">{task.anomaly_title || task.anomaly_id}</td>
                <td className="p-3">{task.repair_type}</td>
                <td className="p-3 max-w-md"><JsonBlock data={task.suggestion} /></td>
                <td className="p-3">{task.operator_id || "-"}</td>
                <td className="p-3">{formatTime(task.created_at)}</td>
                <td className="p-3">{formatTime(task.executed_at)}</td>
                <td className="p-3">
                  <button
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    disabled={task.repair_status === "executed"}
                    onClick={async () => { await executeRepairTask(task.id); load(); }}
                  >
                    执行
                  </button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td className="p-6 text-center text-slate-500" colSpan={8}>暂无修复任务</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
