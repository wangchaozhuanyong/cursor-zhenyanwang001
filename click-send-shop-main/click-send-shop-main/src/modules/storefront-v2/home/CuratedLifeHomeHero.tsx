import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Headphones, Search } from "lucide-react";
import cityConsultantHero from "@/assets/curated-life/city-consultant-hero.webp";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import { StoreSearchDrawer } from "@/components/store/StoreSearchDrawer";
import {
  buildStoreSearchCategoryOptions,
  type StoreSearchTagOption,
} from "@/components/store/storeSearchOptions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StableImage from "@/components/ui/StableImage";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { STORE_COPY } from "@/constants/storeCopy";
import { usePublicLocale } from "@/i18n/publicLocale";
import * as productService from "@/services/productService";
import { useProductStore } from "@/stores/useProductStore";
import type { ProductTag } from "@/types/product";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";

type CuratedLifeHomeHeroProps = {
  siteName: string;
  logoSrc?: string;
  onNavigate: (path: string) => void;
};

export default function CuratedLifeHomeHero({
  siteName,
  logoSrc,
  onNavigate,
}: CuratedLifeHomeHeroProps) {
  const { localizedPath, t } = usePublicLocale();
  const categories = useProductStore((state) => state.categories);
  const loadCategories = useProductStore((state) => state.loadCategories);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchTags, setSearchTags] = useState<ProductTag[]>([]);
  const brandName = siteName || STORE_COPY.brandName;

  useEffect(() => {
    if (!searchOpen) return;
    void loadCategories();
  }, [loadCategories, searchOpen]);

  useEffect(() => {
    if (!searchOpen || searchTags.length > 0) return;
    let cancelled = false;
    productService.fetchProductTags(16).then((tags) => {
      if (!cancelled) setSearchTags(tags);
    }).catch(() => {
      if (!cancelled) setSearchTags([]);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, searchTags.length]);

  const searchCategoryOptions = useMemo(() => buildStoreSearchCategoryOptions({
    categories,
    activeCategoryId: "all",
    onAll: () => onNavigate(localizedPath("/categories")),
    onNew: () => onNavigate(localizedPath(NEW_ARRIVAL_CATEGORY_PATH)),
    onCategorySelect: (category) => onNavigate(localizedPath(`/categories?cat=${encodeURIComponent(category.id)}`)),
  }), [categories, localizedPath, onNavigate]);

  const searchTagOptions = useMemo<StoreSearchTagOption[]>(() => searchTags.map((tag) => ({
    id: tag.id,
    label: storefrontCategoryName(tag.name),
    onSelect: () => onNavigate(localizedPath(`/categories?tag_id=${encodeURIComponent(tag.id)}`)),
  })), [localizedPath, onNavigate, searchTags]);

  const openSearchPage = (value = keyword) => {
    const normalized = value.trim();
    setKeyword(normalized);
    onNavigate(localizedPath(normalized ? `/search?keyword=${encodeURIComponent(normalized)}` : "/search"));
  };

  const openSupport = () => onNavigate(localizedPath("/support-download?tab=support"));

  return (
    <section className="curated-life-home-hero" aria-label="华人城市生活服务">
      <header className="curated-life-home-header">
        <UnifiedButton
          type="button"
          className="curated-life-home-brand"
          onClick={() => onNavigate(localizedPath("/"))}
          aria-label={`${brandName} ${t("common.home")}`}
        >
          <StoreBrandLogo
            src={logoSrc}
            siteName={brandName}
            fallbackText={brandName.trim().slice(0, 1)}
            width={42}
            height={42}
            className="curated-life-home-brand__logo"
          />
          <strong>{brandName}</strong>
        </UnifiedButton>

        <UnifiedButton
          type="button"
          className="curated-life-home-support"
          onClick={openSupport}
          aria-label="联系中文客服"
        >
          <Headphones size={20} aria-hidden />
          <span>中文客服</span>
        </UnifiedButton>
      </header>

      <UnifiedButton
        type="button"
        className="curated-life-home-search"
        onClick={() => setSearchOpen(true)}
        aria-label={`打开搜索：${keyword || "搜索商品、服务或品牌"}`}
      >
        <Search size={21} aria-hidden />
        <span>{keyword || "搜索商品、服务或品牌"}</span>
      </UnifiedButton>

      <div className="curated-life-service-hero">
        <StableImage
          src={cityConsultantHero}
          alt="大马通中文顾问在吉隆坡为客户提供咨询"
          width={1600}
          height={900}
          loading="eager"
          fetchPriority="high"
          withPlaceholder={false}
          className="curated-life-service-hero__media"
          imgClassName="curated-life-service-hero__image"
        />
        <div className="curated-life-service-hero__copy">
          <p>马来西亚华人生活服务</p>
          <h2>在马生活，<br />有事找大马通</h2>
          <span>签证 · 留学 · 安家 · 装修 · 配送</span>
          <UnifiedButton
            type="button"
            className="curated-life-service-hero__action"
            onClick={openSupport}
          >
            联系顾问
            <ArrowRight size={17} aria-hidden />
          </UnifiedButton>
        </div>
      </div>

      <div className="curated-life-service-switch" aria-label="服务与好物入口">
        <UnifiedButton
          type="button"
          className="is-active"
          onClick={() => onNavigate(localizedPath("/categories"))}
        >
          <span>办服务</span>
          <small>本地生活，一站找齐</small>
        </UnifiedButton>
        <UnifiedButton
          type="button"
          onClick={() => onNavigate(localizedPath("/categories"))}
        >
          <span>买好物</span>
          <small>精选商品，安心选购</small>
        </UnifiedButton>
      </div>

      <StoreSearchDrawer
        open={searchOpen}
        value={keyword}
        placeholder="搜索商品、服务或品牌"
        categories={searchCategoryOptions}
        tags={searchTagOptions}
        onClose={() => setSearchOpen(false)}
        onSubmit={openSearchPage}
        onValueChange={setKeyword}
        onClear={() => setKeyword("")}
      />
    </section>
  );
}
