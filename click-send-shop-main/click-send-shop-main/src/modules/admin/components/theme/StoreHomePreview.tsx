import { Home, ShoppingBag, User } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import ProductCard from "@/components/ProductCard";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import type { ThemeConfig } from "@/types/theme";
import { Tx } from "@/components/admin/AdminText";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import {
  HOME_NAV_ICON_FRAME_CLASS,
  HOME_NAV_ITEM_CLASS,
  HOME_NAV_LABEL_CLASS,
} from "@/constants/homeLayout";
import {
  getBottomNavInnerClassName,
  getBottomNavShellClassName,
  getMemberCardClassName,
} from "@/utils/themeVisuals";
import { previewBanner, previewProduct } from "./themePreviewData";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { useAdminT } from "@/hooks/useAdminT";

const categories = ["美食", "生活", "签证", "好物", "促销"];

export default function StoreHomePreview({ config }: { config: ThemeConfig }) {
  const { tText } = useAdminT();
  return (
    <div className="relative space-y-3 pb-14" data-theme-home-layout={config.homeLayout}>
      <div className="-mx-3 pointer-events-none">
        <StoreTabHeader searchMode="navigate" position="sticky" className="!static !border-b-0" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--theme-border)]">
        <BannerCarousel banners={[previewBanner]} themeConfigOverride={config} />
      </div>
      <div className="grid grid-cols-5 gap-1 border-y border-[var(--theme-border)] py-3">
        {categories.map((label) => (
          <div key={label} className={`${HOME_NAV_ITEM_CLASS} max-w-none w-auto`}>
            <span className={HOME_NAV_ICON_FRAME_CLASS}>
              <HomeNavIcon value={label.slice(0, 1)} />
            </span>
            <span className={HOME_NAV_LABEL_CLASS}>{label}</span>
          </div>
        ))}
      </div>
      <PremiumCouponCard
        colorScheme="invite"
        layout="home"
        title={tText("中秋9.5折")}
        amount="95%"
        amountPrefix=""
        minSpendText="满 RM 100 可用"
        expireText="2027-05-09"
        scopeText="适用范围：全场商品"
        actionLabel="立即领取"
      />
      <div
        className={`store-card rounded-xl p-3 ${getMemberCardClassName(config.memberCardStyle)}`}
        data-theme-member-card-style={config.memberCardStyle}
      >
        <p className="text-sm font-semibold"><Tx>会员卡 · 金卡会员</Tx></p>
        <p className="mt-1 text-xs opacity-90"><Tx>积分 2,580 · 优惠券 3 张</Tx></p>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--theme-text)]"><Tx>热门推荐</Tx></p>
        <div className={getProductGridClassName(config.productCardVariant)}>
          <ProductCard product={previewProduct} />
          <ProductCard product={{ ...previewProduct, id: "preview-2", name: "限时特惠商品" }} />
        </div>
      </div>
      <nav
        className={getBottomNavShellClassName(config.navStyle, "absolute")}
        data-theme-nav-style={config.navStyle}
      >
        <div className={`${getBottomNavInnerClassName(config.navStyle)} flex items-center justify-around py-2 text-[10px]`}>
          <span className="flex flex-col items-center gap-0.5 text-[var(--theme-primary)]">
            <Home size={16} /><Tx> 首页
          </Tx></span>
          <span className="flex flex-col items-center gap-0.5 text-[var(--theme-text-muted)]">
            <ShoppingBag size={16} /><Tx> 分类
          </Tx></span>
          <span className="flex flex-col items-center gap-0.5 text-[var(--theme-text-muted)]">
            <User size={16} /><Tx> 我的
          </Tx></span>
        </div>
      </nav>
    </div>
  );
}
