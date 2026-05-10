import { useEffect, useState } from "react";
import { Bell, ExternalLink, Grid3X3, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as homeOpsService from "@/services/admin/homeOpsService";
import type { HomeAnnouncement, HomeNavItem } from "@/types/content";
import { toastErrorMessage } from "@/utils/errorMessage";

type NavForm = Pick<HomeNavItem, "icon_url" | "title" | "link_url" | "sort_order" | "enabled">;
type AnnouncementForm = Pick<HomeAnnouncement, "title" | "content" | "link_url" | "sort_order" | "enabled"> & {
  start_at: string;
  end_at: string;
};

const emptyNavForm: NavForm = { icon_url: "", title: "", link_url: "", sort_order: 0, enabled: true };
const emptyAnnouncementForm: AnnouncementForm = {
  title: "",
  content: "",
  link_url: "",
  sort_order: 0,
  enabled: true,
  start_at: "",
  end_at: "",
};

function toLocalInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminHomeOps() {
  const [navItems, setNavItems] = useState<HomeNavItem[]>([]);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [navForm, setNavForm] = useState<NavForm>(emptyNavForm);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementForm>(emptyAnnouncementForm);

  const reload = async () => {
    setLoading(true);
    try {
      const [nav, ann] = await Promise.all([
        homeOpsService.fetchHomeNavItems(),
        homeOpsService.fetchHomeAnnouncements(),
      ]);
      setNavItems(nav);
      setAnnouncements(ann);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载首页运营配置失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const saveNav = async () => {
    if (!navForm.title.trim()) {
      toast.error("请填写导航标题");
      return;
    }
    setSaving(true);
    try {
      if (editingNavId) await homeOpsService.updateHomeNavItem(editingNavId, navForm);
      else await homeOpsService.createHomeNavItem(navForm);
      toast.success(editingNavId ? "金刚区导航已更新" : "金刚区导航已创建");
      setEditingNavId(null);
      setNavForm(emptyNavForm);
      await reload();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存金刚区导航失败"));
    } finally {
      setSaving(false);
    }
  };

  const saveAnnouncement = async () => {
    if (!announcementForm.title.trim() && !announcementForm.content.trim()) {
      toast.error("公告标题或内容至少填写一项");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...announcementForm,
        start_at: announcementForm.start_at || null,
        end_at: announcementForm.end_at || null,
      };
      if (editingAnnouncementId) await homeOpsService.updateHomeAnnouncement(editingAnnouncementId, payload);
      else await homeOpsService.createHomeAnnouncement(payload);
      toast.success(editingAnnouncementId ? "公告已更新" : "公告已创建");
      setEditingAnnouncementId(null);
      setAnnouncementForm(emptyAnnouncementForm);
      await reload();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存公告失败"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">首页运营配置</h1>
        <p className="text-sm text-muted-foreground">配置前台首页金刚区导航和公告栏展示</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Grid3X3 size={18} className="text-gold" />
          <div>
            <h2 className="font-semibold text-foreground">金刚区导航</h2>
            <p className="text-xs text-muted-foreground">图标支持 URL、站内上传路径或 Emoji，排序越小越靠前</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_100px_100px_auto]">
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="图标 URL / Emoji" value={navForm.icon_url} onChange={(e) => setNavForm({ ...navForm, icon_url: e.target.value })} />
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="标题" value={navForm.title} onChange={(e) => setNavForm({ ...navForm, title: e.target.value })} />
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="跳转链接，如 /categories 或 https://..." value={navForm.link_url} onChange={(e) => setNavForm({ ...navForm, link_url: e.target.value })} />
          <input type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="排序" value={navForm.sort_order} onChange={(e) => setNavForm({ ...navForm, sort_order: Number(e.target.value) || 0 })} />
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={navForm.enabled} onChange={(e) => setNavForm({ ...navForm, enabled: e.target.checked })} />
            启用
          </label>
          <PermissionGate permission="home_ops.manage">
            <button type="button" disabled={saving} onClick={() => void saveNav()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingNavId ? <Pencil size={16} /> : <Plus size={16} />}
              {editingNavId ? "保存" : "新增"}
            </button>
          </PermissionGate>
        </div>

        <div className="mt-4 space-y-2">
          {navItems.map((item) => (
            <div key={item.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3 ${item.enabled ? "" : "opacity-60"}`}>
              <IconPreview value={item.icon_url} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{item.title}</div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <ExternalLink size={11} /> {item.link_url || "无跳转链接"} · 排序 {item.sort_order}
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${item.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>
                {item.enabled ? "启用" : "禁用"}
              </span>
              <PermissionGate permission="home_ops.manage">
                <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-gold" onClick={() => { setEditingNavId(item.id); setNavForm({ icon_url: item.icon_url, title: item.title, link_url: item.link_url, sort_order: item.sort_order, enabled: item.enabled }); }}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive" onClick={() => void homeOpsService.deleteHomeNavItem(item.id).then(reload).then(() => toast.success("已删除")).catch((e) => toast.error(toastErrorMessage(e, "删除失败")))}>
                  <Trash2 size={15} />
                </button>
              </PermissionGate>
            </div>
          ))}
          {navItems.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">暂无金刚区导航</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Bell size={18} className="text-gold" />
          <div>
            <h2 className="font-semibold text-foreground">公告栏配置</h2>
            <p className="text-xs text-muted-foreground">可设置展示时间窗口，前台只展示启用且在有效期内的公告</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="公告标题" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
          <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="跳转链接" value={announcementForm.link_url} onChange={(e) => setAnnouncementForm({ ...announcementForm, link_url: e.target.value })} />
          <textarea rows={3} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold md:col-span-2" placeholder="公告内容" value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} />
          <input type="datetime-local" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" value={announcementForm.start_at} onChange={(e) => setAnnouncementForm({ ...announcementForm, start_at: e.target.value })} />
          <input type="datetime-local" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" value={announcementForm.end_at} onChange={(e) => setAnnouncementForm({ ...announcementForm, end_at: e.target.value })} />
          <input type="number" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="排序" value={announcementForm.sort_order} onChange={(e) => setAnnouncementForm({ ...announcementForm, sort_order: Number(e.target.value) || 0 })} />
          <div className="flex gap-3">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={announcementForm.enabled} onChange={(e) => setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })} />
              启用
            </label>
            <PermissionGate permission="home_ops.manage">
              <button type="button" disabled={saving} onClick={() => void saveAnnouncement()} className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingAnnouncementId ? <Pencil size={16} /> : <Plus size={16} />}
                {editingAnnouncementId ? "保存" : "新增"}
              </button>
            </PermissionGate>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {announcements.map((item) => (
            <div key={item.id} className={`rounded-xl border border-border bg-background p-3 ${item.enabled ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{item.title || "无标题公告"}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.content || "无内容"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    排序 {item.sort_order} · {item.link_url || "无跳转链接"} · {item.start_at ? new Date(item.start_at).toLocaleString("zh-CN") : "不限开始"} ~ {item.end_at ? new Date(item.end_at).toLocaleString("zh-CN") : "不限结束"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${item.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>
                  {item.enabled ? "启用" : "禁用"}
                </span>
                <PermissionGate permission="home_ops.manage">
                  <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-gold" onClick={() => { setEditingAnnouncementId(item.id); setAnnouncementForm({ title: item.title, content: item.content, link_url: item.link_url, sort_order: item.sort_order, enabled: item.enabled, start_at: toLocalInputValue(item.start_at), end_at: toLocalInputValue(item.end_at) }); }}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive" onClick={() => void homeOpsService.deleteHomeAnnouncement(item.id).then(reload).then(() => toast.success("已删除")).catch((e) => toast.error(toastErrorMessage(e, "删除失败")))}>
                    <Trash2 size={15} />
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
          {announcements.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">暂无公告</div>}
        </div>
      </section>
    </div>
  );
}

function IconPreview({ value }: { value: string }) {
  const v = value.trim();
  if (!v) return <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">图</div>;
  if (v.startsWith("http") || v.startsWith("/")) {
    return <img src={v} alt="" className="h-11 w-11 rounded-xl object-cover" />;
  }
  return <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-lg">{v.slice(0, 2)}</div>;
}
