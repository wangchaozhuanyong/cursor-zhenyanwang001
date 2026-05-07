import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Save, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchSiteSettings, updateSiteSettings } from "@/services/admin/settingsService";
import { uploadSingle } from "@/services/uploadService";
import { refreshSiteInfo } from "@/hooks/useSiteInfo";
import type { SiteSettings } from "@/types/admin";
import { toastErrorMessage } from "@/utils/errorMessage";

const EMPTY: SiteSettings = {
  siteName: "",
  siteDescription: "",
  siteSlogan: "",
  logoUrl: "",
  faviconUrl: "",
  brandColor: "#caa45c",
  contactPhone: "",
  contactEmail: "",
  contactWhatsApp: "",
  whatsappUrl: "",
  wechatId: "",
  address: "",
  businessHours: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  xhsUrl: "",
  currency: "MYR",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  ogImageUrl: "",
  footerCompanyName: "",
  footerCopyright: "",
  footerIcpNo: "",
  footerPolicyUrl: "",
  footerTermsUrl: "",
  privacyPolicyPath: "/content/privacy-policy",
  termsPath: "/content/terms-of-service",
  refundPolicyPath: "/content/refund-policy",
  shippingPolicyPath: "/content/shipping-policy",
  supportText: "",
  shippingNotice: "",
  paymentNotice: "",
  footerNav: "",
  newArrivalHeroImage: "",
  newArrivalHeroTitle: "",
  newArrivalHeroSubtitle: "",
  newArrivalHeroCtaText: "",
};

const DEFAULT_FOOTER_NAV_JSON = JSON.stringify(
  [
    { label: "关于我们", path: "/about" },
    { label: "帮助中心", path: "/help" },
    { label: "隐私政策", path: "/content/privacy-policy" },
    { label: "用户协议", path: "/content/terms-of-service" },
    { label: "退款政策", path: "/content/refund-policy" },
    { label: "配送政策", path: "/content/shipping-policy" },
  ],
  null,
  2,
);

type Field = {
  key: keyof SiteSettings;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: "text" | "textarea" | "select" | "color" | "image";
  options?: { value: string; label: string }[];
  rows?: number;
};

type Section = {
  title: string;
  desc?: string;
  category: "brand" | "contact" | "seo" | "content";
  fields: Field[];
};

type SectionCategory = Section["category"] | "all";

const CATEGORY_LABELS: Record<SectionCategory, string> = {
  all: "全部",
  brand: "品牌与视觉",
  contact: "联系与业务",
  seo: "SEO 与分享",
  content: "页脚与内容",
};

