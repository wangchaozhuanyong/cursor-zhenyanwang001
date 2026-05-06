import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchUserById, adjustUserPoints } from "@/services/admin/userService";
import { fetchAdminPointsRecords } from "@/services/admin/pointsService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { PointsRecord } from "@/types/points";

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/users");
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [reason, setReason] = useState("");

  const loadUserPointsRecords = async (userId: string) => {
    setRecordsLoading(true);
    try {
      const data = await fetchAdminPointsRecords({ userId, page: 1, pageSize: 8 });
      setPointsRecords(data.list || []);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载积分流水失败"));
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchUserById(id), loadUserPointsRecords(id)])
      .then(([data]) => setUser(data))
      .catch((e) => toast.error(toastErrorMessage(e, "加载用户详情失败")))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdjustPoints = async () => {
    const pts = parseInt(pointsInput);
    if (!pts) { toast.error("请输入积分数"); return; }
    try {
      await adjustUserPoints(id!, pts, reason || "管理员调整");
      setUser((u: any) => u ? { ...u, points_balance: (u.points_balance || 0) + pts } : u);
      await loadUserPointsRecords(id!);
      toast.success(`积分已${pts > 0 ? "增加" : "扣减"} ${Math.abs(pts)}`);
      setPointsInput("");
      setReason("");
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>用户不存在</p>
        <button onClick={goBack} className="mt-4 text-[var(--theme-price)] underline">返回</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={goBack}>
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">用户详情</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">基本信息</h3>
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-price)] text-xl font-bold text-[var(--theme-price-foreground)]">
                {(user.nickname || user.phone || "U")[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{user.nickname || user.phone}</p>
              <p className="text-xs text-muted-foreground">ID: {user.id?.slice(0, 12)}</p>
            </div>
          </div>
          {[
            { label: "手机号", value: user.phone || "—" },
            { label: "WhatsApp", value: user.whatsapp || "—" },
            { label: "微信", value: user.wechat || "—" },
            { label: "邀请码", value: user.invite_code || "—" },
            { label: "上级邀请码", value: user.parent_invite_code || "—" },
            { label: "注册时间", value: user.created_at ? new Date(user.created_at).toLocaleString("zh-CN") : "—" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="text-foreground">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">积分管理</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">当前积分余额</span>
              <span className="text-lg font-bold text-[var(--theme-price)]">{user.points_balance ?? 0}</span>
            </div>
            <PermissionGate
              permission="user.points"
              fallback={<p className="text-xs text-muted-foreground">你仅有查看权限，无法调整积分。</p>}
            >
              <div className="space-y-2">
                <input
                  type="number"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="输入积分数（正数增加，负数扣减）"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="调整原因（可选）"
                  className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button type="button" onClick={handleAdjustPoints} className="w-full rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)]">
                  确认调整
                </button>
              </div>
            </PermissionGate>
          </div>
          <div className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">最近积分流水</h3>
              <button
                type="button"
                onClick={() => navigate(`/admin/points/records?userId=${user.id}`)}
                className="text-xs text-[var(--theme-price)] hover:underline"
              >
                查看全部
              </button>
            </div>
            {recordsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--theme-price)]" />
              </div>
            ) : pointsRecords.length === 0 ? (
              <div className="rounded-lg bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] p-4 text-center text-sm text-theme-muted">
                暂无积分流水
              </div>
            ) : (
              <div className="space-y-2">
                {pointsRecords.map((record) => {
                  const amount = Number(record.amount) || 0;
                  return (
                    <div key={record.id} className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{record.description || record.action}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {record.order_no ? `订单 ${record.order_no} · ` : ""}
                          {record.created_at ? new Date(record.created_at).toLocaleString("zh-CN") : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${amount >= 0 ? "text-[var(--theme-price)]" : "text-destructive"}`}>
                          {amount > 0 ? "+" : ""}{amount}
                        </p>
                        <p className="text-[11px] text-muted-foreground">余额 {record.balance_after ?? "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
