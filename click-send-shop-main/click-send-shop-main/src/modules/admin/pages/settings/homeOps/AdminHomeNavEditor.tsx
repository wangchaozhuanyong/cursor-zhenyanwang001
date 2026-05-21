import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { adminConfirmDelete, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import * as homeOpsService from "@/services/admin/homeOpsService";
import * as categoryService from "@/services/admin/categoryService";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import type { HomeNavItem } from "@/types/content";
import type { Category } from "@/types/category";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { emptyNavForm, flattenCategories, moveNavItemToPosition, type NavForm } from "./homeNavUtils";
import HomeNavFormPanel from "./HomeNavFormPanel";
import HomeNavSortableList from "./HomeNavSortableList";
import { useHomeNavReorder } from "./useHomeNavReorder";

export default function AdminHomeNavEditor() {
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const capabilities = useSiteCapabilities();
  const [saving, setSaving] = useState(false);
  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [navForm, setNavForm] = useState<NavForm>(emptyNavForm);

  const supportNavEnabled = capabilities.customerServiceDownloadEnabled;

  const homeOpsQuery = useQuery({
    queryKey: adminQueryKeys.homeOpsNav(),
    queryFn: async () => {
      const [nav, cats, supportChannels] = await Promise.all([
        homeOpsService.fetchHomeNavItems(),
        categoryService.fetchCategories().catch(() => [] as Category[]),
        homeOpsService.fetchHomeNavSupportChannels().catch(() => []),
      ]);
      return { nav, categories: cats, supportChannels };
    },
    staleTime: 60_000,
  });

  const navItems = homeOpsQuery.data?.nav ?? [];
  const categories = homeOpsQuery.data?.categories ?? [];
  const supportChannels = homeOpsQuery.data?.supportChannels ?? [];
  const loading = homeOpsQuery.isLoading && !homeOpsQuery.data;
  const nextSortOrder = navItems.length + 1;

  const {
    draggingId,
    setDraggingId,
    savingOrder,
    handleDrop,
    handlePositionChange,
  } = useHomeNavReorder(navItems);

  const invalidateHomeOps = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.homeOpsNav() });

  const categoryOptions = flattenCategories(categories);
  const categoryNameMap = new Map(categoryOptions.map((c) => [c.id, c.label]));
  const supportChannelNameMap = new Map(
    supportChannels.map((c) => [c.id, `${c.name}${c.account ? ` · ${c.account}` : ""}`]),
  );

  const resetForm = () => {
    setEditingNavId(null);
    setNavForm({ ...emptyNavForm, sort_order: nextSortOrder });
  };

  const startEdit = (item: HomeNavItem) => {
    setEditingNavId(item.id);
    setNavForm({
      icon_url: item.icon_url,
      title: item.title,
      link_url: item.link_url,
      target_type: item.target_type || "url",
      target_category_id: item.target_category_id ?? null,
      target_support_channel_id: item.target_support_channel_id ?? null,
      sort_order: item.sort_order,
      enabled: item.enabled,
    });
  };

  const saveNav = async () => {
    if (!navForm.title.trim()) {
      toast.error("请填写标题");
      return;
    }
    if (navForm.target_type === "category" && !String(navForm.target_category_id || "").trim()) {
      toast.error("请选择要跳转的分类");
      return;
    }
    if (navForm.target_type === "support") {
      if (!supportNavEnabled) {
        toast.error("请先在站点能力中开启「客服/APP 页」");
        return;
      }
      if (!String(navForm.target_support_channel_id || "").trim()) {
        toast.error("请选择客服账号");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: NavForm = { ...navForm };
      if (editingNavId) {
        await homeOpsService.updateHomeNavItem(editingNavId, payload);
        const reordered = moveNavItemToPosition(navItems, editingNavId, payload.sort_order);
        const orderChanged = reordered.some(
          (item, idx) => item.id !== navItems[idx]?.id || item.sort_order !== navItems[idx]?.sort_order,
        );
        if (orderChanged) {
          await homeOpsService.sortHomeNavItems(
            reordered.map((item) => ({ id: item.id, sort_order: item.sort_order })),
          );
        }
      } else {
        await homeOpsService.createHomeNavItem({ ...payload, sort_order: nextSortOrder });
      }
      toast.success(editingNavId ? "导航已更新" : "导航已新增");
      resetForm();
      await invalidateHomeOps();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存导航失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: HomeNavItem) => {
    adminConfirmDelete(confirm, item.title || "该导航", async () => {
      try {
        await homeOpsService.deleteHomeNavItem(item.id);
        if (editingNavId === item.id) resetForm();
        await invalidateHomeOps();
        toast.success("已删除");
      } catch (e) {
        toast.error(toastErrorMessage(e, "删除失败"));
      }
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-2">
        <Grid3X3 size={18} className="text-theme-price" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground"><Tx>金刚区导航</Tx></h2>
            <AdminFieldHint text={<Tx>配置图标、标题、跳转方式、排序和启用状态。</Tx>} />
          </div>
        </div>
      </div>

      <HomeNavFormPanel
        navForm={navForm}
        setNavForm={setNavForm}
        editingNavId={editingNavId}
        saving={saving}
        onSave={saveNav}
        categoryOptions={categoryOptions}
        supportChannels={supportChannels}
        supportNavEnabled={supportNavEnabled}
        nextSortOrder={nextSortOrder}
      />

      <HomeNavSortableList
        loading={loading}
        navItems={navItems}
        categoryNameMap={categoryNameMap}
        supportChannelNameMap={supportChannelNameMap}
        draggingId={draggingId}
        savingOrder={savingOrder}
        setDraggingId={setDraggingId}
        onDrop={handleDrop}
        onEdit={startEdit}
        onDelete={handleDelete}
        onPositionChange={handlePositionChange}
      />
    </section>
  );
}
