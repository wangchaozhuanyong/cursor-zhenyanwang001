import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tx } from "@/components/admin/AdminText";
import { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
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
import PermissionGate from "@/components/admin/PermissionGate";
import * as categoryService from "@/services/admin/categoryService";
import * as uploadService from "@/services/uploadService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { ensureTransparentIconFile } from "@/utils/imageTransparency";
import { iconMatteProgressToast, iconMatteSuccessToast } from "@/utils/iconMatteMessages";
import type { Category } from "@/types/category";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_TABLE_ALIGN_LEFT_CLASS,
  adminDataGridClassName,
} from "@/utils/adminTableClasses";
import {
  THEME_BADGE_MUTED,
  THEME_BADGE_SUCCESS,
  THEME_HOVER_BG_DANGER,
  THEME_HOVER_TEXT_DANGER,
  THEME_TEXT_SUCCESS_SOFT,
} from "@/utils/themeVisuals";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";

type CategoryForm = {
  name: string;
  description: string;
  buying_guide: string;
  faq_text: string;
  seo_title: string;
  seo_description: string;
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
  description: "",
  buying_guide: "",
  faq_text: "",
  seo_title: "",
  seo_description: "",
  icon: "",
  icon_url: "",
  parent_id: "",
  sort_order: 0,
  is_visible: true,
};

function serializeCategoryForm(value: CategoryForm) {
  return JSON.stringify({
    name: value.name,
    description: value.description,
    buying_guide: value.buying_guide,
    faq_text: value.faq_text,
    seo_title: value.seo_title,
    seo_description: value.seo_description,
    icon: value.icon,
    icon_url: value.icon_url,
    parent_id: value.parent_id,
    sort_order: Number(value.sort_order || 0),
    is_visible: value.is_visible !== false,
  });
}

function formatCategoryFaq(faq: Category["faq"] = []) {
  return faq.map((item) => `${item.question}：${item.answer}`).join("\n");
}

function parseCategoryFaqText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const splitAt = line.indexOf("：") >= 0 ? line.indexOf("：") : line.indexOf(":");
      if (splitAt < 0) return null;
      return {
        question: line.slice(0, splitAt).trim(),
        answer: line.slice(splitAt + 1).trim(),
      };
    })
    .filter((item): item is { question: string; answer: string } => Boolean(item?.question && item?.answer));
}

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

