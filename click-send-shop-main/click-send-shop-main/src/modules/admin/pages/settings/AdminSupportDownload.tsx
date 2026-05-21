import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { uploadSingle } from "@/services/uploadService";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  CHANNEL_TYPES,
  DEFAULT_PLATFORMS,
  DEFAULT_SUPPORT_DOWNLOAD_CONFIG,
  normalizeSupportDownloadConfig,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";
import type { DownloadPlatform, SupportChannelType, SupportDownloadChannel, SupportDownloadConfig, SupportDownloadTab } from "@/types/content";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

const inputClass = "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]";

const CHANNEL_TYPE_LABELS: Record<SupportChannelType, string> = {
  wechat: "微信",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const PLATFORM_LABELS = {
  android: "安卓手机",
  ios: "苹果手机",
};

function createChannel(sortOrder: number): SupportDownloadChannel {
  return {
    id: `wechat-${Date.now()}`,
    type: "wechat",
    name: "微信客服",
    enabled: true,
    account: "",
    linkUrl: "",
    qrUrl: "",
    description: "",
    sortOrder,
  };
}

function ensureMobilePlatforms(platforms: DownloadPlatform[]): DownloadPlatform[] {
  const existing = platforms.filter((platform) => platform.type === "android" || platform.type === "ios");
  const withDefaults = ["android", "ios"].map((type) => {
    const current = existing.find((platform) => platform.type === type);
    const fallback = DEFAULT_PLATFORMS.find((platform) => platform.type === type)!;
    return current || fallback;
  });
  return withDefaults.sort((a, b) => a.sortOrder - b.sortOrder);
}

function updateInstruction(platform: DownloadPlatform, value: string): DownloadPlatform {
  return {
    ...platform,
    instructions: value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

export default function AdminSupportDownload() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupportDownloadConfig>(DEFAULT_SUPPORT_DOWNLOAD_CONFIG);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.siteSettings(),
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });

  const loading = settingsQuery.isLoading && !settingsQuery.data;

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm(parseSupportDownloadConfig(settingsQuery.data.supportDownloadConfig));
  }, [settingsQuery.data]);

  const channels = useMemo(() => [...form.support.channels].sort((a, b) => a.sortOrder - b.sortOrder), [form.support.channels]);
  const platforms = useMemo(() => ensureMobilePlatforms(form.download.platforms), [form.download.platforms]);

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
        channels: prev.support.channels
          .filter((channel) => channel.id !== id)
          .map((channel, index) => ({ ...channel, sortOrder: index + 1 })),
      },
    }));
  };

  const updatePlatform = (id: string, patch: Partial<DownloadPlatform>) => {
    setForm((prev) => {
      const nextPlatforms = ensureMobilePlatforms(prev.download.platforms).map((platform) => (
        platform.id === id ? { ...platform, ...patch } : platform
      ));
      const legacyDesktop = prev.download.platforms.filter((platform) => platform.type === "desktop").map((platform) => ({ ...platform, enabled: false }));
      return {
        ...prev,
        download: {
          ...prev.download,
          platforms: [...nextPlatforms, ...legacyDesktop],
        },
      };
    });
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
      const normalized = normalizeSupportDownloadConfig({
        ...form,
        title: form.title || "客服中心",
        subtitle: form.subtitle || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.subtitle,
        defaultTab: form.defaultTab || "support",
        support: {
          ...form.support,
          title: form.support.title || "联系客服",
        },
        download: {
          ...form.download,
          title: form.download.title || "添加到桌面",
          platforms: ensureMobilePlatforms(form.download.platforms),
        },
      });
      await updateSiteSettings({ supportDownloadConfig: JSON.stringify(normalized) });
      setForm(normalized);
      await refreshSiteInfo();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.siteSettings() });
      toast.success("客服中心配置已保存，前台将立即生效");
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
          <AdminPageTitle title="客服中心配置" hint="配置前台客服渠道与手机添加到桌面说明。" />
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            保存配置
          </button>
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">页面内容</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">页面是否启用<select className={`${inputClass} mt-1`} value={form.enabled ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.value === "1" }))}><option value="1">启用</option><option value="0">关闭</option></select></label>
            <label className="block text-sm font-medium">默认打开 Tab<select className={`${inputClass} mt-1`} value={form.defaultTab} onChange={(e) => setForm((prev) => ({ ...prev, defaultTab: e.target.value as SupportDownloadTab }))}><option value="support">联系客服</option><option value="download">添加到桌面</option></select></label>
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
              <p className="text-xs text-muted-foreground">前台只展示已启用渠道，并以渠道切换形式显示。</p>
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
                  <select className={inputClass} value={channel.type} onChange={(e) => updateChannel(channel.id, { type: e.target.value as SupportChannelType })}>{CHANNEL_TYPES.map((item) => <option key={item} value={item}>{CHANNEL_TYPE_LABELS[item]}</option>)}</select>
                  <select className={inputClass} value={channel.enabled ? "1" : "0"} onChange={(e) => updateChannel(channel.id, { enabled: e.target.value === "1" })}><option value="1">启用</option><option value="0">关闭</option></select>
                  <input className={inputClass} value={channel.name} onChange={(e) => updateChannel(channel.id, { name: e.target.value })} placeholder="渠道名称" />
                  <input className={inputClass} type="number" value={channel.sortOrder} onChange={(e) => updateChannel(channel.id, { sortOrder: Number(e.target.value) || 0 })} placeholder="排序" />
                  <input className={inputClass} value={channel.account} onChange={(e) => updateChannel(channel.id, { account: e.target.value })} placeholder="微信号 / 手机号 / Telegram 用户名" />
                  <input className={inputClass} value={channel.linkUrl} onChange={(e) => updateChannel(channel.id, { linkUrl: e.target.value })} placeholder="外部跳转链接（可选）" />
                  <textarea className={`${inputClass} md:col-span-2`} rows={2} value={channel.description} onChange={(e) => updateChannel(channel.id, { description: e.target.value })} placeholder="渠道说明" />
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {channel.qrUrl ? <img src={channel.qrUrl} alt="二维码预览" className="h-16 w-16 rounded-lg border border-border bg-white object-contain p-1" /> : <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"><ImagePlus size={18} /></span>}
                      <input className={`${inputClass} min-w-[220px] flex-1`} value={channel.qrUrl} onChange={(e) => updateChannel(channel.id, { qrUrl: e.target.value })} placeholder="二维码图片 URL" />
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
          <h2 className="font-semibold text-foreground">手机添加到桌面说明</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">添加到桌面 Tab 是否启用<select className={`${inputClass} mt-1`} value={form.download.enabled ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, download: { ...prev.download, enabled: e.target.value === "1" } }))}><option value="1">启用</option><option value="0">关闭</option></select></label>
            <label className="block text-sm font-medium">添加到桌面 Tab 标题<input className={`${inputClass} mt-1`} value={form.download.title} onChange={(e) => setForm((prev) => ({ ...prev, download: { ...prev.download, title: e.target.value } }))} /></label>
            <label className="block text-sm font-medium md:col-span-2">添加到桌面说明<textarea className={`${inputClass} mt-1`} rows={3} value={form.download.description} onChange={(e) => setForm((prev) => ({ ...prev, download: { ...prev.download, description: e.target.value } }))} /></label>
          </div>

          <div className="mt-4 space-y-4">
            {platforms.map((platform) => (
              <div key={platform.id} className="rounded-xl border border-border/80 bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{PLATFORM_LABELS[platform.type]}</p>
                  <select className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none" value={platform.enabled ? "1" : "0"} onChange={(e) => updatePlatform(platform.id, { enabled: e.target.value === "1" })}><option value="1">启用</option><option value="0">隐藏</option></select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={inputClass} value={platform.title} onChange={(e) => updatePlatform(platform.id, { title: e.target.value })} placeholder="标题" />
                  <input className={inputClass} type="number" value={platform.sortOrder} onChange={(e) => updatePlatform(platform.id, { sortOrder: Number(e.target.value) || 0 })} placeholder="排序" />
                  <input className={inputClass} value={platform.buttonText} onChange={(e) => updatePlatform(platform.id, { buttonText: e.target.value })} placeholder="按钮文案" />
                  <input className={inputClass} value={platform.description} onChange={(e) => updatePlatform(platform.id, { description: e.target.value })} placeholder="说明" />
                  <label className="block text-sm font-medium md:col-span-2">步骤说明（一行一步）<textarea className={`${inputClass} mt-1`} rows={4} value={platform.instructions.join("\n")} onChange={(e) => updatePlatform(platform.id, updateInstruction(platform, e.target.value))} /></label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}