const SECTIONS: Section[] = [
  {
    title: "品牌信息",
    category: "brand",
    desc: "网站名称、Slogan、Logo / Favicon — 全站头部、底部、登录页、文档标题都会读取",
    fields: [
      { key: "siteName", label: "站点名称", placeholder: "例如：真烟网", hint: "全站头部 / 浏览器标题尾缀" },
      { key: "siteSlogan", label: "Slogan / 副标题", placeholder: "尊享品质，精选全球好物" },
      { key: "siteDescription", label: "站点描述", type: "textarea", rows: 2, placeholder: "用于首页 hero / SEO description 兜底" },
      { key: "logoUrl", label: "Logo (推荐 256×256，上传后统一转 WEBP)", type: "image", hint: "未配置时回退到打包内置 logo" },
      { key: "faviconUrl", label: "Favicon (推荐 32×32，上传后统一转 WEBP)", type: "image" },
      { key: "brandColor", label: "品牌主色", type: "color", hint: "用于按钮/强调色（前端可逐步接入）" },
    ],
  },
  {
    title: "首页新品运营主视觉",
    category: "brand",
    desc: "用于首页「新品上市」大图区，优先使用这里的图文；商品图仍作为兜底与轮播素材。",
    fields: [
      { key: "newArrivalHeroImage", label: "主视觉图片（推荐 1200×630）", type: "image" },
      { key: "newArrivalHeroTitle", label: "主视觉标题", placeholder: "新品限时上新，错过再等一季" },
      { key: "newArrivalHeroSubtitle", label: "主视觉副标题", placeholder: "每周精选，支持快速发货" },
      { key: "newArrivalHeroCtaText", label: "按钮文案", placeholder: "立即抢购" },
    ],
  },
  {
    title: "联系方式",
    category: "contact",
    desc: "底部、关于我们、订单页都会展示",
    fields: [
      { key: "contactPhone", label: "客服电话", placeholder: "+60 12-345 6789" },
      { key: "contactEmail", label: "客服邮箱", placeholder: "support@example.com" },
      { key: "contactWhatsApp", label: "WhatsApp 号码（仅数字）", placeholder: "60123456789", hint: "用于生成 wa.me 链接" },
      { key: "whatsappUrl", label: "WhatsApp 完整链接（可选）", placeholder: "https://wa.me/60xxxxxxxxxx", hint: "填写后优先使用此链接" },
      { key: "wechatId", label: "微信号", placeholder: "ZhenYan_CS" },
      { key: "address", label: "公司地址", placeholder: "Kuala Lumpur, Malaysia" },
      { key: "businessHours", label: "营业时间", placeholder: "周一至周日 09:00 - 22:00" },
    ],
  },
  {
    title: "社交媒体",
    category: "contact",
    fields: [
      { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/..." },
      { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/..." },
      { key: "tiktokUrl", label: "TikTok", placeholder: "https://tiktok.com/@..." },
      { key: "xhsUrl", label: "小红书", placeholder: "https://xiaohongshu.com/..." },
    ],
  },
  {
    title: "业务设置",
    category: "contact",
    fields: [
      {
        key: "currency",
        label: "货币",
        type: "select",
        options: [
          { value: "MYR", label: "MYR (RM)" },
          { value: "CNY", label: "CNY (¥)" },
          { value: "USD", label: "USD ($)" },
          { value: "SGD", label: "SGD (S$)" },
        ],
      },
    ],
  },
  {
    title: "SEO",
    category: "seo",
    desc: "搜索引擎抓取与社交分享时使用，未填写时回退到「站点名称 / 站点描述 / Logo」",
    fields: [
      { key: "seoTitle", label: "SEO 标题", placeholder: "真烟网 - 马来西亚优选商城" },
      { key: "seoDescription", label: "SEO 描述", type: "textarea", rows: 2, placeholder: "150 字以内，提升搜索点击率" },
      { key: "seoKeywords", label: "SEO 关键词", placeholder: "用英文逗号分隔, 例: shop,malaysia,gift" },
      { key: "ogImageUrl", label: "分享卡片图（OG Image，推荐 1200×630）", type: "image" },
    ],
  },
  {
    title: "页脚信息",
    category: "content",
    desc: "前端 Footer 组件读取",
    fields: [
      { key: "footerCompanyName", label: "公司名称", placeholder: "真烟网" },
      { key: "footerCopyright", label: "版权信息", placeholder: "© 2026 真烟网 版权所有" },
      { key: "footerIcpNo", label: "备案号 / 工商注册号", placeholder: "可选" },
      { key: "footerPolicyUrl", label: "隐私政策外链", placeholder: "可选 - 优先使用站内 CMS 路径" },
      { key: "footerTermsUrl", label: "服务条款外链", placeholder: "可选 - 优先使用站内 CMS 路径" },
    ],
  },
  {
    title: "政策内部页路径",
    category: "content",
    desc: "对应 CMS 文章 slug，前端 Footer / Checkout 等位置直接跳转到内部 CMS 页面",
    fields: [
      { key: "privacyPolicyPath", label: "隐私政策路径", placeholder: "/content/privacy-policy" },
      { key: "termsPath", label: "用户协议路径", placeholder: "/content/terms-of-service" },
      { key: "refundPolicyPath", label: "退款政策路径", placeholder: "/content/refund-policy" },
      { key: "shippingPolicyPath", label: "配送政策路径", placeholder: "/content/shipping-policy" },
    ],
  },
  {
    title: "购物 / 售后 / 支付说明",
    category: "content",
    desc: "短文案，可在购物车、Checkout、订单详情等转化关键节点透出，提升信任度",
    fields: [
      { key: "supportText", label: "客服支持说明", type: "textarea", rows: 2, placeholder: "如：7×24 小时人工客服，下单 24 小时内必复" },
      { key: "shippingNotice", label: "配送说明", type: "textarea", rows: 2, placeholder: "如：每日 16:00 前付款当天发货，全马 2-5 天到达" },
      { key: "paymentNotice", label: "支付说明", type: "textarea", rows: 2, placeholder: "如：支持 Visa / Master / FPX，支付通道由 Stripe 提供，全程 SSL 加密" },
    ],
  },
  {
    title: "页脚自定义导航 (高级)",
    category: "content",
    desc: "JSON 格式 [{label,path}]。配置后将完全覆盖默认页脚导航；不填则使用内置默认（关于我们 / 帮助中心 / 隐私 / 协议 / 退款 / 配送）",
    fields: [
      {
        key: "footerNav",
        label: "Footer 菜单 JSON",
        type: "textarea",
        rows: 8,
        placeholder: DEFAULT_FOOTER_NAV_JSON,
        hint: "建议条目数 4-8。每行一条 {label, path}；path 为内部跳转或以 http 开头的外链",
      },
    ],
  },
];

export default function AdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(EMPTY);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SectionCategory>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchSiteSettings()
      .then((data) => {
        if (data && typeof data === "object") {
          setSettings({ ...EMPTY, ...(data as SiteSettings) });
        }
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载设置失败")))
      .finally(() => setLoading(false));
  }, []);

  const setField = (key: keyof SiteSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    // footerNav 若有内容必须是合法 JSON 数组，否则前端解析失败会回退到默认导航
    const navRaw = (settings.footerNav ?? "").trim();
    if (navRaw) {
      try {
        const parsed = JSON.parse(navRaw);
        if (!Array.isArray(parsed)) throw new Error("footerNav 必须为数组");
        for (const item of parsed) {
          if (!item || typeof item.label !== "string" || typeof item.path !== "string") {
            throw new Error("每个条目必须包含 label 与 path 字段");
          }
        }
      } catch (e) {
        toast.error(`Footer 菜单 JSON 格式错误：${e instanceof Error ? e.message : "解析失败"}`);
        return;
      }
    }

    setSaving(true);
    try {
      await updateSiteSettings(settings);
      await refreshSiteInfo();
      toast.success("设置已保存，前端缓存已刷新");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (key: keyof SiteSettings, file: File) => {
    if (!file) return;
    setUploadingKey(key as string);
    try {
      const res = await uploadSingle(file);
      setField(key, res.url);
      toast.success("图片已上传，请记得点击底部「保存设置」");
    } catch (e) {
      toast.error(toastErrorMessage(e, "上传失败"));
    } finally {
      setUploadingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const visibleSections =
    activeCategory === "all"
      ? SECTIONS
      : SECTIONS.filter((section) => section.category === activeCategory);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">站点设置</h1>
          <p className="text-sm text-muted-foreground">
            配置全站通用信息：品牌、联系方式、SEO、页脚等。所有字段实时驱动前台展示。
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">功能导航</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key as SectionCategory)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? "bg-gold text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        {visibleSections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              {section.desc && (
                <p className="mt-1 text-xs text-muted-foreground">{section.desc}</p>
              )}
            </div>

            {section.fields.map((field) => {
              const value = (settings[field.key] as string) ?? "";
              const id = `field-${String(field.key)}`;

              if (field.type === "textarea") {
                return (
                  <div key={String(field.key)}>
                    <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
                      {field.label}
                    </label>
                    <textarea
                      id={id}
                      rows={field.rows ?? 2}
                      value={value}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full resize-none rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {field.hint && <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>}
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={String(field.key)}>
                    <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
                      {field.label}
                    </label>
                    <select
                      id={id}
                      value={value}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.type === "color") {
                return (
                  <div key={String(field.key)}>
                    <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
                      {field.label}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id={id}
                        type="color"
                        value={value || "#caa45c"}
                        onChange={(e) => setField(field.key, e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border border-border bg-secondary"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder="#caa45c"
                        className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {field.hint && <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>}
                  </div>
                );
              }

              if (field.type === "image") {
                const isUploading = uploadingKey === String(field.key);
                return (
                  <div key={String(field.key)}>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {field.label}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                        {value ? (
                          <img src={value} alt={field.label} className="h-full w-full object-contain" />
                        ) : (
                          <ImageIcon size={20} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setField(field.key, e.target.value)}
                          placeholder="图片 URL（可手动粘贴或点右侧上传）"
                          className="w-full rounded-lg bg-secondary px-4 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <div className="flex gap-2">
                          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-secondary">
                            {isUploading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            {isUploading ? "上传中…" : "上传图片"}
                            <input
                              ref={isUploading ? fileInputRef : undefined}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadImage(field.key, f);
                              }}
                            />
                          </label>
                          {value && (
                            <button
                              type="button"
                              onClick={() => setField(field.key, "")}
                              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <X size={12} /> 清除
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {field.hint && <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>}
                  </div>
                );
              }

              return (
                <div key={String(field.key)}>
                  <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
                    {field.label}
                  </label>
                  <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {field.hint && <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-md">
        <div className="flex max-w-5xl items-center justify-between">
          <p className="text-xs text-muted-foreground">
            提示：保存后前端 5 分钟缓存会立即失效，刷新页面即可看到新内容。
          </p>
          <PermissionGate permission="settings.manage">
            <button
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-gold/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save size={14} /> 保存设置
                </>
              )}
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
