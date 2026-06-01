export type ShadowStyle = "none" | "subtle" | "soft" | "medium" | "glow";
export type ButtonStyle = "pill" | "rounded" | "square";
export type NavStyle = "clean" | "floating" | "glass";
export type BadgeStyle = "solid" | "soft" | "outline";
export type PriceStyle = "normal" | "bold" | "luxury";
export type ProductCardVariant = "standard" | "premium" | "deal" | "compact";
export type CardStyle = "bordered" | "seamless" | "elevated" | "minimal";
export type CardTextAlign = "left" | "center";
export type ImageRatio = "1 / 1" | "4 / 5" | "3 / 4" | "16 / 9";
export type ImageFit = "cover" | "contain";
export type HomeLayout = "classic" | "premium" | "deal" | "magazine";
export type HeaderStyle = "clean" | "premium" | "transparent" | "dark";
export type BannerStyle = "clean" | "premium" | "deal" | "dark" | "fresh";
export type CouponStyle = "ticket" | "premium" | "deal" | "minimal";
export type MemberCardStyle = "light" | "gold" | "blackGold" | "fresh";
export type CategoryIconStyle = "circle" | "soft" | "solid" | "outline";
export type MotionLevel = "none" | "soft" | "rich";
export type Density = "comfortable" | "compact";
export type AdminThemeMode = "fixed" | "follow_store";

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
};

export type ThemeSkin = {
  id: string;
  name: string;
  description?: string;
  sceneTag?: ThemeSceneTag;
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
