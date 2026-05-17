import { AnimatePresence, motion } from "framer-motion";
import ThemePreviewScope from "@/components/admin/ThemePreviewScope";
import type { ThemeConfig } from "@/types/theme";
import AdminDashboardPreview from "./AdminDashboardPreview";
import ComponentGalleryPreview from "./ComponentGalleryPreview";
import ProductDetailPreview from "./ProductDetailPreview";
import StoreHomePreview from "./StoreHomePreview";
import type { PreviewDevice, PreviewMode } from "./themeStudioConstants";
import { DEVICE_WIDTH } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";
import InvitePromoCard from "@/components/store/InvitePromoCard";
import { getMemberCardClassName, THEME_MEMBER_CARD_MUTED } from "@/utils/themeVisuals";

type Props = {
  config: ThemeConfig;
  mode: PreviewMode;
  device: PreviewDevice;
  skinKey: string;
};

function MobileProfilePreview({ config }: { config: ThemeConfig }) {
  return (
    <div className="space-y-3 pb-16">
      <div className="store-card p-4">
        <p className="text-sm font-semibold"><Tx>我的</Tx></p>
        <p className="text-xs text-[var(--theme-text-muted)]"><Tx>会员 · 订单 · 设置</Tx></p>
      </div>
      <div className="store-card overflow-hidden p-0">
        <InvitePromoCard loggedIn inviteCount={0} rewardBalance={0} />
      </div>
      <div
        className={`store-card rounded-xl p-3 ${getMemberCardClassName(config.memberCardStyle)}`}
        data-theme-member-card-style={config.memberCardStyle}
      >
        <p className="text-sm font-semibold"><Tx>会员卡 · 金卡会员</Tx></p>
        <p className={`mt-1 text-xs ${THEME_MEMBER_CARD_MUTED}`}><Tx>积分 2,580 · 优惠券 3 张</Tx></p>
      </div>
    </div>
  );
}

export default function ThemePreviewCanvas({ config, mode, device, skinKey }: Props) {
  const width = DEVICE_WIDTH[device];
  const isPhone = device === "phone" || mode === "mobile";

  const content = (() => {
    if (mode === "mobile") {
      return (
        <div className="space-y-4">
          <p className="text-[10px] font-medium text-[var(--theme-text-muted)]"><Tx>首页</Tx></p>
          <StoreHomePreview config={config} />
          <p className="text-[10px] font-medium text-[var(--theme-text-muted)]"><Tx>商品详情</Tx></p>
          <ProductDetailPreview config={config} />
          <p className="text-[10px] font-medium text-[var(--theme-text-muted)]"><Tx>我的</Tx></p>
          <MobileProfilePreview config={config} />
        </div>
      );
    }
    switch (mode) {
      case "home":
        return <StoreHomePreview config={config} />;
      case "product":
        return <ProductDetailPreview config={config} />;
      case "admin":
        return <AdminDashboardPreview config={config} />;
      case "components":
        return <ComponentGalleryPreview config={config} />;
      default:
        return <StoreHomePreview config={config} />;
    }
  })();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${skinKey}-${mode}-${device}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex h-full justify-center"
      >
        <ThemePreviewScope
          config={config}
          className={`relative text-[var(--theme-text)] ${
            isPhone
              ? "mx-auto overflow-hidden rounded-[2rem] border-[10px] border-neutral-800 bg-[var(--theme-bg)] shadow-2xl"
              : "w-full min-h-[200px] rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]"
          }`}
          style={
            isPhone
              ? { width: typeof width === "number" ? width : 390, maxWidth: "100%" }
              : width === "100%"
                ? { width: "100%" }
                : { width, maxWidth: "100%", margin: "0 auto" }
          }
        >
          <div className="h-full max-h-full overflow-y-auto p-3">{content}</div>
        </ThemePreviewScope>
      </motion.div>
    </AnimatePresence>
  );
}

