import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { uploadSingle } from "@/services/uploadService";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { SupportChannelType, SupportDownloadChannel, SupportDownloadConfig } from "@/types/content";

const CHANNEL_TYPES: Array<{ value: SupportChannelType; label: string }> = [
  { value: "wechat", label: "微信" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "messenger", label: "Messenger" },
  { value: "custom", label: "自定义" },
];

const DEFAULT_CONFIG: SupportDownloadConfig = {
  enabled: true,
  title: "客服下载",
  subtitle: "添加客服、查看二维码，并把商城安装到手机桌面",
  workingHours: "工作日 09:00 - 18:00",
  supportDescription: "如需咨询商品、订单、售后或安装问题，请通过下方入口联系官方客服。",
  showAppInstall: true,
  appInstallTitle: "安装到手机桌面",
  appInstallDescription: "安装后可像 App 一样从桌面打开商城，下单、支付、订单功能保持不变。",
  channels: [
    { id: "wechat", type: "wechat", name: "微信客服", enabled: true, account: "", linkUrl: "", qrUrl: "", description: "请复制微信号后在微信内添加客服，或扫码添加。", sortOrder: 1 },
    { id: "whatsapp", type: "whatsapp", name: "WhatsApp 客服", enabled: true, account: "", linkUrl: "", qrUrl: "", description: "点击按钮即可跳转 WhatsApp 咨询。", sortOrder: 2 },
    { id: "telegram", type: "telegram", name: "Telegram 客服", enabled: false, account: "", linkUrl: "", qrUrl: "", description: "点击按钮即可跳转 Telegram 咨询。", sortOrder: 3 },
    { id: "messenger", type: "messenger", name: "Messenger 客服", enabled: false, account: "", linkUrl: "", qrUrl: "", description: "点击按钮即可跳转 Messenger 咨询。", sortOrder: 4 },
  ],
};

function trim(value?: string) {
  return String(value || "").trim();
}

function parseConfig(raw?: string): SupportDownloadConfig {
  if (!raw?.trim()) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<SupportDownloadConfig>;
    return normalizeConfig({ ...DEFAULT_CONFIG, ...parsed, channels: parsed.channels ?? DEFAULT_CONFIG.channels });
  } catch {
    return DEFAULT_CONFIG;
  }
}

