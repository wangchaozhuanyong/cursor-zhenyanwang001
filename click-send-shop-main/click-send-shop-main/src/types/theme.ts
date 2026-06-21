export type ShadowStyle = "none" | "subtle" | "soft" | "medium" | "glow" | "aerial" | "paper" | "velvet" | "lantern" | "moonlight";
export type ButtonStyle = "pill" | "rounded" | "square" | "capsule";
export type NavStyle = "clean" | "floating" | "glass" | "glassLine";
export type BadgeStyle = "solid" | "soft" | "outline" | "technical" | "botanical" | "jewel" | "festivalSeal";
export type PriceStyle = "normal" | "bold" | "luxury" | "tabularBold";
export type ProductCardVariant = "standard" | "premium" | "deal" | "compact" | "spec" | "editorial" | "lookbook" | "giftSet" | "pairedGift";
export type CardStyle = "bordered" | "seamless" | "elevated" | "minimal" | "glassBordered" | "paperLayered" | "framelessFloat" | "silkBordered" | "moonHaloBordered";
export type CardTextAlign = "left" | "center";
export type ImageRatio = "1 / 1" | "4 / 5" | "3 / 4" | "4 / 3" | "16 / 9";
export type ImageFit = "cover" | "contain";
export type HomeLayout = "classic" | "premium" | "deal" | "magazine" | "modularShowcase" | "courtyardMasonry" | "runwayEditorial" | "festivalScroll" | "lunarGarden";
export type HeaderStyle = "clean" | "premium" | "transparent" | "dark" | "floatingGlass" | "splitEditorial" | "minimalCentered" | "redLine" | "quietLine";
export type BannerStyle = "clean" | "premium" | "deal" | "dark" | "fresh" | "panoramicLight" | "naturalWindow" | "archedMirror" | "lightLacquer" | "moonHalo";
export type CouponStyle = "ticket" | "premium" | "deal" | "minimal" | "precisionVoucher" | "perforatedTicket" | "silkRibbon" | "redPacket" | "moonTicket";
export type MemberCardStyle = "light" | "gold" | "blackGold" | "fresh" | "titaniumBlue" | "walnutCopper" | "plumSilver" | "jadeGold" | "indigoGold";
export type CategoryIconStyle = "circle" | "soft" | "solid" | "outline" | "monoGlyph" | "botanicalLine" | "jewelOutline" | "auspiciousSeal" | "lunarSeal";
export type MotionLevel = "none" | "soft" | "rich";
export type Density = "comfortable" | "compact" | "airy";
export type AdminThemeMode = "fixed" | "follow_store";
export type ThemeSkinType = "evergreen" | "festival";
export type ThemeSkinStatus = "draft" | "published" | "disabled";
export type ThemeFestivalMode = "none" | "springFestival" | "midAutumn";
export type ThemeFestivalActivation = "manual" | "manualOrLunarSchedule";
export type ThemeFestivalDateMode = "solar" | "lunar";
export type ThemeDecorativeDensity = "quiet" | "balanced" | "rich";
export type ThemeTextureIntensity = "subtle" | "medium";

export type ThemeTextureConfig = {
  material: string;
  intensity: ThemeTextureIntensity;
  surface: string;
  grain: string;
  grainOpacity: number;
  highlight: string;
  highlightOpacity: number;
  metal: string;
  pattern: string;
  patternOpacity: number;
  line: string;
  shadow: string;
  temperature: string;
  imageContrast: number;
  imageSaturation: number;
};

export type ThemeFestivalConfig = {
  mode: ThemeFestivalMode;
  activation: ThemeFestivalActivation;
  dateMode: ThemeFestivalDateMode;
  leadDays: number;
  tailDays: number;
  decorativeDensity: ThemeDecorativeDensity;
  showCountdown: boolean;
  fallbackSkinId?: string | null;
};

/** 皮肤适合场景（用于 Theme Studio 筛选与展示） */
export type ThemeSceneTag =
  | "default"
  | "life_service"
  | "premium"
  | "visa"
  | "mall"
  | "admin"
  | "promotion"
  | "holiday";

export type ThemeConfig = {
  skinName?: string;
  radius: string;
  fontFamily: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  priceColor: string;
  bgColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;

  successColor: string;
  warningColor: string;
  dangerColor: string;

  shadowStyle: ShadowStyle;
  buttonStyle: ButtonStyle;
  navStyle: NavStyle;
  badgeStyle: BadgeStyle;
  priceStyle: PriceStyle;

  productCardVariant: ProductCardVariant;
  cardStyle: CardStyle;
  cardTextAlign: CardTextAlign;
  imageRatio: ImageRatio;
  imageFit: ImageFit;

  homeLayout: HomeLayout;
  headerStyle: HeaderStyle;
  bannerStyle: BannerStyle;

  couponStyle: CouponStyle;
  memberCardStyle: MemberCardStyle;
  categoryIconStyle: CategoryIconStyle;

  motionLevel: MotionLevel;
  density: Density;

  adminThemeMode: AdminThemeMode;
  texture: ThemeTextureConfig;
  festival: ThemeFestivalConfig;
};

export type ThemeSkin = {
  id: string;
  themeKey?: string;
  name: string;
  description?: string;
  /** 运营可自由编辑的皮肤分类，用于后台筛选和归档。 */
  category?: string;
  /** @deprecated 旧版“适合场景”字段，仅用于兼容历史数据。新逻辑使用 category。 */
  sceneTag?: ThemeSceneTag;
  type?: ThemeSkinType;
  status?: ThemeSkinStatus;
  isDefault?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  priority?: number;
  updatedAt?: string;
  config: ThemeConfig;
};

export type ThemeHolidayRule = {
  id: string;
  name: string;
  enabled: boolean;
  /** MM-DD, yearly recurring */
  start: string;
  /** MM-DD, yearly recurring */
  end: string;
  /** Usually the festival skin. Kept per rule so later one festival can use a different skin safely. */
  skinId?: string;
};

export type ThemeSkinsPayload = {
  defaultSkinId: string;
  activeSkinId: string;
  runtimeSkinId?: string;
  holidaySkinId?: string;
  holidayRules: ThemeHolidayRule[];
  skins: ThemeSkin[];
};
