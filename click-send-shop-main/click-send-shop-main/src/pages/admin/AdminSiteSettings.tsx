import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";

export default function AdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: "",
    siteDescription: "",
    currency: "MYR",
    contactPhone: "",
    contactEmail: "",
    contactWhatsApp: "",
  });

  useEffect(() => {
    setLoading(true);
    fetchSiteSettings()
      .then((data: any) => {
        if (data) {
          setSettings({
            siteName: data.siteName || "",
            siteDescription: data.siteDescription || "",
            currency: data.currency || "MYR",
            contactPhone: data.contactPhone || "",
            contactEmail: data.contactEmail || "",
            contactWhatsApp: data.contactWhatsApp || "",
          });
        }
      })
      .catch(() => toast.error("加载设置失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteSettings(settings as any);
      toast.success("设置已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">站点设置</h1>
        <p className="text-sm text-muted-foreground">配置站点基本信息和联系方式</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">基本信息</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">站点名称</label>
            <input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} placeholder="Click & Send Shop" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">站点描述</label>
            <textarea rows={2} value={settings.siteDescription} onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })} placeholder="一站式购物平台" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">货币</label>
            <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
              <option value="MYR">MYR (RM)</option>
              <option value="CNY">CNY (¥)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">联系方式</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">客服电话</label>
            <input value={settings.contactPhone} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} placeholder="+60 xxx-xxxx" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">联系邮箱</label>
            <input value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} placeholder="support@example.com" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">WhatsApp</label>
            <input value={settings.contactWhatsApp} onChange={(e) => setSettings({ ...settings, contactWhatsApp: e.target.value })} placeholder="https://wa.me/60xxxxxxxxxx" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        <PermissionGate permission="settings.manage">
          <button disabled={saving} onClick={handleSave} className="flex items-center gap-1 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save size={14} /> 保存设置</>}
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}
