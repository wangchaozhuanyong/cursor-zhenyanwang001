import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  ExternalLink,
  Grid3X3,
  LayoutGrid,
  Loader2,
  Pencil,
  Sparkles,
  ToggleLeft,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminHomeOpsDisplayPanel from "./homeOps/AdminHomeOpsDisplayPanel";
import AdminHomeOpsModulePanel from "./homeOps/AdminHomeOpsModulePanel";
import AdminHomeOpsNewArrivalPanel from "./homeOps/AdminHomeOpsNewArrivalPanel";
import { toast } from "sonner";
import * as uploadService from "@/services/uploadService";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import PermissionGate from "@/components/admin/PermissionGate";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_HOME_NAV_ICON } from "@/constants/imageUploadHints";
import * as homeOpsService from "@/services/admin/homeOpsService";
import type { HomeNavItem } from "@/types/content";
import * as categoryService from "@/services/admin/categoryService";
import { THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";
import type { Category } from "@/types/category";
import { toastErrorMessage } from "@/utils/errorMessage";
import { LoadingButton } from "@/modules/micro-interactions";
import { validateUploadFile } from "@/services/uploadService";
import { hasTransparentPixels } from "@/utils/imageTransparency";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

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
    out.push({ id: n.id, label: `${"--".repeat(level)}${level > 0 ? " " : ""}${n.icon ? `${n.icon} ` : ""}${n.name}` });
    if (n.children?.length) out.push(...flattenCategories(n.children.filter(Boolean), level + 1));
  }
  return out;
}

type HomeOpsTab = "modules" | "display" | "nav" | "newArrival";

const HOME_OPS_TABS: { id: HomeOpsTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "modules", label: "模块开关", icon: ToggleLeft, desc: "管理首页模块的启用、禁用和顺序" },
  { id: "display", label: "展示设置", icon: LayoutGrid, desc: "设置首页展示规则与数量" },
  { id: "nav", label: "金刚区导航", icon: Grid3X3, desc: "维护图标、标题、跳转方式和排序" },
  { id: "newArrival", label: "新品主推设置", icon: Sparkles, desc: "配置新品专区的展示内容" },
];

