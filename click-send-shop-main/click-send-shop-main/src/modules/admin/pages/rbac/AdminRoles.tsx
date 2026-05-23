import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Pencil } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import * as rbacService from "@/services/admin/rbacService";
import type { RbacAdminUserRow, RbacRoleRow } from "@/services/admin/rbacService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelAdminLegacyRole, labelRbacRoleCode } from "@/utils/adminDisplayLabels";
import { AdminTabsPanelSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { LoadingButton } from "@/modules/micro-interactions";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import AdminPermissionPicker from "@/components/admin/AdminPermissionPicker";
import AdminRolePicker from "@/components/admin/AdminRolePicker";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

type Tab = "assign" | "manage";
const PRIVILEGED_ROLE_CODES = new Set(["super_admin", "admin_manager"]);

function hasPrivilegedRole(user?: RbacAdminUserRow | null) {
  if (!user) return false;
  return user.role === "super_admin" || (user.roleCodes || []).some((code) => PRIVILEGED_ROLE_CODES.has(code));
}

export default function AdminRoles() {
  const { confirm: askConfirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const isSuperAdminViewer = useAdminPermissionStore((s) => s.isSuperAdmin);
  const [tab, setTab] = useState<Tab>("assign");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  const [editRole, setEditRole] = useState<RbacRoleRow | null>(null);
  const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });
  const [rolePerms, setRolePerms] = useState<Record<number, boolean>>({});
  const [showRoleModal, setShowRoleModal] = useState(false);

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.rbacOverview(),
    queryFn: async () => {
      const [roles, admins, perms] = await Promise.all([
        rbacService.loadRbacRoles(),
        rbacService.loadRbacAdminUsers(),
        rbacService.loadRbacPermissions(),
      ]);
      return { roles, admins, perms };
    },
    staleTime: 60_000,
  });

  const roles = useMemo(() => overviewQuery.data?.roles ?? [], [overviewQuery.data?.roles]);
  const admins = useMemo(() => overviewQuery.data?.admins ?? [], [overviewQuery.data?.admins]);
  const perms = useMemo(() => overviewQuery.data?.perms ?? [], [overviewQuery.data?.perms]);
  const loading = overviewQuery.isLoading && !overviewQuery.data;
  const selectedAdmin = admins.find((u) => u.id === selectedUserId) || null;
  const selectedTargetLocked = !isSuperAdminViewer && hasPrivilegedRole(selectedAdmin);
  const assignedRoleIds = useMemo(
    () => Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k)).filter((n) => Number.isFinite(n)),
    [checked],
  );

  const invalidateRbac = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.rbacRoot() });

  useEffect(() => {
    if (!admins.length || selectedUserId) return;
    setSelectedUserId(admins[0].id);
  }, [admins, selectedUserId]);

  const userRolesQuery = useQuery({
    queryKey: adminQueryKeys.rbacUserRoles(selectedUserId),
    queryFn: () => rbacService.loadUserRoles(selectedUserId),
    enabled: !!selectedUserId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userRolesQuery.data) return;
    const next: Record<number, boolean> = {};
    for (const id of userRolesQuery.data.roleIds) next[id] = true;
    setChecked(next);
  }, [userRolesQuery.data]);

  const handleSave = async () => {
    if (!selectedUserId) return;
    if (selectedTargetLocked) {
      toast.error("仅超级管理员可修改 admin_manager / super_admin 账号角色");
      return;
    }
    const roleIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k)).filter((n) => Number.isFinite(n));
    setSaving(true);
    try {
      await rbacService.saveUserRoles(selectedUserId, roleIds);
      toast.success("已保存");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.rbacUserRoles(selectedUserId) });
    } catch (e) { toast.error(toastErrorMessage(e, "保存失败")); }
    finally { setSaving(false); }
  };

  const openRoleCreate = () => {
    if (!isSuperAdminViewer) { toast.error("仅超级管理员可创建角色"); return; }
    setEditRole(null);
    setRoleForm({ code: "", name: "", description: "" });
    setRolePerms({});
    setShowRoleModal(true);
  };

  const openRoleEdit = (r: RbacRoleRow) => {
    if (!isSuperAdminViewer) { toast.error("仅超级管理员可修改角色"); return; }
    setEditRole(r);
    setRoleForm({ code: r.code, name: r.name, description: r.description || "" });
    const rp: Record<number, boolean> = {};
    for (const pid of r.permissionIds) rp[pid] = true;
    setRolePerms(rp);
    setShowRoleModal(true);
  };

  const handleRoleSave = async () => {
    if (!isSuperAdminViewer) { toast.error("仅超级管理员可管理角色"); return; }
    const pids = Object.entries(rolePerms).filter(([, v]) => v).map(([k]) => Number(k));
    setSaving(true);
    try {
      if (editRole) {
        await rbacService.updateRole(editRole.id, { name: roleForm.name, description: roleForm.description, permissionIds: pids });
        toast.success("角色已更新");
      } else {
        await rbacService.createRole({ code: roleForm.code, name: roleForm.name, description: roleForm.description, permissionIds: pids });
        toast.success("角色已创建");
      }
      setShowRoleModal(false);
      void invalidateRbac();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
    finally { setSaving(false); }
  };

  const handleRoleDelete = (r: RbacRoleRow) => {
    if (!isSuperAdminViewer) { toast.error("仅超级管理员可删除角色"); return; }
    if (r.is_system) { toast.error("系统角色不可删除"); return; }
    adminConfirmDelete(askConfirm, r.name, async () => {
      await rbacService.deleteRole(r.id);
      toast.success("已删除");
      void invalidateRbac();
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-[var(--theme-price)]" />
        <h1 className="font-display text-xl font-bold text-foreground"><Tx>角色权限</Tx></h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("assign")} className={`theme-rounded px-4 py-2 text-sm font-medium ${tab === "assign" ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}><Tx>用户角色分配</Tx></button>
        {isSuperAdminViewer && <button onClick={() => setTab("manage")} className={`theme-rounded px-4 py-2 text-sm font-medium ${tab === "manage" ? "btn-theme-price" : "bg-secondary text-muted-foreground"}`}><Tx>角色管理</Tx></button>}
      </div>

      {loading ? (
        <AdminTabsPanelSkeleton />
      ) : (
      <>
      {tab === "assign" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Tx>用户角色分配</Tx>
            <AdminFieldHint text={<Tx>为后台管理员账号分配 RBAC 角色。账号创建、禁用与 MFA 请到「员工账号」。超级管理员角色仅超级管理员账号可分配。</Tx>} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground"><Tx>选择管理员</Tx></label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-sm text-foreground">
              {admins.map((u) => <option key={u.id} value={u.id}>{u.nickname || u.phone}（{labelAdminLegacyRole(u.role)}）· {u.phone}</option>)}
            </select>
          </div>
          <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <p className="mb-3 text-sm font-medium text-foreground"><Tx>分配角色（多选）</Tx></p>
            <PermissionGate permission="role.manage" fallback={<p className="text-sm text-muted-foreground"><Tx>无权限修改角色分配。</Tx></p>}>
              {selectedTargetLocked ? (
                <p className="mb-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-muted-foreground">
                  <Tx>该账号拥有 admin_manager / super_admin 角色，仅超级管理员可调整。</Tx>
                </p>
              ) : null}
              <AdminRolePicker
                roles={roles}
                selectedRoleIds={assignedRoleIds}
                onChange={(roleIds) => {
                  const next: Record<number, boolean> = {};
                  for (const role of roles) next[role.id] = roleIds.includes(role.id);
                  setChecked(next);
                }}
                isSuperAdminViewer={isSuperAdminViewer}
                disabled={selectedTargetLocked}
              />
            </PermissionGate>
          </div>
          <PermissionGate permission="role.manage">
            <LoadingButton
              type="button"
              variant="gold"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={!selectedUserId || selectedTargetLocked}
              onClick={() => adminConfirmSave(askConfirm, "角色分配", () => handleSave())}
              className="min-h-[44px] w-full rounded-xl py-3 text-sm font-semibold"
            ><Tx>
              保存
            </Tx></LoadingButton>
          </PermissionGate>
        </div>
      )}

      {tab === "manage" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Tx>角色管理</Tx>
              <AdminFieldHint text={<Tx>管理角色定义和权限配置。系统内置角色不可删除。</Tx>} />
            </div>
            {isSuperAdminViewer && (
              <button onClick={openRoleCreate} className="flex items-center gap-1 theme-rounded px-3 py-2 text-xs font-medium btn-theme-gradient">
                <Plus size={14} /><Tx> 新建角色
              </Tx></button>
            )}
          </div>
          <div className="space-y-3">
            {roles.map((r) => (
              <div key={r.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{labelRbacRoleCode(r.code)}</span>
                    {r.is_system ? <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"><Tx>系统</Tx></span> : null}
                  </div>
                  {isSuperAdminViewer && (
                    <div className="flex gap-1">
                      <button onClick={() => openRoleEdit(r)} className="theme-rounded p-1.5 text-muted-foreground hover:bg-[var(--theme-bg)]"><Pencil size={14} /></button>
                      {!r.is_system && <button onClick={() => void handleRoleDelete(r)} className={`theme-rounded p-1.5 hover:bg-[color-mix(in_srgb,var(--theme-danger)_8%,var(--theme-surface))] ${THEME_TEXT_DANGER}`}><Trash2 size={14} /></button>}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.permissionIds.length} 个权限</p>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      <AdminResponsiveSheet
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        title={editRole ? "编辑角色" : "新建角色"}
        size="md"
        height="70vh"
      >
        <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground"><Tx>编码</Tx></label>
                <input value={roleForm.code} onChange={(e) => setRoleForm((p) => ({ ...p, code: e.target.value }))} disabled={!!editRole} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm disabled:opacity-50" placeholder="如 shichang（英文标识，创建后不可改）" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground"><Tx>名称</Tx></label>
                <input value={roleForm.name} onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="如 市场专员" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground"><Tx>描述</Tx></label>
                <input value={roleForm.description} onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground"><Tx>权限</Tx></label>
                <AdminPermissionPicker
                  key={editRole ? `edit-${editRole.id}` : "create"}
                  className="mt-2"
                  permissions={perms}
                  selected={rolePerms}
                  onChange={setRolePerms}
                />
              </div>
            <LoadingButton
              type="button"
              variant="gold"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={!roleForm.code || !roleForm.name}
              onClick={() => adminConfirmSave(askConfirm, editRole ? "角色修改" : "新角色", () => handleRoleSave())}
              className="w-full rounded-xl py-3 text-sm font-semibold"
            ><Tx>
              保存
            </Tx>            </LoadingButton>
        </div>
      </AdminResponsiveSheet>
    </div>
  );
}
