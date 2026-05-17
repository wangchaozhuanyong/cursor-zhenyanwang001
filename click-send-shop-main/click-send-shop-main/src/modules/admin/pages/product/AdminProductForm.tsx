/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowLeft, Upload, ImagePlus, Loader2, Trash2, Plus, Video } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchProductById, createProduct, updateProduct, deleteProduct, fetchProductTags } from "@/services/admin/productService";
import * as categoryService from "@/services/admin/categoryService";
import PermissionGate from "@/components/admin/PermissionGate";
import * as uploadService from "@/services/uploadService";
import { validateUploadFile } from "@/api/modules/upload";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminFormSectionsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT } from "@/constants/imageUploadHints";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { flattenCategories } from "@/utils/categoryTree";
import type { ProductTag } from "@/types/product";
import { Tx } from "@/components/admin/AdminText";
import { AnimatedConfirmDialog, LoadingButton, UploadDropZone } from "@/modules/micro-interactions";
import {
  THEME_BTN_DANGER_SOLID,
  THEME_HOVER_TEXT_DANGER,
  THEME_OUTLINE_DANGER,
  THEME_TEXT_DANGER,
} from "@/utils/themeVisuals";

export default function AdminProductForm() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/products");
  const { id } = useParams();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<ProductTag[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    original_price: "",
    sales_count: "",
    stock: "",
    points: "",
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
    tag_ids: [] as string[],
    variants: [
      { title: "", sku_code: "", price: "", stock: "", sort_order: 0, is_default: true },
    ] as Array<{
      id?: string;
      title: string;
      sku_code: string;
      price: string;
      stock: string;
      sort_order: number;
      is_default: boolean;
    }>,
  });

  useEffect(() => {
    categoryService.fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProductTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      fetchProductById(id)
        .then((data: any) => {
          if (data) {
            const st = data.status === "draft" || data.status === "inactive" ? data.status : "active";
            const vlist =
              data.variants?.length ?
                data.variants.map((v, i) => ({
                  id: v.id,
                  title: v.title || "",
                  sku_code: (v.sku_code as string) || "",
                  price: String(v.price ?? ""),
                  stock: String(v.stock ?? ""),
                  sort_order: v.sort_order ?? i,
                  is_default: !!v.is_default,
                })) :
                [
                  {
                    title: "",
                    sku_code: "",
                    price: data.price?.toString() || "",
                    stock: data.stock?.toString() || "",
                    sort_order: 0,
                    is_default: true,
                  },
                ];
            setForm({
              name: data.name || "",
              price: data.price?.toString() || "",
              original_price:
                data.original_price != null ? data.original_price.toString() : "",
              sales_count: data.sales_count != null ? String(data.sales_count) : "0",
              stock: data.stock?.toString() || "",
              points: data.points?.toString() || "",
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
              tag_ids: Array.isArray(data.tags) ? data.tags.map((t: { id: string }) => t.id) : [],
              variants: vlist,
            });
          }
        })
        .catch((e) => toast.error(toastErrorMessage(e, "加载商品信息失败")))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

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
      toast.warning("GIF 上传后可能转为静态图");
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
        toast.error("服务器未返回图片地址，请检查存储配置或稍后重试");
        return;
      }
      if (field === "cover") {
        setForm((f) => ({ ...f, cover_image: url }));
      } else {
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
      toast.success("图片已上传");
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
    if (!allowed.includes(file.type)) {
      toast.error("视频仅支持 MP4、WebM、MOV 格式");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("视频大小不能超过 50MB");
      return;
    }
    try {
      const res = await uploadService.uploadSingle(file, { mode: "video" });
      const url = res.url || "";
      if (!url) {
        toast.error("服务器未返回视频地址，请检查存储配置或稍后重试");
        return;
      }
      setForm((f) => ({ ...f, video_url: url }));
      toast.success("视频已上传");
    } catch (e) {
      toast.error(toastErrorMessage(e, "视频上传失败"));
    }
  };

  const handleSave = async (publish = false) => {
    if (uploadingCover || uploadingGallery) {
      toast.error("图片仍在上传中，请等待上传完成后再保存商品。");
      return;
    }
    if (!form.name) { toast.error("请输入商品名称"); return; }
    if (!form.variants.length) { toast.error("至少保留一条规格"); return; }
    setSaving(true);
    try {
      const opNum = parseFloat(form.original_price);
      const scNum = parseInt(form.sales_count, 10);
      const mainPrice = parseFloat(form.price) || 0;
      const mainStock = parseInt(form.stock, 10) || 0;
      const variantsPayload = form.variants.map((v, i) => ({
        id: v.id,
        title: v.title,
        sku_code: v.sku_code.trim() || null,
        price: parseFloat(v.price) || 0,
        stock: parseInt(v.stock, 10) || 0,
        sort_order: v.sort_order ?? i,
        is_default: v.is_default,
      }));
      const defIdx = variantsPayload.findIndex((x) => x.is_default);
      if (defIdx >= 0) {
        variantsPayload[defIdx] = {
          ...variantsPayload[defIdx],
          price: mainPrice,
          stock: mainStock,
        };
      }
      const payload: any = {
        name: form.name,
        price: mainPrice,
        original_price:
          form.original_price === "" || !Number.isFinite(opNum) ? null : opNum,
        sales_count: Number.isFinite(scNum) ? scNum : 0,
        points: parseInt(form.points, 10) || 0,
        category_id: form.category_id || "",
        sort_order: parseInt(form.sort_order, 10) || 0,
        description: form.description,
        cover_image: form.cover_image,
        video_url: form.video_url.trim(),
        images: form.images,
        status: publish ? "active" : form.status,
        is_hot: form.is_hot,
        is_new: form.is_new,
        is_recommended: form.is_recommended,
        variants: variantsPayload,
        tag_ids: form.tag_ids,
      };
      if (isNew) {
        payload.stock = mainStock;
        await createProduct(payload);
        toast.success("商品创建成功");
      } else {
        await updateProduct(id!, payload);
        toast.success("商品更新成功");
      }
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
      toast.success("已删除");
      navigate("/admin/products");
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    } finally {
      setDeleting(false);
    }
  };

  const categoryOptions = flattenCategories(categories as any);

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
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground"><Tx>商品图片</Tx></h3>
            <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
              {IMAGE_UPLOAD_HINT_API} {IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT}
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>封面图</Tx></label>
                <UploadDropZone
                  disabled={uploadingCover}
                  className={`relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border ${uploadingCover ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:border-gold/50"}`}
                  onFiles={(files) => {
                    const file = files[0];
                    if (file) void uploadImageFile(file, "cover");
                  }}
                >
                  {form.cover_image ? (
                    <img src={form.cover_image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload size={24} className="mx-auto text-muted-foreground" />
                      <span className="mt-1 block text-xs text-muted-foreground"><Tx>上传封面</Tx></span>
                    </div>
                  )}
                  {uploadingCover ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="mt-2 text-xs"><Tx>图片上传中...</Tx></span>
                      {uploadProgress !== null ? <span className="text-[11px]">{uploadProgress}%</span> : null}
                    </div>
                  ) : null}
                  <input disabled={uploadingCover} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} />
                </UploadDropZone>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>轮播图（最多 6 张）</Tx></label>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} className={`absolute top-0 right-0 rounded-bl px-1 text-xs ${THEME_BTN_DANGER_SOLID}`}>×</button>
                    </div>
                  ))}
                  {uploadingGallery && (
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border border-border bg-secondary/60 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="mt-1"><Tx>上传中...</Tx></span>
                      {uploadProgress !== null ? <span className="text-[10px]">{uploadProgress}%</span> : null}
                    </div>
                  )}
                  {form.images.length < 6 && (
                    <UploadDropZone
                      disabled={uploadingGallery}
                      className={`flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border ${uploadingGallery ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gold/50"}`}
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
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground"><Tx>详情视频（可选）</Tx></label>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground"><Tx>
                      仅在商品详情页图集展示，商品卡不展示。支持 MP4 / WebM / MOV，单个视频最大 50MB；建议使用 H.264 MP4 以获得最佳兼容性。
                      </Tx><span className="mt-0.5 block"><Tx>
                        画面比例请与「站点外观 → 商品图比例」一致（常见为 </Tx><strong className="font-medium text-foreground/80">1:1</strong>，如{" "}
                        <strong className="font-medium text-foreground/80">1080×1080</strong> /{" "}
                        <strong className="font-medium text-foreground/80">720×720</strong><Tx>；若为 3:4 则如 1080×1440）。码率约 5–8 Mbps，时长 1 分钟内更易压在 50MB 内。
                        详情页图集主区域固定为当前主题的 </Tx><strong className="font-medium text-foreground/80"><Tx>商品图比例</Tx></strong>，视频在区域内{" "}
                        <strong className="font-medium text-foreground/80">object-contain</strong><Tx>
                        ：与主题同比例导出时黑边最少、与图片切换不跳变；横屏或与主题不一致时可能出现上下或左右留黑。下方预览与前台使用同一比例变量。
                      </Tx></span>
                    </p>
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
                    placeholder="填写视频 URL，或点击右侧上传"
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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>商品名称</Tx></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="输入商品名称" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>售价 (RM)</Tx></label>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>划线原价 (RM)</Tx></label>
                <input value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder="留空则不展示" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <p className="mt-1 text-[10px] text-muted-foreground"><Tx>仅当大于售价时，前台商品卡/详情页才会以删除线显示。</Tx></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>库存（默认规格）</Tx></label>
                <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <p className="mt-1 text-[10px] text-muted-foreground"><Tx>保存时写入默认 SKU；大批量入库仍建议在库存中心操作。</Tx></p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>积分值</Tx></label>
                <input value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} placeholder="与售价相同" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>销量</Tx></label>
                <input
                  type="number"
                  value={form.sales_count}
                  onChange={(e) => setForm({ ...form, sales_count: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <p className="mt-1 text-[10px] text-muted-foreground"><Tx>订单付款后由系统自动累加；可手动修正起步销量。</Tx></p>
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类</Tx></label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                  <option value=""><Tx>选择分类</Tx></option>
                  {categoryOptions.map((c: any) => (
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
              <h3 className="text-sm font-semibold text-foreground"><Tx>规格 / SKU</Tx></h3>
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
                        sort_order: f.variants.length,
                        is_default: false,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <Plus size={14} /><Tx> 添加规格
              </Tx></button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed"><Tx>
              可在此维护各规格库存与价格；保存后同步到商品总库存。
            </Tx></p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-2 w-10"><Tx>默认</Tx></th>
                    <th className="pb-2 pr-2"><Tx>规格名</Tx></th>
                    <th className="pb-2 pr-2">SKU</th>
                    <th className="pb-2 pr-2"><Tx>价格</Tx></th>
                    <th className="pb-2 pr-2"><Tx>库存</Tx></th>
                    <th className="pb-2 w-10" />
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
                              nv[idx] = { ...nv[idx], title: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          placeholder="如：标准版"
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
                          placeholder="可选"
                          className="w-full min-w-[80px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          value={v.is_default ? form.price : v.price}
                          disabled={v.is_default}
                          onChange={(e) => {
                            if (v.is_default) return;
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], price: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none disabled:opacity-60"
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
                          title="删除此行"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground"><Tx>自定义标签</Tx></h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground"><Tx>
              标签在「标签管理」中维护；勾选后关联本商品，前台商品列表与详情页会与「热销 / 新品」徽章一并展示。
            </Tx></p>
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
              placeholder="简短商品描述..."
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground"><Tx>状态设置</Tx></h3>
            <div className="rounded-lg border border-border p-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>销售状态</Tx></label>
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
              <p className="mt-1 text-[10px] text-muted-foreground"><Tx>草稿可用于先录入资料，确认后再上架。</Tx></p>
            </div>
            {[
              { label: "热门", desc: "显示热门标签", key: "is_hot" },
              { label: "新品", desc: "显示新品标签", key: "is_new" },
              { label: "推荐", desc: "首页推荐展示", key: "is_recommended" },
            ].map((t) => (
              <label key={t.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </div>
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={!!(form as any)[t.key]}
                  onChange={(e) => {
                    setForm({ ...form, [t.key]: e.target.checked });
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
        title="删除商品"
        description={`确定删除「${form.name || id}」？删除后可在回收站恢复。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}