export default function AdminHomeOps() {
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<HomeOpsTab>("modules");
  const [saving, setSaving] = useState(false);
  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [navForm, setNavForm] = useState<NavForm>(emptyNavForm);
  const [navIconUploading, setNavIconUploading] = useState(false);
  const navIconFileRef = useRef<HTMLInputElement>(null);

  const homeOpsQuery = useQuery({
    queryKey: adminQueryKeys.homeOpsNav(),
    queryFn: async () => {
      const [nav, cats] = await Promise.all([
        homeOpsService.fetchHomeNavItems(),
        categoryService.fetchCategories().catch(() => [] as Category[]),
      ]);
      return { nav, categories: cats };
    },
    staleTime: 60_000,
  });

  const navItems = homeOpsQuery.data?.nav ?? [];
  const categories = homeOpsQuery.data?.categories ?? [];
  const loading = homeOpsQuery.isLoading && !homeOpsQuery.data;

  const invalidateHomeOps = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.homeOpsNav() });

  const onNavIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNavIconUploading(true);
    try {
      validateUploadFile(file, "thumb");
      const transparent = await hasTransparentPixels(file);
      if (!transparent) {
        toast.error("图标缺少透明通道，建议上传透明 PNG 或 WebP。");
        return;
      }
      const { url } = await uploadService.uploadSingleWithProgress(file, { mode: "thumb", timeoutMs: 45000 });
      setNavForm((prev) => ({ ...prev, icon_url: url }));
      toast.success("图标上传成功，请保存生效。");
    } catch (err) {
      toast.error(toastErrorMessage(err, "图标上传失败"));
    } finally {
      setNavIconUploading(false);
    }
  };

  const saveNav = async () => {
    if (!navForm.title.trim()) {
      toast.error("请填写标题");
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
      toast.success(editingNavId ? "导航已更新" : "导航已新增");
      setEditingNavId(null);
      setNavForm(emptyNavForm);
      await invalidateHomeOps();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存导航失败"));
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = flattenCategories(categories);
  const categoryNameMap = new Map(categoryOptions.map((c) => [c.id, c.label]));

  return (
    <div className="space-y-6">
      <div>
        <AdminPageTitle
          title={<Tx>首页运营</Tx>}
          hint={<Tx>统一管理模块开关、展示设置、金刚区导航和新品主推设置。</Tx>}
        />
      </div>
      <div className="space-y-4">
        <nav
          className="flex flex-wrap gap-2 border-b border-border pb-3"
          aria-label="首页运营分区"
        >
          {HOME_OPS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-gold/40 bg-gold/10 text-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-gold/25 hover:bg-secondary/50",
                )}
              >
                <Icon size={16} className={active ? "text-theme-price" : ""} />
                {tab.label}
                <AdminFieldHint text={tab.desc} />
              </button>
            );
          })}
        </nav>
        <div className="min-w-0">
          {activeTab === "modules" ? <AdminHomeOpsModulePanel /> : null}
          {activeTab === "display" ? <AdminHomeOpsDisplayPanel /> : null}
          {activeTab === "newArrival" ? <AdminHomeOpsNewArrivalPanel /> : null}
          {activeTab === "nav" ? (
            <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
              <div className="mb-4 flex items-center gap-2">
                <Grid3X3 size={18} className="text-theme-price" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground"><Tx>金刚区导航</Tx></h2>
                    <AdminFieldHint text={<Tx>配置图标、标题、跳转方式、排序和启用状态。</Tx>} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_1fr_1.4fr_minmax(7rem,1fr)_auto_auto]">
                <label className="flex min-w-0 flex-col gap-1 md:col-span-1">
                  <span className="text-[11px] font-medium text-muted-foreground"><Tx>图标</Tx></span>
                  <div className="flex flex-wrap items-stretch gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                      placeholder="支持图片 URL、站内路径或 Emoji"
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
                      上传
                    </button>
                    <div className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-background/50 px-1 py-1" title="图标预览">
                      <IconPreview value={navForm.icon_url} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <AdminFieldHint
                      contentClassName="max-w-sm"
                      text={<>{IMAGE_UPLOAD_HINT_HOME_NAV_ICON} {IMAGE_UPLOAD_HINT_API}</>}
                    />
                  </div>
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground"><Tx>标题</Tx></span>
                  <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" placeholder="导航标题" value={navForm.title} onChange={(e) => setNavForm({ ...navForm, title: e.target.value })} />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground"><Tx>跳转方式</Tx></span>
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
                    <option value="url"><Tx>URL / 站内路径</Tx></option>
                    <option value="category"><Tx>分类页</Tx></option>
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
                      <option value=""><Tx>请选择分类</Tx></option>
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
                  <div className="flex justify-end">
                    <AdminFieldHint text={navForm.target_type === "category" ? "将自动跳转到对应分类页" : "支持站内路径和完整 URL"} />
                  </div>
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground"><Tx>排序</Tx></span>
                  <input
                    type="number"
                    title="排序值越小越靠前，默认 0"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                    placeholder="默认 0"
                    value={navForm.sort_order}
                    onChange={(e) => setNavForm({ ...navForm, sort_order: Number(e.target.value) || 0 })}
                  />
                  <div className="flex justify-end">
                    <AdminFieldHint text={<Tx>建议从 0 开始递增</Tx>} />
                  </div>
                </label>
                <label className="flex cursor-pointer flex-col justify-end gap-1 pb-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground"><Tx>状态</Tx></span>
                  <span className="flex min-h-[42px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
                    <input type="checkbox" className="accent-gold" checked={navForm.enabled} onChange={(e) => setNavForm({ ...navForm, enabled: e.target.checked })} />
                    <Tx>{navForm.enabled ? "启用" : "禁用"}</Tx>
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
                      onClick={() => adminConfirmSave(confirm, editingNavId ? "保存导航修改" : "新增导航", () => saveNav())}
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
                      <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink size={11} className="shrink-0" />
                        <AdminTableCell
                          value={
                            item.target_type === "category" && item.target_category_id
                              ? `分类：${categoryNameMap.get(item.target_category_id) || item.target_category_id}`
                              : (item.link_url || "未设置跳转")
                          }
                          fullText={[
                            item.target_type === "category" && item.target_category_id
                              ? `分类：${categoryNameMap.get(item.target_category_id) || item.target_category_id}`
                              : (item.link_url || "未设置跳转"),
                            `排序 ${item.sort_order}`,
                          ].join("\n")}
                          maxWidth="100%"
                          muted
                        />
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.enabled ? THEME_BADGE_SUCCESS : THEME_BADGE_MUTED}`}>
                      {item.enabled ? "启用" : "禁用"}
                    </span>
                    <PermissionGate permission="home_ops.manage">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-theme-price"
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
                      <button
                        type="button"
                        className={`rounded-lg p-2 text-muted-foreground hover:bg-secondary ${THEME_HOVER_TEXT_DANGER}`}
                        onClick={() =>
                          adminConfirmDelete(confirm, item.title || "该导航", async () => {
                            try {
                              await homeOpsService.deleteHomeNavItem(item.id);
                              await invalidateHomeOps();
                              toast.success("已删除");
                            } catch (e) {
                              toast.error(toastErrorMessage(e, "删除失败"));
                            }
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </PermissionGate>
                  </div>
                ))}
                {navItems.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无金刚区导航</Tx></div>}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function IconPreview({ value }: { value: string }) {
  const v = value.trim();
  if (!v) return <div className="flex h-12 w-12 items-center justify-center text-muted-foreground"><Tx>无图标</Tx></div>;
  if (v.startsWith("http") || v.startsWith("/")) {
    return <img src={v} alt="" className="h-12 w-12 object-contain object-center" />;
  }
  return <div className="flex h-12 w-12 items-center justify-center text-xl leading-none">{v.slice(0, 2)}</div>;
}

