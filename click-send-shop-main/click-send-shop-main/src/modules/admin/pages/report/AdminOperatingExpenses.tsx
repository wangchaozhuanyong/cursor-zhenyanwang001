import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  createOperatingExpense,
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
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

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
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
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
    if (!form.expense_date) return toast.error("请选择日期");
    if (!Number.isFinite(amount) || amount < 0) return toast.error("金额必须大于等于 0");
    if (!form.title.trim()) return toast.error("请填写支出标题");
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
        toast.success("经营支出已更新");
      } else {
        await createOperatingExpense(payload);
        toast.success("经营支出已新增");
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
        toast.success("经营支出已删除");
        await invalidateExpenses();
      } catch (error) {
        toast.error(toastErrorMessage(error, "删除经营支出失败"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">经营支出录入</h2>
        <p className="mt-1 text-xs text-muted-foreground">用于利润日报中的经营支出汇总（广告、包材、人工、房租等）。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <SegmentedDateInput label="支出日期" value={form.expense_date} onChange={(v) => setForm((s) => ({ ...s, expense_date: v }))} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">分类</label>
            <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {CATEGORY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">金额 (RM)</label>
            <input value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} placeholder="0.00" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">标题</label>
            <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="例如：5月 Facebook 广告费" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">备注</label>
            <input value={form.remark} onChange={(e) => setForm((s) => ({ ...s, remark: e.target.value }))} placeholder="可选" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button disabled={saving} onClick={() => void handleSubmit()} className="inline-flex items-center gap-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {editingId ? "保存修改" : "新增支出"}
          </button>
          {editingId ? (
            <button onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm">取消编辑</button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedDateInput label="开始日期" value={dateFrom} onChange={setDateFrom} />
          <SegmentedDateInput label="结束日期" value={dateTo} onChange={setDateTo} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">分类筛选</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">全部</option>
              {CATEGORY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">合计：<span className="font-semibold text-foreground">RM {totalAmount.toFixed(2)}</span></div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className={adminTableClassName("w-full min-w-[860px] text-left text-sm")}>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>日期</th>
                <th className={adminThClassName()}>分类</th>
                <th className={adminThClassName()}>标题</th>
                <th className={adminThClassName()}>备注</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>金额</th>
                <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>创建时间</th>
                <th className={adminThClassName("text-right")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />加载中...</span>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">暂无经营支出记录</td>
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
          </table>
        </div>
      </div>
    </div>
  );
}
