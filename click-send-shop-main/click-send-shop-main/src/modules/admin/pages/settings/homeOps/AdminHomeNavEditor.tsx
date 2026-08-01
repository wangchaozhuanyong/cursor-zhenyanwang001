import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Grid3X3 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
import { invalidateHomeModuleSettingsCache } from "@/hooks/useHomeModuleSettings";
import {
  emptyNavForm,
  flattenCategories,
  getHomeNavValidationIssue,
  getHomeNavRepairSuggestion,
  moveNavItemToPosition,
  readHomeNavRepairScopeFromSearch,
  type HomeNavRepairSuggestion,
  type NavForm,
} from "./homeNavUtils";
import HomeNavFormPanel from "./HomeNavFormPanel";
import HomeNavSortableList from "./HomeNavSortableList";
import { useHomeNavReorder } from "./useHomeNavReorder";
import { useAdminT } from "@/hooks/useAdminT";
import { THEME_ALERT_DANGER_SHELL } from "@/utils/themeVisuals";
import AdminHomeNavRepairBar from "./AdminHomeNavRepairBar";

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
};

function serializeNavForm(value: NavForm) {
  return JSON.stringify({
    icon_url: value.icon_url || "",
    title: value.title || "",
    link_url: value.link_url || "",
    target_type: value.target_type || "url",
    target_category_id: value.target_category_id ?? null,
    target_support_channel_id: value.target_support_channel_id ?? null,
    sort_order: Number(value.sort_order || 1),
    enabled: value.enabled !== false,
  });
}

