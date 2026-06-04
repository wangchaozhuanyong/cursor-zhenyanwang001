import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as orderService from "@/services/orderService";
import * as returnService from "@/services/returnService";
import type { Order } from "@/types/order";
import type { CreateReturnParams, ReturnType } from "@/types/return";
import { BottomSheetForm } from "@/modules/micro-interactions";

const RETURN_TYPES: Array<{ value: ReturnType; label: string }> = [
  { value: "refund", label: "仅退款" },
  { value: "return_refund", label: "退货退款" },
  { value: "exchange", label: "换货" },
  { value: "repair", label: "维修" },
];

type Props = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReturnApplySheet({ orderId, open, onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderItemId, setOrderItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<ReturnType>("refund");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      return;
    }
    setLoading(true);
    void orderService.fetchOrderById(orderId)
      .then((o) => {
        setOrder(o);
        const first = o.items.find((it) => it.order_item_id);
        setOrderItemId(first?.order_item_id || "");
        setQuantity(1);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "加载订单失败");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, orderId, onClose]);

  const selectedItem = useMemo(
    () => order?.items.find((it) => it.order_item_id === orderItemId),
    [order, orderItemId],
  );
  const maxQty = Math.max(1, Number(selectedItem?.qty || 1));

  useEffect(() => {
    if (quantity > maxQty) setQuantity(maxQty);
  }, [maxQty, quantity]);

  const submit = async () => {
    if (!orderId) {
      onClose();
      navigate("/orders?tab=shipped");
      return;
    }
    if (!order || !orderItemId) {
      toast.error("请选择要售后的商品");
      throw new Error("validation");
    }
    if (!reason.trim()) {
      toast.error("请填写售后原因");
      throw new Error("validation");
    }
    const payload: CreateReturnParams = {
      order_id: order.id,
      order_item_id: orderItemId,
      quantity,
      type,
      reason: reason.trim(),
      description: description.trim(),
    };
    await returnService.createReturn(payload);
    toast.success("售后申请已提交");
    onSuccess();
  };

  return (
    <BottomSheetForm
      open={open}
      onClose={onClose}
      title="申请售后"
      description={
        loading
          ? "加载订单中..."
          : orderId
            ? `订单号 ${order?.order_no || ""}`
            : "请从「我的订单」中已发货或已完成订单点击「申请售后」"
      }
      submitText="提交申请"
      loading={loading}
      onSubmit={submit}
      height="90vh"
    >
      {!orderId ? (
        <p className="text-sm text-muted-foreground">也可前往待收货/已完成订单列表发起申请。</p>
      ) : null}
      {orderId && order ? (
        <>
          <label className="block">
            <span className="text-muted-foreground">商品行</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={orderItemId}
              onChange={(e) => setOrderItemId(e.target.value)}
            >
              {order.items.map((it) => (
                <option key={it.order_item_id || it.id} value={it.order_item_id || ""} disabled={!it.order_item_id}>
                  {it.product.name} × {it.qty}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">数量</span>
            <input
              type="number"
              min={1}
              max={maxQty}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={quantity}
              onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">类型</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as ReturnType)}
            >
              {RETURN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">原因（必填）</span>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：商品损坏、发错货"
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">补充说明</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-border px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </>
      ) : null}
    </BottomSheetForm>
  );
}
