import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, RefreshCw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
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
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import {
  normalizeTelegramNotifyConfig,
  settingsToForm,
  TELEGRAM_BOT_TOKEN_UNCHANGED,
  type TelegramNotifyConfig,
} from "@/utils/telegramNotifyConfig";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";
import { formatDateTime } from "@/utils/formatDateTime";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import {
  labelTelegramLogErrorMessage,
  labelTelegramLogEventType,
  labelTelegramLogSendStatus,
  telegramLogSendStatusClass,
} from "@/utils/telegramLogLabels";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]";

export default function AdminTelegramSettings() {
  const { tText } = useAdminT();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TelegramNotifyConfig>(normalizeTelegramNotifyConfig({}));
  const [botTokenMasked, setBotTokenMasked] = useState("");
  const [botTokenConfigured, setBotTokenConfigured] = useState(false);
  const [configSource, setConfigSource] = useState<"env" | "database">("database");
  const [botTokenInput, setBotTokenInput] = useState("");
  const [logs, setLogs] = useState<TelegramLogRow[]>([]);
  const [preview, setPreview] = useState<TelegramMessagePreview | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formHydrated, setFormHydrated] = useState(false);

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

  const telegramQuery = useQuery({
    queryKey: adminQueryKeys.telegramSettings(),
    queryFn: async () => {
      const [settingsResult, logsResult] = await Promise.allSettled([
        fetchTelegramSettings(),
        fetchTelegramLogs(20),
      ]);
      if (settingsResult.status === "rejected") {
        throw settingsResult.reason;
      }
      return {
        settings: settingsResult.value,
        logs: logsResult.status === "fulfilled" && Array.isArray(logsResult.value) ? logsResult.value : [],
      };
    },
    staleTime: 60_000,
  });

  const loading = telegramQuery.isLoading && !telegramQuery.data;
  const dirtyDraft = useMemo(() => ({ form, botTokenInput }), [form, botTokenInput]);
  const { markClean } = useAdminFormDirty(dirtyDraft, formHydrated && !loading);

  useEffect(() => {
    if (!telegramQuery.data?.settings) return;
    const s = telegramQuery.data.settings;
    setForm(settingsToForm(s));
    setBotTokenMasked(s.botTokenMasked || "");
    setBotTokenConfigured(!!s.botTokenConfigured);
    setConfigSource(s.configSource === "env" ? "env" : "database");
    setBotTokenInput("");
    setLogs(telegramQuery.data.logs);
    void loadPreview(settingsToForm(s));
    setFormHydrated(true);
  }, [telegramQuery.data, loadPreview]);

  const reload = () => void telegramQuery.refetch();

  const patchForm = (patch: Partial<TelegramNotifyConfig>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = normalizeTelegramNotifyConfig(form);
      payload.botToken = botTokenInput.trim() || TELEGRAM_BOT_TOKEN_UNCHANGED;
      const saved = await saveTelegramSettings(payload);
      const nextForm = settingsToForm(saved);
      const nextDraft = { form: nextForm, botTokenInput: "" };
      setForm(nextForm);
      setBotTokenMasked(saved.botTokenMasked || "");
      setBotTokenConfigured(!!saved.botTokenConfigured);
      setConfigSource(saved.configSource === "env" ? "env" : "database");
      setBotTokenInput("");
      markClean(nextDraft);
      await refreshSiteCapabilities();
      await loadPreview(nextForm);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.telegramSettings() });
      toast.success(tText("Telegram 设置已保存"));
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
      toast.success(tText("测试消息已发送"));
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
      <AdminPageShell
        hint={(
          <>
            <p><Tx>配置 Bot 后，可分别开启「订单付款通知」与「后台事件监控通知」。Bot Token 与接收会话编号可在本页保存。</Tx></p>
            {configSource === "env" ? (
              <p className="mt-1 text-amber-700"><Tx>当前部分配置来自环境变量；保存后将写入数据库并优先生效。</Tx></p>
            ) : null}
          </>
        )}
        toolbar={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <Tx>刷新</Tx>
            </button>
            <button
              type="button"
              onClick={() => loadPreview(form)}
              disabled={previewing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
              <Tx>刷新预览</Tx>
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <Tx>保存设置</Tx>
            </button>
            <button
              type="button"
              onClick={testSend}
              disabled={testing || loading || saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--theme-primary)] bg-card px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary)] disabled:opacity-60"
            >
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <Tx>测试发送</Tx>
            </button>
          </div>
        )}
      >

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <Tx>加载中...</Tx>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground"><Tx>连接配置</Tx></h2>
                {!isSuperAdmin ? (
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    <Tx>仅超级管理员可修改</Tx>
                  </span>
                ) : null}
              </div>
              {isSuperAdmin ? (
                <div className="grid gap-4 md:grid-cols-2">
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
                      接收会话编号
                      <AdminFieldHint text="用于接收通知的群、频道或个人会话编号；群组通常为负数。" className="ml-1" />
                    </label>
                    <input
                      className={inputClass}
                      value={form.adminChatId}
                      onChange={(e) => patchForm({ adminChatId: e.target.value })}
                      placeholder="-1001234567890"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      <Tx>解析模式</Tx>
                      <AdminFieldHint
                        text="付款成功订单通知模板按 HTML 渲染并发送；请保持 HTML。测试消息为纯文本。"
                        className="ml-1"
                      />
                    </label>
                    <select
                      className={inputClass}
                      value={form.parseMode}
                      onChange={(e) => patchForm({ parseMode: e.target.value as TelegramNotifyConfig["parseMode"] })}
                    >
                      <option value="HTML">HTML（推荐，订单通知）</option>
                      <option value="Markdown">Markdown（预留）</option>
                      <option value="MarkdownV2">MarkdownV2（预留）</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground"><Tx>后台链接域名</Tx></label>
                    <input
                      className={inputClass}
                      value={form.adminFrontendUrl}
                      onChange={(e) => patchForm({ adminFrontendUrl: e.target.value })}
                      placeholder="https://console.damatong.net"
                    />
                    <p className="text-xs text-muted-foreground">
                      <Tx>用于消息末尾「后台查看」链接。请填写管理后台实际访问域名（若与商城主站分离，勿填商城首页域名，否则会 404）。</Tx>
                    </p>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <div>
                      <div className="font-medium text-foreground"><Tx>包含商品明细</Tx></div>
                      <p className="text-xs text-muted-foreground"><Tx>关闭后仅发送订单摘要，不含逐行商品。</Tx></p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[var(--theme-primary)]"
                      checked={form.includeOrderItems}
                      onChange={(e) => patchForm({ includeOrderItems: e.target.checked })}
                    />
                  </label>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground"><Tx>单条消息长度上限</Tx></label>
                    <input
                      className={inputClass}
                      type="number"
                      min={500}
                      max={4096}
                      value={form.maxMessageLength}
                      onChange={(e) => patchForm({ maxMessageLength: Number(e.target.value) || 3900 })}
                    />
                    <p className="text-xs text-muted-foreground"><Tx>超出时自动拆分为多条 Telegram 消息（500–4096）。</Tx></p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                  <p><Tx>连接参数由超级管理员统一维护。</Tx></p>
                  <p className="mt-1"><Tx>如需修改 Bot Token、接收会话编号或消息连接参数，请联系超级管理员处理。</Tx></p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h2 className="mb-2 font-semibold text-foreground"><Tx>通知类型</Tx></h2>
              <p className="mb-4 text-xs text-muted-foreground">
                共用上方 Bot Token 与接收会话编号。可按需单独开启订单通知或后台事件监控通知。
              </p>
              <div className="grid gap-4">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <div className="font-medium text-foreground"><Tx>订单付款成功通知</Tx></div>
                    <p className="text-xs text-muted-foreground">
                      <Tx>与「功能开关」中的 Telegram 订单通知双向同步；付款成功后发送订单摘要。</Tx>
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--theme-primary)]"
                    checked={form.orderNotifyEnabled}
                    onChange={(e) =>
                      patchForm({ orderNotifyEnabled: e.target.checked, enabled: e.target.checked })
                    }
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <div className="font-medium text-foreground"><Tx>后台事件监控通知</Tx></div>
                    <p className="text-xs text-muted-foreground">
                      网站异常、订单超时、支付/库存/安全等 P0/P1 事件：新建时即时提醒，超时未处理时发送升级提醒（规则见事件中心）。
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--theme-primary)]"
                    checked={form.eventNotifyEnabled}
                    onChange={(e) => patchForm({ eventNotifyEnabled: e.target.checked })}
                  />
                </label>

                <label
                  className={`flex items-center justify-between gap-3 rounded-lg border border-border p-4 ${
                    !form.eventNotifyEnabled ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium text-foreground"><Tx>P0/P1 新事件即时提醒</Tx></div>
                    <p className="text-xs text-muted-foreground">
                      事件首次产生时立即推送（去重后不会重复轰炸）；关闭后仅保留超时升级提醒。
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--theme-primary)]"
                    checked={form.eventNotifyImmediate}
                    disabled={!form.eventNotifyEnabled}
                    onChange={(e) => patchForm({ eventNotifyImmediate: e.target.checked })}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-foreground"><Tx>付款成功通知 · 模板预览</Tx></h2>
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
                <h2 className="font-semibold text-foreground"><Tx>最近 20 条 Telegram 通知日志</Tx></h2>
                <p className="text-xs text-muted-foreground"><Tx>不显示完整 Bot Token，仅展示发送状态与错误摘要。</Tx></p>
              </div>
              <AdminNativeTable tableClassName="min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>时间</Tx></th>
                      <th className={adminThClassName(undefined, "left")}><Tx>事件</Tx></th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>订单</Tx></th>
                      <th className={adminThClassName(undefined, "center")}><Tx>状态</Tx></th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>消息编号</Tx></th>
                      <th className={adminThClassName(undefined, "left")}><Tx>错误</Tx></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-xs text-muted-foreground`, "left")}>{formatDateTime(log.created_at)}</td>
                        <td className={adminTdClassName(undefined, "left")}>{labelTelegramLogEventType(log.event_type)}</td>
                        <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{log.order_id || "-"}</td>
                        <td className={adminTdClassName(undefined, "center")}>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${telegramLogSendStatusClass(log.send_status)}`}
                          >
                            {labelTelegramLogSendStatus(log.send_status)}
                          </span>
                        </td>
                        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-xs`, "left")}>{log.provider_message_id || "-"}</td>
                        <td className={adminTdClassName("max-w-[18rem]", "left")}>
                          <AdminTableCell
                            value={labelTelegramLogErrorMessage(log.error_message)}
                            fullText={labelTelegramLogErrorMessage(log.error_message)}
                            maxWidth="17rem"
                            muted
                          />
                        </td>
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
              </AdminNativeTable>
            </section>
          </>
        )}
      </AdminPageShell>
    </PermissionGate>
  );
}
