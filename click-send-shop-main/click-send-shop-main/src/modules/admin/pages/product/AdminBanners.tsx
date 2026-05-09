/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Image, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as bannerService from "@/services/admin/bannerService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_BANNER_LAYOUT } from "@/constants/imageUploadHints";

export default function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState({ title: "", link: "", image: "" });

  useEffect(() => {
    bannerService.fetchBanners()
      .then(setBanners)
      .catch((e) => toast.error(toastErrorMessage(e, "加载 Banner 失败")))
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
      .catch((e) => toast.error(toastErrorMessage(e, "更新失败")));
  };

  const handleDelete = (id: string) => {
    bannerService.deleteBanner(id)
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
        .catch((e) => toast.error(toastErrorMessage(e, "更新失败")));
    } else {
      bannerService.createBanner({ title: form.title, link: form.link, image: form.image, sort_order: banners.length + 1, enabled: true } as any)
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
      await Promise.all(
        ordered.map((b, idx) =>
          bannerService.updateBanner(String(b.id), { sort_order: idx + 1 }),
        ),
      );
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
          <p className="text-sm text-muted-foreground">管理首页和各页面的轮播广告图</p>
        </div>
        <PermissionGate permission="banner.manage">
          <button onClick={() => { setEditingId(null); setForm({ title: "", link: "", image: "" }); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus size={16} /> 添加 Banner
          </button>
        </PermissionGate>
      </div>

      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm dark:bg-gold/10">
        <p className="font-semibold text-foreground">轮播图上传规范（请按此准备素材）</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground/90">比例：</span>
            与前台轮播区域一致，固定为约 <strong className="text-foreground">2.34 : 1</strong>（宽 ÷ 高）。
            推荐导出尺寸示例：<strong className="text-foreground">1170 × 500 px</strong>、<strong className="text-foreground">750 × 320 px</strong>；
            高清屏可用 <strong className="text-foreground">1500 × 640 px</strong> 等同比例大图。过小会糊，过大徒增体积。
          </li>
          <li>
            <span className="text-foreground/90">裁切与构图：</span>
            前台使用 <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">object-cover</code> 居中填充，
            四边可能被轻微裁切、圆角遮挡。请把标题、按钮、人脸等重要内容放在<strong className="text-foreground">安全区（尽量靠中、勿贴边）</strong>。
          </li>
          <li>
            <span className="text-foreground/90">格式与体积：</span>
            支持 <strong className="text-foreground">JPG、PNG、WebP、GIF</strong>；单张上传不超过 <strong className="text-foreground">15MB</strong>。
            建议每张压缩到 <strong className="text-foreground">1MB 以内</strong>，利于手机流量与首屏速度。上传后服务端会转为 WebP 存储（动图 GIF 可能只保留静态帧）。
          </li>
          <li>
            <span className="text-foreground/90">文案与对比度：</span>
            避免细线、过小字号；浅色底 Banner 需与站点整体配色协调，保证在手机日光下仍可辨认。
          </li>
        </ul>
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
          <div
            key={b.id}
            draggable={!savingOrder}
            onDragStart={() => setDraggingId(String(b.id))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(String(b.id))}
            onDragEnd={() => setDraggingId(null)}
            className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all ${
              b.enabled ? "border-border" : "border-border opacity-60"
            } ${
              draggingId === String(b.id) ? "opacity-50" : ""
            } ${
              savingOrder ? "cursor-wait" : "cursor-move"
            }`}
          >
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
      {savingOrder && (
        <div className="text-xs text-muted-foreground">正在保存排序...</div>
      )}

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
                  <p className="mt-2 text-xs font-medium text-foreground">点击上传轮播图</p>
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
                } catch (e) { toast.error(toastErrorMessage(e, "上传失败")); }
              }} />
            </label>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              {IMAGE_UPLOAD_HINT_BANNER_LAYOUT} {IMAGE_UPLOAD_HINT_API}
            </p>
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
