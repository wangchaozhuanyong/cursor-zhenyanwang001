/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Image, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as bannerService from "@/services/admin/bannerService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { THEME_HOVER_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT } from "@/utils/themeVisuals";
import { isAspectRatioWithinTolerance, readImageSize } from "@/utils/imageRatio";

const BANNER_RATIO = 4 / 3;
const BANNER_RATIO_TOLERANCE = 0.03;
const BANNER_SIZE_PRESETS = "1200×900 / 1600×1200 / 2000×1500";

export default function AdminBanners() {
  const { confirm } = useAdminConfirm();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [strictRatioCheck, setStrictRatioCheck] = useState(false);
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
    setStrictRatioCheck(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.image) {
      toast.error("请上传图片");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await bannerService.updateBanner(editingId, { title: form.title, link: form.link, image: form.image });
        setBanners(banners.map((b) => (b.id === editingId ? { ...b, ...form } : b)));
        setShowForm(false);
        setEditingId(null);
        setForm({ title: "", link: "", image: "" });
        toast.success("Banner 已更新");
      } else {
        const newBanner = await bannerService.createBanner({
          title: form.title,
          link: form.link,
          image: form.image,
          sort_order: banners.length + 1,
          enabled: true,
        } as any);
        setBanners([...banners, newBanner]);
        setShowForm(false);
        setForm({ title: "", link: "", image: "" });
        toast.success("Banner 已添加");
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, editingId ? "更新失败" : "添加失败"));
    } finally {
      setSaving(false);
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

  const handleCopyBannerPresets = async () => {
    try {
      await navigator.clipboard.writeText(BANNER_SIZE_PRESETS);
      toast.success("推荐尺寸已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground"><Tx>Banner 管理</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>管理首页顶部 Banner（4:3）</Tx></p>
        </div>
        <PermissionGate permission="banner.manage">
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ title: "", link: "", image: "" });
              setStrictRatioCheck(false);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Plus size={16} /><Tx> 添加 Banner
          </Tx></button>
        </PermissionGate>
      </div>

      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm dark:bg-gold/10">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-foreground"><Tx>轮播图上传规范</Tx></p>
          <button
            type="button"
            onClick={() => void handleCopyBannerPresets()}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
          >
            复制推荐尺寸
          </button>
        </div>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
          <li><Tx>首页顶部 Banner 统一使用 4:3 比例，避免展示裁切与留白。</Tx></li>
          <li><Tx>推荐尺寸：1200×900、1600×1200、2000×1500（或任意等比 4:3）。</Tx></li>
          <li><Tx>支持 JPG/PNG/WebP/GIF，单张不超过 15MB。</Tx></li>
          <li><Tx>图片由服务器统一处理：最长边 2560，WebP quality 92（无需浏览器二次压缩）。</Tx></li>
        </ul>
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="skeleton-base skeleton-shimmer aspect-[4/3] w-28 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-base skeleton-shimmer h-4 w-40 rounded" />
                  <div className="skeleton-base skeleton-shimmer h-3 w-56 rounded" />
                </div>
              </div>
            ))
          : null}
        {!loading && banners.map((b) => (
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
            <div className="flex aspect-[4/3] w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
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
                <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-theme-price" title="编辑">
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    confirm({
                      title: b.enabled ? "确认隐藏" : "确认显示",
                      description: `确定${b.enabled ? "隐藏" : "显示"} Banner「${b.title || b.id}」？`,
                      confirmText: b.enabled ? "隐藏" : "显示",
                      onConfirm: () => toggleBanner(b.id),
                    })
                  }
                  className={`rounded-lg p-2 transition-colors ${b.enabled ? `${THEME_TEXT_SUCCESS_SOFT} hover:bg-[color-mix(in_srgb,var(--theme-success)_8%,var(--theme-surface))]` : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {b.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => adminConfirmDelete(confirm, b.title || b.id, () => handleDelete(b.id))}
                  className={`rounded-lg p-2 text-muted-foreground hover:bg-secondary ${THEME_HOVER_TEXT_DANGER}`}
                >
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
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={strictRatioCheck}
                onChange={(e) => setStrictRatioCheck(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>严格 4:3 校验（开启后，非 4:3 图片将禁止上传）</span>
            </label>
            <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary hover:border-gold/50">
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Image size={32} className="text-muted-foreground" />
                  <p className="mt-2 text-xs font-medium text-foreground"><Tx>点击上传 4:3 Banner 图片</Tx></p>
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
                    const { width, height } = await readImageSize(file);
                    if (width > 0 && height > 0) {
                      const ratioOk = isAspectRatioWithinTolerance(width, height, BANNER_RATIO, BANNER_RATIO_TOLERANCE);
                      if (!ratioOk && strictRatioCheck) {
                        toast.error(`当前图片为 ${width}×${height}，不符合 4:3 比例，已阻止上传。`);
                        return;
                      }
                      if (!ratioOk) {
                        toast.warning(`当前图片为 ${width}×${height}，建议使用 4:3 比例（如 1200×900）以获得最佳展示效果。`);
                      }
                    }
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
              <LoadingButton
                type="button"
                variant="gold"
                state={saving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => adminConfirmSave(confirm, editingId ? "Banner 修改" : "新 Banner", () => handleSave())}
                className="w-full rounded-xl py-3 text-sm font-bold"
              >
                {editingId ? "保存修改" : "确认添加"}
              </LoadingButton>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
