import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Circle, CreditCard, ImagePlus, Loader2, PackageCheck, RotateCcw, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
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

const ORDER_REFUND_STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  paid: "未退款",
  partially_refunded: "部分退款",
  refunded: "已退款",
  refunding: "退款中",
};

function getOrderRefundStatusLabel(status?: string) {
  return ORDER_REFUND_STATUS_LABELS[status || ""] || status || "暂无退款";
}

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/returns");
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
      toast.error(error instanceof Error ? error.message : "售后详情加载失败");
      navigate("/returns", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    if (evidenceImages.length + files.length > 6) {
      toast.error("最多上传 6 张凭证图片");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadService.uploadFiles(files, { mode: "image" });
      setEvidenceImages((prev) => [...prev, ...uploaded.map((item) => item.url)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片上传失败");
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
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEvidence = () => {
    if (!id) return;
    if (!evidenceText.trim() && evidenceImages.length === 0) {
      toast.error("请填写说明或上传凭证图片");
      return;
    }
    void runAction(
      () => returnService.supplementEvidence(id, {
        description: evidenceText.trim(),
        images: evidenceImages,
        proof_images: evidenceImages,
      }),
      "凭证已提交",
    );
  };

  const submitLogistics = () => {
    if (!id) return;
    if (!carrier.trim() || !trackingNo.trim()) {
      toast.error("请填写快递公司和物流单号");
      return;
    }
    void runAction(
      () => returnService.submitLogistics(id, {
        carrier: carrier.trim(),
        tracking_no: trackingNo.trim(),
        contact_phone: contactPhone.trim(),
        note: logisticsNote.trim(),
      }),
      "退货物流已提交",
    );
  };

  const cancelReturn = () => {
    if (!id) return;
    if (!window.confirm("确定取消这次售后申请吗？")) return;
    void runAction(() => returnService.cancelReturn(id), "售后申请已取消");
  };

  const confirmCompleted = () => {
    if (!id) return;
    void runAction(() => returnService.confirmCompleted(id), "售后已确认完成");
  };

  const action = detail ? getBuyerReturnAction(detail) : null;
  const timeline = detail ? buildReturnTimeline(detail) : [];
  const image = detail ? getReturnItemImage(detail) : "";

  return (
    <StoreAccountLayout title="售后详情" onBack={goBack} backFallback="/returns" desktopBackLabel="返回售后进度" mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full max-w-3xl space-y-4 text-sm">
        {loading ? <p className="rounded-xl border border-border bg-card p-4 text-muted-foreground">加载中...</p> : null}
        {detail ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {image ? (
                    <ProductCoverImage
                      url={image}
                      alt={getReturnItemName(detail)}
                      className="h-full w-full"
                      imgClassName="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-base font-semibold text-foreground">{getReturnItemName(detail)}</h1>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${getReturnStatusBadgeClass(detail.status)}`}>
                      {getReturnStatusLabel(detail.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getReturnTypeLabel(detail.type)} · 订单 {detail.order_no}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    申请数量 {detail.quantity || detail.item_info?.request_qty || 1}
                    {detail.refund_amount != null && Number(detail.refund_amount) > 0 ? ` · 退款 RM ${Number(detail.refund_amount).toFixed(2)}` : ""}
                  </p>
                </div>
              </div>
              {action ? (
                <div className="mt-4 rounded-xl bg-[var(--theme-primary)]/10 p-3">
                  <p className="font-medium text-[var(--theme-primary)]">下一步：{action.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">售后进度</h2>
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
                <h2 className="font-semibold text-foreground">补充凭证</h2>
                <textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  rows={4}
                  placeholder="请补充商品问题、包装情况、沟通过程等说明"
                  className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
                <div className="mt-3 flex items-center justify-between">
                  <UnifiedButton type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-60">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    上传图片
                  </UnifiedButton>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void uploadImages(Array.from(e.target.files || [])); e.currentTarget.value = ""; }} />
                  <UnifiedButton type="button" onClick={submitEvidence} disabled={submitting || uploading} className="rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
                    提交凭证
                  </UnifiedButton>
                </div>
                {evidenceImages.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {evidenceImages.map((url) => (
                      <div key={url} className="relative overflow-hidden rounded-lg border border-border">
                        <StableImage
                          src={url}
                          alt="售后补充凭证"
                          className="aspect-square w-full"
                          imgClassName="object-cover"
                        />
                        <UnifiedButton type="button" aria-label="删除图片" onClick={() => setEvidenceImages((prev) => prev.filter((item) => item !== url))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
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
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><Truck size={16} />填写退货物流</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="快递公司" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                  <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="物流单号" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="联系电话" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                  <input value={logisticsNote} onChange={(e) => setLogisticsNote(e.target.value)} placeholder="备注，可不填" className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]" />
                </div>
                <UnifiedButton type="button" onClick={submitLogistics} disabled={submitting} className="mt-3 w-full rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
                  提交退货物流
                </UnifiedButton>
              </section>
            ) : null}

            {action?.key === "confirm" ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><PackageCheck size={16} />确认完成</h2>
                <p className="mt-2 text-xs text-muted-foreground">确认收到换货商品，或确认退款无误后，可以结束本次售后。</p>
                <UnifiedButton type="button" onClick={confirmCompleted} disabled={submitting} className="mt-3 w-full rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
                  确认售后完成
                </UnifiedButton>
              </section>
            ) : null}

            {action?.key === "cancel" ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><RotateCcw size={16} />取消申请</h2>
                <p className="mt-2 text-xs text-muted-foreground">如果不需要继续售后，可以取消申请。若商品已经寄出，请先联系客服确认。</p>
                <UnifiedButton type="button" onClick={cancelReturn} disabled={submitting} className="mt-3 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60">
                  取消售后申请
                </UnifiedButton>
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold text-foreground"><CreditCard size={16} />退款状态</h2>
              <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>订单退款状态：{getOrderRefundStatusLabel(detail.refund_summary?.order_refund_status || detail.refund_summary?.order_payment_status)}</span>
                  {Number(detail.refund_summary?.refund_amount || detail.refund_amount || 0) > 0 ? (
                    <span>本次退款：RM {Number(detail.refund_summary?.refund_amount || detail.refund_amount || 0).toFixed(2)}</span>
                  ) : null}
                  {Number(detail.refund_summary?.order_refunded_amount || 0) > 0 ? (
                    <span>订单累计已退：RM {Number(detail.refund_summary?.order_refunded_amount || 0).toFixed(2)}</span>
                  ) : null}
                </div>
              </div>
              {detail.refund_records?.length ? (
                <div className="mt-3 space-y-2">
                  {detail.refund_records.map((record) => (
                    <div key={record.id} className="rounded-xl border border-border bg-background/60 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{getRefundRecordStatusLabel(record)}</p>
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
                  暂无支付渠道退款记录，商家处理退款后这里会同步显示。
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">申请信息</h2>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>原因：{detail.reason || "-"}</p>
                {detail.description ? <p className="whitespace-pre-wrap">说明：{detail.description}</p> : null}
                {detail.admin_remark ? <p className="whitespace-pre-wrap">商家备注：{detail.admin_remark}</p> : null}
              </div>
              {detail.images?.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {detail.images.map((url) => (
                    <StableImage
                      key={url}
                      src={url}
                      alt="售后凭证"
                      className="aspect-square w-full rounded-lg"
                      imgClassName="object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </section>

            {detail.shipments?.length ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">退货包裹</h2>
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
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><Truck size={16} />退货物流轨迹</h2>
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
                            <p className="font-medium text-foreground">{getLogisticsTrackTitle(track)}</p>
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
                    已收到退货物流单号，暂无承运商轨迹。物流接口接通或商家刷新后会显示完整轨迹。
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
