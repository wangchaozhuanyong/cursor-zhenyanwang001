import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Circle, CreditCard, ImagePlus, Loader2, PackageCheck, RotateCcw, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import StableImage from "@/components/ui/StableImage";
import { getReturnStatusBadgeClass } from "@/constants/statusDictionary";
import { formatDateTime } from "@/utils/formatDateTime";
import * as returnService from "@/services/returnService";
import * as uploadService from "@/services/uploadService";
import type { ReturnRequest } from "@/types/return";
import {
  buildReturnTimeline,
  getBuyerReturnAction,
  getLogisticsTrackTitle,
  getRefundRecordAmountText,
  getRefundRecordStatusLabel,
  getReturnItemImage,
  getReturnItemName,
  getReturnStatusLabel,
  getReturnTypeLabel,
} from "./returnProgress";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

const ORDER_REFUND_STATUS_LABELS: Record<PublicLocale, Record<string, string>> = {
  zh: {
    pending: "待处理",
    paid: "未退款",
    partially_refunded: "部分退款",
    refunded: "已退款",
    refunding: "退款中",
  },
  en: {
    pending: "Pending",
    paid: "Not refunded",
    partially_refunded: "Partially refunded",
    refunded: "Refunded",
    refunding: "Refunding",
  },
};

const RETURN_DETAIL_COPY: Record<PublicLocale, {
  loadFailed: string;
  uploadLimit: string;
  uploadFailed: string;
  actionFailed: string;
  evidenceRequired: string;
  evidenceSubmitted: string;
  logisticsRequired: string;
  logisticsSubmitted: string;
  cancelConfirm: string;
  cancelSubmitted: string;
  completedSubmitted: string;
  title: string;
  backToProgress: string;
  loading: string;
  order: string;
  quantity: string;
  refund: string;
  nextStep: string;
  progress: string;
  evidenceTitle: string;
  evidencePlaceholder: string;
  uploadImage: string;
  submitEvidence: string;
  evidenceAlt: string;
  evidenceSupplementAlt: string;
  deleteImage: string;
  logisticsTitle: string;
  carrier: string;
  trackingNo: string;
  contactPhone: string;
  noteOptional: string;
  submitLogistics: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmButton: string;
  cancelTitle: string;
  cancelDescription: string;
  cancelButton: string;
  refundStatus: string;
  orderRefundStatus: string;
  currentRefund: string;
  orderRefunded: string;
  noRefundRecords: string;
  applicationInfo: string;
  reason: string;
  description: string;
  merchantNote: string;
  returnShipments: string;
  logisticsTracks: string;
  noCarrierTracks: string;
  noRefund: string;
}> = {
  zh: {
    loadFailed: "售后详情加载失败",
    uploadLimit: "最多上传 6 张凭证图片",
    uploadFailed: "图片上传失败",
    actionFailed: "操作失败",
    evidenceRequired: "请填写说明或上传凭证图片",
    evidenceSubmitted: "凭证已提交",
    logisticsRequired: "请填写快递公司和物流单号",
    logisticsSubmitted: "退货物流已提交",
    cancelConfirm: "确定取消这次售后申请吗？",
    cancelSubmitted: "售后申请已取消",
    completedSubmitted: "售后已确认完成",
    title: "售后详情",
    backToProgress: "返回售后进度",
    loading: "加载中...",
    order: "订单",
    quantity: "申请数量",
    refund: "退款",
    nextStep: "下一步",
    progress: "售后进度",
    evidenceTitle: "补充凭证",
    evidencePlaceholder: "请补充商品问题、包装情况、沟通过程等说明",
    uploadImage: "上传图片",
    submitEvidence: "提交凭证",
    evidenceAlt: "售后凭证",
    evidenceSupplementAlt: "售后补充凭证",
    deleteImage: "删除图片",
    logisticsTitle: "填写退货物流",
    carrier: "快递公司",
    trackingNo: "物流单号",
    contactPhone: "联系电话",
    noteOptional: "备注，可不填",
    submitLogistics: "提交退货物流",
    confirmTitle: "确认完成",
    confirmDescription: "确认收到换货商品，或确认退款无误后，可以结束本次售后。",
    confirmButton: "确认售后完成",
    cancelTitle: "取消申请",
    cancelDescription: "如果不需要继续售后，可以取消申请。若商品已经寄出，请先联系客服确认。",
    cancelButton: "取消售后申请",
    refundStatus: "退款状态",
    orderRefundStatus: "订单退款状态",
    currentRefund: "本次退款",
    orderRefunded: "订单累计已退",
    noRefundRecords: "暂无支付渠道退款记录，商家处理退款后这里会同步显示。",
    applicationInfo: "申请信息",
    reason: "原因",
    description: "说明",
    merchantNote: "商家备注",
    returnShipments: "退货包裹",
    logisticsTracks: "退货物流轨迹",
    noCarrierTracks: "已收到退货物流单号，暂无承运商轨迹。物流接口接通或商家刷新后会显示完整轨迹。",
    noRefund: "暂无退款",
  },
  en: {
    loadFailed: "Failed to load return details",
    uploadLimit: "Upload up to 6 evidence images",
    uploadFailed: "Image upload failed",
    actionFailed: "Action failed",
    evidenceRequired: "Add notes or upload evidence images",
    evidenceSubmitted: "Evidence submitted",
    logisticsRequired: "Enter the courier and tracking number",
    logisticsSubmitted: "Return logistics submitted",
    cancelConfirm: "Cancel this after-sales request?",
    cancelSubmitted: "Request cancelled",
    completedSubmitted: "After-sales case confirmed completed",
    title: "After-sales details",
    backToProgress: "Back to progress",
    loading: "Loading...",
    order: "Order",
    quantity: "Request quantity",
    refund: "Refund",
    nextStep: "Next step",
    progress: "Progress",
    evidenceTitle: "Add evidence",
    evidencePlaceholder: "Add item issue, packaging condition, or conversation details",
    uploadImage: "Upload image",
    submitEvidence: "Submit evidence",
    evidenceAlt: "After-sales evidence",
    evidenceSupplementAlt: "Additional after-sales evidence",
    deleteImage: "Delete image",
    logisticsTitle: "Submit return logistics",
    carrier: "Courier",
    trackingNo: "Tracking number",
    contactPhone: "Contact phone",
    noteOptional: "Note, optional",
    submitLogistics: "Submit return logistics",
    confirmTitle: "Confirm completion",
    confirmDescription: "Finish this case after you receive the exchange or confirm the refund.",
    confirmButton: "Confirm completed",
    cancelTitle: "Cancel request",
    cancelDescription: "You can cancel if you no longer need service. Contact support first if the item has already been shipped back.",
    cancelButton: "Cancel request",
    refundStatus: "Refund status",
    orderRefundStatus: "Order refund status",
    currentRefund: "This refund",
    orderRefunded: "Total refunded",
    noRefundRecords: "No payment-provider refund records yet. They will appear after the merchant processes the refund.",
    applicationInfo: "Request information",
    reason: "Reason",
    description: "Description",
    merchantNote: "Merchant note",
    returnShipments: "Return shipments",
    logisticsTracks: "Return logistics tracking",
    noCarrierTracks: "The return tracking number has been received, but no carrier events are available yet. Events will appear after carrier integration or merchant refresh.",
    noRefund: "No refund yet",
  },
};

