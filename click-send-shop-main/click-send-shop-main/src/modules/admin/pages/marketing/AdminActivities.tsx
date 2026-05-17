import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, Eye, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SearchBar from "@/components/SearchBar";
import * as activityService from "@/services/admin/activityService";
import type { ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatAdminDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import { THEME_OUTLINE_DANGER } from "@/utils/themeVisuals";
import { labelDisplayPositions } from "@/constants/marketingDisplayPositions";
import { labelActivityType } from "@/utils/adminDisplayLabels";
import { AnimatedConfirmDialog, AnimatedTable } from "@/modules/micro-interactions";

const TABS: Array<{ key: "" | ActivityStatus; label: string }> = [
  { key: "", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "scheduled", label: "未开始" },
  { key: "ended", label: "已结束" },
  { key: "disabled", label: "已禁用" },
];

export default function AdminActivities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<MarketingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<ActivityType | "">("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async (next = page) => {
    setLoading(true);
    try {
      const data = await activityService.fetchActivities({ page: next, pageSize, keyword: keyword || undefined, type: type || undefined, status: status || undefined });
      setActivities(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载活动失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); }, [status, type, pageSize]);

  const quickButtons = useMemo(() => [
    { label: "秒杀", to: "/admin/marketing/activities/new?type=flash_sale" },
    { label: "满减", to: "/admin/marketing/activities/new?type=full_reduction" },
    { label: "优惠券", to: "/admin/marketing/coupons/new" },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><CalendarClock className="h-5 w-5 text-[var(--theme-price)]" /><Tx>活动管理 / 营销活动</Tx></h1>
          <p className="text-xs text-muted-foreground"><Tx>活动列表与运营动作入口。</Tx></p>
        </div>
        <PermissionGate permission="activity.manage">
          <button type="button" onClick={() => navigate("/admin/marketing/activities/new")} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><PlusCircle className="mr-1 inline h-4 w-4" /><Tx>新建活动</Tx></button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap gap-2">{quickButtons.map((b) => <button key={b.label} onClick={() => navigate(b.to)} className="rounded-lg border border-border px-3 py-1.5 text-sm">{b.label}</button>)}</div>

      <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t.label} onClick={() => { setStatus(t.key); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-sm ${status === t.key ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground"}`}>{t.label}</button>)}</div>

      <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
        <SearchBar placeholder="搜索活动名称" value={keyword} onChange={setKeyword} />
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType | "")} className="rounded-lg bg-secondary px-3 py-2 text-sm"><option value=""><Tx>全部类型</Tx></option><option value="flash_sale"><Tx>限时秒杀</Tx></option><option value="full_reduction"><Tx>满减活动</Tx></option></select>
        <button onClick={() => { setPage(1); void load(1); }} className="rounded-lg border border-border px-4 py-2 text-sm"><Tx>查询</Tx></button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AnimatedTable
          loading={loading}
          rows={activities}
          rowKey={(a) => a.id}
          skeletonRows={6}
          skeletonCols={8}
          className="overflow-x-auto"
          tableClassName="w-full min-w-[1120px] text-sm"
          theadClassName="text-xs text-muted-foreground"
          thead={(
            <tr>
              <th className="px-4 py-3 text-left"><Tx>活动名称</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>活动类型</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>活动状态</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>活动时间</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>商品/库存/销量</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>参与数据</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>展示位置</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>操作</Tx></th>
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={(p) => { setPage(p); void load(p); }} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
          emptyIcon={CalendarClock}
          emptyTitle="暂无活动"
          renderRow={(a) => (
            <>
              <td className="px-4 py-3"><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground line-clamp-1">{a.description || "-"}</p></td>
              <td className="px-4 py-3">{labelActivityType(a.type)}</td>
              <td className="px-4 py-3 text-xs">{a.status_label}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatAdminDateTime(a.start_at)}
                <br />
                {formatAdminDateTime(a.end_at)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">商品 {a.product_count || 0}<br />库存 {a.activity_stock_total || 0} / 已售 {a.sold_count_total || 0}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground"><Tx>参与数据预留</Tx></td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">{labelDisplayPositions(a.display_positions)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button type="button" onClick={() => navigate(`/admin/marketing/activities/${a.id}/edit`)} className="rounded border border-border px-2 py-1"><Tx>编辑</Tx></button>
                  <button type="button" onClick={() => navigate(`/admin/marketing/activities/new?copy_from=${a.id}`)} className="rounded border border-border px-2 py-1"><Copy className="mr-1 inline h-3 w-3" /><Tx>复制</Tx></button>
                  <button type="button" className="rounded border border-border px-2 py-1"><Eye className="mr-1 inline h-3 w-3" /><Tx>预览</Tx></button>
                  <button type="button" className="rounded border border-border px-2 py-1"><Tx>查看数据</Tx></button>
                  <button type="button" onClick={async () => { await activityService.setActivityDisabled(a.id, a.status !== "disabled"); await load(page); }} className="rounded border border-border px-2 py-1">{a.status === "disabled" ? "启用" : "禁用"}</button>
                  <button type="button" onClick={() => setDeleteId(a.id)} className={`rounded border px-2 py-1 ${THEME_OUTLINE_DANGER}`}><Trash2 className="mr-1 inline h-3 w-3" /><Tx>删除</Tx></button>
                </div>
              </td>
            </>
          )}
        />
      </div>

      <AnimatedConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        danger
        title="删除活动"
        description="活动已有参与数据时删除将影响统计，确认删除？"
        confirmText="删除"
        onConfirm={async () => {
          if (!deleteId) return;
          await activityService.deleteActivity(deleteId);
          toast.success("已删除");
          setDeleteId(null);
          await load(page);
        }}
      />
    </div>
  );
}
