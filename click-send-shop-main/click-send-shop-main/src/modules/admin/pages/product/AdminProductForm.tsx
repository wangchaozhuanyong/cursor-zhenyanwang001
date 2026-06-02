import { ArrowLeft, Upload, ImagePlus, Loader2, Trash2, Plus, Video } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProductById, createProduct, updateProduct, deleteProduct, fetchProductTags } from "@/services/admin/productService";
import * as categoryService from "@/services/admin/categoryService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminFormSectionsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT } from "@/constants/imageUploadHints";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { flattenCategories, type FlatCategory } from "@/utils/categoryTree";
import type { Category } from "@/types/category";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminLabelWithHint, AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { AnimatedConfirmDialog, LoadingButton, UploadDropZone } from "@/modules/micro-interactions";
import {
  THEME_BTN_DANGER_SOLID,
  THEME_HOVER_TEXT_DANGER,
  THEME_OUTLINE_DANGER,
  THEME_TEXT_DANGER,
} from "@/utils/themeVisuals";
import { adminTableClassName, adminTdClassName } from "@/utils/adminTableClasses";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { COMPLIANCE_TYPE_LABELS } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { tempVariantId } from "@/utils/productFormVariantUtils";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import ProductVariantMatrixTable from "@/modules/admin/pages/product/ProductVariantMatrixTable";
import ProductSpecGroupsSection from "@/modules/admin/pages/product/ProductSpecGroupsSection";
import {
  ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS,
  ADMIN_PRODUCT_FORM_CONTROL_CLASS,
  ADMIN_PRODUCT_FORM_MEDIUM_CONTROL_CLASS,
  defaultCoverImageAlt,
  defaultGalleryImageAlt,
} from "@/modules/admin/pages/product/productFormPresentation";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import { deleteAdminProduct, submitAdminProductForm } from "@/modules/admin/pages/product/productFormActions";
import { buildProductFormFromProduct } from "@/modules/admin/pages/product/productFormHydration";
import { getProductFormSaveBlockMessage } from "@/modules/admin/pages/product/productFormValidation";
import {
  clearProductVideoUrl,
  removeProductGalleryImage,
  updateProductDefaultVariantField,
  updateProductGalleryImageAlt,
  type DefaultVariantSyncedField,
} from "@/modules/admin/pages/product/productFormState";
import { useProductMediaUploads } from "@/modules/admin/pages/product/useProductMediaUploads";
import { useProductSkuMatrix } from "@/modules/admin/pages/product/useProductSkuMatrix";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const tempId = tempVariantId;

