import { X } from "lucide-react";
import { useState } from "react";
import ThemePreviewScope from "@/components/admin/ThemePreviewScope";
import type { ThemeConfig } from "@/types/theme";
import AdminDashboardPreview from "./AdminDashboardPreview";
import ProductDetailPreview from "./ProductDetailPreview";
import StoreHomePreview from "./StoreHomePreview";
import type { FullscreenPreviewMode, PreviewDevice } from "./themeStudioConstants";
import { DEVICE_WIDTH, PREVIEW_DEVICE_LABELS } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

const FULLSCREEN_MODES: { id: FullscreenPreviewMode; label: string }[] = [
  { id: "home", label: "前台首页" },
  { id: "product", label: "商品详情" },
  { id: "category", label: "分类页" },
  { id: "cart", label: "购物车" },
  { id: "profile", label: "我的页面" },
  { id: "admin_home", label: "后台首页" },
  { id: "admin_products", label: "后台商品表" },
  { id: "admin_orders", label: "后台订单表" },
];

type Props = {
  open: boolean;
  config: ThemeConfig;
  onClose: () => void;
};

export default function ThemeFullscreenPreview({ open, config, onClose }: Props) {
  const { tText } = useAdminT();
  const [mode, setMode] = useState<FullscreenPreviewMode>("home");
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  if (!open) return null;

  const width = DEVICE_WIDTH[device];

  const body = (() => {
    switch (mode) {
      case "home":
      case "category":
        return <StoreHomePreview config={config} />;
      case "product":
        return <ProductDetailPreview config={config} />;
      case "cart":
        return (
          <div className="store-card p-4 text-sm">
            <p className="font-semibold"><Tx>购物车</Tx></p>
            <p className="mt-2 text-[var(--theme-text-muted)]"><Tx>2 件商品 · 合计 RM 176</Tx></p>
          </div>
        );
      case "profile":
        return (
          <div className="store-card p-4">
            <p className="font-semibold"><Tx>我的页面</Tx></p>
            <p className="text-xs text-[var(--theme-text-muted)]"><Tx>订单 / 优惠券 / 设置</Tx></p>
          </div>
        );
      case "admin_home":
      case "admin_products":
      case "admin_orders":
        return <AdminDashboardPreview config={config} />;
      default:
        return <StoreHomePreview config={config} />;
    }
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tText("全屏预览")}
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-neutral-900 px-4 py-3 text-white">
        <p className="text-sm font-semibold"><Tx>全屏预览</Tx></p>
        <div className="flex flex-1 flex-wrap gap-1 overflow-x-auto">
          {FULLSCREEN_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
                mode === m.id ? "bg-white text-neutral-900" : "bg-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(Object.keys(PREVIEW_DEVICE_LABELS) as PreviewDevice[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`rounded px-2 py-1 text-[11px] ${device === d ? "bg-white text-neutral-900" : "bg-white/10"}`}
            >
              {PREVIEW_DEVICE_LABELS[d]}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label={tText("关闭")}>
          <X size={20} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-6">
        <ThemePreviewScope
          config={config}
          className="overflow-hidden rounded-xl bg-[var(--theme-bg)] shadow-2xl"
          style={width === "100%" ? { width: "min(1200px, 100%)", minHeight: 480 } : { width, maxWidth: "100%" }}
        >
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-4">{body}</div>
        </ThemePreviewScope>
      </div>
    </div>
  );
}
