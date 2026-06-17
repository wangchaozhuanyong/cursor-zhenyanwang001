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
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";
import { getReturnTypeLabel } from "./returnProgress";

const RETURN_TYPES: ReturnType[] = [
  "refund",
  "return_refund",
  "exchange",
  "repair",
];

const RETURN_REASON_VALUES = ["商品损坏", "发错货", "少发/漏发", "质量问题", "尺寸/规格不符", "不想要了", "其他原因"] as const;

const RETURN_REASON_LABELS: Record<PublicLocale, Record<(typeof RETURN_REASON_VALUES)[number], string>> = {
  zh: {
    "商品损坏": "商品损坏",
    "发错货": "发错货",
    "少发/漏发": "少发/漏发",
    "质量问题": "质量问题",
    "尺寸/规格不符": "尺寸/规格不符",
    "不想要了": "不想要了",
    "其他原因": "其他原因",
  },
  en: {
    "商品损坏": "Item damaged",
    "发错货": "Wrong item sent",
    "少发/漏发": "Missing item",
    "质量问题": "Quality issue",
    "尺寸/规格不符": "Size/spec mismatch",
    "不想要了": "No longer needed",
    "其他原因": "Other reason",
  },
};

const RETURN_APPLY_COPY: Record<PublicLocale, {
  loadFailed: string;
  selectItem: string;
  reasonRequired: string;
  uploadPending: string;
  submitted: string;
  uploadLimit: string;
  uploadFailed: string;
  title: string;
  loadingOrder: string;
  orderNo: string;
  startFromOrders: string;
  submit: string;
  noOrderHint: string;
  itemLine: string;
  quantity: string;
  type: string;
  reason: string;
  reasonPlaceholder: string;
  description: string;
  phone: string;
  phonePlaceholder: string;
  evidenceImages: string;
  uploadImage: string;
  evidenceAlt: string;
  deleteImage: string;
  evidenceHint: string;
}> = {
  zh: {
    loadFailed: "加载订单失败",
    selectItem: "请选择要售后的商品",
    reasonRequired: "请填写售后原因",
    uploadPending: "图片还在上传中，请稍等",
    submitted: "售后申请已提交",
    uploadLimit: "最多上传 6 张凭证图片",
    uploadFailed: "图片上传失败",
    title: "申请售后",
    loadingOrder: "加载订单中...",
    orderNo: "订单号",
    startFromOrders: "请从「我的订单」中已发货或已完成订单点击「申请售后」",
    submit: "提交申请",
    noOrderHint: "也可前往待收货/已完成订单列表发起申请。",
    itemLine: "商品行",
    quantity: "数量",
    type: "类型",
    reason: "原因（必填）",
    reasonPlaceholder: "请选择售后原因",
    description: "补充说明",
    phone: "联系电话",
    phonePlaceholder: "方便客服确认售后细节",
    evidenceImages: "凭证图片",
    uploadImage: "上传图片",
    evidenceAlt: "售后凭证",
    deleteImage: "删除图片",
    evidenceHint: "建议上传商品破损、错发、包装面单等图片，审核会更快。",
  },
  en: {
    loadFailed: "Failed to load order",
    selectItem: "Select the item for after-sales service",
    reasonRequired: "Select a reason",
    uploadPending: "Images are still uploading. Please wait.",
    submitted: "Request submitted",
    uploadLimit: "Upload up to 6 evidence images",
    uploadFailed: "Image upload failed",
    title: "Request after-sales service",
    loadingOrder: "Loading order...",
    orderNo: "Order no.",
    startFromOrders: "Open a shipped or completed order from My Orders to request service.",
    submit: "Submit request",
    noOrderHint: "You can also start from shipped or completed orders.",
    itemLine: "Order item",
    quantity: "Quantity",
    type: "Type",
    reason: "Reason (required)",
    reasonPlaceholder: "Select a reason",
    description: "Additional notes",
    phone: "Contact phone",
    phonePlaceholder: "Helps support confirm the service details",
    evidenceImages: "Evidence images",
    uploadImage: "Upload image",
    evidenceAlt: "After-sales evidence",
    deleteImage: "Delete image",
    evidenceHint: "Upload item damage, wrong-item, packaging, or waybill photos for faster review.",
  },
};

type Props = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReturnApplySheet({ orderId, open, onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const { localizedPath, locale } = usePublicLocale();
  const copy = RETURN_APPLY_COPY[locale];
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
        toast.error(e instanceof Error ? e.message : copy.loadFailed);
        onClose();
      })
      .finally(() => setLoading(false));
  }, [copy.loadFailed, open, orderId, onClose]);

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
      navigate(localizedPath("/orders?tab=shipped"));
      return;
    }
    if (!order || !orderItemId) {
      toast.error(copy.selectItem);
      throw new Error("validation");
    }
    if (!reason.trim()) {
      toast.error(copy.reasonRequired);
      throw new Error("validation");
    }
    if (uploading) {
      toast.error(copy.uploadPending);
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
    toast.success(copy.submitted);
    onSuccess();
  };

  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    if (images.length + files.length > 6) {
      toast.error(copy.uploadLimit);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadService.uploadFiles(files, { mode: "image" });
      setImages((prev) => [...prev, ...uploaded.map((item) => item.url)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <BottomSheetForm
      open={open}
      onClose={onClose}
      title={copy.title}
      description={
        loading
          ? copy.loadingOrder
          : orderId
            ? `${copy.orderNo} ${order?.order_no || ""}`
            : copy.startFromOrders
      }
      submitText={copy.submit}
      loading={loading || uploading}
      onSubmit={submit}
      height="90vh"
    >
      {!orderId ? (
        <p className="text-sm text-muted-foreground">{copy.noOrderHint}</p>
      ) : null}
      {orderId && order ? (
        <>
          <label className="block">
            <span className="text-muted-foreground">{copy.itemLine}</span>
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
            <span className="text-muted-foreground">{copy.quantity}</span>
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
            <span className="text-muted-foreground">{copy.type}</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as ReturnType)}
            >
              {RETURN_TYPES.map((returnType) => (
                <option key={returnType} value={returnType}>{getReturnTypeLabel(returnType, locale)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">{copy.reason}</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">{copy.reasonPlaceholder}</option>
              {RETURN_REASON_VALUES.map((item) => <option key={item} value={item}>{RETURN_REASON_LABELS[locale][item]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">{copy.description}</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-border px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">{copy.phone}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder={copy.phonePlaceholder}
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{copy.evidenceImages}</span>
              <UnifiedButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {copy.uploadImage}
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
                      alt={copy.evidenceAlt}
                      className="aspect-square w-full"
                      imgClassName="object-cover"
                    />
                    <UnifiedButton
                      type="button"
                      aria-label={copy.deleteImage}
                      onClick={() => setImages((prev) => prev.filter((item) => item !== url))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                    >
                      <X size={13} />
                    </UnifiedButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{copy.evidenceHint}</p>
            )}
          </div>
        </>
      ) : null}
    </BottomSheetForm>
  );
}
