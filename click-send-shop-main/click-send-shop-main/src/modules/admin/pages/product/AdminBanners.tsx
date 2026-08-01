import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, ImagePlus, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Pencil } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
  BANNER_SIZE_PRESETS,
  DESKTOP_BANNER_ASPECT_CLASS,
  DESKTOP_BANNER_ASPECT_RATIO,
  DESKTOP_BANNER_SIZE_PRESETS,
} from "@/constants/bannerAspect";
import { IMAGE_UPLOAD_HINT_BANNER_LAYOUT } from "@/constants/imageUploadHints";
import { readImageSize } from "@/utils/imageRatio";
import {
  assessBannerImageDimensions,
  type BannerImageTarget,
} from "@/utils/bannerImageValidation";
import type { Banner } from "@/types/banner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { invalidateHomeBannersCache } from "@/hooks/useHomeBanners";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { getFixedHomeBannerRecommendation } from "@/constants/fixedHomeBannerRecommendations";
import { fetchStorefrontReadiness } from "@/services/admin/homeOpsService";
import AdminBannerMediaRepairBar from "./AdminBannerMediaRepairBar";
import {
  readBannerMediaRepairScopeFromSearch,
  sortBannersByRepairPriority,
} from "./adminBannersViewState";

const BANNER_RATIO_LABEL = `${BANNER_ASPECT_RATIO.toFixed(2)}:1`;
const DESKTOP_BANNER_RATIO_LABEL = `${DESKTOP_BANNER_ASPECT_RATIO.toFixed(2)}:1`;
const EMPTY_FORM = {
  title: "",
  description: "",
  cta_text: "",
  link: "",
  image: "",
  image_mobile: "",
  image_desktop: "",
};
type BannerDraftState = {
  showForm: boolean;
  editingId: string | null;
  strictRatioCheck: boolean;
  form: typeof EMPTY_FORM;
};

const CLOSED_BANNER_DRAFT: BannerDraftState = {
  showForm: false,
  editingId: null,
  strictRatioCheck: false,
  form: EMPTY_FORM,
};

