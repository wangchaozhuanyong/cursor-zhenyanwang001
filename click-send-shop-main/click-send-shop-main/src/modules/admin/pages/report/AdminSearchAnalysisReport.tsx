import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { AdminFilterButton, AdminFilterInput, AdminFilterSelect } from "@/components/admin/AdminFilterControls";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  createAdminSearchTerm,
  deleteAdminSearchTerm,
  fetchAdminSearchTerms,
  updateAdminSearchTerm,
  type AdminSearchTermQuery,
} from "@/services/admin/searchTermService";
import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchSearchAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import type { HotSearchTerm } from "@/types/search";

const PAGE_SIZE = 20;
const searchTermQueryKey = (params: AdminSearchTermQuery) => ["admin", "search-terms", params] as const;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function AdminSearchTermOpsPanel() {
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState<"" | "auto" | "manual">("");
  const [visibility, setVisibility] = useState<"" | "visible" | "hidden">("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);

  const params = useMemo<AdminSearchTermQuery>(() => ({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword.trim() || undefined,
    source: source || undefined,
    visibility: visibility || undefined,
  }), [keyword, page, source, visibility]);

  const termsQuery = useQuery({
    queryKey: searchTermQueryKey(params),
    queryFn: () => fetchAdminSearchTerms(params),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "search-terms"] });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminSearchTerm({
      keyword: newKeyword.trim(),
      result_count: 1,
      is_pinned: true,
      is_hidden: false,
      sort_order: newSortOrder,
    }),
    onSuccess: () => {
      toast.success("热门搜索词已保存");
      setNewKeyword("");
      setNewSortOrder(0);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "保存失败"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<HotSearchTerm> }) => updateAdminSearchTerm(id, {
      keyword: patch.keyword,
      is_pinned: patch.is_pinned,
      is_hidden: patch.is_hidden,
      sort_order: patch.sort_order,
      remark: patch.remark,
    }),
    onSuccess: () => {
      toast.success("已更新");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "更新失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminSearchTerm(id),
    onSuccess: () => {
      toast.success("已删除");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "删除失败"),
  });

  const data = termsQuery.data;
  const rows = data?.list || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleCreate = () => {
    if (!newKeyword.trim()) {
      toast.warning("请输入关键词");
      return;
    }
    createMutation.mutate();
  };

  const handleDelete = (term: HotSearchTerm) => {
    if (!term.id) return;
    confirm({
      title: "删除热门搜索词",
      description: `确定删除「${term.keyword}」吗？删除后该词会从热门搜索统计中移除。`,
      confirmText: "删除",
      danger: true,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(term.id as string);
      },
    });
  };

  return (
    <section className="theme-rounded border border-border bg-card p-4 theme-shadow">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground"><Tx>热门搜索运营</Tx></h2>
          <p className="mt-1 text-xs text-muted-foreground"><Tx>人工置顶词会优先展示；隐藏词不会出现在前台热门搜索和联想词。</Tx></p>
        </div>
        <AdminFilterButton variant="card" onClick={() => void termsQuery.refetch()} disabled={termsQuery.isFetching}>
          {termsQuery.isFetching ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
          <Tx>刷新</Tx>
        </AdminFilterButton>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
        <AdminFilterInput
          variant="card"
          value={keyword}
          onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
          placeholder="搜索关键词"
        />
        <AdminFilterSelect variant="card" value={source} onChange={(event) => { setSource(event.target.value as typeof source); setPage(1); }}>
          <option value="">全部来源</option>
          <option value="manual">人工配置</option>
          <option value="auto">自动统计</option>
        </AdminFilterSelect>
        <AdminFilterSelect variant="card" value={visibility} onChange={(event) => { setVisibility(event.target.value as typeof visibility); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="visible">前台可见</option>
          <option value="hidden">已隐藏</option>
        </AdminFilterSelect>
        <AdminFilterButton variant="card" onClick={() => { setKeyword(""); setSource(""); setVisibility(""); setPage(1); }}>
          <Tx>清空</Tx>
        </AdminFilterButton>
      </div>

      <PermissionGate permission="settings.manage">
        <div className="mb-4 grid gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
          <AdminFilterInput
            variant="card"
            value={newKeyword}
            onChange={(event) => setNewKeyword(event.target.value)}
            placeholder="新增人工热门词"
          />
          <AdminFilterInput
            variant="card"
            type="number"
            min={0}
            value={newSortOrder}
            onChange={(event) => setNewSortOrder(Number(event.target.value) || 0)}
            aria-label="排序"
          />
          <AdminFilterButton variant="card" disabled={createMutation.isPending} onClick={handleCreate}>
            {createMutation.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
            <Tx>新增置顶</Tx>
          </AdminFilterButton>
        </div>
      </PermissionGate>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">关键词</th>
              <th className="px-3 py-2">来源</th>
              <th className="px-3 py-2 text-right">搜索次数</th>
              <th className="px-3 py-2 text-right">结果数</th>
              <th className="px-3 py-2 text-right">排序</th>
              <th className="px-3 py-2">最近搜索</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {termsQuery.isLoading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">加载中...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">暂无热门搜索词</td></tr>
            ) : rows.map((term) => (
              <tr key={term.id || term.keyword} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-muted-foreground" />
                    <span>{term.keyword}</span>
                    {term.is_pinned ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">置顶</span> : null}
                    {term.is_hidden ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">隐藏</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{term.source === "manual" ? "人工" : "自动"}</td>
                <td className="px-3 py-2 text-right">{term.search_count}</td>
                <td className="px-3 py-2 text-right">{term.result_count}</td>
                <td className="px-3 py-2 text-right">{term.sort_order || 0}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(term.last_searched_at)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <PermissionGate permission="settings.manage">
                      <UnifiedButton
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
                        onClick={() => term.id && updateMutation.mutate({ id: term.id, patch: { is_pinned: !term.is_pinned } })}
                      >
                        {term.is_pinned ? "取消置顶" : "置顶"}
                      </UnifiedButton>
                      <UnifiedButton
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
                        onClick={() => term.id && updateMutation.mutate({ id: term.id, patch: { is_hidden: !term.is_hidden } })}
                      >
                        {term.is_hidden ? "显示" : "隐藏"}
                      </UnifiedButton>
                      <UnifiedButton
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
                        onClick={() => {
                          if (!term.id) return;
                          const next = window.prompt("排序数字越小越靠前", String(term.sort_order || 0));
                          if (next === null) return;
                          updateMutation.mutate({ id: term.id, patch: { sort_order: Number(next) || 0 } });
                        }}
                      >
                        排序
                      </UnifiedButton>
                      <UnifiedButton
                        className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(term)}
                      >
                        <Trash2 size={12} className="mr-1" />
                        删除
                      </UnifiedButton>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <AdminFilterButton variant="card" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</AdminFilterButton>
          <span>{page} / {totalPages}</span>
          <AdminFilterButton variant="card" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>下一页</AdminFilterButton>
        </div>
      </div>
    </section>
  );
}

export default function AdminSearchAnalysisReport() {
  return (
    <div className="space-y-4">
      <AdminSearchTermOpsPanel />
      <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.search_analysis} fetcher={fetchSearchAnalysisReport as never} />
    </div>
  );
}
