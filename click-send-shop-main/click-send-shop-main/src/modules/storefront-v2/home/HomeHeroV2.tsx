import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import NotificationIconButton from "@/components/NotificationIconButton";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import { StoreSearchDrawer, StoreSearchLauncher } from "@/components/store/StoreSearchDrawer";
import { buildStoreSearchCategoryOptions, type StoreSearchTagOption } from "@/components/store/storeSearchOptions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";
import { STORE_COPY } from "@/constants/storeCopy";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useProductStore } from "@/stores/useProductStore";
import * as productService from "@/services/productService";
import type { ProductTag } from "@/types/product";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";
import { getBannerCtaText } from "@/utils/bannerCta";

type HomeHeroV2Props = {
  siteName: string;
  slogan: string;
  description: string;
  logoSrc?: string;
  banners: Banner[];
  bannersLoading: boolean;
  bannerEnabled: boolean;
  themeConfig: ThemeConfig;
  autoRotateMs: number;
  onNavigate: (path: string) => void;
};

export default function HomeHeroV2({
  siteName,
  slogan,
  description,
  logoSrc,
  banners,
  bannersLoading,
  bannerEnabled,
  themeConfig,
  autoRotateMs,
  onNavigate,
}: HomeHeroV2Props) {
  const hasBanner = bannerEnabled && (bannersLoading || banners.length > 0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchTags, setSearchTags] = useState<ProductTag[]>([]);
  const [activeBanner, setActiveBanner] = useState<Banner | null>(null);
  const categories = useProductStore((s) => s.categories);
  const loadCategories = useProductStore((s) => s.loadCategories);
  const { locale, localizedPath, t } = usePublicLocale();
  const displaySlogan = locale !== "zh" && containsCjk(slogan) ? t("hero.siteSlogan") : slogan;
  const displayDescription = locale !== "zh" && containsCjk(description) ? t("hero.siteDescription") : description;
  const heroTitle = buildQuietHeroTitle(siteName, displaySlogan);
  const compactHeroDescription = normalizeHeroDescription(displayDescription, heroTitle);
  const activeBannerTitle = activeBanner?.title?.trim() || "";
  const activeBannerDescription = activeBanner?.description?.trim() || "";
  const activeBannerLink = activeBanner?.link?.trim() || "";
  const activeBannerCtaText = activeBanner ? getBannerCtaText(activeBanner) : "";
  const displayHeroTitle = activeBannerTitle || heroTitle;
  const displayHeroDescription = activeBannerDescription
    ? normalizeBannerHeroDescription(activeBannerDescription)
    : compactHeroDescription;
  const displayHeroActionLabel = activeBannerCtaText || (activeBannerLink ? "查看详情" : "查看");

  const handleHeroAction = () => {
    if (activeBannerLink) {
      onNavigate(activeBannerLink);
      return;
    }
    onNavigate(localizedPath("/categories"));
  };

  useEffect(() => {
    if (!searchOpen) return;
    void loadCategories();
  }, [loadCategories, searchOpen]);

  useEffect(() => {
    if (hasBanner) return;
    setActiveBanner(null);
  }, [hasBanner]);

  useEffect(() => {
    productService.fetchProductTags(16).then(setSearchTags).catch(() => setSearchTags([]));
  }, []);

  const openSearchPage = (value = keyword) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    onNavigate(localizedPath(trimmed ? `/search?keyword=${encodeURIComponent(trimmed)}` : "/search"));
  };

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

  return (
    <section
      data-storefront-home-hero
      data-hero-layout={themeConfig.homeLayout}
      data-hero-banner-style={themeConfig.bannerStyle}
      className="sf-next-home-hero"
    >
      <HeroChrome
        siteName={siteName}
        logoSrc={logoSrc}
        onNavigate={onNavigate}
        searchValue={keyword}
        searchPlaceholder={t("hero.searchPlaceholder")}
        onSearchOpen={() => setSearchOpen(true)}
      />
      <StoreSearchDrawer
        open={searchOpen}
        value={keyword}
        placeholder={t("hero.searchPlaceholder")}
        categories={searchCategoryOptions}
        tags={searchTagOptions}
        onClose={() => setSearchOpen(false)}
        onSubmit={openSearchPage}
        onValueChange={setKeyword}
        onClear={() => setKeyword("")}
      />

      <div className="sf-next-home-hero__feature">
        <div className="sf-next-home-hero__copy">
          <span className="sf-next-home-hero__kicker">{siteName}</span>
          <h2>{displayHeroTitle}</h2>
          {displayHeroDescription ? <p>{displayHeroDescription}</p> : null}
          <UnifiedButton
            type="button"
            className="sf-next-home-hero__feature-action"
            onClick={handleHeroAction}
          >
            {displayHeroActionLabel}
          </UnifiedButton>
        </div>

        <div className="sf-next-home-hero__visual">
          <div className="sf-next-home-hero__art" aria-hidden="true">
            <span className="sf-next-home-hero__art-block sf-next-home-hero__art-block--ink" />
            <span className="sf-next-home-hero__art-block sf-next-home-hero__art-block--mint" />
            <span className="sf-next-home-hero__art-orb" />
            <span className="sf-next-home-hero__art-base" />
          </div>
          {hasBanner ? (
            <div className="sf-next-home-hero__banner-texture">
              <BannerCarousel
                banners={banners}
                loading={bannersLoading}
                themeConfigOverride={themeConfig}
                autoRotateMs={autoRotateMs}
                trackingModule="home_v2_banner"
                showCopyLayer={false}
                onActiveBannerChange={setActiveBanner}
              />
            </div>
          ) : (
            <HeroFallbackVisual
              siteName={siteName}
              logoSrc={logoSrc}
              slogan={displaySlogan}
              description={displayDescription}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function buildQuietHeroTitle(siteName: string, slogan: string) {
  const cleaned = slogan.replace(/\s+/g, " ").trim();
  if (!cleaned) return siteName || STORE_COPY.brandName;
  if (/马来西亚|华人|一站式|生活|服务/.test(cleaned)) {
    return "生活服务与优选商城";
  }
  if (cleaned.length <= 18) return cleaned;
  if (/商城|商品|好物/.test(cleaned) && /服务|生活|华人/.test(cleaned)) {
    return "生活服务与优选商城";
  }
  return cleaned.slice(0, 18);
}

function normalizeHeroDescription(description: string, title: string) {
  const cleaned = description
    .replace(/\s+/g, " ")
    .trim();
  const cleanedTitle = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned === cleanedTitle) return "";
  if (cleanedTitle && cleaned.includes(cleanedTitle) && cleaned.length <= cleanedTitle.length + 8) return "";
  if (cleaned.length > 34) return "";
  return cleaned;
}

function normalizeBannerHeroDescription(description: string) {
  const cleaned = description
    .split(/\r?\n|[|｜]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
  if (cleaned.length <= 56) return cleaned;
  return `${cleaned.slice(0, 55)}…`;
}

function HeroChrome({
  siteName,
  logoSrc,
  onNavigate,
  searchValue,
  searchPlaceholder,
  onSearchOpen,
}: {
  siteName: string;
  logoSrc?: string;
  onNavigate: (path: string) => void;
  searchValue?: string;
  searchPlaceholder: string;
  onSearchOpen: () => void;
}) {
  const { localizedPath, t } = usePublicLocale();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const brandName = siteName || STORE_COPY.brandName;
  return (
    <div className="sf-next-home-hero__chrome">
      <UnifiedButton
        type="button"
        onClick={() => onNavigate(localizedPath("/"))}
        className="sf-next-home-hero__brand"
        aria-label={`${brandName} ${t("common.home")}`}
      >
        <StoreBrandLogo
          src={logoSrc}
          siteName={brandName}
          fallbackText={brandName.trim().slice(0, 1)}
          width={34}
          height={34}
          className="sf-next-home-hero__brand-logo"
        />
        <span className="sf-next-home-hero__brand-copy">
          <span className="sf-next-home-hero__brand-name">{brandName}</span>
          <span className="sf-next-home-hero__brand-meta">{STORE_COPY.siteSlogan}</span>
        </span>
      </UnifiedButton>
      <StoreSearchLauncher
        className="sf-next-home-hero__top-search"
        value={searchValue}
        placeholder={searchPlaceholder}
        onClick={onSearchOpen}
      />
      <div className="sf-next-home-hero__actions">
        <NotificationIconButton
          unreadCount={unreadCount}
          onClick={() => onNavigate(localizedPath("/notifications"))}
          className="sf-next-home-hero__action"
        />
        <UnifiedButton
          type="button"
          className="sf-next-home-hero__action"
          onClick={() => onNavigate(localizedPath("/profile"))}
          aria-label={t("common.myAccount")}
        >
          <UserRound size={16} aria-hidden />
        </UnifiedButton>
      </div>
    </div>
  );
}

function HeroFallbackVisual({
  siteName,
  slogan,
  description,
  logoSrc,
}: {
  siteName: string;
  slogan: string;
  description: string;
  logoSrc?: string;
}) {
  return (
    <div className="sf-next-home-hero__fallback">
      <div className="sf-next-home-hero__fallback-mark" aria-hidden>
        {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-contain p-10 opacity-80" /> : null}
      </div>
      <span className="sr-only">{siteName}{slogan}{description}</span>
    </div>
  );
}
