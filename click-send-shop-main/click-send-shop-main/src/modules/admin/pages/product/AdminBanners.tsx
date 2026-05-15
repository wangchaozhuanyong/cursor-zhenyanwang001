/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Image, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as bannerService from "@/services/admin/bannerService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState({ title: "", link: "", image: "" });

  useEffect(() => {
    bannerService
      .fetchBanners()
      .then(setBanners)
      .catch((e) => toast.error(toastErrorMessage(e, "加载 Banner 失败")))
      .finally(() => setLoading(false));
  }, []);

  const toggleBanner = (id: string) => {
    const banner = banners.find((b) => b.id === id);
    if (!banner) return;
    bannerService
      .updateBanner(id, { enabled: !banner.enabled })
      .then(() => {
        setBanners(banners.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
        toast.success("状态已更新");
      })
      .catch((e) => toast.error(toastErrorMessage(e, "更新失败")));
  };

  const handleDelete = (id: string) => {
    bannerService
      .deleteBanner(id)
      .then(() => {
        setBanners(banners.filter((b) => b.id !== id));
        toast.success("已删除");
      })
      .catch((e) => toast.error(toastErrorMessage(e, "删除失败")));
  };

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({ title: b.title || "", link: b.link || "", image: b.image || "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.image) {
      toast.error("请上传图片");
      return;
    }
    if (editingId) {
      bannerService
        .updateBanner(editingId, { title: form.title, link: form.link, image: form.image })
        .then(() => {
          setBanners(banners.map((b) => (b.id === editingId ? { ...b, ...form } : b)));
          setShowForm(false);
          setEditingId(null);
          setForm({ title: "", link: "", image: "" });
          toast.success("Banner 已更新");
        })
        .catch((e) => toast.error(toastErrorMessage(e, "更新失败")));
    } else {
      bannerService
        .createBanner({ title: form.title, link: form.link, image: form.image, sort_order: banners.length + 1, enabled: true } as any)
        .then((newBanner) => {
          setBanners([...banners, newBanner]);
          setShowForm(false);
          setForm({ title: "", link: "", image: "" });
          toast.success("Banner 已添加");
        })
        .catch((e) => toast.error(toastErrorMessage(e, "添加失败")));
    }
  };

  const persistBannerOrder = async (ordered: any[]) => {
    setSavingOrder(true);
    try {
      await Promise.all(ordered.map((b, idx) => bannerService.updateBanner(String(b.id), { sort_order: idx + 1 })));
      setBanners(ordered.map((b, idx) => ({ ...b, sort_order: idx + 1 })));
      toast.success("Banner 排序已更新");
    } catch (e) {
      toast.error(toastErrorMessage(e, "排序保存失败，请重试"));
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const fromIdx = banners.findIndex((b) => String(b.id) === draggingId);
    const toIdx = banners.findIndex((b) => String(b.id) === targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDraggingId(null);
      return;
    }
    const next = [...banners];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setBanners(next.map((b, idx) => ({ ...b, sort_order: idx + 1 })));
    setDraggingId(null);
    await persistBannerOrder(next);
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
          <p className="text-sm text-muted-foreground">管理首页轮播图</p>
        </div>
        <PermissionGate permission="banner.manage">
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ title: "", link: "", image: "" });
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Plus size={16} /> 添加 Banner
          </button>
        </PermissionGate>
      </div>

      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm dark:bg-gold/10">
        <p className="font-semibold text-foreground">轮播图上传规范</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
          <li>比例建议固定为 2.34:1。</li>
          <li>推荐尺寸：1170×500、1500×640、2340×1000。</li>
          <li>支持 JPG/PNG/WebP/GIF，单张不超过 15MB。</li>
          <li>Banner 上传走专用压缩策略：最长边 2400，WebP quality 90。</li>
        </ul>
      </div>

      <div className="space-y-2">
        {banners.map((b) => (
          <div
            key={b.id}
            draggable={!savingOrder}
            onDragStart={() => setDraggingId(String(b.id))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(String(b.id))}
            onDragEnd={() => setDraggingId(null)}
            className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all ${
              b.enabled ? "border-border" : "border-border opacity-60"
            } ${draggingId === String(b.id) ? "opacity-50" : ""} ${savingOrder ? "cursor-wait" : "cursor-move"}`}
          >
            <GripVertical size={16} className="cursor-grab text-muted-foreground" />
            <div className="flex h-16 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
              {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : <Image size={24} className="text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-medium text-foreground">{b.title || "无标题"}</h4>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink size={10} /> {b.link || "无链接"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">排序: {b.sort_order}</p>
            </div>
            <PermissionGate permission="banner.manage">
              <div className="flex flex-shrink-0 items-center gap-2">
                <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-gold" title="编辑">
                  <Pencil size={16} />
                </button>
                <button onClick={() => toggleBanner(b.id)} className={`rounded-lg p-2 transition-colors ${b.enabled ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-muted-foreground hover:bg-secondary"}`}>
                  {b.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => handleDelete(b.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive">
                  <Trash2 size={16} />
                </button>
              </div>
            </PermissionGate>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="font-bold text-foreground">{editingId ? "编辑 Banner" : "添加 Banner"}</h3>
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary hover:border-gold/50">
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Image size={32} className="text-muted-foreground" />
                  <p className="mt-2 text-xs font-medium text-foreground">点击上传轮播图</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const res = await uploadService.uploadSingleWithProgress(file, { mode: "banner" });
                    if (res.url) setForm({ ...form, image: res.url });
                    else toast.error("上传失败");
                  } catch (e) {
                    toast.error(toastErrorMessage(e, "上传失败"));
                  }
                }}
              />
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
