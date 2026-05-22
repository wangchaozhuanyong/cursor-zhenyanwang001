import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts } from "@/services/admin/productService";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import {
  createPointsGiftItem,
  deletePointsGiftItem,
  getPointsGiftItems,
  getPointsGiftRedemptions,
  updatePointsGiftItem,
  type PointsGiftItem,
} from "@/api/admin/points";
import { toastErrorMessage } from "@/utils/errorMessage";

const inputCls = "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground w-full";

const emptyForm: PointsGiftItem = {
  product_id: "",
  title: "",
  image: "",
  required_points: 100,
  cash_amount: 0,
  stock_limit: 0,
  limit_per_user: 1,
  enabled: 1,
  sort_order: 0,
};

export default function AdminPointsGifts() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PointsGiftItem>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productKeyword, setProductKeyword] = useState("");

  const productQueryParams = useMemo(
    () => ({ page: 1, pageSize: 30, keyword: productKeyword.trim() || undefined }),
    [productKeyword],
  );

  const productsQuery = useQuery({
    queryKey: ["admin", "points-gift-products", productQueryParams],
    queryFn: () => fetchProducts(productQueryParams),
    staleTime: 30_000,
  });
  const productOptions = productsQuery.data?.list ?? [];

  const itemsQuery = useQuery({
    queryKey: ["admin", "points-gift-items"],
    queryFn: async () => {
      const res = await getPointsGiftItems({ pageSize: 100 });
      return res.data?.list || [];
    },
  });

  const redemptionsQuery = useQuery({
    queryKey: ["admin", "points-gift-redemptions"],
    queryFn: async () => {
      const res = await getPointsGiftRedemptions({ pageSize: 20 });
      return res.data?.list || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return updatePointsGiftItem(editingId, form);
      return createPointsGiftItem(form);
    },
    onSuccess: () => {
      toast.success(editingId ? "礼品已更新" : "礼品已创建");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "points-gift-items"] });
    },
    onError: (e) => toast.error(toastErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePointsGiftItem(id),
    onSuccess: () => {
      toast.success("已删除");
      queryClient.invalidateQueries({ queryKey: ["admin", "points-gift-items"] });
    },
    onError: (e) => toast.error(toastErrorMessage(e)),
  });

  const items = itemsQuery.data || [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground"><Tx>{editingId ? "编辑礼品" : "新增礼品兑换"}</Tx></h3>
        <div className="grid gap-2">
          <label className="text-xs text-muted-foreground"><Tx>关联商品</Tx>
            <input
              className={inputCls}
              placeholder="搜索商品名称"
              value={productKeyword}
              onChange={(e) => setProductKeyword(e.target.value)}
            />
            <select
              className={`${inputCls} mt-1`}
              value={form.product_id}
              onChange={(e) => {
                const pid = e.target.value;
                const picked = productOptions.find((p) => p.id === pid);
                setForm((prev) => ({
                  ...prev,
                  product_id: pid,
                  title: prev.title || picked?.name || "",
                  image: prev.image || picked?.cover_image || "",
                }));
              }}
            >
              <option value="">请选择商品</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}（库存 {p.stock ?? 0}）</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground"><Tx>规格 ID（可选）</Tx>
            <input className={inputCls} value={form.variant_id || ""} onChange={(e) => setForm((p) => ({ ...p, variant_id: e.target.value || null }))} />
          </label>
          <label className="text-xs text-muted-foreground"><Tx>展示标题</Tx>
            <input className={inputCls} value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </label>
          <label className="text-xs text-muted-foreground"><Tx>所需积分</Tx>
            <input type="number" className={inputCls} value={form.required_points} onChange={(e) => setForm((p) => ({ ...p, required_points: Number(e.target.value) }))} />
          </label>
          <label className="text-xs text-muted-foreground"><Tx>附加现金 (RM)</Tx>
            <input type="number" className={inputCls} value={form.cash_amount ?? 0} onChange={(e) => setForm((p) => ({ ...p, cash_amount: Number(e.target.value) }))} />
          </label>
          <label className="text-xs text-muted-foreground"><Tx>兑换库存上限（0=不限）</Tx>
            <input type="number" className={inputCls} value={form.stock_limit ?? 0} onChange={(e) => setForm((p) => ({ ...p, stock_limit: Number(e.target.value) }))} />
          </label>
          <label className="text-xs text-muted-foreground"><Tx>每人限兑（0=不限）</Tx>
            <input type="number" className={inputCls} value={form.limit_per_user ?? 0} onChange={(e) => setForm((p) => ({ ...p, limit_per_user: Number(e.target.value) }))} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked ? 1 : 0 }))} />
            <Tx>上架</Tx>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!form.product_id) {
                toast.error("请选择关联商品");
                return;
              }
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Tx>{editingId ? "保存" : "创建"}</Tx>
          </button>
          {editingId ? (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-border px-4 py-2 text-sm">
              <Tx>取消</Tx>
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold"><Tx>礼品列表</Tx></h3>
          {items.length === 0 ? <p className="text-sm text-muted-foreground"><Tx>暂无礼品</Tx></p> : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.title || item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.required_points} 积分 · 已兑 {item.redeemed_count ?? 0}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="text-xs text-primary" onClick={() => { setEditingId(item.id!); setForm({ ...emptyForm, ...item }); }}><Tx>编辑</Tx></button>
                    <button type="button" className="text-destructive" onClick={() => item.id && deleteMutation.mutate(item.id)}><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold"><Tx>最近兑换</Tx></h3>
          {(redemptionsQuery.data || []).length === 0 ? <p className="text-sm text-muted-foreground"><Tx>暂无记录</Tx></p> : (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(redemptionsQuery.data || []).map((r) => (
                <li key={String(r.id)}>{String(r.order_no)} · {String(r.points_used)} 积分 · {String(r.status)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
