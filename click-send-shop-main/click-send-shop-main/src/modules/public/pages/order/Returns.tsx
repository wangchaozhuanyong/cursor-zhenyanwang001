import { useState, useEffect } from "react";
import { ArrowLeft, Package, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useOrderStore } from "@/stores/useOrderStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import * as returnService from "@/services/returnService";
import type { ReturnRequest, ReturnStatus } from "@/types/return";
import { ORDER_STATUS, RETURN_STATUS, RETURN_STATUS_META } from "@/constants/statusDictionary";

const statusConfig: Record<ReturnStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: RETURN_STATUS_META.pending.label, color: "text-yellow-500 bg-yellow-500/10", icon: Clock },
  approved: { label: RETURN_STATUS_META.approved.label, color: "text-blue-500 bg-blue-500/10", icon: CheckCircle2 },
  processing: { label: RETURN_STATUS_META.processing.label, color: "text-gold bg-gold/10", icon: Package },
  completed: { label: RETURN_STATUS_META.completed.label, color: "text-green-500 bg-green-500/10", icon: CheckCircle2 },
  rejected: { label: RETURN_STATUS_META.rejected.label, color: "text-destructive bg-destructive/10", icon: AlertCircle },
};

const steps = ["提交申请", "商家审核", "寄回商品", "退款完成"];

export default function Returns() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { orders, loadOrders } = useOrderStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [reason, setReason] = useState("");
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
    returnService.fetchReturnRequests().then((data) => {
      setReturns(data.list);
      setLoading(false);
    }).catch(() => {
      toast.error("加载退换货记录失败");
      setLoading(false);
    });
  }, [loadOrders]);

  const handleSubmit = async () => {
    if (!selectedOrder || !reason.trim()) {
      toast.error("请选择订单并填写原因");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const newReturn = await returnService.createReturn({
        order_id: selectedOrder,
        type: "refund",
        reason,
        description: reason,
      });
      setReturns((prev) => [newReturn, ...prev]);
      toast.success("退换货申请已提交");
      setShowForm(false);
      setSelectedOrder("");
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepIndex = (status: ReturnStatus) => {
    switch (status) {
      case RETURN_STATUS.PENDING: return 0;
      case RETURN_STATUS.APPROVED: return 1;
      case RETURN_STATUS.PROCESSING: return 2;
      case RETURN_STATUS.COMPLETED: return 3;
      case RETURN_STATUS.REJECTED: return -1;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-base font-semibold text-foreground">退换货</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-gold px-4 py-2 text-xs font-bold text-primary-foreground active:scale-95 transition-transform"
          >
            申请退换
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-4 rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">新建退换货申请</h3>

                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">选择订单</label>
                <select
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="mb-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground outline-none focus:ring-2 ring-gold"
                >
                  <option value="">请选择订单</option>
                  {orders.filter((o) => o.status === ORDER_STATUS.COMPLETED || o.status === ORDER_STATUS.SHIPPED).map((o) => (
                    <option key={o.id} value={o.id}>{o.order_no} - RM {o.total_amount}</option>
                  ))}
                </select>

                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">退换原因</label>
                <div className="mb-3 flex flex-wrap gap-2">
                  {["商品破损", "尺寸不对", "质量问题", "不想要了", "其他原因"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                        reason === r ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="详细描述问题..."
                  rows={2}
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground outline-none focus:ring-2 ring-gold placeholder:text-muted-foreground resize-none"
                />

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-4 w-full rounded-full bg-gold py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "提交中..." : "提交申请"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Returns list */}
        {loading ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Loader2 size={24} className="animate-spin mb-3" />
            <p className="text-sm">加载中…</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Package size={48} className="mb-3 opacity-30" />
            <p className="text-sm">暂无退换货记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((item, i) => {
              const config = statusConfig[item.status as ReturnStatus] ?? statusConfig.pending;
              const Icon = config.icon;
              const stepIdx = getStepIndex(item.status as ReturnStatus);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-muted-foreground">{item.order_no}</span>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${config.color}`}>
                      <Icon size={12} /> {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.reason}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>

                  {/* Progress steps */}
                  {item.status !== RETURN_STATUS.REJECTED && (
                    <div className="mt-4 flex items-center gap-1">
                      {steps.map((step, si) => (
                        <div key={step} className="flex flex-1 flex-col items-center">
                          <div className={`h-1.5 w-full rounded-full ${si <= stepIdx ? "bg-gold" : "bg-border"}`} />
                          <span className={`mt-1.5 text-[10px] ${si <= stepIdx ? "text-gold font-medium" : "text-muted-foreground"}`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-muted-foreground/60">申请时间: {new Date(item.created_at).toLocaleDateString("zh-CN")}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
