import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import type { ActivityProductItem } from "@/types/activity";
import type { ActivityProductOption } from "@/api/admin/activity";
import * as activityService from "@/services/admin/activityService";
import { getProducts } from "@/api/admin/product";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: ActivityProductItem[]) => void;
  existingIds: string[];
};

export default function ActivityProductPicker({ open, onClose, onConfirm, existingIds }: Props) {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [list, setList] = useState<ActivityProductOption[]>([]);
  const [selected, setSelected] = useState<Record<string, ActivityProductOption>>({});
  const [batchDiscount, setBatchDiscount] = useState("");
  const [batchStock, setBatchStock] = useState("");
  const [batchLimit, setBatchLimit] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const load = async () => {
      try {
        try {
          const p = await activityService.fetchActivityProductOptions({
            page: 1,
            pageSize: 50,
            keyword,
            lifecycle_status: 1,
          });
          if (Array.isArray(p.list) && p.list.length > 0) {
            setList(p.list);
            return;
          }
        } catch {
          // fallback to admin product list
        }

        try {
          const res = await getProducts({ page: 1, pageSize: 50, keyword });
          const fallbackList = (res.data?.list || [])
            .filter((p) => Number(p.lifecycle_status) === 1 && Number(p.stock || 0) > 0)
            .map((p) => ({
              id: p.id,
              name: p.name,
              cover_image: p.cover_image,
              price: Number(p.price || 0),
              stock: Number(p.stock || 0),
              lifecycle_status: Number(p.lifecycle_status || 0),
              category_id: p.category_id,
            })) as ActivityProductOption[];
          setList(fallbackList);
        } catch {
          setList([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, keyword]);

  useEffect(() => {
    if (!open) {
      setSelected({});
      setKeyword("");
      setBatchDiscount("");
      setBatchStock("");
      setBatchLimit("");
    }
  }, [open]);

  const filtered = useMemo(
    () => list.filter((p) => !existingIds.includes(p.id)),
    [list, existingIds],
  );
  const selectedList = useMemo(() => Object.values(selected), [selected]);


  const toggle = (p: ActivityProductOption) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      return next;
    });
  };

  const confirm = () => {
    const discountFactor = Number(batchDiscount);
    const stockValue = Number(batchStock);
    const limitValue = Number(batchLimit);
    const rows = selectedList.map((p, idx) => {
      const calcPrice = Number.isFinite(discountFactor) && discountFactor > 0
        ? Math.max(0, Number(p.price) * discountFactor)
        : Number(p.price);
      const calcStock = Number.isFinite(stockValue) && stockValue >= 0 ? Math.floor(stockValue) : Math.max(0, Number(p.stock || 0));
      const calcLimit = Number.isFinite(limitValue) && limitValue >= 0 ? Math.floor(limitValue) : 0;
      return {
        product_id: p.id,
        product_name: p.name,
        cover_image: p.cover_image,
        product_price: Number(p.price),
        product_stock: Number(p.stock || 0),
        activity_price: Number(calcPrice.toFixed(2)),
        activity_stock: Math.min(calcStock, Number(p.stock || 0)),
        limit_per_user: calcLimit,
        sort_order: idx,
      } as ActivityProductItem;
    });
    onConfirm(rows);
    onClose();
  };

  return (
    <AdminResponsiveSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="选择活动商品"
      size="xl"
      height="90vh"
      footer={(
        <div className="flex gap-2">
          <button type="button" onClick={confirm} disabled={!selectedList.length} className="touch-manipulation flex-1 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">加入活动</button>
          <button type="button" onClick={onClose} className="touch-manipulation rounded-lg border border-border px-3 py-2.5 text-sm">取消</button>
        </div>
      )}
      stickyFooter
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-[1fr_280px]">
        <div className="min-h-0 overflow-hidden rounded-lg border border-border">
          <div className="border-b border-border p-3">
            <AdminSearchInput
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索商品名称"
              iconSize={16}
              className="min-h-[40px] border-0 bg-secondary"
            />
          </div>
          <div className="max-h-[50vh] lg:max-h-[60vh] overflow-auto p-3">
            {loading ? <div className="text-sm text-muted-foreground">加载中...</div> : null}
            {!loading && filtered.length === 0 ? <div className="text-sm text-muted-foreground">暂无可选商品</div> : null}
            <div className="space-y-2">
              {filtered.map((p) => {
                const checked = !!selected[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`touch-manipulation flex w-full items-center gap-3 rounded-lg border p-2 text-left ${checked ? "border-gold bg-gold/5" : "border-border"}`}
                  >
                    <input type="checkbox" checked={checked} readOnly />
                    <img src={p.cover_image || ""} alt={p.name} className="h-12 w-12 rounded object-cover bg-secondary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">库存 {p.stock} · 原价 RM {p.price}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-border p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">已选商品（{selectedList.length}）</h3>
            <button type="button" onClick={() => setSelected({})} className="text-xs text-muted-foreground">清空</button>
          </div>
          <div className="grid gap-2">
            <input value={batchDiscount} onChange={(e) => setBatchDiscount(e.target.value)} placeholder="批量折扣系数（如 0.8）" className="rounded-lg bg-secondary px-3 py-2 text-sm" />
            <input value={batchStock} onChange={(e) => setBatchStock(e.target.value)} placeholder="统一活动库存" className="rounded-lg bg-secondary px-3 py-2 text-sm" />
            <input value={batchLimit} onChange={(e) => setBatchLimit(e.target.value)} placeholder="统一每人限购" className="rounded-lg bg-secondary px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto lg:max-h-none lg:flex-1">
            {selectedList.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border border-border p-2 text-xs">
                <span className="truncate">{p.name}</span>
                <button type="button" onClick={() => toggle(p)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminResponsiveSheet>
  );
}