export default function AdminProductForm() {
  const { tText } = useAdminT();
  const { complianceType: labelComplianceType, text: L } = useAdminDisplayLabel();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goBack = useGoBack("/admin/products");
  const { id } = useParams();
  const isNew = id === "new";

  const invalidateProductCaches = async () => {
    const tasks = [
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() }),
    ];
    if (id && id !== "new") {
      tasks.push(queryClient.invalidateQueries({ queryKey: adminQueryKeys.productForm(id) }));
    }
    await Promise.all(tasks);
  };

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showDefaultSkuAdvanced, setShowDefaultSkuAdvanced] = useState(false);
  const [form, setForm] = useState<ProductFormPayloadSlice>(createEmptyProductForm);
  const {
    uploadingCover,
    uploadingGallery,
    uploadingVariantImageIndex,
    variantUploadProgress,
    uploadProgress,
    uploadImageFile,
    handleImageUpload,
    handleVariantImageUpload,
    handleVideoUpload,
  } = useProductMediaUploads({ setForm, tText });
  const { updateSpecGroups, convertToMatrixMode } = useProductSkuMatrix({ setForm });

  const categoriesQuery = useQuery({
    queryKey: adminQueryKeys.categories(),
    queryFn: categoryService.fetchCategories,
    staleTime: 60_000,
  });

  const tagsQuery = useQuery({
    queryKey: adminQueryKeys.productTags(),
    queryFn: fetchProductTags,
    staleTime: 60_000,
  });

  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

  const productQuery = useQuery({
    queryKey: adminQueryKeys.productForm(id || "new"),
    queryFn: () => fetchProductById(id!),
    enabled: !isNew && !!id,
    staleTime: 60_000,
  });

  const loading = !isNew && productQuery.isLoading && !productQuery.data;
  const [formHydrated, setFormHydrated] = useState(isNew);
  const { markClean } = useAdminFormDirty(form, formHydrated && !loading);

  const tabTitle = useMemo(() => {
    if (isNew) return null;
    if (form.name.trim()) return tText(`编辑商品：${form.name.trim()}`);
    if (id) return tText(`编辑商品 #${id}`);
    return null;
  }, [form.name, id, isNew, tText]);
  useAdminTabTitle(tabTitle, formHydrated && !loading && Boolean(tabTitle));

  useEffect(() => {
    const data = productQuery.data;
    if (!data) return;
    setForm(buildProductFormFromProduct(data));
    setFormHydrated(true);
  }, [productQuery.data]);

  useEffect(() => {
    if (!productQuery.isError) return;
    toast.error(toastErrorMessage(productQuery.error, "加载商品信息失败"));
  }, [productQuery.error, productQuery.isError]);

  const uploadBusy = uploadingCover || uploadingGallery || uploadingVariantImageIndex !== null;

  const handleSave = async (publish = false) => {
    if (saving || deleting) return;
    const blockMessage = getProductFormSaveBlockMessage({ form, uploadBusy, isNew, productId: id });
    if (blockMessage) { toast.error(tText(blockMessage)); return; }
    setSaving(true);
    try {
      const result = await submitAdminProductForm({
        form,
        publish,
        isNew,
        productId: id,
        createProduct,
        updateProduct,
      });
      toast.success(tText(result === "created" ? "商品创建成功" : "商品更新成功"));
      await invalidateProductCaches();
      markClean();
      navigate("/admin/products");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || saving) return;
    if (isNew || !id) return;
    setDeleting(true);
    try {
      await deleteAdminProduct({ productId: id, deleteProduct });
      toast.success(tText("已删除"));
      await invalidateProductCaches();
      navigate("/admin/products");
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    } finally {
      setDeleting(false);
    }
  };

  const categoryOptions = flattenCategories(categories);
  const isSingleDefaultSku = form.spec_groups.length === 0 && form.variants.length === 1;
  const enabledStockTotal = form.variants.reduce(
    (sum, row) => sum + (row.enabled === false ? 0 : Number(row.stock || 0)),
    0,
  );

  const updateDefaultVariantField = (field: DefaultVariantSyncedField, value: string) => {
    setForm((f) => updateProductDefaultVariantField(f, field, value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UnifiedButton onClick={goBack}>
          <ArrowLeft size={20} className="text-foreground" />
        </UnifiedButton>
        <h2 className="text-lg font-semibold text-foreground">{isNew ? "新增商品" : "编辑商品"}</h2>
      </div>

      {loading ? (
        <AdminFormSectionsSkeleton sections={4} />
      ) : (
      <PermissionGate
        permission="product.manage"
        fallback={
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground"><Tx>
            你仅有查看权限，无法编辑或新建商品。
          </Tx></p>
        }
      >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="order-2 space-y-4 lg:order-none lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="mb-3">
              <AdminSectionTitle
                title={<Tx>商品图片</Tx>}
                hint={<>{IMAGE_UPLOAD_HINT_API} {IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT}</>}
              />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>封面图</Tx></label>
                  <UploadDropZone
                    disabled={uploadingCover}
                    className={`relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border sm:mx-0 ${uploadingCover ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:border-gold/50"}`}
                    onFiles={(files) => {
                      const file = files[0];
                      if (file) void uploadImageFile(file, "cover");
                    }}
                  >
                    {form.cover_image ? (
                      <img src={form.cover_image} alt={form.cover_image_alt || `${form.name || "商品"} 封面图`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload size={22} className="mx-auto text-muted-foreground" />
                        <span className="mt-1 block text-xs text-muted-foreground"><Tx>上传封面</Tx></span>
                      </div>
                    )}
                    {uploadingCover ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="mt-2 text-xs"><Tx>图片上传中...</Tx></span>
                        {uploadProgress !== null ? <span className="text-[11px]">{uploadProgress}%</span> : null}
                      </div>
                    ) : null}
                    <input disabled={uploadingCover} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} />
                  </UploadDropZone>
                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      封面图说明（alt）
                    </label>
                    <input
                      value={form.cover_image_alt}
                      onChange={(e) => setForm((f) => ({ ...f, cover_image_alt: e.target.value }))}
                      maxLength={255}
                      placeholder={defaultCoverImageAlt(form.name)}
                      className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
                    />
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      用来给搜索引擎和读屏工具理解图片，不会显示在商品详情正文里。
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>轮播图（最多 6 张）</Tx></label>
                  <div className="flex flex-wrap gap-2">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                        <img src={img} alt={form.image_alts[i] || `${form.name || "商品"} 详情图 ${i + 1}`} className="h-full w-full object-cover" />
                        <UnifiedButton onClick={() => setForm((f) => removeProductGalleryImage(f, i))} className={`absolute top-0 right-0 rounded-bl px-1 text-xs ${THEME_BTN_DANGER_SOLID}`}>×</UnifiedButton>
                      </div>
                    ))}
                    {uploadingGallery && (
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-secondary/60 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="mt-1"><Tx>上传中...</Tx></span>
                        {uploadProgress !== null ? <span className="text-[10px]">{uploadProgress}%</span> : null}
                      </div>
                    )}
                    {form.images.length < 6 && (
                      <UploadDropZone
                        disabled={uploadingGallery}
                        className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border ${uploadingGallery ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gold/50"}`}
                        onFiles={(files) => {
                          const file = files[0];
                          if (file) void uploadImageFile(file, "gallery");
                        }}
                      >
                        <ImagePlus size={18} className="text-muted-foreground" />
                        <input disabled={uploadingGallery} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "gallery")} />
                      </UploadDropZone>
                    )}
                  </div>
                  {form.images.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {form.images.map((img, i) => (
                        <div key={`${img}-${i}`} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2">
                          <img src={img} alt={form.image_alts[i] || defaultGalleryImageAlt(form.name, i)} className="h-12 w-12 rounded-md object-cover" />
                          <input
                            value={form.image_alts[i] || ""}
                            onChange={(e) => setForm((f) => updateProductGalleryImageAlt(f, i, e.target.value))}
                            maxLength={255}
                            placeholder={defaultGalleryImageAlt(form.name, i)}
                            className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground"><Tx>详情视频（可选）</Tx></label>
                    <AdminFieldHint
                      contentClassName="max-w-sm"
                      text={(
                        <>
                          <Tx>
                            仅在商品详情页图集展示，商品卡不展示。支持 MP4 / WebM / MOV，单个视频最大 50MB；建议使用 H.264 MP4 以获得最佳兼容性。
                          </Tx>
                          <p className="mt-1"><Tx>
                            画面比例请与「站点外观 → 商品图比例」一致（常见为 1:1，如 1080×1080 / 720×720；若为 3:4 则如 1080×1440）。码率约 5–8 Mbps，时长 1 分钟内更易压在 50MB 内。
                            详情页图集主区域固定为当前主题的商品图比例，视频在区域内 object-contain：与主题同比例导出时黑边最少；横屏或与主题不一致时可能出现留黑。
                          </Tx></p>
                        </>
                      )}
                    />
                  </div>
                  {form.video_url && (
                    <UnifiedButton
                      type="button"
                      onClick={() => setForm(clearProductVideoUrl)}
                      className={`shrink-0 text-xs hover:underline ${THEME_TEXT_DANGER}`}
                    ><Tx>
                      清除
                    </Tx></UnifiedButton>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    placeholder={tText("填写视频 URL，或点击右侧上传")}
                    className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
                  />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-gold/50 hover:bg-secondary">
                    <Video size={16} /><Tx>
                    上传视频
                    </Tx><input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                  </label>
                </div>
                {form.video_url ? (
                  <div
                    className="mt-3 w-full max-w-md overflow-hidden rounded-lg bg-black"
                    style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
                  >
                    <video
                      src={form.video_url}
                      className="h-full w-full object-contain"
                      controls
                      preload="metadata"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground"><Tx>基本信息</Tx></h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>商品名称</Tx></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tText("输入商品名称")} className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  <Tx>库存预警阈值（可选）</Tx>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.stock_warning_threshold}
                  onChange={(e) => updateDefaultVariantField("stock_warning_threshold", e.target.value)}
                  placeholder="5"
                  className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
                />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>库存低于或等于此值时会提示有可能补货。空值时默认按 5。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>默认展示售价 (RM)</Tx></label>
                <input value={form.price} onChange={(e) => updateDefaultVariantField("price", e.target.value)} placeholder="0.00" className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>保存时与默认 SKU 售价保持一致；多规格商品以前台默认 SKU 作为展示价。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>划线原价 (RM)</Tx></label>
                <input value={form.original_price} onChange={(e) => updateDefaultVariantField("original_price", e.target.value)} placeholder={tText("留空则不展示")} className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint
                    text={
                      <Tx>
                        与下方 SKU「划线原价」为同一字段（默认 SKU 双向同步）。须大于售价时，前台才显示删除线；不是成本价。
                      </Tx>
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>默认 SKU 初始库存</Tx></label>
                <input
                  type="number"
                  min={0}
                  value={isSingleDefaultSku ? form.stock : String(enabledStockTotal)}
                  onChange={(e) => updateDefaultVariantField("stock", e.target.value)}
                  disabled={!isSingleDefaultSku}
                  placeholder="0"
                  className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
                />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>保存时写入默认 SKU；大批量入库仍建议在库存中心操作。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>成本价 (RM)</Tx></label>
                <input value={form.cost_price} onChange={(e) => updateDefaultVariantField("cost_price", e.target.value)} placeholder="0.00" className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>成本价只用于后台毛利核算，保存时同步默认 SKU。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>库存下限</Tx></label>
                <input type="number" min={0} value={form.stock_lower_limit} onChange={(e) => updateDefaultVariantField("stock_lower_limit", e.target.value)} placeholder="0" className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>下限用于触发补货提醒，保存时同步默认 SKU。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>库存上限</Tx></label>
                <input type="number" min={0} value={form.stock_upper_limit} onChange={(e) => updateDefaultVariantField("stock_upper_limit", e.target.value)} placeholder="0" className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>上限是建议补到的目标库存，保存时同步默认 SKU。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>销量</Tx></label>
                <input
                  type="number"
                  value={form.sales_count}
                  onChange={(e) => setForm({ ...form, sales_count: e.target.value })}
                  placeholder="0"
                  className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
                />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>订单付款后由系统自动累加；可手动修正起步销量。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类</Tx></label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}>
                  <option value=""><Tx>选择分类</Tx></option>
                  {categoryOptions.map((c: FlatCategory) => (
                    <option key={c.id} value={c.id}>
                      {"　".repeat(c.level)}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>排序</Tx></label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" className={ADMIN_PRODUCT_FORM_CONTROL_CLASS} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {form.spec_groups.length === 0 && form.variants.length === 1 ? <Tx>默认 SKU 设置</Tx> : <Tx>规格 / SKU</Tx>}
              </h3>
              {!isSingleDefaultSku ? (
                <UnifiedButton
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      variants: [
                        ...f.variants,
                        {
                          title: "",
                          sku_code: "",
                          price: f.price || "0",
                          stock: f.stock || "0",
                          stock_warning_threshold: f.stock_warning_threshold || "5",
                          stock_lower_limit: f.stock_lower_limit || "",
                          stock_upper_limit: f.stock_upper_limit || "",
                          sort_order: f.variants.length,
                          is_default: false,
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <Plus size={14} /><Tx> 添加 SKU 行
                </Tx></UnifiedButton>
              ) : null}
            </div>
            <div className="flex justify-end">
              <AdminFieldHint
                text={<Tx>可在此维护各规格库存与价格；保存后同步到商品总库存。</Tx>}
              />
            </div>
            {form.spec_groups.length === 0 && form.variants.length === 1 ? (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs leading-5 text-muted-foreground">
                <p className="font-medium text-foreground"><Tx>当前商品未启用多规格，系统将使用“默认规格 / 默认 SKU”管理库存、成本、条码和预警。</Tx></p>
                <p className="mt-1"><Tx>如果商品有颜色、尺码、口味等差异，可以转为矩阵规格，为每个规格组合单独维护 SKU。</Tx></p>
                <UnifiedButton
                  type="button"
                  onClick={() => setShowDefaultSkuAdvanced((v) => !v)}
                  className="mt-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {showDefaultSkuAdvanced ? tText("收起默认 SKU 高级设置") : tText("展开默认 SKU 高级设置")}
                </UnifiedButton>
              </div>
            ) : null}
            {form.spec_groups.length > 0 || form.variants.length > 1 ? (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
                <p className="font-medium text-foreground"><Tx>多规格商品以 SKU 表格维护售价、划线原价与库存。</Tx></p>
                <p className="mt-1 text-muted-foreground">
                  <Tx>基本信息只显示默认 SKU 快照和商品总库存；修改默认 SKU 后会同步到这里。</Tx>
                </p>
                <p className="mt-1">
                  {tText("默认展示售价")}：RM {form.price || "0"}；{" "}
                  {tText("划线原价")}：{form.original_price ? `RM ${form.original_price}` : "-"}；{" "}
                  {tText("商品总库存")}：{enabledStockTotal}
                </p>
              </div>
            ) : null}
            <ProductSpecGroupsSection
              specGroups={form.spec_groups}
              updateSpecGroups={updateSpecGroups}
              convertToMatrixMode={convertToMatrixMode}
              tempId={tempId}
              tText={tText}
            />
            {form.spec_groups.length > 0 || form.variants.length > 1 || showDefaultSkuAdvanced ? (
              <ProductVariantMatrixTable
                form={form}
                setForm={setForm}
                uploadingVariantImageIndex={uploadingVariantImageIndex}
                variantUploadProgress={variantUploadProgress}
                onVariantImageUpload={handleVariantImageUpload}
                tText={tText}
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <AdminSectionTitle
              title={<Tx>自定义标签</Tx>}
              hint={<Tx>
                标签在「标签管理」中维护；勾选后关联本商品，前台商品列表与详情页会与「热销 / 新品」徽章一并展示。
              </Tx>}
            />
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground"><Tx>暂无可用标签，请先到「标签管理」新建。</Tx></p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map((t) => {
                  const on = form.tag_ids.includes(t.id);
                  return (
                    <UnifiedButton
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          tag_ids: on ? f.tag_ids.filter((x) => x !== t.id) : [...f.tag_ids, t.id],
                        }))
                      }
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-transform active:scale-95 ${
                        on
                          ? "border-current"
                          : "border-border bg-secondary text-muted-foreground hover:border-gold/40"
                      }`}
                    style={on ? {
                      backgroundColor: t.bg_color || "#FEF3C7",
                      color: t.text_color || "#92400E",
                    } : undefined}
                    >
                      {t.name}
                    </UnifiedButton>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground"><Tx>商品描述</Tx></h3>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={tText("简短商品描述...")}
              className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
            />
          </div>
        </div>

        <div className="order-1 space-y-4 lg:order-none">
          <div className="sticky top-4 z-10 rounded-xl border border-border bg-card p-4 space-y-3 sm:p-6 lg:static lg:z-auto">
            <h3 className="text-sm font-semibold text-foreground"><Tx>状态设置</Tx></h3>
            <div className="rounded-lg border border-border p-3">
              <AdminLabelWithHint
                label={<Tx>销售状态</Tx>}
                hint={<Tx>草稿可用于先录入资料，确认后再上架。</Tx>}
              />
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "draft" | "active" | "inactive" })
                }
                className={ADMIN_PRODUCT_FORM_MEDIUM_CONTROL_CLASS}
              >
                <option value="draft"><Tx>草稿（前台不可见）</Tx></option>
                <option value="active"><Tx>上架</Tx></option>
                <option value="inactive"><Tx>下架</Tx></option>
              </select>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground"><Tx>合规与收录</Tx></p>
              <label className="flex items-center justify-between">
                <span className="text-sm text-foreground"><Tx>是否受年龄限制</Tx></span>
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={form.is_age_restricted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      is_age_restricted: checked,
                      compliance_type: checked && prev.compliance_type === "normal" ? "age_restricted" : prev.compliance_type,
                      allow_index: checked ? false : prev.allow_index,
                    }));
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground"><Tx>最低年龄</Tx></label>
                  <input
                    type="number"
                    min={0}
                    value={form.minimum_age}
                    onChange={(e) => setForm((prev) => ({ ...prev, minimum_age: e.target.value }))}
                    className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
                    placeholder={tText("例如 18")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground"><Tx>合规类型</Tx></label>
                  <select
                    value={form.compliance_type}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        compliance_type: value,
                        allow_index: value === "normal" && !prev.is_age_restricted ? prev.allow_index : false,
                      }));
                    }}
                    className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
                  >
                    {form.compliance_type && !COMPLIANCE_TYPE_LABELS[form.compliance_type] ? (
                      <option value={form.compliance_type}>{labelComplianceType(form.compliance_type)}</option>
                    ) : null}
                    {Object.entries(COMPLIANCE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {L(label)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                value={form.region_notice}
                onChange={(e) => setForm((prev) => ({ ...prev, region_notice: e.target.value }))}
                placeholder={tText("地区适用说明")}
                className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
              />
              <textarea
                rows={2}
                value={form.compliance_notice}
                onChange={(e) => setForm((prev) => ({ ...prev, compliance_notice: e.target.value }))}
                placeholder={tText("合规说明")}
                className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
              />
              <label className="flex items-center justify-between">
                <span className="text-sm text-foreground"><Tx>允许搜索引擎收录</Tx></span>
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={form.allow_index}
                  onChange={(e) => setForm((prev) => ({ ...prev, allow_index: e.target.checked }))}
                />
              </label>
            </div>
            {(
              [
                { label: tText("热门"), desc: "显示热门标签", key: "is_hot" as const },
                { label: tText("是否标记为新品"), desc: "显示新品标签并进入新品上市专题页", key: "is_new" as const },
                { label: tText("推荐"), desc: "首页推荐展示", key: "is_recommended" as const },
              ] as const
            ).map((t) => (
              <label key={t.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <AdminFieldHint text={t.desc} />
                </div>
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={form[t.key]}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, [t.key]: e.target.checked }));
                  }}
                />
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground"><Tx>预览</Tx></h3>
            <div className="rounded-lg border border-border p-3">
              {form.cover_image ? (
                <img src={form.cover_image} alt={form.cover_image_alt || `${form.name || "商品"} 卡片预览图`} className="mb-2 h-32 w-full rounded-md object-cover" />
              ) : (
                <div className="mb-2 h-32 rounded-md bg-secondary" />
              )}
              <div className="mb-1 flex flex-wrap gap-1">
                {form.tag_ids.length > 0 &&
                  form.tag_ids.map((tid) => {
                    const meta = allTags.find((x) => x.id === tid);
                    if (!meta) return null;
                    return (
                      <span
                        key={tid}
                        className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: meta.bg_color || "#FEF3C7",
                          color: meta.text_color || "#92400E",
                          borderColor: meta.bg_color || "#FEF3C7",
                        }}
                      >
                        {meta.name}
                      </span>
                    );
                  })}
              </div>
              <p className="text-sm font-medium text-foreground">{form.name || "商品名称"}</p>
              <p className="mt-1 text-sm font-bold text-theme-price">RM {form.price || "0.00"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <LoadingButton
              type="button"
              variant="gold"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={saving || deleting || uploadBusy}
              onClick={() => void handleSave(false)}
              className="w-full rounded-lg px-6 py-3 text-sm font-semibold"
            ><Tx>
              保存
            </Tx></LoadingButton>
            <LoadingButton
              type="button"
              variant="outline"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={saving || deleting || uploadBusy}
              onClick={() => void handleSave(true)}
              className="w-full rounded-lg border border-gold bg-gold/10 px-6 py-3 text-sm font-semibold text-theme-price"
            ><Tx>
              保存并上架
            </Tx></LoadingButton>
            {!isNew && (
              <LoadingButton
                type="button"
                variant="outline"
                state={deleting ? "loading" : "normal"}
                loadingText="删除中..."
                disabled={deleting || saving || uploadBusy}
                onClick={() => setDeleteConfirmOpen(true)}
                className={`w-full rounded-lg border px-6 py-3 text-sm font-semibold ${THEME_OUTLINE_DANGER}`}
              ><Tx>
                删除商品
              </Tx></LoadingButton>
            )}
            <UnifiedButton onClick={goBack} className="w-full rounded-lg border border-border px-6 py-3 text-sm text-muted-foreground"><Tx>取消</Tx></UnifiedButton>
          </div>
        </div>
      </div>
      </PermissionGate>
      )}
      <AnimatedConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        danger
        title={tText("删除商品")}
        description={`确定删除「${form.name || id}」？删除后可在回收站恢复。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}
