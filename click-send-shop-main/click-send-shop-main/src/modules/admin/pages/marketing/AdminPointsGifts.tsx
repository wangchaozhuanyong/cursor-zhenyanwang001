import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts } from "@/services/admin/productService";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import { POINTS_GIFT_FIELD_HINTS, POINTS_TAB_HINTS } from "@/modules/admin/pages/marketing/adminPointsHints";
import {
  createPointsGiftItem,
  fetchPointsGiftItems,
  fetchPointsGiftRedemptions,
  removePointsGiftItem,
  savePointsGiftItem,
  type PointsGiftItem,
} from "@/services/admin/pointsService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAdminT } from "@/hooks/useAdminT";
import { cn } from "@/lib/utils";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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

function GiftFieldLabel({ label, hint }: { label: string; hint?: ReactNode }) {
  return (
    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Tx>{label}</Tx>
      {hint ? <AdminFieldHint text={hint} /> : null}
    </span>
  );
}

export default function AdminPointsGifts() {
  const { tText } = useAdminT();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
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
      const data = await fetchPointsGiftItems({ pageSize: 100 });
      return data?.list || [];
    },
  });

  const redemptionsQuery = useQuery({
    queryKey: ["admin", "points-gift-redemptions"],
    queryFn: async () => {
      const data = await fetchPointsGiftRedemptions({ pageSize: 20 });
      return data?.list || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return savePointsGiftItem(editingId, form);
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
    mutationFn: (id: string) => removePointsGiftItem(id),
    onSuccess: () => {
      toast.success(tText("已删除"));
      queryClient.invalidateQueries({ queryKey: ["admin", "points-gift-items"] });
    },
    onError: (e) => toast.error(toastErrorMessage(e)),
  });

  const items = itemsQuery.data || [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <AdminSectionTitle
          title={<Tx>{editingId ? "编辑礼品" : "新增礼品兑换"}</Tx>}
          hint={POINTS_TAB_HINTS["礼品兑换"]}
        />
        {!isSuperAdmin ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
            <p><Tx>当前展示的是员工常用配置。</Tx></p>
            <p className="mt-1"><Tx>规格编号等精确绑定字段仅超级管理员可修改，普通礼品兑换配置不受影响。</Tx></p>
          </div>
        ) : null}
        <div className="grid gap-3">
          <div>
            <GiftFieldLabel label={tText("关联商品")} hint={POINTS_GIFT_FIELD_HINTS.product} />
            <AdminSearchInput
              className={inputCls}
              placeholder={tText("搜索商品名称")}
              value={productKeyword}
              onChange={setProductKeyword}
              showIcon={false}
            />
            <select
              className={cn(inputCls, "mt-1")}
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
              <option value=""><Tx>请选择商品</Tx></option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}（库存 {p.stock ?? 0}）</option>
              ))}
            </select>
          </div>
          <label className="block">
            <GiftFieldLabel label={tText("展示标题")} hint={POINTS_GIFT_FIELD_HINTS.title} />
            <input className={inputCls} value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </label>
          <label className="block">
            <GiftFieldLabel label={tText("所需积分")} hint={POINTS_GIFT_FIELD_HINTS.required_points} />
            <input type="number" className={inputCls} value={form.required_points} onChange={(e) => setForm((p) => ({ ...p, required_points: Number(e.target.value) }))} />
          </label>
          <label className="block">
            <GiftFieldLabel label={tText("附加现金 (RM)")} hint={POINTS_GIFT_FIELD_HINTS.cash_amount} />
            <input type="number" className={inputCls} value={form.cash_amount ?? 0} onChange={(e) => setForm((p) => ({ ...p, cash_amount: Number(e.target.value) }))} />
          </label>
          <label className="block">
            <GiftFieldLabel label={tText("兑换库存上限（0=不限）")} hint={POINTS_GIFT_FIELD_HINTS.stock_limit} />
            <input type="number" className={inputCls} value={form.stock_limit ?? 0} onChange={(e) => setForm((p) => ({ ...p, stock_limit: Number(e.target.value) }))} />
          </label>
          <label className="block">
            <GiftFieldLabel label={tText("每人限兑（0=不限）")} hint={POINTS_GIFT_FIELD_HINTS.limit_per_user} />
            <input type="number" className={inputCls} value={form.limit_per_user ?? 0} onChange={(e) => setForm((p) => ({ ...p, limit_per_user: Number(e.target.value) }))} />
          </label>
          <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Tx>上架</Tx>
              <AdminFieldHint text={POINTS_GIFT_FIELD_HINTS.enabled} />
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-primary"
              checked={!!form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked ? 1 : 0 }))}
            />
          </label>
        </div>
        {isSuperAdmin ? (
          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-foreground"><Tx>管理员高级设置</Tx></p>
              <p className="mt-1 text-xs text-muted-foreground"><Tx>多规格礼品可在这里精确绑定 SKU / 规格编号。</Tx></p>
            </div>
            <label className="block">
              <GiftFieldLabel label={tText("规格编号（可选）")} hint={POINTS_GIFT_FIELD_HINTS.variant_id} />
              <input className={inputCls} value={form.variant_id || ""} onChange={(e) => setForm((p) => ({ ...p, variant_id: e.target.value || null }))} />
            </label>
          </div>
        ) : null}
        <div className="flex gap-2">
          <UnifiedButton
            type="button"
            onClick={() => {
              if (!form.product_id) {
                toast.error(tText("请选择关联商品"));
                return;
              }
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Tx>{editingId ? "保存" : "创建"}</Tx>
          </UnifiedButton>
          {editingId ? (
            <UnifiedButton type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-border px-4 py-2 text-sm">
              <Tx>取消</Tx>
            </UnifiedButton>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminSectionTitle title={<Tx>礼品列表</Tx>} hint={POINTS_GIFT_FIELD_HINTS.gift_list} />
          {items.length === 0 ? <p className="text-sm text-muted-foreground"><Tx>暂无礼品</Tx></p> : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.title || item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.required_points} 积分 · 已兑 {item.redeemed_count ?? 0}</p>
                  </div>
                  <div className="flex gap-1">
                    <UnifiedButton type="button" className="text-xs text-primary" onClick={() => { setEditingId(item.id!); setForm({ ...emptyForm, ...item }); }}><Tx>编辑</Tx></UnifiedButton>
                    <UnifiedButton type="button" className="text-destructive" onClick={() => item.id && deleteMutation.mutate(item.id)}><Trash2 size={14} /></UnifiedButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <AdminSectionTitle title={<Tx>最近兑换</Tx>} hint={POINTS_GIFT_FIELD_HINTS.recent_redemptions} />
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
