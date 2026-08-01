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

export type ThemeConfig = {
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

  texture: ThemeTextureConfig;
};