function categorySubtitle(
  cat: FlatCategory,
  nameById: Map<string, string>,
  tText: (zh: string) => string,
): string {
  const levelLabel = LEVEL_LABELS[cat.level] ? tText(LEVEL_LABELS[cat.level]) : tText(`第 ${cat.level + 1} 级`);
  const parentId = cat.parent_id;
  if (parentId) {
    const parentName = nameById.get(parentId);
    if (parentName) return `${levelLabel} · ${tText("上级")}：${parentName}`;
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

function CategoryContentFields({
  value,
  onChange,
}: {
  value: CategoryForm;
  onChange: (patch: Partial<CategoryForm>) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类介绍</Tx></label>
        <textarea
          rows={3}
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="说明这个分类适合谁、主要提供什么商品或服务。"
          className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>选购 / 咨询说明</Tx></label>
        <textarea
          rows={3}
          value={value.buying_guide}
          onChange={(e) => onChange({ buying_guide: e.target.value })}
          placeholder="写清楚咨询前要准备什么、如何确认库存/地区/服务细节。"
          className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类 FAQ</Tx></label>
        <textarea
          rows={4}
          value={value.faq_text}
          onChange={(e) => onChange({ faq_text: e.target.value })}
          placeholder="每行一个问题：答案。例如：可以保证通过吗？：不能保证，需以主管部门审核结果为准。"
          className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
        />
      </div>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>SEO Title</Tx></label>
          <input
            value={value.seo_title}
            onChange={(e) => onChange({ seo_title: e.target.value })}
            placeholder="留空则使用 分类名｜站点名"
            className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>Meta Description</Tx></label>
          <textarea
            rows={2}
            value={value.seo_description}
            onChange={(e) => onChange({ seo_description: e.target.value })}
            placeholder="150 字以内，说明分类内容、适合人群和咨询方式。"
            className="w-full resize-none rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const { tText } = useAdminT();
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
  const editingCategory = useMemo(
    () => (editingId ? allRows.find((row) => row.id === editingId) ?? null : null),
    [allRows, editingId],
  );
  const editBaseline = useMemo<CategoryForm>(() => (
    editingCategory
      ? {
          name: editingCategory.name,
          description: editingCategory.description || "",
          buying_guide: editingCategory.buying_guide || "",
          faq_text: formatCategoryFaq(editingCategory.faq),
          seo_title: editingCategory.seo_title || "",
          seo_description: editingCategory.seo_description || "",
          icon: editingCategory.icon || "",
          icon_url: editingCategory.icon_url || "",
          parent_id: editingCategory.parent_id || "",
          sort_order: editingCategory.sort_order || 0,
          is_visible: editingCategory.is_visible !== false,
        }
      : EMPTY_FORM
  ), [editingCategory]);
  const createDirty = showForm && serializeCategoryForm(formData) !== serializeCategoryForm(EMPTY_FORM);
  const editDirty = !!editingId && serializeCategoryForm(editData) !== serializeCategoryForm(editBaseline);
  useAdminTabDirty(createDirty || editDirty);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeCreateForm = () => {
    setShowForm(false);
    setFormData(EMPTY_FORM);
  };

  const closeEditForm = () => {
    setEditingId(null);
    setEditData(EMPTY_FORM);
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
      toast.error(tText("请填写分类名称"));
      return;
    }
    setSaving(true);
    try {
      await categoryService.createCategory({
        name: formData.name.trim(),
        description: formData.description.trim(),
        buying_guide: formData.buying_guide.trim(),
        faq: parseCategoryFaqText(formData.faq_text),
        seo_title: formData.seo_title.trim(),
        seo_description: formData.seo_description.trim(),
        icon: formData.icon.trim(),
        icon_url: formData.icon_url.trim(),
        parent_id: formData.parent_id || null,
        sort_order: formData.sort_order,
        is_visible: formData.is_visible,
      });
      closeCreateForm();
      toast.success(tText("分类已添加"));
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
      description: cat.description || "",
      buying_guide: cat.buying_guide || "",
      faq_text: formatCategoryFaq(cat.faq),
      seo_title: cat.seo_title || "",
      seo_description: cat.seo_description || "",
      icon: cat.icon || "",
      icon_url: cat.icon_url || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order || 0,
      is_visible: cat.is_visible !== false,
    });
  };

  const handleEditSave = async (id: string) => {
    if (!editData.name.trim()) {
      toast.error(tText("分类名称不能为空"));
      return;
    }
    setSaving(true);
    try {
      await categoryService.updateCategory(id, {
        name: editData.name.trim(),
        description: editData.description.trim(),
        buying_guide: editData.buying_guide.trim(),
        faq: parseCategoryFaqText(editData.faq_text),
        seo_title: editData.seo_title.trim(),
        seo_description: editData.seo_description.trim(),
        icon: editData.icon.trim(),
        icon_url: editData.icon_url.trim(),
        parent_id: editData.parent_id || null,
        sort_order: editData.sort_order,
        is_visible: editData.is_visible,
      });
      closeEditForm();
      toast.success(tText("分类已更新"));
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
      toast.success(tText("分类已删除"));
      if (editingId === deleteTarget.id) {
        closeEditForm();
      }
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
      toast.error(tText("当前仅支持同级分类内拖拽排序"));
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
      toast.success(tText("排序已保存"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "排序保存失败"));
      await invalidateCategories();
    }
  };

  const renderIcon = (cat: Category) => {
    if (cat.icon_url) return <img src={cat.icon_url} alt={`${cat.name || "分类"} 分类图标`} className="h-12 w-12 object-contain object-center" />;
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
    <AdminPageShell
      hint={<Tx>支持最多 3 级分类；有子分类或已关联商品的分类禁止删除。</Tx>}
      toolbar={(
        <PermissionGate permission="category.manage">
          <button
            onClick={() => (showForm ? closeCreateForm() : setShowForm(true))}
            className="flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} /><Tx> 新增分类</Tx>
          </button>
        </PermissionGate>
      )}
    >
      {showForm && (
        <div className="rounded-xl border border-gold/30 bg-card p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_120px_1fr_180px_90px_120px_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类名称</Tx></label>
              <input
                placeholder={tText("输入分类名称")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>符号图标</Tx></label>
              <input
                placeholder={tText("如 🛍️")}
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
                  placeholder={tText("可粘贴 URL 或上传")}
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
              <button onClick={closeCreateForm} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground"><Tx>
                取消
              </Tx></button>
            </div>
          </div>
          <CategoryContentFields
            value={formData}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className={adminDataGridClassName("hidden grid-cols-[1fr_100px_90px_110px_120px] gap-3 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground md:grid")}>
          <span><Tx>分类</Tx></span>
          <span><Tx>商品数</Tx></span>
          <span><Tx>显示</Tx></span>
          <span><Tx>排序</Tx></span>
          <span><Tx>操作</Tx></span>
        </div>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={adminDataGridClassName("hidden grid-cols-[1fr_100px_90px_110px_120px] gap-3 border-b border-border px-4 py-3 md:grid")}>
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
              className={adminDataGridClassName(`border-b border-border px-3 py-2.5 text-sm md:grid md:grid-cols-[1fr_100px_90px_110px_120px] md:gap-3 md:px-4 ${
                draggingId === cat.id ? "bg-secondary/70 opacity-70" : ""
              }`)}
            >
              <div className={`flex min-w-0 items-center gap-2 ${ADMIN_TABLE_ALIGN_LEFT_CLASS}`} style={{ paddingLeft: cat.level * 24 }}>
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
                        placeholder={tText("符号")}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          value={editData.icon_url}
                          onChange={(e) => setEditData({ ...editData, icon_url: e.target.value })}
                          placeholder={tText("图标 URL（建议 128×128 正方形）")}
                          className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none"
                        />
                        <label className="flex cursor-pointer items-center rounded-lg border border-border px-2 text-muted-foreground hover:text-foreground">
                          <Upload size={14} />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadIcon(e.target.files[0], "edit")} />
                        </label>
                      </div>
                    </div>
                    {parentSelect(editData.parent_id, (v) => setEditData({ ...editData, parent_id: v }), cat.id)}
                    <CategoryContentFields
                      value={editData}
                      onChange={(patch) => setEditData((prev) => ({ ...prev, ...patch }))}
                    />
                  </div>
                ) : (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-2"
                    title={[cat.name, categorySubtitle(cat, categoryNameById, tText), cat.id].join("\n")}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{cat.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                          {categorySubtitle(cat, categoryNameById, tText)}
                        </span>
                      </div>
                      {cat.description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{cat.description}</p> : null}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-3 md:mt-0 md:contents md:border-0 md:pt-0">
              <span className="text-xs text-muted-foreground"><span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground/80 md:hidden">商品</span>{cat.productCount ?? 0}</span>
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
              <div className="flex justify-center gap-1">
                {isEditing ? (
                  <>
                    <PermissionGate permission="category.manage">
                      <button onClick={() => handleEditSave(cat.id)} className={`rounded-md p-1.5 hover:bg-[color-mix(in_srgb,var(--theme-success)_10%,var(--theme-surface))] ${THEME_TEXT_SUCCESS_SOFT}`}>
                        <Check size={14} />
                      </button>
                    </PermissionGate>
                    <button onClick={closeEditForm} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
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
            </div>
          );
        })}
        {flatRows.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无分类</Tx></div>}
      </div>
      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title={tText("删除分类")}
        description={deleteTarget ? `确定删除分类「${deleteTarget.name}」？` : ""}
        confirmText="删除"
        onConfirm={confirmDeleteCategory}
      />
    </AdminPageShell>
  );
}
