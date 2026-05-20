import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { uploadSingle } from "@/services/uploadService";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { DownloadPlatform, DownloadPlatformType, SupportChannelType, SupportDownloadChannel, SupportDownloadConfig, SupportDownloadTab } from "@/types/content";

type LegacySupportDownloadConfig = Partial<SupportDownloadConfig> & {
  workingHours?: string;
  supportDescription?: string;
  showAppInstall?: boolean;
  appInstallTitle?: string;
  appInstallDescription?: string;
  channels?: Array<Partial<SupportDownloadChannel> & { type?: string }>;
};

const CHANNEL_TYPES: Array<{ value: SupportChannelType; label: string }> = [
  { value: "wechat", label: "微信" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
];

const PLATFORM_TYPES: Array<{ value: DownloadPlatformType; label: string }> = [
  { value: "desktop", label: "电脑端" },
  { value: "android", label: "安卓端" },
  { value: "ios", label: "苹果端" },
];

const DEFAULT_PLATFORMS: DownloadPlatform[] = [
  {
    id: "desktop",
    type: "desktop",
    enabled: true,
    title: "电脑端",
    description: "使用 Chrome 或 Edge 打开商城，可把商城添加到桌面快速访问。",
    buttonText: "添加到电脑桌面",
    instructions: ["使用 Chrome / Edge 打开商城。", "点击地址栏安装图标，或从浏览器菜单选择安装应用。", "按系统提示确认即可添加到桌面。"],
    sortOrder: 1,
  },
  {
    id: "android",
    type: "android",
    enabled: true,
    title: "安卓端",
    description: "安卓手机可直接安装到桌面，像 App 一样打开商城。",
    buttonText: "立即安装到桌面",
    instructions: ["使用 Chrome 打开商城。", "点击立即安装，或从浏览器菜单选择添加到主屏幕。", "按系统提示确认安装。"],
    sortOrder: 2,
  },
  {
    id: "ios",
    type: "ios",
    enabled: true,
    title: "苹果端",
    description: "iPhone 需要通过 Safari 手动添加到主屏幕。",
    buttonText: "",
    instructions: ["点击 Safari 底部分享按钮。", "选择“添加到主屏幕”。", "点击“添加”完成安装。"],
    sortOrder: 3,
  },
];

const DEFAULT_CONFIG: SupportDownloadConfig = {
  enabled: true,
  title: "客服下载",
  subtitle: "联系客服或把商城安装到桌面",
  defaultTab: "support",
  support: {
    enabled: true,
    title: "客服",
    description: "如需咨询商品、订单、售后或安装问题，请通过下方入口联系官方客服。",
    workingHours: "工作日 09:00 - 18:00",
    channels: [
      { id: "wechat", type: "wechat", name: "微信客服", enabled: true, account: "", linkUrl: "", qrUrl: "", description: "复制微信号后在微信内搜索添加，或扫码添加。", sortOrder: 1 },
      { id: "whatsapp", type: "whatsapp", name: "WhatsApp 客服", enabled: true, account: "", linkUrl: "", qrUrl: "", description: "点击按钮即可跳转 WhatsApp 咨询。", sortOrder: 2 },
      { id: "telegram", type: "telegram", name: "Telegram 客服", enabled: false, account: "", linkUrl: "", qrUrl: "", description: "点击按钮即可跳转 Telegram 咨询。", sortOrder: 3 },
    ],
  },
  download: {
    enabled: true,
    title: "下载",
    description: "选择适合你的设备，把商城添加到桌面使用。",
    platforms: DEFAULT_PLATFORMS,
  },
};

const inputClass = "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]";

function trim(value?: string) {
  return String(value || "").trim();
}

function normalizeChannel(channel: Partial<SupportDownloadChannel> & { type?: string }, index: number): SupportDownloadChannel | null {
  const type = CHANNEL_TYPES.some((item) => item.value === channel.type) ? (channel.type as SupportChannelType) : null;
  if (!type) return null;
  return {
    id: trim(channel.id) || `${type}-${Date.now()}-${index}`,
    type,
    name: trim(channel.name) || CHANNEL_TYPES.find((item) => item.value === type)?.label || "客服入口",
    enabled: channel.enabled !== false,
    account: trim(channel.account),
    linkUrl: trim(channel.linkUrl),
    qrUrl: trim(channel.qrUrl),
    description: trim(channel.description),
    sortOrder: Number(channel.sortOrder) || index + 1,
  };
}

function normalizePlatform(platform: Partial<DownloadPlatform> & { type?: string }, index: number): DownloadPlatform | null {
  const type = PLATFORM_TYPES.some((item) => item.value === platform.type) ? (platform.type as DownloadPlatformType) : null;
  if (!type) return null;
  const fallback = DEFAULT_PLATFORMS.find((item) => item.type === type)!;
  return {
    id: trim(platform.id) || type,
    type,
    enabled: platform.enabled !== false,
    title: trim(platform.title) || fallback.title,
    description: trim(platform.description) || fallback.description,
    buttonText: trim(platform.buttonText) || fallback.buttonText,
    instructions: Array.isArray(platform.instructions) && platform.instructions.length > 0 ? platform.instructions.map(trim).filter(Boolean) : fallback.instructions,
    sortOrder: Number(platform.sortOrder) || index + 1,
  };
}

function normalizeConfig(config: LegacySupportDownloadConfig): SupportDownloadConfig {
  const legacyChannels = Array.isArray(config.channels) ? config.channels : undefined;
  const rawChannels = Array.isArray(config.support?.channels) ? config.support.channels : legacyChannels;
  const channels = rawChannels?.map(normalizeChannel).filter((item): item is SupportDownloadChannel => Boolean(item));
  const rawPlatforms = Array.isArray(config.download?.platforms) ? config.download.platforms : undefined;
  const platforms = rawPlatforms?.map(normalizePlatform).filter((item): item is DownloadPlatform => Boolean(item));

  return {
    enabled: config.enabled !== false,
    title: trim(config.title) || DEFAULT_CONFIG.title,
    subtitle: trim(config.subtitle) || DEFAULT_CONFIG.subtitle,
    defaultTab: config.defaultTab === "download" ? "download" : "support",
    support: {
      enabled: config.support?.enabled !== false,
      title: trim(config.support?.title) || DEFAULT_CONFIG.support.title,
      description: trim(config.support?.description ?? config.supportDescription) || DEFAULT_CONFIG.support.description,
      workingHours: trim(config.support?.workingHours ?? config.workingHours),
      channels: channels?.length ? channels.sort((a, b) => a.sortOrder - b.sortOrder) : DEFAULT_CONFIG.support.channels,
    },
    download: {
      enabled: config.download?.enabled !== false && config.showAppInstall !== false,
      title: trim(config.download?.title ?? config.appInstallTitle) || DEFAULT_CONFIG.download.title,
      description: trim(config.download?.description ?? config.appInstallDescription) || DEFAULT_CONFIG.download.description,
      platforms: platforms?.length ? platforms.sort((a, b) => a.sortOrder - b.sortOrder) : DEFAULT_PLATFORMS,
    },
  };
}

function parseConfig(raw?: string): SupportDownloadConfig {
  if (!raw?.trim()) return DEFAULT_CONFIG;
  try {
    return normalizeConfig(JSON.parse(raw) as LegacySupportDownloadConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function createChannel(sortOrder: number): SupportDownloadChannel {
  return { id: `wechat-${Date.now()}`, type: "wechat", name: "微信客服", enabled: true, account: "", linkUrl: "", qrUrl: "", description: "", sortOrder };
}

function updateInstruction(platform: DownloadPlatform, value: string): DownloadPlatform {
  return {
    ...platform,
    instructions: value
      .split("\n")
      .map(trim)
      .filter(Boolean),
  };
}

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

  const channels = useMemo(() => [...form.support.channels].sort((a, b) => a.sortOrder - b.sortOrder), [form.support.channels]);
  const platforms = useMemo(() => [...form.download.platforms].sort((a, b) => a.sortOrder - b.sortOrder), [form.download.platforms]);

  const updateChannel = (id: string, patch: Partial<SupportDownloadChannel>) => {
    setForm((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        channels: prev.support.channels.map((channel) => (channel.id === id ? { ...channel, ...patch } : channel)),
      },
    }));
  };

  const removeChannel = (id: string) => {
    setForm((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        channels: prev.support.channels.filter((channel) => channel.id !== id).map((channel, index) => ({ ...channel, sortOrder: index + 1 })),
      },
    }));
  };

  const updatePlatform = (id: string, patch: Partial<DownloadPlatform>) => {
    setForm((prev) => ({
      ...prev,
      download: {
        ...prev.download,
        platforms: prev.download.platforms.map((platform) => (platform.id === id ? { ...platform, ...patch } : platform)),
      },
    }));
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
            <AdminPageTitle
              title="客服下载"
              hint="配置前台 /support-download 的客服二维码、外部 App 跳转和三端下载说明。"
            />
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
            <label className="block text-sm font-medium">默认打开 Tab<select className={`${inputClass} mt-1`} value={form.defaultTab} onChange={(e) => setForm((prev) => ({ ...prev, defaultTab: e.target.value as SupportDownloadTab }))}><option value="support">客服</option><option value="download">下载</option></select></label>
            <label className="block text-sm font-medium">页面标题<input className={`${inputClass} mt-1`} value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></label>
            <label className="block text-sm font-medium">页面副标题<input className={`${inputClass} mt-1`} value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">客服配置</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">客服 Tab 标题<input className={`${inputClass} mt-1`} value={form.support.title} onChange={(e) => setForm((prev) => ({ ...prev, support: { ...prev.support, title: e.target.value } }))} /></label>
            <label className="block text-sm font-medium">工作时间<input className={`${inputClass} mt-1`} value={form.support.workingHours} onChange={(e) => setForm((prev) => ({ ...prev, support: { ...prev.support, workingHours: e.target.value } }))} /></label>
            <label className="block text-sm font-medium md:col-span-2">客服说明<textarea className={`${inputClass} mt-1`} rows={3} value={form.support.description} onChange={(e) => setForm((prev) => ({ ...prev, support: { ...prev.support, description: e.target.value } }))} /></label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">客服渠道列表</h2>
              <p className="text-xs text-muted-foreground">只支持微信、WhatsApp、Telegram 三种客服入口。</p>
            </div>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, support: { ...prev.support, channels: [...prev.support.channels, createChannel(prev.support.channels.length + 1)] } }))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"><Plus size={14} />新增渠道</button>
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
                  <input className={inputClass} value={channel.account || ""} onChange={(e) => updateChannel(channel.id, { account: e.target.value })} placeholder="微信号 / 手机号 / Telegram 用户名" />
                  <input className={inputClass} value={channel.linkUrl || ""} onChange={(e) => updateChannel(channel.id, { linkUrl: e.target.value })} placeholder="外部跳转链接（可选）" />
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

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">下载配置</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">下载 Tab 是否启用<select className={`${inputClass} mt-1`} value={form.download.enabled ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, download: { ...prev.download, enabled: e.target.value === "1" } }))}><option value="1">启用</option><option value="0">关闭</option></select></label>
            <label className="block text-sm font-medium">下载 Tab 标题<input className={`${inputClass} mt-1`} value={form.download.title} onChange={(e) => setForm((prev) => ({ ...prev, download: { ...prev.download, title: e.target.value } }))} /></label>
            <label className="block text-sm font-medium md:col-span-2">下载说明<textarea className={`${inputClass} mt-1`} rows={3} value={form.download.description} onChange={(e) => setForm((prev) => ({ ...prev, download: { ...prev.download, description: e.target.value } }))} /></label>
          </div>

          <div className="mt-4 space-y-4">
            {platforms.map((platform) => (
              <div key={platform.id} className="rounded-xl border border-border/80 bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{PLATFORM_TYPES.find((item) => item.value === platform.type)?.label}</p>
                  <select className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none" value={platform.enabled ? "1" : "0"} onChange={(e) => updatePlatform(platform.id, { enabled: e.target.value === "1" })}><option value="1">启用</option><option value="0">隐藏</option></select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={inputClass} value={platform.title} onChange={(e) => updatePlatform(platform.id, { title: e.target.value })} placeholder="标题" />
                  <input className={inputClass} type="number" value={platform.sortOrder} onChange={(e) => updatePlatform(platform.id, { sortOrder: Number(e.target.value) || 0 })} placeholder="排序" />
                  <input className={inputClass} value={platform.buttonText} onChange={(e) => updatePlatform(platform.id, { buttonText: e.target.value })} placeholder={platform.type === "ios" ? "苹果端可留空" : "按钮文案"} />
                  <input className={inputClass} value={platform.description} onChange={(e) => updatePlatform(platform.id, { description: e.target.value })} placeholder="说明" />
                  <label className="block text-sm font-medium md:col-span-2">步骤说明（一行一步）<textarea className={`${inputClass} mt-1`} rows={3} value={platform.instructions.join("\n")} onChange={(e) => updatePlatform(platform.id, updateInstruction(platform, e.target.value))} /></label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}
