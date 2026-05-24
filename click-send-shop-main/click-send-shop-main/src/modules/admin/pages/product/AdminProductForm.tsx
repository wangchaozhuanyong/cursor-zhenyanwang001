import { ArrowLeft, Upload, ImagePlus, Loader2, Trash2, Plus, Video } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProductById, createProduct, updateProduct, deleteProduct, fetchProductTags } from "@/services/admin/productService";
import * as categoryService from "@/services/admin/categoryService";
import PermissionGate from "@/components/admin/PermissionGate";
import * as uploadService from "@/services/uploadService";
import { validateUploadFile } from "@/services/uploadService";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminFormSectionsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT } from "@/constants/imageUploadHints";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { flattenCategories, type FlatCategory } from "@/utils/categoryTree";
import type { Category } from "@/types/category";
import type { Product, ProductSpecGroup, ProductSpecValue, ProductTag } from "@/types/product";
import type { AdminProductUpsertPayload } from "@/services/admin/productService";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminLabelWithHint, AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { AnimatedConfirmDialog, LoadingButton, UploadDropZone } from "@/modules/micro-interactions";
import {
  THEME_BTN_DANGER_SOLID,
  THEME_HOVER_TEXT_DANGER,
  THEME_OUTLINE_DANGER,
  THEME_TEXT_DANGER,
} from "@/utils/themeVisuals";
import { adminTableClassName, adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { COMPLIANCE_TYPE_LABELS } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useAdminT } from "@/hooks/useAdminT";

type AdminSpecValue = {
  id?: string;
  value: string;
  image_url?: string;
  sort_order: number;
};

type AdminSpecGroup = {
  id?: string;
  name: string;
  sort_order: number;
  values: AdminSpecValue[];
};

type AdminVariantForm = {
  id?: string;
  title: string;
  sku_code: string;
  price: string;
  original_price?: string;
  cost_price?: string;
  stock: string;
  stock_warning_threshold?: string;
  stock_lower_limit?: string;
  stock_upper_limit?: string;
  barcode?: string;
  image_url?: string;
  weight?: string;
  enabled?: boolean;
  sort_order: number;
  is_default: boolean;
  spec_value_ids?: string[];
};

const MAX_SPEC_GROUPS = 3;
const MAX_SPEC_VALUES_PER_GROUP = 20;
const MAX_SKU_MATRIX_SIZE = 200;
const DEFAULT_VARIANT_TITLE = "默认规格";

const tempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function cartesianSpecValues(groups: AdminSpecGroup[]) {
  const usable = groups
    .map((group) => ({
      ...group,
      values: group.values.filter((value) => value.value.trim()),
    }))
    .filter((group) => group.name.trim() && group.values.length > 0);
  if (!usable.length) return [];
  return usable.reduce<Array<Array<{ group: AdminSpecGroup; value: AdminSpecValue }>>>((acc, group) => {
    const entries = group.values.map((value) => ({ group, value }));
    if (!acc.length) return entries.map((entry) => [entry]);
    return acc.flatMap((combo) => entries.map((entry) => [...combo, entry]));
  }, []);
}

