import { useEffect, useRef, useState } from "react";
import { Bell, ExternalLink, Grid3X3, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/api/modules/upload";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_HOME_NAV_ICON } from "@/constants/imageUploadHints";
import * as homeOpsService from "@/services/admin/homeOpsService";
import type { HomeAnnouncement, HomeNavItem } from "@/types/content";
import * as categoryService from "@/services/admin/categoryService";
import type { Category } from "@/types/category";
import { toastErrorMessage } from "@/utils/errorMessage";

type NavForm = Pick<HomeNavItem, "icon_url" | "title" | "link_url" | "sort_order" | "enabled" | "target_type" | "target_category_id">;
type AnnouncementForm = Pick<HomeAnnouncement, "title" | "content" | "link_url" | "sort_order" | "enabled"> & {
  start_at: string;
  end_at: string;
};

const emptyNavForm: NavForm = {
  icon_url: "",
  title: "",
  link_url: "",
  target_type: "url",
  target_category_id: null,
  sort_order: 0,
  enabled: true,
};
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

function flattenCategories(nodes: Category[], level = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: `${"—".repeat(level)}${level > 0 ? " " : ""}${n.icon ? `${n.icon} ` : ""}${n.name}` });
    if (n.children?.length) out.push(...flattenCategories(n.children.filter(Boolean), level + 1));
  }
  return out;
}

