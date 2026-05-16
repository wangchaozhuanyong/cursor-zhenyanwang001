/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Edit2, Shield, HelpCircle, Plus, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { LoadingButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchContentPages, updateContentPage } from "@/services/admin/contentService";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { HelpCenterCategory, HelpCenterConfig, HelpCenterFaq } from "@/types/content";
import { AdminContentPageSkeleton } from "@/components/admin/AdminLoadingSkeletons";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}

export default function AdminContent() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [helpForm, setHelpForm] = useState<HelpCenterConfig>(buildDefaultHelpConfig());
  const [helpSaving, setHelpSaving] = useState(false);
  const [helpJson, setHelpJson] = useState("");
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>({});
  const [dragCatId, setDragCatId] = useState<string>("");
  const [dragFaqId, setDragFaqId] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContentPages(), fetchSiteSettings()])
      .then(([pages, settings]) => {
        setItems(pages as ContentItem[]);
        const parsed = parseHelpConfig(settings.helpCenterConfig);
        setHelpForm(parsed);
        setHelpJson(JSON.stringify(parsed, null, 2));
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载内容失败")))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.content || !editing) {
      toast.error("请填写完整");
      return;
    }
    setSaving(true);
    try {
      await updateContentPage(editing.id, { title: form.title, content: form.content } as any);
      setItems(items.map((i) => (i.id === editing.id ? { ...i, title: form.title, content: form.content, updatedAt: new Date().toISOString() } : i)));
      toast.success("内容已更新");
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHelp = async () => {
    setHelpSaving(true);
    try {
      const normalized = normalizeHelpConfig(helpForm);
      const payload = JSON.stringify(normalized);
      await updateSiteSettings({ helpCenterConfig: payload });
      setHelpForm(normalized);
      setHelpJson(JSON.stringify(normalized, null, 2));
      toast.success("帮助中心配置已保存");
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

  const iconForSlug = (slug: string) => (slug === "privacy" ? <Shield size={18} className="text-muted-foreground" /> : <FileText size={18} className="text-muted-foreground" />);
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
        <h1 className="text-xl font-bold text-foreground">内容管理</h1>
        <p className="text-sm text-muted-foreground">政策页与帮助中心配置分开管理。</p>
      </div>

      {loading ? (
        <AdminContentPageSkeleton />
      ) : (
      <>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2"><HelpCircle size={18} className="text-gold" /><h3 className="font-semibold">帮助中心管理</h3></div>
        <p className="mb-3 text-xs text-muted-foreground">可视化维护 FAQ 分类、问题、答案、排序与启用状态，前台 Help 优先读取这里。</p>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              工作时间
              <input
                value={helpForm.workingHours}
                onChange={(e) => setHelpForm((prev) => ({ ...prev, workingHours: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                placeholder="例如：每天 9:00 - 22:00"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              客服联系方式说明
              <input
                value={helpForm.contactNote || ""}
                onChange={(e) => setHelpForm((prev) => ({ ...prev, contactNote: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                placeholder="例如：WhatsApp / 电话 / 邮箱"
              />
            </label>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">FAQ 分类</h4>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => ({ ...x, enabled: true })) }))} className="rounded-lg border border-border px-2 py-1 text-xs">全部启用</button>
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => ({ ...x, enabled: false })) }))} className="rounded-lg border border-border px-2 py-1 text-xs">全部禁用</button>
                <button
                  type="button"
                  onClick={() => setHelpForm((prev) => ({
                    ...prev,
                    categories: [...prev.categories, { id: uid("cat"), name: "", sortOrder: prev.categories.length + 1, enabled: true }],
                  }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                >
                  <Plus size={12} /> 新增分类
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} draggable onDragStart={() => setDragCatId(cat.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorderCategories(dragCatId, cat.id); setDragCatId(""); }} className="grid gap-2 rounded-lg border border-border bg-background p-2 md:grid-cols-[32px,1fr,56px,56px,80px,56px]">
                  <button type="button" onClick={() => setCollapsedCategoryIds((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="inline-flex items-center justify-center rounded-lg border border-border bg-card">{collapsedCategoryIds[cat.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
                  <input value={cat.name} onChange={(e) => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => x.id === cat.id ? { ...x, name: e.target.value } : x) }))} placeholder="分类名称" className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-gold" />
                  <button type="button" onClick={() => reorderCategories(cat.id, categories[Math.max(0, categories.findIndex((c) => c.id === cat.id) - 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => reorderCategories(cat.id, categories[Math.min(categories.length - 1, categories.findIndex((c) => c.id === cat.id) + 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowDown size={14} /></button>
                  <label className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs"><input type="checkbox" checked={cat.enabled} onChange={(e) => setHelpForm((prev) => ({ ...prev, categories: prev.categories.map((x) => x.id === cat.id ? { ...x, enabled: e.target.checked } : x) }))} />启用</label>
                  <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, categories: prev.categories.filter((x) => x.id !== cat.id), faqs: prev.faqs.filter((f) => f.categoryId !== cat.id) }))} className="inline-flex items-center justify-center rounded-lg border border-border bg-card text-destructive"><Trash2 size={14} /></button>
                </div>
              ))}
              {categories.length === 0 ? <p className="text-xs text-muted-foreground">暂无分类，请先新增分类。</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">FAQ 列表</h4>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => ({ ...x, enabled: true })) }))} className="rounded-lg border border-border px-2 py-1 text-xs">全部启用</button>
                <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => ({ ...x, enabled: false })) }))} className="rounded-lg border border-border px-2 py-1 text-xs">全部禁用</button>
                <button
                  type="button"
                  onClick={() => setHelpForm((prev) => ({
                    ...prev,
                    faqs: [...prev.faqs, { id: uid("faq"), categoryId: prev.categories[0]?.id || "", question: "", answer: "", sortOrder: prev.faqs.length + 1, enabled: true }],
                  }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                >
                  <Plus size={12} /> 新增问题
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.id} draggable onDragStart={() => setDragFaqId(faq.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorderFaqs(dragFaqId, faq.id); setDragFaqId(""); }} className="space-y-2 rounded-lg border border-border bg-background p-2">
                  <div className={`grid gap-2 ${collapsedCategoryIds[faq.categoryId] ? "hidden" : "md:grid-cols-[1fr,100px,56px,56px,80px,56px]"}`}>
                    <input value={faq.question} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, question: e.target.value } : x) }))} placeholder="问题" className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-gold" />
                    <select value={faq.categoryId} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, categoryId: e.target.value } : x) }))} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-gold">
                      <option value="">未分类</option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name || "未命名分类"}</option>)}
                    </select>
                    <button type="button" onClick={() => reorderFaqs(faq.id, faqs[Math.max(0, faqs.findIndex((f) => f.id === faq.id) - 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => reorderFaqs(faq.id, faqs[Math.min(faqs.length - 1, faqs.findIndex((f) => f.id === faq.id) + 1)]?.id || "")} className="inline-flex items-center justify-center rounded-lg border border-border bg-card"><ArrowDown size={14} /></button>
                    <label className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs"><input type="checkbox" checked={faq.enabled} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, enabled: e.target.checked } : x) }))} />启用</label>
                    <button type="button" onClick={() => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.filter((x) => x.id !== faq.id) }))} className="inline-flex items-center justify-center rounded-lg border border-border bg-card text-destructive"><Trash2 size={14} /></button>
                  </div>
                  {!collapsedCategoryIds[faq.categoryId] ? <textarea value={faq.answer} onChange={(e) => setHelpForm((prev) => ({ ...prev, faqs: prev.faqs.map((x) => x.id === faq.id ? { ...x, answer: e.target.value } : x) }))} rows={3} placeholder="答案" className="w-full rounded-lg border border-border bg-card px-2 py-2 text-xs outline-none focus:border-gold" /> : null}
                </div>
              ))}
              {faqs.length === 0 ? <p className="text-xs text-muted-foreground">暂无问题，请新增 FAQ。</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">JSON 预览 / 导入（可选）</div>
            <textarea value={helpJson} onChange={(e) => setHelpJson(e.target.value)} rows={8} className="w-full rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs outline-none focus:border-gold" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setHelpJson(JSON.stringify(normalizeHelpConfig(helpForm), null, 2))} className="rounded-lg border border-border px-3 py-1.5 text-xs">从表单生成 JSON</button>
              <button type="button" onClick={() => { try { const parsed = normalizeHelpConfig(JSON.parse(helpJson)); setHelpForm(parsed); toast.success("已从 JSON 导入到表单"); } catch (e) { toast.error(e instanceof Error ? e.message : "JSON 格式错误"); } }} className="rounded-lg border border-border px-3 py-1.5 text-xs">从 JSON 导入表单</button>
            </div>
          </div>
        </div>
        <PermissionGate permission="settings.manage">
          <LoadingButton
            type="button"
            variant="gold"
            state={helpSaving ? "loading" : "normal"}
            loadingText="保存中..."
            onClick={() => void handleSaveHelp()}
            className="mt-3 rounded-xl px-4 py-2 text-sm font-bold"
          >
            保存帮助中心配置
          </LoadingButton>
        </PermissionGate>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-secondary/30 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">{iconForSlug(item.slug)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.content || "暂无内容"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">前台路径: <Link to={`/content/${item.slug}`} className="text-gold underline-offset-2 hover:underline" target="_blank" rel="noreferrer">/content/{item.slug}</Link></p>
            </div>
            <PermissionGate permission="content.manage"><button onClick={() => openEdit(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 size={14} /></button></PermissionGate>
          </div>
        ))}
      </div>
      </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">编辑 - {editing?.title}</h3>
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
                保存
              </LoadingButton>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultHelpConfig(): HelpCenterConfig {
  return normalizeHelpConfig({
    workingHours: "每天 9:00 - 22:00",
    contactNote: "",
    categories: [
      { id: "order", name: "订单", sortOrder: 1, enabled: true },
      { id: "pay", name: "支付", sortOrder: 2, enabled: true },
    ],
    faqs: [
      { id: "f1", categoryId: "order", question: "如何下单？", answer: "选择商品后加入购物车并提交订单。", sortOrder: 1, enabled: true },
    ],
  });
}

