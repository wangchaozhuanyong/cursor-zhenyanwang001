import type { ReactNode } from "react";
import { X, Star, Package, ShoppingBag } from "lucide-react";
import type { ReviewDetailPayload, ComplaintStatus } from "@/services/admin/reviewService";
import { Tx } from "@/components/admin/AdminText";

const COMPLAINT_LABELS: Record<ComplaintStatus, string> = {
  none: "—",
  pending: "未处理",
  in_progress: "处理中",
  contacted: "已联系",
  resolved: "已解决",
  dismissed: "无需处理",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待审核",
  normal: "正常",
  hidden: "已隐藏",
  rejected: "已拒绝",
  deleted: "已删除",
};

type Props = {
  detail: ReviewDetailPayload | null;
  loading: boolean;
  onClose: () => void;
  previewImage: (url: string) => void;
};

export default function AdminReviewDetailDialog({ detail, loading, onClose, previewImage }: Props) {
  if (!detail && !loading) return null;
  const r = detail?.review;

  return (
    <motionOverlay onClose={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-bold text-foreground"><Tx>评论详情</Tx></h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground"><Tx>加载中…</Tx></div>
        ) : r ? (
          <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
            <section className="flex gap-3">
              {r.avatar ? (
                <img src={r.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full btn-theme-price text-sm font-bold text-primary-foreground">
                  {(r.nickname || "?")[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{r.nickname || "匿名"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StarRow rating={r.rating} />
                  <span className="text-xs text-muted-foreground">{STATUS_LABELS[r.status] || r.status}</span>
                  {r.is_verified_purchase && (
                    <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] text-green-600">已购评价</span>
                  )}
                  {r.is_featured && (
                    <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] text-theme-price">精选</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {r.created_at ? new Date(r.created_at).toLocaleString("zh-CN") : ""}
                </p>
              </div>
            </section>

            <section>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{r.content}</p>
              {r.images?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => previewImage(img)}
                      className="overflow-hidden rounded-lg ring-1 ring-border"
                    >
                      <img src={img} alt="" className="h-24 w-24 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={Package}
                title="商品"
                value={r.product_name || "—"}
                extra={r.product_cover ? <img src={r.product_cover} alt="" className="mt-2 h-14 w-14 rounded object-cover" /> : null}
              />
              <InfoCard
                icon={ShoppingBag}
                title="订单"
                value={r.order_no || r.order_id || "—"}
                extra={r.sku_text ? <p className="mt-1 text-xs text-muted-foreground">SKU: {r.sku_text}</p> : null}
              />
            </section>

            <section className="rounded-xl bg-secondary/50 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground"><Tx>点赞数</Tx></p>
              <p className="mt-0.5 font-semibold text-foreground">{r.likes_count ?? 0}</p>
            </section>

            {r.admin_reply?.trim() ? (
              <section className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                <p className="text-xs font-semibold text-theme-price"><Tx>官方回复</Tx></p>
                <p className="mt-1 text-sm text-foreground">{r.admin_reply}</p>
                {r.admin_reply_at && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(r.admin_reply_at).toLocaleString("zh-CN")}
                  </p>
                )}
              </section>
            ) : null}

            {(r.rating <= 2 || (r.complaint_status && r.complaint_status !== "none")) && (
              <section className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground"><Tx>差评处理</Tx></p>
                <p className="mt-1 text-sm text-foreground">{COMPLAINT_LABELS[r.complaint_status || "none"]}</p>
                {r.complaint_note && (
                  <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{r.complaint_note}</p>
                )}
              </section>
            )}

            {detail?.audit_logs && detail.audit_logs.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-semibold text-muted-foreground"><Tx>操作日志</Tx></p>
                <ul className="space-y-2">
                  {detail.audit_logs.map((log) => (
                    <li key={log.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-foreground">{log.summary || log.action_type}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {log.created_at ? new Date(log.created_at).toLocaleString("zh-CN") : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{log.operator_name || log.operator_id}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : null}
      </div>
    </motionOverlay>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  extra,
}: {
  icon: typeof Package;
  title: string;
  value: string;
  extra?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={14} />
        <Tx>{title}</Tx>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      {extra}
    </div>
  );
}

function motionOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      {children}
    </div>
  );
}
