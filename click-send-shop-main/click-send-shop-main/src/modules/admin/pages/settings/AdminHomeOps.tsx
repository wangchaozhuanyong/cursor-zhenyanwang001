import { useEffect, useRef, useState } from "react";
import { ExternalLink, Grid3X3, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as uploadService from "@/services/uploadService";
import PermissionGate from "@/components/admin/PermissionGate";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_HOME_NAV_ICON } from "@/constants/imageUploadHints";
import * as homeOpsService from "@/services/admin/homeOpsService";
import type { HomeNavItem } from "@/types/content";
import * as categoryService from "@/services/admin/categoryService";
import type { Category } from "@/types/category";
import { toastErrorMessage } from "@/utils/errorMessage";
import { LoadingButton } from "@/modules/micro-interactions";
import { validateUploadFile } from "@/api/modules/upload";

type NavForm = Pick<HomeNavItem, "icon_url" | "title" | "link_url" | "sort_order" | "enabled" | "target_type" | "target_category_id">;

const emptyNavForm: NavForm = {
  icon_url: "",
  title: "",
  link_url: "",
  target_type: "url",
  target_category_id: null,
  sort_order: 0,
  enabled: true,
};

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [navForm, setNavForm] = useState<NavForm>(emptyNavForm);
  const [navIconUploading, setNavIconUploading] = useState(false);
  const navIconFileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [nav, cats] = await Promise.all([
        homeOpsService.fetchHomeNavItems(),
        categoryService.fetchCategories().catch(() => []),
      ]);
      setNavItems(nav);
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
      validateUploadFile(file, "thumb");
      const { url } = await uploadService.uploadSingleWithProgress(file, { mode: "thumb", timeoutMs: 45000 });
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

  const categoryOptions = flattenCategories(categories);
  const categoryNameMap = new Map(categoryOptions.map((c) => [c.id, c.label.replace(/^—+\s*/, "")]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">首页运营配置</h1>
        <p className="text-sm text-muted-foreground">配置前台首页金刚区导航展示</p>
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
              <LoadingButton
                type="button"
                variant="gold"
                state={saving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => void saveNav()}
                className="inline-flex h-[42px] rounded-xl px-4 text-sm font-bold"
              >
                {editingNavId ? "保存" : "新增"}
              </LoadingButton>
            </PermissionGate>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="skeleton-base skeleton-shimmer h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-base skeleton-shimmer h-4 w-28 rounded" />
                    <div className="skeleton-base skeleton-shimmer h-3 w-48 rounded" />
                  </div>
                  <div className="skeleton-base skeleton-shimmer h-6 w-12 rounded-full" />
                </div>
              ))
            : null}
          {!loading && navItems.map((item) => (
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