export default function AdminHomeOps() {
  const [navItems, setNavItems] = useState<HomeNavItem[]>([]);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [navForm, setNavForm] = useState<NavForm>(emptyNavForm);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementForm>(emptyAnnouncementForm);
  const [navIconUploading, setNavIconUploading] = useState(false);
  const navIconFileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [nav, ann, cats] = await Promise.all([
        homeOpsService.fetchHomeNavItems(),
        homeOpsService.fetchHomeAnnouncements(),
        categoryService.fetchCategories().catch(() => []),
      ]);
      setNavItems(nav);
      setAnnouncements(ann);
      setCategories(cats);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载首页运营配置失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onNavIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNavIconUploading(true);
    try {
      const { url } = await uploadFile(file);
      setNavForm((prev) => ({ ...prev, icon_url: url }));
      toast.success("图标已上传，保存导航后生效");
    } catch (err) {
      toast.error(toastErrorMessage(err, "图标上传失败"));
    } finally {
      setNavIconUploading(false);
    }
  };

  const saveNav = async () => {
    if (!navForm.title.trim()) {
      toast.error("请填写导航标题");
      return;
    }
    if (navForm.target_type === "category" && !String(navForm.target_category_id || "").trim()) {
      toast.error("请选择要跳转的分类");
      return;
    }
    setSaving(true);
    try {
      const payload: NavForm = { ...navForm };
      if (payload.target_type === "category" && payload.target_category_id) {
        payload.link_url = `/categories?cat=${payload.target_category_id}`;
      }
      if (editingNavId) await homeOpsService.updateHomeNavItem(editingNavId, payload);
      else await homeOpsService.createHomeNavItem(payload);
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

  const categoryOptions = flattenCategories(categories);
  const categoryNameMap = new Map(categoryOptions.map((c) => [c.id, c.label.replace(/^—+\s*/, "")]));

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
            <p className="text-xs text-muted-foreground">图标支持本地上传、URL、站内路径或 Emoji；排序越小越靠前</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_1fr_1.4fr_minmax(7rem,1fr)_auto_auto]">
          <label className="flex min-w-0 flex-col gap-1 md:col-span-1">
            <span className="text-[11px] font-medium text-muted-foreground">图标</span>
            <div className="flex flex-wrap items-stretch gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                placeholder="上传后自动填入，或可填 URL / 路径 / Emoji"
                value={navForm.icon_url}
                onChange={(e) => setNavForm({ ...navForm, icon_url: e.target.value })}
              />
              <input
                ref={navIconFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(ev) => void onNavIconFileChange(ev)}
              />
              <button
                type="button"
                disabled={saving || navIconUploading}
                onClick={() => navIconFileRef.current?.click()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                {navIconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                上传图片
              </button>
              <div className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-background/50 px-1 py-1" title="当前图标预览">
                <IconPreview value={navForm.icon_url} />
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">规格说明：</span>
              {IMAGE_UPLOAD_HINT_HOME_NAV_ICON}
              <span className="mt-0.5 block">{IMAGE_UPLOAD_HINT_API}</span>
            </p>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">标题</span>
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="前台展示名称" value={navForm.title} onChange={(e) => setNavForm({ ...navForm, title: e.target.value })} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">点击跳转</span>
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              value={navForm.target_type || "url"}
              onChange={(e) => {
                const next = e.target.value === "category" ? "category" : "url";
                setNavForm((prev) => ({
                  ...prev,
                  target_type: next,
                  target_category_id: next === "category" ? prev.target_category_id : null,
                }));
              }}
            >
              <option value="url">站内路径 / 外链</option>
              <option value="category">指定分类（产品分类页）</option>
            </select>
            {navForm.target_type === "category" ? (
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                value={navForm.target_category_id || ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setNavForm((prev) => ({
                    ...prev,
                    target_category_id: id,
                    link_url: id ? `/categories?cat=${id}` : prev.link_url,
                  }));
                }}
              >
                <option value="">请选择分类…</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                placeholder="/categories 或 https://..."
                value={navForm.link_url}
                onChange={(e) => setNavForm({ ...navForm, link_url: e.target.value })}
              />
            )}
            <p className="text-[10px] leading-tight text-muted-foreground">
              {navForm.target_type === "category" ? "将自动跳转到 /categories 并选中该分类" : "支持 /path 或 https://…"}
            </p>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">排序</span>
            <input
              type="number"
              title="排序：数字越小越靠前（如 0 会排在 1 前面）"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              placeholder="如 0"
              value={navForm.sort_order}
              onChange={(e) => setNavForm({ ...navForm, sort_order: Number(e.target.value) || 0 })}
            />
            <span className="text-[10px] leading-tight text-muted-foreground">数字越小越靠前</span>
          </label>
          <label className="flex cursor-pointer flex-col justify-end gap-1 pb-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">状态</span>
            <span className="flex min-h-[42px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
              <input type="checkbox" className="accent-gold" checked={navForm.enabled} onChange={(e) => setNavForm({ ...navForm, enabled: e.target.checked })} />
              启用后前台可见
            </span>
          </label>
          <div className="flex flex-col justify-end gap-1">
            <span className="text-[11px] font-medium text-muted-foreground opacity-0 select-none">操作</span>
            <PermissionGate permission="home_ops.manage">
              <button type="button" disabled={saving} onClick={() => void saveNav()} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingNavId ? <Pencil size={16} /> : <Plus size={16} />}
                {editingNavId ? "保存" : "新增"}
              </button>
            </PermissionGate>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {navItems.map((item) => (
            <div key={item.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3 ${item.enabled ? "" : "opacity-60"}`}>
              <IconPreview value={item.icon_url} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{item.title}</div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <ExternalLink size={11} />
                  {item.target_type === "category" && item.target_category_id
                    ? `分类：${categoryNameMap.get(item.target_category_id) || item.target_category_id}`
                    : (item.link_url || "无跳转链接")}
                  · 排序 {item.sort_order}
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${item.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>
                {item.enabled ? "启用" : "禁用"}
              </span>
              <PermissionGate permission="home_ops.manage">
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-gold"
                  onClick={() => {
                    setEditingNavId(item.id);
                    setNavForm({
                      icon_url: item.icon_url,
                      title: item.title,
                      link_url: item.link_url,
                      target_type: item.target_type || "url",
                      target_category_id: item.target_category_id ?? null,
                      sort_order: item.sort_order,
                      enabled: item.enabled,
                    });
                  }}
                >
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
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">公告标题</span>
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="滚动条旁或弹层展示的短标题" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">点击跳转链接（可选）</span>
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="用户点击公告后打开，如 /products 或 https://…" value={announcementForm.link_url} onChange={(e) => setAnnouncementForm({ ...announcementForm, link_url: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[11px] font-medium text-muted-foreground">公告正文</span>
            <textarea rows={3} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="详细说明、活动规则等，将展示在前台公告区域" value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">展示开始时间</span>
            <span className="text-[10px] text-muted-foreground">留空表示立即开始</span>
            <SegmentedDateTimeInput
              value={announcementForm.start_at}
              onChange={(v) => setAnnouncementForm({ ...announcementForm, start_at: v })}
              className="w-full [&>div]:rounded-xl [&>div]:border-border [&>div]:bg-background"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">展示结束时间</span>
            <span className="text-[10px] text-muted-foreground">留空表示长期有效</span>
            <SegmentedDateTimeInput
              value={announcementForm.end_at}
              onChange={(v) => setAnnouncementForm({ ...announcementForm, end_at: v })}
              className="w-full [&>div]:rounded-xl [&>div]:border-border [&>div]:bg-background"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">排序</span>
            <input
              type="number"
              title="排序：数字越小越靠前；多条公告时决定先后顺序"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              placeholder="如 0"
              value={announcementForm.sort_order}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, sort_order: Number(e.target.value) || 0 })}
            />
            <span className="text-[10px] leading-tight text-muted-foreground">多条公告时数字越小越靠前（与「0」是否为默认无关，只是排序权重）</span>
          </label>
          <div className="flex flex-col justify-end gap-2 md:flex-row md:items-end md:justify-end">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              <input type="checkbox" className="accent-gold" checked={announcementForm.enabled} onChange={(e) => setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })} />
              <span>
                <span className="font-medium">启用</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">关闭后前台不展示该条</span>
              </span>
            </label>
            <PermissionGate permission="home_ops.manage">
              <button type="button" disabled={saving} onClick={() => void saveAnnouncement()} className="inline-flex min-h-[42px] min-w-[5.5rem] items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
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
