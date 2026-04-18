import { Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchProductTags, createProductTag, deleteProductTag } from "@/services/admin/productService";

export default function AdminProductTags() {
  const [showForm, setShowForm] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState({ name: "", color: "红色" });
  const [saving, setSaving] = useState(false);

  const loadTags = async () => {
    try {
      const data = await fetchProductTags();
      setTags(data || []);
    } catch {
      toast.error("加载标签失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTags(); }, []);

  const colorMap: Record<string, string> = {
    "红色": "bg-red-500/10 text-red-500",
    "绿色": "bg-green-500/10 text-green-500",
    "蓝色": "bg-blue-500/10 text-blue-500",
    "金色": "bg-gold/10 text-gold",
  };

  const handleAdd = async () => {
    if (!newTag.name) { toast.error("请输入标签名称"); return; }
    setSaving(true);
    try {
      await createProductTag({ name: newTag.name, color: newTag.color });
      toast.success("标签已创建");
      setNewTag({ name: "", color: "红色" });
      setShowForm(false);
      loadTags();
    } catch {
      toast.error("创建标签失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await deleteProductTag(tagId);
      toast.success("标签已删除");
      setTags(tags.filter((t) => t.id !== tagId));
    } catch {
      toast.error("删除标签失败");
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">标签管理</h2>
        <PermissionGate permission="tag.manage">
          <button
            onClick={() => setShowForm(!showForm)}
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
              <input value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} placeholder="输入标签名称" className="rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">颜色</label>
              <select value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} className="rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none">
                <option>红色</option>
                <option>绿色</option>
                <option>蓝色</option>
                <option>金色</option>
              </select>
            </div>
            <PermissionGate permission="tag.manage">
              <button disabled={saving} onClick={handleAdd} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
              </button>
            </PermissionGate>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground">取消</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colorMap[tag.color] || "bg-gold/10 text-gold"}`}>{tag.name}</span>
              <p className="mt-2 text-[10px] text-muted-foreground">{tag.count ?? 0} 个商品使用</p>
            </div>
            <PermissionGate permission="tag.manage">
              <button onClick={() => handleDelete(tag.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </PermissionGate>
          </div>
        ))}
      </div>
    </div>
  );
}
