import { useCallback, useEffect, useState } from "react";
import { Bell, Eye, Loader2, RefreshCw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import {
  fetchTelegramLogs,
  fetchTelegramSettings,
  previewTelegramMessage,
  saveTelegramSettings,
  sendTelegramTest,
  type TelegramLogRow,
  type TelegramMessagePreview,
} from "@/services/admin/telegramService";
import { refreshSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import {
  normalizeTelegramNotifyConfig,
  settingsToForm,
  TELEGRAM_BOT_TOKEN_UNCHANGED,
  type TelegramNotifyConfig,
} from "@/utils/telegramNotifyConfig";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]";

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminTelegramSettings() {
  const [form, setForm] = useState<TelegramNotifyConfig>(normalizeTelegramNotifyConfig({}));
  const [botTokenMasked, setBotTokenMasked] = useState("");
  const [botTokenConfigured, setBotTokenConfigured] = useState(false);
  const [configSource, setConfigSource] = useState<"env" | "database">("database");
  const [botTokenInput, setBotTokenInput] = useState("");
  const [logs, setLogs] = useState<TelegramLogRow[]>([]);
  const [preview, setPreview] = useState<TelegramMessagePreview | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [testing, setTesting] = useState(false);

  const loadPreview = useCallback(async (draft: TelegramNotifyConfig) => {
    setPreviewing(true);
    try {
      const data = await previewTelegramMessage(draft);
      setPreview(data);
      setPreviewIndex(0);
    } catch (error) {
      toast.error(toastErrorMessage(error, "生成模板预览失败"));
    } finally {
      setPreviewing(false);
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([fetchTelegramSettings(), fetchTelegramLogs(20)])
      .then(async ([settingsResult, logsResult]) => {
        if (settingsResult.status === "fulfilled" && settingsResult.value) {
          const s = settingsResult.value;
          setForm(settingsToForm(s));
          setBotTokenMasked(s.botTokenMasked || "");
          setBotTokenConfigured(!!s.botTokenConfigured);
          setConfigSource(s.configSource === "env" ? "env" : "database");
          setBotTokenInput("");
          await loadPreview(settingsToForm(s));
        } else if (settingsResult.status === "rejected") {
          toast.error(toastErrorMessage(settingsResult.reason, "加载 Telegram 设置失败"));
        }
        if (logsResult.status === "fulfilled") {
          setLogs(Array.isArray(logsResult.value) ? logsResult.value : []);
        } else {
          setLogs([]);
        }
      })
      .finally(() => setLoading(false));
  }, [loadPreview]);

  useEffect(() => {
    load();
  }, [load]);

  const patchForm = (patch: Partial<TelegramNotifyConfig>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = normalizeTelegramNotifyConfig(form);
      payload.botToken = botTokenInput.trim() || TELEGRAM_BOT_TOKEN_UNCHANGED;
      const saved = await saveTelegramSettings(payload);
      setForm(settingsToForm(saved));
      setBotTokenMasked(saved.botTokenMasked || "");
      setBotTokenConfigured(!!saved.botTokenConfigured);
      setConfigSource(saved.configSource === "env" ? "env" : "database");
      setBotTokenInput("");
      await refreshSiteCapabilities();
      await loadPreview(settingsToForm(saved));
      toast.success("Telegram 设置已保存");
    } catch (error) {
      toast.error(toastErrorMessage(error, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const testSend = async () => {
    setTesting(true);
    try {
      await sendTelegramTest();
      toast.success("测试消息已发送");
      const logsData = await fetchTelegramLogs(20);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      toast.error(toastErrorMessage(error, "测试发送失败"));
    } finally {
      setTesting(false);
    }
  };

  const previewMessages = preview?.messages ?? [];
  const activePreview = previewMessages[previewIndex] ?? "";

  return (
    <PermissionGate permission="settings.manage">
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Bell size={20} />
                Telegram 通知设置
              </h1>
              <AdminFieldHint
                text="付款成功后向管理员 Telegram 群发送通知。Bot Token 与 Chat ID 可在本页保存，无需改服务器环境变量。"
                size="md"
              />
            </div>
            {configSource === "env" && (
              <p className="mt-1 text-xs text-amber-700">
                当前部分配置来自环境变量；保存后将写入数据库并优先生效。
              </p>
            )}
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
              onClick={() => loadPreview(form)}
              disabled={previewing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
              刷新预览
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              保存设置
            </button>
            <button
              type="button"
              onClick={testSend}
              disabled={testing || loading || saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--theme-primary)] bg-card px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary)] disabled:opacity-60"
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
            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h2 className="mb-4 font-semibold text-foreground">连接配置</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 md:col-span-2">
                  <div>
                    <div className="font-medium text-foreground">启用 Telegram 订单通知</div>
                    <p className="text-xs text-muted-foreground">关闭后不会发送付款成功提醒，并同步关闭「功能开关」中的 Telegram 项。</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--theme-primary)]"
                    checked={form.enabled}
                    onChange={(e) => patchForm({ enabled: e.target.checked })}
                  />
                </label>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Bot Token
                    <AdminFieldHint text="在 @BotFather 创建机器人后获取。留空表示不修改已保存的 Token。" className="ml-1" />
                  </label>
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="off"
                    placeholder={botTokenConfigured ? `已配置 ${botTokenMasked}，输入新 Token 可覆盖` : "请输入 Bot Token"}
                    value={botTokenInput}
                    onChange={(e) => setBotTokenInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    管理员 Chat ID
                    <AdminFieldHint text="接收通知的群/频道/用户 ID，通常为负数（群）。" className="ml-1" />
                  </label>
                  <input
                    className={inputClass}
                    value={form.adminChatId}
                    onChange={(e) => patchForm({ adminChatId: e.target.value })}
                    placeholder="-1001234567890"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">解析模式</label>
                  <select
                    className={inputClass}
                    value={form.parseMode}
                    onChange={(e) => patchForm({ parseMode: e.target.value as TelegramNotifyConfig["parseMode"] })}
                  >
                    <option value="HTML">HTML</option>
                    <option value="Markdown">Markdown</option>
                    <option value="MarkdownV2">MarkdownV2</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">后台链接域名</label>
                  <input
                    className={inputClass}
                    value={form.adminFrontendUrl}
                    onChange={(e) => patchForm({ adminFrontendUrl: e.target.value })}
                    placeholder="https://admin.example.com"
                  />
                  <p className="text-xs text-muted-foreground">用于消息末尾「后台查看」链接，请填写管理后台访问地址。</p>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <div className="font-medium text-foreground">包含商品明细</div>
                    <p className="text-xs text-muted-foreground">关闭后仅发送订单摘要，不含逐行商品。</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--theme-primary)]"
                    checked={form.includeOrderItems}
                    onChange={(e) => patchForm({ includeOrderItems: e.target.checked })}
                  />
                </label>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">单条消息长度上限</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={500}
                    max={4096}
                    value={form.maxMessageLength}
                    onChange={(e) => patchForm({ maxMessageLength: Number(e.target.value) || 3900 })}
                  />
                  <p className="text-xs text-muted-foreground">超出时自动拆分为多条 Telegram 消息（500–4096）。</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">付款成功通知 · 模板预览</h2>
                  <p className="text-xs text-muted-foreground">
                    示例订单 {preview?.sampleOrderNo || "ORD202605200001"} · 解析模式 {preview?.parseMode || form.parseMode}
                    {preview && preview.totalParts > 1 ? ` · 共 ${preview.totalParts} 条消息` : ""}
                  </p>
                </div>
                {previewMessages.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {previewMessages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewIndex(idx)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          previewIndex === idx
                            ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        第 {idx + 1} 条
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                {previewing ? "生成预览中…" : activePreview || "暂无预览，请点击「刷新预览」"}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">
                预览为付款成功模板示例数据；实际发送时将替换为真实订单号、手机号尾 5 位、地址与商品明细。
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3">
                <h2 className="font-semibold text-foreground">最近 20 条 Telegram 通知日志</h2>
                <p className="text-xs text-muted-foreground">不显示完整 Bot Token，仅展示发送状态与错误摘要。</p>
              </div>
              <div className="overflow-x-auto">
                <table className={adminTableClassName("w-full min-w-[760px] text-left text-sm")}>
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>时间</th>
                      <th className={adminThClassName()}>事件</th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>订单</th>
                      <th className={adminThClassName()}>状态</th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>Telegram ID</th>
                      <th className={adminThClassName()}>错误</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-xs text-muted-foreground`)}>{formatDate(log.created_at)}</td>
                        <td className={adminTdClassName()}>{log.event_type}</td>
                        <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{log.order_id || "-"}</td>
                        <td className={adminTdClassName()}>
                          <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">{log.send_status}</span>
                        </td>
                        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-xs`)}>{log.provider_message_id || "-"}</td>
                        <td className={adminTdClassName("max-w-[280px] truncate text-xs text-muted-foreground")}>{log.error_message || "-"}</td>
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