export default function AdminHomeNavEditor({ onDirtyChange }: Props) {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const capabilities = useSiteCapabilities();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [repairingNavId, setRepairingNavId] = useState<string | null>(null);
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

  const navItems = useMemo(() => homeOpsQuery.data?.nav ?? [], [homeOpsQuery.data?.nav]);
  const categories = useMemo(() => homeOpsQuery.data?.categories ?? [], [homeOpsQuery.data?.categories]);
  const supportChannels = useMemo(() => homeOpsQuery.data?.supportChannels ?? [], [homeOpsQuery.data?.supportChannels]);
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
  const publicCategoryIds = new Set(categoryOptions.map((category) => category.id));
  const enabledSupportChannelIds = new Set(supportChannels.map((channel) => channel.id));
  const navValidationIssues = new Map(
    navItems
      .filter((item) => item.enabled)
      .map((item) => [
        item.id,
        getHomeNavValidationIssue(item, {
          publicCategoryIds,
          enabledSupportChannelIds,
          supportNavEnabled,
        }),
      ] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
  const navRepairSuggestions = new Map(
    navItems
      .map((item) => [
        item.id,
        getHomeNavRepairSuggestion(item, categories, navValidationIssues.get(item.id)),
      ] as const)
      .filter((entry): entry is readonly [string, HomeNavRepairSuggestion] => Boolean(entry[1])),
  );
  const repairMode = readHomeNavRepairScopeFromSearch(`?${urlSearchParams.toString()}`) === "invalid";
  const repairQueueItems = repairMode
    ? navItems.filter((item) => (
      navValidationIssues.has(item.id) || navRepairSuggestions.has(item.id)
    ))
    : navItems;
  const firstRepairItem = repairQueueItems[0];

  const exitRepairQueue = () => {
    const next = new URLSearchParams(urlSearchParams);
    next.delete("repair_scope");
    setUrlSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (editingNavId) return;
    const pristineCreateForm =
      navForm.icon_url === ""
      && navForm.title === ""
      && navForm.link_url === ""
      && navForm.target_type === "url"
      && navForm.target_category_id == null
      && navForm.target_support_channel_id == null
      && navForm.enabled === true;
    if (!pristineCreateForm || navForm.sort_order === nextSortOrder) return;
    setNavForm((prev) => ({ ...prev, sort_order: nextSortOrder }));
  }, [editingNavId, navForm, nextSortOrder]);

  const navBaseline = useMemo<NavForm>(() => {
    if (!editingNavId) {
      return { ...emptyNavForm, sort_order: nextSortOrder };
    }
    const editingItem = navItems.find((item) => item.id === editingNavId);
    if (!editingItem) {
      return { ...emptyNavForm, sort_order: nextSortOrder };
    }
    return {
      icon_url: editingItem.icon_url,
      title: editingItem.title,
      link_url: editingItem.link_url,
      target_type: editingItem.target_type || "url",
      target_category_id: editingItem.target_category_id ?? null,
      target_support_channel_id: editingItem.target_support_channel_id ?? null,
      sort_order: editingItem.sort_order,
      enabled: editingItem.enabled,
    };
  }, [editingNavId, navItems, nextSortOrder]);
  const dirty = serializeNavForm(navForm) !== serializeNavForm(navBaseline);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

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
      toast.error(tText("请填写标题"));
      return;
    }
    if (navForm.target_type === "category" && !String(navForm.target_category_id || "").trim()) {
      toast.error(tText("请选择要跳转的分类"));
      return;
    }
    if (navForm.target_type === "support") {
      if (!supportNavEnabled) {
        toast.error(tText("请先在站点能力中开启「客服/APP 页」"));
        return;
      }
      if (!String(navForm.target_support_channel_id || "").trim()) {
        toast.error(tText("请选择客服账号"));
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
      invalidateHomeModuleSettingsCache();
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
        invalidateHomeModuleSettingsCache();
        await invalidateHomeOps();
        toast.success(tText("已删除"));
      } catch (e) {
        toast.error(toastErrorMessage(e, "删除失败"));
      }
    });
  };

  const applyRepairSuggestion = (item: HomeNavItem, suggestion: HomeNavRepairSuggestion) => {
    confirm({
      title: suggestion.label,
      description: suggestion.description,
      confirmText: "确认修复",
      onConfirm: async () => {
        setRepairingNavId(item.id);
        try {
          await homeOpsService.updateHomeNavItem(item.id, suggestion.payload);
          invalidateHomeModuleSettingsCache();
          await Promise.all([
            invalidateHomeOps(),
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.storefrontReadiness() }),
          ]);
          toast.success(tText("入口已按建议修复"));
        } catch (error) {
          toast.error(toastErrorMessage(error, "修复入口失败"));
        } finally {
          setRepairingNavId(null);
        }
      },
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-2">
        <Grid3X3 size={18} className="text-theme-price" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground"><Tx>快捷入口</Tx></h2>
            <AdminFieldHint text={<Tx>配置图标、标题、跳转方式、排序和启用状态。</Tx>} />
          </div>
        </div>
      </div>

      {repairMode ? (
        <AdminHomeNavRepairBar
          total={repairQueueItems.length}
          firstItemTitle={firstRepairItem?.title || ""}
          loading={loading}
          onStart={() => {
            if (!firstRepairItem) return;
            const suggestion = navRepairSuggestions.get(firstRepairItem.id);
            if (suggestion) {
              applyRepairSuggestion(firstRepairItem, suggestion);
              return;
            }
            startEdit(firstRepairItem);
          }}
          onExit={exitRepairQueue}
        />
      ) : null}

      {!repairMode || editingNavId ? (
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
      ) : null}

      {navValidationIssues.size > 0 ? (
        <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${THEME_ALERT_DANGER_SHELL}`} role="alert">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">
              发现 {navValidationIssues.size} 个已启用入口需要修复
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              这些入口不会出现在新客户端。请编辑为有效目标，或者暂时禁用。
            </p>
          </div>
        </div>
      ) : null}

      <HomeNavSortableList
        loading={loading}
        navItems={repairQueueItems}
        categoryNameMap={categoryNameMap}
        supportChannelNameMap={supportChannelNameMap}
        validationIssues={navValidationIssues}
        repairSuggestions={navRepairSuggestions}
        repairingNavId={repairingNavId}
        draggingId={draggingId}
        savingOrder={savingOrder}
        setDraggingId={setDraggingId}
        onDrop={handleDrop}
        onEdit={startEdit}
        onDelete={handleDelete}
        onApplySuggestion={applyRepairSuggestion}
        onPositionChange={handlePositionChange}
        repairMode={repairMode}
      />
    </section>
  );
}
