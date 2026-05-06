import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Pencil, X } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import * as rbacService from "@/services/admin/rbacService";
import type { RbacAdminUserRow, RbacRoleRow } from "@/services/admin/rbacService";

interface PermRow { id: number; code: string; name: string; sort_order: number }

type Tab = "assign" | "manage" | "admins";

export default function AdminRoles() {
  const [tab, setTab] = useState<Tab>("assign");
  const [roles, setRoles] = useState<RbacRoleRow[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [admins, setAdmins] = useState<RbacAdminUserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editRole, setEditRole] = useState<RbacRoleRow | null>(null);
  const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });
  const [rolePerms, setRolePerms] = useState<Record<number, boolean>>({});
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ phone: "", password: "", nickname: "" });
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const [r, a, p] = await Promise.all([rbacService.loadRbacRoles(), rbacService.loadRbacAdminUsers(), rbacService.loadRbacPermissions()]);
      setRoles(r);
      setAdmins(a);
      setPerms(p);
      if (a.length && !selectedUserId) setSelectedUserId(a[0].id);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const ur = await rbacService.loadUserRoles(selectedUserId);
        if (cancelled) return;
        const next: Record<number, boolean> = {};
        for (const id of ur.roleIds) next[id] = true;
        setChecked(next);
      } catch {
        toast.error("无法加载该用户的角色");
      }
    })();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  const toggleRole = (id: number) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    if (!selectedUserId) return;
    const roleIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k)).filter((n) => Number.isFinite(n));
    setSaving(true);
    try {
      await rbacService.saveUserRoles(selectedUserId, roleIds);
      toast.success("已保存");
    } catch { toast.error("保存失败"); }
    finally { setSaving(false); }
  };

  const openRoleCreate = () => {
    setEditRole(null);
    setRoleForm({ code: "", name: "", description: "" });
    setRolePerms({});
    setShowRoleModal(true);
  };

  const openRoleEdit = (r: RbacRoleRow) => {
    setEditRole(r);
    setRoleForm({ code: r.code, name: r.name, description: r.description || "" });
    const rp: Record<number, boolean> = {};
    for (const pid of r.permissionIds) rp[pid] = true;
    setRolePerms(rp);
    setShowRoleModal(true);
  };

  const handleRoleSave = async () => {
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
      void reload();
    } catch { toast.error("操作失败"); }
    finally { setSaving(false); }
  };

  const handleRoleDelete = async (r: RbacRoleRow) => {
    if (r.is_system) { toast.error("系统角色不可删除"); return; }
    if (!confirm(`确定删除角色「${r.name}」？`)) return;
    try {
      await rbacService.deleteRole(r.id);
      toast.success("已删除");
      void reload();
    } catch { toast.error("删除失败"); }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">加载中…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-[var(--theme-price)]" />
        <h1 className="font-display text-xl font-bold text-foreground">角色权限</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("assign")} className={`theme-rounded px-4 py-2 text-sm font-medium ${tab === "assign" ? "bg-[var(--theme-price)] text-white" : "bg-secondary text-muted-foreground"}`}>用户角色分配</button>
        <button onClick={() => setTab("manage")} className={`theme-rounded px-4 py-2 text-sm font-medium ${tab === "manage" ? "bg-[var(--theme-price)] text-white" : "bg-secondary text-muted-foreground"}`}>角色管理</button>
        <button onClick={() => setTab("admins")} className={`theme-rounded px-4 py-2 text-sm font-medium ${tab === "admins" ? "bg-[var(--theme-price)] text-white" : "bg-secondary text-muted-foreground"}`}>管理员账号</button>
      </div>

      {tab === "assign" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">为后台管理员账号分配 RBAC 角色。超级管理员角色仅超级管理员账号可分配。</p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">选择管理员</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-sm text-foreground">
              {admins.map((u) => <option key={u.id} value={u.id}>{u.nickname || u.phone} ({u.role}) · {u.phone}</option>)}
            </select>
          </div>
          <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <p className="mb-3 text-sm font-medium text-foreground">分配角色（多选）</p>
            <PermissionGate permission="role.manage" fallback={<p className="text-sm text-muted-foreground">无权限修改角色分配。</p>}>
              <ul className="space-y-2">
                {roles.map((r) => (
                  <li key={r.id} className="flex items-start gap-3">
                    <input type="checkbox" id={`role-${r.id}`} checked={!!checked[r.id]} onChange={() => toggleRole(r.id)} className="mt-1 h-4 w-4 rounded border-border" />
                    <label htmlFor={`role-${r.id}`} className="flex-1 cursor-pointer text-sm">
                      <span className="font-medium text-foreground">{r.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{r.code}</span>
                      {r.is_system ? <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">系统</span> : null}
                    </label>
                  </li>
                ))}
              </ul>
            </PermissionGate>
          </div>
          <PermissionGate permission="role.manage">
            <button type="button" onClick={() => void handleSave()} disabled={saving || !selectedUserId} className="min-h-[44px] w-full theme-rounded py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--theme-gradient)" }}>
              {saving ? "保存中…" : "保存"}
            </button>
          </PermissionGate>
        </div>
      )}

      {tab === "manage" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">管理角色定义和权限配置。系统内置角色不可删除。</p>
            <PermissionGate permission="role.manage">
              <button onClick={openRoleCreate} className="flex items-center gap-1 theme-rounded px-3 py-2 text-xs font-medium text-white" style={{ background: "var(--theme-gradient)" }}>
                <Plus size={14} /> 新建角色
              </button>
            </PermissionGate>
          </div>
          <div className="space-y-3">
            {roles.map((r) => (
              <div key={r.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.code}</span>
                    {r.is_system ? <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">系统</span> : null}
                  </div>
                  <PermissionGate permission="role.manage">
                    <div className="flex gap-1">
                      <button onClick={() => openRoleEdit(r)} className="theme-rounded p-1.5 text-muted-foreground hover:bg-[var(--theme-bg)]"><Pencil size={14} /></button>
                      {!r.is_system && <button onClick={() => void handleRoleDelete(r)} className="theme-rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>}
                    </div>
                  </PermissionGate>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.permissionIds.length} 个权限</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "admins" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">管理管理员账号。仅超级管理员可创建/禁用/重置密码。</p>
            <PermissionGate permission="role.manage">
              <button onClick={() => { setAdminForm({ phone: "", password: "", nickname: "" }); setShowAdminModal(true); }} className="flex items-center gap-1 theme-rounded px-3 py-2 text-xs font-medium text-white" style={{ background: "var(--theme-gradient)" }}>
                <Plus size={14} /> 新增管理员
              </button>
            </PermissionGate>
          </div>
          <div className="space-y-3">
            {admins.map((u) => (
              <div key={u.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 flex items-center justify-between gap-3 theme-shadow">
                <div>
                  <span className="font-medium text-foreground">{u.nickname || u.phone}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{u.phone}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${u.role === "super_admin" ? "bg-[var(--theme-price)]/20 text-[var(--theme-price)]" : "bg-secondary text-muted-foreground"}`}>{u.role}</span>
                </div>
                <PermissionGate permission="role.manage">
                  <div className="flex gap-2">
                    {u.role !== "super_admin" && (
                      <button onClick={async () => { try { await rbacService.toggleAdminUser(u.id, u.role === "disabled"); toast.success("已更新"); void reload(); } catch { toast.error("操作失败"); } }} className="theme-rounded px-2 py-1 text-xs border border-[var(--theme-border)] hover:bg-[var(--theme-bg)]">
                        {u.role === "disabled" ? "启用" : "禁用"}
                      </button>
                    )}
                    <button onClick={() => { setShowResetModal(u.id); setResetPw(""); }} className="theme-rounded px-2 py-1 text-xs border border-[var(--theme-border)] hover:bg-[var(--theme-bg)]">重置密码</button>
                  </div>
                </PermissionGate>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdminModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md theme-rounded bg-[var(--theme-surface)] p-6 theme-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">新增管理员</h3>
              <button onClick={() => setShowAdminModal(false)} className="theme-rounded p-1 hover:bg-[var(--theme-bg)]"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">手机号</label><input value={adminForm.phone} onChange={(e) => setAdminForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">密码</label><input type="password" value={adminForm.password} onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">昵称</label><input value={adminForm.nickname} onChange={(e) => setAdminForm((p) => ({ ...p, nickname: e.target.value }))} className="mt-1 w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={async () => { setSaving(true); try { await rbacService.createAdminUser({ phone: adminForm.phone, password: adminForm.password, nickname: adminForm.nickname }); toast.success("已创建"); setShowAdminModal(false); void reload(); } catch { toast.error("创建失败"); } finally { setSaving(false); } }} disabled={saving || !adminForm.phone || !adminForm.password} className="w-full theme-rounded py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--theme-gradient)" }}>
              {saving ? "创建中…" : "创建"}
            </button>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowResetModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm theme-rounded bg-[var(--theme-surface)] p-6 theme-shadow space-y-4">
            <h3 className="font-bold text-foreground">重置密码</h3>
            <input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="输入新密码（至少6位）" className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm" />
            <button onClick={async () => { if (resetPw.length < 6) { toast.error("密码至少6位"); return; } try { await rbacService.resetAdminPassword(showResetModal, resetPw); toast.success("密码已重置"); setShowResetModal(null); } catch { toast.error("重置失败"); } }} disabled={resetPw.length < 6} className="w-full theme-rounded py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--theme-gradient)" }}>确认重置</button>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRoleModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">{editRole ? "编辑角色" : "新建角色"}</h3>
              <button onClick={() => setShowRoleModal(false)} className="rounded-lg p-1 hover:bg-secondary"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">编码</label>
                <input value={roleForm.code} onChange={(e) => setRoleForm((p) => ({ ...p, code: e.target.value }))} disabled={!!editRole} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm disabled:opacity-50" placeholder="如 marketing" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">名称</label>
                <input value={roleForm.name} onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="如 市场专员" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">描述</label>
                <input value={roleForm.description} onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">权限</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {perms.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!rolePerms[p.id]} onChange={() => setRolePerms((prev) => ({ ...prev, [p.id]: !prev[p.id] }))} className="h-3.5 w-3.5 rounded border-border" />
                      <span className="text-foreground">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">{p.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => void handleRoleSave()} disabled={saving || !roleForm.code || !roleForm.name} className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
