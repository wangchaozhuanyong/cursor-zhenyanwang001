import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog, Shield, Trash2, KeyRound, ToggleLeft, ToggleRight, Copy, ShieldCheck, Smartphone, RotateCcw } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
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
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import AdminRolePicker from "@/components/admin/AdminRolePicker";
import { getDefaultAdminRoleIds } from "@/components/admin/adminRolePickerUtils";
import {
  THEME_ALERT_ERROR_SOFT,
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRIMARY,
  THEME_HOVER_TEXT_DANGER,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS_SOFT,
} from "@/utils/themeVisuals";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { adminConfirmDelete, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { useAdminT } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

const ACCOUNT_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "center", "left", "left", "right",
];

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
const EMPTY_CREATE_FORM = { phone: "", password: "", nickname: "", roleIds: [] as number[] };

function hasPrivilegedRole(user: RbacAdminUserRow) {
  return user.role === "super_admin" || (user.roleCodes || []).some((code) => PRIVILEGED_ROLE_CODES.has(code));
}

function isStrongAdminPassword(password: string) {
  return password.length >= 8 && password.length <= 64 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export default function AdminAccounts() {
  const { tText } = useAdminT();
  const { confirm: askConfirm } = useAdminConfirm();
  const isSuperAdminViewer = useAdminPermissionStore((s) => s.isSuperAdmin);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showOpsHelp, setShowOpsHelp] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [resetTarget, setResetTarget] = useState<RbacAdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [securityTarget, setSecurityTarget] = useState<RbacAdminUserRow | null>(null);

  const adminsQuery = useQuery({
    queryKey: adminQueryKeys.accounts(),
    queryFn: rbacService.loadRbacAdminUsers,
    staleTime: 60_000,
  });

  const rolesQuery = useQuery({
    queryKey: adminQueryKeys.rbacOverview(),
    queryFn: rbacService.loadRbacRoles,
    staleTime: 60_000,
  });

  const admins = adminsQuery.data ?? [];
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const loading = adminsQuery.isLoading && !adminsQuery.data;
  const defaultCreateRoleIds = useMemo(
    () => getDefaultAdminRoleIds(roles, isSuperAdminViewer).slice().sort((a, b) => a - b),
    [isSuperAdminViewer, roles],
  );
  const createRoleIdsSorted = useMemo(
    () => [...createForm.roleIds].sort((a, b) => a - b),
    [createForm.roleIds],
  );
  const createDirty = showCreate && (
    createForm.phone.trim().length > 0
      || createForm.password.length > 0
      || createForm.nickname.trim().length > 0
      || JSON.stringify(createRoleIdsSorted) !== JSON.stringify(defaultCreateRoleIds)
  );
  const resetDirty = Boolean(resetTarget && newPassword.length > 0);
  useAdminTabDirty(createDirty || resetDirty);

  useEffect(() => {
    if (!showCreate || createForm.roleIds.length || !roles.length) return;
    setCreateForm((prev) => ({
      ...prev,
      roleIds: getDefaultAdminRoleIds(roles, isSuperAdminViewer),
    }));
  }, [createForm.roleIds.length, isSuperAdminViewer, roles, showCreate]);

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
  const filterChips = useMemo(
    () => buildAdminAccountFilterChips(filterState).map((chip) => ({ ...chip, label: tText(chip.label) })),
    [filterState, tText],
  );
  const tableHeaders = useMemo(
    () => ["管理员", "手机号", "角色", "创建时间", "最后登录", "操作"].map((h) => tText(h)),
    [tText],
  );
  const filtersActive = hasActiveAdminAccountFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.adminAccountsFiltered : ADMIN_EMPTY_GUIDES.adminAccounts,
  );

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
    if (!createForm.phone) {
      toast.error(tText("请填写手机号"));
      return;
    }
    if (!isStrongAdminPassword(createForm.password)) {
      toast.error(tText("密码至少 8 位，并包含大写字母、小写字母和数字"));
      return;
    }
    if (createForm.roleIds.length === 0) {
      toast.error(tText("请至少选择一个初始角色"));
      return;
    }
    try {
      await rbacService.createAdminUser({
        phone: createForm.phone,
        password: createForm.password,
        nickname: createForm.nickname,
        roleIds: createForm.roleIds,
      });
      toast.success(tText("管理员已创建"));
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
      void invalidateAccounts();
    } catch (err) {
      toast.error(toastErrorMessage(err, tText("创建失败")));
    }
  };

  const handleToggle = async (user: RbacAdminUserRow) => {
    const enabled = user.role === "disabled";
    try {
      await rbacService.toggleAdminUser(user.id, enabled);
      toast.success(enabled ? tText("已启用") : tText("已禁用"));
      void invalidateAccounts();
    } catch (err) {
      toast.error(toastErrorMessage(err, tText("操作失败")));
    }
  };

  const handleReset = async () => {
    if (!resetTarget || !isStrongAdminPassword(newPassword)) {
      toast.error(tText("新密码至少 8 位，并包含大写字母、小写字母和数字"));
      return;
    }
    try {
      await rbacService.resetAdminPassword(resetTarget.id, newPassword);
      toast.success(tText("密码已重置"));
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      toast.error(toastErrorMessage(err, tText("重置失败")));
    }
  };

  const renderMobileCard = (a: RbacAdminUserRow) => {
    const badge = ROLE_BADGE[a.role] || ROLE_BADGE.admin;
    const targetLocked = !isSuperAdminViewer && hasPrivilegedRole(a);

    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{a.nickname || "-"}</p>
            <p className="text-xs text-muted-foreground">{a.phone}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{tText(badge.text)}</span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.mfa?.enabled ? THEME_BADGE_PRIMARY : a.mfa?.required ? "bg-amber-100 text-amber-700" : THEME_BADGE_MUTED}`}>
            <ShieldCheck size={11} />
            {a.mfa?.enabled ? tText("MFA 已启用") : a.mfa?.required ? tText("待绑定 MFA") : tText("未要求 MFA")}
          </span>
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={tText("创建时间")}>
            <span className="text-xs text-muted-foreground">{a.created_at ? formatDateTime(a.created_at) : "-"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("最后登录")}>
            <span className="text-xs text-muted-foreground">{a.last_login_at ? formatDateTime(a.last_login_at) : tText("从未登录")}</span>
          </AdminTableMobileCardField>
        </div>
        <PermissionGate permission="role.manage">
          {!targetLocked ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {a.role !== "super_admin" ? (
                <button type="button" onClick={() => handleToggle(a)} className="touch-manipulation flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary">
                  {a.role === "disabled" ? tText("启用") : tText("禁用")}
                </button>
              ) : null}
              {(isSuperAdminViewer || !hasPrivilegedRole(a)) ? (
                <button type="button" onClick={() => { setResetTarget(a); setNewPassword(""); }} className="touch-manipulation flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"><Tx>重置密码</Tx></button>
              ) : null}
              <button type="button" onClick={() => setSecurityTarget(a)} className="touch-manipulation flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"><Tx>安全</Tx></button>
              {a.role !== "super_admin" ? (
                <button
                  type="button"
                  onClick={() =>
                    adminConfirmDelete(askConfirm, a.nickname || a.phone, async () => {
                      await rbacService.deleteAdminUser(a.id);
                      toast.success(tText("管理员已删除"));
                      void invalidateAccounts();
                    })
                  }
                  className={`touch-manipulation rounded-lg border border-border px-3 py-2 text-xs ${THEME_TEXT_DANGER}`}
                >
                  <Tx>删除</Tx>
                </button>
              ) : null}
            </div>
          ) : targetLocked ? (
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground"><Shield size={12} className="mr-1 inline" /><Tx>不可操作</Tx></p>
          ) : null}
        </PermissionGate>
      </AdminTableMobileCard>
    );
  };

  return (
    <AdminPageShell
      hint={<Tx>管理后台登录账号、角色分配、MFA 与密码安全；超级管理员可通过页面说明中的命令行恢复权限。</Tx>}
      toolbar={(
        <PermissionGate permission="role.manage">
          <button type="button" onClick={() => setShowCreate(true)} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded px-4 py-2.5 text-sm font-semibold btn-theme-gradient active:opacity-90">
            <Plus size={16} /><Tx>创建管理员</Tx>
          </button>
        </PermissionGate>
      )}
      filters={(
        <>
          <div className="space-y-2">
            <SearchBar placeholder={tText("搜索管理员手机号/昵称...")} value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
            <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
          </div>
          <div className={`theme-rounded border px-4 py-3 text-xs text-foreground/90 ${THEME_ALERT_ERROR_SOFT}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground"><Tx>超级管理员帮助</Tx></p>
          <AdminFieldHint
            contentClassName="max-w-sm"
            text={(
              <p>
                <Tx>当前页面用于管理普通管理员。若数据库中没有任何 super_admin，请使用下方命令行恢复权限。</Tx>
              </p>
            )}
          />
        </div>
        <button
          type="button"
          className="mt-2 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary"
          onClick={() => setShowOpsHelp((v) => !v)}
        >
          {showOpsHelp ? tText("收起命令") : tText("展开命令")}
        </button>
        {showOpsHelp ? (
          <div className="mt-2 space-y-2 rounded-lg border border-border bg-background/60 p-2">
            {HELP_COMMANDS.map((item) => (
              <div key={item.command} className="rounded border border-border bg-card p-2">
                <p className="text-[11px] text-muted-foreground">{tText(item.label)}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <code className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">{item.command}</code>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-secondary"
                    onClick={() => {
                      void navigator.clipboard?.writeText(item.command);
                      toast.success(tText("命令已复制"));
                    }}
                  >
                    <Copy size={12} />
                    <Tx>复制</Tx>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
          </div>
        </>
      )}
    >
      <AnimatedTable
        loading={loading}
        rows={paginatedData}
        rowKey={(a) => a.id}
        skeletonRows={8}
        skeletonCols={6}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="w-full min-w-[920px] text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
        thead={adminTableTheadRow(tableHeaders, ACCOUNT_COLUMN_ALIGNS)}
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
                  <Tx>新建管理员</Tx>
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
        renderMobileCard={renderMobileCard}
        renderRow={(a) => {
          const badge = ROLE_BADGE[a.role] || ROLE_BADGE.admin;
          const targetLocked = !isSuperAdminViewer && hasPrivilegedRole(a);
          return (
            <>
              <td className={adminTableCellClass("left", "font-medium text-foreground")}>{a.nickname || "-"}</td>
              <td className={adminTableCellClass("left", "text-foreground")}>{a.phone}</td>
              <td className={adminTableCellClass("center")}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{tText(badge.text)}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.mfa?.enabled ? THEME_BADGE_PRIMARY : a.mfa?.required ? "bg-amber-100 text-amber-700" : THEME_BADGE_MUTED}`}>
                    <ShieldCheck size={11} />
                    {a.mfa?.enabled ? tText("MFA 已启用") : a.mfa?.required ? tText("待绑定 MFA") : tText("未要求 MFA")}
                  </span>
                  {Number(a.mfa?.trustedDeviceCount || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Smartphone size={11} />
                      {tText(`${a.mfa?.trustedDeviceCount} 台可信设备`)}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{a.created_at ? formatDateTime(a.created_at) : "-"}</td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{a.last_login_at ? formatDateTime(a.last_login_at) : <span className="italic text-muted-foreground/60"><Tx>从未登录</Tx></span>}</td>
              <td className={adminTableCellClass("right", "whitespace-nowrap")}>
                <PermissionGate permission="role.manage">
                  {!targetLocked ? (
                    <AdminRowActionsMenu
                      primary={(
                        <button
                          type="button"
                          onClick={() => setSecurityTarget(a)}
                          className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 text-xs font-medium text-foreground hover:bg-[var(--theme-bg)]"
                          title={tText("安全设置")}
                        >
                          <ShieldCheck size={14} className="mr-1 inline" />
                          <Tx>安全</Tx>
                        </button>
                      )}
                      moreLabel={<Tx>更多</Tx>}
                      items={[
                        ...(a.role !== "super_admin" ? ([
                          {
                            key: "toggle",
                            label: <Tx>{a.role === "disabled" ? "启用" : "禁用"}</Tx>,
                            icon: a.role === "disabled"
                              ? <ToggleRight size={14} className={THEME_TEXT_SUCCESS_SOFT} aria-hidden />
                              : <ToggleLeft size={14} aria-hidden />,
                            onClick: () => handleToggle(a),
                          },
                        ] as const) : []),
                        ...((isSuperAdminViewer || !hasPrivilegedRole(a)) ? ([
                          {
                            key: "resetPwd",
                            label: <Tx>重置密码</Tx>,
                            icon: <KeyRound size={14} aria-hidden />,
                            onClick: () => { setResetTarget(a); setNewPassword(""); },
                          },
                        ] as const) : []),
                        ...(a.role !== "super_admin" ? ([
                          {
                            key: "delete",
                            label: <Tx>删除</Tx>,
                            icon: <Trash2 size={14} aria-hidden />,
                            danger: true,
                            separatorBefore: true,
                            onClick: () =>
                              adminConfirmDelete(askConfirm, a.nickname || a.phone, async () => {
                                await rbacService.deleteAdminUser(a.id);
                                toast.success(tText("管理员已删除"));
                                void invalidateAccounts();
                              }),
                          },
                        ] as const) : []),
                      ]}
                    />
                  ) : targetLocked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Shield size={12} /><Tx>不可操作</Tx></span>
                  ) : null}
                </PermissionGate>
              </td>
            </>
          );
        }}
      />

      <AdminFormSheet
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setCreateForm(EMPTY_CREATE_FORM);
          }
        }}
        title={<span className="flex items-center gap-2"><UserCog size={18} /><Tx>创建管理员</Tx></span>}
        submitText={tText("创建")}
        submitDisabled={!createForm.phone || !isStrongAdminPassword(createForm.password) || createForm.roleIds.length === 0}
        onSubmit={handleCreate}
        size="sm"
      >
        <input placeholder={tText("手机号 *")} value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
        <input placeholder={tText("密码 *（至少8位，含大小写和数字）")} type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
        <input placeholder={tText("昵称（可选）")} value={createForm.nickname} onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground"><Tx>初始角色</Tx></span>
            <AdminFieldHint text={tText("创建后也可以在「角色权限」里继续调整。普通管理员不能分配 admin_manager / super_admin。")} />
          </div>
          <AdminRolePicker
            roles={roles}
            selectedRoleIds={createForm.roleIds}
            onChange={(roleIds) => setCreateForm((prev) => ({ ...prev, roleIds }))}
            isSuperAdminViewer={isSuperAdminViewer}
            disabled={rolesQuery.isLoading}
          />
        </div>
      </AdminFormSheet>

      <AdminFormSheet
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNewPassword("");
          }
        }}
        title={<Tx>重置密码</Tx>}
        description={resetTarget ? tText(`为 ${resetTarget.nickname || resetTarget.phone} 设置新密码`) : undefined}
        submitText={tText("确认重置")}
        submitDisabled={!isStrongAdminPassword(newPassword)}
        onSubmit={handleReset}
        size="sm"
      >
        <input placeholder={tText("新密码（至少8位，含大小写和数字）")} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
      </AdminFormSheet>

      {securityTarget ? (
        <AdminSecurityDialog
          target={securityTarget}
          open
          onOpenChange={(open) => !open && setSecurityTarget(null)}
          onChanged={() => void invalidateAccounts()}
        />
      ) : null}
    </AdminPageShell>
  );
}

function AdminSecurityDialog({
  target,
  open,
  onOpenChange,
  onChanged,
}: {
  target: RbacAdminUserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { tText } = useAdminT();
  const { confirm: askConfirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const queryKey = adminQueryKeys.accountSecurity(target.id);
  const securityQuery = useQuery({
    queryKey,
    queryFn: () => rbacService.loadAdminUserSecurity(target.id),
  });
  const security = securityQuery.data;
  const activeDevices = security?.trustedDevices.filter((device) => device.active) ?? [];

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.accounts() }),
    ]);
    onChanged();
  };

  const setMfaRequiredMutation = useMutation({
    mutationFn: (required: boolean) => rbacService.updateAdminUserMfaRequired(target.id, required),
    onSuccess: async (_data, required) => {
      toast.success(required ? tText("已要求该员工下次登录绑定 MFA") : tText("已关闭该员工 MFA 要求"));
      await refresh();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("安全设置更新失败"))),
  });

  const resetMfaMutation = useMutation({
    mutationFn: () => rbacService.resetAdminUserMfa(target.id),
    onSuccess: async (data) => {
      toast.success(tText(`身份验证器已重置，已撤销 ${data?.revokedTrustedDeviceCount ?? 0} 台可信设备，下次登录需要重新绑定`, `Authenticator reset. Revoked ${data?.revokedTrustedDeviceCount ?? 0} trusted devices. Rebind on next login.`));
      await refresh();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("MFA 重置失败"))),
  });

  const confirmResetMfa = () => {
    askConfirm({
      title: tText("确认重置身份验证器"),
      danger: true,
      confirmText: tText("确认重置"),
      description: (
        <div className="space-y-2 text-sm">
          <p>{tText(`目标账号：${target.nickname || target.phone}（${target.phone}）`)}</p>
          <p>{tText("此操作会清除旧 Authenticator/TOTP 绑定，撤销该员工所有可信设备，并要求其下次登录重新扫描二维码绑定。")}</p>
          <p className="font-medium text-destructive">{tText("如果该员工正在使用后台，当前登录态会失效。")}</p>
        </div>
      ),
      onConfirm: () => resetMfaMutation.mutate(),
    });
  };

  const revokeAllDevicesMutation = useMutation({
    mutationFn: () => rbacService.revokeAdminTrustedDevices(target.id),
    onSuccess: async (data) => {
      toast.success(tText(`已撤销 ${data?.revoked ?? 0} 台可信设备`));
      await refresh();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("可信设备撤销失败"))),
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => rbacService.revokeAdminTrustedDevice(target.id, deviceId),
    onSuccess: async () => {
      toast.success(tText("可信设备已撤销"));
      await refresh();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("可信设备撤销失败"))),
  });

  const busy = setMfaRequiredMutation.isPending
    || resetMfaMutation.isPending
    || revokeAllDevicesMutation.isPending
    || revokeDeviceMutation.isPending;

  return (
    <AdminResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck size={18} />
          <Tx>员工安全设置</Tx>
        </span>
      }
      description={tText(`${target.nickname || target.phone} · ${target.phone}`)}
      size="xl"
      height="85vh"
    >
        {securityQuery.isLoading ? (
          <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground"><Tx>正在加载安全状态...</Tx></div>
        ) : securityQuery.isError ? (
          <div className={`mt-5 rounded-lg border p-4 text-sm ${THEME_ALERT_ERROR_SOFT}`}><Tx>安全状态加载失败，请稍后重试。</Tx></div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SecurityMetric label={tText("MFA 要求")} value={security?.mfa.required ? tText("已要求") : tText("未要求")} />
              <SecurityMetric label={tText("MFA 状态")} value={security?.mfa.enabled ? tText("已启用") : tText("未启用")} />
              <SecurityMetric label={tText("可信设备")} value={tText(`${activeDevices.length} 台有效`)} />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold"><Tx>Authenticator 丢失处理</Tx></p>
              <p className="mt-1">
                <Tx>当员工误删 Google/Microsoft Authenticator 后，请点击“重置身份验证器（MFA）”。系统会保留 MFA 要求，只清除旧密钥并强制对方下次登录重新绑定。</Tx>
              </p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground"><Tx>MFA 登录保护</Tx></p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Tx>开启后，该员工下次登录需要绑定身份验证器；重置会撤销旧绑定和可信设备，但不会关闭 MFA 要求。</Tx>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || security?.mfa.lockedRequired || security?.mfa.required}
                    onClick={() => setMfaRequiredMutation.mutate(true)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    <Tx>要求 MFA</Tx>
                  </button>
                  <button
                    type="button"
                    disabled={busy || security?.mfa.lockedRequired || !security?.mfa.required}
                    onClick={() => setMfaRequiredMutation.mutate(false)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    <Tx>关闭要求</Tx>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={confirmResetMfa}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    <Tx>重置身份验证器（MFA）</Tx>
                  </button>
                </div>
              </div>
              {security?.mfa.lockedRequired ? (
                <p className="mt-3 text-xs text-amber-700"><Tx>超级管理员必须启用 MFA，不能关闭要求。</Tx></p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground"><Tx>可信设备</Tx></p>
                  <p className="mt-1 text-xs text-muted-foreground"><Tx>撤销后，该员工下次登录需要重新完成 MFA 验证。</Tx></p>
                </div>
                <button
                  type="button"
                  disabled={busy || activeDevices.length === 0}
                  onClick={() => revokeAllDevicesMutation.mutate()}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  <Tx>撤销全部设备</Tx>
                </button>
              </div>

              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {(security?.trustedDevices ?? []).length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground"><Tx>暂无可信设备记录。</Tx></div>
                ) : (
                  security?.trustedDevices.map((device) => (
                    <div key={device.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 text-foreground">
                          <Smartphone size={14} />
                          <span>{device.active ? tText("有效设备") : tText("已失效设备")}</span>
                        </div>
                        <p className="mt-1">{tText("最近使用")}：{device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "-"}</p>
                        <p>{tText("到期时间")}：{device.expiresAt ? formatDateTime(device.expiresAt) : "-"}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || !device.active}
                        onClick={() => revokeDeviceMutation.mutate(device.id)}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                      >
                        <Tx>撤销</Tx>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
    </AdminResponsiveSheet>
  );
}

function SecurityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
