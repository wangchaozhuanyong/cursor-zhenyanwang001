import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import PermissionGate from "@/components/admin/PermissionGate";
import { IMAGE_UPLOAD_HINT_API, IMAGE_UPLOAD_HINT_HOME_NAV_ICON } from "@/constants/imageUploadHints";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import * as uploadService from "@/services/uploadService";
import { validateUploadFile } from "@/services/uploadService";
import { ensureTransparentIconFile } from "@/utils/imageTransparency";
import { iconMatteProgressToast, iconMatteSuccessToast } from "@/utils/iconMatteMessages";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { HomeNavSupportChannelOption } from "@/services/admin/homeOpsService";
import type { NavForm } from "./homeNavUtils";
import { buildSupportNavLink } from "./homeNavUtils";
import HomeNavIconPreview from "./HomeNavIconPreview";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  navForm: NavForm;
  setNavForm: React.Dispatch<React.SetStateAction<NavForm>>;
  editingNavId: string | null;
  saving: boolean;
  onSave: () => void | Promise<void>;
  categoryOptions: Array<{ id: string; label: string }>;
  supportChannels: HomeNavSupportChannelOption[];
  supportNavEnabled: boolean;
  nextSortOrder: number;
};

const fieldClassName = "flex min-w-0 flex-col gap-1";
const fieldLabelClassName = "flex h-5 items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground";
const controlClassName = "h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]";
const readonlyControlClassName = "flex h-11 w-full min-w-0 items-center rounded-xl border border-dashed border-border bg-background/40 px-3 text-sm text-muted-foreground";

