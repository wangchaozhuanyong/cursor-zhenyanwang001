import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, RefreshCw, Send, Settings2 } from "lucide-react";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import Pagination from "@/components/admin/Pagination";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { adminQueryKeys, type MyInvoisDocumentListParams } from "@/lib/adminQueryKeys";
import {
  createMyInvoisReconciliation,
  fetchMyInvoisDocuments,
  fetchMyInvoisStatus,
  processPendingMyInvois,
  retryMyInvoisDocument,
  saveMyInvoisConfig,
  submitMyInvoisDocument,
  type MyInvoisDocument,
  type MyInvoisProfile,
} from "@/services/admin/myinvoisService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";

type ConfigForm = {
  enabled: boolean;
  environment: "sandbox" | "live";
  supplier_tin: string;
  supplier_name: string;
  supplier_id_type: string;
  supplier_id_value: string;
  supplier_sst: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_address: string;
  client_id: string;
  client_secret_ref: string;
  certificate_ref: string;
  certificate_fingerprint: string;
  certificate_expires_at: string;
  signing_key_ref: string;
  config_json: string;
};

const EMPTY_FORM: ConfigForm = {
  enabled: false,
  environment: "sandbox",
  supplier_tin: "",
  supplier_name: "",
  supplier_id_type: "",
  supplier_id_value: "",
  supplier_sst: "",
  supplier_email: "",
  supplier_phone: "",
  supplier_address: "{}",
  client_id: "",
  client_secret_ref: "",
  certificate_ref: "",
  certificate_fingerprint: "",
  certificate_expires_at: "",
  signing_key_ref: "",
  config_json: "{}",
};

function profileToForm(profile: MyInvoisProfile | null | undefined): ConfigForm {
  if (!profile) return EMPTY_FORM;
  return {
    enabled: Boolean(profile.enabled),
    environment: profile.environment || "sandbox",
    supplier_tin: profile.supplier_tin || "",
    supplier_name: profile.supplier_name || "",
    supplier_id_type: profile.supplier_id_type || "",
    supplier_id_value: profile.supplier_id_value || "",
    supplier_sst: profile.supplier_sst || "",
    supplier_email: profile.supplier_email || "",
    supplier_phone: profile.supplier_phone || "",
    supplier_address: JSON.stringify(profile.supplier_address || {}, null, 2),
    client_id: profile.client_id || "",
    client_secret_ref: profile.client_secret_ref || "",
    certificate_ref: profile.certificate_ref || "",
    certificate_fingerprint: profile.certificate_fingerprint || "",
    certificate_expires_at: profile.certificate_expires_at ? String(profile.certificate_expires_at).slice(0, 10) : "",
    signing_key_ref: profile.signing_key_ref || "",
    config_json: JSON.stringify(profile.config_json || {}, null, 2),
  };
}

