import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, Trash2, Edit2, MapPin } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import * as shippingService from "@/services/admin/shippingService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { ShippingTemplate } from "@/types/shipping";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type ShippingForm = {
  name: string;
  regions: string;
  regionGroup: "all" | "west_malaysia" | "east_malaysia" | "custom";
  stateCodes: string;
  cityNames: string;
  postcodePatterns: string;
  baseFee: number;
  freeAbove: number;
  extraPerKg: number;
  minWeightKg: number;
  maxWeightKg: string;
  minOrderAmount: number;
  maxOrderAmount: string;
};

const EMPTY_FORM: ShippingForm = {
  name: "",
  regions: "",
  regionGroup: "all",
  stateCodes: "",
  cityNames: "",
  postcodePatterns: "",
  baseFee: 0,
  freeAbove: 0,
  extraPerKg: 0,
  minWeightKg: 0,
  maxWeightKg: "",
  minOrderAmount: 0,
  maxOrderAmount: "",
};

const REGION_GROUP_LABEL: Record<ShippingForm["regionGroup"], string> = {
  all: "全国 / 全马",
  west_malaysia: "West Malaysia",
  east_malaysia: "East Malaysia",
  custom: "自定义区域",
};

function joinList(values?: string[]) {
  return (values || []).join(", ");
}

function splitList(value: string) {
  return value.split(/[\n,，;；]+/).map((item) => item.trim()).filter(Boolean);
}

function templateToForm(template: ShippingTemplate): ShippingForm {
  return {
    name: template.name,
    regions: template.regions,
    regionGroup: (template.regionGroup as ShippingForm["regionGroup"]) || "all",
    stateCodes: joinList(template.stateCodes),
    cityNames: joinList(template.cityNames),
    postcodePatterns: joinList(template.postcodePatterns),
    baseFee: template.baseFee,
    freeAbove: template.freeAbove,
    extraPerKg: template.extraPerKg,
    minWeightKg: template.minWeightKg ?? 0,
    maxWeightKg: template.maxWeightKg == null ? "" : String(template.maxWeightKg),
    minOrderAmount: template.minOrderAmount ?? 0,
    maxOrderAmount: template.maxOrderAmount == null ? "" : String(template.maxOrderAmount),
  };
}

function formToPayload(form: ShippingForm): Omit<ShippingTemplate, "id"> {
  return {
    name: form.name.trim(),
    regions: form.regions.trim(),
    countryCode: "MY",
    regionGroup: form.regionGroup,
    stateCodes: splitList(form.stateCodes),
    cityNames: splitList(form.cityNames),
    postcodePatterns: splitList(form.postcodePatterns),
    baseFee: Number(form.baseFee || 0),
    freeAbove: Number(form.freeAbove || 0),
    extraPerKg: Number(form.extraPerKg || 0),
    minWeightKg: Number(form.minWeightKg || 0),
    maxWeightKg: form.maxWeightKg === "" ? null : Number(form.maxWeightKg),
    minOrderAmount: Number(form.minOrderAmount || 0),
    maxOrderAmount: form.maxOrderAmount === "" ? null : Number(form.maxOrderAmount),
    enabled: true,
  };
}

function isEnabledTemplate(template: ShippingTemplate) {
  return template.enabled === true || template.enabled === 1;
}

function hasGeoRule(template: ShippingTemplate) {
  return Boolean(template.stateCodes?.length || template.cityNames?.length || template.postcodePatterns?.length);
}

function hasWeightRule(template: ShippingTemplate) {
  return Number(template.minWeightKg || 0) > 0 || template.maxWeightKg != null || Number(template.extraPerKg || 0) > 0;
}

function hasAmountRule(template: ShippingTemplate) {
  return Number(template.minOrderAmount || 0) > 0 || template.maxOrderAmount != null || Number(template.freeAbove || 0) > 0;
}

