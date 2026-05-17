import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import { useOrderStore } from "@/stores/useOrderStore";
import * as returnService from "@/services/returnService";
import type { ReturnRequest, ReturnType } from "@/types/return";
import { getReturnStatusBadgeClass, getReturnStatusLabel } from "@/constants/statusDictionary";
import { THEME_BTN_GRADIENT } from "@/utils/themeVisuals";

const RETURN_TYPES: ReturnType[] = ["refund", "return_refund", "exchange", "repair"];

const inputClass =
  "h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm text-[var(--theme-text-on-surface)] outline-none focus:border-[var(--theme-primary)]";
const textareaClass =
  "w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-sm text-[var(--theme-text-on-surface)] outline-none focus:border-[var(--theme-primary)]";

export default function Returns() {
  const goBack = useGoBack();
  const { orders, loadOrders } = useOrderStore();
  const [list, setList] = useState<ReturnRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [orderItemId, setOrderItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<ReturnType>("refund");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string>("");

  useEffect(() => {
    void loadOrders();
    void returnService.fetchReturnRequests().then((r) => setList(r.list)).catch(() => {});
  }, [loadOrders]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === orderId),
    [orders, orderId],
  );
  const selectedItem = useMemo(
    () => selectedOrder?.items?.find((i) => i.id === orderItemId),
    [selectedOrder, orderItemId],
  );

  const submit = async () => {
    if (!orderId || !orderItemId) {
      toast.error("请先选择订单和商品");
      return;
    }
    if (!reason.trim()) {
      toast.error("请填写售后原因");
      return;
    }
    const maxQty = Number(selectedItem?.qty || 0);
    if (quantity < 1 || quantity > maxQty) {
      toast.error("售后数量不能超过购买数量");
      return;
    }
    const imageList = images
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      const row = await returnService.createReturn({
        order_id: orderId,
        order_item_id: orderItemId,
        quantity,
        type,
        reason: reason.trim(),
        description: description.trim(),
        images: imageList,
      });
      setList((prev) => [row, ...prev]);
      toast.success("售后申请已提交");
      setShowForm(false);
      setOrderId("");
      setOrderItemId("");
      setQuantity(1);
      setType("refund");
      setReason("");
      setDescription("");
      setImages("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-8">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)]"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">售后申请</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        <button
          type="button"
          className={`rounded-full px-4 py-2.5 text-sm font-semibold ${THEME_BTN_GRADIENT}`}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "收起申请表" : "发起售后申请"}
        </button>

        {showForm ? (
          <div className="space-y-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
            <select className={inputClass} value={orderId} onChange={(e) => { setOrderId(e.target.value); setOrderItemId(""); }}>
              <option value="">选择订单</option>
              {orders.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.order_no}
                </option>
              ))}
            </select>
            <select className={inputClass} value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)}>
              <option value="">选择商品行</option>
              {selectedOrder?.items?.map((it) => (
                <option value={it.id} key={it.id}>
                  {it.name} / SKU:{it.sku_code || "-"} / 可售后:{it.qty}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value || 1))}
            />
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as ReturnType)}>
              {RETURN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input className={inputClass} placeholder="售后原因" value={reason} onChange={(e) => setReason(e.target.value)} />
            <textarea className={textareaClass} rows={3} placeholder="问题描述" value={description} onChange={(e) => setDescription(e.target.value)} />
            <textarea className={textareaClass} rows={3} placeholder="凭证图片 URL（一行一条）" value={images} onChange={(e) => setImages(e.target.value)} />
            <button
              type="button"
              className={`w-full rounded-full py-2.5 text-sm font-semibold ${THEME_BTN_GRADIENT}`}
              onClick={() => {
                void submit();
              }}
            >
              提交申请
            </button>
          </div>
        ) : null}

        <div className="space-y-2">
          {list.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm shadow-[var(--theme-shadow)]"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-[var(--theme-text-on-surface)]">售后单 {r.id.slice(0, 8)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getReturnStatusBadgeClass(r.status)}`}>
                  {getReturnStatusLabel(r.status)}
                </span>
              </div>
              <div className="text-[var(--theme-text-muted-on-surface)]">订单: {r.order_no}</div>
              <div className="text-[var(--theme-text-muted-on-surface)]">类型: {r.type}</div>
              <div>数量: {r.quantity || 0} / 退款: RM {Number(r.refund_amount || 0).toFixed(2)}</div>
              <div className="mt-1 text-[var(--theme-text-on-surface)]">原因: {r.reason}</div>
              {r.admin_remark ? (
                <div className="mt-1 text-[var(--theme-text-muted-on-surface)]">处理备注: {r.admin_remark}</div>
              ) : null}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}