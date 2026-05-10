/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowLeft, Upload, ImagePlus, Loader2, Trash2, Plus, Video } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchProductById, createProduct, updateProduct, deleteProduct, fetchProductTags } from "@/services/admin/productService";
import * as categoryService from "@/services/admin/categoryService";
import PermissionGate from "@/components/admin/PermissionGate";
import * as uploadService from "@/services/uploadService";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT } from "@/constants/imageUploadHints";
import { productTagBadgeClass } from "@/utils/productTagBadge";
import { flattenCategories } from "@/utils/categoryTree";
import type { ProductTag } from "@/types/product";

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "cover" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadService.uploadSingle(file);
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
    }
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
      const res = await uploadService.uploadSingle(file);
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
        stock: mainStock,
        points: parseInt(form.points, 10) || 0,
        category_id: form.category_id || null,
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
    if (!window.confirm(`确定删除商品「${form.name || id}」？删除后可在「回收站」恢复。`)) return;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const categoryOptions = flattenCategories(categories as any);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={goBack}>
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">{isNew ? "新增商品" : "编辑商品"}</h2>
      </div>

      <PermissionGate
        permission="product.manage"
        fallback={
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            你仅有查看权限，无法编辑或新建商品。
          </p>
        }
      >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">商品图片</h3>
            <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
              {IMAGE_UPLOAD_HINT_API} {IMAGE_UPLOAD_HINT_PRODUCT_LAYOUT}
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">封面图</label>
                <label className="flex h-40 w-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-gold/50 overflow-hidden">
                  {form.cover_image ? (
                    <img src={form.cover_image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload size={24} className="mx-auto text-muted-foreground" />
                      <span className="mt-1 block text-xs text-muted-foreground">上传封面</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} />
                </label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">轮播图（最多 6 张）</label>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} className="absolute top-0 right-0 bg-destructive text-white rounded-bl px-1 text-xs">×</button>
                    </div>
                  ))}
                  {form.images.length < 6 && (
                    <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-gold/50">
                      <ImagePlus size={18} className="text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "gallery")} />
                    </label>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">详情视频（可选）</label>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      仅在商品详情页图集展示，商品卡不展示。支持 MP4 / WebM / MOV，单个视频最大 50MB；建议使用 H.264 MP4 以获得最佳兼容性。
                    </p>
                  </div>
                  {form.video_url && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, video_url: "" }))}
                      className="shrink-0 text-xs text-destructive hover:underline"
                    >
                      清除
                    </button>
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
                    <Video size={16} />
                    上传视频
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                  </label>
                </div>
                {form.video_url ? (
                  <video
                    src={form.video_url}
                    className="mt-3 aspect-video w-full max-w-md rounded-lg bg-black object-contain"
                    controls
                    preload="metadata"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">基本信息</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">商品名称</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="输入商品名称" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">售价 (RM)</label>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">划线原价 (RM)</label>
                <input value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder="留空则不展示" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <p className="mt-1 text-[10px] text-muted-foreground">仅当大于售价时，前台商品卡/详情页才会以删除线显示。</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">库存</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">积分值</label>
                <input value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} placeholder="与售价相同" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">销量</label>
                <input
                  type="number"
                  value={form.sales_count}
                  onChange={(e) => setForm({ ...form, sales_count: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">订单付款后由系统自动累加；可手动修正起步销量。</p>
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">分类</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                  <option value="">选择分类</option>
                  {categoryOptions.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {"　".repeat(c.level)}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">排序</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">规格 / SKU</h3>
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
                <Plus size={14} /> 添加规格
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              默认规格与上方主售价、库存保持一致（保存时写入主档）。其它规格价格仅作后台记录，前台下单仍以主档为准。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-2 w-10">默认</th>
                    <th className="pb-2 pr-2">规格名</th>
                    <th className="pb-2 pr-2">SKU</th>
                    <th className="pb-2 pr-2">价格</th>
                    <th className="pb-2 pr-2">库存</th>
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
                          value={v.is_default ? form.stock : v.stock}
                          disabled={v.is_default}
                          onChange={(e) => {
                            if (v.is_default) return;
                            const t = e.target.value;
                            setForm((f) => {
                              const nv = [...f.variants];
                              nv[idx] = { ...nv[idx], stock: t };
                              return { ...f, variants: nv };
                            });
                          }}
                          className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none disabled:opacity-60"
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
                          className="text-destructive disabled:opacity-30"
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
            <h3 className="text-sm font-semibold text-foreground">自定义标签</h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              标签在「标签管理」中维护；勾选后关联本商品，前台商品列表与详情页会与「热销 / 新品」徽章一并展示。
            </p>
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无可用标签，请先到「标签管理」新建。</p>
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
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        on
                          ? `${productTagBadgeClass(t.color)} border-current`
                          : "border-border bg-secondary text-muted-foreground hover:border-gold/40"
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">商品描述</h3>
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
            <h3 className="text-sm font-semibold text-foreground">状态设置</h3>
            <div className="rounded-lg border border-border p-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">销售状态</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "draft" | "active" | "inactive" })
                }
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
              >
                <option value="draft">草稿（前台不可见）</option>
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">草稿可用于先录入资料，确认后再上架。</p>
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
            <h3 className="mb-3 text-sm font-semibold text-foreground">预览</h3>
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
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${productTagBadgeClass(meta.color)}`}
                      >
                        {meta.name}
                      </span>
                    );
                  })}
              </div>
              <p className="text-sm font-medium text-foreground">{form.name || "商品名称"}</p>
              <p className="mt-1 text-sm font-bold text-gold">RM {form.price || "0.00"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <button disabled={saving} onClick={() => handleSave(false)} className="w-full rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "保存"}
            </button>
            <button disabled={saving} onClick={() => handleSave(true)} className="w-full rounded-lg border border-gold bg-gold/10 px-6 py-3 text-sm font-semibold text-gold disabled:opacity-50">保存并上架</button>
            {!isNew && (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={handleDelete}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 px-6 py-3 text-sm font-semibold text-destructive disabled:opacity-50 hover:bg-destructive/10"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                删除商品
              </button>
            )}
            <button onClick={goBack} className="w-full rounded-lg border border-border px-6 py-3 text-sm text-muted-foreground">取消</button>
          </div>
        </div>
      </div>
      </PermissionGate>
    </div>
  );
}