function coversWestMalaysia(template: ShippingTemplate) {
  return template.regionGroup === "all" || template.regionGroup === "west_malaysia";
}

function coversEastMalaysia(template: ShippingTemplate) {
  return template.regionGroup === "all" || template.regionGroup === "east_malaysia";
}

function buildCoverageWarnings(templates: ShippingTemplate[], defaultTemplate: ShippingTemplate | undefined, tText: (text: string) => string) {
  const warnings: Array<{ tone: "danger" | "warning" | "info"; text: string }> = [];
  const defaults = templates.filter((template) => template.isDefault);
  if (!templates.length) {
    warnings.push({ tone: "danger", text: tText("暂无运费模板，结算页无法使用后台运费规则。") });
    return warnings;
  }
  if (!defaultTemplate) warnings.push({ tone: "danger", text: tText("缺少默认生效模板，结算页可能无法匹配运费。") });
  if (defaults.length > 1) warnings.push({ tone: "danger", text: tText("存在多个默认模板，请只保留一个默认生效模板。") });
  if (defaultTemplate && defaultTemplate.regionGroup !== "all") {
    const label = REGION_GROUP_LABEL[(defaultTemplate.regionGroup as ShippingForm["regionGroup"]) || "custom"] || tText("自定义区域");
    warnings.push({ tone: "warning", text: tText(`当前默认模板仅覆盖 ${label}，其他地区下单可能无法匹配。`) });
  }
  if (defaultTemplate?.regionGroup === "custom" && !hasGeoRule(defaultTemplate)) {
    warnings.push({ tone: "danger", text: tText("默认模板为自定义区域，但没有填写州、城市或邮编规则。") });
  }
  if (!templates.some((template) => coversWestMalaysia(template))) {
    warnings.push({ tone: "warning", text: tText("已配置模板中缺少 West Malaysia 覆盖。") });
  }
  if (!templates.some((template) => coversEastMalaysia(template))) {
    warnings.push({ tone: "warning", text: tText("已配置模板中缺少 East Malaysia 覆盖。") });
  }
  if (!templates.some((template) => template.postcodePatterns?.length)) {
    warnings.push({ tone: "info", text: tText("尚未配置邮编规则，偏远地区或特殊城市会按较宽泛规则计算。") });
  }
  if (!templates.some(hasWeightRule)) {
    warnings.push({ tone: "info", text: tText("尚未配置重量阶梯，所有重量默认按基础运费和包邮门槛计算。") });
  }
  if (!templates.some(hasAmountRule)) {
    warnings.push({ tone: "info", text: tText("尚未配置金额门槛，订单金额不会影响运费模板匹配。") });
  }
  return warnings;
}

