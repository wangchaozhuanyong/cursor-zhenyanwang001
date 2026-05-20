import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import {
  getTelegramLogs,
  getTelegramStatus,
  postTelegramTest,
  type TelegramLogRow,
  type TelegramStatus,
} from "@/api/admin/telegram";
import { toastErrorMessage } from "@/utils/errorMessage";

function statusLabel(value: boolean, yes = "已配置", no = "未配置") {
  return value ? yes : no;
}

function statusClass(value: boolean) {
  return value ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700";
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminTelegramSettings() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [logs, setLogs] = useState<TelegramLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getTelegramStatus(), getTelegramLogs(20)])
      .then(([statusRes, logsRes]) => {
        setStatus(statusRes.data);
        setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      })
      .catch((error) => toast.error(toastErrorMessage(error, "加载 Telegram 通知设置失败")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const testSend = async () => {
    setTesting(true);
    try {
      await postTelegramTest();
      toast.success("测试消息已发送");
      load();
    } catch (error) {
      toast.error(toastErrorMessage(error, "测试发送失败"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <PermissionGate permission="settings.manage">
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Bell size={20} />
              Telegram 通知设置
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              付款成功后发送管理员群通知，包含手机号尾号 5 位、收货地址和全部商品明细。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              刷新
            </button>
            <button
              type="button"
              onClick={testSend}
              disabled={testing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
            >
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              测试发送
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <Tx>加载中...</Tx>
          </div>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Telegram 通知</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(!!status?.enabled)}`}>
                  {statusLabel(!!status?.enabled, "已开启", "未开启")}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Bot Token</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(!!status?.botTokenConfigured)}`}>
                  {statusLabel(!!status?.botTokenConfigured)}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">管理员 Chat ID</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(!!status?.adminChatIdConfigured)}`}>
                  {statusLabel(!!status?.adminChatIdConfigured)}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">商品明细</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(!!status?.includeOrderItems)}`}>
                  {statusLabel(!!status?.includeOrderItems, "显示全部商品", "不显示")}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">消息长度上限</p>
                <p className="mt-2 text-sm font-semibold">{status?.maxMessageLength || 3900}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">后台链接域名</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(!!status?.adminFrontendUrlConfigured)}`}>
                  {statusLabel(!!status?.adminFrontendUrlConfigured)}
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3">
                <h2 className="font-semibold text-foreground">最近 20 条 Telegram 通知日志</h2>
                <p className="text-xs text-muted-foreground">这里不会显示完整 Bot Token，只显示发送状态和简短错误。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">时间</th>
                      <th className="py-2 pr-3">事件</th>
                      <th className="py-2 pr-3">订单</th>
                      <th className="py-2 pr-3">状态</th>
                      <th className="py-2 pr-3">Telegram ID</th>
                      <th className="py-2 pr-3">错误</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{formatDate(log.created_at)}</td>
                        <td className="py-2 pr-3">{log.event_type}</td>
                        <td className="py-2 pr-3">{log.order_id || "-"}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">{log.send_status}</span>
                        </td>
                        <td className="py-2 pr-3 text-xs">{log.provider_message_id || "-"}</td>
                        <td className="max-w-[280px] truncate py-2 pr-3 text-xs text-muted-foreground">{log.error_message || "-"}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td className="py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                          暂无通知日志
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