function specComboKey(ids: string[]) {
  return ids.filter(Boolean).join("|");
}

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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVariantImageIndex, setUploadingVariantImageIndex] = useState<number | null>(null);
  const [variantUploadProgress, setVariantUploadProgress] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    original_price: "",
    sales_count: "",
    stock: "",
    stock_warning_threshold: "",
    stock_lower_limit: "",
    stock_upper_limit: "",
    category_id: "",
    sort_order: "",
    description: "",
    cover_image: "",
    video_url: "",
    images: [] as string[],
    status: "active" as "draft" | "active" | "inactive",
    is_hot: false,
    is_new: false,
    is_recommended: false,
    is_age_restricted: false,
    minimum_age: "",
    compliance_type: "normal",
    region_notice: "",
    compliance_notice: "",
    allow_index: true,
    tag_ids: [] as string[],
    spec_groups: [] as AdminSpecGroup[],
    variants: [
      { title: DEFAULT_VARIANT_TITLE, sku_code: "", price: "", stock: "", sort_order: 0, is_default: true },
    ] as AdminVariantForm[],
  });

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

  useEffect(() => {
    const data = productQuery.data;
    if (!data) return;
            const st = data.status === "draft" || data.status === "inactive" ? data.status : "active";
            const vlist =
              data.variants?.length ?
                data.variants.map((v, i) => ({
                  id: v.id,
                  title: v.title || (v.is_default ? DEFAULT_VARIANT_TITLE : ""),
                  sku_code: (v.sku_code as string) || "",
                  price: String(v.price ?? ""),
                  original_price: v.original_price != null ? String(v.original_price) : "",
                  cost_price: v.cost_price != null ? String(v.cost_price) : "",
                  stock: String(v.stock ?? ""),
                  stock_warning_threshold: v.stock_warning_threshold != null ? String(v.stock_warning_threshold) : "",
                  stock_lower_limit: v.stock_lower_limit != null ? String(v.stock_lower_limit) : "",
                  stock_upper_limit: v.stock_upper_limit != null ? String(v.stock_upper_limit) : "",
                  barcode: v.barcode || "",
                  image_url: v.image_url || "",
                  weight: v.weight != null ? String(v.weight) : "",
                  enabled: v.enabled !== false,
                  sort_order: v.sort_order ?? i,
                  is_default: !!v.is_default,
                  spec_value_ids: Array.isArray(v.spec_value_ids) ? v.spec_value_ids : [],
                })) :
                [
                  {
                    title: DEFAULT_VARIANT_TITLE,
                    sku_code: "",
                    price: data.price?.toString() || "",
                    stock: data.stock?.toString() || "",
                    stock_warning_threshold:
                      data.stock_warning_threshold != null
                        ? String(data.stock_warning_threshold)
                        : (data.default_variant?.stock_warning_threshold != null
                          ? String(data.default_variant.stock_warning_threshold)
                          : ""),
                    stock_lower_limit:
                      data.stock_lower_limit != null
                        ? String(data.stock_lower_limit)
                        : (data.default_variant?.stock_lower_limit != null ? String(data.default_variant.stock_lower_limit) : ""),
                    stock_upper_limit:
                      data.stock_upper_limit != null
                        ? String(data.stock_upper_limit)
                        : (data.default_variant?.stock_upper_limit != null ? String(data.default_variant.stock_upper_limit) : ""),
                    sort_order: 0,
                    is_default: true,
                    enabled: true,
                  },
                ];
            setForm({
              name: data.name || "",
              price: data.price?.toString() || "",
              original_price:
                data.original_price != null ? data.original_price.toString() : "",
              sales_count: data.sales_count != null ? String(data.sales_count) : "0",
              stock: data.stock?.toString() || "",
              stock_warning_threshold:
                data.stock_warning_threshold != null
                  ? String(data.stock_warning_threshold)
                  : (data.default_variant?.stock_warning_threshold != null
                    ? String(data.default_variant.stock_warning_threshold)
                    : ""),
              stock_lower_limit:
                data.stock_lower_limit != null
                  ? String(data.stock_lower_limit)
                  : (data.default_variant?.stock_lower_limit != null ? String(data.default_variant.stock_lower_limit) : ""),
              stock_upper_limit:
                data.stock_upper_limit != null
                  ? String(data.stock_upper_limit)
                  : (data.default_variant?.stock_upper_limit != null ? String(data.default_variant.stock_upper_limit) : ""),
              category_id: data.category_id || "",
              sort_order: data.sort_order?.toString() || "",
              description: data.description || "",
              cover_image: data.cover_image || "",
              video_url: data.video_url || "",
              images: data.images || [],
              status: st,
              is_hot: !!data.is_hot,
              is_new: !!data.is_new,
              is_recommended: !!data.is_recommended,
              is_age_restricted: !!data.is_age_restricted,
              minimum_age: data.minimum_age != null ? String(data.minimum_age) : "",
              compliance_type: data.compliance_type || "normal",
              region_notice: data.region_notice || "",
              compliance_notice: data.compliance_notice || "",
              allow_index: data.allow_index == null ? true : Number(data.allow_index) === 1,
              tag_ids: Array.isArray(data.tags) ? data.tags.map((t: { id: string }) => t.id) : [],
              spec_groups: Array.isArray(data.spec_groups)
                ? data.spec_groups.map((g: ProductSpecGroup, gi: number) => ({
                  id: g.id,
                  name: g.name || "",
                  sort_order: g.sort_order ?? gi,
                  values: Array.isArray(g.values)
                    ? g.values.map((v: ProductSpecValue, vi: number) => ({
                      id: v.id,
                      value: v.value || "",
                      image_url: v.image_url || "",
                      sort_order: v.sort_order ?? vi,
                    }))
                    : [],
                }))
                : [],
              variants: vlist,
            });
  }, [productQuery.data]);

  useEffect(() => {
    if (!productQuery.isError) return;
    toast.error(toastErrorMessage(productQuery.error, "加载商品信息失败"));
  }, [productQuery.error, productQuery.isError]);

  const validateImageBeforeUpload = (file: File) => {
    const type = file.type.toLowerCase();
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(type)) {
      throw new Error("仅支持 JPG、PNG、WebP 图片");
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new Error("图片大小不能超过 15MB");
    }
    if (type === "image/gif") {
      toast.warning(tText("GIF 上传后可能转为静态图"));
    }
  };

  const uploadImageFile = async (file: File, field: "cover" | "gallery") => {
    if (field === "cover" && uploadingCover) return;
    if (field === "gallery" && uploadingGallery) return;
    try {
      validateImageBeforeUpload(file);
      if (field === "cover") setUploadingCover(true);
      else setUploadingGallery(true);
      setUploadProgress(0);
      validateUploadFile(file, "product");
      const res = await uploadService.uploadSingleWithProgress(file, {
        mode: "product",
        timeoutMs: 45_000,
        onProgress: (percent) => setUploadProgress(percent),
      });
      const url = res.url || "";
      if (!url) {
        toast.error(tText("服务器未返回图片地址，请检查存储配置或稍后重试"));
        return;
      }
      if (field === "cover") {
        setForm((f) => ({ ...f, cover_image: url }));
      } else {
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
      toast.success(tText("图片已上传"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "图片上传失败"));
    } finally {
      setUploadProgress(null);
      setUploadingCover(false);
      setUploadingGallery(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "cover" | "gallery") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadImageFile(file, field);
  };

  const uploadVariantImageFile = async (file: File, variantIndex: number) => {
    if (uploadingVariantImageIndex !== null) return;
    try {
      validateImageBeforeUpload(file);
      validateUploadFile(file, "product");
      setUploadingVariantImageIndex(variantIndex);
      setVariantUploadProgress(0);
      const res = await uploadService.uploadSingleWithProgress(file, {
        mode: "product",
        timeoutMs: 45_000,
        onProgress: (percent) => setVariantUploadProgress(percent),
      });
      const url = String(res.url || "").trim();
      if (!url) {
        toast.error(tText("服务器未返回图片地址，请检查存储配置或稍后重试"));
        return;
      }
      setForm((f) => {
        const nv = [...f.variants];
        nv[variantIndex] = { ...nv[variantIndex], image_url: url };
        return { ...f, variants: nv };
      });
      toast.success(tText("SKU 图片已上传"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "SKU 图片上传失败"));
    } finally {
      setUploadingVariantImageIndex(null);
      setVariantUploadProgress(null);
    }
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadVariantImageFile(file, variantIndex);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
    if (!allowed.includes(file.type)) {
      toast.error(tText("视频仅支持 MP4、WebM、MOV 格式"));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error(tText("视频大小不能超过 50MB"));
      return;
    }
    try {
      const res = await uploadService.uploadSingle(file, { mode: "video" });
      const url = res.url || "";
      if (!url) {
        toast.error(tText("服务器未返回视频地址，请检查存储配置或稍后重试"));
        return;
      }
      setForm((f) => ({ ...f, video_url: url }));
      toast.success(tText("视频已上传"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "视频上传失败"));
    }
  };

  const regenerateSkuMatrix = (nextGroups: AdminSpecGroup[]) => {
    const combos = cartesianSpecValues(nextGroups);
    if (!combos.length) {
      setForm((f) => ({ ...f, spec_groups: nextGroups }));
      return;
    }
    if (combos.length > MAX_SKU_MATRIX_SIZE) {
      toast.error(`SKU 组合不能超过 ${MAX_SKU_MATRIX_SIZE} 个`);
      return;
    }
    setForm((f) => {
      const existingByKey = new Map(
        f.variants
          .filter((variant) => (variant.spec_value_ids ?? []).length > 0)
          .map((variant) => [specComboKey(variant.spec_value_ids ?? []), variant]),
      );
      const nextVariants = combos.map((combo, index) => {
        const ids = combo.map((item) => item.value.id || "").filter(Boolean);
        const title = combo.map((item) => item.value.value.trim()).join(" / ");
        const old = existingByKey.get(specComboKey(ids));
        return {
          id: old?.id,
          title,
          sku_code: old?.sku_code || "",
          price: old?.price || f.price || "0",
          original_price: old?.original_price || "",
          cost_price: old?.cost_price || "",
          stock: old?.stock || "0",
          stock_warning_threshold:
            old?.stock_warning_threshold || (index === 0 ? f.stock_warning_threshold || "5" : "5"),
          stock_lower_limit: old?.stock_lower_limit || (index === 0 ? f.stock_lower_limit || "" : ""),
          stock_upper_limit: old?.stock_upper_limit || (index === 0 ? f.stock_upper_limit || "" : ""),
          barcode: old?.barcode || "",
          image_url: old?.image_url || "",
          weight: old?.weight || "",
          enabled: old?.enabled !== false,
          sort_order: index,
          is_default: old?.is_default || index === 0,
          spec_value_ids: ids,
        };
      });
      if (!nextVariants.some((variant) => variant.is_default) && nextVariants[0]) {
        nextVariants[0].is_default = true;
      }
      let seenDefault = false;
      return {
        ...f,
        spec_groups: nextGroups,
        variants: nextVariants.map((variant) => {
          if (variant.is_default && !seenDefault) {
            seenDefault = true;
            return variant;
          }
          return { ...variant, is_default: false };
        }),
      };
    });
  };

  const updateSpecGroups = (updater: (groups: AdminSpecGroup[]) => AdminSpecGroup[]) => {
    setForm((f) => {
      const next = updater(f.spec_groups);
      window.setTimeout(() => regenerateSkuMatrix(next), 0);
      return { ...f, spec_groups: next };
    });
  };

  const convertToMatrixMode = () => {
    const firstVariant = form.variants[0];
    const valueId = tempId();
    const group: AdminSpecGroup = {
      id: tempId(),
      name: "规格",
      sort_order: 0,
      values: [{ id: valueId, value: firstVariant?.title || "默认规格", image_url: "", sort_order: 0 }],
    };
    setForm((f) => ({
      ...f,
      spec_groups: [group],
      variants: f.variants.slice(0, 1).map((variant) => ({
        ...variant,
        title: variant.title || "默认规格",
        spec_value_ids: [valueId],
        enabled: variant.enabled !== false,
        is_default: true,
        stock_warning_threshold: variant.stock_warning_threshold || f.stock_warning_threshold || "5",
        stock_lower_limit: variant.stock_lower_limit || f.stock_lower_limit || "",
        stock_upper_limit: variant.stock_upper_limit || f.stock_upper_limit || "",
      })),
    }));
  };

  const handleSave = async (publish = false) => {
    if (uploadingCover || uploadingGallery) {
      toast.error(tText("图片仍在上传中，请等待上传完成后再保存商品。"));
      return;
    }
    if (!form.name) { toast.error(tText("请输入商品名称")); return; }
    if (!form.variants.length) { toast.error(tText("至少保留一条规格")); return; }
    setSaving(true);
    try {
      const opNum = parseFloat(form.original_price);
      const scNum = parseInt(form.sales_count, 10);
      const mainPrice = parseFloat(form.price) || 0;
      const mainStock = parseInt(form.stock, 10) || 0;
      const mainStockWarningThreshold = form.stock_warning_threshold
        ? parseInt(form.stock_warning_threshold, 10) || 0
        : 5;
      const mainStockLowerLimit = form.stock_lower_limit ? parseInt(form.stock_lower_limit, 10) || 0 : null;
      const mainStockUpperLimit = form.stock_upper_limit ? parseInt(form.stock_upper_limit, 10) || 0 : null;
      const isSingleDefaultSku = form.spec_groups.length === 0 && form.variants.length === 1;
      const variantsPayload = form.variants.map((v, i) => ({
        id: v.id,
        title: (v.title || (isSingleDefaultSku && v.is_default ? DEFAULT_VARIANT_TITLE : "")).trim(),
        sku_code: v.sku_code.trim() || null,
        price: parseFloat(v.price) || 0,
        original_price: v.original_price ? parseFloat(v.original_price) : null,
        cost_price: v.cost_price ? parseFloat(v.cost_price) : null,
        stock: parseInt(v.stock, 10) || 0,
        stock_warning_threshold: v.stock_warning_threshold ? parseInt(v.stock_warning_threshold, 10) || 0 : 5,
        stock_lower_limit: v.stock_lower_limit ? parseInt(v.stock_lower_limit, 10) || 0 : null,
        stock_upper_limit: v.stock_upper_limit ? parseInt(v.stock_upper_limit, 10) || 0 : null,
        barcode: v.barcode?.trim() || null,
        image_url: v.image_url?.trim() || null,
        weight: v.weight ? parseFloat(v.weight) : null,
        enabled: v.enabled !== false,
        sort_order: v.sort_order ?? i,
        is_default: v.is_default,
        spec_value_ids: v.spec_value_ids ?? [],
      }));
      const defIdx = variantsPayload.findIndex((x) => x.is_default);
      if (defIdx >= 0) {
        variantsPayload[defIdx] = {
          ...variantsPayload[defIdx],
          price: mainPrice,
          stock: mainStock,
          stock_warning_threshold: mainStockWarningThreshold,
          stock_lower_limit: mainStockLowerLimit,
          stock_upper_limit: mainStockUpperLimit,
        };
      }
      const complianceType = (form.compliance_type || "normal").trim();
      const shouldNoindex = form.is_age_restricted || complianceType !== "normal";
      const payload: AdminProductUpsertPayload = {
        name: form.name,
        price: mainPrice,
        stock_warning_threshold: mainStockWarningThreshold,
        stock_lower_limit: mainStockLowerLimit,
        stock_upper_limit: mainStockUpperLimit,
        original_price:
          form.original_price === "" || !Number.isFinite(opNum) ? null : opNum,
        sales_count: Number.isFinite(scNum) ? scNum : 0,
        category_id: form.category_id || "",
        sort_order: parseInt(form.sort_order, 10) || 0,
        description: form.description,
        cover_image: form.cover_image,
        video_url: form.video_url.trim(),
        images: form.images,
        status: publish ? "active" : form.status,
        is_hot: form.is_hot,
        is_new: form.is_new,
        isNewArrival: form.is_new,
        is_recommended: form.is_recommended,
        is_age_restricted: form.is_age_restricted,
        minimum_age: form.minimum_age ? Number(form.minimum_age) : null,
        compliance_type: complianceType,
        region_notice: form.region_notice?.trim() || null,
        compliance_notice: form.compliance_notice?.trim() || null,
        allow_index: shouldNoindex ? false : form.allow_index,
        spec_groups: form.spec_groups.map((group, gi) => ({
          id: group.id,
          name: group.name,
          sort_order: group.sort_order ?? gi,
          values: group.values.map((value, vi) => ({
            id: value.id,
            value: value.value,
            image_url: value.image_url || null,
            sort_order: value.sort_order ?? vi,
          })),
        })),
        variants: variantsPayload,
        tag_ids: form.tag_ids,
      };
      if (isNew) {
        payload.stock = mainStock;
        await createProduct(payload);
        toast.success(tText("商品创建成功"));
      } else {
        await updateProduct(id!, payload);
        toast.success(tText("商品更新成功"));
      }
      await invalidateProductCaches();
      navigate("/admin/products");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !id) return;
    setDeleting(true);
    try {
      await deleteProduct(id);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={goBack}>
          <ArrowLeft size={20} className="text-foreground" />
        </button>
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
                      <img src={form.cover_image} alt="" className="h-full w-full object-cover" />
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
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>轮播图（最多 6 张）</Tx></label>
                  <div className="flex flex-wrap gap-2">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} className={`absolute top-0 right-0 rounded-bl px-1 text-xs ${THEME_BTN_DANGER_SOLID}`}>×</button>
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
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, video_url: "" }))}
                      className={`shrink-0 text-xs hover:underline ${THEME_TEXT_DANGER}`}
                    ><Tx>
                      清除
                    </Tx></button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    placeholder={tText("填写视频 URL，或点击右侧上传")}
                    className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tText("输入商品名称")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  <Tx>库存预警阈值（可选）</Tx>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.stock_warning_threshold}
                  onChange={(e) => {
                    const t = e.target.value;
                    setForm((f) => ({ ...f, stock_warning_threshold: t }));
                    setForm((f) => {
                      const defaultIdx = f.variants.findIndex((variant) => variant.is_default);
                      if (defaultIdx < 0) return f;
                      const nv = [...f.variants];
                      nv[defaultIdx] = { ...nv[defaultIdx], stock_warning_threshold: t };
                      return { ...f, variants: nv };
                    });
                  }}
                  placeholder="5"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>库存低于或等于此值时会提示有可能补货。空值时默认按 5。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>默认展示售价 (RM)</Tx></label>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>保存时与默认 SKU 售价保持一致；多规格商品以前台默认 SKU 作为展示价。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>划线原价 (RM)</Tx></label>
                <input value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder={tText("留空则不展示")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>仅当大于售价时，前台商品卡/详情页才会以删除线显示。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>默认 SKU 初始库存</Tx></label>
                <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>保存时写入默认 SKU；大批量入库仍建议在库存中心操作。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>销量</Tx></label>
                <input
                  type="number"
                  value={form.sales_count}
                  onChange={(e) => setForm({ ...form, sales_count: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <div className="mt-1 flex justify-end">
                  <AdminFieldHint text={<Tx>订单付款后由系统自动累加；可手动修正起步销量。</Tx>} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类</Tx></label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
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
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {form.spec_groups.length === 0 && form.variants.length === 1 ? <Tx>默认 SKU 设置</Tx> : <Tx>规格 / SKU</Tx>}
              </h3>
              <button
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
              </Tx></button>
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
              </div>
            ) : null}
            <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground"><Tx>规格矩阵</Tx></p>
                    <AdminFieldHint
                      text={`最多 ${MAX_SPEC_GROUPS} 组，每组 ${MAX_SPEC_VALUES_PER_GROUP} 个值，自动生成 SKU 组合。`}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {form.spec_groups.length === 0 ? (
                    <button
                      type="button"
                      onClick={convertToMatrixMode}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      启用多规格
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={form.spec_groups.length >= MAX_SPEC_GROUPS}
                    onClick={() =>
                      updateSpecGroups((groups) => [
                        ...groups,
                        { id: tempId(), name: `规格${groups.length + 1}`, sort_order: groups.length, values: [] },
                      ])
                    }
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
                  >
                    添加规格组
                  </button>
                </div>
              </div>
              {form.spec_groups.map((group, groupIdx) => (
                <div key={group.id || groupIdx} className="rounded-lg border border-border p-3">
                  <div className="flex gap-2">
                    <input
                      value={group.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateSpecGroups((groups) => groups.map((g, i) => i === groupIdx ? { ...g, name: value } : g));
                      }}
                      placeholder={tText("如：颜色")}
                      className="min-w-0 flex-1 rounded-md bg-secondary px-2 py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateSpecGroups((groups) => groups.filter((_, i) => i !== groupIdx))}
                      className={THEME_TEXT_DANGER}
                      title={tText("删除规格组")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.values.map((value, valueIdx) => (
                      <div key={value.id || valueIdx} className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1">
                        <input
                          value={value.value}
                          onChange={(e) => {
                            const text = e.target.value;
                            updateSpecGroups((groups) => groups.map((g, gi) => gi === groupIdx ? {
                              ...g,
                              values: g.values.map((v, vi) => vi === valueIdx ? { ...v, value: text } : v),
                            } : g));
                          }}
                          placeholder={tText("规格值")}
                          className="w-20 bg-transparent text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateSpecGroups((groups) => groups.map((g, gi) => gi === groupIdx ? {
                            ...g,
                            values: g.values.filter((_, vi) => vi !== valueIdx),
                          } : g))}
                          className={THEME_TEXT_DANGER}
                          title={tText("删除规格值")}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={group.values.length >= MAX_SPEC_VALUES_PER_GROUP}
                      onClick={() => updateSpecGroups((groups) => groups.map((g, gi) => gi === groupIdx ? {
                        ...g,
                        values: [...g.values, { id: tempId(), value: "", image_url: "", sort_order: g.values.length }],
                      } : g))}
                      className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-gold/50 disabled:opacity-40"
                    >
                      + 规格值
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <AdminNativeTable tableClassName="min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className={adminThClassName("w-10")}><Tx>默认</Tx></th>
                    <th className={adminThClassName()}><Tx>规格名</Tx></th>
                    <th className={adminThClassName()}>SKU</th>
                    <th className={adminThClassName()}><Tx>库存下限</Tx></th>
                    <th className={adminThClassName()}><Tx>库存上限</Tx></th>
                    <th className={adminThClassName()}><Tx>价格</Tx></th>
                    <th className={adminThClassName()}><Tx>原价</Tx></th>
                    <th className={adminThClassName()}><Tx>成本</Tx></th>
                    <th className={adminThClassName()}><Tx>库存</Tx></th>
                    <th className={adminThClassName()}><Tx>预警</Tx></th>
                    <th className={adminThClassName()}><Tx>条码</Tx></th>
                    <th className={adminThClassName()}><Tx>图片</Tx></th>
                    <th className={adminThClassName()}><Tx>启用</Tx></th>
                    <th className={adminThClassName("w-10")} />
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, idx) => (
                    <tr key={`${v.id || "n"}-${idx}`} className="border-b border-border/60">
                      <td className="py-2 pr-2 align-middle">
                        <input
                          type="radio"
                          name="default-variant"
                          checked={v.is_default}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              variants: f.variants.map((row, j) => ({ ...row, is_default: j === idx })),
                            }))
                          }
                          className="accent-gold"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={v.title}
                          onChange={(e) => {
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], title: t || (nv[idx].is_default && f.spec_groups.length === 0 ? DEFAULT_VARIANT_TITLE : "") };
                              return { ...f, variants: nv };
                            });
                          }}
                          placeholder={v.is_default && form.spec_groups.length === 0 ? DEFAULT_VARIANT_TITLE : tText("如：标准版")}
                          className="w-full min-w-[96px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={v.sku_code}
                          onChange={(e) => {
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], sku_code: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          placeholder={tText("可选")}
                          className="w-full min-w-[80px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={v.is_default ? form.stock_lower_limit : v.stock_lower_limit || ""}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (v.is_default) setForm((f) => ({ ...f, stock_lower_limit: t }));
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], stock_lower_limit: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={v.is_default ? form.stock_upper_limit : v.stock_upper_limit || ""}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (v.is_default) setForm((f) => ({ ...f, stock_upper_limit: t }));
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], stock_upper_limit: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          value={v.is_default ? form.price : v.price}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (v.is_default) setForm((f) => ({ ...f, price: t }));
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], price: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          value={v.original_price || ""}
                          onChange={(e) => {
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], original_price: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          value={v.cost_price || ""}
                          onChange={(e) => {
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], cost_price: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={v.is_default ? form.stock : v.stock}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (v.is_default) {
                              setForm((f) => ({ ...f, stock: t }));
                              return;
                            }
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], stock: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={v.stock_warning_threshold || ""}
                          onChange={(e) => {
                            const t = e.target.value;
                            if (v.is_default) setForm((f) => ({ ...f, stock_warning_threshold: t }));
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], stock_warning_threshold: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={v.barcode || ""}
                          onChange={(e) => {
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], barcode: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[96px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="min-w-[180px] space-y-1">
                          <div className="flex items-center gap-2">
                            {v.image_url ? (
                              <img
                                src={v.image_url}
                                alt={`${v.title || "SKU"} 图片`}
                                className="h-8 w-8 rounded border border-border object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded border border-dashed border-border bg-secondary" />
                            )}
                            <label
                              className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] ${uploadingVariantImageIndex === idx ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-secondary"}`}
                            >
                              {uploadingVariantImageIndex === idx ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Upload size={12} />
                              )}
                              {uploadingVariantImageIndex === idx ? "上传中" : "上传"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingVariantImageIndex !== null}
                                onChange={(e) => void handleVariantImageUpload(e, idx)}
                              />
                            </label>
                            {!!v.image_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((f) => {
                                    const nv = [...f.variants];
                                    nv[idx] = { ...nv[idx], image_url: "" };
                                    return { ...f, variants: nv };
                                  });
                                }}
                                className={`text-[11px] ${THEME_HOVER_TEXT_DANGER}`}
                              >
                                清除
                              </button>
                            )}
                          </div>
                          {uploadingVariantImageIndex === idx && variantUploadProgress !== null ? (
                            <p className="text-[10px] text-muted-foreground">上传进度 {variantUploadProgress}%</p>
                          ) : null}
                          <input
                            value={v.image_url || ""}
                            onChange={(e) => {
                              const t = e.target.value;
                              setForm((f) => {
                                const nv = [...f.variants];
                                nv[idx] = { ...nv[idx], image_url: t };
                                return { ...f, variants: nv };
                              });
                            }}
                            placeholder="URL"
                            className="w-full rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={v.enabled !== false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], enabled: checked };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="accent-gold"
                        />
                      </td>
                      <td className="py-2 align-middle">
                        <button
                          type="button"
                          disabled={form.variants.length <= 1}
                          onClick={() => {
                            setForm((f) => {
                              if (f.variants.length <= 1) return f;
                              const nv = f.variants.filter((_, j) => j !== idx);
                              if (!nv.some((r) => r.is_default)) nv[0] = { ...nv[0], is_default: true };
                              return { ...f, variants: nv };
                            });
                          }}
                          className={`${THEME_TEXT_DANGER} disabled:opacity-30`}
                          title={tText("删除此行")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </AdminNativeTable>
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
                    <button
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
                    </button>
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
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
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
                    className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
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
                    className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
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
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
              />
              <textarea
                rows={2}
                value={form.compliance_notice}
                onChange={(e) => setForm((prev) => ({ ...prev, compliance_notice: e.target.value }))}
                placeholder={tText("合规说明")}
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
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
                <img src={form.cover_image} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
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
              disabled={saving}
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
                disabled={deleting || saving}
                onClick={() => setDeleteConfirmOpen(true)}
                className={`w-full rounded-lg border px-6 py-3 text-sm font-semibold ${THEME_OUTLINE_DANGER}`}
              ><Tx>
                删除商品
              </Tx></LoadingButton>
            )}
            <button onClick={goBack} className="w-full rounded-lg border border-border px-6 py-3 text-sm text-muted-foreground"><Tx>取消</Tx></button>
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