function parseObjectJson(text: string, label: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} 必须是 JSON 对象`);
  }
  return parsed as Record<string, unknown>;
}

function formToPayload(form: ConfigForm): MyInvoisProfile {
  return {
    enabled: form.enabled,
    environment: form.environment,
    supplier_tin: form.supplier_tin.trim(),
    supplier_name: form.supplier_name.trim(),
    supplier_id_type: form.supplier_id_type.trim(),
    supplier_id_value: form.supplier_id_value.trim(),
    supplier_sst: form.supplier_sst.trim(),
    supplier_email: form.supplier_email.trim(),
    supplier_phone: form.supplier_phone.trim(),
    supplier_address: parseObjectJson(form.supplier_address, "供应商地址"),
    client_id: form.client_id.trim(),
    client_secret_ref: form.client_secret_ref.trim(),
    certificate_ref: form.certificate_ref.trim(),
    certificate_fingerprint: form.certificate_fingerprint.trim(),
    certificate_expires_at: form.certificate_expires_at.trim() || null,
    signing_key_ref: form.signing_key_ref.trim(),
    config_json: parseObjectJson(form.config_json, "扩展配置"),
  };
}

export default function AdminMyInvois() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfigForm>(EMPTY_FORM);
  const [formTouched, setFormTouched] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reconcileDate, setReconcileDate] = useState("");

  const statusQuery = useQuery({
    queryKey: adminQueryKeys.myInvoisStatus(),
    queryFn: fetchMyInvoisStatus,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!statusQuery.data || formTouched) return;
    setForm(profileToForm(statusQuery.data.profile));
  }, [formTouched, statusQuery.data]);

  const documentFilters = useMemo<MyInvoisDocumentListParams>(() => ({
    page,
    pageSize,
    status,
    documentType,
    orderId: orderId.trim(),
  }), [documentType, orderId, page, pageSize, status]);

  const documentsQuery = useQuery({
    queryKey: adminQueryKeys.myInvoisDocuments(documentFilters),
    queryFn: () => fetchMyInvoisDocuments(documentFilters),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.myInvoisRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.myInvoisStatus() }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () => saveMyInvoisConfig(formToPayload(form)),
    onSuccess: async () => {
      setFormTouched(false);
      toast.success("MyInvois 配置已保存");
      await invalidate();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "MyInvois 配置保存失败")),
  });

  const retryMutation = useMutation({
    mutationFn: retryMyInvoisDocument,
    onSuccess: async () => {
      toast.success("已加入重试队列");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.myInvoisRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, "重试失败")),
  });

  const submitMutation = useMutation({
    mutationFn: submitMyInvoisDocument,
    onSuccess: async () => {
      toast.success("提交处理完成");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.myInvoisRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, "提交失败")),
  });

  const processMutation = useMutation({
    mutationFn: () => processPendingMyInvois(20),
    onSuccess: async (result) => {
      toast.success(`已处理 ${Number(result?.processed || 0)} 条待提交文档`);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.myInvoisRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, "处理队列失败")),
  });

  const reconcileMutation = useMutation({
    mutationFn: () => createMyInvoisReconciliation({ reconcile_date: reconcileDate, document_type: documentType || undefined }),
    onSuccess: () => {
      toast.success("对账记录已创建");
      setReconcileDate("");
    },
    onError: (error) => toast.error(toastErrorMessage(error, "创建对账记录失败")),
  });

  const rows = documentsQuery.data?.list ?? [];
  const total = documentsQuery.data?.total ?? 0;
  const statusData = statusQuery.data;

  const patchForm = (patch: Partial<ConfigForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormTouched(true);
  };

  return (
    <AdminPageShell
      showTitle
      title={<Tx>MyInvois 电子发票</Tx>}
      hint={<Tx>管理 MyInvois 配置、队列文档和提交状态。真实提交仍由后端环境开关控制。</Tx>}
      toolbar={(
        <UnifiedButton type="button" onClick={() => processMutation.mutate()} disabled={processMutation.isPending} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
          <RefreshCw size={14} /> 处理待提交
        </UnifiedButton>
      )}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <StatusCard label="环境开关" value={statusData?.env_enabled ? "已开启" : "未开启"} active={Boolean(statusData?.env_enabled)} />
        <StatusCard label="提交开关" value={statusData?.submit_enabled ? "允许提交" : "仅标记就绪"} active={Boolean(statusData?.submit_enabled)} />
        <StatusCard label="配置状态" value={statusData?.configured ? "已配置" : "未配置"} active={Boolean(statusData?.configured)} />
        <StatusCard label="运行状态" value={statusData?.active ? "启用中" : "未启用"} active={Boolean(statusData?.active)} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings2 size={16} />
          <h3 className="font-semibold"><Tx>配置</Tx></h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(event) => patchForm({ enabled: event.target.checked })} />
            <Tx>启用 MyInvois Profile</Tx>
          </label>
          <Field label="环境">
            <select value={form.environment} onChange={(event) => patchForm({ environment: event.target.value as "sandbox" | "live" })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="sandbox">sandbox</option>
              <option value="live">live</option>
            </select>
          </Field>
          <TextField label="供应商 TIN" value={form.supplier_tin} onChange={(value) => patchForm({ supplier_tin: value })} />
          <TextField label="供应商名称" value={form.supplier_name} onChange={(value) => patchForm({ supplier_name: value })} />
          <TextField label="证件类型" value={form.supplier_id_type} onChange={(value) => patchForm({ supplier_id_type: value })} />
          <TextField label="证件号码" value={form.supplier_id_value} onChange={(value) => patchForm({ supplier_id_value: value })} />
          <TextField label="SST" value={form.supplier_sst} onChange={(value) => patchForm({ supplier_sst: value })} />
          <TextField label="Email" value={form.supplier_email} onChange={(value) => patchForm({ supplier_email: value })} />
          <TextField label="电话" value={form.supplier_phone} onChange={(value) => patchForm({ supplier_phone: value })} />
          <TextField label="Client ID" value={form.client_id} onChange={(value) => patchForm({ client_id: value })} />
          <TextField label="Client Secret 引用" value={form.client_secret_ref} onChange={(value) => patchForm({ client_secret_ref: value })} />
          <TextField label="证书引用" value={form.certificate_ref} onChange={(value) => patchForm({ certificate_ref: value })} />
          <TextField label="证书指纹" value={form.certificate_fingerprint} onChange={(value) => patchForm({ certificate_fingerprint: value })} />
          <TextField label="证书到期日" value={form.certificate_expires_at} onChange={(value) => patchForm({ certificate_expires_at: value })} />
          <TextField label="签名密钥引用" value={form.signing_key_ref} onChange={(value) => patchForm({ signing_key_ref: value })} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <JsonField label="供应商地址 JSON" value={form.supplier_address} onChange={(value) => patchForm({ supplier_address: value })} />
          <JsonField label="扩展配置 JSON" value={form.config_json} onChange={(value) => patchForm({ config_json: value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <UnifiedButton type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-white">
            <FileCheck2 size={15} /> 保存配置
          </UnifiedButton>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-[160px_160px_minmax(0,1fr)_auto]">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">全部状态</option>
            <option value="queued">queued</option>
            <option value="ready">ready</option>
            <option value="submitted">submitted</option>
            <option value="accepted">accepted</option>
            <option value="failed">failed</option>
          </select>
          <select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">全部类型</option>
            <option value="invoice">invoice</option>
            <option value="credit_note">credit_note</option>
          </select>
          <input value={orderId} onChange={(event) => { setOrderId(event.target.value); setPage(1); }} placeholder="订单 ID" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <div className="flex gap-2">
            <SegmentedDateInput value={reconcileDate} onChange={setReconcileDate} />
            <UnifiedButton type="button" onClick={() => reconcileMutation.mutate()} disabled={!reconcileDate || reconcileMutation.isPending} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
              生成对账
            </UnifiedButton>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[120px_120px_minmax(0,1fr)_110px_120px_130px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground max-xl:hidden">
          <span>类型</span>
          <span>状态</span>
          <span>订单</span>
          <span>金额</span>
          <span>创建时间</span>
          <span className="text-right">操作</span>
        </div>
        {documentsQuery.isLoading && !documentsQuery.data ? (
          <div className="p-6 text-sm text-muted-foreground">加载中...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">暂无电子发票文档</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <DocumentRow
                key={row.id}
                row={row}
                onRetry={() => retryMutation.mutate(row.id)}
                onSubmit={() => submitMutation.mutate(row.id)}
                busy={retryMutation.isPending || submitMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </AdminPageShell>
  );
}

function StatusCard({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={active ? "mt-1 text-lg font-semibold text-[var(--theme-primary)]" : "mt-1 text-lg font-semibold text-muted-foreground"}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--theme-primary)]" />
    </Field>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={6} className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-[var(--theme-primary)]" />
    </label>
  );
}

function DocumentRow({ row, onRetry, onSubmit, busy }: { row: MyInvoisDocument; onRetry: () => void; onSubmit: () => void; busy: boolean }) {
  return (
    <article className="grid gap-3 px-4 py-3 text-sm xl:grid-cols-[120px_120px_minmax(0,1fr)_110px_120px_130px] xl:items-center">
      <span className="font-medium text-foreground">{row.document_type}</span>
      <span className="w-fit rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">{row.status}</span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{row.order_no || row.order_id || "-"}</p>
        <p className="truncate text-xs text-muted-foreground">{row.id}</p>
        {row.last_error ? <p className="mt-1 line-clamp-2 text-xs text-[var(--theme-danger)]">{row.last_error}</p> : null}
      </div>
      <p className="font-semibold text-[var(--theme-price)]">{row.currency || "MYR"} {Number(row.amount || 0).toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
      <div className="flex justify-end gap-2">
        <UnifiedButton type="button" onClick={onRetry} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs hover:bg-secondary">
          <RefreshCw size={12} /> 重试
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onSubmit} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs hover:bg-secondary">
          <Send size={12} /> 提交
        </UnifiedButton>
      </div>
    </article>
  );
}
