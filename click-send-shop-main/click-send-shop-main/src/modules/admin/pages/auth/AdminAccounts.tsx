import { formatDateTime } from "@/utils/formatDateTime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog, Shield, Trash2, KeyRound, ToggleLeft, ToggleRight, AlertTriangle, Copy, ShieldCheck, Smartphone, RotateCcw, X } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildAdminAccountFilterChips,
  hasActiveAdminAccountFilters,
  removeAdminAccountFilterChip,
} from "@/utils/adminAccountFilters";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/SearchBar";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import * as rbacService from "@/services/admin/rbacService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { RbacAdminUserRow } from "@/services/admin/rbacService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import AdminAccountSettingsTrigger from "@/components/admin/AdminAccountSettingsTrigger";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import {
  THEME_ALERT_ERROR_SOFT,
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRIMARY,
  THEME_BTN_DANGER_SOLID,
  THEME_HOVER_TEXT_DANGER,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS_SOFT,
} from "@/utils/themeVisuals";

const ROLE_BADGE: Record<string, { cls: string; text: string }> = {
  super_admin: { cls: THEME_BADGE_DANGER, text: "超级管理员" },
  admin: { cls: THEME_BADGE_PRIMARY, text: "管理员" },
  disabled: { cls: THEME_BADGE_MUTED, text: "已禁用" },
};

const HELP_COMMANDS = [
  {
    label: "将已有账号设置为超级管理员",
    command: "node scripts/set-admin-role.js <手机号> super_admin",
  },
  {
    label: "创建超级管理员账号",
    command: "node scripts/create-admin.js <手机号> <密码> super",
  },
];
const PRIVILEGED_ROLE_CODES = new Set(["super_admin", "admin_manager"]);

function hasPrivilegedRole(user: RbacAdminUserRow) {
  return user.role === "super_admin" || (user.roleCodes || []).some((code) => PRIVILEGED_ROLE_CODES.has(code));
}

