import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import { useOrderStore } from "@/stores/useOrderStore";
import * as returnService from "@/services/returnService";
import type { ReturnRequest, ReturnType } from "@/types/return";

const RETURN_TYPES: ReturnType[] = ["refund", "return_refund", "exchange", "repair"];

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
    } catch (e: any) {
      toast.error(e?.message || "提交失败");
    }
  };

  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={goBack} className="rounded-full p-2 hover:bg-secondary"><ArrowLeft size={18} /></button>
        <h1 className="text-lg font-semibold">售后申请</h1>
      </div>

      <button className="mb-4 rounded bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "收起申请表" : "发起售后申请"}
      </button>

      {showForm ? (
        <div className="space-y-3 rounded border border-border p-3">
          <select className="h-10 w-full rounded border border-border px-3" value={orderId} onChange={(e) => { setOrderId(e.target.value); setOrderItemId(""); }}>
            <option value="">选择订单</option>
            {orders.map((o) => <option value={o.id} key={o.id}>{o.order_no}</option>)}
          </select>
          <select className="h-10 w-full rounded border border-border px-3" value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)}>
            <option value="">选择商品行</option>
            {selectedOrder?.items?.map((it) => (
              <option value={it.id} key={it.id}>{it.name} / SKU:{it.sku_code || "-"} / 可售后:{it.qty}</option>
            ))}
          </select>
          <input className="h-10 w-full rounded border border-border px-3" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} />
          <select className="h-10 w-full rounded border border-border px-3" value={type} onChange={(e) => setType(e.target.value as ReturnType)}>
            {RETURN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="h-10 w-full rounded border border-border px-3" placeholder="售后原因" value={reason} onChange={(e) => setReason(e.target.value)} />
          <textarea className="w-full rounded border border-border p-2" rows={3} placeholder="问题描述" value={description} onChange={(e) => setDescription(e.target.value)} />
          <textarea className="w-full rounded border border-border p-2" rows={3} placeholder="凭证图片 URL（一行一条）" value={images} onChange={(e) => setImages(e.target.value)} />
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => { void submit(); }}>提交申请</button>
        </div>
      ) : null}

      <div className="mt-6 space-y-2">
        {list.map((r) => (
          <div key={r.id} className="rounded border border-border p-3 text-sm">
            <div>售后单: {r.id.slice(0, 8)} / 订单: {r.order_no}</div>
            <div>类型: {r.type} / 状态: {r.status}</div>
            <div>数量: {r.quantity || 0} / 退款: {Number(r.refund_amount || 0).toFixed(2)}</div>
            <div>原因: {r.reason}</div>
            {r.admin_remark ? <div>处理备注: {r.admin_remark}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