function normalizeConfig(config: SupportDownloadConfig): SupportDownloadConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    enabled: config.enabled !== false,
    showAppInstall: config.showAppInstall !== false,
    title: trim(config.title) || DEFAULT_CONFIG.title,
    subtitle: trim(config.subtitle) || DEFAULT_CONFIG.subtitle,
    workingHours: trim(config.workingHours),
    supportDescription: trim(config.supportDescription),
    appInstallTitle: trim(config.appInstallTitle) || DEFAULT_CONFIG.appInstallTitle,
    appInstallDescription: trim(config.appInstallDescription) || DEFAULT_CONFIG.appInstallDescription,
    channels: (Array.isArray(config.channels) ? config.channels : [])
      .map((channel, index) => ({
        id: trim(channel.id) || `${channel.type || "custom"}-${Date.now()}-${index}`,
        type: CHANNEL_TYPES.some((item) => item.value === channel.type) ? channel.type : "custom",
        name: trim(channel.name) || CHANNEL_TYPES.find((item) => item.value === channel.type)?.label || "客服入口",
        enabled: channel.enabled !== false,
        account: trim(channel.account),
        linkUrl: trim(channel.linkUrl),
        qrUrl: trim(channel.qrUrl),
        description: trim(channel.description),
        sortOrder: Number(channel.sortOrder) || index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function createChannel(sortOrder: number): SupportDownloadChannel {
  return { id: `custom-${Date.now()}`, type: "custom", name: "客服入口", enabled: true, account: "", linkUrl: "", qrUrl: "", description: "", sortOrder };
}

const inputClass = "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]";

export default function AdminSupportDownload() {
  const [form, setForm] = useState<SupportDownloadConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setLoading(true);
    fetchSiteSettings()
      .then((settings) => setForm(parseConfig(settings.supportDownloadConfig)))
      .catch((error) => toast.error(toastErrorMessage(error, "加载客服下载配置失败")))
      .finally(() => setLoading(false));
  }, []);

  const channels = useMemo(() => [...form.channels].sort((a, b) => a.sortOrder - b.sortOrder), [form.channels]);

  const updateChannel = (id: string, patch: Partial<SupportDownloadChannel>) => {
    setForm((prev) => ({ ...prev, channels: prev.channels.map((channel) => (channel.id === id ? { ...channel, ...patch } : channel)) }));
  };

  const removeChannel = (id: string) => {
    setForm((prev) => ({ ...prev, channels: prev.channels.filter((channel) => channel.id !== id).map((channel, index) => ({ ...channel, sortOrder: index + 1 })) }));
  };

  const uploadQr = async (channelId: string, file?: File) => {
    if (!file) return;
    setUploadingId(channelId);
    try {
      const res = await uploadSingle(file, { mode: "asset" });
      updateChannel(channelId, { qrUrl: res.url });
      toast.success("二维码已上传");
    } catch (error) {
      toast.error(toastErrorMessage(error, "二维码上传失败"));
    } finally {
      setUploadingId("");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const normalized = normalizeConfig(form);
      await updateSiteSettings({ supportDownloadConfig: JSON.stringify(normalized) });
      setForm(normalized);
      await refreshSiteInfo();
      toast.success("客服下载配置已保存");
    } catch (error) {
      toast.error(toastErrorMessage(error, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        <Tx>加载中...</Tx>
      </div>
    );
  }

  return (
    <PermissionGate permission="settings.manage">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">客服下载</h1>
            <p className="text-sm text-muted-foreground">配置前台 /support-download 的客服二维码、外部 App 跳转和安装说明。</p>
          </div>
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            保存配置
          </button>
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">页面内容</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">页面是否启用<select className={`${inputClass} mt-1`} value={form.enabled ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.value === "1" }))}><option value="1">启用</option><option value="0">关闭</option></select></label>
            <label className="block text-sm font-medium">工作时间<input className={`${inputClass} mt-1`} value={form.workingHours} onChange={(e) => setForm((prev) => ({ ...prev, workingHours: e.target.value }))} /></label>
            <label className="block text-sm font-medium">页面标题<input className={`${inputClass} mt-1`} value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></label>
            <label className="block text-sm font-medium">页面副标题<input className={`${inputClass} mt-1`} value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
            <label className="block text-sm font-medium md:col-span-2">客服说明<textarea className={`${inputClass} mt-1`} rows={3} value={form.supportDescription} onChange={(e) => setForm((prev) => ({ ...prev, supportDescription: e.target.value }))} /></label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">App 下载模块</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">是否显示 App 下载模块<select className={`${inputClass} mt-1`} value={form.showAppInstall ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, showAppInstall: e.target.value === "1" }))}><option value="1">显示</option><option value="0">隐藏</option></select></label>
            <label className="block text-sm font-medium">App 下载标题<input className={`${inputClass} mt-1`} value={form.appInstallTitle} onChange={(e) => setForm((prev) => ({ ...prev, appInstallTitle: e.target.value }))} /></label>
            <label className="block text-sm font-medium md:col-span-2">App 下载说明<textarea className={`${inputClass} mt-1`} rows={3} value={form.appInstallDescription} onChange={(e) => setForm((prev) => ({ ...prev, appInstallDescription: e.target.value }))} /></label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">客服渠道列表</h2>
              <p className="text-xs text-muted-foreground">支持微信、WhatsApp、Telegram、Messenger 和自定义客服入口。</p>
            </div>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, channels: [...prev.channels, createChannel(prev.channels.length + 1)] }))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"><Plus size={14} />新增渠道</button>
          </div>
          <div className="mt-4 space-y-4">
            {channels.map((channel) => (
              <div key={channel.id} className="rounded-xl border border-border/80 bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{channel.name || "客服入口"}</p>
                  <button type="button" onClick={() => removeChannel(channel.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-secondary"><Trash2 size={13} />删除</button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select className={inputClass} value={channel.type} onChange={(e) => updateChannel(channel.id, { type: e.target.value as SupportChannelType })}>{CHANNEL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  <select className={inputClass} value={channel.enabled ? "1" : "0"} onChange={(e) => updateChannel(channel.id, { enabled: e.target.value === "1" })}><option value="1">启用</option><option value="0">关闭</option></select>
                  <input className={inputClass} value={channel.name} onChange={(e) => updateChannel(channel.id, { name: e.target.value })} placeholder="渠道名称" />
                  <input className={inputClass} type="number" value={channel.sortOrder} onChange={(e) => updateChannel(channel.id, { sortOrder: Number(e.target.value) || 0 })} placeholder="排序" />
                  <input className={inputClass} value={channel.account || ""} onChange={(e) => updateChannel(channel.id, { account: e.target.value })} placeholder="账号 / 微信号 / 手机号 / 用户名" />
                  <input className={inputClass} value={channel.linkUrl || ""} onChange={(e) => updateChannel(channel.id, { linkUrl: e.target.value })} placeholder="外部链接" />
                  <textarea className={`${inputClass} md:col-span-2`} rows={2} value={channel.description || ""} onChange={(e) => updateChannel(channel.id, { description: e.target.value })} placeholder="渠道说明" />
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {channel.qrUrl ? <img src={channel.qrUrl} alt="二维码预览" className="h-16 w-16 rounded-lg border border-border object-cover" /> : <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"><ImagePlus size={18} /></span>}
                      <input className={`${inputClass} min-w-[220px] flex-1`} value={channel.qrUrl || ""} onChange={(e) => updateChannel(channel.id, { qrUrl: e.target.value })} placeholder="二维码图片 URL" />
                      <input ref={(node) => { fileInputs.current[channel.id] = node; }} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadQr(channel.id, e.target.files?.[0])} />
                      <button type="button" onClick={() => fileInputs.current[channel.id]?.click()} disabled={uploadingId === channel.id} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">{uploadingId === channel.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}上传二维码</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}