function parseHelpConfig(raw?: string): HelpCenterConfig {
  if (!raw || !raw.trim()) return buildDefaultHelpConfig();
  try {
    return normalizeHelpConfig(JSON.parse(raw));
  } catch {
    return buildDefaultHelpConfig();
  }
}

function normalizeHelpConfig(input: unknown): HelpCenterConfig {
  const obj = (input || {}) as Partial<HelpCenterConfig>;
  const categories = Array.isArray(obj.categories) ? obj.categories : [];
  const faqs = Array.isArray(obj.faqs) ? obj.faqs : [];
  const normalizedCategories: HelpCenterCategory[] = categories.map((c, idx) => ({
    id: String(c.id || uid("cat")),
    name: String(c.name || "").trim(),
    sortOrder: Number(c.sortOrder ?? idx + 1) || idx + 1,
    enabled: c.enabled !== false,
  }));
  const categoryIdSet = new Set(normalizedCategories.map((c) => c.id));
  const normalizedFaqs: HelpCenterFaq[] = faqs.map((f, idx) => ({
    id: String(f.id || uid("faq")),
    categoryId: categoryIdSet.has(String(f.categoryId || "")) ? String(f.categoryId) : (normalizedCategories[0]?.id || ""),
    question: String(f.question || "").trim(),
    answer: String(f.answer || "").trim(),
    sortOrder: Number(f.sortOrder ?? idx + 1) || idx + 1,
    enabled: f.enabled !== false,
  }));
  return {
    workingHours: String(obj.workingHours || "每天 9:00 - 22:00").trim(),
    contactNote: String(obj.contactNote || "").trim(),
    categories: normalizedCategories,
    faqs: normalizedFaqs,
  };
}