export default function AdminBanners() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingRecommendationId, setApplyingRecommendationId] = useState<string | null>(null);
  const [strictRatioCheck, setStrictRatioCheck] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const bannersQuery = useQuery({
    queryKey: adminQueryKeys.banners(),
    queryFn: bannerService.fetchBanners,
    staleTime: 60_000,
  });

  const banners = useMemo(() => bannersQuery.data ?? [], [bannersQuery.data]);
  const bannerRepairScope = readBannerMediaRepairScopeFromSearch(`?${urlSearchParams.toString()}`);
  const homeMediaRepairMode = bannerRepairScope === "home";
  const readinessQuery = useQuery({
    queryKey: adminQueryKeys.storefrontReadiness(),
    queryFn: fetchStorefrontReadiness,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: homeMediaRepairMode,
  });
  const repairPriorityIds = useMemo(
    () => readinessQuery.data?.banners.items.map((item) => String(item.id)).filter(Boolean) ?? [],
    [readinessQuery.data?.banners.items],
  );
  const renderedBanners = useMemo(
    () => homeMediaRepairMode
      ? sortBannersByRepairPriority(banners, repairPriorityIds)
      : banners,
    [banners, homeMediaRepairMode, repairPriorityIds],
  );
  const repairTotal = homeMediaRepairMode
    ? Number(readinessQuery.data?.banners.missing_count || 0)
    : 0;
  const firstRepairBanner = renderedBanners[0];
  const loading = (
    (bannersQuery.isLoading && !bannersQuery.data)
    || (homeMediaRepairMode && readinessQuery.isLoading && !readinessQuery.data)
  );
  const bannerDraftValue = useMemo<BannerDraftState>(
    () => ({ showForm, editingId, strictRatioCheck, form }),
    [editingId, form, showForm, strictRatioCheck],
  );
  const { markClean: markBannerDraftClean } = useAdminFormDirty(bannerDraftValue, !loading, {
    restoreDraft: (draft) => {
      setShowForm(Boolean(draft.showForm));
      setEditingId(draft.editingId ?? null);
      setStrictRatioCheck(Boolean(draft.strictRatioCheck));
      setForm(draft.form || EMPTY_FORM);
    },
  });

  const invalidateBanners = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.banners() });

  const invalidateBannerPublicCaches = async () => {
    invalidateHomeBannersCache();
    await Promise.all([
      invalidateBanners(),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.storefrontReadiness() }),
    ]);
  };

  const exitMediaRepairQueue = () => {
    const next = new URLSearchParams(urlSearchParams);
    next.delete("media_status");
    next.delete("repair_scope");
    setUrlSearchParams(next, { replace: true });
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
    const nextForm = {
      title: b.title || "",
      description: b.description || "",
      cta_text: b.cta_text || "",
      link: b.link || "",
      image: b.image || "",
      image_mobile: b.image_mobile || "",
      image_desktop: b.image_desktop || "",
    };
    setEditingId(b.id);
    setForm(nextForm);
    setStrictRatioCheck(false);
    setShowForm(true);
    markBannerDraftClean({ showForm: true, editingId: b.id, strictRatioCheck: false, form: nextForm });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setStrictRatioCheck(false);
    setForm(EMPTY_FORM);
    markBannerDraftClean(CLOSED_BANNER_DRAFT);
  };

  const handleSave = async () => {
    if (!form.image && !form.image_mobile && !form.image_desktop) {
      toast.error(tText("请至少上传一张轮播图片"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await bannerService.updateBanner(editingId, {
          title: form.title,
          description: form.description,
          cta_text: form.cta_text,
          link: form.link,
          image: form.image || form.image_desktop || form.image_mobile,
          image_mobile: form.image_mobile,
          image_desktop: form.image_desktop,
        });
        closeForm();
        toast.success(tText("Banner 已更新"));
      } else {
        await bannerService.createBanner({
          title: form.title,
          description: form.description,
          cta_text: form.cta_text,
          link: form.link,
          image: form.image || form.image_desktop || form.image_mobile,
          image_mobile: form.image_mobile,
          image_desktop: form.image_desktop,
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
      await navigator.clipboard.writeText(`移动端：${BANNER_SIZE_PRESETS}\n桌面端：${DESKTOP_BANNER_SIZE_PRESETS}`);
      toast.success(tText("推荐尺寸已复制"));
    } catch {
      toast.error(tText("复制失败，请手动复制"));
    }
  };

  const applyRecommendedBannerMedia = async (banner: Banner) => {
    const recommendation = getFixedHomeBannerRecommendation(banner.title);
    if (!recommendation) {
      toast.error(tText("当前轮播没有匹配的推荐素材"));
      return;
    }
    setApplyingRecommendationId(String(banner.id));
    try {
      await bannerService.updateBanner(String(banner.id), {
        image: banner.image || recommendation.imageDesktop,
        image_mobile: recommendation.imageMobile,
        image_desktop: recommendation.imageDesktop,
      });
      toast.success(tText("已套用移动端和桌面端推荐素材"));
      await invalidateBannerPublicCaches();
    } catch (error) {
      toast.error(toastErrorMessage(error, "套用推荐素材失败"));
    } finally {
      setApplyingRecommendationId(null);
    }
  };

  const uploadBannerImage = async (
    file: File,
    target: BannerImageTarget,
  ) => {
    const ratioLabel = target === "image_mobile" ? BANNER_RATIO_LABEL : DESKTOP_BANNER_RATIO_LABEL;
    let size: { width: number; height: number } | null = null;
    try {
      size = await readImageSize(file);
    } catch {
      if (strictRatioCheck) {
        toast.error(`读取图片尺寸失败，无法进行严格 ${ratioLabel} 校验。`);
        return;
      }
      toast.warning(tText("读取图片尺寸失败，已跳过比例提示并继续上传。"));
    }
    if (size) {
      const assessment = assessBannerImageDimensions(size, target, strictRatioCheck);
      if (assessment.level === "error") {
        toast.error(assessment.message);
        return;
      }
      if (assessment.level === "warning") {
        toast.warning(assessment.message);
      }
    }
    const res = await uploadService.uploadSingleWithProgress(file, { mode: "banner" });
    if (!res.url) {
      toast.error(tText("上传失败"));
      return;
    }
    setForm((current) => ({
      ...current,
      [target]: res.url,
      image: current.image || res.url,
    }));
  };

  return (
    <AdminPageShell
      hint={<Tx>管理首页顶部 Banner，移动端与桌面端分别上传适配素材</Tx>}
      toolbar={(
        <PermissionGate permission="banner.manage">
          <UnifiedButton
            onClick={() => {
              const nextDraft = { showForm: true, editingId: null, strictRatioCheck: false, form: EMPTY_FORM };
              setEditingId(null);
              setForm(EMPTY_FORM);
              setStrictRatioCheck(false);
              setShowForm(true);
              markBannerDraftClean(nextDraft);
            }}
            className="flex items-center gap-2 rounded-xl bg-[var(--theme-price)] px-4 py-2.5 text-sm font-bold text-[var(--theme-price-foreground)]"
          >
            <Plus size={16} /><Tx>添加 Banner</Tx>
          </UnifiedButton>
        </PermissionGate>
      )}
    >
      {homeMediaRepairMode ? (
        <AdminBannerMediaRepairBar
          total={repairTotal}
          firstBannerTitle={firstRepairBanner?.title || ""}
          loading={loading}
          onStart={() => {
            if (firstRepairBanner) openEdit(firstRepairBanner);
          }}
          onExit={exitMediaRepairQueue}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-price)_25%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_6%,var(--theme-surface))] px-4 py-2.5 text-sm dark:bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground"><Tx>轮播图上传规范</Tx></span>
          <AdminFieldHint
            contentClassName="max-w-sm"
            text={(
              <ul className="list-disc space-y-1 pl-4">
                <li><Tx>{`移动端比例 ${BANNER_RATIO_LABEL}，推荐：${BANNER_SIZE_PRESETS}。`}</Tx></li>
                <li><Tx>{`桌面端比例 ${DESKTOP_BANNER_RATIO_LABEL}，推荐：${DESKTOP_BANNER_SIZE_PRESETS}。`}</Tx></li>
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
        {!loading && renderedBanners.map((b) => {
          const recommendation = getFixedHomeBannerRecommendation(b.title);
          const needsResponsiveMedia = Boolean(
            recommendation && (!b.image_mobile || !b.image_desktop),
          );
          const applyingRecommendation = applyingRecommendationId === String(b.id);

          return (
          <div
            key={b.id}
            draggable={!savingOrder && !homeMediaRepairMode}
            onDragStart={() => setDraggingId(String(b.id))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(String(b.id))}
            onDragEnd={() => setDraggingId(null)}
            className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all ${
              b.enabled ? "border-border" : "border-border opacity-60"
            } ${draggingId === String(b.id) ? "opacity-50" : ""} ${
              homeMediaRepairMode ? "" : savingOrder ? "cursor-wait" : "cursor-move"
            }`}
          >
            {!homeMediaRepairMode ? <GripVertical size={16} className="cursor-grab text-muted-foreground" /> : null}
            <div className={`flex ${BANNER_ASPECT_CLASS} w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary`}>
              {(b.image_mobile || b.image_desktop || b.image) ? (
                <picture className="h-full w-full">
                  {b.image_mobile ? <source media="(max-width: 767px)" srcSet={b.image_mobile} /> : null}
                  <img
                    src={b.image_desktop || b.image || b.image_mobile}
                    alt={`${b.title || "Banner"} 首页轮播图`}
                    className="h-full w-full object-cover"
                  />
                </picture>
              ) : <Image size={24} className="text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-medium text-foreground">{b.title || "无标题"}</h4>
              {b.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{b.description}</p> : null}
              {b.cta_text ? <p className="mt-0.5 text-xs font-medium text-foreground"><Tx>按钮</Tx>: {b.cta_text}</p> : null}
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink size={10} /> {b.link || "无链接"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">排序: {b.sort_order}</p>
              {needsResponsiveMedia ? (
                <PermissionGate permission="banner.manage">
                  <UnifiedButton
                    type="button"
                    disabled={applyingRecommendation}
                    onClick={() =>
                      confirm({
                        title: "套用新版推荐双图",
                        description: `将为「${b.title}」设置已审核的移动端与桌面端图片，原有标题、链接、排序和启用状态保持不变。`,
                        confirmText: "确认套用",
                        onConfirm: () => applyRecommendedBannerMedia(b),
                      })
                    }
                    className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-[var(--theme-primary)] disabled:opacity-60"
                  >
                    <ImagePlus size={14} />
                    {applyingRecommendation ? "处理中..." : "使用推荐双图"}
                  </UnifiedButton>
                </PermissionGate>
              ) : null}
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
          );
        })}
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
            <div className="grid gap-4 lg:grid-cols-2">
              <BannerImageUploadField
                label="移动端图片"
                hint={`${BANNER_RATIO_LABEL} · ${BANNER_SIZE_PRESETS}`}
                value={form.image_mobile}
                aspectClass={BANNER_ASPECT_CLASS}
                onFile={(file) => uploadBannerImage(file, "image_mobile")}
              />
              <BannerImageUploadField
                label="桌面端图片"
                hint={`${DESKTOP_BANNER_RATIO_LABEL} · ${DESKTOP_BANNER_SIZE_PRESETS}`}
                value={form.image_desktop}
                aspectClass={DESKTOP_BANNER_ASPECT_CLASS}
                onFile={(file) => uploadBannerImage(file, "image_desktop")}
              />
            </div>
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

function BannerImageUploadField({
  label,
  hint,
  value,
  aspectClass,
  onFile,
}: {
  label: string;
  hint: string;
  value: string;
  aspectClass: string;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <label className={`flex ${aspectClass} w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary hover:border-[var(--theme-primary)]`}>
        {value ? (
          <img src={value} alt={`${label}预览`} className="h-full w-full object-cover" />
        ) : (
          <>
            <Image size={30} className="text-muted-foreground" />
            <p className="mt-2 text-xs font-medium text-foreground">点击上传{label}</p>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            void onFile(file).catch((error) => {
              toast.error(toastErrorMessage(error, "上传失败"));
            });
          }}
        />
      </label>
    </div>
  );
}