function isStrongAdminPassword(password: string) {
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export default function AdminAccounts() {
  const isSuperAdminViewer = useAdminPermissionStore((s) => s.isSuperAdmin);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showOpsHelp, setShowOpsHelp] = useState(false);
  const [createForm, setCreateForm] = useState({ phone: "", password: "", nickname: "" });
  const [resetTarget, setResetTarget] = useState<RbacAdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<RbacAdminUserRow | null>(null);
  const [securityTarget, setSecurityTarget] = useState<RbacAdminUserRow | null>(null);

  const adminsQuery = useQuery({
    queryKey: adminQueryKeys.accounts(),
    queryFn: rbacService.loadRbacAdminUsers,
    staleTime: 60_000,
  });

  const admins = adminsQuery.data ?? [];
  const loading = adminsQuery.isLoading && !adminsQuery.data;

  const invalidateAccounts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.accounts() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.rbacRoot() }),
    ]);
  };

  const filtered = admins.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.phone?.toLowerCase().includes(q) || a.nickname?.toLowerCase().includes(q);
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered, 10);

  const filterState = useMemo(() => ({ search }), [search]);
  const filterChips = useMemo(() => buildAdminAccountFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveAdminAccountFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.adminAccountsFiltered : ADMIN_EMPTY_GUIDES.adminAccounts;

  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeAdminAccountFilterChip(key);
    if ("search" in patch) setSearch(patch.search ?? "");
    setPage(1);
  };

  const handleCreate = async () => {
    if (!createForm.phone || !isStrongAdminPassword(createForm.password)) {
      toast.error("密码至少 8 位，并包含大写字母、小写字母和数字");
      return;
    }
    try {
      await rbacService.createAdminUser({
        phone: createForm.phone,
        password: createForm.password,
        nickname: createForm.nickname,
      });
      toast.success("管理员已创建");
      setShowCreate(false);
      setCreateForm({ phone: "", password: "", nickname: "" });
      void invalidateAccounts();
    } catch (err) {
      toast.error(toastErrorMessage(err, "创建失败"));
    }
  };

  const handleToggle = async (user: RbacAdminUserRow) => {
    const enabled = user.role === "disabled";
    try {
      await rbacService.toggleAdminUser(user.id, enabled);
      toast.success(enabled ? "已启用" : "已禁用");
      void invalidateAccounts();
    } catch (err) {
      toast.error(toastErrorMessage(err, "操作失败"));
    }
  };

  const handleReset = async () => {
    if (!resetTarget || !isStrongAdminPassword(newPassword)) {
      toast.error("新密码至少 8 位，并包含大写字母、小写字母和数字");
      return;
    }
    try {
      await rbacService.resetAdminPassword(resetTarget.id, newPassword);
      toast.success("密码已重置");
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      toast.error(toastErrorMessage(err, "重置失败"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await rbacService.deleteAdminUser(confirmDelete.id);
      toast.success("管理员已删除");
      setConfirmDelete(null);
      void invalidateAccounts();
    } catch (err) {
      toast.error(toastErrorMessage(err, "删除失败"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar placeholder="搜索管理员手机号/昵称..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          </div>
          <PermissionGate permission="role.manage">
            <button type="button" onClick={() => setShowCreate(true)} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded px-4 py-2.5 text-sm font-semibold btn-theme-gradient active:opacity-90">
              <Plus size={16} /><Tx>创建管理员</Tx>
            </button>
          </PermissionGate>
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>

      <div className={`theme-rounded border px-4 py-3 text-xs text-foreground/90 ${THEME_ALERT_ERROR_SOFT}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">超级管理员帮助</p>
          <AdminFieldHint
            contentClassName="max-w-sm"
            text={(
              <p>
                当前页面用于管理普通管理员。若数据库中没有任何 super_admin，请使用下方命令行恢复权限。
              </p>
            )}
          />
        </div>
        <button
          type="button"
          className="mt-2 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary"
          onClick={() => setShowOpsHelp((v) => !v)}
        >
          {showOpsHelp ? "收起命令" : "展开命令"}
        </button>
        {showOpsHelp ? (
          <div className="mt-2 space-y-2 rounded-lg border border-border bg-background/60 p-2">
            {HELP_COMMANDS.map((item) => (
              <div key={item.command} className="rounded border border-border bg-card p-2">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <code className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">{item.command}</code>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-secondary"
                    onClick={() => {
                      void navigator.clipboard?.writeText(item.command);
                      toast.success("命令已复制");
                    }}
                  >
                    <Copy size={12} />
                    复制
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <AnimatedTable
        loading={loading}
        rows={paginatedData}
        rowKey={(a) => a.id}
        skeletonRows={8}
        skeletonCols={6}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="w-full min-w-[860px] text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
        thead={(
          <tr>
            {["管理员", "手机号", "角色", "创建时间", "最后登录", "操作"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        emptyIcon={emptyGuide.icon}
        emptyTitle={emptyGuide.title}
        emptyDescription={emptyGuide.description}
        emptyAction={(
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {!filtersActive ? (
              <PermissionGate permission="role.manage">
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="rounded-lg btn-theme-price px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  新建管理员
                </button>
              </PermissionGate>
            ) : null}
            <AdminEmptyGuideActions
              guide={emptyGuide}
              showClearFilters={filtersActive}
              onClearFilters={clearFilters}
            />
          </div>
        )}
        renderRow={(a) => {
          const badge = ROLE_BADGE[a.role] || ROLE_BADGE.admin;
          const targetLocked = !isSuperAdminViewer && hasPrivilegedRole(a);
          return (
            <>
              <td className="px-4 py-3 font-medium text-foreground">{a.nickname || "-"}</td>
              <td className="px-4 py-3 text-foreground">{a.phone}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.mfa?.enabled ? THEME_BADGE_PRIMARY : a.mfa?.required ? "bg-amber-100 text-amber-700" : THEME_BADGE_MUTED}`}>
                    <ShieldCheck size={11} />
                    {a.mfa?.enabled ? "MFA 已启用" : a.mfa?.required ? "待绑定 MFA" : "未要求 MFA"}
                  </span>
                  {Number(a.mfa?.trustedDeviceCount || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Smartphone size={11} />
                      {a.mfa?.trustedDeviceCount} 台设备
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{a.created_at ? formatDateTime(a.created_at) : "-"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{a.last_login_at ? formatDateTime(a.last_login_at) : <span className="italic text-muted-foreground/60"><Tx>从未登录</Tx></span>}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <AdminAccountSettingsTrigger variant="inline" />
                  <PermissionGate permission="role.manage">
                    {!targetLocked && a.role !== "super_admin" && (
                      <>
                        <button type="button" onClick={() => handleToggle(a)} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-1.5 text-muted-foreground hover:bg-[var(--theme-bg)]" title={a.role === "disabled" ? "启用" : "禁用"}>
                          {a.role === "disabled" ? <ToggleRight size={14} className={THEME_TEXT_SUCCESS_SOFT} /> : <ToggleLeft size={14} />}
                        </button>
                        {(isSuperAdminViewer || !hasPrivilegedRole(a)) && (
                          <button type="button" onClick={() => { setResetTarget(a); setNewPassword(""); }} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-1.5 text-muted-foreground hover:bg-[var(--theme-bg)]" title="重置密码">
                            <KeyRound size={14} />
                          </button>
                        )}
                        <button type="button" onClick={() => setConfirmDelete(a)} className={`touch-manipulation theme-rounded border border-[var(--theme-border)] p-1.5 text-muted-foreground ${THEME_HOVER_TEXT_DANGER} hover:bg-[var(--theme-bg)]`} title="删除">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {targetLocked && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Shield size={12} /><Tx>不可操作</Tx></span>
                    )}
                  </PermissionGate>
                </div>
              </td>
            </>
          );
        }}
      />

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md theme-rounded bg-[var(--theme-surface)] p-6 theme-shadow space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-foreground"><UserCog size={18} /><Tx>创建管理员</Tx></h3>
            <input placeholder="手机号 *" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
            <input placeholder="密码 *（至少8位，含大小写和数字）" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
            <input placeholder="昵称（可选）" value={createForm.nickname} onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="theme-rounded border border-[var(--theme-border)] px-4 py-2.5 text-sm hover:bg-[var(--theme-bg)]"><Tx>取消</Tx></button>
              <button type="button" onClick={handleCreate} disabled={!createForm.phone || !isStrongAdminPassword(createForm.password)} className="theme-rounded px-4 py-2.5 text-sm font-semibold btn-theme-gradient disabled:opacity-50"><Tx>创建</Tx></button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResetTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground"><Tx>重置密码</Tx></h3>
            <p className="text-sm text-muted-foreground">为 {resetTarget.nickname || resetTarget.phone} 设置新密码</p>
            <input placeholder="新密码（至少8位，含大小写和数字）" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={handleReset} disabled={!isStrongAdminPassword(newPassword)} className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Tx>确认重置</Tx></button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle size={40} className={`mx-auto ${THEME_TEXT_DANGER}`} />
            <h3 className="font-bold text-foreground"><Tx>确认删除管理员</Tx></h3>
            <p className="text-sm text-muted-foreground">将移除 {confirmDelete.nickname || confirmDelete.phone} 的管理员权限。</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={handleDelete} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${THEME_BTN_DANGER_SOLID}`}><Tx>确认删除</Tx></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
