import { useEffect, useState } from "react";
import { Plus, GripVertical, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as categoryService from "@/services/admin/categoryService";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", icon: "", sort: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    categoryService.fetchCategories()
      .then(setCategories)
      .catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    if (!formData.name) { toast.error("请填写分类名称"); return; }
    const id = formData.name.toLowerCase().replace(/\s+/g, "_");
    categoryService.createCategory({ id, name: formData.name, icon: formData.icon, sort_order: formData.sort } as any)
      .then((newCat) => {
        setCategories([...categories, newCat]);
        setShowForm(false);
        setFormData({ name: "", icon: "", sort: 0 });
        toast.success("分类已添加");
      })
      .catch((e) => toast.error(toastErrorMessage(e, "添加失败")));
  };

  const handleEditSave = (id: string) => {
    if (!editName.trim()) { toast.error("分类名称不能为空"); return; }
    categoryService.updateCategory(id, { name: editName.trim() })
      .then(() => {
        setCategories(categories.map((c) => c.id === id ? { ...c, name: editName.trim() } : c));
        setEditingId(null);
        toast.success("分类已更新");
      })
      .catch((e) => toast.error(toastErrorMessage(e, "更新失败")));
  };

  const handleDelete = (id: string) => {
    categoryService.deleteCategory(id)
      .then(() => {
        setCategories(categories.filter((c) => c.id !== id));
        toast.success("分类已删除");
      })
      .catch((e) => toast.error(toastErrorMessage(e, "删除失败")));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">分类管理</h2>
        <PermissionGate permission="category.manage">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /> 新增分类
          </button>
        </PermissionGate>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-gold/30 bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">分类名称</label>
              <input placeholder="输入分类名称" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">图标</label>
              <input placeholder="emoji" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-20 rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">排序</label>
              <input type="number" placeholder="0" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })} className="w-20 rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <PermissionGate permission="category.manage">
              <button onClick={handleAdd} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground">添加</button>
            </PermissionGate>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground">取消</button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="rounded-xl border border-border bg-card">
        {categories.map((cat, i) => (
          <div key={cat.id} className={`flex items-center gap-4 px-4 py-3 ${i < categories.length - 1 ? "border-b border-border" : ""}`}>
            <GripVertical size={16} className="cursor-grab text-muted-foreground" />
            <span className="text-xl">{cat.icon}</span>
            {editingId === cat.id ? (
              <>
                <div className="flex-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(cat.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                    className="w-full rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground">{cat.productCount} 个商品</p>
                </div>
                <PermissionGate permission="category.manage">
                  <button onClick={() => handleEditSave(cat.id)} className="rounded-md p-1.5 text-green-500 hover:bg-green-500/10">
                    <Check size={14} />
                  </button>
                </PermissionGate>
                <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.productCount} 个商品</p>
                </div>
                <span className="text-xs text-muted-foreground">排序: {cat.sort_order ?? cat.sort}</span>
                <PermissionGate permission="category.manage">
                  <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Pencil size={14} />
                  </button>
                </PermissionGate>
              </>
            )}
            <PermissionGate permission="category.manage">
              <button onClick={() => handleDelete(cat.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </PermissionGate>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">暂无分类</div>
        )}
      </div>
    </div>
  );
}
