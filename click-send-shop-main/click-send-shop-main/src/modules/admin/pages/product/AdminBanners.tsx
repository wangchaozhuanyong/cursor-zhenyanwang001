import { useEffect, useState } from "react";
import { Image, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as bannerService from "@/services/admin/bannerService";
import * as uploadService from "@/services/uploadService";

export default function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", link: "", image: "" });

  useEffect(() => {
    bannerService.fetchBanners()
      .then(setBanners)
      .catch(() => toast.error("加载 Banner 失败"))
      .finally(() => setLoading(false));
  }, []);

  const toggleBanner = (id: string) => {
    const banner = banners.find((b) => b.id === id);
    if (!banner) return;
    bannerService.updateBanner(id, { enabled: !banner.enabled })
      .then(() => {
        setBanners(banners.map((b) => b.id === id ? { ...b, enabled: !b.enabled } : b));
        toast.success("状态已更新");
      })
      .catch(() => toast.error("更新失败"));
  };

  const handleDelete = (id: string) => {
    bannerService.deleteBanner(id)
      .then(() => {
        setBanners(banners.filter((b) => b.id !== id));
        toast.success("已删除");
      })
      .catch(() => toast.error("删除失败"));
  };

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({ title: b.title || "", link: b.link || "", image: b.image || "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.image) { toast.error("请上传图片"); return; }
    if (editingId) {
      bannerService.updateBanner(editingId, { title: form.title, link: form.link, image: form.image })
        .then(() => {
          setBanners(banners.map((b) => b.id === editingId ? { ...b, ...form } : b));
          setShowForm(false);
          setEditingId(null);
          setForm({ title: "", link: "", image: "" });
          toast.success("Banner 已更新");
        })
        .catch(() => toast.error("更新失败"));
    } else {
      bannerService.createBanner({ title: form.title, link: form.link, image: form.image, sort_order: banners.length + 1, enabled: true } as any)
        .then((newBanner) => {
          setBanners([...banners, newBanner]);
          setShowForm(false);
          setForm({ title: "", link: "", image: "" });
          toast.success("Banner 已添加");
        })
        .catch(() => toast.error("添加失败"));
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Banner 管理</h1>
          <p className="text-sm text-muted-foreground">管理首页和各页面的轮播广告图</p>
        </div>
        <PermissionGate permission="banner.manage">
          <button onClick={() => { setEditingId(null); setForm({ title: "", link: "", image: "" }); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus size={16} /> 添加 Banner
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{banners.length}</p>
          <p className="text-xs text-muted-foreground">总数</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{banners.filter((b) => b.enabled).length}</p>
          <p className="text-xs text-muted-foreground">已启用</p>
        </div>
      </div>

      <div className="space-y-2">
        {banners.map((b) => (
          <div key={b.id} className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all ${b.enabled ? "border-border" : "border-border opacity-60"}`}>
            <GripVertical size={16} className="text-muted-foreground cursor-grab" />
            <div className="h-16 w-28 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : <Image size={24} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{b.title || "无标题"}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <ExternalLink size={10} /> {b.link || "无链接"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">排序: {b.sort_order}</p>
            </div>
            <PermissionGate permission="banner.manage">
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-muted-foreground hover:text-gold hover:bg-secondary" title="编辑">
                  <Pencil size={16} />
                </button>
                <button onClick={() => toggleBanner(b.id)} className={`rounded-lg p-2 transition-colors ${b.enabled ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-muted-foreground hover:bg-secondary"}`}>
                  {b.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => handleDelete(b.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-secondary">
                  <Trash2 size={16} />
                </button>
              </div>
            </PermissionGate>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">暂无 Banner</div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: "", link: "", image: "" }); }}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">{editingId ? "编辑 Banner" : "添加 Banner"}</h3>
            <label className="flex h-40 rounded-xl border-2 border-dashed border-border bg-secondary flex-col items-center justify-center cursor-pointer hover:border-gold/50 overflow-hidden">
              {form.image ? <img src={form.image} alt="" className="h-full w-full object-cover" /> : (
                <>
                  <Image size={32} className="text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">点击上传图片</p>
                  <p className="text-[10px] text-muted-foreground">建议尺寸 750×330px</p>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const res = await uploadService.uploadSingle(file);
                  const url = res.url || "";
                  if (url) setForm({ ...form, image: url });
                  else toast.error("上传失败");
                } catch { toast.error("上传失败"); }
              }} />
            </label>
            <input placeholder="Banner 标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <input placeholder="跳转链接（如 /categories）" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <PermissionGate permission="banner.manage">
              <button onClick={handleSave} className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-primary-foreground">{editingId ? "保存修改" : "确认添加"}</button>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
