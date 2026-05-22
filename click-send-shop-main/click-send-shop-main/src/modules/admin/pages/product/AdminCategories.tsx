import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tx } from "@/components/admin/AdminText";
import { AdminLabelWithHint, AdminPageTitle } from "@/components/admin/AdminFieldHint";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import PermissionGate from "@/components/admin/PermissionGate";
import * as categoryService from "@/services/admin/categoryService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { ensureTransparentIconFile } from "@/utils/imageTransparency";
import { iconMatteProgressToast, iconMatteSuccessToast } from "@/utils/iconMatteMessages";
import type { Category } from "@/types/category";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import {
  THEME_BADGE_MUTED,
  THEME_BADGE_SUCCESS,
  THEME_HOVER_BG_DANGER,
  THEME_HOVER_TEXT_DANGER,
  THEME_TEXT_SUCCESS_SOFT,
} from "@/utils/themeVisuals";

type CategoryForm = {
  name: string;
  icon: string;
  icon_url: string;
  parent_id: string;
  sort_order: number;
  is_visible: boolean;
};

type FlatCategory = Category & {
  level: number;
  children: Category[];
};

const EMPTY_FORM: CategoryForm = {
  name: "",
  icon: "",
  icon_url: "",
  parent_id: "",
  sort_order: 0,
  is_visible: true,
};

function flattenTree(nodes: Category[], expanded: Set<string>, level = 0): FlatCategory[] {
  return nodes.flatMap((node) => {
    const children = node.children || [];
    const row: FlatCategory = { ...node, children, level };
    if (!expanded.has(node.id)) return [row];
    return [row, ...flattenTree(children, expanded, level + 1)];
  });
}

function flattenAll(nodes: Category[], level = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { ...node, children: node.children || [], level },
    ...flattenAll(node.children || [], level + 1),
  ]);
}

function siblingSortPayload(nodes: Category[], parentId: string | null) {
  return nodes.map((node, index) => ({
    id: node.id,
    parent_id: parentId,
    sort_order: index,
  }));
}

const LEVEL_LABELS = ["一级分类", "二级分类", "三级分类"] as const;

function categorySubtitle(cat: FlatCategory, nameById: Map<string, string>): string {
  const levelLabel = LEVEL_LABELS[cat.level] ?? `第 ${cat.level + 1} 级`;
  const parentId = cat.parent_id;
  if (parentId) {
    const parentName = nameById.get(parentId);
    if (parentName) return `${levelLabel} · 上级：${parentName}`;
  }
  return levelLabel;
}

