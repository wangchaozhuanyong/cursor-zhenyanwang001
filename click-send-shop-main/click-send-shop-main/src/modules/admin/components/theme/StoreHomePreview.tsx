import { Home, Search, ShoppingBag, User } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import ProductCard from "@/components/ProductCard";
import type { ThemeConfig } from "@/types/theme";
import {
import { Tx } from "@/components/admin/AdminText";
  getBottomNavInnerClassName,
  getBottomNavShellClassName,
  getCategoryIconShellClassName,
  getMemberCardClassName,
} from "@/utils/themeVisuals";
import { previewBanner, previewProduct } from "./themePreviewData";

const categories = ["美食", "生活", "签证", "好物", "促销"];

export default function StoreHomePreview({ config }: { config: ThemeConfig }) {
  return (
    <div className="relative space-y-3 pb-14" data-theme-home-layout={config.homeLayout}>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
        <Search size={16} className="text-[var(--theme-text-muted)]" />
        <span className="text-xs text-[var(--theme-text-muted)]"><Tx>搜索商品、服务...</Tx></span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--theme-border)]">
        <BannerCarousel banners={[previewBanner]} themeConfigOverride={config} />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {categories.map((label) => (
          <div key={label} className="flex flex-col items-center gap-1 text-center">
            <div
              className={getCategoryIconShellClassName(config.categoryIconStyle)}
              data-theme-category-icon-style={config.categoryIconStyle}
            >
              {label.slice(0, 1)}
            </div>
            <span className="text-[10px] text-[var(--theme-text-muted)]">{label}</span>
          </div>
        ))}
      </div>
      <PremiumCouponCard
        homeCompact
        title="中秋9.5折"
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
        <div className="grid grid-cols-2 gap-2">
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
