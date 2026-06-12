import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import * as orderService from "@/services/orderService";
import * as returnService from "@/services/returnService";
import * as uploadService from "@/services/uploadService";
import type { Order } from "@/types/order";
import type { CreateReturnParams, ReturnType } from "@/types/return";
import { BottomSheetForm } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StableImage from "@/components/ui/StableImage";

const RETURN_TYPES: Array<{ value: ReturnType; label: string }> = [
  { value: "refund", label: "仅退款" },
  { value: "return_refund", label: "退货退款" },
  { value: "exchange", label: "换货" },
  { value: "repair", label: "维修" },
];

const RETURN_REASONS = ["商品损坏", "发错货", "少发/漏发", "质量问题", "尺寸/规格不符", "不想要了", "其他原因"];

type Props = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReturnApplySheet({ orderId, open, onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orderItemId, setOrderItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<ReturnType>("refund");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (open) return;
    setReason("");
    setDescription("");
    setContactPhone("");
    setImages([]);
    setUploading(false);
  }, [open]);

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
    if (uploading) {
      toast.error("图片还在上传中，请稍等");
      throw new Error("validation");
    }
    const payload: CreateReturnParams = {
      order_id: order.id,
      order_item_id: orderItemId,
      quantity,
      type,
      reason: reason.trim(),
      description: description.trim(),
      images,
      proof_images: images,
      contact_phone: contactPhone.trim(),
    };
    await returnService.createReturn(payload);
    toast.success("售后申请已提交");
    onSuccess();
  };

  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    if (images.length + files.length > 6) {
      toast.error("最多上传 6 张凭证图片");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadService.uploadFiles(files, { mode: "image" });
      setImages((prev) => [...prev, ...uploaded.map((item) => item.url)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
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
      loading={loading || uploading}
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
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">请选择售后原因</option>
              {RETURN_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">补充说明</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-border px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">联系电话</span>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="方便客服确认售后细节"
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">凭证图片</span>
              <UnifiedButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                上传图片
              </UnifiedButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void uploadImages(Array.from(e.target.files || []));
                  e.currentTarget.value = "";
                }}
              />
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {images.map((url) => (
                  <div key={url} className="relative overflow-hidden rounded-lg border border-border bg-secondary">
                    <StableImage
                      src={url}
                      alt="售后凭证"
                      className="aspect-square w-full"
                      imgClassName="object-cover"
                    />
                    <UnifiedButton
                      type="button"
                      aria-label="删除图片"
                      onClick={() => setImages((prev) => prev.filter((item) => item !== url))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                    >
                      <X size={13} />
                    </UnifiedButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">建议上传商品破损、错发、包装面单等图片，审核会更快。</p>
            )}
          </div>
        </>
      ) : null}
    </BottomSheetForm>
  );
}
