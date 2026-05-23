import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  createOperatingExpense,
  exportReportCsv,
  fetchOperatingExpenses,
  removeOperatingExpense,
  updateOperatingExpense,
  type OperatingExpenseRecord,
} from "@/services/admin/reportService";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { adminConfirmDelete } from "@/modules/admin/context/AdminConfirmContext";
import { formatDateTime } from "@/utils/formatDateTime";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import ReportPageHeader from "@/components/admin/report/ReportPageHeader";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

type FormState = {
  expense_date: string;
  category: string;
  amount: string;
  title: string;
  remark: string;
};

const CATEGORY_OPTIONS = [
  { value: "shipping_extra", label: "额外物流成本" },
  { value: "packing", label: "包材" },
  { value: "ads", label: "广告" },
  { value: "salary", label: "人工" },
  { value: "rent", label: "房租" },
  { value: "platform_fee", label: "平台费" },
  { value: "other", label: "其他" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return { expense_date: today(), category: "other", amount: "", title: "", remark: "" };
}

export default function AdminOperatingExpenses() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const queryParams = useMemo(
    () => ({
      range_preset: "last_30_days",
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      category: category || undefined,
    }),
    [category, dateFrom, dateTo],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.operatingExpenses(queryParams),
    queryFn: async () => {
      const data = await fetchOperatingExpenses(queryParams);
      return Array.isArray(data?.list) ? data.list : [];
    },
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const list = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const loading = listQuery.isLoading && !listQuery.data;

  const invalidateExpenses = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "reports", "operating-expenses"] });

  const totalAmount = useMemo(
    () => list.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [list],
  );
  const config = REPORT_REGISTRY_BY_KEY.operating_expenses;

  function startEdit(row: OperatingExpenseRecord) {
    setEditingId(row.id);
    setForm({
      expense_date: row.expense_date || today(),
      category: row.category || "other",
      amount: String(row.amount ?? ""),
      title: row.title || "",
      remark: row.remark || "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit() {
    const amount = Number(form.amount);
    if (!form.expense_date) return toast.error(tText("请选择日期"));
    if (!Number.isFinite(amount) || amount < 0) return toast.error(tText("金额必须大于等于 0"));
    if (!form.title.trim()) return toast.error(tText("请填写支出标题"));
    setSaving(true);
    try {
      const payload = {
        expense_date: form.expense_date,
        category: form.category,
        amount: Number(amount.toFixed(2)),
        title: form.title.trim(),
        remark: form.remark.trim(),
      };
      if (editingId) {
        await updateOperatingExpense(editingId, payload);
        toast.success(tText("经营支出已更新"));
      } else {
        await createOperatingExpense(payload);
        toast.success(tText("经营支出已新增"));
      }
      resetForm();
      await invalidateExpenses();
    } catch (error) {
      toast.error(toastErrorMessage(error, editingId ? "更新经营支出失败" : "新增经营支出失败"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    await adminConfirmDelete(confirm, title, async () => {
      try {
        await removeOperatingExpense(id);
        toast.success(tText("经营支出已删除"));
        await invalidateExpenses();
      } catch (error) {
        toast.error(toastErrorMessage(error, "删除经营支出失败"));
      }
    });
  }

  async function handleExport() {
    if (!config.exportType) return;
    setExporting(true);
    try {
      await exportReportCsv(config.exportType, queryParams);
      toast.success(tText("报表导出已开始下载"));
    } catch (error) {
      toast.error(toastErrorMessage(error, "导出经营支出失败"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ReportPageHeader
        title={config.title}
        description={config.description}
        exporting={exporting}
        onExport={handleExport}
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground"><Tx>经营支出录入</Tx></h2>
        <p className="mt-1 text-xs text-muted-foreground"><Tx>用于利润日报中的经营支出汇总（广告、包材、人工、房租等）。</Tx></p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <SegmentedDateInput label={tText("支出日期")} value={form.expense_date} onChange={(v) => setForm((s) => ({ ...s, expense_date: v }))} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground"><Tx>分类</Tx></label>
            <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {CATEGORY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground"><Tx>金额 (RM)</Tx></label>
            <input value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} placeholder="0.00" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground"><Tx>标题</Tx></label>
            <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder={tText("例如：5月 Facebook 广告费")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground"><Tx>备注</Tx></label>
            <input value={form.remark} onChange={(e) => setForm((s) => ({ ...s, remark: e.target.value }))} placeholder={tText("可选")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button disabled={saving} onClick={() => void handleSubmit()} className="inline-flex items-center gap-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {editingId ? "保存修改" : "新增支出"}
          </button>
          {editingId ? (
            <button onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm"><Tx>取消编辑</Tx></button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedDateInput label={tText("开始日期")} value={dateFrom} onChange={setDateFrom} />
          <SegmentedDateInput label={tText("结束日期")} value={dateTo} onChange={setDateTo} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground"><Tx>分类筛选</Tx></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value=""><Tx>全部</Tx></option>
              {CATEGORY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground"><Tx>合计：</Tx><span className="font-semibold text-foreground">RM {totalAmount.toFixed(2)}</span></div>
        </div>

        <AdminNativeTable className="mt-4" tableClassName="min-w-[860px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>日期</Tx></th>
                <th className={adminThClassName()}><Tx>分类</Tx></th>
                <th className={adminThClassName()}><Tx>标题</Tx></th>
                <th className={adminThClassName()}><Tx>备注</Tx></th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>金额</Tx></th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>创建时间</Tx></th>
                <th className={adminThClassName("text-right")}><Tx>操作</Tx></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /><Tx>加载中...</Tx></span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground"><Tx>暂无经营支出记录</Tx></td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-b-0">
                    <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{row.expense_date}</td>
                    <td className={adminTdClassName()}>{CATEGORY_OPTIONS.find((x) => x.value === row.category)?.label || row.category}</td>
                    <td className={adminTdClassName()}>{row.title}</td>
                    <td className={adminTdClassName()}>{row.remark || "-"}</td>
                    <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-medium`)}>RM {Number(row.amount || 0).toFixed(2)}</td>
                    <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{formatDateTime(row.created_at)}</td>
                    <td className={adminTdClassName("text-right")}>
                      <div className="inline-flex gap-1">
                        <button onClick={() => startEdit(row)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => void handleDelete(row.id, row.title || row.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </AdminNativeTable>
      </div>

      <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text-muted)]">
        <span className="font-medium text-[var(--theme-text)]"><Tx>数据口径：</Tx></span>{config.dataScopeNote}
      </section>
    </div>
  );
}
