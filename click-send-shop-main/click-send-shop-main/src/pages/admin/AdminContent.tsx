import { useState, useEffect } from "react";
import { FileText, Edit2, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchContentPages, updateContentPage } from "@/services/admin/contentService";

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

  useEffect(() => {
    setLoading(true);
    fetchContentPages()
      .then(setItems)
      .catch(() => toast.error("加载内容失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error("请填写完整"); return; }
    if (!editing) return;
    setSaving(true);
    try {
      await updateContentPage(editing.id, { title: form.title, content: form.content } as any);
      setItems(items.map((i) => i.id === editing.id ? { ...i, title: form.title, content: form.content, updatedAt: new Date().toISOString() } : i));
      toast.success("内容已更新");
      setShowForm(false);
      setEditing(null);
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: ContentItem) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content });
    setShowForm(true);
  };

  const iconForSlug = (slug: string) => {
    if (slug === "privacy") return <Shield size={18} className="text-muted-foreground" />;
    return <FileText size={18} className="text-muted-foreground" />;
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
        <h1 className="text-xl font-bold text-foreground">内容管理</h1>
        <p className="text-sm text-muted-foreground">编辑站点静态页面内容</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-secondary/30 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">
              {iconForSlug(item.slug)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.content || "暂无内容"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                路径: /{item.slug} · 更新于 {item.updatedAt ? new Date(item.updatedAt).toLocaleString("zh-CN") : "—"}
              </p>
            </div>
            <PermissionGate permission="content.manage">
              <button onClick={() => openEdit(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Edit2 size={14} />
              </button>
            </PermissionGate>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无内容页面</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">编辑 - {editing?.title}</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">标题</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">内容</label>
              <textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold resize-none" />
            </div>
            <PermissionGate permission="content.manage">
              <button disabled={saving} onClick={handleSave} className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "保存"}
              </button>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
