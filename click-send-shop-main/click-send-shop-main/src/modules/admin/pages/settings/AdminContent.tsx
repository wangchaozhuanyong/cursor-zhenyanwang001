import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Edit2, Shield, HelpCircle, Plus, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown, LogIn, ExternalLink } from "lucide-react";
import { LoadingButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { createContentPage, fetchContentPages, updateContentPage } from "@/services/admin/contentService";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { HelpCenterConfig } from "@/types/content";
import {
  buildDefaultHelpCenterConfig,
  normalizeHelpCenterConfig,
} from "@/constants/helpCenterConfig";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { AdminContentPageSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}

/** 登录页、Cookie、页脚引用的政策页 slug（列表置顶） */
const LOGIN_POLICY_SLUGS = ["terms-of-service", "privacy-policy"] as const;

const DEFAULT_POLICY_PATHS = {
  termsPath: "/content/terms-of-service",
  privacyPolicyPath: "/content/privacy-policy",
};

export default function AdminContent() {
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [createForm, setCreateForm] = useState({
    title: "",
    slug: "",
    content: "",
    publish_status: "published" as "published" | "draft",
    sort_order: "",
  });
  const [saving, setSaving] = useState(false);
  const [helpForm, setHelpForm] = useState<HelpCenterConfig>(buildDefaultHelpCenterConfig());
  const [helpSaving, setHelpSaving] = useState(false);
  const [helpJson, setHelpJson] = useState("");
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>({});
  const [dragCatId, setDragCatId] = useState<string>("");
  const [dragFaqId, setDragFaqId] = useState<string>("");
  const [policyPaths, setPolicyPaths] = useState(DEFAULT_POLICY_PATHS);

  const contentQuery = useQuery({
    queryKey: adminQueryKeys.contentHub(),
    queryFn: async () => {
      const [pages, settings] = await Promise.all([fetchContentPages(), fetchSiteSettings()]);
      return { pages: pages as ContentItem[], settings };
    },
    staleTime: 60_000,
  });

  const items = useMemo(() => contentQuery.data?.pages ?? [], [contentQuery.data?.pages]);
  const loading = contentQuery.isLoading && !contentQuery.data;

  const invalidateContent = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.contentHub() });

  useEffect(() => {
    if (!contentQuery.data) return;
    const { settings } = contentQuery.data;
    setPolicyPaths({
      termsPath: settings.termsPath?.trim() || DEFAULT_POLICY_PATHS.termsPath,
      privacyPolicyPath: settings.privacyPolicyPath?.trim() || DEFAULT_POLICY_PATHS.privacyPolicyPath,
    });
    const parsed = parseHelpConfig(settings.helpCenterConfig);
    setHelpForm(parsed);
    setHelpJson(JSON.stringify(parsed, null, 2));
  }, [contentQuery.data]);

  const handleSave = async () => {
    if (!form.title || !form.content || !editing) {
      toast.error("请填写完整");
      return;
    }
    setSaving(true);
    try {
      await updateContentPage(editing.id, { title: form.title, content: form.content });
      toast.success("内容已更新");
      setShowForm(false);
      setEditing(null);
      await invalidateContent();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHelp = async () => {
    setHelpSaving(true);
    try {
      const normalized = normalizeHelpCenterConfig(helpForm);
      const payload = JSON.stringify(normalized);
      await updateSiteSettings({ helpCenterConfig: payload });
      await refreshSiteInfo();
      setHelpForm(normalized);
      setHelpJson(JSON.stringify(normalized, null, 2));
      toast.success("帮助中心配置已保存");
      await invalidateContent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "帮助中心配置保存失败");
    } finally {
      setHelpSaving(false);
    }
  };

  const openEdit = (item: ContentItem) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content });
    setShowForm(true);
  };

  const handleCreate = async () => {
    const title = createForm.title.trim();
    const slug = createForm.slug.trim().toLowerCase();
    const content = createForm.content.trim();
    if (!title || !slug || !content) {
      toast.error("请填写标题、slug 和正文");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error("slug 仅允许小写字母、数字和中横线");
      return;
    }
    setSaving(true);
    try {
      await createContentPage({
        title,
        slug,
        content,
        publish_status: createForm.publish_status,
        sort_order: createForm.sort_order ? Number(createForm.sort_order) : undefined,
      });
      setShowCreateForm(false);
      setCreateForm({ title: "", slug: "", content: "", publish_status: "published", sort_order: "" });
      toast.success("内容页已创建");
      await invalidateContent();
    } catch (e) {
      toast.error(toastErrorMessage(e, "创建失败"));
    } finally {
      setSaving(false);
    }
  };

  const iconForSlug = (slug: string) => {
    if (slug === "privacy-policy") return <Shield size={18} className="text-muted-foreground" />;
    return <FileText size={18} className="text-muted-foreground" />;
  };

  const sortedItems = useMemo(() => {
    const order = new Map(LOGIN_POLICY_SLUGS.map((s, i) => [s, i]));
    return [...items].sort((a, b) => {
      const ai = order.has(a.slug) ? order.get(a.slug)! : 99;
      const bi = order.has(b.slug) ? order.get(b.slug)! : 99;
      if (ai !== bi) return ai - bi;
      return a.title.localeCompare(b.title, "zh");
    });
  }, [items]);

  const termsPage = items.find((i) => i.slug === "terms-of-service");
  const privacyPage = items.find((i) => i.slug === "privacy-policy");
  const categories = [...helpForm.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const faqs = [...helpForm.faqs].sort((a, b) => a.sortOrder - b.sortOrder);
  const reorderCategories = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    setHelpForm((prev) => {
      const list = [...prev.categories].sort((a, b) => a.sortOrder - b.sortOrder);
      const fromIndex = list.findIndex((x) => x.id === fromId);
      const toIndex = list.findIndex((x) => x.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, categories: list.map((x, idx) => ({ ...x, sortOrder: idx + 1 })) };
    });
  };
  const reorderFaqs = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    setHelpForm((prev) => {
      const list = [...prev.faqs].sort((a, b) => a.sortOrder - b.sortOrder);
      const fromIndex = list.findIndex((x) => x.id === fromId);
      const toIndex = list.findIndex((x) => x.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, faqs: list.map((x, idx) => ({ ...x, sortOrder: idx + 1 })) };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <AdminPageTitle
          title={<Tx>内容管理</Tx>}
          hint={
            <Tx>
              登录页协议、政策内容页、关于我们、常见问题在此维护；保存后前台即时生效。
            </Tx>
          }
        />
        <div className="mt-3">
          <PermissionGate permission="content.manage">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <Plus size={14} /> 新增内容页
            </button>
          </PermissionGate>
        </div>
      </div>

      {loading ? (
        <AdminContentPageSkeleton />
      ) : (
      <>
      <div className="rounded-2xl border border-gold/30 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <LogIn size={18} className="text-theme-price" />
          <h3 className="font-semibold"><Tx>登录页与合规文案</Tx></h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          <Tx>登录页底部《用户协议》《隐私政策》正文在下方列表编辑；跳转路径在站点设置中配置（一般无需修改）。</Tx>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-3 text-xs">
            <p className="font-medium text-foreground"><Tx>用户协议</Tx></p>
            <p className="mt-1 text-muted-foreground">
              <Tx>页面标识：</Tx>
              <code className="rounded bg-secondary px-1 py-0.5">terms-of-service</code>
            </p>
            <p className="mt-1 text-muted-foreground">
              <Tx>前台路径：</Tx>
              <Link
                to={policyPaths.termsPath}
                target="_blank"
                rel="noreferrer"
                className="admin-tech-path text-theme-price hover:underline"
              >
                {policyPaths.termsPath}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {termsPage ? (
                <PermissionGate permission="content.manage">
                  <button type="button" onClick={() => openEdit(termsPage)} className="rounded-lg border border-border px-2 py-1 hover:bg-secondary">
                    <Tx>编辑正文</Tx>
                  </button>
                </PermissionGate>
              ) : (
                <span className="text-muted-foreground"><Tx>列表中暂无该页，请执行迁移或新增内容页</Tx></span>
              )}
              <Link
                to={policyPaths.termsPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:bg-secondary"
              >
                <ExternalLink size={12} /><Tx>预览</Tx>
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-3 text-xs">
            <p className="font-medium text-foreground"><Tx>隐私政策</Tx></p>
            <p className="mt-1 text-muted-foreground">
              <Tx>页面标识：</Tx>
              <code className="rounded bg-secondary px-1 py-0.5">privacy-policy</code>
            </p>
            <p className="mt-1 text-muted-foreground">
              <Tx>前台路径：</Tx>
              <Link
                to={policyPaths.privacyPolicyPath}
                target="_blank"
                rel="noreferrer"
                className="admin-tech-path text-theme-price hover:underline"
              >
                {policyPaths.privacyPolicyPath}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {privacyPage ? (
                <PermissionGate permission="content.manage">
                  <button type="button" onClick={() => openEdit(privacyPage)} className="rounded-lg border border-border px-2 py-1 hover:bg-secondary">
                    <Tx>编辑正文</Tx>
                  </button>
                </PermissionGate>
              ) : (
                <span className="text-muted-foreground"><Tx>列表中暂无该页，请执行迁移或新增内容页</Tx></span>
              )}
              <Link
                to={policyPaths.privacyPolicyPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:bg-secondary"
              >
                <ExternalLink size={12} /><Tx>预览</Tx>
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          <Tx>修改跳转路径：</Tx>
          <Link to="/admin/settings/site#policy-paths" className="text-theme-price underline-offset-2 hover:underline">
            <Tx>站点设置 → 政策页路径</Tx>
          </Link>
          <Tx>（需站点设置管理权限）</Tx>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2"><HelpCircle size={18} className="text-theme-price" /><h3 className="font-semibold"><Tx>帮助中心管理</Tx></h3></div>
        <p className="mb-3 text-xs text-muted-foreground">
          <Tx>可视化维护 FAQ 分类、问题、答案、排序与启用状态；前台</Tx>{" "}
          <Link to="/help" className="text-theme-price underline-offset-2 hover:underline" target="_blank" rel="noreferrer">/help</Link>
          <Tx> 优先读取此处配置（未保存前前台仍使用内置默认）。</Tx>
        </p>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted-foreground"><Tx>
              工作时间
              </Tx><input
                value={helpForm.workingHours}
                onChange={(e) => setHelpForm((prev) => ({ ...prev, workingHours: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                placeholder="例如：每天 9:00 - 22:00"
              />
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              客服联系方式说明
              </Tx><input
                value={helpForm.contactNote || ""}
                onChange={(e) => setHelpForm((prev) => ({ ...prev, contactNote: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                placeholder="例如：WhatsApp / 电话 / 邮箱"
              />
            </label>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold"><Tx>FAQ 分类</Tx></h4>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => ({ ...x, enabled: true })) }))} className="rounded-lg border border-border px-2 py-1 text-xs"><Tx>全部启用</Tx></button>
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => ({ ...x, enabled: false })) }))} className="rounded-lg border border-border px-2 py-1 text-xs"><Tx>全部禁用</Tx></button>
                <button
                  type="button"
                  onClick={() => setHelpForm((prev) => ({
                    ...prev,
                    categories: [...prev.categories, { id: uid("cat"), name: "", sortOrder: prev.categories.length + 1, enabled: true }],
                  }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                >
                  <Plus size={12} /><Tx> 新增分类
                </Tx></button>
              </div>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} draggable onDragStart={() => setDragCatId(cat.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorderCategories(dragCatId, cat.id); setDragCatId(""); }} className="grid gap-2 rounded-lg border border-border bg-background p-2 md:grid-cols-[32px,1fr,56px,56px,80px,56px]">
                  <button type="button" onClick={() => setCollapsedCategoryIds((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="inline-flex items-center justify-center rounded-lg border border-border bg-card">{collapsedCategoryIds[cat.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
                  <input value={cat.name} onChange={(e) => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => x.id === cat.id ? { ...x, name: e.target.value } : x) }))} placeholder="分类名称" className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-gold" />
                  <button type="button" onClick={() => reorderCategories(cat.id, categories[Math.max(0, categories.findIndex((c) => c.id === cat.id) - 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => reorderCategories(cat.id, categories[Math.min(categories.length - 1, categories.findIndex((c) => c.id === cat.id) + 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowDown size={14} /></button>
                  <label className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs"><input type="checkbox" checked={cat.enabled} onChange={(e) => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => x.id === cat.id ? { ...x, enabled: e.target.checked } : x) }))} /><Tx>启用</Tx></label>
                  <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, categories: prev.categories.filter((x) => x.id !== cat.id), faqs: prev.faqs.filter((f) => f.categoryId !== cat.id) }))} className={`inline-flex items-center justify-center rounded-lg border border-border bg-card ${THEME_TEXT_DANGER}`}><Trash2 size={14} /></button>
                </div>
              ))}
              {categories.length === 0 ? <p className="text-xs text-muted-foreground"><Tx>暂无分类，请先新增分类。</Tx></p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold"><Tx>FAQ 列表</Tx></h4>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => ({ ...x, enabled: true })) }))} className="rounded-lg border border-border px-2 py-1 text-xs"><Tx>全部启用</Tx></button>
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => ({ ...x, enabled: false })) }))} className="rounded-lg border border-border px-2 py-1 text-xs"><Tx>全部禁用</Tx></button>
                <button
                  type="button"
                  onClick={() => setHelpForm((prev) => ({
                    ...prev,
                    faqs: [...prev.faqs, { id: uid("faq"), categoryId: prev.categories[0]?.id || "", question: "", answer: "", sortOrder: prev.faqs.length + 1, enabled: true }],
                  }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                >
                  <Plus size={12} /><Tx> 新增问题
                </Tx></button>
              </div>
            </div>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.id} draggable onDragStart={() => setDragFaqId(faq.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorderFaqs(dragFaqId, faq.id); setDragFaqId(""); }} className="space-y-2 rounded-lg border border-border bg-background p-2">
                  <div className={`grid gap-2 ${collapsedCategoryIds[faq.categoryId] ? "hidden" : "md:grid-cols-[1fr,100px,56px,56px,80px,56px]"}`}>
                    <input value={faq.question} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, question: e.target.value } : x) }))} placeholder="问题" className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-gold" />
                    <select value={faq.categoryId} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, categoryId: e.target.value } : x) }))} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-gold">
                      <option value=""><Tx>未分类</Tx></option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name || "未命名分类"}</option>)}
                    </select>
                    <button type="button" onClick={() => reorderFaqs(faq.id, faqs[Math.max(0, faqs.findIndex((f) => f.id === faq.id) - 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => reorderFaqs(faq.id, faqs[Math.min(faqs.length - 1, faqs.findIndex((f) => f.id === faq.id) + 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowDown size={14} /></button>
                    <label className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs"><input type="checkbox" checked={faq.enabled} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, enabled: e.target.checked } : x) }))} /><Tx>启用</Tx></label>
                    <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.filter((x) => x.id !== faq.id) }))} className={`inline-flex items-center justify-center rounded-lg border border-border bg-card ${THEME_TEXT_DANGER}`}><Trash2 size={14} /></button>
                  </div>
                  {!collapsedCategoryIds[faq.categoryId] ? <textarea value={faq.answer} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, answer: e.target.value } : x) }))} rows={3} placeholder="答案" className="w-full rounded-lg border border-border bg-card px-2 py-2 text-xs outline-none focus:border-gold" /> : null}
                </div>
              ))}
              {faqs.length === 0 ? <p className="text-xs text-muted-foreground"><Tx>暂无问题，请新增 FAQ。</Tx></p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground"><Tx>数据预览 / 导入（可选）</Tx></div>
            <textarea value={helpJson} onChange={(e) => setHelpJson(e.target.value)} rows={8} className="w-full rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs outline-none focus:border-gold" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setHelpJson(JSON.stringify(normalizeHelpCenterConfig(helpForm), null, 2))} className="rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>从表单生成数据</Tx></button>
              <button type="button" onClick={() => { try { const parsed = normalizeHelpCenterConfig(JSON.parse(helpJson)); setHelpForm(parsed); toast.success("已导入到表单"); } catch (e) { toast.error(e instanceof Error ? e.message : "数据格式错误"); } }} className="rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>从数据导入表单</Tx></button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <PermissionGate permission="content.manage">
            <button
              type="button"
              onClick={() => {
                confirm({
                  title: "恢复默认 FAQ",
                  description: "将覆盖当前表单内容（需再点保存才写入数据库）。确定继续？",
                  confirmText: "恢复默认",
                  danger: true,
                  onConfirm: async () => {
                    const defaults = buildDefaultHelpCenterConfig();
                    setHelpForm(defaults);
                    setHelpJson(JSON.stringify(defaults, null, 2));
                    toast.success("已载入默认 FAQ，请点击保存帮助中心配置");
                  },
                });
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              <Tx>恢复默认 FAQ</Tx>
            </button>
            <LoadingButton
              type="button"
              variant="gold"
              state={helpSaving ? "loading" : "normal"}
              loadingText="保存中..."
              onClick={() => void handleSaveHelp()}
              className="rounded-xl px-4 py-2 text-sm font-bold"
            >
              <Tx>保存帮助中心配置</Tx>
            </LoadingButton>
          </PermissionGate>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground"><Tx>内容页列表</Tx></h3>
        {sortedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-secondary/30 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">{iconForSlug(item.slug)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                {LOGIN_POLICY_SLUGS.includes(item.slug as (typeof LOGIN_POLICY_SLUGS)[number]) ? (
                  <span className="rounded-full bg-theme-price/10 px-2 py-0.5 text-[10px] font-medium text-theme-price"><Tx>登录页引用</Tx></span>
                ) : null}
              </div>
              <div className="mt-0.5">
                <AdminTableCell
                  value={item.content || "暂无内容"}
                  fullText={item.content || ""}
                  maxWidth="100%"
                  muted
                  lines={2}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                <Tx>前台路径：</Tx>
                {item.slug === "about" ? (
                  <Link to="/about" className="admin-tech-path text-theme-price hover:underline" target="_blank" rel="noreferrer">/about</Link>
                ) : (
                  <Link to={`/content/${item.slug}`} className="admin-tech-path text-theme-price hover:underline" target="_blank" rel="noreferrer">/content/{item.slug}</Link>
                )}
              </p>
            </div>
            <PermissionGate permission="content.manage"><button onClick={() => openEdit(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 size={14} /></button></PermissionGate>
          </div>
        ))}
      </div>
      </>
      )}

      <AdminResponsiveSheet
        open={showForm}
        onOpenChange={setShowForm}
        title={`编辑 - ${editing?.title || ""}`}
        size="md"
        height="70vh"
      >
        <div className="space-y-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
          <textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold resize-none" />
          <PermissionGate permission="content.manage">
            <LoadingButton
              type="button"
              variant="gold"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              onClick={() => void handleSave()}
              className="w-full rounded-xl py-3 text-sm font-bold"
            >
              <Tx>保存</Tx>
            </LoadingButton>
          </PermissionGate>
        </div>
      </AdminResponsiveSheet>

      <AdminResponsiveSheet
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        title="新增内容页"
        size="md"
        height="70vh"
      >
        <div className="space-y-4">
          <input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} placeholder="标题" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
          <input value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} placeholder="页面标识（小写字母、数字、横线，如 terms-of-service）" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
          <select value={createForm.publish_status} onChange={(e) => setCreateForm((p) => ({ ...p, publish_status: e.target.value as "published" | "draft" }))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold">
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
          </select>
          <input value={createForm.sort_order} onChange={(e) => setCreateForm((p) => ({ ...p, sort_order: e.target.value }))} placeholder="排序（可选）" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
          <textarea rows={10} value={createForm.content} onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))} placeholder="正文内容" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold resize-none" />
          <PermissionGate permission="content.manage">
            <LoadingButton
              type="button"
              variant="gold"
              state={saving ? "loading" : "normal"}
              loadingText="创建中..."
              onClick={() => void handleCreate()}
              className="w-full rounded-xl py-3 text-sm font-bold"
            >
              创建
            </LoadingButton>
          </PermissionGate>
        </div>
      </AdminResponsiveSheet>
    </div>
  );
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseHelpConfig(raw?: string): HelpCenterConfig {
  if (!raw || !raw.trim()) return buildDefaultHelpCenterConfig();
  try {
    return normalizeHelpCenterConfig(JSON.parse(raw));
  } catch {
    return buildDefaultHelpCenterConfig();
  }
}