function getOrderRefundStatusLabel(status?: string, locale: PublicLocale = "zh") {
  const labels = ORDER_REFUND_STATUS_LABELS[locale] || ORDER_REFUND_STATUS_LABELS.zh;
  return labels[status || ""] || status || RETURN_DETAIL_COPY[locale]?.noRefund || RETURN_DETAIL_COPY.zh.noRefund;
}

function money(value?: number | string | null) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { localizedPath, locale } = usePublicLocale();
  const copy = RETURN_DETAIL_COPY[locale];
  const goBack = useGoBack(localizedPath("/returns"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detail, setDetail] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logisticsNote, setLogisticsNote] = useState("");

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await returnService.fetchReturnById(id);
      setDetail(data);
      setContactPhone(data.contact_phone || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadFailed);
      navigate(localizedPath("/returns"), { replace: true });
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, id, localizedPath, navigate]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    if (evidenceImages.length + files.length > 6) {
      toast.error(copy.uploadLimit);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadService.uploadFiles(files, { mode: "image" });
      setEvidenceImages((prev) => [...prev, ...uploaded.map((item) => item.url)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const runAction = async (task: () => Promise<unknown>, successText: string) => {
    setSubmitting(true);
    try {
      await task();
      toast.success(successText);
      setEvidenceText("");
      setEvidenceImages([]);
      setCarrier("");
      setTrackingNo("");
      setLogisticsNote("");
      await loadDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.actionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const submitEvidence = () => {
    if (!id) return;
    if (!evidenceText.trim() && evidenceImages.length === 0) {
      toast.error(copy.evidenceRequired);
      return;
    }
    void runAction(
      () => returnService.supplementEvidence(id, {
        description: evidenceText.trim(),
        images: evidenceImages,
        proof_images: evidenceImages,
      }),
      copy.evidenceSubmitted,
    );
  };

  const submitLogistics = () => {
    if (!id) return;
    if (!carrier.trim() || !trackingNo.trim()) {
      toast.error(copy.logisticsRequired);
      return;
    }
    void runAction(
      () => returnService.submitLogistics(id, {
        carrier: carrier.trim(),
        tracking_no: trackingNo.trim(),
        contact_phone: contactPhone.trim(),
        note: logisticsNote.trim(),
      }),
      copy.logisticsSubmitted,
    );
  };

  const cancelReturn = () => {
    if (!id) return;
    if (!window.confirm(copy.cancelConfirm)) return;
    void runAction(() => returnService.cancelReturn(id), copy.cancelSubmitted);
  };

  const confirmCompleted = () => {
    if (!id) return;
    void runAction(() => returnService.confirmCompleted(id), copy.completedSubmitted);
  };

  const action = detail ? getBuyerReturnAction(detail, locale) : null;
  const timeline = detail ? buildReturnTimeline(detail, locale) : [];
  const image = detail ? getReturnItemImage(detail) : "";
  const returnQuantity = detail ? detail.quantity || detail.item_info?.request_qty || 1 : 0;
  const returnRefundAmount = detail ? Number(detail.refund_summary?.refund_amount || detail.refund_amount || 0) : 0;
  const orderRefundedAmount = detail ? Number(detail.refund_summary?.order_refunded_amount || 0) : 0;
  const returnStatusLabel = detail ? getReturnStatusLabel(detail.status, locale) : "";
  const returnTypeLabel = detail ? getReturnTypeLabel(detail.type, locale) : "";
  const refundStatusLabel = detail
    ? getOrderRefundStatusLabel(detail.refund_summary?.order_refund_status || detail.refund_summary?.order_payment_status, locale)
    : "";

  return (
    <StoreAccountLayout title={copy.title} onBack={goBack} backFallback={localizedPath("/returns")} desktopBackLabel={copy.backToProgress} className="store-v12-page store-return-detail-v12-page" mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full max-w-3xl space-y-4 text-sm">
        {loading ? <p className="rounded-xl border border-border bg-card p-4 text-muted-foreground">{copy.loading}</p> : null}
        {detail ? (
          <>
            <section className="store-return-detail-v12-hero">
              <div className="store-return-detail-v12-hero__icon">
                <RotateCcw size={24} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="store-return-detail-v12-eyebrow">{returnTypeLabel}</p>
                <h1 className="store-return-detail-v12-title">{returnStatusLabel}</h1>
                <p className="store-return-detail-v12-subtitle">
                  {copy.order} {detail.order_no} · {getReturnItemName(detail, locale)}
                </p>
              </div>
              {action ? (
                <div className="store-return-detail-v12-next">
                  <span>{copy.nextStep}</span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </div>
              ) : null}
            </section>

            <section className="store-return-detail-v12-summary store-orders-v12-stat-grid">
              <div className="store-orders-v12-stat">
                <span className="store-orders-v12-stat__icon"><PackageCheck size={17} aria-hidden /></span>
                <strong>{returnQuantity}</strong>
                <span>{copy.quantity}</span>
                <small>{returnTypeLabel}</small>
              </div>
              <div className="store-orders-v12-stat">
                <span className="store-orders-v12-stat__icon"><CreditCard size={17} aria-hidden /></span>
                <strong>{returnRefundAmount > 0 ? money(returnRefundAmount) : copy.noRefund}</strong>
                <span>{copy.currentRefund}</span>
                <small>{refundStatusLabel}</small>
              </div>
              <div className="store-orders-v12-stat">
                <span className="store-orders-v12-stat__icon"><Truck size={17} aria-hidden /></span>
                <strong>{detail.shipments?.length || 0}</strong>
                <span>{copy.returnShipments}</span>
                <small>{detail.logistics_tracks?.length || 0} 条轨迹</small>
              </div>
              <div className="store-orders-v12-stat">
                <span className="store-orders-v12-stat__icon"><RotateCcw size={17} aria-hidden /></span>
                <strong>{orderRefundedAmount > 0 ? money(orderRefundedAmount) : "-"}</strong>
                <span>{copy.orderRefunded}</span>
                <small>{formatDateTime(detail.updated_at)}</small>
              </div>
            </section>

            <section className="store-return-detail-v12-product-card rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-14 shrink-0 overflow-hidden rounded-xl bg-secondary" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
                  {image ? (
                    <ProductCoverImage
                      url={image}
                      alt={getReturnItemName(detail, locale)}
                      className="h-full w-full"
                      imgClassName="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-base font-semibold text-foreground">{getReturnItemName(detail, locale)}</h1>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${getReturnStatusBadgeClass(detail.status)}`}>
                      {getReturnStatusLabel(detail.status, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getReturnTypeLabel(detail.type, locale)} · {copy.order} {detail.order_no}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.quantity} {returnQuantity}
                    {detail.refund_amount != null && Number(detail.refund_amount) > 0 ? ` · ${copy.refund} ${money(detail.refund_amount)}` : ""}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">{copy.progress}</h2>
              <div className="mt-4 space-y-4">
                {timeline.map((item, index) => (
                  <div key={item.key} className="grid grid-cols-[24px_1fr] gap-3">
                    <div className="flex flex-col items-center">
                      {item.current ? <Circle className="fill-[var(--theme-primary)] text-[var(--theme-primary)]" size={16} /> : <CheckCircle2 className="text-[var(--theme-primary)]" size={16} />}
                      {index < timeline.length - 1 ? <span className="mt-1 h-full w-px min-h-8 bg-border" /> : null}
                    </div>
                    <div className="pb-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.note ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.note}</p> : null}
                      {item.time ? <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.time)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {action?.key === "evidence" ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">{copy.evidenceTitle}</h2>
                <textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  rows={4}
                  placeholder={copy.evidencePlaceholder}
                  className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
                <div className="mt-3 flex items-center justify-between">
                  <UnifiedButton type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-60">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {copy.uploadImage}
                  </UnifiedButton>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void uploadImages(Array.from(e.target.files || [])); e.currentTarget.value = ""; }} />
                  <UnifiedButton type="button" onClick={submitEvidence} disabled={submitting || uploading} className="rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
                    {copy.submitEvidence}
                  </UnifiedButton>
                </div>
                {evidenceImages.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {evidenceImages.map((url) => (
                      <div key={url} className="relative overflow-hidden rounded-lg border border-border">
                        <StableImage
                          src={url}
                          alt={copy.evidenceSupplementAlt}
                          className="aspect-square w-full"
                          imgClassName="object-cover"
                        />
                        <UnifiedButton type="button" aria-label={copy.deleteImage} onClick={() => setEvidenceImages((prev) => prev.filter((item) => item !== url))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                          <X size={13} />
                        </UnifiedButton>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {action?.key === "logistics" ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><Truck size={16} />{copy.logisticsTitle}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={copy.carrier} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                  <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder={copy.trackingNo} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={copy.contactPhone} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                  <input value={logisticsNote} onChange={(e) => setLogisticsNote(e.target.value)} placeholder={copy.noteOptional} className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                </div>
                <UnifiedButton type="button" onClick={submitLogistics} disabled={submitting} className="mt-3 w-full rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
                  {copy.submitLogistics}
                </UnifiedButton>
              </section>
            ) : null}

            {action?.key === "confirm" ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><PackageCheck size={16} />{copy.confirmTitle}</h2>
                <p className="mt-2 text-xs text-muted-foreground">{copy.confirmDescription}</p>
                <UnifiedButton type="button" onClick={confirmCompleted} disabled={submitting} className="mt-3 w-full rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
                  {copy.confirmButton}
                </UnifiedButton>
              </section>
            ) : null}

            {action?.key === "cancel" ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><RotateCcw size={16} />{copy.cancelTitle}</h2>
                <p className="mt-2 text-xs text-muted-foreground">{copy.cancelDescription}</p>
                <UnifiedButton type="button" onClick={cancelReturn} disabled={submitting} className="mt-3 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60">
                  {copy.cancelButton}
                </UnifiedButton>
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold text-foreground"><CreditCard size={16} />{copy.refundStatus}</h2>
              <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>{copy.orderRefundStatus}: {getOrderRefundStatusLabel(detail.refund_summary?.order_refund_status || detail.refund_summary?.order_payment_status, locale)}</span>
                  {Number(detail.refund_summary?.refund_amount || detail.refund_amount || 0) > 0 ? (
                    <span>{copy.currentRefund}: RM {Number(detail.refund_summary?.refund_amount || detail.refund_amount || 0).toFixed(2)}</span>
                  ) : null}
                  {Number(detail.refund_summary?.order_refunded_amount || 0) > 0 ? (
                    <span>{copy.orderRefunded}: RM {Number(detail.refund_summary?.order_refunded_amount || 0).toFixed(2)}</span>
                  ) : null}
                </div>
              </div>
              {detail.refund_records?.length ? (
                <div className="mt-3 space-y-2">
                  {detail.refund_records.map((record) => (
                    <div key={record.id} className="rounded-xl border border-border bg-background/60 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{getRefundRecordStatusLabel(record, locale)}</p>
                        <p className="text-muted-foreground">{formatDateTime(record.created_at)}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                        {getRefundRecordAmountText(record) ? <span>{getRefundRecordAmountText(record)}</span> : null}
                        {record.provider ? <span>{record.provider}</span> : null}
                        {record.refund_reference ? <span>{record.refund_reference}</span> : null}
                      </div>
                      {record.error_message ? <p className="mt-1 text-destructive">{record.error_message}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  {copy.noRefundRecords}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">{copy.applicationInfo}</h2>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>{copy.reason}: {detail.reason || "-"}</p>
                {detail.description ? <p className="whitespace-pre-wrap">{copy.description}: {detail.description}</p> : null}
                {detail.admin_remark ? <p className="whitespace-pre-wrap">{copy.merchantNote}: {detail.admin_remark}</p> : null}
              </div>
              {detail.images?.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {detail.images.map((url) => (
                    <StableImage
                      key={url}
                      src={url}
                      alt={copy.evidenceAlt}
                      className="aspect-square w-full rounded-lg"
                      imgClassName="object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </section>

            {detail.shipments?.length ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">{copy.returnShipments}</h2>
                <div className="mt-3 space-y-2">
                  {detail.shipments.map((item) => (
                    <div key={item.id} className="rounded-xl bg-secondary/60 p-3 text-xs">
                      <p className="font-medium text-foreground">{item.carrier} {item.tracking_no}</p>
                      {item.note ? <p className="mt-1 text-muted-foreground">{item.note}</p> : null}
                      <p className="mt-1 text-muted-foreground">{formatDateTime(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {detail.shipments?.length || detail.logistics_tracks?.length ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><Truck size={16} />{copy.logisticsTracks}</h2>
                {detail.logistics_tracks?.length ? (
                  <div className="mt-3 space-y-3">
                    {detail.logistics_tracks.map((track, index) => (
                      <div key={track.id} className="grid grid-cols-[22px_1fr] gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <Circle className={index === 0 ? "fill-[var(--theme-primary)] text-[var(--theme-primary)]" : "text-muted-foreground"} size={14} />
                          {index < (detail.logistics_tracks?.length || 0) - 1 ? <span className="mt-1 h-full w-px min-h-8 bg-border" /> : null}
                        </div>
                        <div className="min-w-0 rounded-xl bg-background/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">{getLogisticsTrackTitle(track, locale)}</p>
                            <p className="text-muted-foreground">{track.event_time ? formatDateTime(track.event_time) : "-"}</p>
                          </div>
                          <p className="mt-1 break-words text-muted-foreground">{track.description || track.location || "-"}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {[track.carrier, track.tracking_no, track.source].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                    {copy.noCarrierTracks}
                  </p>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </StoreAccountLayout>
  );
}