function ShippingCoverageSummary({ templates, tText }: { templates: ShippingTemplate[]; tText: (text: string) => string }) {
  const enabledTemplates = templates.filter(isEnabledTemplate);
  const defaultTemplate = templates.find((template) => template.isDefault);
  const warnings = buildCoverageWarnings(templates, defaultTemplate, tText);
  const coverageCards = [
    { label: tText("模板总数"), value: String(templates.length), tone: "text-foreground" },
    { label: tText("生效模板"), value: String(enabledTemplates.length), tone: enabledTemplates.length ? "text-emerald-600" : "text-red-600" },
    { label: tText("默认覆盖"), value: defaultTemplate ? tText(REGION_GROUP_LABEL[(defaultTemplate.regionGroup as ShippingForm["regionGroup"]) || "all"] || "自定义区域") : tText("缺失"), tone: defaultTemplate ? "text-foreground" : "text-red-600" },
    { label: tText("州/城市/邮编"), value: String(templates.filter(hasGeoRule).length), tone: templates.some(hasGeoRule) ? "text-emerald-600" : "text-muted-foreground" },
    { label: tText("重量规则"), value: String(templates.filter(hasWeightRule).length), tone: templates.some(hasWeightRule) ? "text-emerald-600" : "text-muted-foreground" },
    { label: tText("金额门槛"), value: String(templates.filter(hasAmountRule).length), tone: templates.some(hasAmountRule) ? "text-emerald-600" : "text-muted-foreground" },
  ];

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {coverageCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>
      {warnings.length ? (
        <div className="grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-2">
          {warnings.map((warning) => (
            <div
              key={warning.text}
              className={`rounded-lg px-3 py-2 text-xs ${
                warning.tone === "danger"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : warning.tone === "warning"
                    ? "border border-amber-200 bg-amber-50 text-amber-800"
                    : "border border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {warning.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShippingRuleBadges({ template, tText }: { template: ShippingTemplate; tText: (text: string) => string }) {
  const badges = [
    template.regionGroup === "all" ? tText("全马") : tText(REGION_GROUP_LABEL[(template.regionGroup as ShippingForm["regionGroup"]) || "custom"] || "自定义区域"),
    template.stateCodes?.length ? tText(`州 ${template.stateCodes.length}`) : "",
    template.cityNames?.length ? tText(`城市 ${template.cityNames.length}`) : "",
    template.postcodePatterns?.length ? tText(`邮编 ${template.postcodePatterns.length}`) : "",
    hasWeightRule(template) ? tText("重量规则") : "",
    hasAmountRule(template) ? tText("金额门槛") : "",
  ].filter(Boolean);
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span key={badge} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {badge}
        </span>
      ))}
    </div>
  );
}

export default function AdminShipping() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [editing, setEditing] = useState<ShippingTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const templatesQuery = useQuery({
    queryKey: adminQueryKeys.shippingTemplates(),
    queryFn: shippingService.fetchTemplates,
    staleTime: 60_000,
  });

  const templates = templatesQuery.data ?? [];
  const loading = templatesQuery.isLoading && !templatesQuery.data;
  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))),
    [templates],
  );
  const formBaseline = editing ? templateToForm(editing) : EMPTY_FORM;
  const formDirty = showForm && JSON.stringify(form) !== JSON.stringify(formBaseline);
  useAdminTabDirty(formDirty);

  const invalidateShipping = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.shippingRoot() });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name || !form.regions) { toast.error(tText("请填写完整信息")); return; }
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editing) {
        await shippingService.updateTemplate(editing.id, payload);
        toast.success(tText("运费模板已更新"));
      } else {
        const makeDefault = templates.length === 0;
        await shippingService.createTemplate({
          ...payload,
          isDefault: makeDefault,
        });
        toast.success(makeDefault ? tText("运费模板已创建并设为默认生效") : tText("运费模板已创建，可在列表中设为默认生效"));
      }
      closeForm();
      await invalidateShipping();
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("保存失败")));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (t: ShippingTemplate) => {
    setEditing(t);
    setForm(templateToForm(t));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await shippingService.deleteTemplate(id);
      await invalidateShipping();
      toast.success(tText("已删除"));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("删除失败")));
    }
  };

  const handleSetDefault = async (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t || t.isDefault) return;
    try {
      await shippingService.updateTemplate(id, { isDefault: true });
      await invalidateShipping();
      toast.success(tText(`「${t.name}」已设为默认生效，其他模板已自动停用`));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("操作失败")));
    }
  };

  return (
    <AdminPageShell
      hint={(
        <>
          <p><Tx>配置配送区域和运费模板</Tx></p>
          <p className="mt-1"><Tx>同一时间仅允许一个「默认生效」模板；设为默认后，结账与运费计算将使用该规则，其他模板自动停用。</Tx></p>
        </>
      )}
      toolbar={(
        <PermissionGate permission="shipping.manage">
          <UnifiedButton type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-[var(--theme-price)] px-4 py-2.5 text-sm font-bold text-[var(--theme-price-foreground)]">
            <Plus size={16} /><Tx>新建模板</Tx>
          </UnifiedButton>
        </PermissionGate>
      )}
    >
      {!loading ? <ShippingCoverageSummary templates={templates} tText={tText} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="skeleton-base skeleton-shimmer h-5 w-32 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-24 rounded" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="skeleton-base skeleton-shimmer h-12 rounded-xl" />
                  <div className="skeleton-base skeleton-shimmer h-12 rounded-xl" />
                  <div className="skeleton-base skeleton-shimmer h-12 rounded-xl" />
                </div>
              </div>
            ))
          : null}
        {!loading && sortedTemplates.map((t) => (
          <div key={t.id} className={`rounded-2xl border bg-card p-5 transition-all ${t.isDefault ? "border-[color-mix(in_srgb,var(--theme-price)_40%,var(--theme-border))] ring-1 ring-[color-mix(in_srgb,var(--theme-price)_20%,transparent)]" : "border-border opacity-75"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Truck size={18} className={t.isDefault ? "text-theme-price" : "text-muted-foreground"} />
                <h3 className="font-bold text-foreground">{t.name}</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.isDefault ? THEME_BADGE_SUCCESS : THEME_BADGE_MUTED}`}>
                {t.isDefault ? tText("默认生效") : tText("未生效")}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} /> {tText(REGION_GROUP_LABEL[(t.regionGroup as ShippingForm["regionGroup"]) || "all"] || "自定义区域")} · {t.regions || tText("全马")}
            </div>
            <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {[
                t.stateCodes?.length ? tText(`州：${t.stateCodes.join("、")}`) : "",
                t.cityNames?.length ? tText(`城市：${t.cityNames.join("、")}`) : "",
                t.postcodePatterns?.length ? tText(`邮编：${t.postcodePatterns.join("、")}`) : "",
              ].filter(Boolean).join(" · ") || tText("未限制州、城市或邮编")}
            </div>
            <ShippingRuleBadges template={t} tText={tText} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground"><Tx>基础运费</Tx></p>
                <p className="font-bold text-foreground">RM {t.baseFee}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground"><Tx>包邮门槛</Tx></p>
                <p className="font-bold text-foreground">RM {t.freeAbove}</p>
              </div>
              <div className="rounded-xl bg-secondary p-2">
                <p className="text-xs text-muted-foreground"><Tx>续重/kg</Tx></p>
                <p className="font-bold text-foreground">RM {t.extraPerKg}</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-secondary/70 p-2 text-muted-foreground">
                <Tx>重量</Tx> {t.minWeightKg ?? 0}kg - {t.maxWeightKg == null ? tText("不限") : `${t.maxWeightKg}kg`}
              </div>
              <div className="rounded-xl bg-secondary/70 p-2 text-muted-foreground">
                <Tx>金额</Tx> RM {t.minOrderAmount ?? 0} - {t.maxOrderAmount == null ? tText("不限") : `RM ${t.maxOrderAmount}`}
              </div>
            </div>
            <PermissionGate permission="shipping.manage">
              <div className="mt-4 flex gap-2">
                <UnifiedButton type="button" onClick={() => openEdit(t)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary">
                  <Edit2 size={12} /><Tx> 编辑
                </Tx></UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => adminConfirmDelete(confirm, t.name, () => handleDelete(t.id))}
                  className={`flex items-center justify-center rounded-xl border border-border px-3 py-2 text-muted-foreground ${THEME_HOVER_TEXT_DANGER} hover:bg-secondary`}
                >
                  <Trash2 size={12} />
                </UnifiedButton>
                {!t.isDefault ? (
                  <UnifiedButton
                    type="button"
                    onClick={() =>
                      confirm({ title: tText("设为默认生效"),
                        description: tText(`将「${t.name}」设为默认运费模板？当前默认模板将自动停用。`),
                        confirmText: tText("设为默认"),
                        onConfirm: () => handleSetDefault(t.id),
                      })
                    }
                    className="flex-1 rounded-xl border border-[color-mix(in_srgb,var(--theme-price)_40%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] py-2 text-xs font-semibold text-theme-price hover:bg-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-surface))]"
                  >
                    <Tx>设为默认生效</Tx>
                  </UnifiedButton>
                ) : (
                  <span className="flex flex-1 items-center justify-center rounded-xl border border-border bg-secondary/50 py-2 text-xs text-muted-foreground">
                    <Tx>当前默认</Tx>
                  </span>
                )}
              </div>
            </PermissionGate>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-2 py-12 text-center text-sm text-muted-foreground"><Tx>暂无运费模板，点击上方按钮创建</Tx></div>
        )}
      </div>

      <AdminResponsiveSheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
            return;
          }
          setShowForm(true);
        }}
        title={editing ? tText("编辑运费模板") : tText("新建运费模板")}
        size="sm"
      >
        <div className="space-y-4">
          <input aria-label={tText("模板名称")} placeholder={tText("模板名称")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--theme-primary)]" />
          <input aria-label={tText("适用区域")} placeholder={tText("适用区域（如：雪兰莪、吉隆坡）")} value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[var(--theme-primary)]" />
          <label className="block">
            <span className="text-xs text-muted-foreground"><Tx>区域分组</Tx></span>
            <select
              value={form.regionGroup}
              onChange={(e) => setForm({ ...form, regionGroup: e.target.value as ShippingForm["regionGroup"] })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]"
            >
              <option value="all">{tText("全国 / 全马")}</option>
              <option value="west_malaysia">West Malaysia</option>
              <option value="east_malaysia">East Malaysia</option>
              <option value="custom">{tText("自定义区域")}</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>州 / 直辖区</Tx></span><input value={form.stateCodes} onChange={(e) => setForm({ ...form, stateCodes: e.target.value })} placeholder="Selangor, Kuala Lumpur" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>城市</Tx></span><input value={form.cityNames} onChange={(e) => setForm({ ...form, cityNames: e.target.value })} placeholder="Petaling Jaya" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>邮编</Tx></span><input value={form.postcodePatterns} onChange={(e) => setForm({ ...form, postcodePatterns: e.target.value })} placeholder="88*, 88000-88999" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>基础运费</Tx></span><input type="number" value={form.baseFee} onChange={(e) => setForm({ ...form, baseFee: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>包邮门槛</Tx></span><input type="number" value={form.freeAbove} onChange={(e) => setForm({ ...form, freeAbove: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>续重/kg</Tx></span><input type="number" value={form.extraPerKg} onChange={(e) => setForm({ ...form, extraPerKg: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>最低重量 kg</Tx></span><input type="number" min={0} value={form.minWeightKg} onChange={(e) => setForm({ ...form, minWeightKg: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>最高重量 kg</Tx></span><input type="number" min={0} value={form.maxWeightKg} onChange={(e) => setForm({ ...form, maxWeightKg: e.target.value })} placeholder={tText("不限")} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>最低金额</Tx></span><input type="number" min={0} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
            <label className="block"><span className="text-xs text-muted-foreground"><Tx>最高金额</Tx></span><input type="number" min={0} value={form.maxOrderAmount} onChange={(e) => setForm({ ...form, maxOrderAmount: e.target.value })} placeholder={tText("不限")} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--theme-primary)]" /></label>
          </div>
          <PermissionGate permission="shipping.manage">
            <LoadingButton
              type="button"
              variant="price"
              state={saving ? "loading" : "normal"}
              loadingText={tText("保存中...")}
              onClick={() => adminConfirmSave(confirm, editing ? tText("运费模板修改") : tText("新运费模板"), () => handleSave())}
              className="w-full rounded-xl py-3 text-sm font-bold"
            >
              <Tx>保存</Tx>
            </LoadingButton>
          </PermissionGate>
        </div>
      </AdminResponsiveSheet>
    </AdminPageShell>
  );
}