function reorderSiblings(nodes: Category[], draggedId: string, targetId: string): { tree: Category[]; payload: ReturnType<typeof siblingSortPayload> | null } {
  let resultPayload: ReturnType<typeof siblingSortPayload> | null = null;
  const walk = (list: Category[], parentId: string | null): Category[] => {
    const idxA = list.findIndex((x) => x.id === draggedId);
    const idxB = list.findIndex((x) => x.id === targetId);
    if (idxA >= 0 || idxB >= 0) {
      if (idxA < 0 || idxB < 0) return list;
      const next = [...list];
      const [moved] = next.splice(idxA, 1);
      next.splice(idxB, 0, moved);
      resultPayload = siblingSortPayload(next, parentId);
      return next.map((node, index) => ({ ...node, sort_order: index }));
    }
    return list.map((node) => ({
      ...node,
      children: walk(node.children || [], node.id),
    }));
  };

  const tree = walk(nodes, null);
  return { tree, payload: resultPayload };
}

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const expandedInitialized = useRef(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CategoryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<CategoryForm>(EMPTY_FORM);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categoriesQuery = useQuery({
    queryKey: adminQueryKeys.categories(),
    queryFn: categoryService.fetchCategories,
    staleTime: 60_000,
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const loading = categoriesQuery.isLoading && !categoriesQuery.data;

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.categories() });

  useEffect(() => {
    if (!categories.length || expandedInitialized.current) return;
    expandedInitialized.current = true;
    setExpanded(new Set(categories.map((x) => x.id)));
  }, [categories]);

  const flatRows = useMemo(() => flattenTree(categories, expanded), [categories, expanded]);
  const allRows = useMemo(() => flattenAll(categories), [categories]);
  const parentOptions = useMemo(() => allRows.filter((x) => x.level < 2), [allRows]);
  const categoryNameById = useMemo(() => new Map(allRows.map((row) => [row.id, row.name])), [allRows]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadIcon = async (file: File, target: "create" | "edit") => {
    try {
      const matteToastId = "category-icon-matte";
      const { file: prepared, autoMatted, method } = await ensureTransparentIconFile(file, {
        onProgress: (message) => {
          toast.loading(message, { id: matteToastId });
        },
      });
      if (autoMatted) toast.info(iconMatteProgressToast(method, "done"), { id: matteToastId });
      else toast.dismiss(matteToastId);
      const res = await uploadService.uploadSingle(prepared, { mode: "thumb" });
      const url = res.url || "";
      if (!url) throw new Error("服务器未返回图片地址");
      if (target === "create") setFormData((f) => ({ ...f, icon_url: url }));
      else setEditData((f) => ({ ...f, icon_url: url }));
      toast.success(autoMatted ? iconMatteSuccessToast(method) : "图标已上传");
    } catch (e) {
      toast.error(toastErrorMessage(e, "上传失败"));
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("请填写分类名称");
      return;
    }
    setSaving(true);
    try {
      await categoryService.createCategory({
        name: formData.name.trim(),
        icon: formData.icon.trim(),
        icon_url: formData.icon_url.trim(),
        parent_id: formData.parent_id || null,
        sort_order: formData.sort_order,
        is_visible: formData.is_visible,
      });
      setShowForm(false);
      setFormData(EMPTY_FORM);
      toast.success("分类已添加");
      await invalidateCategories();
    } catch (e) {
      toast.error(toastErrorMessage(e, "添加失败"));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditData({
      name: cat.name,
      icon: cat.icon || "",
      icon_url: cat.icon_url || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order || 0,
      is_visible: cat.is_visible !== false,
    });
  };

  const handleEditSave = async (id: string) => {
    if (!editData.name.trim()) {
      toast.error("分类名称不能为空");
      return;
    }
    setSaving(true);
    try {
      await categoryService.updateCategory(id, {
        name: editData.name.trim(),
        icon: editData.icon.trim(),
        icon_url: editData.icon_url.trim(),
        parent_id: editData.parent_id || null,
        sort_order: editData.sort_order,
        is_visible: editData.is_visible,
      });
      setEditingId(null);
      toast.success("分类已更新");
      await invalidateCategories();
    } catch (e) {
      toast.error(toastErrorMessage(e, "更新失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleVisibleToggle = async (cat: Category) => {
    try {
      await categoryService.updateCategory(cat.id, { is_visible: cat.is_visible === false });
      await invalidateCategories();
      toast.success(cat.is_visible === false ? "分类已显示" : "分类已隐藏");
    } catch (e) {
      toast.error(toastErrorMessage(e, "状态更新失败"));
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      await categoryService.deleteCategory(deleteTarget.id);
      toast.success("分类已删除");
      setDeleteTarget(null);
      await invalidateCategories();
    } catch (e) {
      toast.error(toastErrorMessage(e, "删除失败"));
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const dragged = allRows.find((x) => x.id === draggingId);
    const target = allRows.find((x) => x.id === targetId);
    if (!dragged || !target || (dragged.parent_id || "") !== (target.parent_id || "")) {
      toast.error("当前仅支持同级分类内拖拽排序");
      setDraggingId(null);
      return;
    }
    const { tree, payload } = reorderSiblings(categories, draggingId, targetId);
    if (!payload) {
      setDraggingId(null);
      return;
    }
    queryClient.setQueryData(adminQueryKeys.categories(), tree);
    setDraggingId(null);
    try {
      await categoryService.updateCategorySort(payload);
      toast.success("排序已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "排序保存失败"));
      await invalidateCategories();
    }
  };

  const renderIcon = (cat: Category) => {
    if (cat.icon_url) return <img src={cat.icon_url} alt="" className="h-12 w-12 object-contain object-center" />;
    if (cat.icon) return <span className="text-xl leading-none">{cat.icon}</span>;
    return <ImageIcon size={18} className="text-muted-foreground" />;
  };

  const parentSelect = (value: string, onChange: (v: string) => void, disabledId?: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[180px] rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
    >
      <option value=""><Tx>一级分类</Tx></option>
      {parentOptions
        .filter((item) => item.id !== disabledId)
        .map((item) => (
          <option key={item.id} value={item.id}>
            {"　".repeat(item.level)}
            {item.name}
          </option>
        ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AdminPageTitle
            title={<Tx>分类管理</Tx>}
            hint={<Tx>支持最多 3 级分类；有子分类或已关联商品的分类禁止删除。</Tx>}
            className="text-lg [&_h1]:text-lg [&_h1]:font-semibold"
          />
        </div>
        <PermissionGate permission="category.manage">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /><Tx> 新增分类
          </Tx></button>
        </PermissionGate>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gold/30 bg-card p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_120px_1fr_180px_90px_120px_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类名称</Tx></label>
              <input
                placeholder="输入分类名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>符号图标</Tx></label>
              <input
                placeholder="如 🛍️"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <AdminLabelWithHint
                label={<Tx>图标 URL</Tx>}
                hint={<Tx>建议 128×128 正方形；无透明通道时将自动 AI 抠图。</Tx>}
              />
              <div className="flex gap-2">
                <input
                  placeholder="可粘贴 URL 或上传"
                  value={formData.icon_url}
                  onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
                />
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-border px-3 text-muted-foreground hover:text-foreground">
                  <Upload size={14} />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadIcon(e.target.files[0], "create")} />
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>父级分类</Tx></label>
              {parentSelect(formData.parent_id, (v) => setFormData({ ...formData, parent_id: v }))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>排序</Tx></label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="accent-gold"
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              /><Tx>
              前台显示
            </Tx></label>
            <div className="flex gap-2">
              <PermissionGate permission="category.manage">
                <LoadingButton
                  type="button"
                  variant="gold"
                  state={saving ? "loading" : "normal"}
                  loadingText="添加中..."
                  onClick={() => void handleAdd()}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                ><Tx>
                  添加
                </Tx></LoadingButton>
              </PermissionGate>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground"><Tx>
                取消
              </Tx></button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_100px_90px_110px_120px] gap-3 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
          <span><Tx>分类</Tx></span>
          <span><Tx>商品数</Tx></span>
          <span><Tx>显示</Tx></span>
          <span><Tx>排序</Tx></span>
          <span className="text-right"><Tx>操作</Tx></span>
        </div>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_90px_110px_120px] items-center gap-3 border-b border-border px-4 py-3">
              <div className="skeleton-base skeleton-shimmer h-9 w-48 rounded-lg" />
              <div className="skeleton-base skeleton-shimmer h-4 w-12 rounded" />
              <div className="skeleton-base skeleton-shimmer h-4 w-10 rounded" />
              <div className="skeleton-base skeleton-shimmer h-4 w-8 rounded" />
              <div className="skeleton-base skeleton-shimmer h-8 w-20 rounded-lg justify-self-end" />
            </div>
          ))
          : flatRows.map((cat, i) => {
          const hasChildren = cat.children.length > 0;
          const isEditing = editingId === cat.id;
          return (
            <div
              key={cat.id}
              draggable={!isEditing}
              onDragStart={() => setDraggingId(cat.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.id)}
              className={`grid grid-cols-[1fr_100px_90px_110px_120px] items-center gap-3 px-4 py-3 text-sm ${
                i < flatRows.length - 1 ? "border-b border-border" : ""
              } ${draggingId === cat.id ? "bg-secondary/70 opacity-70" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: cat.level * 24 }}>
                <GripVertical size={15} className="shrink-0 cursor-grab text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => hasChildren && toggleExpand(cat.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-secondary"
                >
                  {hasChildren ? (expanded.has(cat.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="h-3 w-3" />}
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                  {renderIcon(cat)}
                </div>
                {isEditing ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid gap-2 md:grid-cols-[1fr_80px_1fr]">
                      <input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        autoFocus
                        className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
                      />
                      <input
                        value={editData.icon}
                        onChange={(e) => setEditData({ ...editData, icon: e.target.value })}
                        placeholder="符号"
                        className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          value={editData.icon_url}
                          onChange={(e) => setEditData({ ...editData, icon_url: e.target.value })}
                          placeholder="图标 URL（建议 128×128 正方形）"
                          className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
                        />
                        <label className="flex cursor-pointer items-center rounded-lg border border-border px-2 text-muted-foreground hover:text-foreground">
                          <Upload size={14} />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadIcon(e.target.files[0], "edit")} />
                        </label>
                      </div>
                    </div>
                    {parentSelect(editData.parent_id, (v) => setEditData({ ...editData, parent_id: v }), cat.id)}
                  </div>
                ) : (
                  <div className="min-w-0">
                    <AdminTableCellGroup
                      maxWidth="14rem"
                      lines={[
                        { text: cat.name },
                        { text: categorySubtitle(cat, categoryNameById), muted: true },
                      ]}
                      tooltipLines={[cat.name, categorySubtitle(cat, categoryNameById), cat.id]}
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{cat.productCount ?? 0}</span>
              <PermissionGate permission="category.manage">
                <button
                  type="button"
                  onClick={() => handleVisibleToggle(cat)}
                  className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                    cat.is_visible === false ? THEME_BADGE_MUTED : THEME_BADGE_SUCCESS
                  }`}
                >
                  {cat.is_visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                  {cat.is_visible === false ? "隐藏" : "显示"}
                </button>
              </PermissionGate>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.sort_order}
                  onChange={(e) => setEditData({ ...editData, sort_order: Number(e.target.value) })}
                  className="w-20 rounded-lg bg-secondary px-2 py-1.5 text-xs outline-none"
                />
              ) : (
                <span className="text-xs text-muted-foreground">{cat.sort_order ?? 0}</span>
              )}
              <div className="flex justify-end gap-1">
                {isEditing ? (
                  <>
                    <PermissionGate permission="category.manage">
                      <button onClick={() => handleEditSave(cat.id)} className={`rounded-md p-1.5 hover:bg-[color-mix(in_srgb,var(--theme-success)_10%,var(--theme-surface))] ${THEME_TEXT_SUCCESS_SOFT}`}>
                        <Check size={14} />
                      </button>
                    </PermissionGate>
                    <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <PermissionGate permission="category.manage">
                      <button onClick={() => startEdit(cat)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <Pencil size={14} />
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="category.manage">
                      <button onClick={() => setDeleteTarget(cat)} className={`rounded-md p-1.5 text-muted-foreground ${THEME_HOVER_BG_DANGER} ${THEME_HOVER_TEXT_DANGER}`}>
                        <Trash2 size={14} />
                      </button>
                    </PermissionGate>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {flatRows.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无分类</Tx></div>}
      </div>
      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title="删除分类"
        description={deleteTarget ? `确定删除分类「${deleteTarget.name}」？` : ""}
        confirmText="删除"
        onConfirm={confirmDeleteCategory}
      />
    </div>
  );
}
