import { useEffect, useState } from "react";
import { Plus, Loader2, UserCog, Shield, Trash2, KeyRound, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/SearchBar";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import * as rbacService from "@/services/admin/rbacService";
import type { RbacAdminUserRow } from "@/services/admin/rbacService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";

const ROLE_BADGE: Record<string, { cls: string; text: string }> = {
  super_admin: { cls: "bg-red-500/10 text-red-600", text: "超级管理员" },
  admin: { cls: "bg-blue-500/10 text-blue-600", text: "管理员" },
  disabled: { cls: "bg-muted text-muted-foreground", text: "已禁用" },
};

export default function AdminAccounts() {
  const isSuperAdminViewer = useAdminPermissionStore((s) => s.isSuperAdmin);
  const [admins, setAdmins] = useState<RbacAdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ phone: "", password: "", nickname: "" });
  const [resetTarget, setResetTarget] = useState<RbacAdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<RbacAdminUserRow | null>(null);

  const loadData = async () => {
    try {
      const data = await rbacService.loadRbacAdminUsers();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (e) { toast.error(toastErrorMessage(e, "加载管理员列表失败")); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = admins.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.phone?.toLowerCase().includes(q) || a.nickname?.toLowerCase().includes(q);
  });

  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered, 10);

  const handleCreate = async () => {
    if (!createForm.phone || !createForm.password) { toast.error("手机号和密码必填"); return; }
    try {
      await rbacService.createAdminUser({ phone: createForm.phone, password: createForm.password, nickname: createForm.nickname });
      toast.success("管理员已创建");
      setShowCreate(false);
      setCreateForm({ phone: "", password: "", nickname: "" });
      loadData();
    } catch (err) { toast.error(toastErrorMessage(err, "创建失败")); }
  };

  const handleToggle = async (user: RbacAdminUserRow) => {
    const enabled = user.role === "disabled";
    try {
      await rbacService.toggleAdminUser(user.id, enabled);
      toast.success(enabled ? "已启用" : "已禁用");
      loadData();
    } catch (err) { toast.error(toastErrorMessage(err, "操作失败")); }
  };

  const handleReset = async () => {
    if (!resetTarget || !newPassword || newPassword.length < 6) { toast.error("新密码至少6位"); return; }
    try {
      await rbacService.resetAdminPassword(resetTarget.id, newPassword);
      toast.success("密码已重置");
      setResetTarget(null);
      setNewPassword("");
    } catch (err) { toast.error(toastErrorMessage(err, "重置失败")); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await rbacService.deleteAdminUser(confirmDelete.id);
      toast.success("管理员已删除");
      setConfirmDelete(null);
      loadData();
    } catch (err) { toast.error(toastErrorMessage(err, "删除失败")); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar placeholder="搜索管理员手机号/昵称..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>
        <PermissionGate permission="role.manage">
          <button type="button" onClick={() => setShowCreate(true)} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded px-4 py-2.5 text-sm font-semibold text-white active:opacity-90" style={{ background: "var(--theme-gradient)" }}>
            <Plus size={16} /><Tx> 创建管理员
          </Tx></button>
        </PermissionGate>
      </div>

      <div className="theme-rounded border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-foreground/90 leading-relaxed">
        <p className="font-medium text-amber-800 dark:text-amber-200/90"><Tx>管理员与超级管理员</Tx></p>
        <p className="mt-1 text-muted-foreground"><Tx>
          拥有「角色权限」权限的账号可在此新增、禁用、重置密码、删除</Tx><strong className="text-foreground/80"><Tx>普通管理员</Tx></strong><Tx>（不可删除超级管理员）。
          若数据库里</Tx><strong className="text-foreground/80"><Tx>没有任何 super_admin</Tx></strong>，无法把别人设为超级管理员时，请 SSH 到服务器，在{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">server</code>{" "}
          目录执行：{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]"><Tx>node scripts/set-admin-role.js 手机号 super_admin</Tx></code>
          （详见该脚本文件顶部说明）；无可用账号时可执行{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]"><Tx>node scripts/create-admin.js 手机号 密码 super</Tx></code>。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "总管理员", value: admins.length },
          { label: "超级管理员", value: admins.filter((a) => a.role === "super_admin").length },
          { label: "普通管理员", value: admins.filter((a) => a.role === "admin").length },
          { label: "已禁用", value: admins.filter((a) => a.role === "disabled").length },
        ].map((s) => (
          <div key={s.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center theme-shadow">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
              <div className="flex gap-3">
                <div className="skeleton-base skeleton-shimmer h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton-base skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-base skeleton-shimmer h-3 w-24 rounded" />
                </div>
              </div>
            </div>
          ))
          : null}
        {!loading && paginatedData.map((a) => {
          const badge = ROLE_BADGE[a.role] || ROLE_BADGE.admin;
          return (
            <div key={a.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--theme-gradient)" }}>
                  {(a.nickname || a.phone || "?")[0]}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{a.nickname || a.phone}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.phone}</p>
                  <p className="text-[11px] text-muted-foreground">创建: {a.created_at ? new Date(a.created_at).toLocaleString("zh-CN") : "—"}</p>
                  <p className="text-[11px] text-muted-foreground">最后登录: {a.last_login_at ? new Date(a.last_login_at).toLocaleString("zh-CN") : <span className="italic text-muted-foreground/60"><Tx>从未登录</Tx></span>}</p>
                  <PermissionGate permission="role.manage">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {a.role !== "super_admin" && (
                        <>
                        <button type="button" onClick={() => handleToggle(a)} className="touch-manipulation min-h-[40px] theme-rounded border border-[var(--theme-border)] px-3 py-1.5 text-xs hover:bg-[var(--theme-bg)]">
                            {a.role === "disabled" ? <><ToggleRight size={12} className="mr-1 inline text-green-600" /><Tx>启用</Tx></> : <><ToggleLeft size={12} className="mr-1 inline" /><Tx>禁用</Tx></>}
                          </button>
                          {(a.role !== "super_admin" || isSuperAdminViewer) && (
                          <button type="button" onClick={() => { setResetTarget(a); setNewPassword(""); }} className="touch-manipulation min-h-[40px] theme-rounded border border-[var(--theme-border)] px-3 py-1.5 text-xs hover:bg-[var(--theme-bg)]">
                            <KeyRound size={12} className="mr-1 inline" /><Tx>重置密码
                          </Tx></button>
                          )}
                          <button type="button" onClick={() => setConfirmDelete(a)} className="touch-manipulation min-h-[40px] theme-rounded border border-[var(--theme-border)] px-3 py-1.5 text-xs text-destructive hover:bg-[var(--theme-bg)]">
                            <Trash2 size={12} className="mr-1 inline" /><Tx>删除
                          </Tx></button>
                        </>
                      )}
                    </div>
                  </PermissionGate>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && paginatedData.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无管理员</Tx></div>}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={paginatedData}
          rowKey={(a) => a.id}
          skeletonRows={8}
          skeletonCols={6}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="w-full min-w-[700px] text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {["管理员", "手机号", "角色", "创建时间", "最后登录", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          emptyIcon={UserCog}
          emptyTitle="暂无管理员"
          renderRow={(a) => {
            const badge = ROLE_BADGE[a.role] || ROLE_BADGE.admin;
            return (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--theme-gradient)" }}>
                      {(a.nickname || a.phone || "?")[0]}
                    </div>
                    <span className="font-medium text-foreground">{a.nickname || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">{a.phone}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleString("zh-CN") : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{a.last_login_at ? new Date(a.last_login_at).toLocaleString("zh-CN") : <span className="italic text-muted-foreground/60"><Tx>从未登录</Tx></span>}</td>
                <td className="px-4 py-3">
                  <PermissionGate permission="role.manage">
                    <div className="flex gap-1">
                      {a.role !== "super_admin" && (
                        <>
                          <button type="button" onClick={() => handleToggle(a)} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-1.5 text-muted-foreground hover:bg-[var(--theme-bg)]" title={a.role === "disabled" ? "启用" : "禁用"}>
                            {a.role === "disabled" ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} />}
                          </button>
                          {(a.role !== "super_admin" || isSuperAdminViewer) && (
                            <button type="button" onClick={() => { setResetTarget(a); setNewPassword(""); }} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-1.5 text-muted-foreground hover:bg-[var(--theme-bg)]" title="重置密码">
                              <KeyRound size={14} />
                            </button>
                          )}
                          <button type="button" onClick={() => setConfirmDelete(a)} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-1.5 text-muted-foreground hover:text-destructive hover:bg-[var(--theme-bg)]" title="删除">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {a.role === "super_admin" && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Shield size={12} /><Tx> 不可操作</Tx></span>
                      )}
                    </div>
                  </PermissionGate>
                </td>
              </>
            );
          }}
        />
      </div>
      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md theme-rounded bg-[var(--theme-surface)] p-6 theme-shadow space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-foreground"><UserCog size={18} /><Tx> 创建管理员</Tx></h3>
            <input placeholder="手机号 *" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
            <input placeholder="密码 *（至少6位）" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
            <input placeholder="昵称（可选）" value={createForm.nickname} onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })} className="w-full theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--theme-price)]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="theme-rounded border border-[var(--theme-border)] px-4 py-2.5 text-sm hover:bg-[var(--theme-bg)]"><Tx>取消</Tx></button>
              <button type="button" onClick={handleCreate} className="theme-rounded px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--theme-gradient)" }}><Tx>创建</Tx></button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResetTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground"><Tx>重置密码</Tx></h3>
            <p className="text-sm text-muted-foreground">为 {resetTarget.nickname || resetTarget.phone} 设置新密码</p>
            <input placeholder="新密码（至少6位）" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={handleReset} disabled={!newPassword || newPassword.length < 6} className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Tx>确认重置</Tx></button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle size={40} className="mx-auto text-destructive" />
            <h3 className="font-bold text-foreground"><Tx>确认删除管理员</Tx></h3>
            <p className="text-sm text-muted-foreground">将禁用 {confirmDelete.nickname || confirmDelete.phone} 的管理员权限。</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={handleDelete} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white"><Tx>确认删除</Tx></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
