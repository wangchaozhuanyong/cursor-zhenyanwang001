import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProductById, createProduct, updateProduct, deleteProduct, fetchProductTags } from "@/services/admin/productService";
import * as categoryService from "@/services/admin/categoryService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminGoBack } from "@/hooks/useAdminGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminFormSectionsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { flattenCategories } from "@/utils/categoryTree";
import type { Category } from "@/types/category";
import { Tx } from "@/components/admin/AdminText";
import { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { tempVariantId } from "@/utils/productFormVariantUtils";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { ADMIN_PRODUCT_FORM_CONTROL_CLASS } from "@/modules/admin/pages/product/productFormPresentation";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import { deleteAdminProduct, submitAdminProductForm } from "@/modules/admin/pages/product/productFormActions";
import { buildProductFormFromProduct } from "@/modules/admin/pages/product/productFormHydration";
import { getProductFormSaveBlockMessage } from "@/modules/admin/pages/product/productFormValidation";
import { useProductMediaUploads } from "@/modules/admin/pages/product/useProductMediaUploads";
import { useProductSkuMatrix } from "@/modules/admin/pages/product/useProductSkuMatrix";
import ProductMediaSection from "@/modules/admin/pages/product/ProductMediaSection";
import ProductBasicInfoSection from "@/modules/admin/pages/product/ProductBasicInfoSection";
import ProductSkuSection from "@/modules/admin/pages/product/ProductSkuSection";
import ProductStatusSidebar from "@/modules/admin/pages/product/ProductStatusSidebar";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { invalidatePublicProductStoreCache } from "@/stores/useProductStore";

const tempId = tempVariantId;

export default function AdminProductForm() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goBack = useAdminGoBack("/admin/products");
  const { id } = useParams();
  const isNew = id === "new";

  const invalidateProductCaches = async () => {
    invalidatePublicProductStoreCache({ productId: id && id !== "new" ? id : undefined });
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
          <ProductMediaSection
            form={form}
            setForm={setForm}
            uploadingCover={uploadingCover}
            uploadingGallery={uploadingGallery}
            uploadProgress={uploadProgress}
            uploadImageFile={uploadImageFile}
            handleImageUpload={handleImageUpload}
            handleVideoUpload={handleVideoUpload}
            tText={tText}
          />

          <ProductBasicInfoSection
            form={form}
            setForm={setForm}
            categoryOptions={categoryOptions}
            isSingleDefaultSku={isSingleDefaultSku}
            enabledStockTotal={enabledStockTotal}
            tText={tText}
          />

          <ProductSkuSection
            form={form}
            setForm={setForm}
            isSingleDefaultSku={isSingleDefaultSku}
            enabledStockTotal={enabledStockTotal}
            showDefaultSkuAdvanced={showDefaultSkuAdvanced}
            setShowDefaultSkuAdvanced={setShowDefaultSkuAdvanced}
            updateSpecGroups={updateSpecGroups}
            convertToMatrixMode={convertToMatrixMode}
            tempId={tempId}
            uploadingVariantImageIndex={uploadingVariantImageIndex}
            variantUploadProgress={variantUploadProgress}
            onVariantImageUpload={handleVariantImageUpload}
            tText={tText}
          />

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
                          : "border-border bg-secondary text-muted-foreground hover:border-[color-mix(in_srgb,var(--theme-primary)_40%,var(--theme-border))]"
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

        <ProductStatusSidebar
          form={form}
          setForm={setForm}
          allTags={allTags}
          isNew={isNew}
          saving={saving}
          deleting={deleting}
          uploadBusy={uploadBusy}
          onSave={handleSave}
          onCancel={goBack}
          setDeleteConfirmOpen={setDeleteConfirmOpen}
          tText={tText}
        />
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