export default function HomeNavFormPanel({
  navForm,
  setNavForm,
  editingNavId,
  saving,
  onSave,
  categoryOptions,
  supportChannels,
  supportNavEnabled,
  nextSortOrder,
}: Props) {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const supportTypeLabels: Record<string, string> = isEn
    ? { wechat: "WeChat", whatsapp: "WhatsApp", telegram: "Telegram" }
    : { wechat: "微信", whatsapp: "WhatsApp", telegram: "Telegram" };
  const { confirm } = useAdminConfirm();
  const [navIconUploading, setNavIconUploading] = useState(false);
  const navIconFileRef = useRef<HTMLInputElement>(null);

  const onNavIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNavIconUploading(true);
    try {
      validateUploadFile(file, "thumb");
      const matteToastId = "home-nav-icon-matte";
      const { file: prepared, autoMatted, method: matteMethod } = await ensureTransparentIconFile(file, {
        onProgress: (message) => {
          toast.loading(message, { id: matteToastId });
        },
      });
      if (autoMatted) toast.info(iconMatteProgressToast(matteMethod, "done"), { id: matteToastId });
      else toast.dismiss(matteToastId);
      const { url } = await uploadService.uploadSingleWithProgress(prepared, { mode: "thumb", timeoutMs: 45000 });
      setNavForm((prev) => ({ ...prev, icon_url: url }));
      toast.success(
        autoMatted
          ? `${iconMatteSuccessToast(matteMethod)}${isEn ? ", please save to apply." : "，请保存生效。"}`
          : L("图标上传成功，请保存生效。", "Icon uploaded successfully. Please save to apply."),
      );
    } catch (err) {
      toast.error(toastErrorMessage(err, L("图标上传失败", "Failed to upload icon")));
    } finally {
      setNavIconUploading(false);
    }
  };

  const targetValueLabel =
    navForm.target_type === "category"
      ? L("目标分类", "Target category")
      : navForm.target_type === "support"
        ? L("客服账号", "Support account")
        : navForm.target_type === "categories"
          ? L("跳转内容", "Destination")
          : L("跳转地址", "链接地址（URL）");
  const targetValueHint =
    navForm.target_type === "categories"
      ? L("将跳转到分类 Tab 的全部分类列表（/categories）", "Will go to the full category list tab (/categories)")
      : navForm.target_type === "category"
        ? L("将自动跳转到对应分类页", "Will automatically jump to the matching category page")
        : navForm.target_type === "support"
          ? supportNavEnabled
            ? L(
                "账号在「页面装修 → 客服与安装」中维护，仅显示已启用账号",
                'Accounts are managed in "Page Design → Support & Install" and only enabled accounts are shown',
              )
            : L("请先在站点能力中开启「客服/APP 页」", 'Please enable the "Support/App Page" capability first')
          : L("支持站内路径和完整 URL", "Supports internal paths and full URLs");
  const targetValueControl =
    navForm.target_type === "category" ? (
      <select
        className={controlClassName}
        value={navForm.target_category_id || ""}
        onChange={(e) => {
          const id = e.target.value || null;
          setNavForm((prev) => ({
            ...prev,
            target_category_id: id,
            link_url: id ? `/categories?cat=${id}` : prev.link_url,
          }));
        }}
      >
        <option value="">{L("请选择分类", "Select a category")}</option>
        {categoryOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    ) : navForm.target_type === "support" ? (
      <select
        className={controlClassName}
        value={navForm.target_support_channel_id || ""}
        onChange={(e) => {
          const id = e.target.value || null;
          setNavForm((prev) => ({
            ...prev,
            target_support_channel_id: id,
            link_url: id ? buildSupportNavLink(id) : "",
          }));
        }}
      >
        <option value="">{L("请选择客服账号", "Select a support account")}</option>
        {supportChannels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            {channel.name}
            {channel.account ? ` · ${channel.account}` : ""}
            {` (${supportTypeLabels[channel.type] || channel.type})`}
          </option>
        ))}
      </select>
    ) : navForm.target_type === "categories" ? (
      <div className={readonlyControlClassName}>
        <span className="truncate">{L("全部分类（/categories）", "All categories (/categories)")}</span>
      </div>
    ) : (
      <input
        className={controlClassName}
        placeholder={L("/categories 或 https://...", "/categories or https://...")}
        value={navForm.link_url}
        onChange={(e) => setNavForm({ ...navForm, link_url: e.target.value })}
      />
    );

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(12rem,1.2fr)_minmax(9rem,.75fr)_minmax(11rem,.9fr)_minmax(13rem,1fr)_minmax(6rem,.55fr)_minmax(5.75rem,.5fr)_minmax(5rem,auto)] xl:items-start">
      <label className={`${fieldClassName} md:col-span-2 xl:col-span-1`}>
        <span className={fieldLabelClassName}>
          <span>{L("图标", "Icon")}</span>
          <AdminFieldHint
            contentClassName="max-w-sm"
            text={
              <>
                {IMAGE_UPLOAD_HINT_HOME_NAV_ICON} {IMAGE_UPLOAD_HINT_API}
              </>
            }
          />
        </span>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-stretch gap-2">
          <input
            className={controlClassName}
            placeholder={L("支持图片 URL、站内路径或 Emoji", "链接地址（URL）")}
            value={navForm.icon_url}
            onChange={(e) => setNavForm({ ...navForm, icon_url: e.target.value })}
          />
          <input
            ref={navIconFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(ev) => void onNavIconFileChange(ev)}
          />
          <UnifiedButton
            type="button"
            disabled={saving || navIconUploading}
            onClick={() => navIconFileRef.current?.click()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            {navIconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {L("上传", "Upload")}
          </UnifiedButton>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-background/50"
            title={L("图标预览", "Icon preview")}
          >
            <HomeNavIconPreview value={navForm.icon_url} compact />
          </div>
        </div>
      </label>

      <label className={fieldClassName}>
        <span className={fieldLabelClassName}>
          <span>{L("标题", "Title")}</span>
        </span>
        <input
          className={controlClassName}
          placeholder={L("导航标题", "Navigation title")}
          value={navForm.title}
          onChange={(e) => setNavForm({ ...navForm, title: e.target.value })}
        />
      </label>

      <label className={fieldClassName}>
        <span className={fieldLabelClassName}>
          <span>{L("跳转方式", "Link type")}</span>
        </span>
        <select
          className={controlClassName}
          value={navForm.target_type || "url"}
          onChange={(e) => {
            const raw = e.target.value;
            const next =
              raw === "category"
                ? "category"
                : raw === "categories"
                  ? "categories"
                  : raw === "support"
                    ? "support"
                    : "url";
            setNavForm((prev) => ({
              ...prev,
              target_type: next,
              target_category_id: next === "category" ? prev.target_category_id : null,
              target_support_channel_id: next === "support" ? prev.target_support_channel_id : null,
              link_url: next === "url" ? prev.link_url : next === "categories" ? "/categories" : "",
            }));
          }}
        >
          <option value="url">{L("URL / 站内路径", "链接地址（URL）")}</option>
          <option value="categories">{L("全部分类", "All categories")}</option>
          <option value="category">{L("分类页", "Category page")}</option>
          <option value="support" disabled={!supportNavEnabled}>
            {L("联系客服", "Contact support")}
          </option>
        </select>
      </label>

      <label className={`${fieldClassName} md:col-span-2 xl:col-span-1`}>
        <span className={fieldLabelClassName}>
          <span>{targetValueLabel}</span>
          <AdminFieldHint text={targetValueHint} />
        </span>
        {targetValueControl}
      </label>

      <label className={fieldClassName}>
        <span className={fieldLabelClassName}>
          <span>{L("排序", "Sort order")}</span>
          <AdminFieldHint text={L("列表可拖拽或点击序号调整顺序", "Drag items or click the number to change the order")} />
        </span>
        {editingNavId ? (
          <input
            type="number"
            min={1}
            title={L("排序值越小越靠前", "Smaller numbers appear first")}
            className={controlClassName}
            value={navForm.sort_order}
            onChange={(e) => setNavForm({ ...navForm, sort_order: Math.max(1, Number(e.target.value) || 1) })}
          />
        ) : (
          <div className={readonlyControlClassName}>
            <span className="truncate">{L(`新增后排在第 ${nextSortOrder} 位`, `New item will be placed at position ${nextSortOrder}`)}</span>
          </div>
        )}
      </label>

      <label className={`${fieldClassName} cursor-pointer`}>
        <span className={fieldLabelClassName}>
          <span>{L("状态", "Status")}</span>
        </span>
        <span className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="accent-[var(--theme-primary)]"
            checked={navForm.enabled}
            onChange={(e) => setNavForm({ ...navForm, enabled: e.target.checked })}
          />
          {navForm.enabled ? L("启用", "Enabled") : L("禁用", "Disabled")}
        </span>
      </label>

      <div className={fieldClassName}>
        <span className={`${fieldLabelClassName} opacity-0 select-none`}>{L("操作", "Actions")}</span>
        <PermissionGate permission="home_ops.manage">
          <LoadingButton
            type="button"
            variant="price"
            state={saving ? "loading" : "normal"}
            loadingText={L("保存中...", "Saving...")}
            onClick={() => adminConfirmSave(confirm, editingNavId ? L("保存导航修改", "Save navigation changes") : L("新增导航", "Add navigation item"), () => onSave())}
            className="inline-flex h-11 w-full min-w-[5rem] justify-center rounded-xl px-4 text-sm font-bold"
          >
            {editingNavId ? L("保存", "Save") : L("新增", "Add")}
          </LoadingButton>
        </PermissionGate>
      </div>
    </div>
  );
}
