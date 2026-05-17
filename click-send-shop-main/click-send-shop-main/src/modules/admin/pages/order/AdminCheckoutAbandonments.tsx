import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import * as orderService from "@/services/admin/orderService";
import type { CheckoutAbandonment, CheckoutAbandonmentStatus } from "@/types/order";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelCheckoutPaymentMethod } from "@/utils/adminDisplayLabels";
import { Tx } from "@/components/admin/AdminText";

const STATUS_OPTIONS: Array<{ value: "" | CheckoutAbandonmentStatus; label: string }> = [
  { value: "", label: "未完成" },
  { value: "open", label: "仅进入结算" },
  { value: "ordered", label: "已下单未支付" },
  { value: "paid", label: "已支付" },
  { value: "closed", label: "已关闭" },
];

const STATUS_LABEL: Record<CheckoutAbandonmentStatus, string> = {
  open: "仅进入结算",
  ordered: "已下单未支付",
  paid: "已支付",
  closed: "已关闭",
};

const STATUS_BADGE: Record<CheckoutAbandonmentStatus, string> = {
  open: "bg-amber-500/10 text-amber-700",
  ordered: "bg-orange-500/10 text-orange-700",
  paid: "bg-emerald-500/10 text-emerald-700",
  closed: "bg-muted text-muted-foreground",
};

export default function AdminCheckoutAbandonments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CheckoutAbandonment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"" | CheckoutAbandonmentStatus>("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadData = async (next?: { page?: number; status?: "" | CheckoutAbandonmentStatus; keyword?: string; pageSize?: number }) => {
    setLoading(true);
    try {
      const data = await orderService.fetchCheckoutAbandonments({
        page: next?.page ?? page,
        pageSize: next?.pageSize ?? pageSize,
        status: next?.status ?? status,
        keyword: (next?.keyword ?? keyword).trim() || undefined,
      });
      setRows(data.list);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载未完成结算失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = (value: "" | CheckoutAbandonmentStatus) => {
    setStatus(value);
    setPage(1);
    void loadData({ page: 1, status: value });
  };

  const handleSearch = () => {
    setPage(1);
    void loadData({ page: 1 });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void loadData({ page: nextPage });
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    void loadData({ page: 1, pageSize: nextPageSize });
  };

  return (
    <div className="space-y-4">
      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
        <h1 className="text-lg font-semibold text-foreground"><Tx>未完成结算</Tx></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Tx>仅做站内记录和后台查看，不触发邮件、短信或自动外呼。</Tx></p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><Tx>
          同一用户、同一次停留在结算页的过程，只会维护</Tx><strong><Tx>一条</Tx></strong><Tx>「进行中」快照：内容随填写与勾选变化而更新；下单成功后该条变为「已下单未支付」，其余误入的「仅进入结算」空壳会自动关闭。
          若仍看到两条时间接近的旧数据，多为升级前产生的重复快照，可忽略或后续数据清理。
        </Tx></p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar placeholder="搜索订单号 / 联系人 / 手机号..." value={keyword} onChange={setKeyword} />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as "" | CheckoutAbandonmentStatus)}
          className="touch-manipulation min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-sm text-foreground outline-none"
        >
          {STATUS_OPTIONS.map((option) => <option key={option.value || "unfinished"} value={option.value}>{option.label}</option>)}
        </select>
        <button type="button" onClick={handleSearch} className="touch-manipulation min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2.5 text-sm text-foreground hover:opacity-90"><Tx>
          搜索
        </Tx></button>
      </div>

      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
              <div className="space-y-2">
                <div className="skeleton-base skeleton-shimmer h-4 w-24 rounded-full" />
                <div className="skeleton-base skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          ))
          : null}
        {!loading && rows.map((row) => (
          <div key={row.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
              <span className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString("zh-CN")}</span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{row.contact_name || "未填写联系人"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.contact_phone_masked || "未填写电话"} · {row.items_count} 件</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-[var(--theme-price)]">RM {row.total_amount.toFixed(2)}</p>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">{row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("，") || "无商品摘要"}</p>
            {row.order_id && (
              <button type="button" onClick={() => navigate(`/admin/orders/${row.order_id}`)} className="mt-3 text-xs text-[var(--theme-price)] hover:underline">
                查看订单 {row.order_no || ""}
              </button>
            )}
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无未完成结算</Tx></div>}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {["状态", "联系人", "商品摘要", "金额", "支付方式", "关联订单", "更新时间", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />}
          emptyIcon={ShoppingCart}
          emptyTitle="暂无未完成结算"
          renderRow={(row) => (
            <>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span></td>
              <td className="px-4 py-3 text-foreground">
                <div>{row.contact_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{row.contact_phone_masked || "—"}</div>
              </td>
              <td className="max-w-[320px] px-4 py-3 text-foreground">
                <div className="truncate">{row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("，") || "—"}</div>
                <div className="text-xs text-muted-foreground">{row.items_count} 件</div>
              </td>
              <td className="px-4 py-3 font-semibold text-foreground">RM {row.total_amount.toFixed(2)}</td>
              <td className="px-4 py-3 text-foreground">{labelCheckoutPaymentMethod(row.payment_method)}</td>
              <td className="px-4 py-3 font-mono text-xs text-foreground">{row.order_no || "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString("zh-CN")}</td>
              <td className="px-4 py-3">
                {row.order_id ? (
                  <button type="button" onClick={() => navigate(`/admin/orders/${row.order_id}`)} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>详情</Tx></button>
                ) : <span className="text-xs text-muted-foreground"><Tx>未下单</Tx></span>}
              </td>
            </>
          )}
        />
      </div>

    </div>
  );
}
