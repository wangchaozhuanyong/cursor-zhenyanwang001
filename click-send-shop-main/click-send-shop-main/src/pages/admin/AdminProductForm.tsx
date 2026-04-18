import { ArrowLeft, Upload, ImagePlus, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchProductById, createProduct, updateProduct } from "@/services/admin/productService";
import * as categoryService from "@/services/admin/categoryService";
import PermissionGate from "@/components/admin/PermissionGate";
import * as uploadService from "@/services/uploadService";
import { useGoBack } from "@/hooks/useGoBack";

export default function AdminProductForm() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/products");
  const { id } = useParams();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    price: "",
    original_price: "",
    stock: "",
    points: "",
    category_id: "",
    sort_order: "",
    description: "",
    cover_image: "",
    images: [] as string[],
    status: "active" as string,
    is_hot: false,
    is_new: false,
    is_recommended: false,
  });

  useEffect(() => {
    categoryService.fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      fetchProductById(id)
        .then((data: any) => {
          if (data) {
            setForm({
              name: data.name || "",
              price: data.price?.toString() || "",
              original_price: data.original_price?.toString() || "",
              stock: data.stock?.toString() || "",
              points: data.points?.toString() || "",
              category_id: data.category_id || "",
              sort_order: data.sort_order?.toString() || "",
              description: data.description || "",
              cover_image: data.cover_image || "",
              images: data.images || [],
              status: data.status || "active",
              is_hot: !!data.is_hot,
              is_new: !!data.is_new,
              is_recommended: !!data.is_recommended,
            });
          }
        })
        .catch(() => toast.error("加载商品信息失败"))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "cover" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadService.uploadSingle(file);
      const url = res.url || "";
      if (!url) { toast.error("上传失败"); return; }
      if (field === "cover") {
        setForm((f) => ({ ...f, cover_image: url }));
      } else {
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
      toast.success("图片已上传");
    } catch {
      toast.error("图片上传失败");
    }
  };

  const handleSave = async (publish = false) => {
    if (!form.name) { toast.error("请输入商品名称"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        price: parseFloat(form.price) || 0,
        original_price: parseFloat(form.original_price) || 0,
        stock: parseInt(form.stock) || 0,
        points: parseInt(form.points) || 0,
        category_id: form.category_id || null,
        sort_order: parseInt(form.sort_order) || 0,
        description: form.description,
        cover_image: form.cover_image,
        images: form.images,
        status: publish ? "active" : form.status,
        is_hot: form.is_hot,
        is_new: form.is_new,
        is_recommended: form.is_recommended,
      };
      if (isNew) {
        await createProduct(payload);
        toast.success("商品创建成功");
      } else {
        await updateProduct(id!, payload);
        toast.success("商品更新成功");
      }
      navigate("/admin/products");
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">原价 (RM)</label>
                <input value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder="0.00" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">分类</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                  <option value="">选择分类</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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
            {[
              { label: "上架", desc: "商品在前台可见", key: "status", isStatus: true },
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
                  checked={t.isStatus ? form.status === "active" : !!(form as any)[t.key]}
                  onChange={(e) => {
                    if (t.isStatus) {
                      setForm({ ...form, status: e.target.checked ? "active" : "inactive" });
                    } else {
                      setForm({ ...form, [t.key]: e.target.checked });
                    }
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
              <p className="text-sm font-medium text-foreground">{form.name || "商品名称"}</p>
              <p className="mt-1 text-sm font-bold text-gold">RM {form.price || "0.00"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <button disabled={saving} onClick={() => handleSave(false)} className="w-full rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "保存"}
            </button>
            <button disabled={saving} onClick={() => handleSave(true)} className="w-full rounded-lg border border-gold bg-gold/10 px-6 py-3 text-sm font-semibold text-gold disabled:opacity-50">保存并上架</button>
            <button onClick={goBack} className="w-full rounded-lg border border-border px-6 py-3 text-sm text-muted-foreground">取消</button>
          </div>
        </div>
      </div>
      </PermissionGate>
    </div>
  );
}
