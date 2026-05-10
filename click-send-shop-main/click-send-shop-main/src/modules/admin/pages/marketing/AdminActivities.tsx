import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import SearchBar from "@/components/SearchBar";
import * as activityService from "@/services/admin/activityService";
import * as productService from "@/services/admin/productService";
import type { ActivityPayload, ActivityProductItem, ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import type { Product } from "@/types/product";
import { toastErrorMessage } from "@/utils/errorMessage";

const emptyForm: ActivityPayload = {
  type: "flash_sale",
  title: "",
  description: "",
  start_at: "",
  end_at: "",
  disabled: false,
  threshold_amount: null,
  discount_amount: null,
  sort_order: 0,
  items: [],
};

const statusClass: Record<ActivityStatus, string> = {
  not_started: "bg-blue-500/10 text-blue-600",
  active: "bg-green-500/10 text-green-600",
  ended: "bg-muted text-muted-foreground",
  disabled: "bg-red-500/10 text-red-600",
};

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTime(offsetHours: number) {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  return toDatetimeLocal(d.toISOString());
}

function normalizeNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function AdminActivities() {
  const [activities, setActivities] = useState<MarketingActivity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<ActivityType | "">("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<MarketingActivity | null>(null);
  const [form, setForm] = useState<ActivityPayload>(emptyForm);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const loadActivities = async (nextPage = page) => {
    setLoading(true);
    try {
      const data = await activityService.fetchActivities({
        page: nextPage,
        pageSize,
        keyword: keyword || undefined,
        type: type || undefined,
        status: status || undefined,
      });
      setActivities(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载活动失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, pageSize]);

  useEffect(() => {
    productService.fetchProducts({ page: 1, pageSize: 50, status: "active" })
      .then((data) => setProducts(data.list))
      .catch(() => setProducts([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      start_at: defaultTime(1),
      end_at: defaultTime(25),
      items: [],
    });
  };

  const openEdit = async (row: MarketingActivity) => {
    try {
      const detail = await activityService.fetchActivity(row.id);
      setEditing(detail);
      setForm({
        type: detail.type,
        title: detail.title,
        description: detail.description || "",
        start_at: toDatetimeLocal(detail.start_at),
        end_at: toDatetimeLocal(detail.end_at),
        disabled: detail.disabled,
        threshold_amount: detail.threshold_amount ?? null,
        discount_amount: detail.discount_amount ?? null,
        sort_order: detail.sort_order || 0,
        items: detail.items || [],
      });
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载活动详情失败"));
    }
  };

  const addItem = () => {
    const first = products.find((p) => !form.items.some((it) => it.product_id === p.id));
    if (!first) {
      toast.info("没有可添加的商品");
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: first.id,
          product_name: first.name,
          product_price: first.price,
          activity_price: first.price,
          limit_per_user: 1,
          activity_stock: Math.max(1, Math.min(first.stock || 1, 100)),
          sort_order: prev.items.length,
        },
      ],
    }));
  };

  const updateItem = (idx: number, patch: Partial<ActivityProductItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        if (patch.product_id) {
          const p = productMap.get(patch.product_id);
          next.product_name = p?.name;
          next.product_price = p?.price;
          next.product_stock = p?.stock;
          if (!next.activity_price) next.activity_price = p?.price || 0;
        }
        return next;
      }),
    }));
  };

  const removeItem = (idx: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const buildPayload = (): ActivityPayload => ({
    ...form,
    threshold_amount: form.type === "full_reduction" ? normalizeNumber(form.threshold_amount, 0) : null,
    discount_amount: form.type === "full_reduction" ? normalizeNumber(form.discount_amount, 0) : null,
    sort_order: normalizeNumber(form.sort_order, 0),
    items: form.items.map((it, idx) => ({
      ...it,
      activity_price: normalizeNumber(it.activity_price, 0),
      activity_stock: Math.max(0, Math.floor(normalizeNumber(it.activity_stock, 0))),
      limit_per_user: Math.max(0, Math.floor(normalizeNumber(it.limit_per_user, 0))),
      sort_order: idx,
    })),
  });

  const save = async () => {
    const payload = buildPayload();
    if (!payload.title.trim()) {
      toast.error("活动名称必填");
      return;
    }
    if (!payload.items.length) {
      toast.error("至少添加一个活动商品");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await activityService.updateActivity(editing.id, payload);
        toast.success("活动已更新");
      } else {
        await activityService.createActivity(payload);
        toast.success("活动已创建");
      }
      setEditing(null);
      setForm(emptyForm);
      await loadActivities(page);
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const formOpen = form.start_at || form.end_at || form.title || editing;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <CalendarClock className="h-6 w-6 text-[var(--theme-price)]" /> 活动管理
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">支持限时秒杀、满减活动、活动价、限购和活动库存。</p>
        </div>
        <PermissionGate permission="activity.manage">
          <button type="button" onClick={openCreate} className="theme-rounded px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--theme-gradient)" }}>
            <Plus size={16} className="mr-1 inline" /> 新建活动
          </button>
        </PermissionGate>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
        <SearchBar placeholder="搜索活动名称..." value={keyword} onChange={(v) => setKeyword(v)} />
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType | "")} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm">
          <option value="">全部类型</option>
          <option value="flash_sale">限时秒杀</option>
          <option value="full_reduction">满减活动</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as ActivityStatus | "")} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm">
          <option value="">全部状态</option>
          <option value="not_started">未开始</option>
          <option value="active">进行中</option>
          <option value="ended">已结束</option>
          <option value="disabled">禁用</option>
        </select>
        <button type="button" onClick={() => { setPage(1); void loadActivities(1); }} className="theme-rounded border border-[var(--theme-border)] px-4 py-2 text-sm">
          查询
        </button>
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
        {loading ? (
          <div className="flex h-44 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--theme-price)]" /></div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">暂无活动</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-[var(--theme-bg)]/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">活动</th>
                  <th className="px-4 py-3 text-left">类型</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">时间</th>
                  <th className="px-4 py-3 text-left">商品/库存</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--theme-border)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{a.title}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{a.description || "—"}</div>
                    </td>
                    <td className="px-4 py-3">{a.type === "flash_sale" ? "限时秒杀" : "满减活动"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[a.status]}`}>{a.status_label}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{new Date(a.start_at).toLocaleString("zh-CN")}</div>
                      <div>{new Date(a.end_at).toLocaleString("zh-CN")}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{a.product_count || 0} 个商品</div>
                      <div>库存 {a.activity_stock_total || 0} / 已售 {a.sold_count_total || 0}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void openEdit(a)} className="theme-rounded border border-[var(--theme-border)] px-2 py-1 text-xs"><Pencil size={12} className="mr-1 inline" />编辑</button>
                        <button type="button" onClick={async () => { await activityService.setActivityDisabled(a.id, a.status !== "disabled"); await loadActivities(page); }} className="theme-rounded border border-[var(--theme-border)] px-2 py-1 text-xs">
                          {a.status === "disabled" ? "启用" : "禁用"}
                        </button>
                        <button type="button" onClick={async () => { if (!confirm(`确定删除活动「${a.title}」？`)) return; await activityService.deleteActivity(a.id); toast.success("已删除"); await loadActivities(page); }} className="theme-rounded border border-destructive/40 px-2 py-1 text-xs text-destructive">
                          <Trash2 size={12} className="mr-1 inline" />删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={(p) => { setPage(p); void loadActivities(p); }} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeForm}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto theme-rounded bg-[var(--theme-surface)] p-5 theme-shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">{editing ? "编辑活动" : "新建活动"}</h2>
              <button type="button" onClick={closeForm} className="text-sm text-muted-foreground">关闭</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">活动名称<input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2" /></label>
              <label className="text-sm">活动类型<select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ActivityType }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2"><option value="flash_sale">限时秒杀</option><option value="full_reduction">满减活动</option></select></label>
              <label className="text-sm">
                开始时间
                <div className="mt-1">
                  <SegmentedDateTimeInput
                    value={form.start_at}
                    onChange={(v) => setForm((p) => ({ ...p, start_at: v }))}
                    className="w-full [&>div]:theme-rounded [&>div]:border-[var(--theme-border)] [&>div]:bg-[var(--theme-bg)]"
                  />
                </div>
              </label>
              <label className="text-sm">
                结束时间
                <div className="mt-1">
                  <SegmentedDateTimeInput
                    value={form.end_at}
                    onChange={(v) => setForm((p) => ({ ...p, end_at: v }))}
                    className="w-full [&>div]:theme-rounded [&>div]:border-[var(--theme-border)] [&>div]:bg-[var(--theme-bg)]"
                  />
                </div>
              </label>
              {form.type === "full_reduction" && (
                <>
                  <label className="text-sm">满减门槛 RM<input type="number" value={form.threshold_amount ?? ""} onChange={(e) => setForm((p) => ({ ...p, threshold_amount: Number(e.target.value) }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2" /></label>
                  <label className="text-sm">优惠金额 RM<input type="number" value={form.discount_amount ?? ""} onChange={(e) => setForm((p) => ({ ...p, discount_amount: Number(e.target.value) }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2" /></label>
                </>
              )}
              <label className="md:col-span-2 text-sm">说明<textarea value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 min-h-20 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2" /></label>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">活动商品</h3>
                <button type="button" onClick={addItem} className="theme-rounded border border-[var(--theme-border)] px-3 py-1.5 text-xs">添加商品</button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div key={`${it.product_id}-${idx}`} className="grid gap-2 theme-rounded border border-[var(--theme-border)] p-3 md:grid-cols-[2fr_repeat(3,1fr)_auto]">
                    <select value={it.product_id} onChange={(e) => updateItem(idx, { product_id: e.target.value })} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-sm">
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} · RM {p.price} · 库存 {p.stock}</option>)}
                    </select>
                    <input type="number" min={0} step="0.01" value={it.activity_price} onChange={(e) => updateItem(idx, { activity_price: Number(e.target.value) })} placeholder="活动价" className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-sm" />
                    <input type="number" min={0} value={it.limit_per_user} onChange={(e) => updateItem(idx, { limit_per_user: Number(e.target.value) })} placeholder="限购数量" className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-sm" />
                    <input type="number" min={0} value={it.activity_stock} onChange={(e) => updateItem(idx, { activity_stock: Number(e.target.value) })} placeholder="活动库存" className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-sm" />
                    <button type="button" onClick={() => removeItem(idx)} className="theme-rounded border border-destructive/40 px-3 py-2 text-xs text-destructive">移除</button>
                  </div>
                ))}
                {form.items.length === 0 && <div className="theme-rounded border border-dashed border-[var(--theme-border)] py-8 text-center text-sm text-muted-foreground">请添加活动商品</div>}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="theme-rounded border border-[var(--theme-border)] px-5 py-2 text-sm">取消</button>
              <button type="button" onClick={() => void save()} disabled={saving} className="theme-rounded px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--theme-gradient)" }}>
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
