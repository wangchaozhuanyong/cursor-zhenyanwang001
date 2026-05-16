import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchProductTags, createProductTag, updateProductTag, deleteProductTag } from "@/services/admin/productService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { LoadingButton } from "@/modules/micro-interactions";
import type { ProductTag } from "@/types/product";

const EMPTY_FORM = {
  name: "",
  bg_color: "#FEF3C7",
  text_color: "#92400E",
  sort_order: 0,
  enabled: true,
};

export default function AdminProductTags() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadTags = async () => {
    try {
      const data = await fetchProductTags();
      setTags(data || []);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载标签失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTags(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (tag: ProductTag) => {
    setEditingId(tag.id);
    setForm({
      name: tag.name,
      bg_color: tag.bg_color || "#FEF3C7",
      text_color: tag.text_color || "#92400E",
      sort_order: Number(tag.sort_order) || 0,
      enabled: tag.enabled !== false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("请输入标签名称"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateProductTag(editingId, form);
        toast.success("标签已保存");
      } else {
        await createProductTag(form);
        toast.success("标签已创建");
      }
      resetForm();
      loadTags();
    } catch (e) {
      toast.error(toastErrorMessage(e, editingId ? "保存标签失败" : "创建标签失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await deleteProductTag(tagId);
      toast.success("标签已删除");
      setTags(tags.filter((t) => t.id !== tagId));
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除标签失败"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">标签管理</h2>
          <p className="mt-1 text-xs text-muted-foreground">创建后，在「商品管理 → 新增/编辑商品」中勾选即可关联；前台列表与详情页会展示。</p>
        </div>
        <PermissionGate permission="tag.manage">
          <button
            onClick={() => {
              if (showForm && !editingId) setShowForm(false);
              else {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setShowForm(true);
              }
            }}
            className="flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /> 新增标签
          </button>
        </PermissionGate>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gold/30 bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">标签名称</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="输入标签名称" className="rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">背景色</label>
              <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="h-10 w-16 rounded-lg bg-secondary p-1" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">文字色</label>
              <input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="h-10 w-16 rounded-lg bg-secondary p-1" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">排序权重</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-24 rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground">
              <input type="checkbox" className="accent-gold" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              启用
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">预览</label>
              <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: form.bg_color, color: form.text_color }}>
                {form.name || "标签"}
              </span>
            </div>
            <PermissionGate permission="tag.manage">
              <LoadingButton
                type="button"
                variant="gold"
                state={saving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => void handleSave()}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                {editingId ? "保存" : "添加"}
              </LoadingButton>
            </PermissionGate>
            <button onClick={resetForm} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground">取消</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="skeleton-base skeleton-shimmer h-6 w-20 rounded-full" />
                <div className="skeleton-base skeleton-shimmer h-3 w-24 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-16 rounded" />
              </div>
            ))
          : null}
        {!loading && tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <span
                className="rounded-full border px-2.5 py-1 text-xs font-bold"
                style={{ backgroundColor: tag.bg_color || "#FEF3C7", color: tag.text_color || "#92400E", borderColor: tag.bg_color || "#FEF3C7" }}
              >
                {tag.name}
              </span>
              <p className="mt-2 text-[10px] text-muted-foreground">{tag.count ?? 0} 个商品使用</p>
              <p className="mt-1 text-[10px] text-muted-foreground">排序 {tag.sort_order ?? 0} · {tag.enabled === false ? "停用" : "启用"}</p>
            </div>
            <div className="flex gap-1">
              <PermissionGate permission="tag.manage">
                <button onClick={() => startEdit(tag)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Pencil size={14} />
                </button>
              </PermissionGate>
              <PermissionGate permission="tag.manage">
                <button onClick={() => handleDelete(tag.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
