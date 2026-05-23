import { formatDateTime } from "@/utils/formatDateTime";
import { Star } from "lucide-react";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import type { ReviewDetailPayload } from "@/services/admin/reviewService";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  detail: ReviewDetailPayload | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewImage: (url: string) => void;
};

export default function AdminReviewDetailDialog({
  detail,
  loading,
  open,
  onOpenChange,
  previewImage,
}: Props) {
  const { tText } = useAdminT();
  const r = detail?.review;

  return (
    <AdminResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={tText("评论详情")}
      size="lg"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground"><Tx>加载中...</Tx></p>
      ) : !r ? (
        <p className="text-sm text-muted-foreground"><Tx>暂无数据</Tx></p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{r.nickname || "匿名用户"}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
                />
              ))}
            </div>
            <span className="text-muted-foreground">{formatDateTime(r.created_at)}</span>
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="whitespace-pre-wrap text-foreground">{r.content || "无内容"}</p>
          </div>

          {r.images?.length ? (
            <div className="flex flex-wrap gap-2">
              {r.images.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => previewImage(url)}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  <img src={url} alt="" className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <dl className="grid gap-2 sm:grid-cols-2">
            <Info label={tText("商品")} value={r.product_name || r.product_id} />
            <Info label={tText("状态")} value={r.status} />
            <Info label={tText("订单号")} value={r.order_no || "-"} />
            <Info label="SKU" value={r.sku_text || "-"} />
            <Info label={tText("已购验证")} value={r.is_verified_purchase ? "是" : "否"} />
            <Info label={tText("精选")} value={r.is_featured ? "是" : "否"} />
          </dl>

          {r.admin_reply ? (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground"><Tx>官方回复</Tx></p>
              <p className="whitespace-pre-wrap">{r.admin_reply}</p>
              {r.admin_reply_at ? (
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.admin_reply_at)}</p>
              ) : null}
            </div>
          ) : null}

          {detail?.audit_logs?.length ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground"><Tx>操作记录</Tx></p>
              <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                {detail.audit_logs.map((log) => (
                  <li key={log.id} className="rounded border border-border px-2 py-1.5">
                    <span className="font-medium">{log.summary || log.action_type}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {log.operator_name || "系统"} · {formatDateTime(log.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </AdminResponsiveSheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
