import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as bannerService from "@/services/admin/bannerService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { THEME_HOVER_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT } from "@/utils/themeVisuals";
import {
  BANNER_ASPECT_CLASS,
  BANNER_ASPECT_RATIO,
  BANNER_ASPECT_TOLERANCE,
  BANNER_SIZE_PRESETS,
} from "@/constants/bannerAspect";
import { IMAGE_UPLOAD_HINT_BANNER_LAYOUT } from "@/constants/imageUploadHints";
import { isAspectRatioWithinTolerance, readImageSize } from "@/utils/imageRatio";
import type { Banner } from "@/types/banner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { invalidateHomeBannersCache } from "@/hooks/useHomeBanners";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const BANNER_RATIO_LABEL = `${BANNER_ASPECT_RATIO.toFixed(2)}:1`;
const EMPTY_FORM = { title: "", description: "", cta_text: "", link: "", image: "" };

export default function AdminBanners() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [strictRatioCheck, setStrictRatioCheck] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const bannersQuery = useQuery({
    queryKey: adminQueryKeys.banners(),
    queryFn: bannerService.fetchBanners,
    staleTime: 60_000,
  });

  const banners = bannersQuery.data ?? [];
  const loading = bannersQuery.isLoading && !bannersQuery.data;
  const editingBanner = editingId ? banners.find((b) => b.id === editingId) ?? null : null;
  const formBaseline = editingBanner
    ? { title: editingBanner.title || "", description: editingBanner.description || "", cta_text: editingBanner.cta_text || "", link: editingBanner.link || "", image: editingBanner.image || "" }
    : EMPTY_FORM;
  const formDirty = showForm && JSON.stringify(form) !== JSON.stringify(formBaseline);
  useAdminTabDirty(formDirty);

  const invalidateBanners = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.banners() });

  const invalidateBannerPublicCaches = async () => {
    invalidateHomeBannersCache();
    await invalidateBanners();
  };

  const toggleBanner = (id: string) => {
    const banner = banners.find((b) => b.id === id);
    if (!banner) return;
    bannerService
      .updateBanner(id, { enabled: !banner.enabled })
      .then(async () => {
        toast.success(tText("状态已更新"));
        await invalidateBannerPublicCaches();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "更新失败")));
  };

  const handleDelete = (id: string) => {
    bannerService
      .deleteBanner(id)
      .then(async () => {
        toast.success(tText("已删除"));
        await invalidateBannerPublicCaches();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "删除失败")));
  };

  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({ title: b.title || "", description: b.description || "", cta_text: b.cta_text || "", link: b.link || "", image: b.image || "" });
    setStrictRatioCheck(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setStrictRatioCheck(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.image) {
      toast.error(tText("请上传图片"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await bannerService.updateBanner(editingId, { title: form.title, description: form.description, cta_text: form.cta_text, link: form.link, image: form.image });
        closeForm();
        toast.success(tText("Banner 已更新"));
      } else {
        await bannerService.createBanner({
          title: form.title,
          description: form.description,
          cta_text: form.cta_text,
          link: form.link,
          image: form.image,
          sort_order: banners.length + 1,
          enabled: true,
        });
        closeForm();
        toast.success(tText("Banner 已添加"));
      }
      await invalidateBannerPublicCaches();
    } catch (e) {
      toast.error(toastErrorMessage(e, editingId ? "更新失败" : "添加失败"));
    } finally {
      setSaving(false);
    }
  };

  const persistBannerOrder = async (ordered: Banner[]) => {
    setSavingOrder(true);
    try {
      await Promise.all(ordered.map((b, idx) => bannerService.updateBanner(String(b.id), { sort_order: idx + 1 })));
      queryClient.setQueryData(
        adminQueryKeys.banners(),
        ordered.map((b, idx) => ({ ...b, sort_order: idx + 1 })),
      );
      toast.success(tText("Banner 排序已更新"));
      invalidateHomeBannersCache();
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
    queryClient.setQueryData(
      adminQueryKeys.banners(),
      next.map((b, idx) => ({ ...b, sort_order: idx + 1 })),
    );
    setDraggingId(null);
    await persistBannerOrder(next);
  };

  const handleCopyBannerPresets = async () => {
    try {
      await navigator.clipboard.writeText(BANNER_SIZE_PRESETS);
      toast.success(tText("推荐尺寸已复制"));
    } catch {
      toast.error(tText("复制失败，请手动复制"));
    }
  };

  return (
    <AdminPageShell
      hint={<Tx>{`管理首页顶部 Banner（${BANNER_RATIO_LABEL}）`}</Tx>}
      toolbar={(
        <PermissionGate permission="banner.manage">
          <UnifiedButton
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY_FORM);
              setStrictRatioCheck(false);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[var(--theme-price)] px-4 py-2.5 text-sm font-bold text-[var(--theme-price-foreground)]"
          >
            <Plus size={16} /><Tx>添加 Banner</Tx>
          </UnifiedButton>
        </PermissionGate>
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-price)_25%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_6%,var(--theme-surface))] px-4 py-2.5 text-sm dark:bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground"><Tx>轮播图上传规范</Tx></span>
          <AdminFieldHint
            contentClassName="max-w-sm"
            text={(
              <ul className="list-disc space-y-1 pl-4">
                <li><Tx>{`首页顶部 Banner 统一使用 ${BANNER_RATIO_LABEL} 宽幅比例，与前台轮播容器一致。`}</Tx></li>
                <li><Tx>{`推荐尺寸：${BANNER_SIZE_PRESETS}（或任意等比 ${BANNER_RATIO_LABEL}）。`}</Tx></li>
                <li><Tx>{IMAGE_UPLOAD_HINT_BANNER_LAYOUT}</Tx></li>
                <li><Tx>支持 JPG/PNG/WebP/GIF，单张不超过 15MB。</Tx></li>
              </ul>
            )}
          />
        </div>
        <UnifiedButton
          type="button"
          onClick={() => void handleCopyBannerPresets()}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
        >
          复制推荐尺寸
        </UnifiedButton>
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className={`skeleton-base skeleton-shimmer ${BANNER_ASPECT_CLASS} w-28 rounded-xl`} />
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
            <div className={`flex ${BANNER_ASPECT_CLASS} w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary`}>
              {b.image ? <img src={b.image} alt={`${b.title || "Banner"} 首页轮播图`} className="h-full w-full object-cover" /> : <Image size={24} className="text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-medium text-foreground">{b.title || "无标题"}</h4>
              {b.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{b.description}</p> : null}
              {b.cta_text ? <p className="mt-0.5 text-xs font-medium text-foreground"><Tx>按钮</Tx>: {b.cta_text}</p> : null}
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink size={10} /> {b.link || "无链接"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">排序: {b.sort_order}</p>
            </div>
            <PermissionGate permission="banner.manage">
              <div className="flex flex-shrink-0 items-center gap-2">
                <UnifiedButton onClick={() => openEdit(b)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-theme-price" title={tText("编辑")}>
                  <Pencil size={16} />
                </UnifiedButton>
                <UnifiedButton
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
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => adminConfirmDelete(confirm, b.title || b.id, () => handleDelete(b.id))}
                  className={`rounded-lg p-2 text-muted-foreground hover:bg-secondary ${THEME_HOVER_TEXT_DANGER}`}
                >
                  <Trash2 size={16} />
                </UnifiedButton>
              </div>
            </PermissionGate>
          </div>
        ))}
      </div>

      <AdminResponsiveSheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
            return;
          }
          setShowForm(true);
        }}
        title={editingId ? "编辑 Banner" : "添加 Banner"}
        size="sm"
      >
        <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={strictRatioCheck}
                onChange={(e) => setStrictRatioCheck(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>{`严格 ${BANNER_RATIO_LABEL} 校验（开启后，非标准比例图片将禁止上传）`}</span>
            </label>
            <label className={`flex ${BANNER_ASPECT_CLASS} w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary hover:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))]`}>
              {form.image ? (
                <img src={form.image} alt={`${form.title || "Banner"} 图片预览`} className="h-full w-full object-cover" />
              ) : (
                <>
                  <Image size={32} className="text-muted-foreground" />
                  <p className="mt-2 text-xs font-medium text-foreground"><Tx>{`点击上传 ${BANNER_RATIO_LABEL} Banner 图片`}</Tx></p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (!file) return;
                  try {
                    let size: { width: number; height: number } | null = null;
                    try {
                      size = await readImageSize(file);
                    } catch {
                      if (strictRatioCheck) {
                        toast.error(`读取图片尺寸失败，无法进行严格 ${BANNER_RATIO_LABEL} 校验。请关闭严格校验后重试，或换一张 JPG/PNG/WebP 图片。`);
                        return;
                      }
                      toast.warning(tText("读取图片尺寸失败，已跳过比例提示并继续上传。"));
                    }
                    if (size && size.width > 0 && size.height > 0) {
                      const { width, height } = size;
                      const ratioOk = isAspectRatioWithinTolerance(width, height, BANNER_ASPECT_RATIO, BANNER_ASPECT_TOLERANCE);
                      if (!ratioOk && strictRatioCheck) {
                        toast.error(`当前图片为 ${width}×${height}，不符合 ${BANNER_RATIO_LABEL} 比例，已阻止上传。`);
                        return;
                      }
                      if (!ratioOk) {
                        toast.warning(`当前图片为 ${width}×${height}，建议使用 ${BANNER_RATIO_LABEL} 比例（如 1200×512）以获得最佳展示效果。`);
                      }
                    }
                    const res = await uploadService.uploadSingleWithProgress(file, { mode: "banner" });
                    if (res.url) setForm({ ...form, image: res.url });
                    else toast.error(tText("上传失败"));
                  } catch (e) {
                    toast.error(toastErrorMessage(e, "上传失败"));
                  }
                }}
              />
            </label>
            <input placeholder={tText("Banner 标题")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--theme-primary)]" />
            <textarea rows={3} placeholder={tText("Banner 说明，用于后台识别和图片 alt 补充")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--theme-primary)]" />
            <input placeholder={tText("按钮文字（默认：立即查看）")} value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--theme-primary)]" />
            <input placeholder={tText("跳转链接（如 /categories）")} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--theme-primary)]" />
            <PermissionGate permission="banner.manage">
              <LoadingButton
                type="button"
                variant="price"
                state={saving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => adminConfirmSave(confirm, editingId ? "Banner 修改" : "新 Banner", () => handleSave())}
                className="w-full rounded-xl py-3 text-sm font-bold"
              >
                {editingId ? "保存修改" : "确认添加"}
              </LoadingButton>
            </PermissionGate>
        </div>
      </AdminResponsiveSheet>
    </AdminPageShell>
  );
}
